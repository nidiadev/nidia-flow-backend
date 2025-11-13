import { ApiProperty } from '@nestjs/swagger';

export class OrderStatisticsDto {
  @ApiProperty({ description: 'Total number of orders', example: 150 })
  totalOrders: number;

  @ApiProperty({ description: 'Total revenue from orders', example: 45000.50 })
  totalRevenue: number;

  @ApiProperty({ description: 'Average order value', example: 300.00 })
  averageOrderValue: number;

  @ApiProperty({ description: 'Number of completed orders', example: 120 })
  completedOrders: number;

  @ApiProperty({ description: 'Number of pending orders', example: 25 })
  pendingOrders: number;

  @ApiProperty({ description: 'Number of cancelled orders', example: 5 })
  cancelledOrders: number;

  @ApiProperty({ description: 'Completion rate percentage', example: 80.0 })
  completionRate: number;
}

export class OrderStatusCountDto {
  @ApiProperty({ description: 'Order status', example: 'completed' })
  status: string;

  @ApiProperty({ description: 'Number of orders with this status', example: 45 })
  count: number;

  @ApiProperty({ description: 'Total value of orders with this status', example: 15000.00 })
  totalValue: number;
}

export class RevenueStatisticsDto {
  @ApiProperty({ description: 'Time period', example: '2025-01-15' })
  period: string;

  @ApiProperty({ description: 'Number of orders in period', example: 12 })
  order_count: number;

  @ApiProperty({ description: 'Total revenue in period', example: 3600.00 })
  total_revenue: number;

  @ApiProperty({ description: 'Average order value in period', example: 300.00 })
  avg_order_value: number;
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Success message', example: '5 orders assigned successfully' })
  message: string;

  @ApiProperty({ description: 'Number of affected orders', example: 5 })
  assignedCount?: number;

  @ApiProperty({ description: 'Number of updated orders', example: 5 })
  updatedCount?: number;
}

export class PaymentStatisticsDto {
  @ApiProperty({ description: 'Total number of payments', example: 200 })
  totalPayments: number;

  @ApiProperty({ description: 'Total payment amount', example: 50000.00 })
  totalAmount: number;

  @ApiProperty({ description: 'Total refunded amount', example: 1500.00 })
  totalRefunded: number;

  @ApiProperty({ description: 'Net payment amount', example: 48500.00 })
  netAmount: number;

  @ApiProperty({ description: 'Number of completed payments', example: 180 })
  completedPayments: number;

  @ApiProperty({ description: 'Number of pending payments', example: 15 })
  pendingPayments: number;

  @ApiProperty({ description: 'Number of failed payments', example: 5 })
  failedPayments: number;

  @ApiProperty({ description: 'Payment success rate percentage', example: 90.0 })
  successRate: number;
}

export class PaymentMethodStatsDto {
  @ApiProperty({ description: 'Payment method', example: 'card' })
  paymentMethod: string;

  @ApiProperty({ description: 'Number of payments with this method', example: 75 })
  count: number;

  @ApiProperty({ description: 'Total amount for this payment method', example: 22500.00 })
  totalAmount: number;
}