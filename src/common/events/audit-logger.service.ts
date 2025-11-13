import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../../tenant/services/tenant-prisma.service';
import { BusinessEventTypes, AuditLogEvent } from './business-events';

/**
 * Servicio para logging automático de auditoría
 * Escucha eventos de negocio y registra automáticamente logs de auditoría
 */
@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private readonly prisma: TenantPrismaService) {}

  /**
   * Listener principal para eventos de auditoría
   */
  @OnEvent(BusinessEventTypes.AUDIT_LOG)
  async handleAuditLog(event: AuditLogEvent) {
    try {
      const client = await this.prisma.getTenantClient();

      await client.auditLog.create({
        data: {
          entityType: event.entityType,
          entityId: event.entityId,
          action: event.action,
          changes: event.oldValues || {},
          // newValues: event.newValues || {}, // Field doesn't exist in schema
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          // timestamp: event.timestamp || new Date(), // Field doesn't exist in schema, using createdAt
        },
      });

      this.logger.debug(`Audit log created: ${event.action} on ${event.entityType}:${event.entityId}`);

    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, {
        event,
        error: error.stack,
      });
    }
  }

  /**
   * Listeners automáticos para eventos de negocio
   */

  @OnEvent(BusinessEventTypes.ORDER_CREATED)
  async logOrderCreated(event: any) {
    await this.createAuditLog({
      entityType: 'order',
      entityId: event.orderId,
      action: 'created',
      newValues: {
        orderNumber: event.orderNumber,
        orderType: event.orderType,
        customerId: event.customerId,
        assignedTo: event.assignedTo,
        total: event.total,
      },
      userId: event.createdBy,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.ORDER_STATUS_CHANGED)
  async logOrderStatusChanged(event: any) {
    await this.createAuditLog({
      entityType: 'order',
      entityId: event.orderId,
      action: 'status_changed',
      oldValues: { status: event.oldStatus },
      newValues: { 
        status: event.newStatus,
        reason: event.reason,
      },
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.TASK_CREATED)
  async logTaskCreated(event: any) {
    await this.createAuditLog({
      entityType: 'task',
      entityId: event.taskId,
      action: 'created',
      newValues: {
        title: event.title,
        type: event.type,
        priority: event.priority,
        orderId: event.orderId,
        customerId: event.customerId,
        assignedTo: event.assignedTo,
      },
      userId: event.createdBy,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.TASK_ASSIGNED)
  async logTaskAssigned(event: any) {
    await this.createAuditLog({
      entityType: 'task',
      entityId: event.taskId,
      action: 'assigned',
      newValues: {
        assignedTo: event.assignedTo,
        assignedBy: event.assignedBy,
      },
      userId: event.assignedBy,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.TASK_STATUS_CHANGED)
  async logTaskStatusChanged(event: any) {
    await this.createAuditLog({
      entityType: 'task',
      entityId: event.taskId,
      action: 'status_changed',
      oldValues: { status: event.oldStatus },
      newValues: { status: event.newStatus },
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.TASK_CHECKED_IN)
  async logTaskCheckedIn(event: any) {
    await this.createAuditLog({
      entityType: 'task',
      entityId: event.taskId,
      action: 'checked_in',
      newValues: {
        location: event.location,
        checkedInBy: event.assignedTo,
      },
      userId: event.assignedTo,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.TASK_COMPLETED)
  async logTaskCompleted(event: any) {
    await this.createAuditLog({
      entityType: 'task',
      entityId: event.taskId,
      action: 'completed',
      newValues: {
        actualDuration: event.actualDuration,
        location: event.location,
        completedBy: event.assignedTo,
      },
      userId: event.assignedTo,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.CUSTOMER_CREATED)
  async logCustomerCreated(event: any) {
    await this.createAuditLog({
      entityType: 'customer',
      entityId: event.customerId,
      action: 'created',
      newValues: {
        customerType: event.customerType,
        firstName: event.firstName,
        lastName: event.lastName,
        companyName: event.companyName,
        email: event.email,
        phone: event.phone,
        leadSource: event.leadSource,
        assignedTo: event.assignedTo,
      },
      userId: event.createdBy,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.CUSTOMER_STATUS_CHANGED)
  async logCustomerStatusChanged(event: any) {
    await this.createAuditLog({
      entityType: 'customer',
      entityId: event.customerId,
      action: 'status_changed',
      oldValues: { status: event.oldStatus },
      newValues: { 
        status: event.newStatus,
        leadScore: event.leadScore,
      },
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.LEAD_CONVERTED)
  async logLeadConverted(event: any) {
    await this.createAuditLog({
      entityType: 'customer',
      entityId: event.customerId,
      action: 'lead_converted',
      newValues: {
        leadScore: event.leadScore,
        conversionDate: event.conversionDate,
        firstOrderId: event.firstOrderId,
      },
      userId: 'system', // Conversión automática
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.INVENTORY_UPDATED)
  async logInventoryUpdated(event: any) {
    await this.createAuditLog({
      entityType: 'product',
      entityId: event.productId,
      action: 'inventory_updated',
      oldValues: { stockQuantity: event.oldQuantity },
      newValues: { 
        stockQuantity: event.newQuantity,
        movementType: event.movementType,
        quantity: event.quantity,
        referenceType: event.referenceType,
        referenceId: event.referenceId,
        reason: event.reason,
      },
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.PAYMENT_RECEIVED)
  async logPaymentReceived(event: any) {
    await this.createAuditLog({
      entityType: 'payment',
      entityId: event.paymentId,
      action: 'received',
      newValues: {
        orderId: event.orderId,
        customerId: event.customerId,
        amount: event.amount,
        currency: event.currency,
        paymentMethod: event.paymentMethod,
        status: event.status,
        transactionId: event.transactionId,
      },
      userId: event.receivedBy,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.PAYMENT_FAILED)
  async logPaymentFailed(event: any) {
    await this.createAuditLog({
      entityType: 'payment',
      entityId: event.paymentId,
      action: 'failed',
      newValues: {
        orderId: event.orderId,
        customerId: event.customerId,
        amount: event.amount,
        paymentMethod: event.paymentMethod,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
      },
      userId: 'system',
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.MESSAGE_SENT)
  async logMessageSent(event: any) {
    await this.createAuditLog({
      entityType: 'communication',
      entityId: event.messageId,
      action: 'message_sent',
      newValues: {
        customerId: event.customerId,
        channel: event.channel,
        templateId: event.templateId,
        subject: event.subject,
        status: event.status,
      },
      userId: event.sentBy,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.USER_LOGIN)
  async logUserLogin(event: any) {
    await this.createAuditLog({
      entityType: 'user',
      entityId: event.userId,
      action: 'login',
      newValues: {
        email: event.email,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: event.timestamp,
    });
  }

  @OnEvent(BusinessEventTypes.SYSTEM_ERROR)
  async logSystemError(event: any) {
    await this.createAuditLog({
      entityType: 'system',
      entityId: event.errorId,
      action: 'error_occurred',
      newValues: {
        errorType: event.errorType,
        message: event.message,
        context: event.context,
      },
      userId: event.userId || 'system',
      timestamp: event.timestamp,
    });
  }

  /**
   * Método auxiliar para crear logs de auditoría
   */
  private async createAuditLog(logData: Partial<AuditLogEvent>) {
    try {
      const client = await this.prisma.getTenantClient();

      await client.auditLog.create({
        data: {
          entityType: logData.entityType!,
          entityId: logData.entityId!,
          action: logData.action!,
          changes: logData.oldValues || {},
          // newValues: logData.newValues || {}, // Field doesn't exist in schema
          userId: logData.userId!,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
          // timestamp: logData.timestamp || new Date(), // Field doesn't exist in schema, using createdAt
        },
      });

      this.logger.debug(`Audit log created: ${logData.action} on ${logData.entityType}:${logData.entityId}`);

    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, {
        logData,
        error: error.stack,
      });
    }
  }

  /**
   * Método público para crear logs de auditoría manuales
   */
  async logAction(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    options?: {
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    await this.createAuditLog({
      entityType,
      entityId,
      action,
      userId,
      oldValues: options?.oldValues,
      newValues: options?.newValues,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Obtener logs de auditoría con filtros
   */
  async getAuditLogs(filters?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const client = await this.prisma.getTenantClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) {
        where.timestamp.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.timestamp.lte = filters.dateTo;
      }
    }

    const [logs, total] = await Promise.all([
      client.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      client.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}