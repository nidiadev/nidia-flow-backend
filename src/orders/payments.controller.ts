import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, RefundPaymentDto } from './dto/create-payment.dto';
import { PaymentStatisticsDto, PaymentMethodStatsDto } from './dto/order-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.create(createPaymentDto, req.user.userId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payments by order ID' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }

  @Get('order/:orderId/summary')
  @ApiOperation({ summary: 'Get payment summary for order' })
  @ApiResponse({ status: 200, description: 'Payment summary retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getPaymentSummary(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentSummary(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id/refund')
  @ApiOperation({ summary: 'Refund payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({ status: 400, description: 'Cannot refund payment' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refund(
    @Param('id') id: string,
    @Body() refundDto: RefundPaymentDto,
    @Request() req: any,
  ) {
    return this.paymentsService.refund(id, refundDto, req.user.userId);
  }

  @Get('statistics/summary')
  @ApiOperation({ 
    summary: 'Get payments statistics summary',
    description: 'Returns comprehensive payment statistics including totals, success rates, and refund information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment statistics retrieved successfully',
    type: PaymentStatisticsDto
  })
  async getPaymentStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentsService.getPaymentStatistics({ dateFrom, dateTo });
  }

  @Get('statistics/by-method')
  @ApiOperation({ 
    summary: 'Get payments by payment method',
    description: 'Returns payment statistics grouped by payment method (cash, card, transfer, etc.)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment method statistics retrieved successfully',
    type: [PaymentMethodStatsDto]
  })
  async getPaymentsByMethod(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentsService.getPaymentsByMethod({ dateFrom, dateTo });
  }

  @Get('pending-orders')
  @ApiOperation({ summary: 'Get orders with pending payments' })
  @ApiResponse({ status: 200, description: 'Pending payment orders retrieved successfully' })
  async getPendingPaymentOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };
    return this.paymentsService.getPendingPaymentOrders(filters);
  }
}