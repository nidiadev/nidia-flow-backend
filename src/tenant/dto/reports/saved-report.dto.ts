import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportType {
  SALES = 'sales',
  TASKS = 'tasks',
  CUSTOMERS = 'customers',
  FINANCIALS = 'financials',
  INVENTORY = 'inventory',
}

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class CreateSavedReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ReportType, description: 'Type of report' })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiPropertyOptional({ description: 'Report filters as JSON object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether this report is scheduled' })
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional({ enum: ScheduleFrequency, description: 'Schedule frequency' })
  @IsOptional()
  @IsEnum(ScheduleFrequency)
  scheduleFrequency?: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Day of week for weekly schedule (0-6, Sunday=0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  scheduleDayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month for monthly schedule (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  scheduleDayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Time for scheduled execution (HH:MM format)' })
  @IsOptional()
  @IsString()
  scheduleTime?: string;

  @ApiPropertyOptional({ description: 'Email recipients for scheduled reports' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailRecipients?: string[];
}

export class UpdateSavedReportDto {
  @ApiPropertyOptional({ description: 'Report name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Report filters as JSON object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether this report is scheduled' })
  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional({ enum: ScheduleFrequency, description: 'Schedule frequency' })
  @IsOptional()
  @IsEnum(ScheduleFrequency)
  scheduleFrequency?: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Day of week for weekly schedule (0-6, Sunday=0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  scheduleDayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month for monthly schedule (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  scheduleDayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Time for scheduled execution (HH:MM format)' })
  @IsOptional()
  @IsString()
  scheduleTime?: string;

  @ApiPropertyOptional({ description: 'Email recipients for scheduled reports' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailRecipients?: string[];

  @ApiPropertyOptional({ description: 'Whether this report is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SavedReportResponseDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Report name' })
  name: string;

  @ApiProperty({ description: 'Type of report' })
  reportType: string;

  @ApiProperty({ description: 'Report filters' })
  filters: Record<string, any>;

  @ApiProperty({ description: 'Whether this report is scheduled' })
  isScheduled: boolean;

  @ApiPropertyOptional({ description: 'Schedule frequency' })
  scheduleFrequency?: string;

  @ApiPropertyOptional({ description: 'Day of week for weekly schedule' })
  scheduleDayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month for monthly schedule' })
  scheduleDayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Time for scheduled execution' })
  scheduleTime?: string;

  @ApiProperty({ description: 'Email recipients for scheduled reports' })
  emailRecipients: string[];

  @ApiProperty({ description: 'Whether this report is active' })
  isActive: boolean;

  @ApiProperty({ description: 'User who created the report' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}