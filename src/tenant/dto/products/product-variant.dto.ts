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
import { BaseEntityDto } from '../base/base.dto';

/**
 * Create Product Variant DTO
 */
export class CreateProductVariantDto extends BaseEntityDto {
  @ApiProperty({ 
    description: 'Product ID this variant belongs to'
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ 
    description: 'Variant name',
    minLength: 1,
    maxLength: 255,
    example: 'Red - Large'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ 
    description: 'Variant SKU',
    maxLength: 100,
    example: 'WDG-001-RED-L'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ 
    description: 'Price adjustment from base product price',
    example: 10.00,
    default: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  priceAdjustment?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Stock quantity for this variant',
    minimum: 0,
    example: 50,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number = 0;

  @ApiPropertyOptional({ 
    description: 'First option name (e.g., Color)',
    maxLength: 50,
    example: 'Color'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  option1Name?: string;

  @ApiPropertyOptional({ 
    description: 'First option value (e.g., Red)',
    maxLength: 50,
    example: 'Red'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  option1Value?: string;

  @ApiPropertyOptional({ 
    description: 'Second option name (e.g., Size)',
    maxLength: 50,
    example: 'Size'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  option2Name?: string;

  @ApiPropertyOptional({ 
    description: 'Second option value (e.g., Large)',
    maxLength: 50,
    example: 'Large'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  option2Value?: string;

  @ApiPropertyOptional({ 
    description: 'Is variant active',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

/**
 * Update Product Variant DTO
 */
export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) {
  @ApiPropertyOptional({ description: 'Product ID this variant belongs to' })
  @IsOptional()
  @IsUUID()
  productId?: string;
}

/**
 * Bulk Create Variants DTO
 */
export class BulkCreateVariantsDto {
  @ApiProperty({ 
    description: 'Product ID to create variants for'
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ 
    description: 'First option configuration'
  })
  option1: {
    name: string;
    values: string[];
  };

  @ApiPropertyOptional({ 
    description: 'Second option configuration'
  })
  @IsOptional()
  option2?: {
    name: string;
    values: string[];
  };

  @ApiPropertyOptional({ 
    description: 'Default price adjustment for all variants'
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  defaultPriceAdjustment?: number;

  @ApiPropertyOptional({ 
    description: 'Default stock quantity for all variants'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultStockQuantity?: number;
}

/**
 * Update Variant Stock DTO
 */
export class UpdateVariantStockDto {
  @ApiProperty({ 
    description: 'New stock quantity',
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @ApiPropertyOptional({ 
    description: 'Reason for stock update'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Product Variant Response DTO
 */
export class ProductVariantResponseDto {
  @ApiProperty({ description: 'Variant ID' })
  id: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiProperty({ description: 'Product ID this variant belongs to' })
  productId: string;

  @ApiProperty({ description: 'Variant name' })
  name: string;

  @ApiPropertyOptional({ description: 'Variant SKU' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Price adjustment' })
  priceAdjustment?: number;

  @ApiPropertyOptional({ description: 'Stock quantity' })
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'First option name' })
  option1Name?: string;

  @ApiPropertyOptional({ description: 'First option value' })
  option1Value?: string;

  @ApiPropertyOptional({ description: 'Second option name' })
  option2Name?: string;

  @ApiPropertyOptional({ description: 'Second option value' })
  option2Value?: string;

  @ApiPropertyOptional({ description: 'Is variant active' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Product info' })
  product?: {
    id: string;
    name: string;
    price: number;
    type: string;
  };

  @ApiPropertyOptional({ description: 'Final price (base price + adjustment)' })
  finalPrice?: number;

  @ApiPropertyOptional({ description: 'Is low stock' })
  isLowStock?: boolean;

  @ApiPropertyOptional({ description: 'Is out of stock' })
  isOutOfStock?: boolean;
}