import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';

export enum TaskType {
  DELIVERY = 'delivery',
  INSTALLATION = 'installation',
  MAINTENANCE = 'maintenance',
  VISIT = 'visit',
  CALL = 'call',
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTaskChecklistItemDto {
  @ApiProperty({ description: 'Checklist item description' })
  @IsString()
  item: string;

  @ApiProperty({ description: 'Sort order', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class CreateTaskDto {
  @ApiProperty({ description: 'Order ID (if task is related to an order)', required: false })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskType, description: 'Task type' })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({ enum: TaskPriority, description: 'Task priority', required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ description: 'Assigned user ID', required: false })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiProperty({ description: 'Scheduled start date/time', required: false })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiProperty({ description: 'Scheduled end date/time', required: false })
  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @ApiProperty({ description: 'Estimated duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiProperty({ description: 'Location address', required: false })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiProperty({ description: 'Location city', required: false })
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiProperty({ description: 'Location latitude', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  locationLatitude?: number;

  @ApiProperty({ description: 'Location longitude', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  locationLongitude?: number;

  @ApiProperty({ description: 'Task notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Checklist items', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskChecklistItemDto)
  checklist?: CreateTaskChecklistItemDto[];

  @ApiProperty({ description: 'Task dependencies (task IDs)', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  dependencies?: string[];
}