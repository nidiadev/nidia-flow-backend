import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * Create Deal Stage DTO
 */
export class CreateDealStageDto {
  @ApiProperty({ 
    description: 'Stage name (internal identifier)',
    minLength: 1,
    maxLength: 100,
    example: 'qualification'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    description: 'Display name',
    minLength: 1,
    maxLength: 255,
    example: 'Calificación'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;

  @ApiPropertyOptional({ 
    description: 'Stage description',
    example: 'Validar si es una oportunidad real'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Probability of closing (0-100)',
    minimum: 0,
    maximum: 100,
    example: 10
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  probability: number;

  @ApiPropertyOptional({ 
    description: 'Sort order (for display order)',
    minimum: 0,
    example: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value || 0))
  sortOrder?: number;

  @ApiPropertyOptional({ 
    description: 'Hex color code for UI',
    pattern: '^#[0-9A-Fa-f]{6}$',
    example: '#3b82f6'
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color code (e.g., #3b82f6)' })
  color?: string;
}

/**
 * Update Deal Stage DTO
 */
export class UpdateDealStageDto {
  @ApiPropertyOptional({ 
    description: 'Stage name',
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Display name',
    minLength: 1,
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ 
    description: 'Stage description'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Probability of closing (0-100)',
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  probability?: number;

  @ApiPropertyOptional({ 
    description: 'Sort order',
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  sortOrder?: number;

  @ApiPropertyOptional({ 
    description: 'Hex color code',
    pattern: '^#[0-9A-Fa-f]{6}$'
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color code' })
  color?: string;

  @ApiPropertyOptional({ 
    description: 'Is stage active',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Deal Stage Response DTO
 */
export class DealStageResponseDto {
  @ApiProperty({ description: 'Stage ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Stage name' })
  name: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Probability (0-100)' })
  probability: number;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Is default stage' })
  isDefault: boolean;

  @ApiPropertyOptional({ description: 'Hex color code' })
  color?: string;

  @ApiProperty({ description: 'Number of deals in this stage' })
  dealsCount: number;

  @ApiProperty({ description: 'Created at', format: 'date-time' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at', format: 'date-time' })
  updatedAt: string;
}

