import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BaseCustomFieldsDto, SearchDto, DateRangeDto } from '../base/base.dto';

export enum InteractionType {
  CALL = 'call',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task'
}

export enum InteractionDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum InteractionStatus {
  COMPLETED = 'completed',
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled'
}

export enum InteractionOutcome {
  INTERESTED = 'interested',
  NOT_INTERESTED = 'not_interested',
  CALLBACK = 'callback',
  CLOSED = 'closed',
  FOLLOW_UP = 'follow_up',
  MEETING_SCHEDULED = 'meeting_scheduled',
  PROPOSAL_SENT = 'proposal_sent',
  NO_ANSWER = 'no_answer'
}

/**
 * Create Interaction DTO
 */
export class CreateInteractionDto extends BaseCustomFieldsDto {
  @ApiProperty({ 
    description: 'Customer ID this interaction belongs to'
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ 
    description: 'Interaction type',
    enum: InteractionType,
    example: InteractionType.CALL
  })
  @IsEnum(InteractionType)
  type: InteractionType;

  @ApiPropertyOptional({ 
    description: 'Interaction direction',
    enum: InteractionDirection,
    example: InteractionDirection.OUTBOUND
  })
  @IsOptional()
  @IsEnum(InteractionDirection)
  direction?: InteractionDirection;

  @ApiPropertyOptional({ 
    description: 'Subject/Title of the interaction',
    maxLength: 255,
    example: 'Follow-up call about product demo'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({ 
    description: 'Content/Description of the interaction',
    example: 'Discussed pricing options and implementation timeline'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ 
    description: 'Interaction status',
    enum: InteractionStatus,
    example: InteractionStatus.COMPLETED,
    default: InteractionStatus.COMPLETED
  })
  @IsOptional()
  @IsEnum(InteractionStatus)
  status?: InteractionStatus = InteractionStatus.COMPLETED;

  @ApiPropertyOptional({ 
    description: 'Scheduled date and time (for future interactions)',
    example: '2024-12-25T10:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled end date and time (for meetings)',
    example: '2024-12-25T11:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({ 
    description: 'Duration in minutes',
    minimum: 1,
    example: 30
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ 
    description: 'Priority level',
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    example: 'normal'
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ 
    description: 'Assigned user ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Location (for meetings)',
    maxLength: 255,
    example: 'Oficina principal, Calle 123'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ 
    description: 'Location URL (for video calls)',
    maxLength: 500,
    example: 'https://meet.google.com/abc-defg-hij'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Is this a recurring activity',
    default: false
  })
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ 
    description: 'Recurrence rule (daily, weekly, monthly, or RRULE format)',
    maxLength: 100,
    example: 'weekly'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recurrenceRule?: string;

  @ApiPropertyOptional({ 
    description: 'Recurrence end date',
    example: '2025-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({ 
    description: 'Interaction outcome',
    enum: InteractionOutcome,
    example: InteractionOutcome.INTERESTED
  })
  @IsOptional()
  @IsEnum(InteractionOutcome)
  outcome?: InteractionOutcome;

  @ApiPropertyOptional({ 
    description: 'Next action to take',
    maxLength: 255,
    example: 'Send product brochure and pricing'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nextAction?: string;

  @ApiPropertyOptional({ 
    description: 'Date for next action',
    example: '2024-12-30T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;

  @ApiPropertyOptional({ 
    description: 'Related order ID'
  })
  @IsOptional()
  @IsUUID()
  relatedOrderId?: string;

  @ApiPropertyOptional({ 
    description: 'Related task ID'
  })
  @IsOptional()
  @IsUUID()
  relatedTaskId?: string;

  @ApiPropertyOptional({ 
    description: 'Parent interaction ID (for recurring series)',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  parentInteractionId?: string;
}

/**
 * Update Interaction DTO
 */
export class UpdateInteractionDto extends PartialType(CreateInteractionDto) {
  @ApiPropertyOptional({ description: 'Customer ID this interaction belongs to' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

/**
 * Interaction Filter DTO
 */
export class InteractionFilterDto extends SearchDto {
  @ApiPropertyOptional({ 
    description: 'Filter by customer ID'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by interaction type',
    enum: InteractionType
  })
  @IsOptional()
  @IsEnum(InteractionType)
  type?: InteractionType;

  @ApiPropertyOptional({ 
    description: 'Filter by direction',
    enum: InteractionDirection
  })
  @IsOptional()
  @IsEnum(InteractionDirection)
  direction?: InteractionDirection;

  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: InteractionStatus
  })
  @IsOptional()
  @IsEnum(InteractionStatus)
  status?: InteractionStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by outcome',
    enum: InteractionOutcome
  })
  @IsOptional()
  @IsEnum(InteractionOutcome)
  outcome?: InteractionOutcome;

  @ApiPropertyOptional({ 
    description: 'Filter by created user ID'
  })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by creation date range'
  })
  @IsOptional()
  createdAt?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by scheduled date range'
  })
  @IsOptional()
  scheduledAt?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by next action date range'
  })
  @IsOptional()
  nextActionDate?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned user ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by priority',
    enum: ['low', 'normal', 'high', 'urgent']
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ 
    description: 'Show only recurring activities',
    default: false
  })
  @IsOptional()
  isRecurring?: boolean;
}

/**
 * Calendar View Filter DTO
 */
export class CalendarFilterDto {
  @ApiProperty({ 
    description: 'View type',
    enum: ['month', 'week', 'day'],
    example: 'month'
  })
  @IsEnum(['month', 'week', 'day'])
  view: 'month' | 'week' | 'day';

  @ApiProperty({ 
    description: 'Year',
    example: 2024
  })
  @Type(() => Number)
  @IsNumber()
  year: number;

