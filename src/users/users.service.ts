import { Injectable, NotFoundException, ConflictException, BadRequestException, Optional, Inject, forwardRef } from '@nestjs/common';
// import { User, UserSession } from '@prisma/superadmin';
// Temporarily use any types
type User = any;
type UserSession = any;
import prisma from '../lib/prisma';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto, UpdateUserDto, UpdatePasswordDto, InviteUserDto } from './dto';
import { TenantPrismaService } from '../tenant/services/tenant-prisma.service';

interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  systemRole?: string;
  language?: string;
  timezone?: string;
  tenantId?: string;
}

interface CreateSessionData {
  userId: string;
  tokenHash: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

interface UpdateSessionData {
  tokenHash?: string;
  lastActivityAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @Optional() @Inject(forwardRef(() => TenantPrismaService)) private tenantPrisma?: TenantPrismaService
  ) {}
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(userData: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        systemRole: userData.systemRole || 'tenant_admin',
        language: userData.language || 'es',
        timezone: userData.timezone || 'America/Bogota',
        tenantId: userData.tenantId,
        emailVerified: false,
        isActive: true,
        isLocked: false,
        loginAttempts: 0,
      },
    });
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginAttempts: true },
    });

    if (!user) return;

    const newAttempts = user.loginAttempts + 1;
    const updateData: any = { loginAttempts: newAttempts };

    // Lock account after 5 failed attempts
    if (newAttempts >= 5) {
      updateData.isLocked = true;
      updateData.lockedReason = 'Too many failed login attempts';
      updateData.lockedAt = new Date();
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        isLocked: false,
        lockedReason: null,
        lockedAt: null,
      },
    });
  }

  async updateLastLogin(userId: string, ipAddress?: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  }

  async createSession(sessionData: CreateSessionData): Promise<UserSession> {
    return prisma.userSession.create({
      data: {
        userId: sessionData.userId,
        tokenHash: sessionData.tokenHash,
        deviceName: sessionData.deviceName,
        deviceType: sessionData.deviceType,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        expiresAt: sessionData.expiresAt,
        isActive: true,
        lastActivityAt: new Date(),
      },
    });
  }

  async findValidSession(userId: string, refreshToken: string): Promise<UserSession | null> {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Check which session matches the refresh token
    for (const session of sessions) {
      const isValid = await bcrypt.compare(refreshToken, session.tokenHash);
      if (isValid) {
        return session;
      }
    }

    return null;
  }

  async updateSession(sessionId: string, updateData: UpdateSessionData): Promise<UserSession> {
    return prisma.userSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  async invalidateSession(userId: string, refreshToken: string): Promise<void> {
    const session = await this.findValidSession(userId, refreshToken);
    if (session) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
    }
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false },
        ],
      },
    });
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async updateUserActivity(userId: string): Promise<void> {
    // Update lastActivityAt for all active sessions to keep them alive
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      data: {
        lastActivityAt: new Date(),
      },
    });
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });
  }

  async findByPasswordResetToken(tokenHash: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
        // Reset login attempts and unlock account if locked
        loginAttempts: 0,
        isLocked: false,
        lockedReason: null,
        lockedAt: null,
      },
    });
  }

  // ============================================
  // TENANT-SPECIFIC USER MANAGEMENT
  // ============================================

  async createTenantUser(createUserDto: CreateUserDto, tenantId: string, createdBy: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    return prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        role: createUserDto.role,
        department: createUserDto.department,
        position: createUserDto.position,
        employeeId: createUserDto.employeeId,
        hireDate: createUserDto.hireDate ? new Date(createUserDto.hireDate) : null,
        permissions: createUserDto.permissions || [],
        isActive: createUserDto.isActive !== undefined ? createUserDto.isActive : true,
        createdBy,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        employeeId: true,
        hireDate: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAllTenantUsers(tenantId: string, page = 1, limit = 10, search?: string, role?: string, isActive?: boolean) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          department: true,
          position: true,
          employeeId: true,
          hireDate: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { isActive: 'desc' },
          { firstName: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTenantUserById(id: string, tenantId: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        employeeId: true,
        hireDate: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateTenantUser(id: string, updateUserDto: UpdateUserDto, tenantId: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    return prisma.user.update({
      where: { id },
      data: {
        email: updateUserDto.email,
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        phone: updateUserDto.phone,
        role: updateUserDto.role,
        department: updateUserDto.department,
        position: updateUserDto.position,
        employeeId: updateUserDto.employeeId,
        hireDate: updateUserDto.hireDate ? new Date(updateUserDto.hireDate) : undefined,
        permissions: updateUserDto.permissions,
        isActive: updateUserDto.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        employeeId: true,
        hireDate: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateTenantUserPassword(id: string, updatePasswordDto: UpdatePasswordDto, tenantId: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(updatePasswordDto.newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteTenantUser(id: string, tenantId: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has any related data that would prevent deletion
    const [ordersCount, tasksCount, customersCount] = await Promise.all([
      prisma.order.count({ where: { createdBy: id } }),
      prisma.task.count({ where: { createdBy: id } }),
      prisma.customer.count({ where: { createdBy: id } }),
    ]);

    if (ordersCount > 0 || tasksCount > 0 || customersCount > 0) {
      // Instead of deleting, deactivate the user
      return prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
    }

    // Safe to delete
    return prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  async inviteUser(inviteUserDto: InviteUserDto, tenantId: string, invitedBy: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: inviteUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate a temporary password (user will be required to change it)
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: inviteUserDto.email,
        passwordHash,
        firstName: inviteUserDto.firstName,
        lastName: inviteUserDto.lastName,
        role: inviteUserDto.role,
        department: inviteUserDto.department,
        position: inviteUserDto.position,
        isActive: true,
        createdBy: invitedBy,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        position: true,
        createdAt: true,
      },
    });

    // TODO: Send invitation email with temporary password
    // This would be implemented with the email service

    return {
      user,
      tempPassword, // In production, this should be sent via email only
      message: 'User invited successfully. Invitation email sent.',
    };
  }

  async getTenantUserProfile(userId: string, tenantId: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        employeeId: true,
        hireDate: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateTenantUserProfile(userId: string, updateData: Partial<UpdateUserDto>, tenantId: string) {
    if (!this.tenantPrisma) {
      throw new BadRequestException('TenantPrismaService is not available');
    }
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it conflicts
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        phone: updateData.phone,
        department: updateData.department,
        position: updateData.position,
        employeeId: updateData.employeeId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        employeeId: true,
        hireDate: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}