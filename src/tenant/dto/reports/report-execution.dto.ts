import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class CreateReportExecutionDto {
  @ApiPropertyOptional({ description: 'ID of the saved report being executed' })
  @IsOptional()
  @IsUUID()
  savedReportId?: string;

  @ApiProperty({ enum: ExecutionStatus, description: 'Execution status' })
  @IsEnum(ExecutionStatus)
  status: ExecutionStatus;

  @ApiPropertyOptional({ description: 'URL of the generated report file' })
  @IsOptional()
  @IsString()
  resultFileUrl?: string;

  @ApiPropertyOptional({ description: 'Error message if execution failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class UpdateReportExecutionDto {
  @ApiPropertyOptional({ enum: ExecutionStatus, description: 'Execution status' })
  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @ApiPropertyOptional({ description: 'URL of the generated report file' })
  @IsOptional()
  @IsString()
  resultFileUrl?: string;

  @ApiPropertyOptional({ description: 'Error message if execution failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class ReportExecutionResponseDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string;

  @ApiPropertyOptional({ description: 'ID of the saved report being executed' })
  savedReportId?: string;

  @ApiProperty({ description: 'Execution status' })
  status: string;

  @ApiPropertyOptional({ description: 'When execution started' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'When execution completed' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'URL of the generated report file' })
  resultFileUrl?: string;

  @ApiPropertyOptional({ description: 'Error message if execution failed' })
  errorMessage?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}