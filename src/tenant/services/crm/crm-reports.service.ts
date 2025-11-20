import { Injectable, Logger, Scope } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { DataScopeService } from '../data-scope.service';
import { DealService } from './deal.service';

/**
 * CRM Reports Service
 * 
 * Service for generating CRM-specific reports and analytics
 */
@Injectable({ scope: Scope.REQUEST })
export class CrmReportsService {
  private readonly logger = new Logger(CrmReportsService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    private readonly dealService: DealService,
  ) {}

  /**
   * Get pipeline KPIs
   */
  async getPipelineKPIs(userId: string, userPermissions: string[]): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    // Get pipeline stats from DealService
    const pipelineStats = await this.dealService.getPipelineStats(userId, userPermissions);

    // Calculate conversion rates by stage
    const deals = await prisma.deal.findMany({
      where: this.dataScope.getDealScope(userPermissions, userId, {}),
      include: {
        stage: true,
      },
    });

    // Group deals by stage
    const dealsByStage = deals.reduce((acc, deal) => {
      const stageName = deal.stage.displayName;
      if (!acc[stageName]) {
        acc[stageName] = {
          stageId: deal.stageId,
          stageName,
          total: 0,
          totalAmount: 0,
          won: 0,
          wonAmount: 0,
          lost: 0,
          lostAmount: 0,
        };
      }
      acc[stageName].total++;
      acc[stageName].totalAmount += Number(deal.amount);

      if (deal.status === 'won') {
        acc[stageName].won++;
        acc[stageName].wonAmount += Number(deal.amount);
      } else if (deal.status === 'lost') {
        acc[stageName].lost++;
        acc[stageName].lostAmount += Number(deal.amount);
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate conversion rates
    const conversionRates = Object.values(dealsByStage).map((stage: any) => ({
      ...stage,
      conversionRate: stage.total > 0 ? (stage.won / stage.total) * 100 : 0,
      winRate: stage.total > 0 ? (stage.won / stage.total) * 100 : 0,
    }));

    return {
      ...pipelineStats,
      conversionRatesByStage: conversionRates,
    };
  }

  /**
   * Get win rate (global and by seller)
   */
  async getWinRate(
    userId: string,
    userPermissions: string[],
    sellerId?: string,
  ): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    const where: any = this.dataScope.getDealScope(userPermissions, userId, {});
    if (sellerId) {
      where.assignedTo = sellerId;
    }

    const [totalDeals, wonDeals, lostDeals] = await Promise.all([
      prisma.deal.count({
        where: {
          ...where,
          status: { in: ['won', 'lost'] },
        },
      }),
      prisma.deal.count({
        where: {
          ...where,
          status: 'won',
        },
      }),
      prisma.deal.count({
        where: {
          ...where,
          status: 'lost',
        },
      }),
    ]);

    const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    // Get win rate by seller
    const dealsBySeller = await prisma.deal.groupBy({
      by: ['assignedTo'],
      where: {
        ...where,
        status: { in: ['won', 'lost'] },
        assignedTo: { not: null },
      },
      _count: {
        id: true,
      },
    });

    const winRateBySeller = await Promise.all(
      dealsBySeller.map(async (group) => {
        const sellerId = group.assignedTo!;
        const [won, lost] = await Promise.all([
          prisma.deal.count({
            where: {
              ...where,
              assignedTo: sellerId,
              status: 'won',
            },
          }),
          prisma.deal.count({
            where: {
              ...where,
              assignedTo: sellerId,
              status: 'lost',
            },
          }),
        ]);

        const total = won + lost;
        const sellerWinRate = total > 0 ? (won / total) * 100 : 0;

        const user = await prisma.user.findUnique({
          where: { id: sellerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });

        return {
          sellerId,
          sellerName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          sellerEmail: user?.email,
          totalDeals: total,
          wonDeals: won,
          lostDeals: lost,
          winRate: sellerWinRate,
        };
      }),
    );

    return {
      global: {
        totalDeals,
        wonDeals,
        lostDeals,
        winRate,
      },
      bySeller: winRateBySeller,
    };
  }

  /**
   * Get average time to close
   */
  async getAverageTimeToClose(
    userId: string,
    userPermissions: string[],
    sellerId?: string,
  ): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    const where: any = {
      ...this.dataScope.getDealScope(userPermissions, userId, {}),
      status: 'won',
      closedAt: { not: null },
    };

    if (sellerId) {
      where.assignedTo = sellerId;
    }

    const wonDeals = await prisma.deal.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        closedAt: true,
        assignedTo: true,
      },
    });

    if (wonDeals.length === 0) {
      return {
        averageDays: 0,
        minDays: 0,
        maxDays: 0,
        dealsCount: 0,
      };
    }

    const daysToClose = wonDeals.map((deal) => {
      const created = new Date(deal.createdAt).getTime();
      const closed = new Date(deal.closedAt!).getTime();
      return Math.floor((closed - created) / (1000 * 60 * 60 * 24));
    });

    const averageDays = daysToClose.reduce((sum, days) => sum + days, 0) / daysToClose.length;
    const minDays = Math.min(...daysToClose);
    const maxDays = Math.max(...daysToClose);

    return {
      averageDays: Math.round(averageDays),
      minDays,
      maxDays,
      dealsCount: wonDeals.length,
    };
  }

  /**
   * Get conversion funnel report
   */
  async getConversionFunnel(
    userId: string,
    userPermissions: string[],
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    const where = this.dataScope.getDealScope(userPermissions, userId, {});
    if (dateFrom) {
      where.createdAt = { ...where.createdAt, gte: dateFrom };
    }
    if (dateTo) {
      where.createdAt = { ...where.createdAt, lte: dateTo };
    }

    // Get all deals with stages
    const deals = await prisma.deal.findMany({
      where,
      include: {
        stage: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by stage
    const funnel = deals.reduce((acc, deal) => {
      const stageId = deal.stageId;
      if (!acc[stageId]) {
        acc[stageId] = {
          stageId,
          stageName: deal.stage.displayName,
          sortOrder: deal.stage.sortOrder,
          deals: [],
          count: 0,
          totalAmount: 0,
        };
      }
      acc[stageId].deals.push(deal);
      acc[stageId].count++;
      acc[stageId].totalAmount += Number(deal.amount);
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by sortOrder
    const funnelArray = Object.values(funnel).sort(
      (a: any, b: any) => a.sortOrder - b.sortOrder,
    );

    // Calculate conversion rates between stages
    const funnelWithRates = funnelArray.map((stage: any, index: number) => {
      const previousStage = index > 0 ? funnelArray[index - 1] : null;
      const conversionRate = previousStage && previousStage.count > 0
        ? (stage.count / previousStage.count) * 100
        : 100;

      return {
        ...stage,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropOffRate: previousStage ? 100 - conversionRate : 0,
      };
    });

    return {
      funnel: funnelWithRates,
      totalDeals: deals.length,
      totalAmount: deals.reduce((sum, d) => sum + Number(d.amount), 0),
    };
  }

  /**
   * Get pipeline velocity report
   */
  async getPipelineVelocity(
    userId: string,
    userPermissions: string[],
  ): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    const where = this.dataScope.getDealScope(userPermissions, userId, {});

    // Get all deals with stage history
    const deals = await prisma.deal.findMany({
      where: {
        ...where,
        status: { in: ['open', 'won', 'lost'] },
      },
      include: {
        stage: true,
      },
    });

    // Calculate average time in each stage
    const stageTimes: Record<string, { totalDays: number; count: number }> = {};

    for (const deal of deals) {
      if (deal.lastStageChangeAt && deal.daysInStage !== null) {
        const stageId = deal.stageId;
        if (!stageTimes[stageId]) {
          stageTimes[stageId] = { totalDays: 0, count: 0 };
        }
        stageTimes[stageId].totalDays += deal.daysInStage;
        stageTimes[stageId].count++;
      }
    }

    // Get stage details
    const stages = await prisma.dealStage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const velocity = stages.map((stage) => {
      const timeData = stageTimes[stage.id] || { totalDays: 0, count: 0 };
      const averageDays = timeData.count > 0
        ? timeData.totalDays / timeData.count
        : 0;

      return {
        stageId: stage.id,
        stageName: stage.displayName,
        sortOrder: stage.sortOrder,
        averageDaysInStage: Math.round(averageDays * 100) / 100,
        dealsCount: timeData.count,
      };
    });

    return {
      velocity,
      totalStages: stages.length,
    };
  }

  /**
   * Get seller performance report
   */
  async getSellerPerformance(
    userId: string,
    userPermissions: string[],
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    const where = this.dataScope.getDealScope(userPermissions, userId, {});
    if (dateFrom) {
      where.createdAt = { ...where.createdAt, gte: dateFrom };
    }
    if (dateTo) {
      where.createdAt = { ...where.createdAt, lte: dateTo };
    }

    // Get all sellers
    const sellers = await prisma.user.findMany({
      where: {
        role: { in: ['tenant_admin', 'tenant_user'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const performance = await Promise.all(
      sellers.map(async (seller) => {
        const sellerWhere = {
          ...where,
          assignedTo: seller.id,
        };

        const [totalDeals, wonDeals, lostDeals, openDeals] = await Promise.all([
          prisma.deal.count({ where: sellerWhere }),
          prisma.deal.count({
            where: { ...sellerWhere, status: 'won' },
          }),
          prisma.deal.count({
            where: { ...sellerWhere, status: 'lost' },
          }),
          prisma.deal.count({
            where: { ...sellerWhere, status: 'open' },
          }),
        ]);

        const [wonAmount, lostAmount, openAmount] = await Promise.all([
          prisma.deal.aggregate({
            where: { ...sellerWhere, status: 'won' },
            _sum: { amount: true },
          }),
          prisma.deal.aggregate({
            where: { ...sellerWhere, status: 'lost' },
            _sum: { amount: true },
          }),
          prisma.deal.aggregate({
            where: { ...sellerWhere, status: 'open' },
            _sum: { amount: true },
          }),
        ]);

        const closedDeals = wonDeals + lostDeals;
        const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;

        // Calculate average time to close
        const wonDealsWithDates = await prisma.deal.findMany({
          where: {
            ...sellerWhere,
            status: 'won',
            closedAt: { not: null },
          },
          select: {
            createdAt: true,
            closedAt: true,
          },
        });

        const avgDaysToClose =
          wonDealsWithDates.length > 0
            ? wonDealsWithDates.reduce((sum, deal) => {
                const days =
                  (new Date(deal.closedAt!).getTime() -
                    new Date(deal.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24);
                return sum + days;
              }, 0) / wonDealsWithDates.length
            : 0;

        return {
          sellerId: seller.id,
          sellerName: `${seller.firstName} ${seller.lastName}`,
          sellerEmail: seller.email,
          totalDeals,
          wonDeals,
          lostDeals,
          openDeals,
          winRate: Math.round(winRate * 100) / 100,
          wonAmount: Number(wonAmount._sum.amount || 0),
          lostAmount: Number(lostAmount._sum.amount || 0),
          openAmount: Number(openAmount._sum.amount || 0),
          averageDaysToClose: Math.round(avgDaysToClose),
        };
      }),
    );

    return {
      performance,
      totalSellers: sellers.length,
    };
  }

  /**
   * Get loss analysis report
   */
  async getLossAnalysis(
    userId: string,
    userPermissions: string[],
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    const where = {
      ...this.dataScope.getDealScope(userPermissions, userId, {}),
      status: 'lost',
    };

    if (dateFrom) {
      where.closedAt = { ...where.closedAt, gte: dateFrom };
    }
    if (dateTo) {
      where.closedAt = { ...where.closedAt, lte: dateTo };
    }

    const lostDeals = await prisma.deal.findMany({
      where,
      include: {
        stage: true,
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    // Group by lost reason
    const byReason = lostDeals.reduce((acc, deal) => {
      const reason = deal.lostReason || 'Sin razón especificada';
      if (!acc[reason]) {
        acc[reason] = {
          reason,
          count: 0,
          totalAmount: 0,
          deals: [],
        };
      }
      acc[reason].count++;
      acc[reason].totalAmount += Number(deal.amount);
      acc[reason].deals.push({
        id: deal.id,
        name: deal.name,
        customerName: deal.customer.companyName,
        amount: Number(deal.amount),
        lostAt: deal.closedAt,
      });
      return acc;
    }, {} as Record<string, any>);

    // Group by stage when lost
    const byStage = lostDeals.reduce((acc, deal) => {
      const stageName = deal.stage.displayName;
      if (!acc[stageName]) {
        acc[stageName] = {
          stageName,
          count: 0,
          totalAmount: 0,
        };
      }
      acc[stageName].count++;
      acc[stageName].totalAmount += Number(deal.amount);
      return acc;
    }, {} as Record<string, any>);

    return {
      byReason: Object.values(byReason).sort((a: any, b: any) => b.count - a.count),
      byStage: Object.values(byStage).sort((a: any, b: any) => b.count - a.count),
      totalLost: lostDeals.length,
      totalLostAmount: lostDeals.reduce((sum, d) => sum + Number(d.amount), 0),
    };
  }

  /**
   * Get lead sources report
   */
  async getLeadSources(
    userId: string,
    userPermissions: string[],
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();

    const where = this.dataScope.getCustomerScope(userPermissions, userId, {});
    if (dateFrom) {
      where.createdAt = { ...where.createdAt, gte: dateFrom };
    }
    if (dateTo) {
      where.createdAt = { ...where.createdAt, lte: dateTo };
    }

    // Group customers by lead source
    const customersBySource = await prisma.customer.groupBy({
      by: ['leadSource'],
      where,
      _count: {
        id: true,
      },
    });

    // Get conversion rates by source
    const sources = await Promise.all(
      customersBySource.map(async (group) => {
        const source = group.leadSource || 'Sin fuente';
        const totalCustomers = group._count.id;

        // Count converted (customers with orders)
        const converted = await prisma.customer.count({
          where: {
            ...where,
            leadSource: group.leadSource,
            orders: {
              some: {},
            },
          },
        });

        // Count deals created from this source
        const deals = await prisma.deal.count({
          where: {
            customer: {
              leadSource: group.leadSource,
            },
          },
        });

        // Count won deals
        const wonDeals = await prisma.deal.count({
          where: {
            customer: {
              leadSource: group.leadSource,
            },
            status: 'won',
          },
        });

        const conversionRate = totalCustomers > 0 ? (converted / totalCustomers) * 100 : 0;

        return {
          source,
          totalCustomers,
          converted,
          conversionRate: Math.round(conversionRate * 100) / 100,
          deals,
          wonDeals,
        };
      }),
    );

    return {
      sources: sources.sort((a, b) => b.totalCustomers - a.totalCustomers),
      totalSources: sources.length,
    };
  }
}

