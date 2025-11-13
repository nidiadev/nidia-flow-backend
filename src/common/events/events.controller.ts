import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BusinessEventEmitterService } from './event-emitter.service';
import { WebSocketEventService } from './websocket-event.service';
import { AuditLoggerService } from './audit-logger.service';
import { MetricsService } from './metrics.service';
import { BusinessEventTypes } from './business-events';

@ApiTags('Events & Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventEmitter: BusinessEventEmitterService,
    private readonly webSocketService: WebSocketEventService,
    private readonly auditLogger: AuditLoggerService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get event system statistics' })
  @ApiResponse({ status: 200, description: 'Event system statistics' })
  getEventStats() {
    return {
      eventEmitter: this.eventEmitter.getEventStats(),
      webSocket: this.webSocketService.getConnectionStats(),
    };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogger.getAuditLogs({
      entityType,
      entityId,
      action,
      userId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page.toString()) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });
  }

  @Get('metrics/dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics(
    @Query('period') period: 'today' | 'week' | 'month' = 'today',
  ) {
    return this.metricsService.getDashboardMetrics(period);
  }

  @Get('metrics/performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    return this.metricsService.getPerformanceMetrics();
  }

  @Post('test/notification')
  @ApiOperation({ summary: 'Send test notification (development only)' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTestNotification(
    @Body() body: {
      tenantId: string;
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
      userId?: string;
    },
  ) {
    await this.webSocketService.broadcastNotification(body.tenantId, {
      title: body.title,
      message: body.message,
      type: body.type,
      userId: body.userId,
    });

    return { success: true, message: 'Test notification sent' };
  }

  @Post('test/event')
  @ApiOperation({ summary: 'Emit test event (development only)' })
  @ApiResponse({ status: 200, description: 'Test event emitted' })
  async emitTestEvent(
    @Body() body: {
      eventType: string;
      payload: any;
    },
  ) {
    // Solo permitir eventos de test en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return { success: false, message: 'Test events not allowed in production' };
    }

    const result = await this.eventEmitter.emit(body.eventType as any, body.payload);

    return { 
      success: true, 
      message: 'Test event emitted',
      hasListeners: result,
    };
  }

  @Post('test/metric')
  @ApiOperation({ summary: 'Record test metric (development only)' })
  @ApiResponse({ status: 200, description: 'Test metric recorded' })
  async recordTestMetric(
    @Body() body: {
      name: string;
      value: number;
      labels?: Record<string, string>;
    },
  ) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, message: 'Test metrics not allowed in production' };
    }

    await this.metricsService.recordMetric(body.name, body.value, body.labels);

    return { 
      success: true, 
      message: 'Test metric recorded',
    };
  }

  @Get('available-events')
  @ApiOperation({ summary: 'Get list of available business events' })
  @ApiResponse({ status: 200, description: 'Available business events' })
  getAvailableEvents() {
    return {
      events: Object.entries(BusinessEventTypes).map(([key, value]) => ({
        key,
        type: value,
        description: this.getEventDescription(value),
      })),
    };
  }

  private getEventDescription(eventType: string): string {
    const descriptions: Record<string, string> = {
      'order.created': 'Triggered when a new order is created',
      'order.status.changed': 'Triggered when an order status changes',
      'order.assigned': 'Triggered when an order is assigned to a user',
      'task.created': 'Triggered when a new task is created',
      'task.assigned': 'Triggered when a task is assigned to a user',
      'task.status.changed': 'Triggered when a task status changes',
      'task.checked.in': 'Triggered when a user checks in to a task',
      'task.completed': 'Triggered when a task is completed',
      'inventory.updated': 'Triggered when inventory levels change',
      'stock.low.alert': 'Triggered when stock falls below minimum level',
      'customer.created': 'Triggered when a new customer is created',
      'customer.status.changed': 'Triggered when customer status changes',
      'lead.converted': 'Triggered when a lead is converted to customer',
      'message.sent': 'Triggered when a message is sent to customer',
      'message.received': 'Triggered when a message is received from customer',
      'payment.received': 'Triggered when a payment is received',
      'payment.failed': 'Triggered when a payment fails',
      'user.login': 'Triggered when a user logs in',
      'system.error': 'Triggered when a system error occurs',
      'audit.log': 'Triggered to create audit log entries',
      'metric.updated': 'Triggered when metrics are updated',
      'websocket.broadcast': 'Triggered to broadcast WebSocket events',
    };

    return descriptions[eventType] || 'No description available';
  }
}