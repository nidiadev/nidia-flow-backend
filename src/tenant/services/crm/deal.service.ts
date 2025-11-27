import { Injectable, Logger, BadRequestException, NotFoundException, Scope } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { DataScopeService } from '../data-scope.service';
import { BusinessEventEmitterService } from '../../../common/events/event-emitter.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import {
  CreateDealDto,
  UpdateDealDto,
  DealFilterDto,
  DealResponseDto,
  DealSummaryDto,
  ChangeDealStageDto,
  WinLoseDealDto,
  DealStatus,
  DealProductDto,
} from '../../dto/crm/deal.dto';

/**
 * DealService - Gestión de oportunidades (Deals)
 * 
 * CONTEXTO: TENANT
 * Gestiona el pipeline de oportunidades con seguimiento completo
 */
@Injectable({ scope: Scope.REQUEST })
export class DealService {
  private readonly logger = new Logger(DealService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    private readonly eventEmitter: BusinessEventEmitterService,
  ) {}

  /**
   * Create a new deal
   */
  async create(createDto: CreateDealDto, userId: string): Promise<DealResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: createDto.customerId },
      });
      if (!customer) {
        throw new BadRequestException(`Customer with ID ${createDto.customerId} not found`);
      }

      // Validate stage exists
      const stage = await prisma.dealStage.findUnique({
        where: { id: createDto.stageId },
      });
      if (!stage) {
        throw new BadRequestException(`Deal stage with ID ${createDto.stageId} not found`);
      }

      if (!stage.isActive) {
        throw new BadRequestException(`Deal stage ${stage.name} is not active`);
      }

      // Use stage probability if not provided
      const probability = createDto.probability ?? stage.probability;

      // Resolve createdBy - fallback to admin user if userId is undefined
      let resolvedCreatedBy = userId;
      if (!resolvedCreatedBy) {
        const adminUser = await prisma.user.findFirst({
          where: { 
            role: 'admin',
            isActive: true,
          },
        });
        if (!adminUser) {
          throw new BadRequestException('No active admin user found. Cannot create deal without creator.');
        }
        resolvedCreatedBy = adminUser.id;
        this.logger.warn(`Deal created without userId, using admin user: ${adminUser.id}`);
      }

      // Create deal - use direct field IDs instead of relation syntax
      // This avoids Prisma validation issues when using include
      const deal = await prisma.deal.create({
        data: {
          name: createDto.name,
          description: createDto.description,
          customerId: createDto.customerId,
          stageId: createDto.stageId,
          createdBy: resolvedCreatedBy,
          assignedTo: createDto.assignedTo || null,
          probability,
          amount: createDto.amount,
          currency: createDto.currency || 'COP',
          expectedCloseDate: createDto.expectedCloseDate ? new Date(createDto.expectedCloseDate) : null,
          tags: createDto.tags || [],
          notes: createDto.notes,
          customFields: createDto.customFields || {},
          status: DealStatus.OPEN,
          daysInStage: 0,
          lastStageChangeAt: new Date(),
          stageHistory: [
            {
              stageId: createDto.stageId,
              stageName: stage.name,
              changedAt: new Date().toISOString(),
              changedBy: resolvedCreatedBy,
            },
          ],
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
            },
          },
          stage: true,
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Create deal contacts if provided
      if (createDto.contactIds && createDto.contactIds.length > 0) {
        await this.linkContacts(deal.id, createDto.contactIds, userId);
      }

      // Create deal products if provided
      if (createDto.products && createDto.products.length > 0) {
        await this.addProducts(deal.id, createDto.products, userId);
      }

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.DEAL_CREATED, {
        dealId: deal.id,
        dealName: deal.name,
        customerId: deal.customerId,
        stageId: deal.stageId,
        amount: Number(deal.amount),
        createdBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`Deal created: ${deal.id} by user: ${userId}`);
      return await this.findById(deal.id);
    } catch (error: any) {
      this.logger.error(`Failed to create deal: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find deals with filtering and pagination
   */
  async findMany(
    filterDto: DealFilterDto,
    userId: string,
    userPermissions: string[],
  ): Promise<{ data: DealSummaryDto[]; pagination: any }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const page = filterDto.page || 1;
      const limit = filterDto.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const userFilters = this.buildWhereClause(filterDto);

      // Apply data scope
      const scopeFilter = this.dataScope.getDealScope(userPermissions, userId, userFilters);

      const orderBy = this.buildOrderByClause(filterDto);

      // Execute queries
      const [deals, total] = await Promise.all([
        prisma.deal.findMany({
          where: scopeFilter as any,
          orderBy,
          skip,
          take: limit,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true,
              },
            },
            stage: {
              select: {
                id: true,
                name: true,
                displayName: true,
                probability: true,
                color: true,
              },
            },
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.deal.count({ where: scopeFilter as any }),
      ]);

      return {
        data: deals.map(deal => this.mapToSummaryDto(deal)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to find deals: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find deal by ID
   */
  async findById(id: string): Promise<DealResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const deal = await prisma.deal.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
            },
          },
          stage: true,
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          contacts: {
            include: {
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  position: true,
                },
              },
            },
          },
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      if (!deal) {
        throw new NotFoundException(`Deal with ID ${id} not found`);
      }

      return this.mapToResponseDto(deal);
    } catch (error: any) {
      this.logger.error(`Failed to find deal: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update deal
   */
  async update(id: string, updateDto: UpdateDealDto, userId: string): Promise<DealResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const existing = await prisma.deal.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Deal with ID ${id} not found`);
      }

      // Validate stage if changing
      if (updateDto.stageId && updateDto.stageId !== existing.stageId) {
        const stage = await prisma.dealStage.findUnique({
          where: { id: updateDto.stageId },
        });
        if (!stage || !stage.isActive) {
          throw new BadRequestException(`Invalid or inactive deal stage: ${updateDto.stageId}`);
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (updateDto.name !== undefined) updateData.name = updateDto.name;
      if (updateDto.description !== undefined) updateData.description = updateDto.description;
      if (updateDto.customerId !== undefined) updateData.customerId = updateDto.customerId;
      if (updateDto.amount !== undefined) updateData.amount = updateDto.amount;
      if (updateDto.currency !== undefined) updateData.currency = updateDto.currency;
      if (updateDto.expectedCloseDate !== undefined) {
        updateData.expectedCloseDate = updateDto.expectedCloseDate ? new Date(updateDto.expectedCloseDate) : null;
      }
      if (updateDto.assignedTo !== undefined) updateData.assignedTo = updateDto.assignedTo;
      if (updateDto.tags !== undefined) updateData.tags = updateDto.tags;
      if (updateDto.notes !== undefined) updateData.notes = updateDto.notes;
      if (updateDto.customFields !== undefined) updateData.customFields = updateDto.customFields;

      // Handle status changes
      if (updateDto.status !== undefined) {
        updateData.status = updateDto.status;
        if (updateDto.status === DealStatus.WON) {
          updateData.wonAt = new Date();
          updateData.lostAt = null;
          updateData.lostReason = null;
        } else if (updateDto.status === DealStatus.LOST) {
          updateData.lostAt = new Date();
          updateData.wonAt = null;
          if (updateDto.lostReason) {
            updateData.lostReason = updateDto.lostReason;
          }
        }
      }

      // Handle stage change
      if (updateDto.stageId && updateDto.stageId !== existing.stageId) {
        const newStage = await prisma.dealStage.findUnique({
          where: { id: updateDto.stageId },
        });

        const stageHistory = Array.isArray(existing.stageHistory) ? existing.stageHistory : [];
        stageHistory.push({
          stageId: updateDto.stageId,
          stageName: newStage.name,
          changedAt: new Date().toISOString(),
          changedBy: userId,
        });

        updateData.stageId = updateDto.stageId;
        updateData.probability = updateDto.probability ?? newStage.probability;
        updateData.lastStageChangeAt = new Date();
        updateData.daysInStage = 0;
        updateData.stageHistory = stageHistory;

        // Emit stage change event
        await this.eventEmitter.emit(BusinessEventTypes.DEAL_STAGE_CHANGED, {
          dealId: id,
          oldStageId: existing.stageId,
          newStageId: updateDto.stageId,
          changedBy: userId,
          timestamp: new Date(),
        });
      } else if (updateDto.probability !== undefined) {
        updateData.probability = updateDto.probability;
      }

      const deal = await prisma.deal.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
            },
          },
          stage: true,
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update contacts if provided
      if (updateDto.contactIds !== undefined) {
        await this.updateContacts(id, updateDto.contactIds, userId);
      }

      // Update products if provided
      if (updateDto.products !== undefined) {
        await this.updateProducts(id, updateDto.products, userId);
      }

      this.logger.log(`Deal updated: ${id} by user: ${userId}`);
      return await this.findById(id);
    } catch (error: any) {
      this.logger.error(`Failed to update deal: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Change deal stage
   */
  async changeStage(id: string, changeDto: ChangeDealStageDto, userId: string): Promise<DealResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) {
        throw new NotFoundException(`Deal with ID ${id} not found`);
      }

      if (deal.status !== DealStatus.OPEN) {
        throw new BadRequestException('Can only change stage for open deals');
      }

      const newStage = await prisma.dealStage.findUnique({
        where: { id: changeDto.stageId },
      });
      if (!newStage || !newStage.isActive) {
        throw new BadRequestException(`Invalid or inactive deal stage: ${changeDto.stageId}`);
      }

      const stageHistory = Array.isArray(deal.stageHistory) ? deal.stageHistory : [];
      stageHistory.push({
        stageId: changeDto.stageId,
        stageName: newStage.name,
        changedAt: new Date().toISOString(),
        changedBy: userId,
      });

      const updated = await prisma.deal.update({
        where: { id },
        data: {
          stageId: changeDto.stageId,
          probability: changeDto.probability ?? newStage.probability,
          lastStageChangeAt: new Date(),
          daysInStage: 0,
          stageHistory,
        },
      });

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.DEAL_STAGE_CHANGED, {
        dealId: id,
        oldStageId: deal.stageId,
        newStageId: changeDto.stageId,
        changedBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`Deal stage changed: ${id} to stage ${changeDto.stageId}`);
      return await this.findById(id);
    } catch (error: any) {
      this.logger.error(`Failed to change deal stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Win deal
   */
  async winDeal(id: string, winDto: WinLoseDealDto, userId: string): Promise<DealResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) {
        throw new NotFoundException(`Deal with ID ${id} not found`);
      }

      if (deal.status === DealStatus.WON) {
        throw new BadRequestException('Deal is already won');
      }

      if (deal.status === DealStatus.LOST) {
        throw new BadRequestException('Cannot win a lost deal');
      }

      // Move to "won" stage if exists
      const wonStage = await prisma.dealStage.findFirst({
        where: { name: 'won', isActive: true },
      });

      const updateData: any = {
        status: DealStatus.WON,
        wonAt: new Date(),
        lostAt: null,
        lostReason: null,
      };

      if (wonStage) {
        const stageHistory = Array.isArray(deal.stageHistory) ? deal.stageHistory : [];
        stageHistory.push({
          stageId: wonStage.id,
          stageName: wonStage.name,
          changedAt: new Date().toISOString(),
          changedBy: userId,
        });

        updateData.stageId = wonStage.id;
        updateData.probability = 100;
        updateData.stageHistory = stageHistory;
        updateData.lastStageChangeAt = new Date();
        updateData.daysInStage = 0;
      }

      if (winDto.notes) {
        updateData.notes = deal.notes ? `${deal.notes}\n\n${winDto.notes}` : winDto.notes;
      }

      await prisma.deal.update({
        where: { id },
        data: updateData,
      });

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.DEAL_WON, {
        dealId: id,
        dealName: deal.name,
        amount: Number(deal.amount),
        wonBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`Deal won: ${id} by user: ${userId}`);
      return await this.findById(id);
    } catch (error: any) {
      this.logger.error(`Failed to win deal: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lose deal
   */
  async loseDeal(id: string, loseDto: WinLoseDealDto, userId: string): Promise<DealResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) {
        throw new NotFoundException(`Deal with ID ${id} not found`);
      }

      if (deal.status === DealStatus.LOST) {
        throw new BadRequestException('Deal is already lost');
      }

      if (deal.status === DealStatus.WON) {
        throw new BadRequestException('Cannot lose a won deal');
      }

      if (!loseDto.lostReason) {
        throw new BadRequestException('Lost reason is required');
      }

      // Move to "lost" stage if exists
      const lostStage = await prisma.dealStage.findFirst({
        where: { name: 'lost', isActive: true },
      });

      const updateData: any = {
        status: DealStatus.LOST,
        lostAt: new Date(),
        wonAt: null,
        lostReason: loseDto.lostReason,
      };

      if (lostStage) {
        const stageHistory = Array.isArray(deal.stageHistory) ? deal.stageHistory : [];
        stageHistory.push({
          stageId: lostStage.id,
          stageName: lostStage.name,
          changedAt: new Date().toISOString(),
          changedBy: userId,
        });

        updateData.stageId = lostStage.id;
        updateData.probability = 0;
        updateData.stageHistory = stageHistory;
        updateData.lastStageChangeAt = new Date();
        updateData.daysInStage = 0;
      }

      if (loseDto.notes) {
        updateData.notes = deal.notes ? `${deal.notes}\n\n${loseDto.notes}` : loseDto.notes;
      }

      await prisma.deal.update({
        where: { id },
        data: updateData,
      });

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.DEAL_LOST, {
        dealId: id,
        dealName: deal.name,
        lostReason: loseDto.lostReason,
        lostBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`Deal lost: ${id} by user: ${userId}`);
      return await this.findById(id);
    } catch (error: any) {
      this.logger.error(`Failed to lose deal: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete deal (soft delete by changing status to abandoned)
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) {
        throw new NotFoundException(`Deal with ID ${id} not found`);
      }

      await prisma.deal.update({
        where: { id },
        data: {
          status: DealStatus.ABANDONED,
        },
      });

      this.logger.log(`Deal deleted: ${id} by user: ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete deal: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get deals by stage (for Kanban view)
   */
  async findByStage(stageId: string, userId: string, userPermissions: string[]): Promise<DealSummaryDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const userFilters = { stageId, status: DealStatus.OPEN };
      const scopeFilter = this.dataScope.getDealScope(userPermissions, userId, userFilters);

      const deals = await prisma.deal.findMany({
        where: scopeFilter as any,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          stage: {
            select: {
              id: true,
              name: true,
              displayName: true,
              probability: true,
              color: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return deals.map(deal => this.mapToSummaryDto(deal));
    } catch (error: any) {
      this.logger.error(`Failed to find deals by stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(userId: string, userPermissions: string[]): Promise<any> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const userFilters = { status: DealStatus.OPEN };
      const scopeFilter = this.dataScope.getDealScope(userPermissions, userId, userFilters);

      const [deals, stages] = await Promise.all([
        prisma.deal.findMany({
          where: scopeFilter as any,
          include: {
            stage: true,
          },
        }),
        prisma.dealStage.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        }),
      ]);

      // Calculate stats by stage
      const statsByStage = stages.map(stage => {
        const stageDeals = deals.filter(d => d.stageId === stage.id);
        const totalAmount = stageDeals.reduce((sum, d) => sum + Number(d.amount), 0);
        const weightedAmount = stageDeals.reduce(
          (sum, d) => sum + Number(d.amount) * (d.probability / 100),
          0,
        );

        return {
          stageId: stage.id,
          stageName: stage.displayName,
          dealsCount: stageDeals.length,
          totalAmount,
          weightedAmount,
          averageAmount: stageDeals.length > 0 ? totalAmount / stageDeals.length : 0,
        };
      });

      // Overall stats
      const totalAmount = deals.reduce((sum, d) => sum + Number(d.amount), 0);
      const weightedAmount = deals.reduce((sum, d) => sum + Number(d.amount) * (d.probability / 100), 0);

      return {
        totalDeals: deals.length,
        totalAmount,
        weightedAmount,
        averageDealSize: deals.length > 0 ? totalAmount / deals.length : 0,
        byStage: statsByStage,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get pipeline stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get forecasting for a month
   */
  async getForecast(year: number, month: number, userId: string, userPermissions: string[]): Promise<any> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const userFilters = {
        status: DealStatus.OPEN,
        expectedCloseDate: {
          gte: startDate,
          lte: endDate,
        },
      };
      const scopeFilter = this.dataScope.getDealScope(userPermissions, userId, userFilters);

      const deals = await prisma.deal.findMany({
        where: scopeFilter as any,
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

      // Calculate forecast
      const totalAmount = deals.reduce((sum, d) => sum + Number(d.amount), 0);
      const weightedAmount = deals.reduce((sum, d) => sum + Number(d.amount) * (d.probability / 100), 0);

      return {
        year,
        month,
        period: `${year}-${String(month).padStart(2, '0')}`,
        dealsCount: deals.length,
        totalAmount,
        weightedAmount,
        deals: deals.map(deal => ({
          id: deal.id,
          name: deal.name,
          customerName: deal.customer.companyName,
          amount: Number(deal.amount),
          probability: deal.probability,
          weightedAmount: Number(deal.amount) * (deal.probability / 100),
          expectedCloseDate: deal.expectedCloseDate?.toISOString(),
          stageName: deal.stage.displayName,
        })),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get forecast: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update days in stage for all deals (should run daily)
   */
  async updateDaysInStage(): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const deals = await prisma.deal.findMany({
        where: {
          status: DealStatus.OPEN,
          lastStageChangeAt: { not: null },
        },
      });

      const now = new Date();
      const updatePromises = deals.map(deal => {
        if (deal.lastStageChangeAt) {
          const daysDiff = Math.floor((now.getTime() - deal.lastStageChangeAt.getTime()) / (1000 * 60 * 60 * 24));
          return prisma.deal.update({
            where: { id: deal.id },
            data: { daysInStage: daysDiff },
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      this.logger.log(`Updated days in stage for ${deals.length} deals`);
    } catch (error: any) {
      this.logger.error(`Failed to update days in stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Link contacts to deal
   */
  private async linkContacts(dealId: string, contactIds: string[], userId: string): Promise<void> {
    const prisma = await this.tenantPrisma.getTenantClient();

    // Remove existing contacts
    await prisma.dealContact.deleteMany({
      where: { dealId },
    });

    // Add new contacts
    if (contactIds.length > 0) {
      await prisma.dealContact.createMany({
        data: contactIds.map((contactId, index) => ({
          dealId,
          contactId,
          isPrimary: index === 0, // First contact is primary
        })),
      });
    }
  }

  /**
   * Update contacts for deal
   */
  private async updateContacts(dealId: string, contactIds: string[], userId: string): Promise<void> {
    await this.linkContacts(dealId, contactIds, userId);
  }

  /**
   * Add products to deal
   */
  private async addProducts(dealId: string, products: DealProductDto[], userId: string): Promise<void> {
    const prisma = await this.tenantPrisma.getTenantClient();

    // Validate all products exist
    for (const product of products) {
      const exists = await prisma.product.findUnique({
        where: { id: product.productId },
      });
      if (!exists) {
        throw new BadRequestException(`Product with ID ${product.productId} not found`);
      }
    }

    // Create deal products
    await prisma.dealProduct.createMany({
      data: products.map(product => {
        const discount = product.discount || 0;
        const total = product.quantity * product.unitPrice * (1 - discount / 100);
        return {
          dealId,
          productId: product.productId,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          discount,
          total,
          notes: product.notes,
        };
      }),
    });
  }

  /**
   * Update products for deal
   */
  private async updateProducts(dealId: string, products: DealProductDto[], userId: string): Promise<void> {
    const prisma = await this.tenantPrisma.getTenantClient();

    // Remove existing products
    await prisma.dealProduct.deleteMany({
      where: { dealId },
    });

    // Add new products
    if (products.length > 0) {
      await this.addProducts(dealId, products, userId);
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filterDto: DealFilterDto): any {
    const where: any = {};

    if (filterDto.customerId) {
      where.customerId = filterDto.customerId;
    }

    if (filterDto.stageId) {
      where.stageId = filterDto.stageId;
    }

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.assignedTo) {
      where.assignedTo = filterDto.assignedTo;
    }

    if (filterDto.tags && filterDto.tags.length > 0) {
      where.tags = { hasSome: filterDto.tags };
    }

    if (filterDto.minAmount !== undefined || filterDto.maxAmount !== undefined) {
      where.amount = {};
      if (filterDto.minAmount !== undefined) {
        where.amount.gte = filterDto.minAmount;
      }
      if (filterDto.maxAmount !== undefined) {
        where.amount.lte = filterDto.maxAmount;
      }
    }

    if (filterDto.expectedCloseDate) {
      where.expectedCloseDate = {};
      if (filterDto.expectedCloseDate.startDate) {
        where.expectedCloseDate.gte = new Date(filterDto.expectedCloseDate.startDate);
      }
      if (filterDto.expectedCloseDate.endDate) {
        where.expectedCloseDate.lte = new Date(filterDto.expectedCloseDate.endDate);
      }
    }

    if (filterDto.createdAt) {
      where.createdAt = {};
      if (filterDto.createdAt.startDate) {
        where.createdAt.gte = new Date(filterDto.createdAt.startDate);
      }
      if (filterDto.createdAt.endDate) {
        where.createdAt.lte = new Date(filterDto.createdAt.endDate);
      }
    }

    if (filterDto.search) {
      where.OR = [
        { name: { contains: filterDto.search, mode: 'insensitive' } },
        { description: { contains: filterDto.search, mode: 'insensitive' } },
        { notes: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Build order by clause
   */
  private buildOrderByClause(filterDto: DealFilterDto): any {
    const sortBy = filterDto.sortBy || 'createdAt';
    const sortOrder = filterDto.sortOrder || 'desc';
    return { [sortBy]: sortOrder };
  }

  /**
   * Map Prisma model to response DTO
   */
  private mapToResponseDto(deal: any): DealResponseDto {
    const weightedAmount = Number(deal.amount) * (deal.probability / 100);

    return {
      id: deal.id,
      name: deal.name,
      description: deal.description,
      customerId: deal.customerId,
      customer: {
        id: deal.customer.id,
        firstName: deal.customer.firstName,
        lastName: deal.customer.lastName,
        companyName: deal.customer.companyName,
        email: deal.customer.email,
      },
      stageId: deal.stageId,
      stage: {
        id: deal.stage.id,
        name: deal.stage.name,
        displayName: deal.stage.displayName,
        probability: deal.stage.probability,
        color: deal.stage.color,
      },
      probability: deal.probability,
      amount: Number(deal.amount),
      currency: deal.currency,
      expectedCloseDate: deal.expectedCloseDate?.toISOString(),
      status: deal.status as DealStatus,
      lostReason: deal.lostReason,
      wonAt: deal.wonAt?.toISOString(),
      lostAt: deal.lostAt?.toISOString(),
      assignedTo: deal.assignedTo,
      assignedToUser: deal.assignedToUser
        ? {
            id: deal.assignedToUser.id,
            firstName: deal.assignedToUser.firstName,
            lastName: deal.assignedToUser.lastName,
            email: deal.assignedToUser.email,
          }
        : undefined,
      daysInStage: deal.daysInStage,
      lastStageChangeAt: deal.lastStageChangeAt?.toISOString(),
      stageHistory: (Array.isArray(deal.stageHistory) ? deal.stageHistory : []).map((h: any) => ({
        stageId: h.stageId,
        stageName: h.stageName,
        changedAt: h.changedAt,
        changedBy: h.changedBy,
        changedByName: h.changedByName,
      })),
      tags: deal.tags || [],
      notes: deal.notes,
      customFields: deal.customFields || {},
      contacts: (deal.contacts || []).map((dc: any) => ({
        id: dc.id,
        contactId: dc.contactId,
        contact: {
          id: dc.contact.id,
          firstName: dc.contact.firstName,
          lastName: dc.contact.lastName,
          email: dc.contact.email,
          phone: dc.contact.phone,
          position: dc.contact.position,
        },
        role: dc.role,
        isPrimary: dc.isPrimary,
      })),
      products: (deal.products || []).map((dp: any) => ({
        id: dp.id,
        productId: dp.productId,
        product: {
          id: dp.product.id,
          name: dp.product.name,
          sku: dp.product.sku,
        },
        quantity: dp.quantity,
        unitPrice: Number(dp.unitPrice),
        discount: Number(dp.discount),
        total: Number(dp.total),
        notes: dp.notes,
      })),
      weightedAmount,
      createdBy: deal.createdBy,
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
    };
  }

  /**
   * Map Prisma model to summary DTO
   */
  private mapToSummaryDto(deal: any): DealSummaryDto {
    const weightedAmount = Number(deal.amount) * (deal.probability / 100);
    const customerName = deal.customer.companyName || 
      `${deal.customer.firstName || ''} ${deal.customer.lastName || ''}`.trim() ||
      deal.customer.email ||
      'Sin nombre';

    return {
      id: deal.id,
      name: deal.name,
      customerId: deal.customerId,
      customerName,
      stageId: deal.stageId,
      stageName: deal.stage.displayName,
      probability: deal.probability,
      amount: Number(deal.amount),
      currency: deal.currency,
      weightedAmount,
      status: deal.status as DealStatus,
      expectedCloseDate: deal.expectedCloseDate?.toISOString(),
      daysInStage: deal.daysInStage,
      assignedToName: deal.assignedToUser
        ? `${deal.assignedToUser.firstName || ''} ${deal.assignedToUser.lastName || ''}`.trim()
        : undefined,
      tags: deal.tags || [],
    };
  }
}

