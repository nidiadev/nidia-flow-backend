import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { OrderStatus } from './create-order.dto';

export class BulkAssignOrdersDto {
  @ApiProperty({ 
    description: 'Array of order IDs to assign',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  orderIds: string[];

  @ApiProperty({ 
    description: 'Technician ID to assign orders to',
    example: 'technician-uuid'
  })
  @IsUUID()
  assignedTo: string;
}

export class BulkUpdateOrderStatusDto {
  @ApiProperty({ 
    description: 'Array of order IDs to update',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  orderIds: string[];

  @ApiProperty({ 
    enum: OrderStatus,
    description: 'New status for all orders'
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({ 
    description: 'Reason for status change',
    required: false,
    example: 'Bulk cancellation due to supply issues'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}