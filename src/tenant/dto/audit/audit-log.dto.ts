import { IsString, IsOptional, IsUUID, IsObject, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'User ID who performed the action' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Type of entity affected' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID of the entity affected' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Changes made (before/after)' })
  @IsOptional()
  @IsObject()
  changes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Audit log ID' })
  id: string;

  @ApiPropertyOptional({ description: 'User ID who performed the action' })
  userId?: string;

  @ApiProperty({ description: 'Action performed' })
  action: string;

  @ApiPropertyOptional({ description: 'Type of entity affected' })
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID of the entity affected' })
  entityId?: string;

  @ApiPropertyOptional({ description: 'Changes made (before/after)' })
  changes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  userAgent?: string;

  @ApiProperty({ description: 'Timestamp when action was performed' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'User information' })
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export class AuditLogFilterDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by entity type' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filter by entity ID' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsString()
  endDate?: string;
}