import { Injectable, Logger, BadRequestException, NotFoundException, Scope } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { DataScopeService } from '../data-scope.service';
import { BusinessEventEmitterService } from '../../../common/events/event-emitter.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilterDto,
  CustomerResponseDto,
  AssignCustomerDto,
  ConvertLeadDto,
  CustomerType,
  CustomerStatus,
  LeadSource
} from '../../dto/crm/customer.dto';
import { PaginationDto, ApiResponseDto } from '../../dto/base/base.dto';

@Injectable({ scope: Scope.REQUEST })
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    private readonly eventEmitter: BusinessEventEmitterService,
  ) {}

  /**
   * Create a new customer
   */
  async create(createCustomerDto: CreateCustomerDto, userId: string): Promise<CustomerResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      // Check if customer with same email already exists
      if (createCustomerDto.email) {
        const existingCustomer = await prisma.customer.findFirst({
          where: { email: createCustomerDto.email }
        });
        
        if (existingCustomer) {
          throw new BadRequestException('Customer with this email already exists');
        }
      }

      // Generate lead score if not provided
      const leadScore = createCustomerDto.leadScore ?? this.calculateInitialLeadScore(createCustomerDto);

      const customer = await prisma.customer.create({
        data: {
          ...createCustomerDto,
          leadScore,
          createdBy: userId,
        },
      });

      // Emitir evento de cliente creado
      await this.eventEmitter.emit(BusinessEventTypes.CUSTOMER_CREATED, {
        customerId: customer.id,
        customerType: customer.type,
        firstName: customer.firstName,
        lastName: customer.lastName,
        companyName: customer.companyName,
        email: customer.email,
        phone: customer.phone,
        leadSource: customer.leadSource,
        assignedTo: customer.assignedTo,
        createdBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`Customer created: ${customer.id} by user: ${userId}`);
      
      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error(`Failed to create customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find customers with filters and pagination
   * Automatically applies data scope based on user permissions
   */
  async findMany(
    filterDto: CustomerFilterDto,
    userId: string,
    userPermissions: string[],
  ): Promise<{
    data: CustomerResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const page = filterDto.page || 1;
      const limit = filterDto.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause with user filters
      const userFilters = this.buildWhereClause(filterDto);

      // Apply data scope based on user permissions
      // This automatically filters to show only user's own data if they don't have 'view_all'
      const scopeFilter = this.dataScope.getCustomerScope(userPermissions, userId, userFilters);

      // Build order by clause
      const orderBy = this.buildOrderByClause(filterDto);

      // Execute queries with scope filter
      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where: scopeFilter as any,
          orderBy,
          skip,
          take: limit,
          include: {
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                interactions: true,
                orders: true,
              },
            },
          },
        }),
        prisma.customer.count({ where: scopeFilter as any }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: customers.map(customer => this.mapToResponseDto(customer)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to find customers: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find customer by ID
   */
  async findById(id: string): Promise<CustomerResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          contacts: {
            where: { isActive: true },
            orderBy: { isPrimary: 'desc' },
          },
          interactions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              createdByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          orders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              interactions: true,
              orders: true,
            },
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error(`Failed to find customer by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update customer
   */
  async update(id: string, updateCustomerDto: UpdateCustomerDto, userId: string): Promise<CustomerResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      // Check if customer exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Check email uniqueness if email is being updated
      if (updateCustomerDto.email && updateCustomerDto.email !== existingCustomer.email) {
        const emailExists = await prisma.customer.findFirst({
          where: { 
            email: updateCustomerDto.email,
            id: { not: id },
          },
        });
        
        if (emailExists) {
          throw new BadRequestException('Customer with this email already exists');
        }
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          ...updateCustomerDto,
          updatedAt: new Date(),
        },
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Emitir evento si cambió el estado
      if (updateCustomerDto.status && updateCustomerDto.status !== existingCustomer.status) {
        await this.eventEmitter.emit(BusinessEventTypes.CUSTOMER_STATUS_CHANGED, {
          customerId: id,
          oldStatus: existingCustomer.status,
          newStatus: updateCustomerDto.status,
          leadScore: customer.leadScore,
          assignedTo: customer.assignedTo,
          userId,
          timestamp: new Date(),
        });
      }

      this.logger.log(`Customer updated: ${id} by user: ${userId}`);
      
      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error(`Failed to update customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete customer (soft delete)
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const customer = await prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      await prisma.customer.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Customer deleted: ${id} by user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Assign customer to user
   */
  async assign(id: string, assignDto: AssignCustomerDto, userId: string): Promise<CustomerResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Verify assigned user exists
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignDto.assignedTo },
      });

      if (!assignedUser) {
        throw new BadRequestException(`User with ID ${assignDto.assignedTo} not found`);
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          assignedTo: assignDto.assignedTo,
          updatedAt: new Date(),
        },
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Create interaction record for assignment
      await prisma.interaction.create({
        data: {
          customerId: id,
          type: 'note',
          subject: 'Customer Assignment',
          content: `Customer assigned to ${assignedUser.firstName} ${assignedUser.lastName}. Reason: ${assignDto.reason || 'No reason provided'}`,
          status: 'completed',
          createdBy: userId,
        },
      });

      this.logger.log(`Customer ${id} assigned to ${assignDto.assignedTo} by user: ${userId}`);
      
      return this.mapToResponseDto(updatedCustomer);
    } catch (error) {
      this.logger.error(`Failed to assign customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Convert lead to customer
   */
  async convertLead(id: string, convertDto: ConvertLeadDto, userId: string): Promise<CustomerResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const customer = await prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      if (customer.type !== CustomerType.LEAD) {
        throw new BadRequestException('Only leads can be converted');
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          type: convertDto.targetType,
          convertedFromLeadAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Create interaction record for conversion
      await prisma.interaction.create({
        data: {
          customerId: id,
          type: 'note',
          subject: 'Lead Conversion',
          content: `Lead converted to ${convertDto.targetType}. Notes: ${convertDto.notes || 'No notes provided'}`,
          status: 'completed',
          outcome: 'closed',
          createdBy: userId,
        },
      });

      // Emitir evento de conversión de lead
      await this.eventEmitter.emit(BusinessEventTypes.LEAD_CONVERTED, {
        customerId: id,
        leadScore: customer.leadScore,
        conversionDate: new Date(),
        assignedTo: customer.assignedTo,
        timestamp: new Date(),
      });

      this.logger.log(`Lead ${id} converted to ${convertDto.targetType} by user: ${userId}`);
      
      return this.mapToResponseDto(updatedCustomer);
    } catch (error) {
      this.logger.error(`Failed to convert lead: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update lead score
   */
  async updateLeadScore(id: string, score: number, userId: string): Promise<CustomerResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      if (score < 0 || score > 100) {
        throw new BadRequestException('Lead score must be between 0 and 100');
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          leadScore: score,
          updatedAt: new Date(),
        },
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Lead score updated for customer ${id}: ${score} by user: ${userId}`);
      
      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error(`Failed to update lead score: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getStatistics(): Promise<{
    totalCustomers: number;
    byType: Record<CustomerType, number>;
    byStatus: Record<CustomerStatus, number>;
    byLeadSource: Record<LeadSource, number>;
    averageLeadScore: number;
    conversionRate: number;
  }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const [
        totalCustomers,
        byType,
        byStatus,
        byLeadSource,
        leadScoreStats,
        conversionStats,
      ] = await Promise.all([
        prisma.customer.count({ where: { isActive: true } }),
        
        prisma.customer.groupBy({
          by: ['type'],
          where: { isActive: true },
          _count: { type: true },
        }),
        
        prisma.customer.groupBy({
          by: ['status'],
          where: { isActive: true },
          _count: { status: true },
        }),
        
        prisma.customer.groupBy({
          by: ['leadSource'],
          where: { isActive: true, leadSource: { not: null } },
          _count: { leadSource: true },
        }),
        
        prisma.customer.aggregate({
          where: { isActive: true, leadScore: { not: 0 } },
          _avg: { leadScore: true },
        }),
        
        Promise.all([
          prisma.customer.count({ where: { type: CustomerType.LEAD, isActive: true } }),
          prisma.customer.count({ 
            where: { 
              type: { in: [CustomerType.PROSPECT, CustomerType.ACTIVE] },
              convertedFromLeadAt: { not: null },
              isActive: true 
            } 
          }),
        ]),
      ]);

      const typeStats = Object.values(CustomerType).reduce((acc, type) => {
        acc[type] = byType.find(item => item.type === type)?._count.type || 0;
        return acc;
      }, {} as Record<CustomerType, number>);

      const statusStats = Object.values(CustomerStatus).reduce((acc, status) => {
        acc[status] = byStatus.find(item => item.status === status)?._count.status || 0;
        return acc;
      }, {} as Record<CustomerStatus, number>);

      const sourceStats = Object.values(LeadSource).reduce((acc, source) => {
        acc[source] = byLeadSource.find(item => item.leadSource === source)?._count.leadSource || 0;
        return acc;
      }, {} as Record<LeadSource, number>);

      const [totalLeads, convertedLeads] = conversionStats;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      return {
        totalCustomers,
        byType: typeStats,
        byStatus: statusStats,
        byLeadSource: sourceStats,
        averageLeadScore: leadScoreStats._avg?.leadScore || 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to get customer statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search customers by text
   */
  async search(query: string, limit: number = 10): Promise<CustomerResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const customers = await prisma.customer.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { mobile: { contains: query } },
          ],
        },
        take: limit,
        orderBy: { leadScore: 'desc' },
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return customers.map(customer => this.mapToResponseDto(customer));
    } catch (error) {
      this.logger.error(`Failed to search customers: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filterDto: CustomerFilterDto): any {
    const where: any = { isActive: true };

    if (filterDto.type) {
      where.type = filterDto.type;
    }

    if (filterDto.leadSource) {
      where.leadSource = filterDto.leadSource;
    }

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.assignedTo) {
      where.assignedTo = filterDto.assignedTo;
    }

    if (filterDto.city) {
      where.city = { contains: filterDto.city, mode: 'insensitive' };
    }

    if (filterDto.state) {
      where.state = { contains: filterDto.state, mode: 'insensitive' };
    }

    if (filterDto.industry) {
      where.industry = { contains: filterDto.industry, mode: 'insensitive' };
    }

    if (filterDto.segment) {
      where.segment = filterDto.segment;
    }

    if (filterDto.tags && filterDto.tags.length > 0) {
      where.tags = { hasSome: filterDto.tags };
    }

    if (filterDto.minLeadScore !== undefined) {
      where.leadScore = { ...where.leadScore, gte: filterDto.minLeadScore };
    }

    if (filterDto.maxLeadScore !== undefined) {
      where.leadScore = { ...where.leadScore, lte: filterDto.maxLeadScore };
    }

    if (filterDto.search) {
      where.OR = [
        { firstName: { contains: filterDto.search, mode: 'insensitive' } },
        { lastName: { contains: filterDto.search, mode: 'insensitive' } },
        { companyName: { contains: filterDto.search, mode: 'insensitive' } },
        { email: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    // Date filters
    if (filterDto.createdAt) {
      if (filterDto.createdAt.startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(filterDto.createdAt.startDate) };
      }
      if (filterDto.createdAt.endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(filterDto.createdAt.endDate) };
      }
    }

    return where;
  }

  /**
   * Build order by clause
   */
  private buildOrderByClause(filterDto: CustomerFilterDto): any {
    const sortBy = filterDto.sortBy || 'createdAt';
    const sortOrder = filterDto.sortOrder || 'desc';

    return { [sortBy]: sortOrder };
  }

  /**
   * Calculate initial lead score based on customer data
   */
  private calculateInitialLeadScore(customerData: CreateCustomerDto): number {
    let score = 0;

    // Base score for having contact information
    if (customerData.email) score += 20;
    if (customerData.phone || customerData.mobile) score += 15;
    if (customerData.companyName) score += 10;

    // Score based on lead source
    switch (customerData.leadSource) {
      case LeadSource.REFERRAL:
        score += 25;
        break;
      case LeadSource.WEBSITE:
        score += 20;
        break;
      case LeadSource.SOCIAL_MEDIA:
        score += 15;
        break;
      case LeadSource.EMAIL_CAMPAIGN:
        score += 10;
        break;
      default:
        score += 5;
    }

    // Score based on completeness of profile
    if (customerData.industry) score += 5;
    if (customerData.addressLine1) score += 5;
    if (customerData.city) score += 5;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(customer: any): CustomerResponseDto {
    return {
      id: customer.id,
      type: customer.type,
      leadSource: customer.leadSource,
      leadScore: customer.leadScore,
      firstName: customer.firstName,
      lastName: customer.lastName,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      mobile: customer.mobile,
      whatsapp: customer.whatsapp,
      addressLine1: customer.addressLine1,
      addressLine2: customer.addressLine2,
      city: customer.city,
      state: customer.state,
      postalCode: customer.postalCode,
      country: customer.country,
      latitude: customer.latitude,
      longitude: customer.longitude,
      industry: customer.industry,
      segment: customer.segment,
      taxId: customer.taxId,
      creditLimit: customer.creditLimit,
      paymentTerms: customer.paymentTerms,
      status: customer.status,
      isActive: customer.isActive,
      tags: customer.tags,
      notes: customer.notes,
      assignedTo: customer.assignedTo,
      customFields: customer.customFields,
      metadata: customer.metadata,
      createdAt: customer.createdAt?.toISOString(),
      updatedAt: customer.updatedAt?.toISOString(),
      convertedFromLeadAt: customer.convertedFromLeadAt?.toISOString(),
      firstPurchaseAt: customer.firstPurchaseAt?.toISOString(),
      lastPurchaseAt: customer.lastPurchaseAt?.toISOString(),
      lastContactAt: customer.lastContactAt?.toISOString(),
      assignedUser: customer.assignedToUser ? {
        id: customer.assignedToUser.id,
        firstName: customer.assignedToUser.firstName,
        lastName: customer.assignedToUser.lastName,
        email: customer.assignedToUser.email,
      } : undefined,
      interactionsCount: customer._count?.interactions || 0,
      ordersCount: customer._count?.orders || 0,
      totalRevenue: customer.orders?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0,
    };
  }
}