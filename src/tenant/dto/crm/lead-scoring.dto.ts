import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsInt,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Lead Scoring Rule Category
 */
export enum ScoringCategory {
  DEMOGRAPHIC = 'demographic',
  ENGAGEMENT = 'engagement',
  BEHAVIOR = 'behavior',
  FIT = 'fit',
}

/**
 * Scoring Condition DTO
 */
export class ScoringConditionDto {
  @ApiProperty({ description: 'Field name to evaluate', example: 'jobTitle' })
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Operator',
    enum: ['equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in'],
    example: 'contains',
  })
  @IsEnum(['equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in'])
  operator: string;

  @ApiProperty({ description: 'Value to compare against' })
  value: any;
}

/**
 * Create Lead Scoring Rule DTO
 */
export class CreateLeadScoringRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'CEO Bonus Points' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Rule category',
    enum: ScoringCategory,
    example: ScoringCategory.DEMOGRAPHIC,
  })
  @IsEnum(ScoringCategory)
  category: ScoringCategory;

  @ApiProperty({ description: 'Rule condition', type: ScoringConditionDto })
  @ValidateNested()
  @Type(() => ScoringConditionDto)
  condition: ScoringConditionDto;

  @ApiProperty({
    description: 'Points to add/subtract',
    example: 20,
    minimum: -100,
    maximum: 100,
  })
  @IsInt()
  @Min(-100)
  @Max(100)
  points: number;

  @ApiPropertyOptional({ description: 'Whether the rule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Priority (higher = evaluated first)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/**
 * Update Lead Scoring Rule DTO
 */
export class UpdateLeadScoringRuleDto {
  @ApiPropertyOptional({ description: 'Rule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Rule category',
    enum: ScoringCategory,
  })
  @IsOptional()
  @IsEnum(ScoringCategory)
  category?: ScoringCategory;

  @ApiPropertyOptional({ description: 'Rule condition', type: ScoringConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringConditionDto)
  condition?: ScoringConditionDto;

  @ApiPropertyOptional({
    description: 'Points to add/subtract',
    minimum: -100,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  points?: number;

  @ApiPropertyOptional({ description: 'Whether the rule is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Priority (higher = evaluated first)',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/**
 * Lead Scoring Rule Filter DTO
 */
export class LeadScoringRuleFilterDto {
  @ApiPropertyOptional({ description: 'Filter by category', enum: ScoringCategory })
  @IsOptional()
  @IsEnum(ScoringCategory)
  category?: ScoringCategory;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by system rules' })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

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

  @ApiPropertyOptional({ description: 'Sort field', default: 'priority' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

/**
 * Lead Scoring Rule Response DTO
 */
export class LeadScoringRuleResponseDto {
  @ApiProperty({ description: 'Rule ID' })
  id: string;

  @ApiProperty({ description: 'Rule name' })
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  description?: string;

  @ApiProperty({ description: 'Rule category', enum: ScoringCategory })
  category: ScoringCategory;

  @ApiProperty({ description: 'Whether the rule is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether the rule is a system rule' })
  isSystem: boolean;

  @ApiProperty({ description: 'Rule condition', type: 'object' })
  condition: any;

  @ApiProperty({ description: 'Points to add/subtract' })
  points: number;

  @ApiProperty({ description: 'Priority' })
  priority: number;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}

/**
 * Lead Score History Response DTO
 */
export class LeadScoreHistoryResponseDto {
  @ApiProperty({ description: 'History entry ID' })
  id: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Old score' })
  oldScore: number;

  @ApiProperty({ description: 'New score' })
  newScore: number;

  @ApiProperty({ description: 'Score change' })
  change: number;

  @ApiProperty({ description: 'Trigger type' })
  triggerType: string;

  @ApiPropertyOptional({ description: 'Trigger ID' })
  triggerId?: string;

  @ApiPropertyOptional({ description: 'Reason for change' })
  reason?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;
}

/**
 * Recalculate Score DTO
 */
export class RecalculateScoreDto {
  @ApiPropertyOptional({
    description: 'Customer ID (if not provided, recalculates all)',
  })
  @IsOptional()
  @IsString()
  customerId?: string;
}

/**
 * Lead Score Classification
 */
export enum LeadScoreClassification {
  COLD = 'cold', // 0-30
  WARM = 'warm', // 31-60
  HOT = 'hot', // 61-100
}

/**
 * Lead Score Summary DTO
 */
export class LeadScoreSummaryDto {
  @ApiProperty({ description: 'Current score' })
  score: number;

  @ApiProperty({ description: 'Score classification', enum: LeadScoreClassification })
  classification: LeadScoreClassification;

  @ApiProperty({ description: 'Score breakdown by category', type: 'object' })
  breakdown: {
    demographic: number;
    engagement: number;
    behavior: number;
    fit: number;
  };

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}

