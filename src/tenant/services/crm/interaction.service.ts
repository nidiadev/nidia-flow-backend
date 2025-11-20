import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { DataScopeService } from '../data-scope.service';
import {
  CreateInteractionDto,
  UpdateInteractionDto,
  InteractionFilterDto,
  InteractionResponseDto,
  ScheduleInteractionDto,
  CompleteInteractionDto,
  InteractionSummaryDto,
  CalendarFilterDto,
  CreateRecurringActivityDto,
  CreateReminderDto,
  InteractionType,
  InteractionStatus,
  InteractionOutcome,
  InteractionDirection
} from '../../dto/crm/interaction.dto';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
  ) {}

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

      // Handle recurrence if specified
      let parentInteractionId: string | undefined = undefined;
      if (createInteractionDto.isRecurring && createInteractionDto.recurrenceRule) {
        // For recurring activities, the first one becomes the parent
        parentInteractionId = undefined; // Will be set after creation if this is a child
      }

      const interaction = await prisma.interaction.create({
        data: {
          customerId: createInteractionDto.customerId,
          type: createInteractionDto.type,
          direction: createInteractionDto.direction,
          subject: createInteractionDto.subject,
          content: createInteractionDto.content || '',
          status: createInteractionDto.status || InteractionStatus.COMPLETED,
          scheduledAt: createInteractionDto.scheduledAt ? new Date(createInteractionDto.scheduledAt) : null,
          scheduledEndAt: createInteractionDto.scheduledEndAt ? new Date(createInteractionDto.scheduledEndAt) : null,
          durationMinutes: createInteractionDto.durationMinutes,
          priority: createInteractionDto.priority || 'normal',
          assignedTo: createInteractionDto.assignedTo,
          location: createInteractionDto.location,
          locationUrl: createInteractionDto.locationUrl,
          isRecurring: createInteractionDto.isRecurring || false,
          recurrenceRule: createInteractionDto.recurrenceRule,
          recurrenceEndDate: createInteractionDto.recurrenceEndDate ? new Date(createInteractionDto.recurrenceEndDate) : null,
          parentInteractionId: parentInteractionId,
          outcome: createInteractionDto.outcome,
          nextAction: createInteractionDto.nextAction,
          nextActionDate: createInteractionDto.nextActionDate ? new Date(createInteractionDto.nextActionDate) : null,
          relatedOrderId: createInteractionDto.relatedOrderId,
          relatedTaskId: createInteractionDto.relatedTaskId,
          customFields: createInteractionDto.customFields || {},
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
   * Automatically applies data scope based on user permissions
   * Note: Interactions are linked to customers, so scope is applied through customer ownership
   */
  async findMany(
    filterDto: InteractionFilterDto,
    userId?: string,
    userPermissions?: string[],
  ): Promise<{ data: InteractionResponseDto[]; pagination: any }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const page = filterDto.page || 1;
      const limit = filterDto.limit || 20;
      const skip = (page - 1) * limit;

      // Build user filters
      const userFilters = this.buildWhereClause(filterDto);

      // Apply data scope: filter by customer ownership OR interaction creator
      // This ensures users see interactions for their customers OR interactions they created
      let scopeFilter = userFilters;
      if (userId && userPermissions && !this.dataScope.canViewAll(userPermissions)) {
        // Get customer scope to filter interactions by customer ownership
        const customerScope = this.dataScope.getCustomerScope(userPermissions, userId, {});
        
        // Also include interactions created by the user
        scopeFilter = {
          ...userFilters,
          OR: [
            // Interactions for customers owned by user
            { customer: customerScope as any },
            // Interactions created by user
            { createdBy: userId },
          ],
        };
      }

      const orderBy = this.buildOrderByClause(filterDto);

      // Execute queries
      const [interactions, total] = await Promise.all([
        prisma.interaction.findMany({
          where: scopeFilter,
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
        prisma.interaction.count({ where: scopeFilter }),
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

    if (filterDto.assignedTo) {
      where.assignedTo = filterDto.assignedTo;
    }

    if (filterDto.priority) {
      where.priority = filterDto.priority;
    }

    if (filterDto.isRecurring !== undefined) {
      where.isRecurring = filterDto.isRecurring;
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
      scheduledEndAt: interaction.scheduledEndAt?.toISOString(),
      durationMinutes: interaction.durationMinutes,
      priority: interaction.priority,
      assignedTo: interaction.assignedTo,
      assignedToUser: interaction.assignedToUser ? {
        id: interaction.assignedToUser.id,
        firstName: interaction.assignedToUser.firstName,
        lastName: interaction.assignedToUser.lastName,
        email: interaction.assignedToUser.email,
      } : undefined,
      location: interaction.location,
      locationUrl: interaction.locationUrl,
      isRecurring: interaction.isRecurring,
      recurrenceRule: interaction.recurrenceRule,
      recurrenceEndDate: interaction.recurrenceEndDate?.toISOString(),
      parentInteractionId: interaction.parentInteractionId,
      completedAt: interaction.completedAt?.toISOString(),
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
      createdBy: interaction.createdBy,
      createdByUser: interaction.createdByUser ? {
        id: interaction.createdByUser.id,
        firstName: interaction.createdByUser.firstName,
        lastName: interaction.createdByUser.lastName,
        email: interaction.createdByUser.email,
      } : undefined,
    };
  }

  /**
   * Get calendar view (month, week, or day)
   */
  async getCalendarView(
    filterDto: CalendarFilterDto,
    userId: string,
    userPermissions: string[],
  ): Promise<{ activities: InteractionResponseDto[]; dateRange: { start: string; end: string } }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Calculate date range based on view type
      const { startDate, endDate } = this.calculateDateRange(filterDto);

      // Build where clause
      const where: any = {
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        status: InteractionStatus.SCHEDULED, // Only show scheduled activities
      };

      if (filterDto.assignedTo) {
        where.assignedTo = filterDto.assignedTo;
      } else if (!this.dataScope.canViewAll(userPermissions)) {
        // If no assignedTo filter, show only user's activities
        where.assignedTo = userId;
      }

      if (filterDto.type) {
        where.type = filterDto.type;
      }

      if (filterDto.priority) {
        where.priority = filterDto.priority;
      }

      const activities = await prisma.interaction.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
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

      return {
        activities: activities.map(activity => this.mapToResponseDto(activity)),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get calendar view: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get today's activities for a user
   */
  async getTodayActivities(
    userId: string,
    userPermissions: string[],
  ): Promise<InteractionResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: any = {
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
        status: InteractionStatus.SCHEDULED,
      };

      // Apply data scope
      if (!this.dataScope.canViewAll(userPermissions)) {
        where.assignedTo = userId;
      }

      const activities = await prisma.interaction.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
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

      return activities.map(activity => this.mapToResponseDto(activity));
    } catch (error: any) {
      this.logger.error(`Failed to get today's activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create recurring activity
   */
  async createRecurringActivity(
    createDto: CreateRecurringActivityDto,
    userId: string,
  ): Promise<InteractionResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Create parent interaction
      const parent = await this.create(createDto, userId);

      // Generate recurring instances
      const instances = this.generateRecurringInstances(
        createDto.scheduledAt!,
        createDto.recurrenceEndDate,
        createDto.recurrenceRule,
      );

      // Create child interactions
      const createdInstances: InteractionResponseDto[] = [parent];
      for (const instanceDate of instances) {
        const childDto: CreateInteractionDto = {
          ...createDto,
          scheduledAt: instanceDate.toISOString(),
          isRecurring: false, // Children are not marked as recurring
          parentInteractionId: parent.id,
        };
        const child = await this.create(childDto, userId);
        createdInstances.push(child);
      }

      this.logger.log(`Created recurring activity with ${createdInstances.length} instances`);
      return createdInstances;
    } catch (error: any) {
      this.logger.error(`Failed to create recurring activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add reminder to activity
   */
  async addReminder(
    interactionId: string,
    reminderDto: CreateReminderDto,
    userId: string,
  ): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const interaction = await prisma.interaction.findUnique({
        where: { id: interactionId },
      });

      if (!interaction) {
        throw new NotFoundException(`Interaction with ID ${interactionId} not found`);
      }

      if (!interaction.scheduledAt) {
        throw new BadRequestException('Cannot add reminder to activity without scheduled time');
      }

      const reminderAt = new Date(interaction.scheduledAt);
      reminderAt.setMinutes(reminderAt.getMinutes() - reminderDto.reminderMinutes);

      await prisma.activityReminder.create({
        data: {
          interactionId,
          reminderMinutes: reminderDto.reminderMinutes,
          reminderAt,
        },
      });

      this.logger.log(`Reminder added to interaction ${interactionId}`);
    } catch (error: any) {
      this.logger.error(`Failed to add reminder: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Complete an activity
   */
  async completeActivity(
    id: string,
    completeDto: CompleteInteractionDto,
    userId: string,
  ): Promise<InteractionResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const interaction = await prisma.interaction.findUnique({
        where: { id },
      });

      if (!interaction) {
        throw new NotFoundException(`Interaction with ID ${id} not found`);
      }

      const updateData: any = {
        status: InteractionStatus.COMPLETED,
        completedAt: new Date(),
      };

      if (completeDto.content !== undefined) {
        updateData.content = completeDto.content;
      }

      if (completeDto.durationMinutes !== undefined) {
        updateData.durationMinutes = completeDto.durationMinutes;
      }

      if (completeDto.outcome !== undefined) {
        updateData.outcome = completeDto.outcome;
      }

      if (completeDto.nextAction !== undefined) {
        updateData.nextAction = completeDto.nextAction;
      }

      if (completeDto.nextActionDate !== undefined) {
        updateData.nextActionDate = completeDto.nextActionDate ? new Date(completeDto.nextActionDate) : null;
      }

      const updated = await prisma.interaction.update({
        where: { id },
        data: updateData,
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

      return this.mapToResponseDto(updated);
    } catch (error: any) {
      this.logger.error(`Failed to complete activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Calculate date range for calendar view
   */
  private calculateDateRange(filterDto: CalendarFilterDto): { startDate: Date; endDate: Date } {
    let startDate: Date;
    let endDate: Date;

    if (filterDto.view === 'month') {
      startDate = new Date(filterDto.year, filterDto.month - 1, 1);
      endDate = new Date(filterDto.year, filterDto.month, 0, 23, 59, 59);
    } else if (filterDto.view === 'week') {
      if (!filterDto.week) {
        throw new BadRequestException('Week number is required for week view');
      }
      // Calculate start of week (assuming week starts on Monday)
      const jan1 = new Date(filterDto.year, 0, 1);
      const daysOffset = (filterDto.week - 1) * 7;
      startDate = new Date(jan1);
      startDate.setDate(jan1.getDate() + daysOffset - jan1.getDay() + 1); // Monday
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // day view
      if (!filterDto.day) {
        throw new BadRequestException('Day is required for day view');
      }
      startDate = new Date(filterDto.year, filterDto.month - 1, filterDto.day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  /**
   * Generate recurring instances based on recurrence rule
   */
  private generateRecurringInstances(
    startDate: string,
    endDate: string,
    rule: string,
  ): Date[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const instances: Date[] = [];

    let current = new Date(start);

    while (current <= end) {
      instances.push(new Date(current));

      if (rule === 'daily') {
        current.setDate(current.getDate() + 1);
      } else if (rule === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (rule === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else {
        // Unknown rule, break
        break;
      }
    }

    return instances;
  }
}