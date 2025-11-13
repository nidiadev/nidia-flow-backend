import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../../tenant/services/tenant-prisma.service';
import { BusinessEventTypes, MetricUpdatedEvent } from './business-events';

/**
 * Servicio para manejo de métricas y KPIs en tiempo real
 * Escucha eventos de negocio y actualiza métricas automáticamente
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metricsCache = new Map<string, number>();

  constructor(private readonly prisma: TenantPrismaService) {}

  /**
   * Listener principal para eventos de métricas
   */
  @OnEvent(BusinessEventTypes.METRIC_UPDATED)
  async handleMetricUpdated(event: MetricUpdatedEvent) {
    try {
      const metricKey = this.buildMetricKey(event.metricName, event.labels);

      switch (event.metricType) {
        case 'counter':
          await this.incrementCounter(metricKey, event.value);
          break;
        case 'gauge':
          await this.setGauge(metricKey, event.value);
          break;
        case 'histogram':
          await this.recordHistogram(metricKey, event.value);
          break;
      }

      this.logger.debug(`Metric updated: ${event.metricName} = ${event.value}`);

    } catch (error) {
      this.logger.error(`Failed to update metric: ${error.message}`, {
        event,
        error: error.stack,
      });
    }
  }

  /**
   * Listeners automáticos para eventos de negocio que generan métricas
   */

  @OnEvent(BusinessEventTypes.ORDER_CREATED)
  async trackOrderCreated(event: any) {
    await this.incrementMetric('orders_created_total', 1, {
      order_type: event.orderType,
      assigned_to: event.assignedTo || 'unassigned',
    });

    await this.recordMetric('order_value', event.total, {
      order_type: event.orderType,
    });
  }

  @OnEvent(BusinessEventTypes.ORDER_STATUS_CHANGED)
  async trackOrderStatusChanged(event: any) {
    await this.incrementMetric('order_status_changes_total', 1, {
      old_status: event.oldStatus,
      new_status: event.newStatus,
    });

    if (event.newStatus === 'completed') {
      await this.incrementMetric('orders_completed_total', 1);
    } else if (event.newStatus === 'cancelled') {
      await this.incrementMetric('orders_cancelled_total', 1);
    }
  }

  @OnEvent(BusinessEventTypes.TASK_CREATED)
  async trackTaskCreated(event: any) {
    await this.incrementMetric('tasks_created_total', 1, {
      task_type: event.type,
      priority: event.priority,
      assigned_to: event.assignedTo || 'unassigned',
    });
  }

  @OnEvent(BusinessEventTypes.TASK_COMPLETED)
  async trackTaskCompleted(event: any) {
    await this.incrementMetric('tasks_completed_total', 1, {
      task_type: event.type,
    });

    if (event.actualDuration) {
      await this.recordMetric('task_duration_minutes', event.actualDuration, {
        task_type: event.type,
      });
    }
  }

  @OnEvent(BusinessEventTypes.CUSTOMER_CREATED)
  async trackCustomerCreated(event: any) {
    await this.incrementMetric('customers_created_total', 1, {
      customer_type: event.customerType,
      lead_source: event.leadSource || 'unknown',
    });
  }

  @OnEvent(BusinessEventTypes.LEAD_CONVERTED)
  async trackLeadConverted(event: any) {
    await this.incrementMetric('leads_converted_total', 1, {
      lead_score_range: this.getLeadScoreRange(event.leadScore),
    });
  }

  @OnEvent(BusinessEventTypes.PAYMENT_RECEIVED)
  async trackPaymentReceived(event: any) {
    await this.incrementMetric('payments_received_total', 1, {
      payment_method: event.paymentMethod,
      currency: event.currency,
    });

    await this.recordMetric('payment_amount', event.amount, {
      payment_method: event.paymentMethod,
      currency: event.currency,
    });
  }

  @OnEvent(BusinessEventTypes.MESSAGE_SENT)
  async trackMessageSent(event: any) {
    await this.incrementMetric('messages_sent_total', 1, {
      channel: event.channel,
      status: event.status,
    });
  }

  @OnEvent(BusinessEventTypes.USER_LOGIN)
  async trackUserLogin(event: any) {
    await this.incrementMetric('user_logins_total', 1);
    await this.setMetric('last_login_timestamp', Date.now(), {
      user_id: event.userId,
    });
  }

  /**
   * Métodos públicos para métricas
   */

  async incrementMetric(name: string, value: number = 1, labels?: Record<string, string>) {
    const metricKey = this.buildMetricKey(name, labels);
    const currentValue = this.metricsCache.get(metricKey) || 0;
    const newValue = currentValue + value;
    
    this.metricsCache.set(metricKey, newValue);
    
    await this.persistMetric(name, 'counter', newValue, labels);
  }

  async setMetric(name: string, value: number, labels?: Record<string, string>) {
    const metricKey = this.buildMetricKey(name, labels);
    this.metricsCache.set(metricKey, value);
    
    await this.persistMetric(name, 'gauge', value, labels);
  }

  async recordMetric(name: string, value: number, labels?: Record<string, string>) {
    await this.persistMetric(name, 'histogram', value, labels);
  }

  /**
   * Obtener métricas del dashboard
   */
  async getDashboardMetrics(period: 'today' | 'week' | 'month' = 'today') {
    const client = await this.prisma.getTenantClient();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Obtener métricas básicas
    const [
      ordersCount,
      tasksCount,
      customersCount,
      completedTasksCount,
      totalRevenue,
    ] = await Promise.all([
      client.order.count({
        where: { createdAt: { gte: startDate } },
      }),
      client.task.count({
        where: { createdAt: { gte: startDate } },
      }),
      client.customer.count({
        where: { createdAt: { gte: startDate } },
      }),
      client.task.count({
        where: {
          status: 'completed',
          completedAt: { gte: startDate },
        },
      }),
      client.order.aggregate({
        where: {
          status: 'completed',
          completedAt: { gte: startDate },
        },
        _sum: { total: true },
      }),
    ]);

    // Calcular métricas derivadas
    const taskCompletionRate = tasksCount > 0 ? (completedTasksCount / tasksCount) * 100 : 0;
    const averageOrderValue = ordersCount > 0 ? Number(totalRevenue._sum.total || 0) / ordersCount : 0;

    return {
      period,
      startDate,
      endDate: now,
      metrics: {
        orders: {
          total: ordersCount,
          completed: await client.order.count({
            where: {
              status: 'completed',
              completedAt: { gte: startDate },
            },
          }),
          pending: await client.order.count({
            where: {
              status: { in: ['pending', 'confirmed'] },
              createdAt: { gte: startDate },
            },
          }),
        },
        tasks: {
          total: tasksCount,
          completed: completedTasksCount,
          inProgress: await client.task.count({
            where: {
              status: 'in_progress',
              createdAt: { gte: startDate },
            },
          }),
          completionRate: Math.round(taskCompletionRate * 100) / 100,
        },
        customers: {
          total: customersCount,
          leads: await client.customer.count({
            where: {
              type: 'lead',
              createdAt: { gte: startDate },
            },
          }),
          active: await client.customer.count({
            where: {
              type: 'active',
              createdAt: { gte: startDate },
            },
          }),
        },
        revenue: {
          total: totalRevenue._sum.total || 0,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          ordersCount,
        },
      },
    };
  }

  /**
   * Obtener métricas de performance
   */
  async getPerformanceMetrics() {
    const client = await this.prisma.getTenantClient();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      avgTaskDuration,
      avgOrderProcessingTime,
      tasksByStatus,
      ordersByStatus,
    ] = await Promise.all([
      client.task.aggregate({
        where: {
          status: 'completed',
          completedAt: { gte: last24h },
          actualDurationMinutes: { not: null },
        },
        _avg: { actualDurationMinutes: true },
      }),
      client.order.aggregate({
        where: {
          status: 'completed',
          completedAt: { gte: last24h },
        },
        _avg: {
          // Calcular tiempo desde creación hasta completado
          // TODO: Implementar campo calculado o usar raw query
        },
      }),
      client.task.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: { gte: last24h } },
      }),
      client.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: { gte: last24h } },
      }),
    ]);

    return {
      period: 'last_24h',
      averageTaskDuration: avgTaskDuration._avg.actualDurationMinutes || 0,
      tasksByStatus: tasksByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
    };
  }

  /**
   * Métodos auxiliares
   */

  private buildMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `${name}{${labelString}}`;
  }

  private async persistMetric(
    name: string,
    type: 'counter' | 'gauge' | 'histogram',
    value: number,
    labels?: Record<string, string>,
  ) {
    try {
      const client = await this.prisma.getTenantClient();

      // TODO: Implementar tabla de métricas si es necesario
      // Por ahora solo loggeamos
      this.logger.debug(`Metric persisted: ${name} (${type}) = ${value}`, {
        labels,
      });

    } catch (error) {
      this.logger.error(`Failed to persist metric: ${error.message}`, {
        name,
        type,
        value,
        labels,
      });
    }
  }

  private async incrementCounter(key: string, value: number) {
    const currentValue = this.metricsCache.get(key) || 0;
    this.metricsCache.set(key, currentValue + value);
  }

  private async setGauge(key: string, value: number) {
    this.metricsCache.set(key, value);
  }

  private async recordHistogram(key: string, value: number) {
    // Para histogramas, podríamos mantener un array de valores
    // Por simplicidad, solo guardamos el último valor
    this.metricsCache.set(key, value);
  }

  private getLeadScoreRange(score: number): string {
    if (score >= 80) return '80-100';
    if (score >= 60) return '60-79';
    if (score >= 40) return '40-59';
    if (score >= 20) return '20-39';
    return '0-19';
  }
}