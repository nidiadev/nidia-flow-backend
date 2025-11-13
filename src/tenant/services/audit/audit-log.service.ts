import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { 
  CreateAuditLogDto, 
  AuditLogResponseDto,
  AuditLogFilterDto 
} from '../../dto/audit/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: TenantPrismaService) {}

  private async getClient() {
    return this.prisma.getTenantClient();
  }

  /**
   * Create a new audit log entry
   */
  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLogResponseDto> {
    try {
      const client = await this.getClient();
      const auditLog = await client.auditLog.create({
        data: {
          userId: createAuditLogDto.userId,
          action: createAuditLogDto.action,
          entityType: createAuditLogDto.entityType,
          entityId: createAuditLogDto.entityId,
          changes: createAuditLogDto.changes,
          ipAddress: createAuditLogDto.ipAddress,
          userAgent: createAuditLogDto.userAgent,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(auditLog);
    } catch (error) {
      throw new BadRequestException(`Failed to create audit log: ${error.message}`);
    }
  }

  /**
   * Log user action with automatic context detection
   */
  async logAction(
    action: string,
    userId?: string,
    entityType?: string,
    entityId?: string,
    changes?: Record<string, any>,
    request?: any, // Express request object
  ): Promise<AuditLogResponseDto> {
    const auditLogDto: CreateAuditLogDto = {
      userId,
      action,
      entityType,
      entityId,
      changes,
      ipAddress: request?.ip || request?.connection?.remoteAddress,
      userAgent: request?.get?.('User-Agent'),
    };

    return this.create(auditLogDto);
  } 
 /**
   * Log entity creation
   */
  async logCreate(
    entityType: string,
    entityId: string,
    entityData: Record<string, any>,
    userId?: string,
    request?: any,
  ): Promise<AuditLogResponseDto> {
    return this.logAction(
      `${entityType}_created`,
      userId,
      entityType,
      entityId,
      { after: entityData },
      request,
    );
  }

  /**
   * Log entity update
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    beforeData: Record<string, any>,
    afterData: Record<string, any>,
    userId?: string,
    request?: any,
  ): Promise<AuditLogResponseDto> {
    return this.logAction(
      `${entityType}_updated`,
      userId,
      entityType,
      entityId,
      { before: beforeData, after: afterData },
      request,
    );
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: string,
    entityId: string,
    entityData: Record<string, any>,
    userId?: string,
    request?: any,
  ): Promise<AuditLogResponseDto> {
    return this.logAction(
      `${entityType}_deleted`,
      userId,
      entityType,
      entityId,
      { before: entityData },
      request,
    );
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'login_failed' | 'password_reset',
    userId?: string,
    additionalData?: Record<string, any>,
    request?: any,
  ): Promise<AuditLogResponseDto> {
    return this.logAction(
      `auth_${action}`,
      userId,
      'user',
      userId,
      additionalData,
      request,
    );
  }

  /**
   * Find all audit logs with filtering
   */
  async findAll(
    filters: AuditLogFilterDto = {},
    page: number = 1,
    limit: number = 50,
  ): Promise<{ logs: AuditLogResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const client = await this.getClient();
    
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      client.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      client.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(log => this.mapToResponseDto(log)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }  /**

   * Find audit logs by entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLogResponseDto[]> {
    const client = await this.getClient();
    const logs = await client.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return logs.map(log => this.mapToResponseDto(log));
  }

  /**
   * Find audit logs by user
   */
  async findByUser(userId: string, page: number = 1, limit: number = 50): Promise<{
    logs: AuditLogResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const client = await this.getClient();

    const [logs, total] = await Promise.all([
      client.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      client.auditLog.count({ where: { userId } }),
    ]);

    return {
      logs: logs.map(log => this.mapToResponseDto(log)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(days: number = 30): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByEntity: Record<string, number>;
    logsByUser: Record<string, number>;
    recentActivity: number;
  }> {
    const client = await this.getClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, logsByAction, logsByEntity, logsByUser, recentActivity] = await Promise.all([
      client.auditLog.count(),
      client.auditLog.groupBy({
        by: ['action'],
        _count: {
          id: true,
        },
        where: {
          createdAt: { gte: startDate },
        },
      }),
      client.auditLog.groupBy({
        by: ['entityType'],
        _count: {
          id: true,
        },
        where: {
          createdAt: { gte: startDate },
          entityType: { not: null },
        },
      }),
      client.auditLog.groupBy({
        by: ['userId'],
        _count: {
          id: true,
        },
        where: {
          createdAt: { gte: startDate },
          userId: { not: null },
        },
      }),
      client.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalLogs,
      logsByAction: logsByAction.reduce((acc, item) => {
        acc[item.action] = item._count.id;
        return acc;
      }, {}),
      logsByEntity: logsByEntity.reduce((acc, item) => {
        acc[item.entityType || 'unknown'] = item._count.id;
        return acc;
      }, {}),
      logsByUser: logsByUser.reduce((acc, item) => {
        acc[item.userId || 'system'] = item._count.id;
        return acc;
      }, {}),
      recentActivity,
    };
  } 
 /**
   * Clean up old audit logs (older than specified days)
   */
  async cleanupOldLogs(daysOld: number = 90): Promise<{ deletedCount: number }> {
    const client = await this.getClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedLogs = await client.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return { deletedCount: deletedLogs.count };
  }

  /**
   * Export audit logs to CSV format
   */
  async exportToCsv(filters: AuditLogFilterDto = {}): Promise<string> {
    const client = await this.getClient();
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const logs = await client.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Generate CSV content
    const headers = ['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Changes'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.createdAt.toISOString(),
        log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''} (${log.user.email})`.trim() : 'System',
        log.action,
        log.entityType || '',
        log.entityId || '',
        log.ipAddress || '',
        log.changes ? JSON.stringify(log.changes).replace(/"/g, '""') : '',
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(auditLog: any): AuditLogResponseDto {
    return {
      id: auditLog.id,
      userId: auditLog.userId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
      user: auditLog.user ? {
        id: auditLog.user.id,
        email: auditLog.user.email,
        firstName: auditLog.user.firstName,
        lastName: auditLog.user.lastName,
      } : undefined,
    };
  }
}