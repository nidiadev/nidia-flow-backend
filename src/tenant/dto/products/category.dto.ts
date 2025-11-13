import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsUUID,
  MinLength,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BaseEntityDto, SearchDto } from '../base/base.dto';

/**
 * Create Category DTO
 */
export class CreateCategoryDto extends BaseEntityDto {
  @ApiProperty({ 
    description: 'Category name',
    minLength: 1,
    maxLength: 255,
    example: 'Electronics'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ 
    description: 'Category description',
    example: 'Electronic devices and accessories'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Parent category ID (for hierarchical categories)'
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ 
    description: 'Is category active',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

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
 * Update Category DTO
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

/**
 * Category Filter DTO
 */
export class CategoryFilterDto extends SearchDto {
  @ApiPropertyOptional({ 
    description: 'Filter by parent category ID'
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by active status'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Include only root categories (no parent)'
  })
  @IsOptional()
  @IsBoolean()
  rootOnly?: boolean;
}

/**
 * Category Response DTO
 */
export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  parentId?: string;

  @ApiPropertyOptional({ description: 'Is category active' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Category image URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Category metadata' })
  metadata?: any;

  @ApiPropertyOptional({ description: 'Parent category info' })
  parent?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Child categories' })
  children?: CategoryResponseDto[];

  @ApiPropertyOptional({ description: 'Products count in this category' })
  productsCount?: number;

  @ApiPropertyOptional({ description: 'Full category path' })
  path?: string[];
}

/**
 * Category Tree DTO
 */
export class CategoryTreeDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Products count' })
  productsCount: number;

  @ApiPropertyOptional({ description: 'Child categories' })
  children?: CategoryTreeDto[];
}
/**
 * C
ategory Stats DTO
 */
export class CategoryStatsDto {
  @ApiProperty({ description: 'Total categories count' })
  totalCategories: number;

  @ApiProperty({ description: 'Active categories count' })
  activeCategories: number;

  @ApiProperty({ description: 'Inactive categories count' })
  inactiveCategories: number;

  @ApiProperty({ description: 'Root categories count' })
  rootCategories: number;

  @ApiProperty({ description: 'Categories with products count' })
  categoriesWithProducts: number;

  @ApiProperty({ description: 'Average products per category' })
  averageProductsPerCategory: number;
}