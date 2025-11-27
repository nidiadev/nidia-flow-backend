import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { DataScopeService } from '../data-scope.service';
import { BusinessEventEmitterService, BusinessEventTypes } from '../../../common/events';
import {
  CreateCustomerNoteDto,
  UpdateCustomerNoteDto,
  CustomerNoteResponseDto
} from '../../dto/crm/customer-note.dto';

@Injectable()
export class CustomerNoteService {
  private readonly logger = new Logger(CustomerNoteService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    @Inject(BusinessEventEmitterService)
    private readonly eventEmitter: BusinessEventEmitterService,
  ) {}

  /**
   * Create a new customer note
   */
  async create(createNoteDto: CreateCustomerNoteDto, userId: string | undefined): Promise<CustomerNoteResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: createNoteDto.customerId },
      });

      if (!customer) {
        throw new BadRequestException(`Customer with ID ${createNoteDto.customerId} not found`);
      }

      // Para tenant_admin sin usuario en BD del tenant, buscar un usuario admin como fallback
      let createdByUserId: string | null = null;
      
      if (userId) {
        // Verificar que el usuario existe en la BD del tenant
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true },
        });

        if (user) {
          createdByUserId = user.id;
        } else {
          // Si el usuario no existe en la BD del tenant, buscar un usuario admin como fallback
          const adminUser = await prisma.user.findFirst({
            where: { role: 'admin', isActive: true },
            select: { id: true },
          });
          
          if (adminUser) {
            createdByUserId = adminUser.id;
            this.logger.warn(`User ${userId} not found in tenant DB, using admin user ${adminUser.id} as fallback for note creation`);
          }
        }
      } else {
        // Si userId es undefined, buscar un usuario admin como fallback
        const adminUser = await prisma.user.findFirst({
          where: { role: 'admin', isActive: true },
          select: { id: true },
        });
        
        if (adminUser) {
          createdByUserId = adminUser.id;
        }
      }

      if (!createdByUserId) {
        throw new BadRequestException('No valid user found to create the note. Please ensure you are authenticated correctly.');
      }

      // Create the note
      const note = await prisma.customerNote.create({
        data: {
          customerId: createNoteDto.customerId,
          content: createNoteDto.content.trim(),
          isInternal: createNoteDto.isInternal ?? true,
          createdBy: createdByUserId,
        },
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

      // Emit event
      const tenantContext = this.tenantPrisma.getTenantContext();
      this.eventEmitter.emit(BusinessEventTypes.CUSTOMER_NOTE_CREATED, {
        noteId: note.id,
        customerId: note.customerId,
        createdBy: note.createdBy,
        tenantContext,
      });

      return this.mapToResponseDto(note);
    } catch (error) {
      this.logger.error(`Error creating customer note: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all notes for a customer
   */
  async findByCustomer(customerId: string, userId?: string, userPermissions: string[] = []): Promise<CustomerNoteResponseDto[]> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Get data scope - filter notes by customer ownership OR note creator
      let scopeFilter: any = {};
      if (userId && userPermissions.length > 0 && !this.dataScope.canViewAll(userPermissions)) {
        // Get customer scope to filter notes by customer ownership
        const customerScope = this.dataScope.getCustomerScope(userPermissions, userId, {});
        
        // Also include notes created by the user
        scopeFilter = {
          OR: [
            // Notes for customers owned by user
            { customer: customerScope as any },
            // Notes created by user
            { createdBy: userId },
          ],
        };
      }

      // Find notes
      const notes = await prisma.customerNote.findMany({
        where: {
          customerId,
          ...scopeFilter,
        },
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      return notes.map(note => this.mapToResponseDto(note));
    } catch (error) {
      this.logger.error(`Error finding customer notes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a customer note
   */
  async update(noteId: string, updateNoteDto: UpdateCustomerNoteDto, userId?: string): Promise<CustomerNoteResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Verify note exists
      const existingNote = await prisma.customerNote.findUnique({
        where: { id: noteId },
      });

      if (!existingNote) {
        throw new NotFoundException(`Note with ID ${noteId} not found`);
      }

      // Check permissions (only creator can update)
      if (userId && existingNote.createdBy !== userId) {
        throw new BadRequestException('You can only update your own notes');
      }

      // Update the note
      const note = await prisma.customerNote.update({
        where: { id: noteId },
        data: {
          ...(updateNoteDto.content !== undefined && { content: updateNoteDto.content.trim() }),
          ...(updateNoteDto.isInternal !== undefined && { isInternal: updateNoteDto.isInternal }),
        },
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

      // Emit event
      const tenantContext = this.tenantPrisma.getTenantContext();
      this.eventEmitter.emit(BusinessEventTypes.CUSTOMER_NOTE_UPDATED, {
        noteId: note.id,
        customerId: note.customerId,
        createdBy: note.createdBy,
        tenantContext,
      });

      return this.mapToResponseDto(note);
    } catch (error) {
      this.logger.error(`Error updating customer note: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a customer note
   */
  async delete(noteId: string, userId?: string): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Verify note exists
      const existingNote = await prisma.customerNote.findUnique({
        where: { id: noteId },
      });

      if (!existingNote) {
        throw new NotFoundException(`Note with ID ${noteId} not found`);
      }

      // Check permissions (only creator can delete)
      if (userId && existingNote.createdBy !== userId) {
        throw new BadRequestException('You can only delete your own notes');
      }

      // Delete the note
      await prisma.customerNote.delete({
        where: { id: noteId },
      });

      // Emit event
      const tenantContext = this.tenantPrisma.getTenantContext();
      this.eventEmitter.emit(BusinessEventTypes.CUSTOMER_NOTE_DELETED, {
        noteId,
        customerId: existingNote.customerId,
        createdBy: existingNote.createdBy,
        tenantContext,
      });
    } catch (error) {
      this.logger.error(`Error deleting customer note: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map Prisma note to response DTO
   */
  private mapToResponseDto(note: any): CustomerNoteResponseDto {
    return {
      id: note.id,
      customerId: note.customerId,
      content: note.content,
      isInternal: note.isInternal,
      createdBy: note.createdBy,
      createdByUser: note.createdByUser ? {
        id: note.createdByUser.id,
        firstName: note.createdByUser.firstName || undefined,
        lastName: note.createdByUser.lastName || undefined,
        email: note.createdByUser.email,
      } : undefined,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}

