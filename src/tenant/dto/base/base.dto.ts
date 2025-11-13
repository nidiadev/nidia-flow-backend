import { IsOptional, IsUUID, IsDateString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * Base DTO with common fields for all entities
 */
export class BaseEntityDto {
  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ description: 'Creation date' })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Last update date' })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;
}

/**
 * Base DTO for entities with custom fields
 */
export class BaseCustomFieldsDto extends BaseEntityDto {
  @ApiPropertyOptional({ 
    description: 'Custom fields as key-value pairs',
    example: { field1: 'value1', field2: 'value2' }
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Metadata as key-value pairs',
    example: { source: 'api', version: '1.0' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Pagination DTO
 */
export class PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ 
    description: 'Sort field',
    example: 'createdAt'
  })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ 
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc'
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Search DTO
 */
export class SearchDto extends PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Search query',
    example: 'john doe'
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Fields to search in',
    example: ['name', 'email']
  })
  @IsOptional()
  searchFields?: string[];
}

/**
 * Date range filter DTO
 */
export class DateRangeDto {
  @ApiPropertyOptional({ 
    description: 'Start date (ISO string)',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'End date (ISO string)',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Response wrapper DTO
 */
export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Bulk operation DTO
 */
export class BulkOperationDto {
  @ApiPropertyOptional({ 
    description: 'Array of entity IDs',
    example: ['uuid1', 'uuid2', 'uuid3']
  })
  @IsUUID('4', { each: true })
  ids: string[];
}

/**
 * Status update DTO
 */
export class StatusUpdateDto {
  @ApiPropertyOptional({ 
    description: 'New status',
    example: 'active'
  })
  status: string;

  @ApiPropertyOptional({ 
    description: 'Reason for status change',
    example: 'Customer request'
  })
  @IsOptional()
  reason?: string;
}