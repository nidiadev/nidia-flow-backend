import { Injectable, Logger, BadRequestException, NotFoundException, Scope, Inject, forwardRef } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import { TenantUserIndexService } from './tenant-user-index.service';
import * as bcrypt from 'bcryptjs';

export interface CreateTenantUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  department?: string;
  position?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface UpdateTenantUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  department?: string;
  position?: string;
  permissions?: string[];
  isActive?: boolean;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantUsersService {
  private readonly logger = new Logger(TenantUsersService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    @Inject(forwardRef(() => TenantUserIndexService))
    private readonly userIndexService: TenantUserIndexService,
  ) {}

  /**
   * Crear nuevo usuario en la BD del tenant
   * Actualiza automáticamente el índice en SuperAdmin
   */
  async create(createDto: CreateTenantUserDto, createdByUserId: string): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();
    const tenantContext = this.tenantPrisma.getTenantContext();
    
    if (!tenantContext) {
      throw new BadRequestException('Tenant context not available');
    }

    const { tenantId } = tenantContext;

    try {
      // Verificar que el email no exista
      const existingUser = await prisma.user.findUnique({
        where: { email: createDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(createDto.password, 12);

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email: createDto.email,
          passwordHash,
          firstName: createDto.firstName || null,
          lastName: createDto.lastName || null,
          phone: createDto.phone || null,
          role: createDto.role || 'user',
          department: createDto.department || null,
          position: createDto.position || null,
          permissions: createDto.permissions || [],
          isActive: createDto.isActive !== undefined ? createDto.isActive : true,
          createdBy: createdByUserId,
        },
      });

      // Actualizar índice en SuperAdmin (automático y transparente)
      try {
        await this.userIndexService.upsertUser(
          user.email,
          tenantId,
          user.id,
          user.isActive,
        );
        this.logger.log(`✅ User indexed: ${user.email} -> tenant ${tenantId}`);
      } catch (indexError: any) {
        this.logger.error(`⚠️ Failed to index user (non-critical): ${indexError.message}`);
        // No lanzar error, el usuario ya fue creado
      }

      this.logger.log(`User created: ${user.id} (${user.email})`);
      return user;
    } catch (error: any) {
      this.logger.error(`Failed to create user: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Actualizar usuario en la BD del tenant
   * Actualiza automáticamente el índice si cambia el email o estado
   */
  async update(userId: string, updateDto: UpdateTenantUserDto, updatedByUserId: string): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();
    const tenantContext = this.tenantPrisma.getTenantContext();
    
    if (!tenantContext) {
      throw new BadRequestException('Tenant context not available');
    }

    const { tenantId } = tenantContext;

    try {
      // Obtener usuario actual
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      // Preparar datos de actualización
      const updateData: any = {};
      
      if (updateDto.email !== undefined) {
        // Si cambia el email, verificar que no exista otro usuario con ese email
        if (updateDto.email !== currentUser.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: updateDto.email },
          });
          if (existingUser) {
            throw new BadRequestException('User with this email already exists');
          }
        }
        updateData.email = updateDto.email;
      }

      if (updateDto.password !== undefined) {
        updateData.passwordHash = await bcrypt.hash(updateDto.password, 12);
      }

      if (updateDto.firstName !== undefined) updateData.firstName = updateDto.firstName;
      if (updateDto.lastName !== undefined) updateData.lastName = updateDto.lastName;
      if (updateDto.phone !== undefined) updateData.phone = updateDto.phone;
      if (updateDto.role !== undefined) updateData.role = updateDto.role;
      if (updateDto.department !== undefined) updateData.department = updateDto.department;
      if (updateDto.position !== undefined) updateData.position = updateDto.position;
      if (updateDto.permissions !== undefined) updateData.permissions = updateDto.permissions;
      if (updateDto.isActive !== undefined) updateData.isActive = updateDto.isActive;

      // Actualizar usuario
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Actualizar índice en SuperAdmin (automático y transparente)
      try {
        // Si cambió el email, eliminar entrada antigua y crear nueva
        if (updateDto.email && updateDto.email !== currentUser.email) {
          await this.userIndexService.removeUser(currentUser.email);
          await this.userIndexService.upsertUser(
            updatedUser.email,
            tenantId,
            updatedUser.id,
            updatedUser.isActive,
          );
        } else {
          // Solo actualizar si cambió el estado o el userId
          await this.userIndexService.upsertUser(
            updatedUser.email,
            tenantId,
            updatedUser.id,
            updatedUser.isActive,
          );
        }
        this.logger.log(`✅ User index updated: ${updatedUser.email}`);
      } catch (indexError: any) {
        this.logger.error(`⚠️ Failed to update user index (non-critical): ${indexError.message}`);
        // No lanzar error, el usuario ya fue actualizado
      }

      this.logger.log(`User updated: ${userId}`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`Failed to update user: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Eliminar usuario de la BD del tenant
   * Elimina automáticamente del índice
   */
  async delete(userId: string): Promise<void> {
    const prisma = await this.tenantPrisma.getTenantClient();
    const tenantContext = this.tenantPrisma.getTenantContext();
    
    if (!tenantContext) {
      throw new BadRequestException('Tenant context not available');
    }

    try {
      // Obtener usuario antes de eliminarlo
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Eliminar usuario
      await prisma.user.delete({
        where: { id: userId },
      });

      // Eliminar del índice en SuperAdmin (automático y transparente)
      try {
        await this.userIndexService.removeUser(user.email);
        this.logger.log(`✅ User removed from index: ${user.email}`);
      } catch (indexError: any) {
        this.logger.error(`⚠️ Failed to remove user from index (non-critical): ${indexError.message}`);
        // No lanzar error, el usuario ya fue eliminado
      }

      this.logger.log(`User deleted: ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete user: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Desactivar usuario (sin eliminarlo)
   * Actualiza el índice para marcarlo como inactivo
   */
  async deactivate(userId: string): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();
    const tenantContext = this.tenantPrisma.getTenantContext();
    
    if (!tenantContext) {
      throw new BadRequestException('Tenant context not available');
    }

    const { tenantId } = tenantContext;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Actualizar índice
      try {
        await this.userIndexService.deactivateUser(user.email);
        this.logger.log(`✅ User deactivated in index: ${user.email}`);
      } catch (indexError: any) {
        this.logger.error(`⚠️ Failed to deactivate user in index (non-critical): ${indexError.message}`);
      }

      return user;
    } catch (error: any) {
      this.logger.error(`Failed to deactivate user: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Activar usuario
   * Actualiza el índice para marcarlo como activo
   */
  async activate(userId: string): Promise<any> {
    const prisma = await this.tenantPrisma.getTenantClient();
    const tenantContext = this.tenantPrisma.getTenantContext();
    
    if (!tenantContext) {
      throw new BadRequestException('Tenant context not available');
    }

    const { tenantId } = tenantContext;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      // Actualizar índice
      try {
        await this.userIndexService.upsertUser(user.email, tenantId, user.id, true);
        this.logger.log(`✅ User activated in index: ${user.email}`);
      } catch (indexError: any) {
        this.logger.error(`⚠️ Failed to activate user in index (non-critical): ${indexError.message}`);
      }

      return user;
    } catch (error: any) {
      this.logger.error(`Failed to activate user: ${error.message}`, error);
      throw error;
    }
  }
}

