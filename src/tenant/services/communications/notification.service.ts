import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateNotificationDto, NotificationFilterDto } from '../../dto/communications/notification.dto';
import { Notification, Prisma } from '../../../../generated/tenant-prisma';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const {
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
      actionUrl
    } = createNotificationDto;

    const client = await this.prisma.getTenantClient();
    const notification = await client.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
      },
    });

    return notification;
  }

  async createBulk(notifications: CreateNotificationDto[]): Promise<number> {
    const client = await this.prisma.getTenantClient();
    const result = await client.notification.createMany({
      data: notifications.map(notification => ({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        entityType: notification.entityType,
        entityId: notification.entityId,
        actionUrl: notification.actionUrl,
      })),
    });

    return result.count;
  }

  async findAll(filters: NotificationFilterDto = {}) {
    const {
      userId,
      type,
      isRead,
      entityType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const where: Prisma.NotificationWhereInput = {};

    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;
    if (entityType) where.entityType = entityType;

    const skip = (page - 1) * limit;
    const client = await this.prisma.getTenantClient();

    const [notifications, total] = await Promise.all([
      client.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
      }),
      client.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Notification> {
    const client = await this.prisma.getTenantClient();
    const notification = await client.notification.findUnique({
      where: { id },
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
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }  
async markAsRead(id: string): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.isRead) {
      return notification; // Already read
    }

    const client = await this.prisma.getTenantClient();
    const updatedNotification = await client.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
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
    });

    return updatedNotification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const client = await this.prisma.getTenantClient();
    const result = await client.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const client = await this.prisma.getTenantClient();
    return client.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async getUserNotifications(userId: string, limit = 20, includeRead = false) {
    const where: Prisma.NotificationWhereInput = { userId };
    
    if (!includeRead) {
      where.isRead = false;
    }

    const client = await this.prisma.getTenantClient();
    const notifications = await client.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Ensure it exists

    const client = await this.prisma.getTenantClient();
    await client.notification.delete({
      where: { id },
    });
  }

  async removeOldNotifications(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const client = await this.prisma.getTenantClient();
    const result = await client.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true, // Only delete read notifications
      },
    });

    return result.count;
  }

  // Notification type helpers
  async notifyOrderCreated(orderId: string, customerName: string, assignedToUserId?: string): Promise<void> {
    const notifications: CreateNotificationDto[] = [];

    // Notify assigned user if specified
    if (assignedToUserId) {
      notifications.push({
        userId: assignedToUserId,
        type: 'order_created',
        title: 'Nueva orden asignada',
        message: `Se te ha asignado una nueva orden para ${customerName}`,
        entityType: 'order',
        entityId: orderId,
        actionUrl: `/orders/${orderId}`,
      });
    }

    // Notify managers and admins
    const client = await this.prisma.getTenantClient();
    const managers = await client.user.findMany({
      where: {
        role: { in: ['admin', 'manager'] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const manager of managers) {
      if (manager.id !== assignedToUserId) { // Don't duplicate notification
        notifications.push({
          userId: manager.id,
          type: 'order_created',
          title: 'Nueva orden creada',
          message: `Nueva orden creada para ${customerName}`,
          entityType: 'order',
          entityId: orderId,
          actionUrl: `/orders/${orderId}`,
        });
      }
    }

    if (notifications.length > 0) {
      await this.createBulk(notifications);
    }
  }

  async notifyTaskAssigned(taskId: string, taskTitle: string, assignedToUserId: string): Promise<void> {
    await this.create({
      userId: assignedToUserId,
      type: 'task_assigned',
      title: 'Nueva tarea asignada',
      message: `Se te ha asignado la tarea: ${taskTitle}`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
    });
  }

  async notifyTaskCompleted(taskId: string, taskTitle: string, customerName: string): Promise<void> {
    // Notify managers and admins
    const client = await this.prisma.getTenantClient();
    const managers = await client.user.findMany({
      where: {
        role: { in: ['admin', 'manager'] },
        isActive: true,
      },
      select: { id: true },
    });

    const notifications: CreateNotificationDto[] = managers.map(manager => ({
      userId: manager.id,
      type: 'task_completed',
      title: 'Tarea completada',
      message: `Tarea "${taskTitle}" completada para ${customerName}`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
    }));

    if (notifications.length > 0) {
      await this.createBulk(notifications);
    }
  }

  async notifyPaymentReceived(orderId: string, amount: number, customerName: string): Promise<void> {
    // Notify accounting and admin users
    const client = await this.prisma.getTenantClient();
    const accountingUsers = await client.user.findMany({
      where: {
        role: { in: ['admin', 'accountant', 'manager'] },
        isActive: true,
      },
      select: { id: true },
    });

    const notifications: CreateNotificationDto[] = accountingUsers.map(user => ({
      userId: user.id,
      type: 'payment_received',
      title: 'Pago recibido',
      message: `Pago de $${amount.toLocaleString()} recibido de ${customerName}`,
      entityType: 'order',
      entityId: orderId,
      actionUrl: `/orders/${orderId}`,
    }));

    if (notifications.length > 0) {
      await this.createBulk(notifications);
    }
  }

  async notifyLowStock(productId: string, productName: string, currentStock: number): Promise<void> {
    // Notify inventory managers and admins
    const client = await this.prisma.getTenantClient();
    const inventoryUsers = await client.user.findMany({
      where: {
        role: { in: ['admin', 'manager'] },
        isActive: true,
      },
      select: { id: true },
    });

    const notifications: CreateNotificationDto[] = inventoryUsers.map(user => ({
      userId: user.id,
      type: 'low_stock',
      title: 'Stock bajo',
      message: `El producto "${productName}" tiene stock bajo (${currentStock} unidades)`,
      entityType: 'product',
      entityId: productId,
      actionUrl: `/products/${productId}`,
    }));

    if (notifications.length > 0) {
      await this.createBulk(notifications);
    }
  }
}