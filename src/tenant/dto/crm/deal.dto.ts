import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsBoolean, 
  IsArray, 
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsDecimal
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { BaseCustomFieldsDto, SearchDto, DateRangeDto } from '../base/base.dto';

export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
  ABANDONED = 'abandoned'
}

/**
 * Deal Product DTO (used in CreateDealDto)
 */
export class DealProductDto {
  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity', minimum: 1, example: 1 })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  quantity: number;

  @ApiProperty({ description: 'Unit price', minimum: 0, example: 1000000.00 })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Discount percentage', minimum: 0, maximum: 100, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value || 0))
  discount?: number;

  @ApiPropertyOptional({ description: 'Notes about this product in the deal' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Create Deal DTO
 */
export class CreateDealDto extends BaseCustomFieldsDto {
  @ApiProperty({ 
    description: 'Deal name',
    minLength: 1,
    maxLength: 255,
    example: 'Implementación CRM para Acme Corp'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ 
    description: 'Deal description',
    example: 'Implementación completa del módulo CRM con integración WhatsApp'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Customer ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ 
    description: 'Deal stage ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  stageId: string;

  @ApiPropertyOptional({ 
    description: 'Probability override (0-100). If not provided, uses stage probability',
    minimum: 0,
    maximum: 100,
    example: 60
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiProperty({ 
    description: 'Deal amount',
    minimum: 0,
    example: 5000000.00
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiPropertyOptional({ 
    description: 'Currency code (ISO 4217)',
    default: 'COP',
    example: 'COP',
    maxLength: 3
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ 
    description: 'Expected close date',
    format: 'date-time',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ 
    description: 'Assigned user ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Tags for categorization',
    type: [String],
    example: ['enterprise', 'urgent', 'q4-2024']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Notes about the deal',
    example: 'Cliente muy interesado, necesita respuesta rápida'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Contact IDs to link to this deal',
    type: [String],
    format: 'uuid',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  contactIds?: string[];

  @ApiPropertyOptional({ 
    description: 'Product IDs with quantities and prices',
    type: [DealProductDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealProductDto)
  products?: DealProductDto[];
}

/**
 * Update Deal DTO
 */
export class UpdateDealDto extends PartialType(CreateDealDto) {
  @ApiPropertyOptional({ 
    description: 'Deal status',
    enum: DealStatus,
    example: DealStatus.WON
  })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @ApiPropertyOptional({ 
    description: 'Reason for losing the deal (required if status is lost)',
    maxLength: 255,
    example: 'Precio muy alto, eligieron competidor'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lostReason?: string;
}

/**
 * Deal Filter DTO
 */
export class DealFilterDto extends SearchDto {
  @ApiPropertyOptional({ 
    description: 'Filter by customer ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by stage ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: DealStatus
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  })
  @IsEnum(DealStatus, { message: 'Status must be one of: open, won, lost, abandoned' })
  status?: DealStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned user ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by tags',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Minimum amount',
    minimum: 0
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  })
  @IsNumber({}, { message: 'minAmount must be a number' })
  @Min(0, { message: 'minAmount must not be less than 0' })
  minAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum amount',
    minimum: 0
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  })
  @IsNumber({}, { message: 'maxAmount must be a number' })
  @Min(0, { message: 'maxAmount must not be less than 0' })
  maxAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by expected close date range',
    type: DateRangeDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  expectedCloseDate?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by creation date range',
    type: DateRangeDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  createdAt?: DateRangeDto;
}

/**
 * Change Deal Stage DTO
 */
export class ChangeDealStageDto {
  @ApiProperty({ 
    description: 'New stage ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  stageId: string;

  @ApiPropertyOptional({ 
    description: 'Probability override (0-100)',
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ 
    description: 'Notes about the stage change',
    example: 'Cliente aprobó presupuesto, moviendo a negociación'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Win/Lose Deal DTO
 */
export class WinLoseDealDto {
  @ApiPropertyOptional({ 
    description: 'Reason for losing (required if losing)',
    maxLength: 255,
    example: 'Precio muy alto'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lostReason?: string;

  @ApiPropertyOptional({ 
    description: 'Notes about winning/losing',
    example: 'Cliente firmó contrato el día de hoy'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Deal Response DTO
 */
export class DealResponseDto {
  @ApiProperty({ description: 'Deal ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Deal name' })
  name: string;

  @ApiPropertyOptional({ description: 'Deal description' })
  description?: string;

  @ApiProperty({ description: 'Customer ID', format: 'uuid' })
  customerId: string;

  @ApiProperty({ description: 'Customer information' })
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
  };

  @ApiProperty({ description: 'Stage ID', format: 'uuid' })
  stageId: string;

  @ApiProperty({ description: 'Stage information' })
  stage: {
    id: string;
    name: string;
    displayName: string;
    probability: number;
    color?: string;
  };

  @ApiProperty({ description: 'Current probability (0-100)' })
  probability: number;

  @ApiProperty({ description: 'Deal amount' })
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiPropertyOptional({ description: 'Expected close date', format: 'date-time' })
  expectedCloseDate?: string;

  @ApiProperty({ description: 'Deal status', enum: DealStatus })
  status: DealStatus;

  @ApiPropertyOptional({ description: 'Lost reason' })
  lostReason?: string;

  @ApiPropertyOptional({ description: 'Won at date', format: 'date-time' })
  wonAt?: string;

  @ApiPropertyOptional({ description: 'Lost at date', format: 'date-time' })
  lostAt?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID', format: 'uuid' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Assigned user information' })
  assignedToUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  @ApiProperty({ description: 'Days in current stage' })
  daysInStage: number;

  @ApiPropertyOptional({ description: 'Last stage change date', format: 'date-time' })
  lastStageChangeAt?: string;

  @ApiProperty({ description: 'Stage history', type: 'array' })
  stageHistory: Array<{
    stageId: string;
    stageName: string;
    changedAt: string;
    changedBy: string;
    changedByName?: string;
  }>;

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiProperty({ 
    description: 'Custom fields', 
    type: 'object',
    additionalProperties: true,
  })
  customFields: Record<string, any>;

  @ApiProperty({ description: 'Linked contacts', type: 'array' })
  contacts: Array<{
    id: string;
    contactId: string;
    contact: {
      id: string;
      firstName: string;
      lastName?: string;
      email?: string;
      phone?: string;
      position?: string;
    };
    role?: string;
    isPrimary: boolean;
  }>;

  @ApiProperty({ description: 'Linked products', type: 'array' })
  products: Array<{
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
    notes?: string;
  }>;

  @ApiProperty({ description: 'Weighted amount (amount * probability / 100)' })
  weightedAmount: number;

  @ApiProperty({ description: 'Created by user ID', format: 'uuid' })
  createdBy: string;

  @ApiProperty({ description: 'Created at', format: 'date-time' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at', format: 'date-time' })
  updatedAt: string;
}

/**
 * Deal Summary DTO (for lists and Kanban)
 */
export class DealSummaryDto {
  @ApiProperty({ description: 'Deal ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Deal name' })
  name: string;

  @ApiProperty({ description: 'Customer ID', format: 'uuid' })
  customerId: string;

  @ApiProperty({ description: 'Customer name' })
  customerName: string;

  @ApiProperty({ description: 'Stage ID', format: 'uuid' })
  stageId: string;

  @ApiProperty({ description: 'Stage name' })
  stageName: string;

  @ApiProperty({ description: 'Probability' })
  probability: number;

  @ApiProperty({ description: 'Amount' })
  amount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Weighted amount' })
  weightedAmount: number;

  @ApiProperty({ description: 'Status', enum: DealStatus })
  status: DealStatus;

  @ApiPropertyOptional({ description: 'Expected close date', format: 'date-time' })
  expectedCloseDate?: string;

  @ApiProperty({ description: 'Days in stage' })
  daysInStage: number;

  @ApiPropertyOptional({ description: 'Assigned user name' })
  assignedToName?: string;

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];
}

