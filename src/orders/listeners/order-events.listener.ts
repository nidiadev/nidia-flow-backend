import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TasksService } from '../../tasks/tasks.service';
import { TaskType, TaskPriority } from '../../tasks/dto/create-task.dto';
import { OrderType } from '../dto/create-order.dto';

interface OrderCreatedEvent {
  orderId: string;
  orderType: OrderType;
  customerId: string;
  assignedTo?: string;
  scheduledDate?: Date;
  serviceLocation?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface OrderStatusChangedEvent {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  userId: string;
  reason?: string;
}

@Injectable()
export class OrderEventsListener {
  constructor(private readonly tasksService: TasksService) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    // Generar tareas automáticamente basadas en el tipo de orden
    const tasksToCreate = this.getTasksForOrderType(event.orderType);

    for (const taskTemplate of tasksToCreate) {
      const createTaskDto = {
        orderId: event.orderId,
        customerId: event.customerId,
        title: taskTemplate.title,
        description: taskTemplate.description,
        type: taskTemplate.type,
        priority: taskTemplate.priority,
        assignedTo: event.assignedTo,
        scheduledStart: event.scheduledDate?.toISOString(),
        estimatedDurationMinutes: taskTemplate.estimatedDurationMinutes,
        locationAddress: event.serviceLocation?.address,
        locationLatitude: event.serviceLocation?.latitude,
        locationLongitude: event.serviceLocation?.longitude,
        checklist: taskTemplate.checklist,
      };

      try {
        await this.tasksService.create(createTaskDto, 'system');
      } catch (error) {
        console.error(`Failed to create task for order ${event.orderId}:`, error);
      }
    }
  }

  @OnEvent('order.status.changed')
  async handleOrderStatusChanged(event: OrderStatusChangedEvent) {
    // Lógica adicional cuando cambia el estado de una orden
    if (event.newStatus === 'confirmed') {
      // Notificar al técnico asignado
      console.log(`Order ${event.orderId} confirmed, notifying assigned technician`);
    } else if (event.newStatus === 'cancelled') {
      // Cancelar tareas asociadas
      console.log(`Order ${event.orderId} cancelled, cancelling associated tasks`);
    }
  }

  private getTasksForOrderType(orderType: OrderType) {
    const taskTemplates: Array<{
      title: string;
      description: string;
      type: TaskType;
      priority: TaskPriority;
      estimatedDurationMinutes: number;
      checklist?: Array<{ item: string; sortOrder: number }>;
    }> = [];

    switch (orderType) {
      case OrderType.SERVICE:
        taskTemplates.push({
          title: 'Realizar servicio técnico',
          description: 'Ejecutar el servicio técnico solicitado por el cliente',
          type: TaskType.VISIT,
          priority: TaskPriority.MEDIUM,
          estimatedDurationMinutes: 120,
          checklist: [
            { item: 'Verificar herramientas necesarias', sortOrder: 0 },
            { item: 'Contactar al cliente antes de llegar', sortOrder: 1 },
            { item: 'Realizar diagnóstico inicial', sortOrder: 2 },
            { item: 'Ejecutar el servicio', sortOrder: 3 },
            { item: 'Probar funcionamiento', sortOrder: 4 },
            { item: 'Obtener firma del cliente', sortOrder: 5 },
          ],
        });
        break;

      case OrderType.DELIVERY:
        taskTemplates.push({
          title: 'Entrega de productos',
          description: 'Entregar productos al cliente en la dirección especificada',
          type: TaskType.DELIVERY,
          priority: TaskPriority.MEDIUM,
          estimatedDurationMinutes: 60,
          checklist: [
            { item: 'Verificar productos a entregar', sortOrder: 0 },
            { item: 'Contactar al cliente para confirmar disponibilidad', sortOrder: 1 },
            { item: 'Entregar productos', sortOrder: 2 },
            { item: 'Verificar estado de los productos', sortOrder: 3 },
            { item: 'Obtener firma de recibido', sortOrder: 4 },
          ],
        });
        break;

      case OrderType.INSTALLATION:
        taskTemplates.push(
          {
            title: 'Preparación para instalación',
            description: 'Preparar herramientas y materiales para la instalación',
            type: TaskType.VISIT,
            priority: TaskPriority.HIGH,
            estimatedDurationMinutes: 30,
            checklist: [
              { item: 'Verificar herramientas de instalación', sortOrder: 0 },
              { item: 'Confirmar materiales necesarios', sortOrder: 1 },
              { item: 'Revisar planos o especificaciones', sortOrder: 2 },
            ],
          },
          {
            title: 'Instalación del producto',
            description: 'Realizar la instalación completa del producto',
            type: TaskType.INSTALLATION,
            priority: TaskPriority.HIGH,
            estimatedDurationMinutes: 180,
            checklist: [
              { item: 'Preparar área de instalación', sortOrder: 0 },
              { item: 'Instalar producto según especificaciones', sortOrder: 1 },
              { item: 'Realizar pruebas de funcionamiento', sortOrder: 2 },
              { item: 'Capacitar al cliente en uso básico', sortOrder: 3 },
              { item: 'Obtener firma de conformidad', sortOrder: 4 },
            ],
          },
        );
        break;

      case OrderType.RENTAL:
        taskTemplates.push(
          {
            title: 'Entrega de equipo en renta',
            description: 'Entregar equipo al cliente y explicar condiciones de uso',
            type: TaskType.DELIVERY,
            priority: TaskPriority.MEDIUM,
            estimatedDurationMinutes: 90,
            checklist: [
              { item: 'Verificar estado del equipo', sortOrder: 0 },
              { item: 'Documentar condiciones iniciales', sortOrder: 1 },
              { item: 'Entregar equipo al cliente', sortOrder: 2 },
              { item: 'Explicar condiciones de uso y cuidado', sortOrder: 3 },
              { item: 'Firmar contrato de renta', sortOrder: 4 },
            ],
          },
        );
        break;

      default:
        // Tarea genérica para tipos no especificados
        taskTemplates.push({
          title: 'Atender orden de servicio',
          description: 'Atender la orden de servicio según los requerimientos del cliente',
          type: TaskType.VISIT,
          priority: TaskPriority.MEDIUM,
          estimatedDurationMinutes: 90,
          checklist: [
            { item: 'Contactar al cliente', sortOrder: 0 },
            { item: 'Atender requerimiento', sortOrder: 1 },
            { item: 'Obtener confirmación del cliente', sortOrder: 2 },
          ],
        });
    }

    return taskTemplates;
  }
}