import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TenantGuard } from '../../tenant/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../tenant/decorators/tenant.decorator';
import { PlansService } from '../../plans/plans.service';
import prisma from '../../lib/prisma';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly plansService: PlansService) {}

  // Esta ruta debe ir ANTES de la ruta raíz para evitar conflictos
  @Get('current')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current active subscription for tenant' })
  @ApiResponse({
    status: 200,
    description: 'Current subscription retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  async getCurrentSubscription(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    // Buscar suscripción activa del tenant
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'active',
        // Verificar que no esté vencida
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            enabledModules: true,
            features: true,
            maxUsers: true,
            maxStorageGb: true,
            maxMonthlyEmails: true,
            maxMonthlyWhatsapp: true,
            maxMonthlyApiCalls: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      // Si no hay suscripción activa, retornar valores por defecto (plan gratuito)
      // Usar PlansService para evitar duplicación de lógica
      const freePlan = await this.plansService.findByName('free');

      if (!freePlan) {
        // Si no existe plan gratuito, retornar valores por defecto
        return {
          success: true,
          data: {
            id: '',
            tenantId,
            planId: '',
            plan: {
              id: '',
              name: 'free',
              displayName: 'Plan Gratuito',
              enabledModules: ['crm', 'tasks'],
              features: ['basic_crm', 'basic_tasks'],
              maxUsers: 2,
              maxStorageGb: 1,
              maxMonthlyEmails: 100,
              maxMonthlyWhatsapp: 50,
              maxMonthlyApiCalls: 1000,
            },
            status: 'active',
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date().toISOString(),
          },
        };
      }

      // Mapear el plan a la estructura esperada (solo campos necesarios)
      const planData = {
        id: freePlan.id,
        name: freePlan.name,
        displayName: freePlan.displayName,
        enabledModules: freePlan.enabledModules || [],
        features: freePlan.features || {},
        maxUsers: freePlan.maxUsers,
        maxStorageGb: freePlan.maxStorageGb,
        maxMonthlyEmails: freePlan.maxMonthlyEmails,
        maxMonthlyWhatsapp: freePlan.maxMonthlyWhatsapp,
        maxMonthlyApiCalls: freePlan.maxMonthlyApiCalls,
      };

      return {
        success: true,
        data: {
          id: '',
          tenantId,
          planId: freePlan.id,
          plan: planData,
          status: 'active' as const,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      data: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        planId: subscription.planId,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all subscriptions (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active, cancelled, expired, etc.)' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Filter by tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
  })
  async listSubscriptions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can list all subscriptions
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can list all subscriptions');
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      success: true,
      data: subscriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  async getSubscriptionById(
    @Param('id') id: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can view subscription details
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can view subscription details');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            billingEmail: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            priceMonthly: true,
            priceYearly: true,
            currency: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return {
      success: true,
      data: subscription,
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update subscription (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateData: {
      planId?: string;
      billingCycle?: string;
      amount?: number;
      discountAmount?: number;
      status?: string;
      cancelAtPeriodEnd?: boolean;
      cancellationReason?: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      trialStart?: string;
      trialEnd?: string;
    },
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can update subscriptions
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can update subscriptions');
    }

    // Verificar que la suscripción existe
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
      },
    });

    if (!existingSubscription) {
      throw new Error('Subscription not found');
    }

    // Preparar datos de actualización
    const updatePayload: any = {};

    if (updateData.planId !== undefined) {
      // Verificar que el plan existe
      const plan = await this.plansService.findOne(updateData.planId);
      if (!plan) {
        throw new Error('Plan not found');
      }
      updatePayload.planId = updateData.planId;
      
      // Si cambió el plan, actualizar montos
      const billingCycle = updateData.billingCycle || existingSubscription.billingCycle;
      const amount = billingCycle === 'yearly' 
        ? Number(plan.priceYearly || 0)
        : Number(plan.priceMonthly || 0);
      updatePayload.amount = amount;
      updatePayload.totalAmount = amount - (updateData.discountAmount ?? existingSubscription.discountAmount);
    }

    if (updateData.billingCycle !== undefined) {
      updatePayload.billingCycle = updateData.billingCycle;
      
      // Recalcular fechas si cambió el ciclo
      if (updateData.currentPeriodStart) {
        const periodStart = new Date(updateData.currentPeriodStart);
        let periodEnd = new Date(periodStart);
        
        if (updateData.billingCycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else if (updateData.billingCycle === 'quarterly') {
          periodEnd.setMonth(periodEnd.getMonth() + 3);
        } else if (updateData.billingCycle === 'semiannually') {
          periodEnd.setMonth(periodEnd.getMonth() + 6);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        
        updatePayload.currentPeriodEnd = periodEnd;
      }
    }

    if (updateData.amount !== undefined) {
      updatePayload.amount = updateData.amount;
      updatePayload.totalAmount = updateData.amount - (updateData.discountAmount ?? existingSubscription.discountAmount);
    }

    if (updateData.discountAmount !== undefined) {
      updatePayload.discountAmount = updateData.discountAmount;
      updatePayload.totalAmount = (updateData.amount ?? existingSubscription.amount) - updateData.discountAmount;
    }

    if (updateData.status !== undefined) {
      updatePayload.status = updateData.status;
    }

    if (updateData.cancelAtPeriodEnd !== undefined) {
      updatePayload.cancelAtPeriodEnd = updateData.cancelAtPeriodEnd;
      if (updateData.cancelAtPeriodEnd && !existingSubscription.cancelledAt) {
        updatePayload.cancelledAt = new Date();
      } else if (!updateData.cancelAtPeriodEnd && existingSubscription.cancelledAt) {
        updatePayload.cancelledAt = null;
      }
    }

    if (updateData.cancellationReason !== undefined) {
      updatePayload.cancellationReason = updateData.cancellationReason;
    }

    if (updateData.currentPeriodStart !== undefined) {
      updatePayload.currentPeriodStart = new Date(updateData.currentPeriodStart);
    }

    if (updateData.currentPeriodEnd !== undefined) {
      updatePayload.currentPeriodEnd = new Date(updateData.currentPeriodEnd);
    }

    if (updateData.trialStart !== undefined) {
      updatePayload.trialStart = updateData.trialStart ? new Date(updateData.trialStart) : null;
    }

    if (updateData.trialEnd !== undefined) {
      updatePayload.trialEnd = updateData.trialEnd ? new Date(updateData.trialEnd) : null;
    }

    // Actualizar la suscripción
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: updatePayload,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            billingEmail: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            priceMonthly: true,
            priceYearly: true,
            currency: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updatedSubscription,
    };
  }
}

