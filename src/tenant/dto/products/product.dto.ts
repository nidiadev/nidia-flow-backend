import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsEnum, IsUUID, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProductVariantDto, ProductVariantResponseDto } from './product-variant.dto';

export enum ProductType {
  PRODUCT = 'product',
  SERVICE = 'service',
  COMBO = 'combo',
}



export class CreateComboItemDto {
  @ApiProperty({ description: 'Product ID to include in combo' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity of this product in the combo' })
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  quantity: number;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Product type', enum: ProductType })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Product SKU (unique)' })
  @IsString()
  sku: string;

  @ApiPropertyOptional({ description: 'Product barcode' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Product brand' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Product tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Product price' })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiPropertyOptional({ description: 'Product cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  cost?: number;

  @ApiPropertyOptional({ description: 'Tax rate percentage', default: 19 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Discount percentage', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Whether to track inventory', default: false })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Initial stock quantity', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'Minimum stock level', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMin?: number;

  @ApiPropertyOptional({ description: 'Stock unit', default: 'unit' })
  @IsOptional()
  @IsString()
  stockUnit?: string;

  @ApiPropertyOptional({ description: 'Service duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether service requires scheduling', default: false })
  @IsOptional()
  @IsBoolean()
  requiresScheduling?: boolean;

  @ApiPropertyOptional({ description: 'Main product image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional product images', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Whether product is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether product is featured', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Custom fields as JSON object' })
  @IsOptional()
  customFields?: any;

  @ApiPropertyOptional({ description: 'Product variants', type: [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiPropertyOptional({ description: 'Combo items (for combo products)', type: [CreateComboItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComboItemDto)
  comboItems?: CreateComboItemDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Product type', enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ description: 'Product name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Product SKU (unique)' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Product barcode' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Product brand' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Product tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Product price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  price?: number;

  @ApiPropertyOptional({ description: 'Product cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  cost?: number;

  @ApiPropertyOptional({ description: 'Tax rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Whether to track inventory' })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Stock quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'Minimum stock level' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMin?: number;

  @ApiPropertyOptional({ description: 'Stock unit' })
  @IsOptional()
  @IsString()
  stockUnit?: string;

  @ApiPropertyOptional({ description: 'Service duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether service requires scheduling' })
  @IsOptional()
  @IsBoolean()
  requiresScheduling?: boolean;

  @ApiPropertyOptional({ description: 'Main product image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional product images', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Whether product is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether product is featured' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Custom fields as JSON object' })
  @IsOptional()
  customFields?: any;

  @ApiPropertyOptional({ description: 'Product variants', type: [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiPropertyOptional({ description: 'Combo items (for combo products)', type: [CreateComboItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComboItemDto)
  comboItems?: CreateComboItemDto[];
}

export class ProductFilterDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Product type', enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by inventory tracking' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Filter products with low stock' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}



export class ComboItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl?: string;
  };

  @ApiProperty()
  quantity: number;
}

export class InventoryMovementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  movementType: string;

  @ApiProperty()
  quantity: number;

  @ApiPropertyOptional()
  previousQuantity?: number;

  @ApiPropertyOptional()
  newQuantity?: number;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ProductType })
  type: ProductType;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  sku: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  category?: {
    id: string;
    name: string;
    description?: string;
  };

  @ApiPropertyOptional()
  brand?: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  cost?: number;

  @ApiProperty()
  taxRate: number;

  @ApiProperty()
  discountPercentage: number;

  @ApiProperty()
  trackInventory: boolean;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty()
  stockMin: number;

  @ApiProperty()
  stockUnit: string;

  @ApiPropertyOptional()
  durationMinutes?: number;

  @ApiProperty()
  requiresScheduling: boolean;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiPropertyOptional()
  customFields?: any;

  @ApiProperty({ type: [ProductVariantResponseDto] })
  variants: ProductVariantResponseDto[];

  @ApiProperty({ type: [ComboItemResponseDto] })
  comboItems: ComboItemResponseDto[];

  @ApiProperty({ type: [InventoryMovementResponseDto] })
  inventoryMovements: InventoryMovementResponseDto[];

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ProductStatsDto {
  @ApiProperty()
  totalProducts: number;

  @ApiProperty()
  activeProducts: number;

  @ApiProperty()
  inactiveProducts: number;

  @ApiProperty()
  lowStockProducts: number;

  @ApiProperty()
  totalCategories: number;

  @ApiProperty()
  productsByType: Record<string, number>;

  @ApiProperty()
  productsByCategory: Record<string, number>;
}