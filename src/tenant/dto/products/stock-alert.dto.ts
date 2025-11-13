import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum StockAlertType {
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  OVERSTOCK = 'overstock',
}

export type StockAlertTypeString = 'low_stock' | 'out_of_stock' | 'overstock';

export enum StockAlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export type StockAlertStatusString = 'active' | 'acknowledged' | 'resolved';

export class CreateStockAlertDto {
  @IsString()
  productId: string;

  @IsString()
  alertType: StockAlertTypeString;

  @IsNumber()
  @Min(0)
  currentStock: number;

  @IsNumber()
  @Min(0)
  thresholdStock: number;

  @IsOptional()
  @IsString()
  productVariantId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class StockAlertFilterDto {
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
  alertType?: StockAlertTypeString;

  @IsOptional()
  @IsEnum(StockAlertStatus)
  status?: StockAlertStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isNotified?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class StockAlertResponseDto {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string;
    stockUnit?: string;
    currentStock?: number;
    minStock?: number;
    category?: {
      id: string;
      name: string;
    };
  };
  alertType: StockAlertTypeString;
  currentStock: number;
  thresholdStock: number;
  status: StockAlertStatusString;
  acknowledgedAt?: Date;
  acknowledgedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  resolvedAt?: Date;
  isNotified: boolean;
  notifiedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class StockAlertStatsDto {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  unnotifiedAlerts: number;
  alertsByType: Record<string, number>;
  topAlertsProducts: {
    productId: string;
    alertCount: number;
  }[];
}