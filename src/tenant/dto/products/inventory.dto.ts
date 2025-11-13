import { IsString, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export type InventoryMovementTypeString = 'in' | 'out' | 'adjustment';
export type InventoryReferenceTypeString = 'order' | 'purchase' | 'adjustment' | 'return' | 'transfer' | 'damage' | 'loss';

export class CreateInventoryMovementDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  productVariantId?: string;

  @IsString()
  movementType: InventoryMovementTypeString;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  referenceType?: InventoryReferenceTypeString;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;
}

export class InventoryMovementFilterDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  productVariantId?: string;

  @IsOptional()
  @IsString()
  movementType?: InventoryMovementTypeString;

  @IsOptional()
  @IsString()
  referenceType?: InventoryReferenceTypeString;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class InventoryMovementResponseDto {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string;
  };
  productVariantId?: string;
  productVariant?: {
    id: string;
    name: string;
    sku: string;
  };
  movementType: InventoryMovementTypeString;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  referenceType?: InventoryReferenceTypeString;
  referenceId?: string;
  reason?: string;
  costPerUnit?: number;
  totalCost?: number;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
}

export class StockAdjustmentDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  productVariantId?: string;

  @IsNumber()
  @Min(0)
  newQuantity: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkStockUpdateItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  productVariantId?: string;

  @IsNumber()
  @Min(0)
  newQuantity: number;
}

export class BulkStockUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockUpdateItemDto)
  updates: BulkStockUpdateItemDto[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryStatsDto {
  totalProducts: number;
  trackedProducts: number;
  untrackedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  movementsByType: Record<string, {
    count: number;
    totalQuantity: number;
  }>;
  topMovedProducts: {
    productId: string;
    movementCount: number;
    totalQuantity: number;
  }[];
}