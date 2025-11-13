import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import prisma from '../lib/prisma';
import * as bcrypt from 'bcryptjs';
import { CreateSystemUserDto, UpdateSystemUserDto } from './dto/system-user.dto';

@Injectable()
export class SystemUsersService {
  private readonly logger = new Logger(SystemUsersService.name);

  async create(createDto: CreateSystemUserDto, createdBy: string) {
    try {
      // Verificar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: createDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(createDto.password, 10);

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email: createDto.email,
          passwordHash,
          firstName: createDto.firstName,
          lastName: createDto.lastName,
          phone: createDto.phone,
          systemRole: createDto.systemRole,
          isActive: createDto.isActive ?? true,
          emailVerified: createDto.emailVerified ?? false,
          metadata: {
            createdBy,
            createdAt: new Date().toISOString(),
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          systemRole: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`System user created: ${user.id} (${user.email})`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create system user: ${error.message}`, error.stack);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create system user: ${error.message}`);
    }
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    systemRole?: string;
    isActive?: boolean;
  }) {
    try {
      const page = params.page || 1;
      const limit = params.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};

      // Filtrar por systemRole (solo super_admin o support)
      if (params.systemRole) {
        where.systemRole = params.systemRole;
      } else {
        // Por defecto, solo mostrar usuarios del sistema
        where.systemRole = { in: ['super_admin', 'support'] };
      }

      // Filtrar por estado activo
      if (params.isActive !== undefined) {
        where.isActive = params.isActive;
      }

      // Búsqueda
      if (params.search) {
        where.OR = [
          { email: { contains: params.search, mode: 'insensitive' } },
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      // Obtener total
      const total = await prisma.user.count({ where });

      // Obtener usuarios
      const users = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          systemRole: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list system users: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to list system users: ${error.message}`);
    }
  }

  async findOne(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          systemRole: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          lastLoginIp: true,
          loginAttempts: true,
          isLocked: true,
          lockedReason: true,
          lockedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar que sea un usuario del sistema
      if (!['super_admin', 'support'].includes(user.systemRole)) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to get system user ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get system user: ${error.message}`);
    }
  }

  async update(id: string, updateDto: UpdateSystemUserDto, updatedBy: string) {
    try {
      // Verificar que el usuario existe
      const existingUser = await this.findOne(id);

      // Si se cambia el email, verificar que no esté en uso
      if (updateDto.email && updateDto.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateDto.email },
        });

        if (emailExists) {
          throw new ConflictException('El email ya está registrado');
        }
      }

      // Preparar datos de actualización
      const updateData: any = {
        ...(updateDto.email && { email: updateDto.email }),
        ...(updateDto.firstName !== undefined && { firstName: updateDto.firstName }),
        ...(updateDto.lastName !== undefined && { lastName: updateDto.lastName }),
        ...(updateDto.phone !== undefined && { phone: updateDto.phone }),
        ...(updateDto.systemRole && { systemRole: updateDto.systemRole }),
        ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
        ...(updateDto.emailVerified !== undefined && { emailVerified: updateDto.emailVerified }),
      };

      // Si se actualiza la contraseña
      if (updateDto.password) {
        updateData.passwordHash = await bcrypt.hash(updateDto.password, 10);
      }

      // Actualizar usuario
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          systemRole: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`System user updated: ${user.id} (${user.email})`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update system user ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update system user: ${error.message}`);
    }
  }

  async remove(id: string) {
    try {
      const user = await this.findOne(id);

      // No permitir eliminar el último super_admin
      if (user.systemRole === 'super_admin') {
        const superAdminCount = await prisma.user.count({
          where: { systemRole: 'super_admin', isActive: true },
        });

        if (superAdminCount <= 1) {
          throw new BadRequestException('No se puede eliminar el último super administrador activo');
        }
      }

      // Desactivar en lugar de eliminar (soft delete)
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      });

      this.logger.log(`System user deactivated: ${updatedUser.id} (${updatedUser.email})`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to remove system user ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to remove system user: ${error.message}`);
    }
  }

  async getStats() {
    try {
      const [total, superAdmins, support, active, inactive] = await Promise.all([
        prisma.user.count({
          where: { systemRole: { in: ['super_admin', 'support'] } },
        }),
        prisma.user.count({
          where: { systemRole: 'super_admin' },
        }),
        prisma.user.count({
          where: { systemRole: 'support' },
        }),
        prisma.user.count({
          where: { systemRole: { in: ['super_admin', 'support'] }, isActive: true },
        }),
        prisma.user.count({
          where: { systemRole: { in: ['super_admin', 'support'] }, isActive: false },
        }),
      ]);

      return {
        total,
        superAdmins,
        support,
        active,
        inactive,
      };
    } catch (error) {
      this.logger.error(`Failed to get system users stats: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get stats: ${error.message}`);
    }
  }
}

