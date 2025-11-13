import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NotificationService } from '../../services/communications/notification.service';
import { WebSocketEventService } from '../../../common/events/websocket-event.service';
import {
  CreateNotificationDto,
  NotificationFilterDto,
} from '../../dto/communications/notification.dto';
import {
  OrderNotificationDto,
  TaskNotificationDto,
  TaskCompletionNotificationDto,
  PaymentNotificationDto,
  StockNotificationDto,
  BroadcastNotificationDto,
} from '../../dto/communications/notification-events.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly webSocketService: WebSocketEventService,
  ) {}

  @Post()
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @CurrentUser() user: any,
  ) {
    const notification = await this.notificationService.create(createNotificationDto);

    // Send real-time notification via WebSocket
    await this.webSocketService.broadcastNotification(user.tenantId, {
      title: notification.title,
      message: notification.message || '',
      type: 'info',
      userId: notification.userId,
      actionUrl: notification.actionUrl || undefined,
    });

    return notification;
  }

  @Post('bulk')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Create multiple notifications' })
  @ApiResponse({
    status: 201,
    description: 'Bulk notifications created successfully',
  })
  async createBulk(
    @Body() notifications: CreateNotificationDto[],
    @CurrentUser() user: any,
  ) {
    const count = await this.notificationService.createBulk(notifications);

    // Send real-time notifications via WebSocket for each user
    for (const notification of notifications) {
      await this.webSocketService.broadcastNotification(user.tenantId, {
        title: notification.title,
        message: notification.message || '',
        type: 'info',
        userId: notification.userId,
        actionUrl: notification.actionUrl || undefined,
      });
    }

    return {
      created: count,
      total: notifications.length,
    };
  }

  @Get()
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Get notifications with filters' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by notification type',
  })
  @ApiQuery({
    name: 'isRead',
    required: false,
    type: Boolean,
    description: 'Filter by read status',
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    description: 'Filter by entity type',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications with pagination',
  })
  async findAll(@Query() filters: NotificationFilterDto) {
    return this.notificationService.findAll(filters);
  }

  @Get('my-notifications')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of notifications to return',
  })
  @ApiQuery({
    name: 'includeRead',
    required: false,
    type: Boolean,
    description: 'Include read notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'User notifications',
  })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('includeRead') includeRead?: boolean,
  ) {
    return this.notificationService.getUserNotifications(
      user.userId,
      limit,
      includeRead,
    );
  }

  @Get('unread-count')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Get unread notifications count for current user' })
  @ApiResponse({
    status: 200,
    description: 'Unread notifications count',
  })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationService.getUnreadCount(user.userId);
    return { unreadCount: count };
  }

  @Get(':id')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification details',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('mark-all-read')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@CurrentUser() user: any) {
    const count = await this.notificationService.markAllAsRead(user.userId);
    return { markedAsRead: count };
  }

  @Delete(':id')
  @RequirePermissions('notifications:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async remove(@Param('id') id: string) {
    await this.notificationService.remove(id);
  }

  @Delete('cleanup')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Clean up old read notifications' })
  @ApiQuery({
    name: 'daysOld',
    required: false,
    type: Number,
    description: 'Delete notifications older than X days (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Old notifications cleaned up',
  })
  async cleanupOldNotifications(@Query('daysOld') daysOld?: number) {
    const deletedCount = await this.notificationService.removeOldNotifications(
      daysOld || 30,
    );
    return { deletedCount };
  }

  // Notification type-specific endpoints
  @Post('order-created')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Send order created notification' })
  @ApiResponse({
    status: 201,
    description: 'Order notification sent',
  })
  async notifyOrderCreated(@Body() orderNotificationDto: OrderNotificationDto) {
    await this.notificationService.notifyOrderCreated(
      orderNotificationDto.orderId,
      orderNotificationDto.customerName,
      orderNotificationDto.assignedToUserId,
    );

    return { status: 'sent' };
  }

  @Post('task-assigned')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Send task assigned notification' })
  @ApiResponse({
    status: 201,
    description: 'Task assignment notification sent',
  })
  async notifyTaskAssigned(@Body() taskNotificationDto: TaskNotificationDto) {
    await this.notificationService.notifyTaskAssigned(
      taskNotificationDto.taskId,
      taskNotificationDto.taskTitle,
      taskNotificationDto.assignedToUserId,
    );

    return { status: 'sent' };
  }

  @Post('task-completed')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Send task completed notification' })
  @ApiResponse({
    status: 201,
    description: 'Task completion notification sent',
  })
  async notifyTaskCompleted(@Body() taskCompletionDto: TaskCompletionNotificationDto) {
    await this.notificationService.notifyTaskCompleted(
      taskCompletionDto.taskId,
      taskCompletionDto.taskTitle,
      taskCompletionDto.customerName,
    );

    return { status: 'sent' };
  }

  @Post('payment-received')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Send payment received notification' })
  @ApiResponse({
    status: 201,
    description: 'Payment notification sent',
  })
  async notifyPaymentReceived(@Body() paymentNotificationDto: PaymentNotificationDto) {
    await this.notificationService.notifyPaymentReceived(
      paymentNotificationDto.orderId,
      paymentNotificationDto.amount,
      paymentNotificationDto.customerName,
    );

    return { status: 'sent' };
  }

  @Post('low-stock')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Send low stock notification' })
  @ApiResponse({
    status: 201,
    description: 'Low stock notification sent',
  })
  async notifyLowStock(@Body() stockNotificationDto: StockNotificationDto) {
    await this.notificationService.notifyLowStock(
      stockNotificationDto.productId,
      stockNotificationDto.productName,
      stockNotificationDto.currentStock,
    );

    return { status: 'sent' };
  }

  @Post('broadcast')
  @RequirePermissions('notifications:write')
  @ApiOperation({ summary: 'Broadcast notification to all users' })
  @ApiResponse({
    status: 201,
    description: 'Broadcast notification sent',
  })
  async broadcastNotification(
    @Body() broadcastDto: BroadcastNotificationDto,
    @CurrentUser() user: any,
  ) {
    // Get all active users in the tenant
    const client = await this.notificationService['prisma'].getTenantClient();
    const users = await client.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Create notifications for all users
    const notifications: CreateNotificationDto[] = users.map((u) => ({
      userId: u.id,
      type: 'broadcast',
      title: broadcastDto.title,
      message: broadcastDto.message,
      actionUrl: broadcastDto.actionUrl,
    }));

    const count = await this.notificationService.createBulk(notifications);

    // Send real-time broadcast
    await this.webSocketService.broadcastNotification(user.tenantId, {
      title: broadcastDto.title,
      message: broadcastDto.message,
      type: broadcastDto.type,
      actionUrl: broadcastDto.actionUrl,
    });

    return {
      status: 'sent',
      recipientCount: count,
    };
  }
}