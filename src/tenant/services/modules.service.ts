import { Injectable, Logger, Scope } from '@nestjs/common';
import prisma from '../../lib/prisma';
import { TenantPrismaService } from './tenant-prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantModulesService {
  private readonly logger = new Logger(TenantModulesService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * Get all modules with their enabled status for the current tenant
   * Considers both plan assignments and direct tenant assignments
   */
  async getTenantModules(tenantId: string) {
    try {
      const now = new Date();

      // Get current active subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          tenantId,
          status: 'active',
          currentPeriodEnd: {
            gte: now,
          },
        },
        include: {
          plan: {
            include: {
              moduleAssignments: {
                where: { isEnabled: true },
                include: {
                  module: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get direct tenant assignments (active and not expired)
      const directAssignments = await prisma.moduleTenantAssignment.findMany({
        where: {
          tenantId,
          isEnabled: true,
          OR: [
            { endsAt: null }, // Permanent
            { endsAt: { gte: now } }, // Not expired
          ],
          AND: [
            {
              OR: [
                { startsAt: null }, // No start date
                { startsAt: { lte: now } }, // Already started
              ],
            },
          ],
        },
        include: {
          module: true,
        },
      });

      // Get all active modules from ModuleDefinition
      const allModules = await prisma.moduleDefinition.findMany({
        where: {
          isActive: true,
        },
        include: {
          subModules: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [
          { sortOrder: 'asc' },
          { displayName: 'asc' },
        ],
      });

      // Get enabled module IDs from subscription plan
      const enabledModuleIdsFromPlan = new Set(
        subscription?.plan?.moduleAssignments
          ?.map((a: any) => a.module?.id)
          .filter(Boolean) || []
      );

      // Get enabled module IDs from direct assignments
      const enabledModuleIdsFromDirect = new Set(
        directAssignments.map((a) => a.module.id)
      );

      // Combine both sources (direct assignments take precedence)
      const enabledModuleIds = new Set([
        ...enabledModuleIdsFromPlan,
        ...enabledModuleIdsFromDirect,
      ]);

      // Get enabled submodules from plan
      const enabledSubModuleIdsFromPlan = new Set<string>();
      if (subscription?.plan) {
        const subModuleAssignments = await prisma.subModulePlanAssignment.findMany({
          where: {
            planId: subscription.plan.id,
            isEnabled: true,
          },
        });
        subModuleAssignments.forEach((a) => {
          enabledSubModuleIdsFromPlan.add(a.subModuleId);
        });
      }

      // Get enabled submodules from direct assignments
      const directSubModuleAssignments = await prisma.subModuleTenantAssignment.findMany({
        where: {
          tenantId,
          isEnabled: true,
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
          AND: [
            {
              OR: [
                { startsAt: null },
                { startsAt: { lte: now } },
              ],
            },
          ],
        },
      });
      const enabledSubModuleIdsFromDirect = new Set(
        directSubModuleAssignments.map((a) => a.subModuleId)
      );

      // Combine submodule sources
      const enabledSubModuleIds = new Set([
        ...enabledSubModuleIdsFromPlan,
        ...enabledSubModuleIdsFromDirect,
      ]);

      // Map modules with enabled status and submodules
      return allModules.map((module) => ({
        id: module.id,
        name: module.name,
        displayName: module.displayName,
        description: module.description,
        icon: module.icon,
        path: module.path,
        category: module.category,
        sortOrder: module.sortOrder,
        isEnabled: enabledModuleIds.has(module.id),
        isVisible: module.isVisible,
        metadata: module.metadata,
        subModules: module.subModules.map((subModule) => ({
          id: subModule.id,
          name: subModule.name,
          displayName: subModule.displayName,
          description: subModule.description,
          icon: subModule.icon,
          path: subModule.path,
          sortOrder: subModule.sortOrder,
          isEnabled: enabledSubModuleIds.has(subModule.id),
          isVisible: subModule.isVisible,
          permissions: subModule.permissions,
        })),
      }));
    } catch (error) {
      this.logger.error(`Failed to get tenant modules: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get plan limits for the current tenant
   */
  async getTenantLimits(tenantId: string) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          tenantId,
          status: 'active',
          currentPeriodEnd: {
            gte: new Date(),
          },
        },
        include: {
          plan: {
            select: {
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
        // Return default limits for free plan
        return {
          maxUsers: 2,
          maxStorageGb: 1,
          maxMonthlyEmails: 100,
          maxMonthlyWhatsapp: 50,
          maxMonthlyApiCalls: 1000,
        };
      }

      return {
        maxUsers: subscription.plan.maxUsers,
        maxStorageGb: subscription.plan.maxStorageGb,
        maxMonthlyEmails: subscription.plan.maxMonthlyEmails,
        maxMonthlyWhatsapp: subscription.plan.maxMonthlyWhatsapp,
        maxMonthlyApiCalls: subscription.plan.maxMonthlyApiCalls,
      };
    } catch (error) {
      this.logger.error(`Failed to get tenant limits: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if tenant can create a new user (validate maxUsers limit)
   */
  async canCreateUser(tenantId: string): Promise<{ allowed: boolean; reason?: string; current?: number; max?: number }> {
    try {
      const limits = await this.getTenantLimits(tenantId);
      
      if (!limits.maxUsers) {
        return { allowed: true }; // No limit
      }

      const prisma = await this.tenantPrisma.getTenantClient();
      const currentUserCount = await prisma.user.count({
        where: {
          isActive: true,
        },
      });

      if (currentUserCount >= limits.maxUsers) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de ${limits.maxUsers} usuario${limits.maxUsers !== 1 ? 's' : ''} permitido${limits.maxUsers !== 1 ? 's' : ''} en tu plan. Actualiza tu plan para agregar más usuarios.`,
          current: currentUserCount,
          max: limits.maxUsers,
        };
      }

      return {
        allowed: true,
        current: currentUserCount,
        max: limits.maxUsers,
      };
    } catch (error) {
      this.logger.error(`Failed to check user creation limit: ${error.message}`, error.stack);
      // On error, allow creation (fail open)
      return { allowed: true };
    }
  }

  /**
   * Check if tenant can upload more storage (validate maxStorageGb limit)
   */
  async canUploadStorage(tenantId: string, additionalSizeBytes: number): Promise<{ allowed: boolean; reason?: string; current?: number; max?: number }> {
    try {
      const limits = await this.getTenantLimits(tenantId);
      
      if (!limits.maxStorageGb) {
        return { allowed: true }; // No limit
      }

      const prisma = await this.tenantPrisma.getTenantClient();
      const storageResult = await prisma.file.aggregate({
        _sum: {
          fileSize: true,
        },
      });

      const currentStorageBytes = storageResult._sum.fileSize || 0;
      const currentStorageGb = currentStorageBytes / (1024 * 1024 * 1024); // Convert bytes to GB
      const additionalStorageGb = additionalSizeBytes / (1024 * 1024 * 1024);
      const totalStorageGb = currentStorageGb + additionalStorageGb;

      if (totalStorageGb >= limits.maxStorageGb) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de almacenamiento de ${limits.maxStorageGb}GB en tu plan. Actualiza tu plan para obtener más espacio.`,
          current: Math.round(currentStorageGb * 100) / 100,
          max: limits.maxStorageGb,
        };
      }

      return {
        allowed: true,
        current: Math.round(currentStorageGb * 100) / 100,
        max: limits.maxStorageGb,
      };
    } catch (error) {
      this.logger.error(`Failed to check storage limit: ${error.message}`, error.stack);
      // On error, allow upload (fail open)
      return { allowed: true };
    }
  }

  /**
   * Check if tenant can send more emails this month (validate maxMonthlyEmails limit)
   */
  async canSendEmail(tenantId: string): Promise<{ allowed: boolean; reason?: string; current?: number; max?: number }> {
    try {
      const limits = await this.getTenantLimits(tenantId);
      
      if (!limits.maxMonthlyEmails) {
        return { allowed: true }; // No limit
      }

      const prisma = await this.tenantPrisma.getTenantClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const currentMonthEmails = await prisma.messageLog.count({
        where: {
          channel: 'email',
          status: 'sent',
          sentAt: {
            gte: startOfMonth,
          },
        },
      });

      if (currentMonthEmails >= limits.maxMonthlyEmails) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de ${limits.maxMonthlyEmails} email${limits.maxMonthlyEmails !== 1 ? 's' : ''} mensual${limits.maxMonthlyEmails !== 1 ? 'es' : ''} en tu plan. Actualiza tu plan para enviar más emails.`,
          current: currentMonthEmails,
          max: limits.maxMonthlyEmails,
        };
      }

      return {
        allowed: true,
        current: currentMonthEmails,
        max: limits.maxMonthlyEmails,
      };
    } catch (error) {
      this.logger.error(`Failed to check email limit: ${error.message}`, error.stack);
      // On error, allow sending (fail open)
      return { allowed: true };
    }
  }

  /**
   * Check if tenant can send more WhatsApp messages this month (validate maxMonthlyWhatsapp limit)
   */
  async canSendWhatsApp(tenantId: string): Promise<{ allowed: boolean; reason?: string; current?: number; max?: number }> {
    try {
      const limits = await this.getTenantLimits(tenantId);
      
      if (!limits.maxMonthlyWhatsapp) {
        return { allowed: true }; // No limit
      }

      const prisma = await this.tenantPrisma.getTenantClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const currentMonthWhatsApp = await prisma.messageLog.count({
        where: {
          channel: 'whatsapp',
          status: 'sent',
          sentAt: {
            gte: startOfMonth,
          },
        },
      });

      if (currentMonthWhatsApp >= limits.maxMonthlyWhatsapp) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de ${limits.maxMonthlyWhatsapp} mensaje${limits.maxMonthlyWhatsapp !== 1 ? 's' : ''} de WhatsApp mensual${limits.maxMonthlyWhatsapp !== 1 ? 'es' : ''} en tu plan. Actualiza tu plan para enviar más mensajes.`,
          current: currentMonthWhatsApp,
          max: limits.maxMonthlyWhatsapp,
        };
      }

      return {
        allowed: true,
        current: currentMonthWhatsApp,
        max: limits.maxMonthlyWhatsapp,
      };
    } catch (error) {
      this.logger.error(`Failed to check WhatsApp limit: ${error.message}`, error.stack);
      // On error, allow sending (fail open)
      return { allowed: true };
    }
  }

  /**
   * Check if tenant can make more API calls this month (validate maxMonthlyApiCalls limit)
   * Note: This is a simplified implementation. In production, you'd track API calls in a dedicated table
   */
  async canMakeApiCall(tenantId: string): Promise<{ allowed: boolean; reason?: string; current?: number; max?: number }> {
    try {
      const limits = await this.getTenantLimits(tenantId);
      
      if (!limits.maxMonthlyApiCalls) {
        return { allowed: true }; // No limit
      }

      // TODO: Implement proper API call tracking
      // For now, we'll use a simplified approach checking audit logs
      // In production, you should have a dedicated API call tracking table
      const prisma = await this.tenantPrisma.getTenantClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Check audit logs for API calls (this is a simplified approach)
      const currentMonthApiCalls = await prisma.auditLog.count({
        where: {
          eventCategory: 'api',
          createdAt: {
            gte: startOfMonth,
          },
        },
      });

      if (currentMonthApiCalls >= limits.maxMonthlyApiCalls) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de ${limits.maxMonthlyApiCalls} llamada${limits.maxMonthlyApiCalls !== 1 ? 's' : ''} de API mensual${limits.maxMonthlyApiCalls !== 1 ? 'es' : ''} en tu plan. Actualiza tu plan para hacer más llamadas.`,
          current: currentMonthApiCalls,
          max: limits.maxMonthlyApiCalls,
        };
      }

      return {
        allowed: true,
        current: currentMonthApiCalls,
        max: limits.maxMonthlyApiCalls,
      };
    } catch (error) {
      this.logger.error(`Failed to check API call limit: ${error.message}`, error.stack);
      // On error, allow API call (fail open)
      return { allowed: true };
    }
  }

  /**
   * Check if a module is enabled for the tenant
   */
  async isModuleEnabled(tenantId: string, moduleName: string): Promise<boolean> {
    try {
      const modules = await this.getTenantModules(tenantId);
      const module = modules.find(m => m.name === moduleName);
      return module?.isEnabled ?? false;
    } catch (error) {
      this.logger.error(`Failed to check module enabled: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Check if a submodule is enabled for the tenant
   */
  async isSubModuleEnabled(tenantId: string, moduleName: string, subModuleName: string): Promise<boolean> {
    try {
      const modules = await this.getTenantModules(tenantId);
      const module = modules.find(m => m.name === moduleName);
      if (!module || !module.isEnabled) {
        return false; // Module must be enabled first
      }
      const subModule = module.subModules?.find(sm => sm.name === subModuleName);
      return subModule?.isEnabled ?? false;
    } catch (error) {
      this.logger.error(`Failed to check submodule enabled: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Get all submodules for a specific module for the tenant
   */
  async getTenantSubModules(tenantId: string, moduleName: string) {
    try {
      const modules = await this.getTenantModules(tenantId);
      const module = modules.find(m => m.name === moduleName);
      return module?.subModules || [];
    } catch (error) {
      this.logger.error(`Failed to get tenant submodules: ${error.message}`, error.stack);
      throw error;
    }
  }
}

