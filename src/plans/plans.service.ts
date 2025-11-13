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
          isActive: true,
          isVisible: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      });
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
          stripePriceIdMonthly: data.stripePriceIdMonthly,
          stripePriceIdYearly: data.stripePriceIdYearly,
          isActive: data.isActive !== undefined ? data.isActive : true,
          isVisible: data.isVisible !== undefined ? data.isVisible : true,
          sortOrder: data.sortOrder || 0,
        },
      });
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
          ...(data.stripePriceIdMonthly !== undefined && { stripePriceIdMonthly: data.stripePriceIdMonthly }),
          ...(data.stripePriceIdYearly !== undefined && { stripePriceIdYearly: data.stripePriceIdYearly }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
      });
      this.logger.log(`Plan updated: ${plan.name}`);
      return plan;
    } catch (error) {
      this.logger.error(`Error updating plan ${id}:`, error);
      throw error;
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

