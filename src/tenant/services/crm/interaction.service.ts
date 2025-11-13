import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import {
  CreateInteractionDto,
  UpdateInteractionDto,
  InteractionFilterDto,
  InteractionResponseDto,
  ScheduleInteractionDto,
  CompleteInteractionDto,
  InteractionSummaryDto,
  InteractionType,
  InteractionStatus,
  InteractionOutcome,
  InteractionDirection
} from '../../dto/crm/interaction.dto';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) { }

  /**
   * Create a new interaction
   */
  async create(createInteractionDto: CreateInteractionDto, userId: string): Promise<InteractionResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: createInteractionDto.customerId },
      });

      if (!customer) {
        throw new BadRequestException(`Customer with ID ${createInteractionDto.customerId} not found`);
      }

      // Verify related entities if provided
      if (createInteractionDto.relatedOrderId) {
        const order = await prisma.order.findUnique({
          where: { id: createInteractionDto.relatedOrderId },
        });
        if (!order) {
          throw new BadRequestException(`Order with ID ${createInteractionDto.relatedOrderId} not found`);
        }
      }

      if (createInteractionDto.relatedTaskId) {
        const task = await prisma.task.findUnique({
          where: { id: createInteractionDto.relatedTaskId },
        });
        if (!task) {
          throw new BadRequestException(`Task with ID ${createInteractionDto.relatedTaskId} not found`);
        }
      }

      const interaction = await prisma.interaction.create({
        data: {
          ...createInteractionDto,
          content: createInteractionDto.content || '',
          createdBy: userId,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
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

      // Update customer's last contact date
      await prisma.customer.update({
        where: { id: createInteractionDto.customerId },
        data: { lastContactAt: new Date() },
      });

      return this.mapToResponseDto(interaction);
    } catch (error) {
      this.logger.error(`Failed to create interaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find interactions with filtering and pagination
   */
  async findMany(filterDto: InteractionFilterDto): Promise<{ data: InteractionResponseDto[]; pagination: any }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const page = filterDto.page || 1;
      const limit = filterDto.limit || 20;
      const skip = (page - 1) * limit;

      const where = this.buildWhereClause(filterDto);
      const orderBy = this.buildOrderByClause(filterDto);

      // Execute queries
      const [interactions, total] = await Promise.all([
        prisma.interaction.findMany({
          where,
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
                type: true,
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
        }),
        prisma.interaction.count({ where }),
      ]);

      return {
        data: interactions.map(interaction => this.mapToResponseDto(interaction)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to find interactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find interaction by ID
   */
  async findById(id: string): Promise<InteractionResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const interaction = await prisma.interaction.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
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

      if (!interaction) {
        throw new NotFoundException(`Interaction with ID ${id} not found`);
      }

      return this.mapToResponseDto(interaction);
    } catch (error) {
      this.logger.error(`Failed to find interaction by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update interaction
   */
  async update(id: string, updateInteractionDto: UpdateInteractionDto, userId: string): Promise<InteractionResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Verify interaction exists
      const existingInteraction = await prisma.interaction.findUnique({
        where: { id },
      });

      if (!existingInteraction) {
        throw new NotFoundException(`Interaction with ID ${id} not found`);
      }

      const interaction = await prisma.interaction.update({
        where: { id },
        data: {
          ...updateInteractionDto,
          updatedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
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

      return this.mapToResponseDto(interaction);
    } catch (error) {
      this.logger.error(`Failed to update interaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filterDto: InteractionFilterDto): any {
    const where: any = {};

    if (filterDto.customerId) {
      where.customerId = filterDto.customerId;
    }

    if (filterDto.type) {
      where.type = filterDto.type;
    }

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.direction) {
      where.direction = filterDto.direction;
    }

    if (filterDto.outcome) {
      where.outcome = filterDto.outcome;
    }

    if (filterDto.createdBy) {
      where.createdBy = filterDto.createdBy;
    }

    if (filterDto.search) {
      where.OR = [
        { subject: { contains: filterDto.search, mode: 'insensitive' } },
        { content: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    if (filterDto.createdAt) {
      if (filterDto.createdAt.startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(filterDto.createdAt.startDate) };
      }
      if (filterDto.createdAt.endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(filterDto.createdAt.endDate) };
      }
    }

    if (filterDto.scheduledAt) {
      if (filterDto.scheduledAt.startDate) {
        where.scheduledAt = { ...where.scheduledAt, gte: new Date(filterDto.scheduledAt.startDate) };
      }
      if (filterDto.scheduledAt.endDate) {
        where.scheduledAt = { ...where.scheduledAt, lte: new Date(filterDto.scheduledAt.endDate) };
      }
    }

    return where;
  }

  /**
   * Build order by clause
   */
  private buildOrderByClause(filterDto: InteractionFilterDto): any {
    if (filterDto.sortBy && filterDto.sortOrder) {
      return { [filterDto.sortBy]: filterDto.sortOrder };
    }
    return { createdAt: 'desc' };
  }

  /**
   * Map interaction to response DTO
   */
  private mapToResponseDto(interaction: any): InteractionResponseDto {
    return {
      id: interaction.id,
      customerId: interaction.customerId,
      type: interaction.type,
      direction: interaction.direction,
      subject: interaction.subject,
      content: interaction.content,
      status: interaction.status,
      scheduledAt: interaction.scheduledAt?.toISOString(),
      durationMinutes: interaction.durationMinutes,
      outcome: interaction.outcome,
      nextAction: interaction.nextAction,
      nextActionDate: interaction.nextActionDate?.toISOString(),
      relatedOrderId: interaction.relatedOrderId,
      relatedTaskId: interaction.relatedTaskId,
      metadata: interaction.metadata,
      createdAt: interaction.createdAt?.toISOString(),
      updatedAt: interaction.updatedAt?.toISOString(),
      customer: interaction.customer ? {
        id: interaction.customer.id,
        firstName: interaction.customer.firstName,
        lastName: interaction.customer.lastName,
        companyName: interaction.customer.companyName,
        type: interaction.customer.type,
      } : undefined,
      createdByUser: interaction.createdByUser ? {
        id: interaction.createdByUser.id,
        firstName: interaction.createdByUser.firstName,
        lastName: interaction.createdByUser.lastName,
        email: interaction.createdByUser.email,
      } : undefined,
    };
  }
}