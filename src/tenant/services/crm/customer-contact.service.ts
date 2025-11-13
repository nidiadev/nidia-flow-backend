import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import {
  CreateCustomerContactDto,
  UpdateCustomerContactDto,
  SetPrimaryContactDto,
  CustomerContactResponseDto
} from '../../dto/crm/customer-contact.dto';

@Injectable()
export class CustomerContactService {
  private readonly logger = new Logger(CustomerContactService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * Create a new customer contact
   */
  async create(customerId: string, createContactDto: CreateCustomerContactDto, userId: string): Promise<CustomerContactResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new BadRequestException(`Customer with ID ${customerId} not found`);
      }

      // If this is set as primary, unset other primary contacts
      if (createContactDto.isPrimary) {
        await prisma.customerContact.updateMany({
          where: { 
            customerId: customerId,
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }

      const contact = await prisma.customerContact.create({
        data: {
          ...createContactDto,
          customerId,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      this.logger.log(`Customer contact created: ${contact.id} for customer: ${customerId} by user: ${userId}`);
      
      return this.mapToResponseDto(contact);
    } catch (error) {
      this.logger.error(`Failed to create customer contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all contacts for a customer
   */
  async findByCustomer(customerId: string, includeInactive?: boolean): Promise<CustomerContactResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const where: any = { customerId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const contacts = await prisma.customerContact.findMany({
        where,
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' },
        ],
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      return contacts.map(contact => this.mapToResponseDto(contact));
    } catch (error) {
      this.logger.error(`Failed to find contacts for customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find contact by ID
   */
  async findById(id: string): Promise<CustomerContactResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const contact = await prisma.customerContact.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      if (!contact) {
        throw new NotFoundException(`Customer contact with ID ${id} not found`);
      }

      return this.mapToResponseDto(contact);
    } catch (error) {
      this.logger.error(`Failed to find customer contact by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update customer contact
   */
  async update(id: string, updateContactDto: UpdateCustomerContactDto, userId: string): Promise<CustomerContactResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      // Check if contact exists
      const existingContact = await prisma.customerContact.findUnique({
        where: { id },
      });

      if (!existingContact) {
        throw new NotFoundException(`Customer contact with ID ${id} not found`);
      }

      // If setting as primary, unset other primary contacts for the same customer
      if (updateContactDto.isPrimary) {
        await prisma.customerContact.updateMany({
          where: { 
            customerId: existingContact.customerId,
            isPrimary: true,
            id: { not: id },
          },
          data: { isPrimary: false },
        });
      }

      const contact = await prisma.customerContact.update({
        where: { id },
        data: {
          ...updateContactDto,
          updatedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      this.logger.log(`Customer contact updated: ${id} by user: ${userId}`);
      
      return this.mapToResponseDto(contact);
    } catch (error) {
      this.logger.error(`Failed to update customer contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete customer contact (soft delete)
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const contact = await prisma.customerContact.findUnique({
        where: { id },
      });

      if (!contact) {
        throw new NotFoundException(`Customer contact with ID ${id} not found`);
      }

      await prisma.customerContact.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Customer contact deleted: ${id} by user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set primary contact for a customer
   */
  async setPrimary(contactId: string, userId: string): Promise<CustomerContactResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      // Verify the contact exists
      const contact = await prisma.customerContact.findUnique({
        where: { 
          id: contactId,
        },
      });

      if (!contact || !contact.isActive) {
        throw new NotFoundException(`Contact with ID ${contactId} not found`);
      }

      // Use transaction to ensure atomicity
      const updatedContact = await prisma.$transaction(async (tx) => {
        // Unset all primary contacts for this customer
        await tx.customerContact.updateMany({
          where: { 
            customerId: contact.customerId,
            isPrimary: true,
          },
          data: { isPrimary: false },
        });

        // Set the new primary contact
        return tx.customerContact.update({
          where: { id: contactId },
          data: { 
            isPrimary: true,
            updatedAt: new Date(),
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
              },
            },
          },
        });
      });

      this.logger.log(`Primary contact set: ${contactId} for customer: ${contact.customerId} by user: ${userId}`);
      
      return this.mapToResponseDto(updatedContact);
    } catch (error) {
      this.logger.error(`Failed to set primary contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get primary contact for a customer
   */
  async getPrimaryContact(customerId: string): Promise<CustomerContactResponseDto | null> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const contact = await prisma.customerContact.findFirst({
        where: { 
          customerId,
          isPrimary: true,
          isActive: true,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      return contact ? this.mapToResponseDto(contact) : null;
    } catch (error) {
      this.logger.error(`Failed to get primary contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search contacts by text
   */
  async search(query: string, customerId?: string, limit: number = 10): Promise<CustomerContactResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const where: any = {
        isActive: true,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { position: { contains: query, mode: 'insensitive' } },
          { department: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { mobile: { contains: query } },
        ],
      };

      if (customerId) {
        where.customerId = customerId;
      }

      const contacts = await prisma.customerContact.findMany({
        where,
        take: limit,
        orderBy: [
          { isPrimary: 'desc' },
          { firstName: 'asc' },
        ],
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      return contacts.map(contact => this.mapToResponseDto(contact));
    } catch (error) {
      this.logger.error(`Failed to search customer contacts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get contact statistics for a customer
   */
  async getCustomerContactStats(customerId: string): Promise<{
    totalContacts: number;
    primaryContact: CustomerContactResponseDto | null;
    contactsByDepartment: Record<string, number>;
    hasEmail: number;
    hasPhone: number;
  }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();
      
      const [
        totalContacts,
        primaryContact,
        departmentStats,
        emailStats,
        phoneStats,
      ] = await Promise.all([
        prisma.customerContact.count({
          where: { customerId, isActive: true },
        }),
        
        this.getPrimaryContact(customerId),
        
        prisma.customerContact.groupBy({
          by: ['department'],
          where: { 
            customerId, 
            isActive: true,
            department: { not: null },
          },
          _count: { department: true },
        }),
        
        prisma.customerContact.count({
          where: { 
            customerId, 
            isActive: true,
            email: { not: null },
          },
        }),
        
        prisma.customerContact.count({
          where: { 
            customerId, 
            isActive: true,
            OR: [
              { phone: { not: null } },
              { mobile: { not: null } },
            ],
          },
        }),
      ]);

      const contactsByDepartment = departmentStats.reduce((acc, stat) => {
        if (stat.department) {
          acc[stat.department] = stat._count.department;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        totalContacts,
        primaryContact,
        contactsByDepartment,
        hasEmail: emailStats,
        hasPhone: phoneStats,
      };
    } catch (error) {
      this.logger.error(`Failed to get customer contact statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(contact: any): CustomerContactResponseDto {
    return {
      id: contact.id,
      customerId: contact.customerId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      position: contact.position,
      department: contact.department,
      email: contact.email,
      phone: contact.phone,
      mobile: contact.mobile,
      isPrimary: contact.isPrimary,
      isActive: contact.isActive,
      notes: contact.notes,
      createdAt: contact.createdAt?.toISOString(),
      updatedAt: contact.updatedAt?.toISOString(),
      customer: contact.customer ? {
        id: contact.customer.id,
        firstName: contact.customer.firstName,
        lastName: contact.customer.lastName,
        companyName: contact.customer.companyName,
      } : undefined,
    };
  }
}