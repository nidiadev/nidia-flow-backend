import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WebSocketEvent, BusinessEventTypes } from './business-events';

/**
 * Servicio para manejar eventos WebSocket y broadcasting en tiempo real
 * Integra con el sistema de eventos para propagar cambios a los clientes conectados
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/events',
})
export class WebSocketEventService {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketEventService.name);
  private connectedClients = new Map<string, { socket: Socket; userId: string; tenantId: string }>();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Maneja nuevas conexiones WebSocket
   */
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Extraer token de autenticación
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`WebSocket connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verificar token JWT
      const payload = await this.jwtService.verifyAsync(token);
      const { userId, tenantId } = payload;

      if (!userId || !tenantId) {
        this.logger.warn(`WebSocket connection rejected: Invalid token payload`);
        client.disconnect();
        return;
      }

      // Registrar cliente conectado
      this.connectedClients.set(client.id, {
        socket: client,
        userId,
        tenantId,
      });

      // Unir a room del tenant
      await client.join(`tenant:${tenantId}`);
      await client.join(`user:${userId}`);

      this.logger.log(`WebSocket client connected: ${client.id} (User: ${userId}, Tenant: ${tenantId})`);

      // Enviar confirmación de conexión
      client.emit('connected', {
        message: 'Successfully connected to NIDIA Flow events',
        userId,
        tenantId,
        timestamp: new Date(),
      });

      // Emitir evento de usuario online
      this.server.to(`tenant:${tenantId}`).emit('user_status', {
        userId,
        status: 'online',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`WebSocket connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Maneja desconexiones WebSocket
   */
  handleDisconnect(@ConnectedSocket() client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);

    if (clientInfo) {
      const { userId, tenantId } = clientInfo;

      // Emitir evento de usuario offline
      this.server.to(`tenant:${tenantId}`).emit('user_status', {
        userId,
        status: 'offline',
        timestamp: new Date(),
      });

      this.connectedClients.delete(client.id);
      this.logger.log(`WebSocket client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  /**
   * Listener para eventos de broadcasting WebSocket
   */
  @OnEvent(BusinessEventTypes.WEBSOCKET_BROADCAST)
  async handleWebSocketBroadcast(event: WebSocketEvent & { excludeUser?: string }) {
    try {
      const { type, payload, tenantId, userId, room, excludeUser } = event;

      let targetRoom = room;

      // Determinar room objetivo
      if (!targetRoom) {
        if (userId) {
          targetRoom = `user:${userId}`;
        } else {
          targetRoom = `tenant:${tenantId}`;
        }
      }

      this.logger.debug(`Broadcasting WebSocket event: ${type} to room: ${targetRoom}`);

      // Preparar datos del evento
      const eventData = {
        type,
        payload,
        timestamp: event.timestamp || new Date(),
      };

      // Broadcast a la room
      if (excludeUser) {
        // Excluir usuario específico del broadcast
        const clients = await this.server.in(targetRoom).fetchSockets();
        for (const client of clients) {
          const clientInfo = this.connectedClients.get(client.id);
          if (clientInfo && clientInfo.userId !== excludeUser) {
            client.emit('business_event', eventData);
          }
        }
      } else {
        this.server.to(targetRoom).emit('business_event', eventData);
      }

      this.logger.debug(`WebSocket event broadcasted successfully: ${type}`);

    } catch (error) {
      this.logger.error(`Error broadcasting WebSocket event: ${error.message}`, {
        event,
        error: error.stack,
      });
    }
  }

  /**
   * Listener para eventos de órdenes
   */
  @OnEvent(BusinessEventTypes.ORDER_CREATED)
  async handleOrderCreated(event: any) {
    await this.broadcastToTenant(event.tenantId || 'default', 'order_created', {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      customerId: event.customerId,
      assignedTo: event.assignedTo,
      total: event.total,
    });
  }

  @OnEvent(BusinessEventTypes.ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged(event: any) {
    await this.broadcastToTenant(event.tenantId || 'default', 'order_status_changed', {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      oldStatus: event.oldStatus,
      newStatus: event.newStatus,
      customerId: event.customerId,
    });
  }

  /**
   * Listener para eventos de tareas
   */
  @OnEvent(BusinessEventTypes.TASK_ASSIGNED)
  async handleTaskAssigned(event: any) {
    // Notificar al usuario asignado
    if (event.assignedTo) {
      await this.broadcastToUser(event.assignedTo, 'task_assigned', {
        taskId: event.taskId,
        orderId: event.orderId,
        customerId: event.customerId,
        title: event.title,
        priority: event.priority,
      });
    }

    // Notificar al tenant
    await this.broadcastToTenant(event.tenantId || 'default', 'task_assigned', {
      taskId: event.taskId,
      assignedTo: event.assignedTo,
      assignedBy: event.assignedBy,
    });
  }

  @OnEvent(BusinessEventTypes.TASK_STATUS_CHANGED)
  async handleTaskStatusChanged(event: any) {
    await this.broadcastToTenant(event.tenantId || 'default', 'task_status_changed', {
      taskId: event.taskId,
      orderId: event.orderId,
      oldStatus: event.oldStatus,
      newStatus: event.newStatus,
      assignedTo: event.assignedTo,
    });
  }

  @OnEvent(BusinessEventTypes.TASK_CHECKED_IN)
  async handleTaskCheckedIn(event: any) {
    await this.broadcastToTenant(event.tenantId || 'default', 'task_location_update', {
      taskId: event.taskId,
      assignedTo: event.assignedTo,
      location: event.location,
      status: 'checked_in',
    });
  }

  @OnEvent(BusinessEventTypes.TASK_COMPLETED)
  async handleTaskCompleted(event: any) {
    await this.broadcastToTenant(event.tenantId || 'default', 'task_completed', {
      taskId: event.taskId,
      orderId: event.orderId,
      assignedTo: event.assignedTo,
      actualDuration: event.actualDuration,
      location: event.location,
    });
  }

  /**
   * Listener para alertas de inventario
   */
  @OnEvent(BusinessEventTypes.STOCK_LOW_ALERT)
  async handleStockLowAlert(event: any) {
    await this.broadcastToTenant(event.tenantId || 'default', 'stock_alert', {
      productId: event.productId,
      productName: event.productName,
      sku: event.sku,
      currentStock: event.currentStock,
      minimumStock: event.minimumStock,
      severity: 'warning',
    });
  }

  /**
   * Métodos auxiliares para broadcasting
   */
  private async broadcastToTenant(tenantId: string, eventType: string, payload: any) {
    const room = `tenant:${tenantId}`;
    const eventData = {
      type: eventType,
      payload,
      timestamp: new Date(),
    };

    this.server.to(room).emit('business_event', eventData);
    this.logger.debug(`Broadcasted to tenant ${tenantId}: ${eventType}`);
  }

  private async broadcastToUser(userId: string, eventType: string, payload: any) {
    const room = `user:${userId}`;
    const eventData = {
      type: eventType,
      payload,
      timestamp: new Date(),
    };

    this.server.to(room).emit('business_event', eventData);
    this.logger.debug(`Broadcasted to user ${userId}: ${eventType}`);
  }

  /**
   * Métodos públicos para broadcasting manual
   */
  async broadcastNotification(
    tenantId: string,
    notification: {
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
      userId?: string;
      actionUrl?: string;
    },
  ) {
    const targetRoom = notification.userId ? `user:${notification.userId}` : `tenant:${tenantId}`;

    this.server.to(targetRoom).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });

    this.logger.log(`Notification sent to ${targetRoom}: ${notification.title}`);
  }

  async broadcastSystemMessage(tenantId: string, message: string, type: 'maintenance' | 'update' | 'alert' = 'update') {
    this.server.to(`tenant:${tenantId}`).emit('system_message', {
      message,
      type,
      timestamp: new Date(),
    });

    this.logger.log(`System message sent to tenant ${tenantId}: ${message}`);
  }

  /**
   * Obtener estadísticas de conexiones
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      connectionsByTenant: new Map<string, number>(),
      connectionsByUser: new Map<string, number>(),
    };

    for (const [clientId, clientInfo] of this.connectedClients) {
      const { tenantId, userId } = clientInfo;

      // Contar por tenant
      const tenantCount = stats.connectionsByTenant.get(tenantId) || 0;
      stats.connectionsByTenant.set(tenantId, tenantCount + 1);

      // Contar por usuario
      const userCount = stats.connectionsByUser.get(userId) || 0;
      stats.connectionsByUser.set(userId, userCount + 1);
    }

    return {
      ...stats,
      connectionsByTenant: Object.fromEntries(stats.connectionsByTenant),
      connectionsByUser: Object.fromEntries(stats.connectionsByUser),
    };
  }
}