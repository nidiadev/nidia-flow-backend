import { Injectable, Logger, BadRequestException, NotFoundException, Scope } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateDealStageDto, UpdateDealStageDto, DealStageResponseDto } from '../../dto/crm/deal-stage.dto';

/**
 * DealStageService - Gestión de etapas del pipeline
 * 
 * CONTEXTO: TENANT
 * Gestiona las etapas configurables del pipeline de oportunidades
 */
@Injectable({ scope: Scope.REQUEST })
export class DealStageService {
  private readonly logger = new Logger(DealStageService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * Create a new deal stage
   */
  async create(createDto: CreateDealStageDto, userId: string): Promise<DealStageResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Validate probability range
      if (createDto.probability < 0 || createDto.probability > 100) {
        throw new BadRequestException('Probability must be between 0 and 100');
      }

      // If this is the first stage, set as default
      const existingStages = await prisma.dealStage.count({ where: { isActive: true } });
      const isDefault = existingStages === 0;

      const stage = await prisma.dealStage.create({
        data: {
          name: createDto.name,
          displayName: createDto.displayName || createDto.name,
          description: createDto.description,
          probability: createDto.probability,
          sortOrder: createDto.sortOrder ?? existingStages,
          color: createDto.color,
          isDefault,
        },
      });

      this.logger.log(`Deal stage created: ${stage.id} (${stage.name})`);
      return this.mapToResponseDto(stage);
    } catch (error: any) {
      this.logger.error(`Failed to create deal stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all active deal stages
   */
  async findAll(): Promise<DealStageResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const stages = await prisma.dealStage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      return stages.map(stage => this.mapToResponseDto(stage));
    } catch (error: any) {
      this.logger.error(`Failed to find deal stages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get deal stage by ID
   */
  async findById(id: string): Promise<DealStageResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const stage = await prisma.dealStage.findUnique({
        where: { id },
      });

      if (!stage) {
        throw new NotFoundException(`Deal stage with ID ${id} not found`);
      }

      return this.mapToResponseDto(stage);
    } catch (error: any) {
      this.logger.error(`Failed to find deal stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update deal stage
   */
  async update(id: string, updateDto: UpdateDealStageDto, userId: string): Promise<DealStageResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Check if stage exists
      const existing = await prisma.dealStage.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Deal stage with ID ${id} not found`);
      }

      // Prevent deletion of default stages
      if (updateDto.isActive === false && existing.isDefault) {
        throw new BadRequestException('Cannot deactivate default deal stage');
      }

      // Validate probability if provided
      if (updateDto.probability !== undefined && (updateDto.probability < 0 || updateDto.probability > 100)) {
        throw new BadRequestException('Probability must be between 0 and 100');
      }

      const stage = await prisma.dealStage.update({
        where: { id },
        data: {
          name: updateDto.name,
          displayName: updateDto.displayName,
          description: updateDto.description,
          probability: updateDto.probability,
          sortOrder: updateDto.sortOrder,
          color: updateDto.color,
          isActive: updateDto.isActive,
        },
      });

      this.logger.log(`Deal stage updated: ${id}`);
      return this.mapToResponseDto(stage);
    } catch (error: any) {
      this.logger.error(`Failed to update deal stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete deal stage (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const stage = await prisma.dealStage.findUnique({ where: { id } });
      if (!stage) {
        throw new NotFoundException(`Deal stage with ID ${id} not found`);
      }

      if (stage.isDefault) {
        throw new BadRequestException('Cannot delete default deal stage');
      }

      // Check if there are deals in this stage
      const dealsCount = await prisma.deal.count({ where: { stageId: id, status: 'open' } });
      if (dealsCount > 0) {
        throw new BadRequestException(
          `Cannot delete stage with ${dealsCount} active deals. Move deals to another stage first.`
        );
      }

      await prisma.dealStage.update({
        where: { id },
        data: { isActive: false },
      });

      this.logger.log(`Deal stage deleted: ${id}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete deal stage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Reorder stages
   */
  async reorder(stageIds: string[]): Promise<DealStageResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Update sort order for each stage
      const updatePromises = stageIds.map((stageId, index) =>
        prisma.dealStage.update({
          where: { id: stageId },
          data: { sortOrder: index },
        })
      );

      await Promise.all(updatePromises);

      // Return updated stages
      return this.findAll();
    } catch (error: any) {
      this.logger.error(`Failed to reorder deal stages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get default stages (for seeding)
   */
  getDefaultStages(): Array<Omit<CreateDealStageDto, 'name' | 'displayName'>> {
    return [
      { name: 'qualification', displayName: 'Calificación', probability: 10, sortOrder: 0, color: '#94a3b8' },
      { name: 'proposal', displayName: 'Propuesta', probability: 30, sortOrder: 1, color: '#3b82f6' },
      { name: 'negotiation', displayName: 'Negociación', probability: 60, sortOrder: 2, color: '#f59e0b' },
      { name: 'closing', displayName: 'Cierre', probability: 90, sortOrder: 3, color: '#10b981' },
      { name: 'won', displayName: 'Ganado', probability: 100, sortOrder: 4, color: '#22c55e' },
      { name: 'lost', displayName: 'Perdido', probability: 0, sortOrder: 5, color: '#ef4444' },
    ];
  }

  /**
   * Initialize default stages for a tenant
   */
  async initializeDefaultStages(userId: string): Promise<DealStageResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Check if stages already exist
      const existingCount = await prisma.dealStage.count();
      if (existingCount > 0) {
        this.logger.warn('Default stages already exist, skipping initialization');
        return this.findAll();
      }

      const defaultStages = this.getDefaultStages();
      const createdStages = [];

      for (let i = 0; i < defaultStages.length; i++) {
        const stageData = defaultStages[i];
        const stage = await prisma.dealStage.create({
          data: {
            ...stageData,
            isDefault: i === 0, // First stage is default
          },
        });
        createdStages.push(stage);
      }

      this.logger.log(`Initialized ${createdStages.length} default deal stages`);
      return createdStages.map(stage => this.mapToResponseDto(stage));
    } catch (error: any) {
      this.logger.error(`Failed to initialize default stages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map Prisma model to response DTO
   */
  private mapToResponseDto(stage: any): DealStageResponseDto {
    return {
      id: stage.id,
      name: stage.name,
      displayName: stage.displayName,
      description: stage.description,
      probability: stage.probability,
      sortOrder: stage.sortOrder,
      isActive: stage.isActive,
      isDefault: stage.isDefault,
      color: stage.color,
      dealsCount: stage._count?.deals || 0,
      createdAt: stage.createdAt.toISOString(),
      updatedAt: stage.updatedAt.toISOString(),
    };
  }
}

