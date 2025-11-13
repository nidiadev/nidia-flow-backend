import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
  Min
} from 'class-validator';
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
    description: 'Duration in minutes',
    minimum: 1,
    example: 30
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

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

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  durationMinutes?: number;

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