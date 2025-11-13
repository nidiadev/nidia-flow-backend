import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsBoolean, 
  IsArray, 
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BaseCustomFieldsDto, SearchDto, DateRangeDto } from '../base/base.dto';

export enum TaskType {
  DELIVERY = 'delivery',
  INSTALLATION = 'installation',
  MAINTENANCE = 'maintenance',
  VISIT = 'visit',
  CALL = 'call'
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start'
}

/**
 * Task Checklist Item DTO
 */
export class TaskChecklistItemDto {
  @ApiProperty({ 
    description: 'Checklist item description',
    example: 'Verify equipment functionality'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  item: string;

  @ApiPropertyOptional({ 
    description: 'Sort order',
    minimum: 0,
    example: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number = 0;
}

/**
 * Task Dependency DTO
 */
export class TaskDependencyDto {
  @ApiProperty({ 
    description: 'ID of the task this task depends on'
  })
  @IsUUID()
  dependsOnTaskId: string;

  @ApiPropertyOptional({ 
    description: 'Dependency type',
    enum: DependencyType,
    example: DependencyType.FINISH_TO_START,
    default: DependencyType.FINISH_TO_START
  })
  @IsOptional()
  @IsEnum(DependencyType)
  dependencyType?: DependencyType = DependencyType.FINISH_TO_START;
}

/**
 * Create Task DTO
 */
export class CreateTaskDto extends BaseCustomFieldsDto {
  @ApiPropertyOptional({ 
    description: 'Order ID this task belongs to'
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ 
    description: 'Customer ID this task is for'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ 
    description: 'Task title',
    minLength: 1,
    maxLength: 255,
    example: 'Install security system'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ 
    description: 'Task description',
    example: 'Install and configure complete security system with cameras and sensors'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Task type',
    enum: TaskType,
    example: TaskType.INSTALLATION
  })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiPropertyOptional({ 
    description: 'Task status',
    enum: TaskStatus,
    example: TaskStatus.PENDING,
    default: TaskStatus.PENDING
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus = TaskStatus.PENDING;

  @ApiPropertyOptional({ 
    description: 'Task priority',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    default: TaskPriority.MEDIUM
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @ApiPropertyOptional({ 
    description: 'Assigned to user ID'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled start date and time',
    example: '2024-12-25T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled end date and time',
    example: '2024-12-25T17:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @ApiPropertyOptional({ 
    description: 'Estimated duration in minutes',
    minimum: 1,
    example: 480
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ 
    description: 'Location address',
    example: 'Calle 123 #45-67, Bogotá'
  })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Location city',
    example: 'Bogotá'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCity?: string;

  @ApiPropertyOptional({ 
    description: 'Location latitude',
    example: 4.7110
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  locationLatitude?: number;

  @ApiPropertyOptional({ 
    description: 'Location longitude',
    example: -74.0721
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  locationLongitude?: number;

  @ApiPropertyOptional({ 
    description: 'Task notes',
    example: 'Customer prefers installation in the morning'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Checklist items',
    type: [TaskChecklistItemDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskChecklistItemDto)
  checklist?: TaskChecklistItemDto[];

  @ApiPropertyOptional({ 
    description: 'Task dependencies',
    type: [TaskDependencyDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDependencyDto)
  dependencies?: TaskDependencyDto[];
}

/**
 * Update Task DTO
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

/**
 * Task Filter DTO
 */
export class TaskFilterDto extends SearchDto {
  @ApiPropertyOptional({ 
    description: 'Filter by order ID'
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by customer ID'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by task type',
    enum: TaskType
  })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ 
    description: 'Filter by task status',
    enum: TaskStatus
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by task priority',
    enum: TaskPriority
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned user ID'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by created user ID'
  })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by location city'
  })
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by creation date range'
  })
  @IsOptional()
  createdAt?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by scheduled date range'
  })
  @IsOptional()
  scheduledStart?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter overdue tasks'
  })
  @IsOptional()
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ 
    description: 'Filter tasks due today'
  })
  @IsOptional()
  @IsBoolean()
  dueToday?: boolean;
}

/**
 * Assign Task DTO
 */
export class AssignTaskDto {
  @ApiProperty({ 
    description: 'User ID to assign task to'
  })
  @IsUUID()
  assignedTo: string;

  @ApiPropertyOptional({ 
    description: 'Assignment reason'
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled start date and time'
  })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled end date and time'
  })
  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;
}

/**
 * Check-in Task DTO
 */
export class CheckInTaskDto {
  @ApiProperty({ 
    description: 'Check-in latitude',
    example: 4.7110
  })
  @IsNumber({ maxDecimalPlaces: 8 })
  latitude: number;

  @ApiProperty({ 
    description: 'Check-in longitude',
    example: -74.0721
  })
  @IsNumber({ maxDecimalPlaces: 8 })
  longitude: number;

  @ApiPropertyOptional({ 
    description: 'Check-in notes'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Check-out Task DTO
 */
export class CheckOutTaskDto {
  @ApiProperty({ 
    description: 'Check-out latitude',
    example: 4.7110
  })
  @IsNumber({ maxDecimalPlaces: 8 })
  latitude: number;

  @ApiProperty({ 
    description: 'Check-out longitude',
    example: -74.0721
  })
  @IsNumber({ maxDecimalPlaces: 8 })
  longitude: number;

  @ApiPropertyOptional({ 
    description: 'Completion notes'
  })
  @IsOptional()
  @IsString()
  completionNotes?: string;
}

/**
 * Upload Photos DTO
 */
export class UploadPhotosDto {
  @ApiProperty({ 
    description: 'Array of photo URLs',
    example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
  })
  @IsArray()
  @IsString({ each: true })
  photos: string[];

  @ApiPropertyOptional({ 
    description: 'Photo description'
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Upload Signature DTO
 */
export class UploadSignatureDto {
  @ApiProperty({ 
    description: 'Signature image URL',
    example: 'https://example.com/signature.png'
  })
  @IsString()
  signatureUrl: string;

  @ApiPropertyOptional({ 
    description: 'Customer name who signed'
  })
  @IsOptional()
  @IsString()
  customerName?: string;
}

/**
 * Complete Task DTO
 */
export class CompleteTaskDto {
  @ApiPropertyOptional({ 
    description: 'Completion notes'
  })
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiPropertyOptional({ 
    description: 'Photos from task completion'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ 
    description: 'Customer signature URL'
  })
  @IsOptional()
  @IsString()
  signatureUrl?: string;
}

/**
 * Cancel Task DTO
 */
export class CancelTaskDto {
  @ApiProperty({ 
    description: 'Cancellation reason'
  })
  @IsString()
  @MinLength(1)
  cancellationReason: string;
}

/**
 * Task Response DTO
 */
export class TaskResponseDto {
  @ApiProperty({ description: 'Task ID' })
  id: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Order ID this task belongs to' })
  orderId?: string;

  @ApiPropertyOptional({ description: 'Customer ID this task is for' })
  customerId?: string;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  description?: string;

  @ApiProperty({ description: 'Task type', enum: TaskType })
  type: TaskType;

  @ApiProperty({ description: 'Task status', enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ description: 'Task priority', enum: TaskPriority })
  priority: TaskPriority;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Scheduled start date and time' })
  scheduledStart?: string;

  @ApiPropertyOptional({ description: 'Scheduled end date and time' })
  scheduledEnd?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Location address' })
  locationAddress?: string;

  @ApiPropertyOptional({ description: 'Location city' })
  locationCity?: string;

  @ApiPropertyOptional({ description: 'Location coordinates' })
  locationLatitude?: number;

  @ApiPropertyOptional({ description: 'Location coordinates' })
  locationLongitude?: number;

  @ApiPropertyOptional({ description: 'Task notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Assigned at' })
  assignedAt?: string;

  @ApiPropertyOptional({ description: 'Started at' })
  startedAt?: string;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Cancelled at' })
  cancelledAt?: string;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  actualDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Check-in time' })
  checkinTime?: string;

  @ApiPropertyOptional({ description: 'Check-in coordinates' })
  checkinCoordinates?: {
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({ description: 'Check-out time' })
  checkoutTime?: string;

  @ApiPropertyOptional({ description: 'Check-out coordinates' })
  checkoutCoordinates?: {
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({ description: 'Photos URLs' })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Signature URL' })
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Completion notes' })
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Order info' })
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  };

  @ApiPropertyOptional({ description: 'Customer info' })
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    phone: string;
  };

  @ApiPropertyOptional({ description: 'Assigned user info' })
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Created by user info' })
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({ description: 'Checklist items with completion status' })
  checklistWithStatus?: Array<TaskChecklistItemDto & {
    id: string;
    isCompleted: boolean;
    completedAt?: string;
    completedBy?: string;
  }>;

  @ApiPropertyOptional({ description: 'Task dependencies' })
  dependenciesInfo?: Array<{
    id: string;
    dependsOnTask: {
      id: string;
      title: string;
      status: string;
    };
    dependencyType: string;
  }>;

  @ApiPropertyOptional({ description: 'Is overdue' })
  isOverdue?: boolean;

  @ApiPropertyOptional({ description: 'Can start (dependencies met)' })
  canStart?: boolean;
}