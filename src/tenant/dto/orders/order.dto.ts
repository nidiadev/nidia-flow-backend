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
  ValidateNested
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { BaseCustomFieldsDto, SearchDto, DateRangeDto } from '../base/base.dto';

export enum OrderType {
  SERVICE = 'service',
  DELIVERY = 'delivery',
  INSTALLATION = 'installation',
  RENTAL = 'rental'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  CREDIT = 'credit'
}

/**
 * Order Item DTO
 */
export class OrderItemDto {
  @ApiPropertyOptional({ 
    description: 'Product ID'
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ 
    description: 'Product variant ID'
  })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiProperty({ 
    description: 'Item description',
    example: 'Premium Widget - Red Large'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  @ApiProperty({ 
    description: 'Quantity',
    minimum: 0.01,
    example: 2
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @ApiProperty({ 
    description: 'Unit price',
    minimum: 0,
    example: 99.99
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ 
    description: 'Discount percentage',
    minimum: 0,
    maximum: 100,
    example: 10,
    default: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercentage?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Tax rate percentage',
    minimum: 0,
    maximum: 100,
    example: 19,
    default: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number = 0;
}

/**
 * Create Order DTO
 */
export class CreateOrderDto extends BaseCustomFieldsDto {
  @ApiProperty({ 
    description: 'Customer ID'
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ 
    description: 'Order type',
    enum: OrderType,
    example: OrderType.SERVICE
  })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional({ 
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
    default: OrderStatus.PENDING
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus = OrderStatus.PENDING;

  @ApiProperty({ 
    description: 'Order items',
    type: [OrderItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ 
    description: 'Discount amount',
    minimum: 0,
    example: 50.00,
    default: 0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
    default: PaymentStatus.PENDING
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus = PaymentStatus.PENDING;

  @ApiPropertyOptional({ 
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ 
    description: 'Scheduled date',
    example: '2024-12-25T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled start time',
    example: '09:00'
  })
  @IsOptional()
  @IsString()
  scheduledTimeStart?: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled end time',
    example: '17:00'
  })
  @IsOptional()
  @IsString()
  scheduledTimeEnd?: string;

  @ApiPropertyOptional({ 
    description: 'Service address',
    example: 'Calle 123 #45-67, Bogotá'
  })
  @IsOptional()
  @IsString()
  serviceAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Service city',
    example: 'Bogotá'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceCity?: string;

  @ApiPropertyOptional({ 
    description: 'Service location latitude',
    example: 4.7110
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  serviceLatitude?: number;

  @ApiPropertyOptional({ 
    description: 'Service location longitude',
    example: -74.0721
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  serviceLongitude?: number;

  @ApiPropertyOptional({ 
    description: 'Assigned to user ID'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Customer notes',
    example: 'Please call before arriving'
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ 
    description: 'Internal notes',
    example: 'Customer prefers morning appointments'
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

/**
 * Update Order DTO
 */
export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

/**
 * Order Filter DTO
 */
export class OrderFilterDto extends SearchDto {
  @ApiPropertyOptional({ 
    description: 'Filter by customer ID'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by order type',
    enum: OrderType
  })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @ApiPropertyOptional({ 
    description: 'Filter by order status',
    enum: OrderStatus
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by payment status',
    enum: PaymentStatus
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned user ID'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by created user ID'
  })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by service city'
  })
  @IsOptional()
  @IsString()
  serviceCity?: string;

  @ApiPropertyOptional({ 
    description: 'Minimum total amount'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotal?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum total amount'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotal?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by creation date range'
  })
  @IsOptional()
  createdAt?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by scheduled date range'
  })
  @IsOptional()
  scheduledDate?: DateRangeDto;
}

/**
 * Update Order Status DTO
 */
export class UpdateOrderStatusDto {
  @ApiProperty({ 
    description: 'New order status',
    enum: OrderStatus
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ 
    description: 'Status change reason'
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Additional notes'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Assign Order DTO
 */
export class AssignOrderDto {
  @ApiProperty({ 
    description: 'User ID to assign order to'
  })
  @IsUUID()
  assignedTo: string;

  @ApiPropertyOptional({ 
    description: 'Assignment reason'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Cancel Order DTO
 */
export class CancelOrderDto {
  @ApiProperty({ 
    description: 'Cancellation reason'
  })
  @IsString()
  @MinLength(1)
  cancellationReason: string;

  @ApiPropertyOptional({ 
    description: 'Refund amount (if applicable)'
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  refundAmount?: number;
}

/**
 * Order Response DTO
 */
export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order number' })
  orderNumber: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Order type', enum: OrderType })
  type: OrderType;

  @ApiProperty({ description: 'Order status', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ description: 'Order items' })
  items: OrderItemDto[];

  @ApiProperty({ description: 'Subtotal amount' })
  subtotal: number;

  @ApiProperty({ description: 'Discount amount' })
  discountAmount: number;

  @ApiProperty({ description: 'Tax amount' })
  taxAmount: number;

  @ApiProperty({ description: 'Total amount' })
  total: number;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment method', enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Paid amount' })
  paidAmount: number;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Service address' })
  serviceAddress?: string;

  @ApiPropertyOptional({ description: 'Service city' })
  serviceCity?: string;

  @ApiPropertyOptional({ description: 'Service coordinates' })
  serviceLatitude?: number;

  @ApiPropertyOptional({ description: 'Service coordinates' })
  serviceLongitude?: number;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Started at' })
  startedAt?: string;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Cancelled at' })
  cancelledAt?: string;

  @ApiPropertyOptional({ description: 'Customer info' })
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
    phone: string;
  };

  @ApiPropertyOptional({ description: 'Assigned user info' })
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Created by user info' })
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({ description: 'Order items with calculated totals' })
  itemsWithTotals?: Array<OrderItemDto & {
    subtotal: number;
    total: number;
  }>;

  @ApiPropertyOptional({ description: 'Related tasks count' })
  tasksCount?: number;

  @ApiPropertyOptional({ description: 'Payments count' })
  paymentsCount?: number;
}