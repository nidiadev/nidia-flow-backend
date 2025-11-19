import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPermissions } from '../../common/decorators/user-permissions.decorator';
import { DashboardService } from '../services/dashboard.service';
import { OrdersService } from '../../orders/orders.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { DataScopeService } from '../services/data-scope.service';
import { OrderStatus } from '../../orders/dto/create-order.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly ordersService: OrdersService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
  ) {}

  @Get('metrics')
  @RequirePermissions('dashboard:read', 'reports:read')
  @ApiOperation({
    summary: 'Get dashboard metrics',
    description:
      'Returns aggregated metrics. Users with view_all see all data, others see only their own data.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
  })
  async getMetrics(
    @Query('days') days?: string,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() userPermissions?: string[],
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;

    const metrics = await this.dashboardService.getMetrics(
      userId || '',
      userPermissions || [],
      daysNumber,
    );

    return {
      success: true,
      data: metrics,
    };
  }

  @Get('revenue')
  @RequirePermissions('dashboard:read', 'reports:read')
  @ApiOperation({
    summary: 'Get revenue statistics',
    description:
      'Returns revenue statistics. Users with view_all see all revenue, others see only their own.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue statistics retrieved successfully',
  })
  async getRevenue(
    @Query('days') days?: string,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() userPermissions?: string[],
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysNumber);

    // Apply scope to revenue statistics
    const canViewAll = userPermissions
      ? this.dataScope.canViewAll(userPermissions)
      : false;

    const revenue = await this.ordersService.getRevenueStatistics({
      dateFrom: dateFrom.toISOString(),
      groupBy: 'day',
      assignedTo: canViewAll ? undefined : userId,
    });

    return {
      success: true,
      data: revenue,
    };
  }

  @Get('orders-by-status')
  @RequirePermissions('dashboard:read', 'reports:read')
  @ApiOperation({
    summary: 'Get orders grouped by status',
    description:
      'Returns orders grouped by status. Users with view_all see all orders, others see only their own.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Orders by status retrieved successfully',
  })
  async getOrdersByStatus(
    @Query('days') days?: string,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() userPermissions?: string[],
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysNumber);

    // Apply scope to orders by status
    const canViewAll = userPermissions
      ? this.dataScope.canViewAll(userPermissions)
      : false;

    const ordersByStatus = await this.ordersService.getOrdersByStatus({
      dateFrom: dateFrom.toISOString(),
      assignedTo: canViewAll ? undefined : userId,
    });

    return {
      success: true,
      data: ordersByStatus,
    };
  }

  @Get('top-products')
  @RequirePermissions('dashboard:read', 'reports:read')
  @ApiOperation({
    summary: 'Get top selling products',
    description:
      'Returns top selling products. Users with view_all see all products, others see only products from their orders.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of products to return (default: 5)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Top products retrieved successfully',
  })
  async getTopProducts(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() userPermissions?: string[],
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    const limitNumber = limit ? parseInt(limit, 10) : 5;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysNumber);

    const client = await this.tenantPrisma.getTenantClient();

    // Apply scope to orders
    const canViewAll = userPermissions
      ? this.dataScope.canViewAll(userPermissions)
      : false;

    const orderScope = canViewAll
      ? {}
      : {
          OR: [{ assignedTo: userId }, { createdBy: userId }],
        };

    // Get top products by total quantity sold
    const topProducts = await client.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { not: OrderStatus.CANCELLED },
          createdAt: {
            gte: dateFrom,
          },
          ...orderScope,
        },
        productId: { not: null },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      _count: {
        orderId: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limitNumber,
    });

    // Get product details for each top product
    const productIds = topProducts
      .map((item) => item.productId)
      .filter((id): id is string => id !== null);

    const products = await client.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        price: true,
        imageUrl: true,
      },
    });

    // Combine product data with sales data
    const result = topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Producto eliminado',
        sku: product?.sku || null,
        type: product?.type || null,
        price: product?.price || 0,
        imageUrl: product?.imageUrl || null,
        totalQuantity: item._sum.quantity || 0,
        totalRevenue: item._sum.total || 0,
        orderCount: item._count.orderId || 0,
      };
    });

    return {
      success: true,
      data: result,
    };
  }

  // ===== NEW ENDPOINTS FOR USER-SPECIFIC DASHBOARDS =====

  @Get('users/:userId/metrics')
  @RequirePermissions('dashboard:read', 'reports:read')
  @ApiOperation({
    summary: 'Get metrics for a specific user (Admin only)',
    description:
      'Returns dashboard metrics for a specific user. Only users with view_all permission can access this endpoint.',
  })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID to get metrics for',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'User metrics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to view other users data',
  })
  async getUserMetrics(
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('days') days?: string,
    @UserPermissions() userPermissions?: string[],
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;

    const metrics = await this.dashboardService.getUserSpecificMetrics(
      targetUserId,
      userPermissions || [],
      daysNumber,
    );

    return {
      success: true,
      data: metrics,
    };
  }

  @Get('users/comparison')
  @RequirePermissions('dashboard:read', 'reports:read')
  @ApiOperation({
    summary: 'Get users comparison (Admin only)',
    description:
      'Returns comparison metrics for all users. Only users with view_all permission can access this endpoint.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Users comparison retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to view users comparison',
  })
  async getUsersComparison(
    @Query('days') days?: string,
    @UserPermissions() userPermissions?: string[],
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;

    const comparison = await this.dashboardService.getUsersComparison(
      userPermissions || [],
      daysNumber,
    );

    return {
      success: true,
      data: comparison,
    };
  }
}

