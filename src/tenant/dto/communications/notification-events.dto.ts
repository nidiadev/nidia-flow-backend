import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderNotificationDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

  @ApiPropertyOptional({ description: 'User ID to assign the order to' })
  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}

export class TaskNotificationDto {
  @ApiProperty({ description: 'Task ID' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: 'Task title' })
  @IsString()
  taskTitle: string;

  @ApiProperty({ description: 'User ID assigned to the task' })
  @IsString()
  assignedToUserId: string;
}

export class TaskCompletionNotificationDto {
  @ApiProperty({ description: 'Task ID' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: 'Task title' })
  @IsString()
  taskTitle: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;
}

export class PaymentNotificationDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;
}

export class StockNotificationDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Current stock level' })
  @IsNumber()
  currentStock: number;
}

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiProperty({ 
    description: 'Notification type',
    enum: ['info', 'success', 'warning', 'error']
  })
  @IsString()
  type: 'info' | 'success' | 'warning' | 'error';

  @ApiPropertyOptional({ description: 'Action URL to navigate to' })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}