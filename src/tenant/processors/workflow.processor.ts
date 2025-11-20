import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable, Scope, Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { BusinessEventEmitterService } from '../../common/events/event-emitter.service';
import { NotificationService } from '../services/communications/notification.service';
import { CustomerService } from '../services/crm/customer.service';
import { InteractionService } from '../services/crm/interaction.service';
import { DealService } from '../services/crm/deal.service';
import { WorkflowStepType, WorkflowActionType } from '../dto/crm/workflow.dto';

/**
 * WorkflowProcessor
 * 
 * Procesa ejecuciones de workflows en segundo plano
 * Ejecuta los pasos del workflow con delays y acciones
 */
@Processor('workflows')
@Injectable({ scope: Scope.DEFAULT })
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly eventEmitter: BusinessEventEmitterService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customerService: CustomerService,
    @Inject(forwardRef(() => InteractionService))
    private readonly interactionService: InteractionService,
    @Inject(forwardRef(() => DealService))
    private readonly dealService: DealService,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing workflow execution job: ${job.id}`);

    try {
      const { executionId, workflowId, steps, triggerData } = job.data;

      const prisma = await this.tenantPrisma.getTenantClient();

      // Get execution
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
        include: {
          workflow: true,
        },
      });

      if (!execution) {
        throw new Error(`Workflow execution ${executionId} not found`);
      }

      if (execution.status !== 'running') {
        this.logger.warn(`Execution ${executionId} is not running, skipping`);
        return { success: false, reason: 'execution_not_running' };
      }

      // Get current step
      const currentStepIndex = execution.currentStep;
      const currentStep = steps[currentStepIndex];

      if (!currentStep) {
        // Workflow completed
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        this.logger.log(`Workflow execution ${executionId} completed`);
        return { success: true, status: 'completed' };
      }

      // Execute current step
      await this.executeStep(executionId, currentStepIndex, currentStep, triggerData);

      // Check if there's a next step
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = steps[nextStepIndex];

      if (nextStep) {
        // Calculate next step execution time (considering delays)
        let nextStepAt: Date | null = null;

        if (currentStep.type === WorkflowStepType.DELAY) {
          const delayDays = currentStep.delayDays || 0;
          nextStepAt = new Date();
          nextStepAt.setDate(nextStepAt.getDate() + delayDays);
        } else {
          // If current step is not a delay, execute next step immediately
          nextStepAt = new Date();
        }

        // Update execution
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            currentStep: nextStepIndex,
            nextStepAt,
          },
        });

        // If next step has a delay, schedule it
        if (nextStep.type === WorkflowStepType.DELAY && nextStep.delayDays && nextStep.delayDays > 0) {
          await this.workflowQueue.add(
            'execute-workflow-step',
            {
              executionId,
              workflowId,
              steps,
              triggerData,
              stepIndex: nextStepIndex,
            },
            {
              delay: nextStep.delayDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
              jobId: `workflow-${executionId}-step-${nextStepIndex}`,
            },
          );
        } else {
          // Execute next step immediately
          await this.workflowQueue.add(
            'execute-workflow-step',
            {
              executionId,
              workflowId,
              steps,
              triggerData,
              stepIndex: nextStepIndex,
            },
            {
              jobId: `workflow-${executionId}-step-${nextStepIndex}`,
            },
          );
        }
      } else {
        // No more steps, mark as completed
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        currentStep: currentStepIndex,
        nextStep: nextStepIndex,
      };
    } catch (error: any) {
      this.logger.error(`Failed to process workflow execution: ${error.message}`, error.stack);

      // Mark execution as failed
      try {
        const prisma = await this.tenantPrisma.getTenantClient();
        await prisma.workflowExecution.update({
          where: { id: job.data.executionId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          },
        });
      } catch (updateError: any) {
        this.logger.error(`Failed to update execution status: ${updateError.message}`);
      }

      throw error;
    }
  }

  /**
   * Execute a workflow step
   */
  private async executeStep(
    executionId: string,
    stepIndex: number,
    step: any,
    triggerData: any,
  ): Promise<void> {
    const prisma = await this.tenantPrisma.getTenantClient();

    // Create log entry
    const log = await prisma.workflowExecutionLog.create({
      data: {
        executionId,
        stepIndex,
        stepType: step.type,
        status: 'running',
        actionType: step.actionType,
        actionConfig: step.actionConfig as any,
      },
    });

    try {
      if (step.type === WorkflowStepType.ACTION) {
        await this.executeAction(step.actionType, step.actionConfig, triggerData);
      } else if (step.type === WorkflowStepType.DELAY) {
        // Delay steps are handled by scheduling
        // Just log that we're waiting
      } else if (step.type === WorkflowStepType.CONDITION) {
        // Condition steps evaluate and potentially skip steps
        const shouldContinue = await this.evaluateCondition(step.conditionConfig, triggerData);
        if (!shouldContinue) {
          // Skip remaining steps
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          });
        }
      }

      // Mark log as completed
      await prisma.workflowExecutionLog.update({
        where: { id: log.id },
        data: {
          status: 'completed',
          executedAt: new Date(),
        },
      });
    } catch (error: any) {
      // Mark log as failed
      await prisma.workflowExecutionLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          executedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute a workflow action
   */
  private async executeAction(
    actionType: string,
    actionConfig: any,
    triggerData: any,
  ): Promise<void> {
    switch (actionType) {
      case WorkflowActionType.SEND_EMAIL:
        // TODO: Integrate with SendGrid service
        this.logger.log(`Sending email: ${actionConfig.templateId}`);
        break;

      case WorkflowActionType.SEND_WHATSAPP:
        // TODO: Integrate with WhatsApp service
        this.logger.log(`Sending WhatsApp: ${actionConfig.templateId}`);
        break;

      case WorkflowActionType.CREATE_ACTIVITY:
        if (triggerData.customerId) {
          await this.interactionService.create(
            {
              customerId: triggerData.customerId,
              type: actionConfig.type || 'task',
              subject: actionConfig.subject || 'Activity from workflow',
              content: actionConfig.content || '',
              scheduledAt: actionConfig.scheduledAt
                ? new Date(actionConfig.scheduledAt).toISOString()
                : undefined,
              assignedTo: actionConfig.assignedTo,
            },
            triggerData.userId || triggerData.createdBy || 'system',
            [],
          );
        }
        break;

      case WorkflowActionType.ASSIGN_USER:
        if (triggerData.customerId && actionConfig.userId) {
          await this.customerService.assign(
            triggerData.customerId,
            { assignedTo: actionConfig.userId },
            triggerData.userId || 'system',
          );
        }
        break;

      case WorkflowActionType.ADD_TAG:
        if (triggerData.customerId && actionConfig.tags) {
          const customer = await this.customerService.findById(
            triggerData.customerId,
            triggerData.userId || 'system',
            [],
          );
          const currentTags = customer.tags || [];
          const newTags = [...new Set([...currentTags, ...actionConfig.tags])];
          await this.customerService.update(
            triggerData.customerId,
            { tags: newTags },
            triggerData.userId || 'system',
          );
        }
        break;

      case WorkflowActionType.UPDATE_CUSTOM_FIELD:
        if (triggerData.customerId && actionConfig.field && actionConfig.value !== undefined) {
          const customer = await this.customerService.findById(
            triggerData.customerId,
            triggerData.userId || 'system',
            [],
          );
          const customFields = customer.customFields || {};
          customFields[actionConfig.field] = actionConfig.value;
          await this.customerService.update(
            triggerData.customerId,
            { customFields },
            triggerData.userId || 'system',
          );
        }
        break;

      case WorkflowActionType.CHANGE_STATUS:
        if (triggerData.customerId && actionConfig.status) {
          await this.customerService.update(
            triggerData.customerId,
            { status: actionConfig.status },
            triggerData.userId || 'system',
          );
        }
        break;

      default:
        this.logger.warn(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    conditionConfig: any,
    triggerData: any,
  ): Promise<boolean> {
    // Simple condition evaluation
    // In production, this would be more sophisticated
    if (!conditionConfig.field || conditionConfig.value === undefined) {
      return true; // No condition, continue
    }

    const fieldValue = triggerData[conditionConfig.field];
    const operator = conditionConfig.operator || 'equals';

    switch (operator) {
      case 'equals':
        return fieldValue === conditionConfig.value;
      case 'not_equals':
        return fieldValue !== conditionConfig.value;
      case 'greater_than':
        return Number(fieldValue) > Number(conditionConfig.value);
      case 'less_than':
        return Number(fieldValue) < Number(conditionConfig.value);
      default:
        return true;
    }
  }
}

