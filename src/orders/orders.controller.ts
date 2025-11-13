import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderStatus } from './dto/create-order.dto';
import { UpdateOrderDto, UpdateOrderStatusDto } from './dto/update-order.dto';
import { BulkAssignOrdersDto, BulkUpdateOrderStatusDto } from './dto/bulk-operations.dto';
import { 
  OrderStatisticsDto, 
  OrderStatusCountDto, 
  RevenueStatisticsDto, 
  BulkOperationResultDto 
} from './dto/order-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with filters' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async findAll(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      status: status as any,
      customerId,
      assignedTo,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return this.ordersService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: any,
  ) {
    return this.ordersService.update(id, updateOrderDto, req.user.userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @Get('statistics/summary')
  @ApiOperation({ 
    summary: 'Get orders statistics summary',
    description: 'Returns comprehensive statistics about orders including totals, revenue, and completion rates. Use dateFrom and dateTo query parameters to filter by date range.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully',
    type: OrderStatisticsDto
  })
  async getStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ordersService.getStatistics({ dateFrom, dateTo });
  }

  @Get('statistics/by-status')
  @ApiOperation({ 
    summary: 'Get orders count by status',
    description: 'Returns order counts and total values grouped by order status'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status statistics retrieved successfully',
    type: [OrderStatusCountDto]
  })
  async getOrdersByStatus(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ordersService.getOrdersByStatus({ dateFrom, dateTo });
  }

  @Get('statistics/revenue')
  @ApiOperation({ 
    summary: 'Get revenue statistics',
    description: 'Returns revenue statistics grouped by time period (day, week, or month)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Revenue statistics retrieved successfully',
    type: [RevenueStatisticsDto]
  })
  async getRevenueStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.ordersService.getRevenueStatistics({ dateFrom, dateTo, groupBy });
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing order' })
  @ApiResponse({ status: 201, description: 'Order duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async duplicate(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.duplicate(id, req.user.userId);
  }

  @Patch('bulk/assign')
  @ApiOperation({ 
    summary: 'Bulk assign orders to technician',
    description: 'Assign multiple orders to a specific technician in a single operation'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Orders assigned successfully',
    type: BulkOperationResultDto
  })
  @ApiResponse({ status: 400, description: 'Invalid order IDs or technician' })
  async bulkAssign(
    @Body() bulkAssignDto: BulkAssignOrdersDto,
    @Request() req: any,
  ) {
    return this.ordersService.bulkAssign(bulkAssignDto.orderIds, bulkAssignDto.assignedTo, req.user.userId);
  }

  @Patch('bulk/status')
  @ApiOperation({ 
    summary: 'Bulk update order status',
    description: 'Update the status of multiple orders simultaneously with optional reason'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Orders status updated successfully',
    type: BulkOperationResultDto
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async bulkUpdateStatus(
    @Body() bulkStatusDto: BulkUpdateOrderStatusDto,
    @Request() req: any,
  ) {
    return this.ordersService.bulkUpdateStatus(
      bulkStatusDto.orderIds,
      bulkStatusDto.status,
      req.user.userId,
      bulkStatusDto.reason,
    );
  }
}