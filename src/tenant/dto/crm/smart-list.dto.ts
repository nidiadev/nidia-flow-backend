import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Filter Operator Types
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
}

/**
 * Filter Field Types
 */
export enum FilterFieldType {
  STRING = 'string',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
}

/**
 * Filter Condition DTO
 */
export class FilterConditionDto {
  @ApiProperty({ description: 'Field name to filter on', example: 'type' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Field type', enum: FilterFieldType, example: FilterFieldType.STRING })
  @IsEnum(FilterFieldType)
  fieldType: FilterFieldType;

  @ApiProperty({ description: 'Filter operator', enum: FilterOperator, example: FilterOperator.EQUALS })
  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @ApiPropertyOptional({ description: 'Filter value (can be string, number, array, etc.)' })
  value?: any;

  @ApiPropertyOptional({ description: 'Second value for BETWEEN operator' })
  @IsOptional()
  value2?: any;
}

/**
 * Filter Group DTO
 */
export class FilterGroupDto {
  @ApiProperty({ description: 'Filter logic (AND/OR)', enum: ['AND', 'OR'], example: 'AND' })
  @IsEnum(['AND', 'OR'])
  logic: 'AND' | 'OR';

  @ApiProperty({
    description: 'Filter conditions',
    type: [FilterConditionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  conditions: FilterConditionDto[];

  @ApiPropertyOptional({
    description: 'Nested filter groups',
    type: [FilterGroupDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterGroupDto)
  groups?: FilterGroupDto[];
}

/**
 * Create Smart List DTO
 */
export class CreateSmartListDto {
  @ApiProperty({ description: 'Smart list name', example: 'Leads Calientes' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Smart list description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the list is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter configuration',
    type: FilterGroupDto,
  })
  @ValidateNested()
  @Type(() => FilterGroupDto)
  filterConfig: FilterGroupDto;

  @ApiPropertyOptional({ description: 'Filter logic (AND/OR)', enum: ['AND', 'OR'], default: 'AND' })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  filterLogic?: 'AND' | 'OR';

  @ApiPropertyOptional({ description: 'Auto-update list when data changes', default: true })
  @IsOptional()
  @IsBoolean()
  autoUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Update Smart List DTO
 */
export class UpdateSmartListDto {
  @ApiPropertyOptional({ description: 'Smart list name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Smart list description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the list is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter configuration',
    type: FilterGroupDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterGroupDto)
  filterConfig?: FilterGroupDto;

  @ApiPropertyOptional({ description: 'Filter logic (AND/OR)', enum: ['AND', 'OR'] })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  filterLogic?: 'AND' | 'OR';

  @ApiPropertyOptional({ description: 'Auto-update list when data changes' })
  @IsOptional()
  @IsBoolean()
  autoUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Smart List Filter DTO
 */
export class SmartListFilterDto {
  @ApiPropertyOptional({ description: 'Filter by name (partial match)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by system lists' })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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
 * Smart List Response DTO
 */
export class SmartListResponseDto {
  @ApiProperty({ description: 'Smart list ID' })
  id: string;

  @ApiProperty({ description: 'Smart list name' })
  name: string;

  @ApiPropertyOptional({ description: 'Smart list description' })
  description?: string;

  @ApiProperty({ description: 'Whether the list is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether the list is a system list' })
  isSystem: boolean;

  @ApiProperty({ description: 'Filter configuration', type: 'object' })
  filterConfig: any;

  @ApiProperty({ description: 'Filter logic', enum: ['AND', 'OR'] })
  filterLogic: 'AND' | 'OR';

  @ApiProperty({ description: 'Auto-update enabled' })
  autoUpdate: boolean;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdatedAt?: Date;

  @ApiProperty({ description: 'Member count' })
  memberCount: number;

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}

/**
 * Smart List Member Response DTO
 */
export class SmartListMemberResponseDto {
  @ApiProperty({ description: 'Member ID' })
  id: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Customer info' })
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    type: string;
    leadScore: number;
  };

  @ApiProperty({ description: 'Added timestamp' })
  addedAt: Date;
}

/**
 * Bulk Action DTO
 */
export class BulkActionDto {
  @ApiProperty({
    description: 'Action type',
    enum: ['assign', 'tag', 'untag', 'change_type', 'change_owner', 'export'],
  })
  @IsEnum(['assign', 'tag', 'untag', 'change_type', 'change_owner', 'export'])
  action: 'assign' | 'tag' | 'untag' | 'change_type' | 'change_owner' | 'export';

  @ApiPropertyOptional({ description: 'User ID for assign/change_owner actions' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Tags for tag/untag actions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'New type for change_type action' })
  @IsOptional()
  @IsString()
  newType?: string;
}

