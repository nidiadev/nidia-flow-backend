import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsInt,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Workflow Trigger Types
 */
export enum WorkflowTriggerType {
  LEAD_CREATED = 'lead_created',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  DEAL_WON = 'deal_won',
  DEAL_LOST = 'deal_lost',
  CUSTOMER_NO_RESPONSE = 'customer_no_response',
  LEAD_SCORE_THRESHOLD = 'lead_score_threshold',
  ACTIVITY_COMPLETED = 'activity_completed',
  ACTIVITY_OVERDUE = 'activity_overdue',
}

/**
 * Workflow Step Types
 */
export enum WorkflowStepType {
  ACTION = 'action',
  DELAY = 'delay',
  CONDITION = 'condition',
}

/**
 * Workflow Action Types
 */
export enum WorkflowActionType {
  SEND_EMAIL = 'send_email',
  SEND_WHATSAPP = 'send_whatsapp',
  CREATE_ACTIVITY = 'create_activity',
  ASSIGN_USER = 'assign_user',
  ADD_TAG = 'add_tag',
  UPDATE_CUSTOM_FIELD = 'update_custom_field',
  CHANGE_STATUS = 'change_status',
}

/**
 * Trigger Configuration DTO
 */
export class TriggerConfigDto {
  @ApiPropertyOptional({ description: 'Field to check (for conditional triggers)' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({ description: 'Value to compare against' })
  value?: any;

  @ApiPropertyOptional({ description: 'Days threshold (for time-based triggers)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  days?: number;

  @ApiPropertyOptional({ description: 'Score threshold (for lead_score_threshold)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  scoreThreshold?: number;

  @ApiPropertyOptional({ description: 'Stage ID (for deal_stage_changed)' })
  @IsOptional()
  @IsString()
  stageId?: string;
}

/**
 * Workflow Step DTO
 */
export class WorkflowStepDto {
  @ApiProperty({ description: 'Step type', enum: WorkflowStepType })
  @IsEnum(WorkflowStepType)
  type: WorkflowStepType;

  @ApiPropertyOptional({ description: 'Action type (for action steps)', enum: WorkflowActionType })
  @IsOptional()
  @IsEnum(WorkflowActionType)
  actionType?: WorkflowActionType;

  @ApiPropertyOptional({ description: 'Action configuration', type: Object })
  @IsOptional()
  @IsObject()
  actionConfig?: any;

  @ApiPropertyOptional({ description: 'Delay in days (for delay steps)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  delayDays?: number;

  @ApiPropertyOptional({ description: 'Condition configuration (for condition steps)', type: Object })
  @IsOptional()
  @IsObject()
  conditionConfig?: any;
}

/**
 * Create Workflow DTO
 */
export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name', example: 'Welcome New Lead' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the workflow is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Trigger type',
    enum: WorkflowTriggerType,
    example: WorkflowTriggerType.LEAD_CREATED,
  })
  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @ApiProperty({
    description: 'Trigger configuration',
    type: TriggerConfigDto,
  })
  @ValidateNested()
  @Type(() => TriggerConfigDto)
  triggerConfig: TriggerConfigDto;

  @ApiProperty({
    description: 'Workflow steps',
    type: [WorkflowStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({
    description: 'Maximum steps allowed (based on plan)',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxSteps?: number;
}

/**
 * Update Workflow DTO
 */
export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: 'Workflow name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the workflow is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Trigger type',
    enum: WorkflowTriggerType,
  })
  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @ApiPropertyOptional({
    description: 'Trigger configuration',
    type: TriggerConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TriggerConfigDto)
  triggerConfig?: TriggerConfigDto;

  @ApiPropertyOptional({
    description: 'Workflow steps',
    type: [WorkflowStepDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps?: WorkflowStepDto[];
}

/**
 * Workflow Filter DTO
 */
export class WorkflowFilterDto {
  @ApiPropertyOptional({ description: 'Filter by name (partial match)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by trigger type', enum: WorkflowTriggerType })
  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

/**
 * Workflow Response DTO
 */
export class WorkflowResponseDto {
  @ApiProperty({ description: 'Workflow ID' })
  id: string;

  @ApiProperty({ description: 'Workflow name' })
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  description?: string;

  @ApiProperty({ description: 'Whether the workflow is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Trigger type', enum: WorkflowTriggerType })
  triggerType: WorkflowTriggerType;

  @ApiProperty({ description: 'Trigger configuration', type: Object })
  triggerConfig: any;

  @ApiProperty({ description: 'Workflow steps', type: [Object] })
  steps: any[];

  @ApiProperty({ description: 'Maximum steps allowed' })
  maxSteps: number;

  @ApiProperty({ description: 'Execution count' })
  executionCount: number;

  @ApiPropertyOptional({ description: 'Last executed timestamp' })
  lastExecutedAt?: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}

/**
 * Workflow Execution Response DTO
 */
export class WorkflowExecutionResponseDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string;

  @ApiProperty({ description: 'Workflow ID' })
  workflowId: string;

  @ApiProperty({ description: 'Execution status' })
  status: string;

  @ApiProperty({ description: 'Trigger data', type: Object })
  triggerData: any;

  @ApiProperty({ description: 'Current step index' })
  currentStep: number;

  @ApiPropertyOptional({ description: 'Error message' })
  errorMessage?: string;

  @ApiProperty({ description: 'Started timestamp' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Completed timestamp' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Next step timestamp' })
  nextStepAt?: Date;
}

/**
 * Workflow Execution Log Response DTO
 */
export class WorkflowExecutionLogResponseDto {
  @ApiProperty({ description: 'Log ID' })
  id: string;

  @ApiProperty({ description: 'Execution ID' })
  executionId: string;

  @ApiProperty({ description: 'Step index' })
  stepIndex: number;

  @ApiProperty({ description: 'Step type' })
  stepType: string;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiPropertyOptional({ description: 'Action type' })
  actionType?: string;

  @ApiPropertyOptional({ description: 'Action configuration', type: Object })
  actionConfig?: any;

  @ApiPropertyOptional({ description: 'Result', type: Object })
  result?: any;

  @ApiPropertyOptional({ description: 'Error message' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Executed timestamp' })
  executedAt?: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;
}

