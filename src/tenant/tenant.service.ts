import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import prisma from '../lib/prisma';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly plansService: PlansService) {
    this.logger.log('TenantService initialized');
  }

  // Simplified methods that return null/empty for now
  async getTenantBySlug(slug: string): Promise<any> {
    this.logger.warn(`getTenantBySlug called with ${slug} - returning null (simple mode)`);
    return null;
  }

  async getTenantById(id: string): Promise<any> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          companyLegalName: true,
          taxId: true,
          industry: true,
          companySize: true,
          planType: true,
          planStatus: true,
          trialEndsAt: true,
          subscriptionStartsAt: true,
          subscriptionEndsAt: true,
          billingEmail: true,
          billingContactName: true,
          billingAddress: true,
          billingCity: true,
          billingState: true,
          billingCountry: true,
          billingPostalCode: true,
          paymentMethod: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactPhone: true,
          isActive: true,
          isSuspended: true,
          suspensionReason: true,
          suspendedAt: true,
          currentUsers: true,
          maxUsers: true,
          maxStorageGb: true,
          maxMonthlyEmails: true,
          maxMonthlyWhatsapp: true,
          maxMonthlyApiCalls: true,
          currentStorageGb: true,
          currentMonthlyEmails: true,
          currentMonthlyWhatsapp: true,
          currentMonthlyApiCalls: true,
          lastActivityAt: true,
          lastBillingDate: true,
          nextBillingDate: true,
          provisionedAt: true,
          referralSource: true,
          notes: true,
          enabledModules: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!tenant) {
        throw new BadRequestException(`Tenant with id ${id} not found`);
      }

      return tenant;
    } catch (error) {
      this.logger.error(`Failed to get tenant by id ${id}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get tenant: ${error.message}`);
    }
  }

  async getTenantConnection(tenantId: string): Promise<any> {
    this.logger.warn(`getTenantConnection called with ${tenantId} - returning null (simple mode)`);
    return null;
  }

  async getTenantUsage(tenantId: string): Promise<any> {
    this.logger.warn(`getTenantUsage called with ${tenantId} - returning empty usage (simple mode)`);
    return {
      tenant: { id: tenantId },
      usage: { users: 0, storageGb: 0, monthlyEmails: 0, monthlyWhatsapp: 0, monthlyApiCalls: 0 },
      limits: { users: 100, storageGb: 100, monthlyEmails: 1000, monthlyWhatsapp: 500, monthlyApiCalls: 10000 },
      utilization: { users: 0, storageGb: 0, monthlyEmails: 0, monthlyWhatsapp: 0, monthlyApiCalls: 0 }
    };
  }

  async checkUsageLimits(tenantId: string): Promise<{ exceeded: boolean; limits: string[] }> {
    this.logger.warn(`checkUsageLimits called with ${tenantId} - returning no limits exceeded (simple mode)`);
    return { exceeded: false, limits: [] };
  }

  // Additional methods expected by other services
  async createTenant(data: CreateTenantDto, userId?: string): Promise<any> {
    try {
      this.logger.log(`Creating tenant: ${data.name} (${data.slug})`);

      // Verificar que el slug no exista
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug: data.slug },
      });

      if (existingTenant) {
        throw new ConflictException(`Tenant with slug "${data.slug}" already exists`);
      }

      // Obtener el plan para establecer límites
      let plan: any = null;
      if (data.planType) {
        try {
          plan = await this.plansService.findByName(data.planType);
        } catch (error) {
          this.logger.warn(`Plan ${data.planType} not found, using defaults`);
        }
      }

      // Generar configuración de base de datos
      // Por ahora usamos valores por defecto para desarrollo
      const dbName = `tenant_${data.slug}_${process.env.NODE_ENV || 'dev'}`;
      const dbHost = process.env.TENANT_DB_HOST || 'localhost';
      const dbPort = parseInt(process.env.TENANT_DB_PORT || '5432');
      const dbUsername = process.env.TENANT_DB_USERNAME || 'postgres';
      // En producción, esto debería estar encriptado
      const dbPasswordEncrypted = process.env.TENANT_DB_PASSWORD || 'postgres';

      // Establecer límites basados en el plan
      const maxUsers = plan?.maxUsers ?? 5;
      const maxStorageGb = plan?.maxStorageGb ?? 2;
      const maxMonthlyEmails = plan?.maxMonthlyEmails ?? 1000;
      const maxMonthlyWhatsapp = plan?.maxMonthlyWhatsapp ?? 500;
      const maxMonthlyApiCalls = plan?.maxMonthlyApiCalls ?? 10000;
      const enabledModules = (plan?.enabledModules as string[]) || ['crm', 'tasks'];

      // Crear el tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          companyLegalName: data.companyLegalName,
          taxId: data.taxId,
          industry: data.industry,
          companySize: data.companySize,
          planType: data.planType || 'free',
          planStatus: 'trial',
          billingEmail: data.billingEmail,
          billingContactName: data.billingContactName,
          billingAddress: data.billingAddress,
          billingCity: data.billingCity,
          billingState: data.billingState,
          billingCountry: data.billingCountry || 'CO',
          billingPostalCode: data.billingPostalCode,
          paymentMethod: data.paymentMethod,
          primaryContactName: data.primaryContactName,
          primaryContactEmail: data.primaryContactEmail,
          primaryContactPhone: data.primaryContactPhone,
          referralSource: data.referralSource,
          notes: data.notes,
          // Database connection info
          dbName,
          dbHost,
          dbPort,
          dbUsername,
          dbPasswordEncrypted,
          dbConnectionPoolSize: 10,
          // Usage limits from plan
          maxUsers,
          maxStorageGb,
          maxMonthlyEmails,
          maxMonthlyWhatsapp,
          maxMonthlyApiCalls,
          // Enabled modules from plan
          enabledModules,
          // Status
          isActive: true,
          isSuspended: false,
          provisionedAt: new Date(),
          // Metadata
          createdBy: userId,
        },
      });

      // Crear dominio por defecto
      try {
        await prisma.tenantDomain.create({
          data: {
            tenantId: tenant.id,
            domain: `${data.slug}.nidiaflow.com`,
            isCustom: false,
            isVerified: true,
            isPrimary: true,
            sslEnabled: true,
          },
        });
      } catch (domainError) {
        this.logger.warn(`Failed to create default domain for tenant ${tenant.id}:`, domainError);
        // No lanzamos error, el tenant ya está creado
      }

      // Crear suscripción automáticamente si hay un plan
      if (plan && plan.id) {
        try {
          // Determinar ciclo de facturación (por defecto mensual)
          // Podría venir del DTO en el futuro
          const billingCycleStr: string = 'monthly';
          const billingCycle = billingCycleStr as 'monthly' | 'yearly' | 'quarterly' | 'semiannually';
          
          // Calcular montos según el ciclo de facturación
          const amount = billingCycle === 'yearly' 
            ? Number(plan.priceYearly || 0)
            : Number(plan.priceMonthly || 0);
          const discountAmount = 0; // Por defecto sin descuento
          const totalAmount = amount - discountAmount;
          const currency = plan.currency || 'USD';

          // Calcular fechas del período
          const now = new Date();
          const currentPeriodStart = now;
          let currentPeriodEnd: Date;
          
          if (billingCycle === 'yearly') {
            currentPeriodEnd = new Date(now);
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
          } else if (billingCycle === 'quarterly') {
            currentPeriodEnd = new Date(now);
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
          } else if (billingCycle === 'semiannually') {
            currentPeriodEnd = new Date(now);
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 6);
          } else {
            // monthly (default)
            currentPeriodEnd = new Date(now);
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
          }

          // Determinar estado inicial
          // Si el plan es 'free', la suscripción puede ser 'active' sin trial
          // Si es un plan de pago, podría tener trial
          const hasTrial = plan.name !== 'free' && plan.name !== 'trial'; // Ajustar según lógica de negocio
          const status = hasTrial ? 'trialing' : 'active';
          
          // Configurar trial si aplica
          // IMPORTANTE: El currentPeriodEnd ya está calculado según el billingCycle
          // El trial es un período adicional, no reemplaza el período de facturación
          let trialStart: Date | null = null;
          let trialEnd: Date | null = null;
          
          if (hasTrial) {
            trialStart = now;
            trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + 14); // 14 días de trial por defecto
            // NO sobrescribir currentPeriodEnd - debe mantenerse según el billingCycle
          }

          // Crear la suscripción
          const subscription = await prisma.subscription.create({
            data: {
              tenantId: tenant.id,
              planId: plan.id,
              billingCycle,
              amount,
              discountAmount,
              totalAmount,
              currency,
              status,
              currentPeriodStart,
              currentPeriodEnd,
              trialStart,
              trialEnd,
              cancelAtPeriodEnd: false,
              metadata: {
                createdBy: userId,
                createdFrom: 'tenant_creation',
                tenantSlug: tenant.slug,
              },
            },
          });

          this.logger.log(`Subscription created successfully for tenant ${tenant.id}: ${subscription.id}`);
        } catch (subscriptionError) {
          this.logger.error(`Failed to create subscription for tenant ${tenant.id}:`, subscriptionError);
          // No lanzamos error, el tenant ya está creado
          // En producción, podrías querer hacer rollback o notificar
        }
      } else {
        this.logger.warn(`No plan found for tenant ${tenant.id}, subscription not created`);
      }

      this.logger.log(`Tenant created successfully: ${tenant.id} (${tenant.slug})`);
      return tenant;
    } catch (error) {
      this.logger.error(`Failed to create tenant: ${error.message}`, error.stack);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create tenant: ${error.message}`);
    }
  }

  async disconnectTenant(tenantId: string): Promise<void> {
    this.logger.warn(`disconnectTenant called with ${tenantId} - ignoring in simple mode`);
  }

  async updateTenant(id: string, data: Partial<CreateTenantDto>): Promise<any> {
    try {
      this.logger.log(`Updating tenant: ${id}`);

      // Verificar que el tenant existe
      const existingTenant = await prisma.tenant.findUnique({
        where: { id },
      });

      if (!existingTenant) {
        throw new BadRequestException(`Tenant with id ${id} not found`);
      }

      // Si se está actualizando el slug, verificar que no exista otro tenant con ese slug
      if (data.slug && data.slug !== existingTenant.slug) {
        const slugExists = await prisma.tenant.findUnique({
          where: { slug: data.slug },
        });

        if (slugExists) {
          throw new ConflictException(`Tenant with slug "${data.slug}" already exists`);
        }
      }

      // Obtener el plan si se está actualizando
      let plan: any = null;
      if (data.planType) {
        try {
          plan = await this.plansService.findByName(data.planType);
        } catch (error) {
          this.logger.warn(`Plan ${data.planType} not found, keeping existing limits`);
        }
      }

      // Preparar datos de actualización
      const updateData: any = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.companyLegalName !== undefined) updateData.companyLegalName = data.companyLegalName;
      if (data.taxId !== undefined) updateData.taxId = data.taxId;
      if (data.industry !== undefined) updateData.industry = data.industry;
      if (data.companySize !== undefined) updateData.companySize = data.companySize;
      if (data.billingEmail !== undefined) updateData.billingEmail = data.billingEmail;
      if (data.billingContactName !== undefined) updateData.billingContactName = data.billingContactName;
      if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
      if (data.billingCity !== undefined) updateData.billingCity = data.billingCity;
      if (data.billingState !== undefined) updateData.billingState = data.billingState;
      if (data.billingCountry !== undefined) updateData.billingCountry = data.billingCountry;
      if (data.billingPostalCode !== undefined) updateData.billingPostalCode = data.billingPostalCode;
      if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
      if (data.primaryContactName !== undefined) updateData.primaryContactName = data.primaryContactName;
      if (data.primaryContactEmail !== undefined) updateData.primaryContactEmail = data.primaryContactEmail;
      if (data.primaryContactPhone !== undefined) updateData.primaryContactPhone = data.primaryContactPhone;
      if (data.planType !== undefined) updateData.planType = data.planType;
      if (data.referralSource !== undefined) updateData.referralSource = data.referralSource;
      if (data.notes !== undefined) updateData.notes = data.notes;

      // Actualizar límites si se cambió el plan
      if (plan) {
        updateData.maxUsers = plan.maxUsers ?? existingTenant.maxUsers;
        updateData.maxStorageGb = plan.maxStorageGb ?? existingTenant.maxStorageGb;
        updateData.maxMonthlyEmails = plan.maxMonthlyEmails ?? existingTenant.maxMonthlyEmails;
        updateData.maxMonthlyWhatsapp = plan.maxMonthlyWhatsapp ?? existingTenant.maxMonthlyWhatsapp;
        updateData.maxMonthlyApiCalls = plan.maxMonthlyApiCalls ?? existingTenant.maxMonthlyApiCalls;
        updateData.enabledModules = (plan.enabledModules as string[]) ?? existingTenant.enabledModules;
      }

      // Actualizar el tenant
      const tenant = await prisma.tenant.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          slug: true,
          companyLegalName: true,
          taxId: true,
          industry: true,
          companySize: true,
          planType: true,
          planStatus: true,
          trialEndsAt: true,
          subscriptionStartsAt: true,
          subscriptionEndsAt: true,
          billingEmail: true,
          billingContactName: true,
          billingAddress: true,
          billingCity: true,
          billingState: true,
          billingCountry: true,
          billingPostalCode: true,
          paymentMethod: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactPhone: true,
          isActive: true,
          isSuspended: true,
          suspensionReason: true,
          suspendedAt: true,
          currentUsers: true,
          maxUsers: true,
          maxStorageGb: true,
          maxMonthlyEmails: true,
          maxMonthlyWhatsapp: true,
          maxMonthlyApiCalls: true,
          currentStorageGb: true,
          currentMonthlyEmails: true,
          currentMonthlyWhatsapp: true,
          currentMonthlyApiCalls: true,
          lastActivityAt: true,
          lastBillingDate: true,
          nextBillingDate: true,
          provisionedAt: true,
          referralSource: true,
          notes: true,
          enabledModules: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Gestionar suscripción: crear o actualizar según corresponda
      if (plan && plan.id) {
        try {
          // Buscar suscripción activa existente
          const existingSubscription = await prisma.subscription.findFirst({
            where: {
              tenantId: id,
              status: {
                in: ['active', 'trialing'],
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          const planChanged = data.planType && data.planType !== existingTenant.planType;
          const billingCycleStr: string = 'monthly';
          const billingCycle = billingCycleStr as 'monthly' | 'yearly' | 'quarterly' | 'semiannually';

          if (existingSubscription) {
            // Si existe suscripción y cambió el plan, actualizar la suscripción
            if (planChanged) {
              // Calcular nuevos montos según el ciclo de facturación
              const amount = billingCycle === 'yearly' 
                ? Number(plan.priceYearly || 0)
                : Number(plan.priceMonthly || 0);
              const discountAmount = existingSubscription.discountAmount || 0;
              const totalAmount = amount - discountAmount;
              const currency = plan.currency || 'USD';

              // Actualizar la suscripción existente
              await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                  planId: plan.id,
                  amount,
                  totalAmount,
                  currency,
                  billingCycle,
                  metadata: {
                    ...(existingSubscription.metadata as object || {}),
                    planChangedAt: new Date().toISOString(),
                    previousPlan: existingTenant.planType,
                    newPlan: data.planType,
                  },
                },
              });

              this.logger.log(`Subscription updated for tenant ${id}: plan changed from ${existingTenant.planType} to ${data.planType}`);
            }
          } else {
            // Si no existe suscripción, crear una nueva
            const amount = billingCycle === 'yearly' 
              ? Number(plan.priceYearly || 0)
              : Number(plan.priceMonthly || 0);
            const discountAmount = 0;
            const totalAmount = amount - discountAmount;
            const currency = plan.currency || 'USD';

            // Calcular fechas del período
            const now = new Date();
            const currentPeriodStart = now;
            let currentPeriodEnd: Date;
            
            if (billingCycle === 'yearly') {
              currentPeriodEnd = new Date(now);
              currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
            } else if (billingCycle === 'quarterly') {
              currentPeriodEnd = new Date(now);
              currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
            } else if (billingCycle === 'semiannually') {
              currentPeriodEnd = new Date(now);
              currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 6);
            } else {
              // monthly (default)
              currentPeriodEnd = new Date(now);
              currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
            }

            // Determinar estado inicial
            const hasTrial = plan.name !== 'free' && plan.name !== 'trial';
            const status = hasTrial ? 'trialing' : 'active';
            
            // Configurar trial si aplica
            // IMPORTANTE: El currentPeriodEnd ya está calculado según el billingCycle
            // El trial es un período adicional, no reemplaza el período de facturación
            let trialStart: Date | null = null;
            let trialEnd: Date | null = null;
            
            if (hasTrial) {
              trialStart = now;
              trialEnd = new Date(now);
              trialEnd.setDate(trialEnd.getDate() + 14); // 14 días de trial por defecto
              // NO sobrescribir currentPeriodEnd - debe mantenerse según el billingCycle
            }

            // Crear la suscripción
            const subscription = await prisma.subscription.create({
              data: {
                tenantId: id,
                planId: plan.id,
                billingCycle,
                amount,
                discountAmount,
                totalAmount,
                currency,
                status,
                currentPeriodStart,
                currentPeriodEnd,
                trialStart,
                trialEnd,
                cancelAtPeriodEnd: false,
                metadata: {
                  createdBy: 'system',
                  createdFrom: 'tenant_update',
                  tenantSlug: tenant.slug,
                },
              },
            });

            this.logger.log(`Subscription created for tenant ${id}: ${subscription.id}`);
          }
        } catch (subscriptionError) {
          this.logger.error(`Failed to create/update subscription for tenant ${id}:`, subscriptionError);
          // No lanzamos error, el tenant ya está actualizado
        }
      }

      this.logger.log(`Tenant updated successfully: ${tenant.id} (${tenant.slug})`);
      return tenant;
    } catch (error) {
      this.logger.error(`Failed to update tenant ${id}: ${error.message}`, error.stack);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update tenant: ${error.message}`);
    }
  }

  async updateTenantStatus(tenantId: string, isActive: boolean, reason?: string): Promise<any> {
    try {
      this.logger.log(`Updating tenant status: ${tenantId} to ${isActive ? 'active' : 'inactive'}`);

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isActive,
          isSuspended: !isActive,
          suspensionReason: !isActive && reason ? reason : null,
          suspendedAt: !isActive ? new Date() : null,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          isSuspended: true,
          suspensionReason: true,
        },
      });

      this.logger.log(`Tenant status updated successfully: ${tenant.id}`);
      return tenant;
    } catch (error) {
      this.logger.error(`Failed to update tenant status ${tenantId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update tenant status: ${error.message}`);
    }
  }

  async getTenantByDomain(domain: string): Promise<any> {
    this.logger.warn(`getTenantByDomain called with ${domain} - returning null (simple mode)`);
    return null;
  }

  async listTenants(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: any[]; pagination: any }> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 10;
      const skip = (page - 1) * limit;
      const search = params.search?.trim();

      // Construir condiciones de búsqueda
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { companyLegalName: { contains: search, mode: 'insensitive' } },
          { billingEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Obtener total de registros
      const total = await prisma.tenant.count({ where });

      // Obtener tenants
      const tenants = await prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          companyLegalName: true,
          taxId: true,
          industry: true,
          companySize: true,
          planType: true,
          planStatus: true,
          billingEmail: true,
          billingContactName: true,
          billingAddress: true,
          billingCity: true,
          billingState: true,
          billingCountry: true,
          billingPostalCode: true,
          paymentMethod: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactPhone: true,
          isActive: true,
          isSuspended: true,
          suspensionReason: true,
          suspendedAt: true,
          currentUsers: true,
          maxUsers: true,
          maxStorageGb: true,
          maxMonthlyEmails: true,
          maxMonthlyWhatsapp: true,
          maxMonthlyApiCalls: true,
          currentStorageGb: true,
          currentMonthlyEmails: true,
          currentMonthlyWhatsapp: true,
          currentMonthlyApiCalls: true,
          trialEndsAt: true,
          subscriptionStartsAt: true,
          subscriptionEndsAt: true,
          lastActivityAt: true,
          lastBillingDate: true,
          nextBillingDate: true,
          provisionedAt: true,
          referralSource: true,
          notes: true,
          enabledModules: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: tenants,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list tenants: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to list tenants: ${error.message}`);
    }
  }

  async getDashboardStats(): Promise<any> {
    try {
      this.logger.log('Getting dashboard statistics');

      // Obtener estadísticas básicas de tenants
      const [
        totalTenants,
        activeTenants,
        suspendedTenants,
        tenantsByPlanStatus,
        recentTenants,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { isActive: true, isSuspended: false } }),
        prisma.tenant.count({ where: { isSuspended: true } }),
        prisma.tenant.groupBy({
          by: ['planStatus'],
          _count: { planStatus: true },
        }),
        prisma.tenant.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            planStatus: true,
            isActive: true,
            isSuspended: true,
            createdAt: true,
          },
        }),
      ]);

      // Obtener total de usuarios (suma de todos los usuarios de todos los tenants)
      const totalUsers = await prisma.user.count({
        where: {
          tenantId: { not: null }, // Solo usuarios de tenants, no superadmins
        },
      });

      // Obtener suscripciones activas
      const activeSubscriptions = await prisma.subscription.count({
        where: {
          status: 'active',
          currentPeriodEnd: {
            gte: new Date(),
          },
        },
      });

      // Calcular ingresos mensuales (de facturas pagadas del mes actual)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const monthlyRevenue = await prisma.invoice.aggregate({
        where: {
          status: 'paid',
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amountTotal: true,
        },
      });

      const totalRevenue = Number(monthlyRevenue._sum.amountTotal || 0);

      // Calcular ingresos de los últimos 6 meses para el gráfico
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1); // Primer día del mes

      // Obtener facturas pagadas agrupadas por mes
      const revenueByMonth = await prisma.$queryRaw<Array<{ month: string; revenue: number; tenants: number }>>`
        SELECT 
          TO_CHAR(paid_at, 'YYYY-MM') as month,
          COALESCE(SUM(amount_total), 0)::decimal as revenue,
          COUNT(DISTINCT tenant_id)::int as tenants
        FROM invoices
        WHERE status = 'paid'
          AND paid_at >= ${sixMonthsAgo}::timestamp
          AND paid_at <= ${endOfMonth}::timestamp
        GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
        ORDER BY month ASC
      `;

      // Crear estructura de datos para los últimos 6 meses
      const months: Array<{ month: string; revenue: number; clientes: number }> = [];
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthData = revenueByMonth.find((r) => r.month === monthKey);
        
        months.push({
          month: monthNames[date.getMonth()],
          revenue: Number(monthData?.revenue || 0),
          clientes: monthData?.tenants || 0,
        });
      }

      // Calcular cambios porcentuales (comparar con el mes anterior)
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const previousMonthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
      const previousMonthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0, 23, 59, 59);

      const previousMonthRevenue = await prisma.invoice.aggregate({
        where: {
          status: 'paid',
          paidAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd,
          },
        },
        _sum: {
          amountTotal: true,
        },
      });

      const previousRevenue = Number(previousMonthRevenue._sum.amountTotal || 0);
      const revenueChange = previousRevenue > 0 
        ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
        : 0;

      // Calcular cambio de tenants (comparar con el mes anterior)
      const previousMonthTenants = await prisma.tenant.count({
        where: {
          createdAt: {
            lte: previousMonthEnd,
          },
        },
      });

      const tenantsChange = previousMonthTenants > 0
        ? Math.round(((totalTenants - previousMonthTenants) / previousMonthTenants) * 100)
        : 0;

      // Calcular cambio de usuarios (comparar con el mes anterior)
      const previousMonthUsers = await prisma.user.count({
        where: {
          tenantId: { not: null },
          createdAt: {
            lte: previousMonthEnd,
          },
        },
      });

      const usersChange = previousMonthUsers > 0
        ? Math.round(((totalUsers - previousMonthUsers) / previousMonthUsers) * 100)
        : 0;

      return {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalUsers,
        totalRevenue,
        activeSubscriptions,
        revenueChange,
        tenantsChange,
        usersChange,
        revenueByMonth: months,
        recentTenants,
        tenantsByPlanStatus: tenantsByPlanStatus.reduce((acc, item) => {
          acc[item.planStatus] = item._count.planStatus;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard stats: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get dashboard stats: ${error.message}`);
    }
  }

}