  @ApiProperty({ 
    description: 'Month (1-12)',
    example: 12,
    minimum: 1,
    maximum: 12
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({ 
    description: 'Week number (1-53) - required for week view',
    minimum: 1,
    maximum: 53
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(53)
  week?: number;

  @ApiPropertyOptional({ 
    description: 'Day (1-31) - required for day view',
    minimum: 1,
    maximum: 31
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  day?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned user ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by interaction type',
    enum: InteractionType
  })
  @IsOptional()
  @IsEnum(InteractionType)
  type?: InteractionType;

  @ApiPropertyOptional({ 
    description: 'Filter by priority',
    enum: ['low', 'normal', 'high', 'urgent']
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;
}

/**
 * Create Recurring Activity DTO
 */
export class CreateRecurringActivityDto extends CreateInteractionDto {
  @ApiProperty({ 
    description: 'Recurrence rule',
    enum: ['daily', 'weekly', 'monthly'],
    example: 'weekly'
  })
  @IsEnum(['daily', 'weekly', 'monthly'])
  declare recurrenceRule: string;

  @ApiProperty({ 
    description: 'Recurrence end date',
    example: '2025-12-31T23:59:59.000Z'
  })
  @IsDateString()
  declare recurrenceEndDate: string;

  @ApiProperty({ 
    description: 'Must be scheduled',
    default: true
  })
  declare status: InteractionStatus.SCHEDULED;

  @ApiProperty({ 
    description: 'Must be recurring',
    default: true
  })
  declare isRecurring: true;
}

/**
 * Create Reminder DTO
 */
export class CreateReminderDto {
  @ApiProperty({ 
    description: 'Reminder minutes before scheduled time',
    example: 15,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  reminderMinutes: number;
}

/**
 * Schedule Interaction DTO
 */
export class ScheduleInteractionDto extends CreateInteractionDto {
  @ApiProperty({ 
    description: 'Scheduled date and time',
    example: '2024-12-25T10:00:00.000Z'
  })
  @IsDateString()
  declare scheduledAt: string;

  @ApiProperty({ 
    description: 'Interaction status must be scheduled'
  })
  declare status: InteractionStatus.SCHEDULED;
}

/**
 * Complete Interaction DTO
 */
export class CompleteInteractionDto {
  @ApiPropertyOptional({ 
    description: 'Content/Notes from the completed interaction'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ 
    description: 'Duration in minutes'
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ 
    description: 'Interaction outcome',
    enum: InteractionOutcome
  })
  @IsOptional()
  @IsEnum(InteractionOutcome)
  outcome?: InteractionOutcome;

  @ApiPropertyOptional({ 
    description: 'Next action to take'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nextAction?: string;

  @ApiPropertyOptional({ 
    description: 'Date for next action'
  })
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;
}

/**
 * Interaction Response DTO
 */
export class InteractionResponseDto {
  @ApiProperty({ description: 'Interaction ID' })
  id: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiProperty({ description: 'Customer ID this interaction belongs to' })
  customerId: string;

  @ApiProperty({ description: 'Interaction type', enum: InteractionType })
  type: InteractionType;

  @ApiPropertyOptional({ description: 'Interaction direction', enum: InteractionDirection })
  direction?: InteractionDirection;

  @ApiPropertyOptional({ description: 'Subject/Title of the interaction' })
  subject?: string;

  @ApiPropertyOptional({ description: 'Content/Description of the interaction' })
  content?: string;

  @ApiPropertyOptional({ description: 'Interaction status', enum: InteractionStatus })
  status?: InteractionStatus;

  @ApiPropertyOptional({ description: 'Scheduled date and time' })
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Scheduled end date and time' })
  scheduledEndAt?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Priority', enum: ['low', 'normal', 'high', 'urgent'] })
  priority?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID', format: 'uuid' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Assigned user information' })
  assignedToUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Location URL' })
  locationUrl?: string;

  @ApiPropertyOptional({ description: 'Is recurring' })
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Recurrence rule' })
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Recurrence end date', format: 'date-time' })
  recurrenceEndDate?: string;

  @ApiPropertyOptional({ description: 'Parent interaction ID (for recurring series)', format: 'uuid' })
  parentInteractionId?: string;

  @ApiPropertyOptional({ description: 'Completed at', format: 'date-time' })
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Interaction outcome', enum: InteractionOutcome })
  outcome?: InteractionOutcome;

  @ApiPropertyOptional({ description: 'Next action to take' })
  nextAction?: string;

  @ApiPropertyOptional({ description: 'Date for next action' })
  nextActionDate?: string;

  @ApiPropertyOptional({ description: 'Related order ID' })
  relatedOrderId?: string;

  @ApiPropertyOptional({ description: 'Related task ID' })
  relatedTaskId?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Customer info' })
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    type: string;
  };

  @ApiPropertyOptional({ description: 'Created by user ID', format: 'uuid' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Created by user info' })
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Related order info' })
  relatedOrder?: {
    id: string;
    orderNumber: string;
    status: string;
  };

  @ApiPropertyOptional({ description: 'Related task info' })
  relatedTask?: {
    id: string;
    title: string;
    status: string;
  };
}

/**
 * Interaction Summary DTO
 */
export class InteractionSummaryDto {
  @ApiProperty({ description: 'Total interactions count' })
  totalCount: number;

  @ApiProperty({ description: 'Interactions by type' })
  byType: Record<InteractionType, number>;

  @ApiProperty({ description: 'Interactions by outcome' })
  byOutcome: Record<InteractionOutcome, number>;

  @ApiProperty({ description: 'Interactions by status' })
  byStatus: Record<InteractionStatus, number>;

  @ApiProperty({ description: 'Average duration in minutes' })
  averageDuration: number;

  @ApiProperty({ description: 'Most active users' })
  topUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
}