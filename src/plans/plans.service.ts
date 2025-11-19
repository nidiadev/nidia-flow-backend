import { Injectable, Logger } from '@nestjs/common';
import prisma from '../lib/prisma';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  async findAll(): Promise<any[]> {
    try {
      const plans = await prisma.plan.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          priceMonthly: true,
          priceYearly: true,
          currency: true,
          maxUsers: true,
          maxStorageGb: true,
          maxMonthlyEmails: true,
          maxMonthlyWhatsapp: true,
          maxMonthlyApiCalls: true,
          features: true,
          enabledModules: true,
          badge: true,
          badgeColor: true,
          accentColor: true,
          featuredFeatures: true,
          isActive: true,
          isVisible: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      this.logger.log(`Found ${plans.length} active plans`);
      return plans;
    } catch (error) {
      this.logger.error('Error listing plans:', error);
      throw error;
    }
  }

  async findVisiblePlans(): Promise<any[]> {
    try {
      const plans = await prisma.plan.findMany({
        where: {
          isActive: true,
          isVisible: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        include: {
          moduleAssignments: {
            where: { isEnabled: true },
            include: {
              module: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  description: true,
                  icon: true,
                  path: true,
                },
              },
            },
          },
          subModuleAssignments: {
            where: { isEnabled: true },
            include: {
              subModule: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  description: true,
                  icon: true,
                  path: true,
                },
              },
            },
          },
        },
      });
      this.logger.log(`Found ${plans.length} visible plans for public`);
      return plans;
    } catch (error) {
      this.logger.error('Error listing visible plans:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const plan = await prisma.plan.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          priceMonthly: true,
          priceYearly: true,
          currency: true,
          maxUsers: true,
          maxStorageGb: true,
          maxMonthlyEmails: true,
          maxMonthlyWhatsapp: true,
          maxMonthlyApiCalls: true,
          features: true,
          enabledModules: true,
          badge: true,
          badgeColor: true,
          accentColor: true,
          featuredFeatures: true,
          isActive: true,
          isVisible: true,
          sortOrder: true,
          stripePriceIdMonthly: true,
          stripePriceIdYearly: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!plan) {
        return null;
      }

      // Obtener los módulos habilitados desde ModulePlanAssignment para sincronizar
      const assignments = await prisma.modulePlanAssignment.findMany({
        where: {
          planId: id,
          isEnabled: true,
        },
        include: {
          module: {
            select: {
              name: true,
            },
          },
        },
      });

      // Extraer los nombres de módulos desde las asignaciones
      const enabledModuleNames = assignments
        .map((a) => a.module.name)
        .filter(Boolean) as string[];

      // Si hay diferencia entre enabledModules del plan y las asignaciones, sincronizar
      const currentModules = Array.isArray(plan.enabledModules)
        ? (plan.enabledModules as string[])
        : [];
      
      // Comparar sin importar el orden
      const currentSet = new Set(currentModules);
      const assignedSet = new Set(enabledModuleNames);
      const modulesMatch =
        currentSet.size === assignedSet.size &&
        [...currentSet].every((name) => assignedSet.has(name));

      // Si no coinciden y hay asignaciones, actualizar enabledModules del plan
      if (!modulesMatch && enabledModuleNames.length >= 0) {
        await prisma.plan.update({
          where: { id },
          data: {
            enabledModules: enabledModuleNames,
          },
        });
        plan.enabledModules = enabledModuleNames;
      }

      return plan;
    } catch (error) {
      this.logger.error(`Error finding plan ${id}:`, error);
      throw error;
    }
  }

  async findByName(name: string): Promise<any> {
    try {
      const plan = await prisma.plan.findUnique({
        where: { name },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          priceMonthly: true,
          priceYearly: true,
          currency: true,
          maxUsers: true,
          maxStorageGb: true,
          maxMonthlyEmails: true,
          maxMonthlyWhatsapp: true,
          maxMonthlyApiCalls: true,
          features: true,
          enabledModules: true,
          badge: true,
          badgeColor: true,
          accentColor: true,
          featuredFeatures: true,
          isActive: true,
          isVisible: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return plan;
    } catch (error) {
      this.logger.error(`Error finding plan by name ${name}:`, error);
      throw error;
    }
  }

  async create(data: any): Promise<any> {
    try {
      const plan = await prisma.plan.create({
        data: {
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          priceMonthly: data.priceMonthly,
          priceYearly: data.priceYearly,
          currency: data.currency || 'USD',
          maxUsers: data.maxUsers,
          maxStorageGb: data.maxStorageGb,
          maxMonthlyEmails: data.maxMonthlyEmails,
          maxMonthlyWhatsapp: data.maxMonthlyWhatsapp,
          maxMonthlyApiCalls: data.maxMonthlyApiCalls,
          features: data.features || {},
          enabledModules: data.enabledModules || [],
          badge: data.badge,
          badgeColor: data.badgeColor,
          accentColor: data.accentColor,
          featuredFeatures: data.featuredFeatures ? (Array.isArray(data.featuredFeatures) ? data.featuredFeatures : []) : null,
          stripePriceIdMonthly: data.stripePriceIdMonthly,
          stripePriceIdYearly: data.stripePriceIdYearly,
          isActive: data.isActive !== undefined ? data.isActive : true,
          isVisible: data.isVisible !== undefined ? data.isVisible : true,
          sortOrder: data.sortOrder || 0,
        },
      });

      // Sincronizar asignaciones de módulos si se proporcionaron
      if (data.enabledModules && Array.isArray(data.enabledModules) && data.enabledModules.length > 0) {
        await this.syncModuleAssignments(plan.id, data.enabledModules);
      }

      this.logger.log(`Plan created: ${plan.name}`);
      return plan;
    } catch (error) {
      this.logger.error('Error creating plan:', error);
      throw error;
    }
  }

  async update(id: string, data: any): Promise<any> {
    try {
      const plan = await prisma.plan.update({
        where: { id },
        data: {
          ...(data.displayName && { displayName: data.displayName }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.priceMonthly !== undefined && { priceMonthly: data.priceMonthly }),
          ...(data.priceYearly !== undefined && { priceYearly: data.priceYearly }),
          ...(data.currency && { currency: data.currency }),
          ...(data.maxUsers !== undefined && { maxUsers: data.maxUsers }),
          ...(data.maxStorageGb !== undefined && { maxStorageGb: data.maxStorageGb }),
          ...(data.maxMonthlyEmails !== undefined && { maxMonthlyEmails: data.maxMonthlyEmails }),
          ...(data.maxMonthlyWhatsapp !== undefined && { maxMonthlyWhatsapp: data.maxMonthlyWhatsapp }),
          ...(data.maxMonthlyApiCalls !== undefined && { maxMonthlyApiCalls: data.maxMonthlyApiCalls }),
          ...(data.features !== undefined && { features: data.features }),
          ...(data.enabledModules !== undefined && { enabledModules: data.enabledModules }),
          ...(data.badge !== undefined && { badge: data.badge }),
          ...(data.badgeColor !== undefined && { badgeColor: data.badgeColor }),
          ...(data.accentColor !== undefined && { accentColor: data.accentColor }),
          ...(data.featuredFeatures !== undefined && { 
            featuredFeatures: Array.isArray(data.featuredFeatures) ? data.featuredFeatures : null 
          }),
          ...(data.stripePriceIdMonthly !== undefined && { stripePriceIdMonthly: data.stripePriceIdMonthly }),
          ...(data.stripePriceIdYearly !== undefined && { stripePriceIdYearly: data.stripePriceIdYearly }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
      });

      // Sincronizar asignaciones de módulos si se proporcionaron
      if (data.enabledModules !== undefined) {
        const moduleNames = Array.isArray(data.enabledModules) ? data.enabledModules : [];
        await this.syncModuleAssignments(plan.id, moduleNames);
      }

      this.logger.log(`Plan updated: ${plan.name}`);
      return plan;
    } catch (error) {
      this.logger.error(`Error updating plan ${id}:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza las asignaciones de módulos a un plan
   * @param planId ID del plan
   * @param moduleNames Array de nombres de módulos (strings) que deben estar habilitados
   */
  private async syncModuleAssignments(planId: string, moduleNames: string[]): Promise<void> {
    try {
      // Obtener todos los módulos por nombre
      const modules = await prisma.moduleDefinition.findMany({
        where: {
          name: {
            in: moduleNames,
          },
        },
      });

      // Obtener todas las asignaciones actuales del plan
      const currentAssignments = await prisma.modulePlanAssignment.findMany({
        where: {
          planId,
        },
      });

      // Crear un mapa de módulos por nombre para acceso rápido
      const moduleMap = new Map(modules.map((m) => [m.name, m.id]));

      // Identificar módulos que deben estar habilitados
      const modulesToEnable = new Set<string>();
      moduleNames.forEach((name) => {
        const moduleId = moduleMap.get(name);
        if (moduleId && typeof moduleId === 'string') {
          modulesToEnable.add(moduleId);
        }
      });

      // Crear o actualizar asignaciones para módulos que deben estar habilitados
      for (const moduleId of modulesToEnable) {
        await prisma.modulePlanAssignment.upsert({
          where: {
            moduleId_planId: {
              moduleId,
              planId,
            },
          },
          create: {
            moduleId,
            planId,
            isEnabled: true,
          },
          update: {
            isEnabled: true,
          },
        });
      }

      // Deshabilitar asignaciones para módulos que no están en la lista
      const currentModuleIds = new Set<string>(currentAssignments.map((a) => a.moduleId as string));
      for (const moduleId of currentModuleIds) {
        if (moduleId && typeof moduleId === 'string' && !modulesToEnable.has(moduleId)) {
          await prisma.modulePlanAssignment.updateMany({
            where: {
              moduleId,
              planId,
            },
            data: {
              isEnabled: false,
            },
          });
        }
      }

      this.logger.log(`Synchronized ${modulesToEnable.size} module assignments for plan ${planId}`);
    } catch (error) {
      this.logger.error(`Error syncing module assignments for plan ${planId}:`, error);
      // No lanzar error para no romper la creación/actualización del plan
      // Las asignaciones se pueden actualizar manualmente después
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.plan.delete({
        where: { id },
      });
      this.logger.log(`Plan deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting plan ${id}:`, error);
      throw error;
    }
  }
}

