import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Scope,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { BusinessEventEmitterService } from '../../../common/events/event-emitter.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilterDto,
  WorkflowResponseDto,
  WorkflowExecutionResponseDto,
  WorkflowExecutionLogResponseDto,
  WorkflowTriggerType,
  WorkflowStepType,
  WorkflowActionType,
} from '../../dto/crm/workflow.dto';
import { Prisma } from '../../../../generated/tenant-prisma';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * WorkflowService
 * 
 * Service for managing workflows/automations
 */
@Injectable({ scope: Scope.REQUEST })
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly eventEmitter: BusinessEventEmitterService,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
  ) {}

  /**
   * Create a new workflow
   */
  async create(createDto: CreateWorkflowDto, userId: string): Promise<WorkflowResponseDto> {
    const client = await this.prisma.getTenantClient();

    // Validate steps count
    if (createDto.steps.length > (createDto.maxSteps || 10)) {
      throw new BadRequestException(
        `Workflow exceeds maximum steps limit (${createDto.maxSteps || 10})`,
      );
    }

    // Validate steps
    this.validateSteps(createDto.steps);

    const workflow = await client.workflow.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        isActive: createDto.isActive ?? true,
        triggerType: createDto.triggerType,
        triggerConfig: createDto.triggerConfig as any,
        steps: createDto.steps as any,
        maxSteps: createDto.maxSteps || 10,
        createdBy: userId,
      },
    });

    // Register event listener if workflow is active
    if (workflow.isActive) {
      await this.registerWorkflowListener(workflow.id, workflow.triggerType);
    }

    this.logger.log(`Workflow created: ${workflow.id}`);
    return this.mapToResponseDto(workflow);
  }

  /**
   * Find all workflows
   */
  async findMany(
    filters: WorkflowFilterDto,
  ): Promise<{ data: WorkflowResponseDto[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();
    const where = this.buildWhereClause(filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const [workflows, total] = await Promise.all([
      client.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      client.workflow.count({ where }),
    ]);

    return {
      data: workflows.map((workflow) => this.mapToResponseDto(workflow)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find workflow by ID
   */
  async findById(id: string): Promise<WorkflowResponseDto> {
    const client = await this.prisma.getTenantClient();
    const workflow = await client.workflow.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return this.mapToResponseDto(workflow);
  }

  /**
   * Update workflow
   */
  async update(
    id: string,
    updateDto: UpdateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    const client = await this.prisma.getTenantClient();

    const existing = await client.workflow.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    // Validate steps if provided
    if (updateDto.steps) {
      this.validateSteps(updateDto.steps);
      if (updateDto.steps.length > existing.maxSteps) {
        throw new BadRequestException(
          `Workflow exceeds maximum steps limit (${existing.maxSteps})`,
        );
      }
    }

    const workflow = await client.workflow.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        isActive: updateDto.isActive,
        triggerType: updateDto.triggerType,
        triggerConfig: updateDto.triggerConfig as any,
        steps: updateDto.steps as any,
      },
    });

    // Re-register listener if trigger changed or workflow was activated
    if (
      (updateDto.triggerType || updateDto.isActive !== undefined) &&
      workflow.isActive
    ) {
      await this.registerWorkflowListener(workflow.id, workflow.triggerType);
    }

    this.logger.log(`Workflow updated: ${id}`);
    return this.mapToResponseDto(workflow);
  }

  /**
   * Delete workflow
   */
  async delete(id: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const workflow = await client.workflow.findUnique({ where: { id } });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    await client.workflow.delete({ where: { id } });
    this.logger.log(`Workflow deleted: ${id}`);
  }

  /**
   * Get workflow executions
   */
  async getExecutions(
    workflowId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: WorkflowExecutionResponseDto[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();

    const workflow = await client.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      client.workflowExecution.findMany({
        where: { workflowId },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      client.workflowExecution.count({ where: { workflowId } }),
    ]);

    return {
      data: executions.map((exec) => this.mapExecutionToResponseDto(exec)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get execution logs
   */
  async getExecutionLogs(
    executionId: string,
  ): Promise<WorkflowExecutionLogResponseDto[]> {
    const client = await this.prisma.getTenantClient();

    const execution = await client.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`Workflow execution with ID ${executionId} not found`);
    }

    const logs = await client.workflowExecutionLog.findMany({
      where: { executionId },
      orderBy: { stepIndex: 'asc' },
    });

    return logs.map((log) => this.mapLogToResponseDto(log));
  }

  /**
   * Trigger workflow execution (called by event listeners)
   */
  async triggerWorkflow(
    workflowId: string,
    triggerData: any,
  ): Promise<WorkflowExecutionResponseDto> {
    const client = await this.prisma.getTenantClient();

    const workflow = await client.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    if (!workflow.isActive) {
      this.logger.debug(`Workflow ${workflowId} is not active, skipping execution`);
      throw new BadRequestException('Workflow is not active');
    }

    // Create execution
    const execution = await client.workflowExecution.create({
      data: {
        workflowId,
        status: 'running',
        triggerData: triggerData as any,
        currentStep: 0,
      },
    });

    // Update workflow execution count
    await client.workflow.update({
      where: { id: workflowId },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });

    // Queue workflow execution
    await this.workflowQueue.add(
      'execute-workflow',
      {
        executionId: execution.id,
        workflowId,
        steps: workflow.steps,
        triggerData,
      },
      {
        jobId: `workflow-${execution.id}`,
      },
    );

    this.logger.log(`Workflow ${workflowId} triggered, execution ${execution.id} created`);
    return this.mapExecutionToResponseDto(execution);
  }

  /**
   * Validate workflow steps
   */
  private validateSteps(steps: any[]): void {
    if (steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step');
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (!step.type) {
        throw new BadRequestException(`Step ${i + 1} must have a type`);
      }

      if (step.type === WorkflowStepType.ACTION) {
        if (!step.actionType) {
          throw new BadRequestException(`Step ${i + 1} (action) must have an actionType`);
        }
        if (!step.actionConfig) {
          throw new BadRequestException(`Step ${i + 1} (action) must have actionConfig`);
        }
      } else if (step.type === WorkflowStepType.DELAY) {
        if (step.delayDays === undefined || step.delayDays < 0) {
          throw new BadRequestException(`Step ${i + 1} (delay) must have delayDays >= 0`);
        }
      }
    }
  }

  /**
   * Register workflow event listener
   */
  private async registerWorkflowListener(
    workflowId: string,
    triggerType: string,
  ): Promise<void> {
    // Map trigger types to event types
    const eventTypeMap: Record<string, string> = {
      [WorkflowTriggerType.LEAD_CREATED]: BusinessEventTypes.CUSTOMER_CREATED,
      [WorkflowTriggerType.DEAL_STAGE_CHANGED]: BusinessEventTypes.DEAL_STAGE_CHANGED,
      [WorkflowTriggerType.DEAL_WON]: BusinessEventTypes.DEAL_WON,
      [WorkflowTriggerType.DEAL_LOST]: BusinessEventTypes.DEAL_LOST,
      [WorkflowTriggerType.LEAD_SCORE_THRESHOLD]: BusinessEventTypes.LEAD_SCORE_THRESHOLD_CROSSED,
    };

    const eventType = eventTypeMap[triggerType];
    if (!eventType) {
      this.logger.warn(`No event mapping for trigger type: ${triggerType}`);
      return;
    }

    // Note: In a production system, you would maintain a registry of active workflows
    // and their event listeners. For now, we'll trigger workflows directly from event handlers.
    // The actual event handling will be done in a separate service that listens to all events
    // and checks for matching workflows.
    this.logger.log(`Workflow ${workflowId} registered for event: ${eventType}`);
  }

  /**
   * Find active workflows for a trigger type
   */
  async findActiveWorkflowsForTrigger(triggerType: string): Promise<any[]> {
    const client = await this.prisma.getTenantClient();
    return client.workflow.findMany({
      where: {
        isActive: true,
        triggerType,
      },
    });
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: WorkflowFilterDto): Prisma.WorkflowWhereInput {
    const where: Prisma.WorkflowWhereInput = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.triggerType) {
      where.triggerType = filters.triggerType;
    }

    return where;
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(workflow: any): WorkflowResponseDto {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      isActive: workflow.isActive,
      triggerType: workflow.triggerType,
      triggerConfig: workflow.triggerConfig,
      steps: workflow.steps,
      maxSteps: workflow.maxSteps,
      executionCount: workflow.executionCount,
      lastExecutedAt: workflow.lastExecutedAt,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  /**
   * Map execution to response DTO
   */
  private mapExecutionToResponseDto(execution: any): WorkflowExecutionResponseDto {
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      triggerData: execution.triggerData,
      currentStep: execution.currentStep,
      errorMessage: execution.errorMessage,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      nextStepAt: execution.nextStepAt,
    };
  }

  /**
   * Map log to response DTO
   */
  private mapLogToResponseDto(log: any): WorkflowExecutionLogResponseDto {
    return {
      id: log.id,
      executionId: log.executionId,
      stepIndex: log.stepIndex,
      stepType: log.stepType,
      status: log.status,
      actionType: log.actionType,
      actionConfig: log.actionConfig,
      result: log.result,
      errorMessage: log.errorMessage,
      executedAt: log.executedAt,
      createdAt: log.createdAt,
    };
  }
}

