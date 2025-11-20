import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { DataScopeService } from '../data-scope.service';
import {
  CreateSmartListDto,
  UpdateSmartListDto,
  SmartListFilterDto,
  SmartListResponseDto,
  FilterGroupDto,
  FilterConditionDto,
  BulkActionDto,
} from '../../dto/crm/smart-list.dto';
import { Prisma } from '../../../../generated/tenant-prisma';

/**
 * SmartListService
 * 
 * Service for managing smart lists (segmentation) with dynamic filters
 */
@Injectable()
export class SmartListService {
  private readonly logger = new Logger(SmartListService.name);

  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
  ) {}

  /**
   * Create a new smart list
   */
  async create(createDto: CreateSmartListDto, userId: string): Promise<SmartListResponseDto> {
    const client = await this.prisma.getTenantClient();

    // Validate filter configuration
    this.validateFilterConfig(createDto.filterConfig);

    const smartList = await client.smartList.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        isActive: createDto.isActive ?? true,
        filterConfig: createDto.filterConfig as any,
        filterLogic: createDto.filterLogic || 'AND',
        autoUpdate: createDto.autoUpdate ?? true,
        tags: createDto.tags || [],
        createdBy: userId,
      },
    });

    // If auto-update is enabled, populate members immediately
    if (smartList.autoUpdate) {
      await this.updateListMembers(smartList.id);
    }

    this.logger.log(`Smart list created: ${smartList.id}`);
    return this.mapToResponseDto(smartList);
  }

  /**
   * Find all smart lists with filters
   */
  async findMany(
    filters: SmartListFilterDto,
    userId: string,
  ): Promise<{ data: SmartListResponseDto[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();
    const where = this.buildWhereClause(filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const [smartLists, total] = await Promise.all([
      client.smartList.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
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
      client.smartList.count({ where }),
    ]);

    return {
      data: smartLists.map((list) => this.mapToResponseDto(list)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find smart list by ID
   */
  async findById(id: string, userId: string): Promise<SmartListResponseDto> {
    const client = await this.prisma.getTenantClient();
    const smartList = await client.smartList.findUnique({
      where: { id },
      include: {
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

    if (!smartList) {
      throw new NotFoundException(`Smart list with ID ${id} not found`);
    }

    return this.mapToResponseDto(smartList);
  }

  /**
   * Update smart list
   */
  async update(
    id: string,
    updateDto: UpdateSmartListDto,
    userId: string,
  ): Promise<SmartListResponseDto> {
    const client = await this.prisma.getTenantClient();

    // Check if smart list exists
    const existing = await client.smartList.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Smart list with ID ${id} not found`);
    }

    // Validate filter configuration if provided
    if (updateDto.filterConfig) {
      this.validateFilterConfig(updateDto.filterConfig);
    }

    const smartList = await client.smartList.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        isActive: updateDto.isActive,
        filterConfig: updateDto.filterConfig as any,
        filterLogic: updateDto.filterLogic,
        autoUpdate: updateDto.autoUpdate,
        tags: updateDto.tags,
        lastUpdatedAt: updateDto.filterConfig || updateDto.autoUpdate ? new Date() : undefined,
      },
    });

    // If filter config changed or auto-update is enabled, update members
    if ((updateDto.filterConfig || updateDto.autoUpdate !== undefined) && smartList.autoUpdate) {
      await this.updateListMembers(id);
    }

    this.logger.log(`Smart list updated: ${id}`);
    return this.mapToResponseDto(smartList);
  }

  /**
   * Delete smart list
   */
  async delete(id: string, userId: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const smartList = await client.smartList.findUnique({ where: { id } });
    if (!smartList) {
      throw new NotFoundException(`Smart list with ID ${id} not found`);
    }

    if (smartList.isSystem) {
      throw new BadRequestException('Cannot delete system smart lists');
    }

    await client.smartList.delete({ where: { id } });
    this.logger.log(`Smart list deleted: ${id}`);
  }

  /**
   * Get smart list members
   */
  async getMembers(
    id: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: any[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();

    const smartList = await client.smartList.findUnique({ where: { id } });
    if (!smartList) {
      throw new NotFoundException(`Smart list with ID ${id} not found`);
    }

    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      client.smartListMember.findMany({
        where: { smartListId: id },
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
              phone: true,
              type: true,
              leadScore: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      }),
      client.smartListMember.count({ where: { smartListId: id } }),
    ]);

    return {
      data: members.map((member) => ({
        id: member.id,
        customerId: member.customerId,
        customer: member.customer,
        addedAt: member.addedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update list members based on filter configuration
   */
  async updateListMembers(smartListId: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const smartList = await client.smartList.findUnique({
      where: { id: smartListId },
    });

    if (!smartList) {
      throw new NotFoundException(`Smart list with ID ${smartListId} not found`);
    }

    // Build Prisma where clause from filter config
    const where = this.buildCustomerWhereFromFilter(smartList.filterConfig as any, smartList.filterLogic);

    // Find all customers matching the filters
    const matchingCustomers = await client.customer.findMany({
      where,
      select: { id: true },
    });

    const matchingIds = matchingCustomers.map((c) => c.id);

    // Get current members
    const currentMembers = await client.smartListMember.findMany({
      where: { smartListId },
      select: { customerId: true },
    });

    const currentIds = currentMembers.map((m) => m.customerId);

    // Find customers to add and remove
    const toAdd = matchingIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !matchingIds.includes(id));

    // Add new members
    if (toAdd.length > 0) {
      await client.smartListMember.createMany({
        data: toAdd.map((customerId) => ({
          smartListId,
          customerId,
        })),
        skipDuplicates: true,
      });
    }

    // Remove old members
    if (toRemove.length > 0) {
      await client.smartListMember.deleteMany({
        where: {
          smartListId,
          customerId: { in: toRemove },
        },
      });
    }

    // Update member count
    const memberCount = matchingIds.length;
    await client.smartList.update({
      where: { id: smartListId },
      data: {
        memberCount,
        lastUpdatedAt: new Date(),
      },
    });

    this.logger.log(`Smart list ${smartListId} updated: ${toAdd.length} added, ${toRemove.length} removed`);
  }

  /**
   * Execute bulk action on smart list members
   */
  async executeBulkAction(
    id: string,
    actionDto: BulkActionDto,
    userId: string,
  ): Promise<{ affected: number }> {
    const client = await this.prisma.getTenantClient();

    const smartList = await client.smartList.findUnique({ where: { id } });
    if (!smartList) {
      throw new NotFoundException(`Smart list with ID ${id} not found`);
    }

    // Get all member customer IDs
    const members = await client.smartListMember.findMany({
      where: { smartListId: id },
      select: { customerId: true },
    });

    const customerIds = members.map((m) => m.customerId);

    if (customerIds.length === 0) {
      return { affected: 0 };
    }

    let affected = 0;

    switch (actionDto.action) {
      case 'assign':
        if (!actionDto.userId) {
          throw new BadRequestException('userId is required for assign action');
        }
        affected = (
          await client.customer.updateMany({
            where: { id: { in: customerIds } },
            data: { assignedTo: actionDto.userId },
          })
        ).count;
        break;

      case 'tag':
        if (!actionDto.tags || actionDto.tags.length === 0) {
          throw new BadRequestException('tags are required for tag action');
        }
        // Get current tags and merge
        const customers = await client.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, tags: true },
        });
        for (const customer of customers) {
          const currentTags = customer.tags || [];
          const newTags = [...new Set([...currentTags, ...actionDto.tags!])];
          await client.customer.update({
            where: { id: customer.id },
            data: { tags: newTags },
          });
        }
        affected = customers.length;
        break;

      case 'untag':
        if (!actionDto.tags || actionDto.tags.length === 0) {
          throw new BadRequestException('tags are required for untag action');
        }
        const customersToUntag = await client.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, tags: true },
        });
        for (const customer of customersToUntag) {
          const currentTags = customer.tags || [];
          const newTags = currentTags.filter((tag) => !actionDto.tags!.includes(tag));
          await client.customer.update({
            where: { id: customer.id },
            data: { tags: newTags },
          });
        }
        affected = customersToUntag.length;
        break;

      case 'change_type':
        if (!actionDto.newType) {
          throw new BadRequestException('newType is required for change_type action');
        }
        affected = (
          await client.customer.updateMany({
            where: { id: { in: customerIds } },
            data: { type: actionDto.newType },
          })
        ).count;
        break;

      case 'change_owner':
        if (!actionDto.userId) {
          throw new BadRequestException('userId is required for change_owner action');
        }
        affected = (
          await client.customer.updateMany({
            where: { id: { in: customerIds } },
            data: { assignedTo: actionDto.userId },
          })
        ).count;
        break;

      default:
        throw new BadRequestException(`Unknown action: ${actionDto.action}`);
    }

    this.logger.log(`Bulk action ${actionDto.action} executed on ${affected} customers`);
    return { affected };
  }

  /**
   * Build Prisma where clause from filter configuration
   */
  private buildCustomerWhereFromFilter(
    filterConfig: FilterGroupDto,
    filterLogic: string,
  ): Prisma.CustomerWhereInput {
    const conditions: Prisma.CustomerWhereInput[] = [];

    // Process conditions
    if (filterConfig.conditions && filterConfig.conditions.length > 0) {
      for (const condition of filterConfig.conditions) {
        const conditionWhere = this.buildConditionWhere(condition);
        if (conditionWhere) {
          conditions.push(conditionWhere);
        }
      }
    }

    // Process nested groups
    if (filterConfig.groups && filterConfig.groups.length > 0) {
      for (const group of filterConfig.groups) {
        const groupWhere = this.buildCustomerWhereFromFilter(group, group.logic);
        conditions.push(groupWhere);
      }
    }

    // Combine conditions with logic
    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return filterLogic === 'OR' ? { OR: conditions } : { AND: conditions };
  }

  /**
   * Build Prisma where clause for a single condition
   */
  private buildConditionWhere(condition: FilterConditionDto): Prisma.CustomerWhereInput | null {
    const { field, operator, value, value2 } = condition;

    // Map field names to Prisma fields
    const fieldMap: Record<string, string> = {
      type: 'type',
      leadSource: 'leadSource',
      leadScore: 'leadScore',
      firstName: 'firstName',
      lastName: 'lastName',
      companyName: 'companyName',
      email: 'email',
      phone: 'phone',
      industry: 'industry',
      assignedTo: 'assignedTo',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };

    const prismaField = fieldMap[field];
    if (!prismaField) {
      this.logger.warn(`Unknown field: ${field}, skipping condition`);
      return null;
    }

    // Build condition based on operator
    switch (operator) {
      case 'equals':
        return { [prismaField]: value } as Prisma.CustomerWhereInput;
      case 'not_equals':
        return { [prismaField]: { not: value } } as Prisma.CustomerWhereInput;
      case 'contains':
        return { [prismaField]: { contains: value, mode: 'insensitive' } } as Prisma.CustomerWhereInput;
      case 'not_contains':
        return { [prismaField]: { not: { contains: value, mode: 'insensitive' } } } as Prisma.CustomerWhereInput;
      case 'starts_with':
        return { [prismaField]: { startsWith: value, mode: 'insensitive' } } as Prisma.CustomerWhereInput;
      case 'ends_with':
        return { [prismaField]: { endsWith: value, mode: 'insensitive' } } as Prisma.CustomerWhereInput;
      case 'greater_than':
        return { [prismaField]: { gt: value } } as Prisma.CustomerWhereInput;
      case 'less_than':
        return { [prismaField]: { lt: value } } as Prisma.CustomerWhereInput;
      case 'greater_than_or_equal':
        return { [prismaField]: { gte: value } } as Prisma.CustomerWhereInput;
      case 'less_than_or_equal':
        return { [prismaField]: { lte: value } } as Prisma.CustomerWhereInput;
      case 'between':
        if (value2 !== undefined) {
          return { [prismaField]: { gte: value, lte: value2 } } as Prisma.CustomerWhereInput;
        }
        return null;
      case 'in':
        return { [prismaField]: { in: Array.isArray(value) ? value : [value] } } as Prisma.CustomerWhereInput;
      case 'not_in':
        return { [prismaField]: { notIn: Array.isArray(value) ? value : [value] } } as Prisma.CustomerWhereInput;
      case 'is_empty':
        return { OR: [{ [prismaField]: null }, { [prismaField]: '' }] } as Prisma.CustomerWhereInput;
      case 'is_not_empty':
        return { AND: [{ [prismaField]: { not: null } }, { [prismaField]: { not: '' } }] } as Prisma.CustomerWhereInput;
      case 'is_null':
        return { [prismaField]: null } as Prisma.CustomerWhereInput;
      case 'is_not_null':
        return { [prismaField]: { not: null } } as Prisma.CustomerWhereInput;
      default:
        this.logger.warn(`Unknown operator: ${operator}, skipping condition`);
        return null;
    }
  }

  /**
   * Validate filter configuration
   */
  private validateFilterConfig(filterConfig: FilterGroupDto): void {
    if (!filterConfig.conditions && !filterConfig.groups) {
      throw new BadRequestException('Filter configuration must have at least one condition or group');
    }

    if (filterConfig.conditions && filterConfig.conditions.length === 0 && (!filterConfig.groups || filterConfig.groups.length === 0)) {
      throw new BadRequestException('Filter configuration must have at least one condition or group');
    }

    // Recursively validate nested groups
    if (filterConfig.groups) {
      for (const group of filterConfig.groups) {
        this.validateFilterConfig(group);
      }
    }
  }

  /**
   * Build where clause for filtering smart lists
   */
  private buildWhereClause(filters: SmartListFilterDto): Prisma.SmartListWhereInput {
    const where: Prisma.SmartListWhereInput = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    return where;
  }

  /**
   * Map Prisma model to response DTO
   */
  private mapToResponseDto(smartList: any): SmartListResponseDto {
    return {
      id: smartList.id,
      name: smartList.name,
      description: smartList.description,
      isActive: smartList.isActive,
      isSystem: smartList.isSystem,
      filterConfig: smartList.filterConfig,
      filterLogic: smartList.filterLogic,
      autoUpdate: smartList.autoUpdate,
      lastUpdatedAt: smartList.lastUpdatedAt,
      memberCount: smartList.memberCount,
      tags: smartList.tags,
      createdAt: smartList.createdAt,
      updatedAt: smartList.updatedAt,
    };
  }
}

