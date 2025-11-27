import { Injectable, Logger, Scope } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../tenant-prisma.service';
import { WorkflowService } from './workflow.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import { WorkflowTriggerType } from '../../dto/crm/workflow.dto';

/**
 * WorkflowEventHandlerService
 * 
 * Listens to business events and triggers matching workflows
 */
@Injectable({ scope: Scope.REQUEST })
export class WorkflowEventHandlerService {
  private readonly logger = new Logger(WorkflowEventHandlerService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  @OnEvent(BusinessEventTypes.CUSTOMER_CREATED)
  async handleCustomerCreated(event: any) {
    this.logger.log(`Customer created event received: ${event.customerId}`);
    
    // Si se proporciona contexto del tenant en el evento, establecerlo antes de usar TenantPrismaService
    if (event.tenantContext && !this.tenantPrisma.getTenantContext()) {
      this.tenantPrisma.setTenantContext({
        tenantId: event.tenantContext.tenantId,
        userId: event.tenantContext.userId,
        dbName: event.tenantContext.dbName,
        role: event.tenantContext.role,
      });
    }
    
    // Check if customer is a lead
    const client = await this.tenantPrisma.getTenantClient();
    const customer = await client.customer.findUnique({
      where: { id: event.customerId },
      select: { type: true },
    });

    if (customer?.type === 'LEAD') {
      await this.triggerWorkflows(WorkflowTriggerType.LEAD_CREATED, {
        customerId: event.customerId,
        userId: event.userId,
        createdBy: event.userId,
        ...event,
      });
    }
  }

  @OnEvent(BusinessEventTypes.DEAL_STAGE_CHANGED)
  async handleDealStageChanged(event: any) {
    this.logger.log(`Deal stage changed event received: ${event.dealId}`);
    await this.triggerWorkflows(WorkflowTriggerType.DEAL_STAGE_CHANGED, {
      dealId: event.dealId,
      customerId: event.customerId,
      oldStageId: event.oldStageId,
      newStageId: event.newStageId,
      userId: event.userId,
      ...event,
    });
  }

  @OnEvent(BusinessEventTypes.DEAL_WON)
  async handleDealWon(event: any) {
    this.logger.log(`Deal won event received: ${event.dealId}`);
    await this.triggerWorkflows(WorkflowTriggerType.DEAL_WON, {
      dealId: event.dealId,
      customerId: event.customerId,
      userId: event.userId,
      ...event,
    });
  }

  @OnEvent(BusinessEventTypes.DEAL_LOST)
  async handleDealLost(event: any) {
    this.logger.log(`Deal lost event received: ${event.dealId}`);
    await this.triggerWorkflows(WorkflowTriggerType.DEAL_LOST, {
      dealId: event.dealId,
      customerId: event.customerId,
      userId: event.userId,
      ...event,
    });
  }

  @OnEvent(BusinessEventTypes.LEAD_SCORE_THRESHOLD_CROSSED)
  async handleLeadScoreThresholdCrossed(event: any) {
    this.logger.log(`Lead score threshold crossed event received: ${event.customerId}`);
    await this.triggerWorkflows(WorkflowTriggerType.LEAD_SCORE_THRESHOLD, {
      customerId: event.customerId,
      currentScore: event.currentScore,
      threshold: event.threshold,
      direction: event.direction,
      ...event,
    });
  }

  /**
   * Trigger workflows for a given trigger type
   */
  private async triggerWorkflows(triggerType: WorkflowTriggerType, triggerData: any): Promise<void> {
    try {
      const workflows = await this.workflowService.findActiveWorkflowsForTrigger(triggerType);

      for (const workflow of workflows) {
        try {
          // Check trigger conditions if needed
          if (this.matchesTriggerConditions(workflow, triggerData)) {
            await this.workflowService.triggerWorkflow(workflow.id, triggerData);
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to trigger workflow ${workflow.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to trigger workflows for ${triggerType}: ${error.message}`, error.stack);
    }
  }

  /**
   * Check if trigger data matches workflow conditions
   */
  private matchesTriggerConditions(workflow: any, triggerData: any): boolean {
    const config = workflow.triggerConfig || {};

    // Check score threshold
    if (config.scoreThreshold !== undefined && triggerData.currentScore !== undefined) {
      if (triggerData.direction === 'above') {
        return triggerData.currentScore >= config.scoreThreshold;
      } else if (triggerData.direction === 'below') {
        return triggerData.currentScore <= config.scoreThreshold;
      }
    }

    // Check stage ID
    if (config.stageId && triggerData.newStageId) {
      return triggerData.newStageId === config.stageId;
    }

    // Default: match if no specific conditions
    return true;
  }
}

