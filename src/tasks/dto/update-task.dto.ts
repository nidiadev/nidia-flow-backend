import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { CreateTaskDto, TaskStatus } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ enum: TaskStatus, description: 'Task status', required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ description: 'Actual duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  actualDurationMinutes?: number;

  @ApiProperty({ description: 'Completion notes', required: false })
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiProperty({ description: 'Cancellation reason', required: false })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiProperty({ description: 'Photo URLs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ description: 'Signature URL', required: false })
  @IsOptional()
  @IsString()
  signatureUrl?: string;
}

export class CheckInDto {
  @ApiProperty({ description: 'Check-in latitude' })
  @IsNumber({ maxDecimalPlaces: 8 })
  latitude: number;

  @ApiProperty({ description: 'Check-in longitude' })
  @IsNumber({ maxDecimalPlaces: 8 })
  longitude: number;

  @ApiProperty({ description: 'Check-in notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckOutDto {
  @ApiProperty({ description: 'Check-out latitude' })
  @IsNumber({ maxDecimalPlaces: 8 })
  latitude: number;

  @ApiProperty({ description: 'Check-out longitude' })
  @IsNumber({ maxDecimalPlaces: 8 })
  longitude: number;

  @ApiProperty({ description: 'Completion notes', required: false })
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiProperty({ description: 'Photo URLs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ description: 'Signature URL', required: false })
  @IsOptional()
  @IsString()
  signatureUrl?: string;
}

export class LocationUpdateDto {
  @ApiProperty({ description: 'Current latitude' })
  @IsNumber({ maxDecimalPlaces: 8 })
  latitude: number;

  @ApiProperty({ description: 'Current longitude' })
  @IsNumber({ maxDecimalPlaces: 8 })
  longitude: number;

  @ApiProperty({ description: 'Timestamp of location update', required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TaskSearchDto {
  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ description: 'Task status filter', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Assigned user filter', required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({ description: 'Customer filter', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'Task type filter', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Priority filter', required: false })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ description: 'Date from filter (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({ description: 'Date to filter (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiProperty({ description: 'Location radius in km', required: false })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiProperty({ description: 'Center latitude for location search', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  centerLat?: number;

  @ApiProperty({ description: 'Center longitude for location search', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  centerLng?: number;

  @ApiProperty({ description: 'Page number', required: false })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ description: 'Sort field', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ description: 'Sort order (asc/desc)', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}

export class UploadPhotosDto {
  @ApiProperty({ description: 'Photo descriptions', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  descriptions?: string[];
}

export class CaptureSignatureDto {
  @ApiProperty({ description: 'Signature data (base64)', required: true })
  @IsString()
  signatureData: string;

  @ApiProperty({ description: 'Customer name for signature', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ description: 'Signature timestamp', required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;
}