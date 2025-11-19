import { Injectable, ForbiddenException, Logger, Scope } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import { DataScopeService } from './data-scope.service';
import { CustomerService } from './crm/customer.service';
import { OrdersService } from '../../orders/orders.service';
import { OrderStatus } from '../../orders/dto/create-order.dto';

export interface DashboardMetrics {
  customers: {
    total: number;
    leads: number;
    prospects: number;
    active: number;
    conversionRate: number;
  };
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  sales: {
    totalRevenue: number;
    averageTicket: number;
    byStatus: {
      completed: number;
      pending: number;
      inProgress: number;
    };
  };
  performance: {
    leadsToOrders: number;
    ordersToSales: number;
    averageDaysToClose: number;
  };
}

export interface UserDashboardMetrics extends DashboardMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  period: {
    from: string;
    to: string;
  };
}

export interface UsersComparison {
  period: {
    from: string;
    to: string;
  };
  users: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    customers: number;
    orders: number;
    revenue: number;
    conversionRate: number;
  }>;
  totals: {
    customers: number;
    orders: number;
    revenue: number;
  };
}

@Injectable({ scope: Scope.REQUEST })
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    private readonly customerService: CustomerService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Get dashboard metrics with automatic scope filtering
   * - Users with 'view_all': see all data
   * - Users without 'view_all': see only their own data
   */
  async getMetrics(
    userId: string,
    userPermissions: string[],
    days: number = 30,
  ): Promise<DashboardMetrics> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateTo = new Date();

    const canViewAll = this.dataScope.canViewAll(userPermissions);
    const targetUserId = canViewAll ? undefined : userId;

    return this.calculateMetrics(targetUserId, dateFrom, dateTo, userPermissions, userId);
  }

  /**
   * Get metrics for a specific user (admin only)
   */
  async getUserSpecificMetrics(
    targetUserId: string,
    userPermissions: string[],
    days: number = 30,
  ): Promise<UserDashboardMetrics> {
    // Verify permission
    if (!this.dataScope.canViewAll(userPermissions)) {
      throw new ForbiddenException('No tiene permiso para ver datos de otros usuarios');
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateTo = new Date();

    // Get user info
    const prisma = await this.tenantPrisma.getTenantClient();
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const metrics = await this.calculateMetrics(
      targetUserId,
      dateFrom,
      dateTo,
      userPermissions,
      targetUserId,
    );

    return {
      ...metrics,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    };
  }

  /**
   * Get users comparison (admin only)
   */
  async getUsersComparison(
    userPermissions: string[],
    days: number = 30,
  ): Promise<UsersComparison> {
    // Verify permission
    if (!this.dataScope.canViewAll(userPermissions)) {
      throw new ForbiddenException('No tiene permiso para ver comparativas de usuarios');
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateTo = new Date();

    // Get all active users (excluding system users)
    const prisma = await this.tenantPrisma.getTenantClient();
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          not: 'system',
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Calculate metrics for each user
    const usersMetrics = await Promise.all(
      users.map(async (user) => {
        const metrics = await this.calculateMetrics(
          user.id,
          dateFrom,
          dateTo,
          userPermissions,
          user.id,
        );

        return {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          customers: metrics.customers.total,
          orders: metrics.orders.total,
          revenue: metrics.sales.totalRevenue,
          conversionRate: metrics.customers.conversionRate,
        };
      }),
    );

    // Calculate totals
    const totals = usersMetrics.reduce(
      (acc, user) => ({
        customers: acc.customers + user.customers,
        orders: acc.orders + user.orders,
        revenue: acc.revenue + user.revenue,
      }),
      { customers: 0, orders: 0, revenue: 0 },
    );

    return {
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      users: usersMetrics,
      totals,
    };
  }

  /**
   * Calculate metrics for a specific user or all users
   */
  private async calculateMetrics(
    targetUserId: string | undefined,
    dateFrom: Date,
    dateTo: Date,
    userPermissions: string[],
    currentUserId: string,
  ): Promise<DashboardMetrics> {
    const prisma = await this.tenantPrisma.getTenantClient();

    // Build scope filter
    const customerScope = targetUserId
      ? { assignedTo: targetUserId }
      : this.dataScope.getCustomerScope(userPermissions, currentUserId, {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        });

    const orderScope = targetUserId
      ? { assignedTo: targetUserId }
      : this.dataScope.getOrderScope(userPermissions, currentUserId, {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        });

    // Get customer statistics
    const [customersTotal, customersByType, customersByStatus] = await Promise.all([
      prisma.customer.count({
        where: {
          ...(customerScope as any),
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      }),
      prisma.customer.groupBy({
        by: ['type'],
        where: {
          ...(customerScope as any),
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        _count: true,
      }),
      prisma.customer.groupBy({
        by: ['status'],
        where: {
          ...(customerScope as any),
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        _count: true,
      }),
    ]);

    const leads = customersByType.find((c) => c.type === 'LEAD')?._count || 0;
    const prospects = customersByType.find((c) => c.type === 'PROSPECT')?._count || 0;
    const active = customersByStatus.find((c) => c.status === 'ACTIVE')?._count || 0;
    const conversionRate = leads > 0 ? (active / leads) * 100 : 0;

    // Get order statistics
    const [ordersTotal, ordersByStatus, ordersRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          ...(orderScope as any),
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: {
          ...(orderScope as any),
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        _count: true,
      }),
      prisma.order.aggregate({
        where: {
          ...(orderScope as any),
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          status: {
            not: OrderStatus.CANCELLED,
          },
        },
        _sum: {
          total: true,
        },
        _avg: {
          total: true,
        },
      }),
    ]);

    const pending = ordersByStatus.find((o) => o.status === OrderStatus.PENDING)?._count || 0;
    const confirmed = ordersByStatus.find((o) => o.status === OrderStatus.CONFIRMED)?._count || 0;
    const inProgress = ordersByStatus.find((o) => o.status === OrderStatus.IN_PROGRESS)?._count || 0;
    const completed = ordersByStatus.find((o) => o.status === OrderStatus.COMPLETED)?._count || 0;
    const cancelled = ordersByStatus.find((o) => o.status === OrderStatus.CANCELLED)?._count || 0;

    // Get revenue by status
    const [revenueCompleted, revenuePending, revenueInProgress] = await Promise.all([
      prisma.order.aggregate({
        where: {
          ...(orderScope as any),
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          ...(orderScope as any),
          status: OrderStatus.PENDING,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          ...(orderScope as any),
          status: OrderStatus.IN_PROGRESS,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        _sum: { total: true },
      }),
    ]);

    const totalRevenue = ordersRevenue._sum.total || 0;
    const averageTicket = ordersRevenue._avg.total || 0;

    // Calculate performance metrics
    const leadsToOrders = leads > 0 ? (ordersTotal / leads) * 100 : 0;
    const ordersToSales = ordersTotal > 0 ? (completed / ordersTotal) * 100 : 0;

    // Calculate average days to close (simplified: using order creation to completion)
    const completedOrders = await prisma.order.findMany({
      where: {
        ...(orderScope as any),
        status: OrderStatus.COMPLETED,
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        completedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
      take: 100, // Sample for performance
    });

    const averageDaysToClose =
      completedOrders.length > 0
        ? completedOrders.reduce((acc, order) => {
            const days = Math.floor(
              (new Date(order.completedAt!).getTime() - new Date(order.createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return acc + days;
          }, 0) / completedOrders.length
        : 0;

    return {
      customers: {
        total: customersTotal,
        leads,
        prospects,
        active,
        conversionRate: Number(conversionRate.toFixed(2)),
      },
      orders: {
        total: ordersTotal,
        pending,
        confirmed,
        inProgress,
        completed,
        cancelled,
      },
      sales: {
        totalRevenue: Number(totalRevenue),
        averageTicket: Number(averageTicket.toFixed(2)),
        byStatus: {
          completed: Number(revenueCompleted._sum.total || 0),
          pending: Number(revenuePending._sum.total || 0),
          inProgress: Number(revenueInProgress._sum.total || 0),
        },
      },
      performance: {
        leadsToOrders: Number(leadsToOrders.toFixed(2)),
        ordersToSales: Number(ordersToSales.toFixed(2)),
        averageDaysToClose: Number(averageDaysToClose.toFixed(2)),
      },
    };
  }
}

