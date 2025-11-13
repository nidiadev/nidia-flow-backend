import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../../tenant/services/tenant-prisma.service';
import { BusinessEventEmitterService } from './event-emitter.service';
import {
  BusinessEventTypes,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  TaskCompletedEvent,
  TaskAssignedEvent,
  InventoryUpdatedEvent,
  CustomerCreatedEvent,
  LeadConvertedEvent,
  PaymentReceivedEvent,
} from './business-events';

/**
 * Motor de automatización que maneja hooks y reglas de negocio automáticas
 * Implementa la lógica de automatización basada en eventos
 */
@Injectable()
export class AutomationEngineService implements OnModuleInit {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly eventEmitter: BusinessEventEmitterService,
    private readonly prisma: TenantPrismaService,
  ) {}

  onModuleInit() {
    this.registerAutomationHooks();
    this.logger.log('Automation engine initialized with all hooks registered');
  }

  /**
   * Registra todos los hooks de automatización
   */
  private registerAutomationHooks(): void {
    // Hook: Cuando se crea una orden → Generar tareas automáticamente
    this.eventEmitter.onEvent(
      BusinessEventTypes.ORDER_CREATED,
      this.handleOrderCreated.bind(this),
    );

    // Hook: Cuando cambia estado de orden → Actualizar tareas relacionadas
    this.eventEmitter.onEvent(
      BusinessEventTypes.ORDER_STATUS_CHANGED,
      this.handleOrderStatusChanged.bind(this),
    );

    // Hook: Cuando se completa una tarea → Verificar si orden está completa
    this.eventEmitter.onEvent(
      BusinessEventTypes.TASK_COMPLETED,
      this.handleTaskCompleted.bind(this),
    );

    // Hook: Cuando se asigna una tarea → Enviar notificación
    this.eventEmitter.onEvent(
      BusinessEventTypes.TASK_ASSIGNED,
      this.handleTaskAssigned.bind(this),
    );

    // Hook: Cuando se actualiza inventario → Verificar alertas de stock
    this.eventEmitter.onEvent(
      BusinessEventTypes.INVENTORY_UPDATED,
      this.handleInventoryUpdated.bind(this),
    );

    // Hook: Cuando se crea un cliente → Asignar lead scoring inicial
    this.eventEmitter.onEvent(
      BusinessEventTypes.CUSTOMER_CREATED,
      this.handleCustomerCreated.bind(this),
    );

    // Hook: Cuando se convierte un lead → Crear seguimiento automático
    this.eventEmitter.onEvent(
      BusinessEventTypes.LEAD_CONVERTED,
      this.handleLeadConverted.bind(this),
    );

    // Hook: Cuando se recibe un pago → Actualizar estado de orden
    this.eventEmitter.onEvent(
      BusinessEventTypes.PAYMENT_RECEIVED,
      this.handlePaymentReceived.bind(this),
    );

    this.logger.log('All automation hooks registered successfully');
  }

  /**
   * Hook: Generar tareas automáticamente cuando se crea una orden
   */
  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Processing order created automation: ${event.orderId}`);

      const client = await this.prisma.getTenantClient();

      // Obtener configuración de automatización para el tipo de orden
      const automationRules = await this.getOrderAutomationRules(event.orderType);

      if (!automationRules || automationRules.length === 0) {
        this.logger.debug(`No automation rules found for order type: ${event.orderType}`);
        return;
      }

      // Generar tareas según las reglas
      const tasksToCreate: any[] = [];

      for (const rule of automationRules) {
        const taskData = {
          orderId: event.orderId,
          customerId: event.customerId,
          title: this.interpolateTemplate(rule.taskTitle, event),
          description: this.interpolateTemplate(rule.taskDescription, event),
          type: rule.taskType,
          priority: rule.priority || 'medium',
          assignedTo: event.assignedTo || rule.defaultAssignee,
          scheduledStart: this.calculateScheduledStart(event.scheduledDate || new Date(), rule.offsetHours),
          estimatedDurationMinutes: rule.estimatedDuration,
          locationAddress: event.serviceLocation?.address,
          locationLatitude: event.serviceLocation?.latitude,
          locationLongitude: event.serviceLocation?.longitude,
          notes: `Auto-generated from order ${event.orderNumber}`,
          createdBy: event.createdBy,
        };

        tasksToCreate.push(taskData);
      }

      // Crear las tareas
      for (const taskData of tasksToCreate) {
        const task = await client.task.create({
          data: taskData,
        });

        // Emitir evento de tarea creada
        await this.eventEmitter.emit(BusinessEventTypes.TASK_CREATED, {
          taskId: task.id,
          orderId: event.orderId,
          customerId: event.customerId,
          title: task.title,
          type: task.type,
          priority: task.priority,
          assignedTo: task.assignedTo,
          scheduledStart: task.scheduledStart,
          location: event.serviceLocation,
          createdBy: event.createdBy,
          timestamp: new Date(),
        });

        this.logger.log(`Auto-generated task created: ${task.id} for order: ${event.orderId}`);
      }

      // Registrar auditoría
      await this.logAutomationAction('order_tasks_generated', {
        orderId: event.orderId,
        tasksCreated: tasksToCreate.length,
        rules: automationRules.map(r => r.id),
      });

    } catch (error) {
      this.logger.error(`Error in order created automation: ${error.message}`, {
        orderId: event.orderId,
        error: error.stack,
      });
    }
  }

  /**
   * Hook: Actualizar tareas cuando cambia el estado de una orden
   */
  private async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    try {
      this.logger.log(`Processing order status change automation: ${event.orderId}`);

      const client = await this.prisma.getTenantClient();

      // Obtener tareas relacionadas con la orden
      const tasks = await client.task.findMany({
        where: { orderId: event.orderId },
      });

      // Aplicar reglas según el nuevo estado
      switch (event.newStatus) {
        case 'confirmed':
          // Asignar tareas pendientes automáticamente
          await this.autoAssignPendingTasks(tasks, event.assignedTo);
          break;

        case 'cancelled':
          // Cancelar todas las tareas pendientes
          await this.cancelPendingTasks(tasks, event.userId);
          break;

        case 'completed':
          // Marcar tareas restantes como completadas si es apropiado
          await this.handleOrderCompletionTasks(tasks, event.userId);
          break;
      }

      // Emitir evento WebSocket para actualización en tiempo real
      await this.eventEmitter.emitWebSocketEvent(
        'tenant', // TODO: obtener tenantId del contexto
        'order_status_updated',
        {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          oldStatus: event.oldStatus,
          newStatus: event.newStatus,
          tasksAffected: tasks.length,
        },
      );

    } catch (error) {
      this.logger.error(`Error in order status change automation: ${error.message}`, {
        orderId: event.orderId,
        error: error.stack,
      });
    }
  }

  /**
   * Hook: Verificar si la orden está completa cuando se completa una tarea
   */
  private async handleTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    try {
      this.logger.log(`Processing task completion automation: ${event.taskId}`);

      if (!event.orderId) {
        return; // Tarea no está asociada a una orden
      }

      const client = await this.prisma.getTenantClient();

      // Verificar si todas las tareas de la orden están completas
      const orderTasks = await client.task.findMany({
        where: { orderId: event.orderId },
        select: { id: true, status: true },
      });

      const incompleteTasks = orderTasks.filter(
        task => task.status !== 'completed' && task.status !== 'cancelled'
      );

      if (incompleteTasks.length === 0) {
        // Todas las tareas están completas, actualizar orden
        const order = await client.order.update({
          where: { id: event.orderId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        // Emitir evento de orden completada
        await this.eventEmitter.emit(BusinessEventTypes.ORDER_STATUS_CHANGED, {
          orderId: event.orderId,
          orderNumber: order.orderNumber,
          oldStatus: order.status,
          newStatus: 'completed',
          customerId: order.customerId,
          assignedTo: order.assignedTo,
          userId: 'system',
          timestamp: new Date(),
        });

        this.logger.log(`Order auto-completed: ${event.orderId} (all tasks finished)`);
      }

      // Emitir evento WebSocket para actualización en tiempo real
      await this.eventEmitter.emitWebSocketEvent(
        'tenant', // TODO: obtener tenantId del contexto
        'task_completed',
        {
          taskId: event.taskId,
          orderId: event.orderId,
          remainingTasks: incompleteTasks.length,
          orderCompleted: incompleteTasks.length === 0,
        },
      );

    } catch (error) {
      this.logger.error(`Error in task completion automation: ${error.message}`, {
        taskId: event.taskId,
        error: error.stack,
      });
    }
  }

  /**
   * Hook: Enviar notificación cuando se asigna una tarea
   */
  private async handleTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    try {
      this.logger.log(`Processing task assignment automation: ${event.taskId}`);

      // Emitir evento para envío de notificación
      await this.eventEmitter.emit(BusinessEventTypes.MESSAGE_SENT, {
        messageId: `task-assigned-${event.taskId}-${Date.now()}`,
        customerId: event.customerId,
        channel: 'email',
        subject: 'Nueva tarea asignada',
        content: `Se te ha asignado una nueva tarea. ID: ${event.taskId}`,
        status: 'sent',
        sentBy: event.assignedBy,
        timestamp: new Date(),
      });

      // Emitir evento WebSocket para notificación en tiempo real
      await this.eventEmitter.emitWebSocketEvent(
        'tenant', // TODO: obtener tenantId del contexto
        'task_assigned',
        {
          taskId: event.taskId,
          assignedTo: event.assignedTo,
          message: 'Nueva tarea asignada',
        },
        { userId: event.assignedTo },
      );

    } catch (error) {
      this.logger.error(`Error in task assignment automation: ${error.message}`, {
        taskId: event.taskId,
        error: error.stack,
      });
    }
  }

  /**
   * Hook: Verificar alertas de stock bajo cuando se actualiza inventario
   */
  private async handleInventoryUpdated(event: InventoryUpdatedEvent): Promise<void> {
    try {
      this.logger.log(`Processing inventory update automation: ${event.productId}`);

      const client = await this.prisma.getTenantClient();

      // Obtener información del producto
      const product = await client.product.findUnique({
        where: { id: event.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          stockMin: true,
          trackInventory: true,
        },
      });

      if (!product || !product.trackInventory) {
        return;
      }

      // Verificar si el stock está por debajo del mínimo
      if (product.stockQuantity <= product.stockMin) {
        // Emitir alerta de stock bajo
        await this.eventEmitter.emit(BusinessEventTypes.STOCK_LOW_ALERT, {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: product.stockQuantity,
          minimumStock: product.stockMin,
          timestamp: new Date(),
        });

        this.logger.warn(`Low stock alert triggered for product: ${product.sku}`, {
          productId: product.id,
          currentStock: product.stockQuantity,
          minimumStock: product.stockMin,
        });
      }

      // Actualizar métricas de inventario
      await this.eventEmitter.emit(BusinessEventTypes.METRIC_UPDATED, {
        metricName: 'inventory_movement',
        metricType: 'counter',
        value: Math.abs(event.quantity),
        labels: {
          product_id: event.productId,
          movement_type: event.movementType,
          reference_type: event.referenceType,
        },
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Error in inventory update automation: ${error.message}`, {
        productId: event.productId,
        error: error.stack,
      });
    }
  }

  /**
   * Hook: Asignar lead scoring inicial cuando se crea un cliente
   */
  private async handleCustomerCreated(event: CustomerCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Processing customer creation automation: ${event.customerId}`);

      const client = await this.prisma.getTenantClient();

      // Calcular lead scoring inicial
      let initialScore = 0;

      // Scoring basado en fuente del lead
      const sourceScores = {
        website: 20,
        referral: 40,
        whatsapp: 30,
        cold_call: 10,
        social_media: 25,
      };

      if (event.leadSource && sourceScores[event.leadSource]) {
        initialScore += sourceScores[event.leadSource];
      }

      // Scoring basado en información disponible
      if (event.email) initialScore += 15;
      if (event.phone) initialScore += 10;
      if (event.companyName) initialScore += 20;

      // Actualizar el lead score
      await client.customer.update({
        where: { id: event.customerId },
        data: { leadScore: initialScore },
      });

      // Programar seguimiento automático si es un lead de alta calidad
      if (initialScore >= 50) {
        await this.scheduleFollowUpTask(event.customerId, event.assignedTo, 24); // 24 horas
      } else if (initialScore >= 30) {
        await this.scheduleFollowUpTask(event.customerId, event.assignedTo, 72); // 72 horas
      }

      this.logger.log(`Initial lead score assigned: ${initialScore} for customer: ${event.customerId}`);

    } catch (error) {
      this.logger.error(`Error in customer creation automation: ${error.message}`, {
        customerId: event.customerId,
        error: error.stack,
      });
    }
  }

  /**
   * Hook: Crear seguimiento automático cuando se convierte un lead
   */
  private async handleLeadConverted(event: LeadConvertedEvent): Promise<void> {
    try {
      this.logger.log(`Processing lead conversion automation: ${event.customerId}`);

      // Programar tareas de seguimiento post-conversión
      await this.scheduleFollowUpTask(event.customerId, event.assignedTo, 168); // 1 semana
      await this.scheduleFollowUpTask(event.customerId, event.assignedTo, 720); // 1 mes

      // Actualizar métricas de conversión
      await this.eventEmitter.emit(BusinessEventTypes.METRIC_UPDATED, {
        metricName: 'lead_conversion',
        metricType: 'counter',
        value: 1,
        labels: {
          lead_score: event.leadScore.toString(),
          assigned_to: event.assignedTo || 'unassigned',
        },
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Error in lead conversion automation: ${error.message}`, {
        customerId: event.customerId,
        error: error.stack,
      });
    }
  }

  /**
   * Hook: Actualizar estado de orden cuando se recibe un pago
   */
  private async handlePaymentReceived(event: PaymentReceivedEvent): Promise<void> {
    try {
      this.logger.log(`Processing payment received automation: ${event.paymentId}`);

      const client = await this.prisma.getTenantClient();

      // Obtener información de la orden y pagos
      const order = await client.order.findUnique({
        where: { id: event.orderId },
        include: { payments: true },
      });

      if (!order) {
        this.logger.warn(`Order not found for payment: ${event.orderId}`);
        return;
      }

      // Calcular total pagado
      const totalPaid = order.payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Verificar si la orden está completamente pagada
      if (totalPaid >= Number(order.total)) {
        await client.order.update({
          where: { id: event.orderId },
          data: {
            paymentStatus: 'paid',
          },
        });

        // Si la orden estaba pendiente de pago, cambiar a confirmada
        if (order.status === 'pending') {
          await client.order.update({
            where: { id: event.orderId },
            data: { status: 'confirmed' },
          });

          // Emitir evento de cambio de estado
          await this.eventEmitter.emit(BusinessEventTypes.ORDER_STATUS_CHANGED, {
            orderId: event.orderId,
            orderNumber: order.orderNumber,
            oldStatus: 'pending',
            newStatus: 'confirmed',
            customerId: event.customerId,
            assignedTo: order.assignedTo,
            userId: 'system',
            timestamp: new Date(),
          });
        }

        this.logger.log(`Order fully paid and confirmed: ${event.orderId}`);
      }

    } catch (error) {
      this.logger.error(`Error in payment received automation: ${error.message}`, {
        paymentId: event.paymentId,
        error: error.stack,
      });
    }
  }

  // Métodos auxiliares

  private async getOrderAutomationRules(orderType: string): Promise<any[]> {
    // TODO: Implementar obtención de reglas desde base de datos
    // Por ahora, reglas hardcodeadas
    const defaultRules = {
      'installation': [
        {
          id: 'install-1',
          taskTitle: 'Preparación de instalación - {orderNumber}',
          taskDescription: 'Preparar materiales y herramientas para instalación',
          taskType: 'preparation',
          priority: 'high',
          offsetHours: 0,
          estimatedDuration: 60,
        },
        {
          id: 'install-2',
          taskTitle: 'Instalación en sitio - {orderNumber}',
          taskDescription: 'Realizar instalación en {serviceAddress}',
          taskType: 'installation',
          priority: 'high',
          offsetHours: 2,
          estimatedDuration: 180,
        },
      ],
      'maintenance': [
        {
          id: 'maint-1',
          taskTitle: 'Mantenimiento programado - {orderNumber}',
          taskDescription: 'Realizar mantenimiento preventivo',
          taskType: 'maintenance',
          priority: 'medium',
          offsetHours: 0,
          estimatedDuration: 120,
        },
      ],
    };

    return defaultRules[orderType] || [];
  }

  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private calculateScheduledStart(baseDate: Date, offsetHours: number): Date {
    if (!baseDate) {
      baseDate = new Date();
    }
    return new Date(baseDate.getTime() + offsetHours * 60 * 60 * 1000);
  }

  private async autoAssignPendingTasks(tasks: any[], assignedTo?: string): Promise<void> {
    if (!assignedTo) return;

    const client = await this.prisma.getTenantClient();

    const pendingTasks = tasks.filter(task => task.status === 'pending');

    for (const task of pendingTasks) {
      await client.task.update({
        where: { id: task.id },
        data: {
          assignedTo,
          status: 'assigned',
          assignedAt: new Date(),
        },
      });

      await this.eventEmitter.emit(BusinessEventTypes.TASK_ASSIGNED, {
        taskId: task.id,
        orderId: task.orderId,
        customerId: task.customerId,
        assignedTo,
        assignedBy: 'system',
        timestamp: new Date(),
      });
    }
  }

  private async cancelPendingTasks(tasks: any[], userId: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const pendingTasks = tasks.filter(
      task => task.status === 'pending' || task.status === 'assigned'
    );

    for (const task of pendingTasks) {
      await client.task.update({
        where: { id: task.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      });

      await this.eventEmitter.emit(BusinessEventTypes.TASK_STATUS_CHANGED, {
        taskId: task.id,
        orderId: task.orderId,
        customerId: task.customerId,
        oldStatus: task.status,
        newStatus: 'cancelled',
        assignedTo: task.assignedTo,
        userId,
        timestamp: new Date(),
      });
    }
  }

  private async handleOrderCompletionTasks(tasks: any[], userId: string): Promise<void> {
    // Lógica para manejar tareas cuando se completa una orden
    // Por ejemplo, marcar tareas administrativas como completadas
  }

  private async scheduleFollowUpTask(
    customerId: string,
    assignedTo?: string,
    hoursFromNow: number = 24,
  ): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const scheduledStart = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

    const task = await client.task.create({
      data: {
        customerId,
        title: 'Seguimiento automático de cliente',
        description: 'Contactar cliente para seguimiento y evaluación de satisfacción',
        type: 'follow_up',
        priority: 'medium',
        assignedTo,
        scheduledStart,
        estimatedDurationMinutes: 30,
        notes: 'Tarea generada automáticamente por el sistema',
        createdBy: 'system',
      },
    });

    await this.eventEmitter.emit(BusinessEventTypes.TASK_CREATED, {
      taskId: task.id,
      customerId,
      title: task.title,
      type: task.type,
      priority: task.priority,
      assignedTo,
      scheduledStart,
      createdBy: 'system',
      timestamp: new Date(),
    });
  }

  private async logAutomationAction(action: string, data: any): Promise<void> {
    await this.eventEmitter.emit(BusinessEventTypes.AUDIT_LOG, {
      entityType: 'automation',
      entityId: `automation-${Date.now()}`,
      action,
      newValues: data,
      userId: 'system',
      timestamp: new Date(),
    });
  }
}