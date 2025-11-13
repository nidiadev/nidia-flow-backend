import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { InventoryService } from '../../services/products/inventory.service';
import { StockAlertService } from '../../services/products/stock-alert.service';

@ApiTags('Inventory Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly stockAlertService: StockAlertService,
  ) {}

  @Post('movements')
  @ApiOperation({ 
    summary: 'Create inventory movement',
    description: 'Records an inventory movement (in, out, or adjustment) for a product or variant.'
  })
  @ApiBody({
    description: 'Inventory movement data',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', format: 'uuid' },
        productVariantId: { type: 'string', format: 'uuid', nullable: true },
        movementType: { type: 'string', enum: ['in', 'out', 'adjustment'] },
        quantity: { type: 'number', minimum: 0.01 },
        reason: { type: 'string' },
        referenceType: { type: 'string', nullable: true },
        referenceId: { type: 'string', format: 'uuid', nullable: true },
        costPerUnit: { type: 'number', minimum: 0, nullable: true },
      },
      required: ['productId', 'movementType', 'quantity', 'reason'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Inventory movement recorded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Insufficient stock for outbound movement',
  })
  async createMovement(
    @Body() movementData: {
      productId: string;
      productVariantId?: string;
      movementType: 'in' | 'out' | 'adjustment';
      quantity: number;
      reason: string;
      referenceType?: string;
      referenceId?: string;
      costPerUnit?: number;
    },
    @CurrentUser() user: any,
  ): Promise<{ success: boolean; message: string }> {
    // Note: This would call the InventoryService.createMovement method
    // For now, returning a placeholder response
    return {
      success: true,
      message: 'Inventory movement functionality will be implemented in InventoryService',
    };
  }

  @Get('movements')
  @ApiOperation({ 
    summary: 'Get inventory movements',
    description: 'Retrieves a paginated list of inventory movements with filtering options.'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter by product ID' })
  @ApiQuery({ name: 'movementType', required: false, description: 'Filter by movement type', enum: ['in', 'out', 'adjustment'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO string)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory movements retrieved successfully',
  })
  async getMovements(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('productId') productId?: string,
    @Query('movementType') movementType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ success: boolean; data: any[]; pagination: any }> {
    // Note: This would call the InventoryService.getMovements method
    return {
      success: true,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  @Get('stock-levels')
  @ApiOperation({ 
    summary: 'Get current stock levels',
    description: 'Retrieves current stock levels for all products with inventory tracking enabled.'
  })
  @ApiQuery({ name: 'lowStock', required: false, description: 'Filter products with low stock only' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock levels retrieved successfully',
  })
  async getStockLevels(
    @Query('lowStock') lowStock?: boolean,
    @Query('categoryId') categoryId?: string,
  ): Promise<{ success: boolean; data: any[] }> {
    // Note: This would call the InventoryService.getStockLevels method
    return {
      success: true,
      data: [],
    };
  }

  @Get('alerts')
  @ApiOperation({ 
    summary: 'Get stock alerts',
    description: 'Retrieves active stock alerts for products with low or out-of-stock levels.'
  })
  @ApiQuery({ name: 'alertType', required: false, description: 'Filter by alert type', enum: ['low_stock', 'out_of_stock'] })
  @ApiQuery({ name: 'resolved', required: false, description: 'Filter by resolution status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock alerts retrieved successfully',
  })
  async getStockAlerts(
    @Query('alertType') alertType?: string,
    @Query('resolved') resolved?: boolean,
  ): Promise<{ success: boolean; data: any[] }> {
    // Note: This would call the StockAlertService.getAlerts method
    return {
      success: true,
      data: [],
    };
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ 
    summary: 'Resolve stock alert',
    description: 'Marks a stock alert as resolved.'
  })
  @ApiParam({ name: 'alertId', description: 'Stock alert ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock alert resolved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Stock alert not found',
  })
  async resolveAlert(
    @Param('alertId', ParseUUIDPipe) alertId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Note: This would call the StockAlertService.resolveAlert method
    return {
      success: true,
      message: 'Stock alert resolution functionality will be implemented in StockAlertService',
    };
  }

  @Get('valuation')
  @ApiOperation({ 
    summary: 'Get inventory valuation',
    description: 'Calculates the total value of current inventory based on cost prices.'
  })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory valuation calculated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalValue: { type: 'number' },
            totalProducts: { type: 'number' },
            totalQuantity: { type: 'number' },
            byCategory: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  value: { type: 'number' },
                  quantity: { type: 'number' },
                  products: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getInventoryValuation(
    @Query('categoryId') categoryId?: string,
  ): Promise<{ success: boolean; data: any }> {
    // Note: This would call the InventoryService.calculateValuation method
    return {
      success: true,
      data: {
        totalValue: 0,
        totalProducts: 0,
        totalQuantity: 0,
        byCategory: {},
      },
    };
  }
}