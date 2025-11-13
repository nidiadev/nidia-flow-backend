import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessEventType, WebSocketEvent } from './business-events';

/**
 * Servicio centralizado para emisión de eventos de negocio
 * Proporciona una interfaz consistente y logging automático
 */
@Injectable()
export class BusinessEventEmitterService {
  private readonly logger = new Logger(BusinessEventEmitterService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emite un evento de negocio con logging automático
   */
  async emit<T = any>(eventType: BusinessEventType, payload: T): Promise<boolean> {
    try {
      // Agregar timestamp si no existe
      const eventPayload = {
        ...payload,
        timestamp: (payload as any)?.timestamp || new Date(),
      };

      this.logger.debug(`Emitting event: ${eventType}`, {
        eventType,
        payload: eventPayload,
      });

      const result = this.eventEmitter.emit(eventType, eventPayload);

      this.logger.log(`Event emitted successfully: ${eventType}`, {
        eventType,
        hasListeners: result,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to emit event: ${eventType}`, {
        eventType,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Emite múltiples eventos en secuencia
   */
  async emitMany(events: Array<{ type: BusinessEventType; payload: any }>): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const event of events) {
      try {
        const result = await this.emit(event.type, event.payload);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to emit event in batch: ${event.type}`, error);
        results.push(false);
      }
    }

    return results;
  }

  /**
   * Emite evento con delay
   */
  async emitDelayed<T = any>(
    eventType: BusinessEventType,
    payload: T,
    delayMs: number,
  ): Promise<void> {
    setTimeout(() => {
      this.emit(eventType, payload);
    }, delayMs);
  }

  /**
   * Emite evento condicional
   */
  async emitIf<T = any>(
    condition: boolean | (() => boolean),
    eventType: BusinessEventType,
    payload: T,
  ): Promise<boolean> {
    const shouldEmit = typeof condition === 'function' ? condition() : condition;

    if (shouldEmit) {
      return this.emit(eventType, payload);
    }

    this.logger.debug(`Event not emitted due to condition: ${eventType}`);
    return false;
  }

  /**
   * Emite evento para WebSocket broadcasting
   */
  async emitWebSocketEvent(
    tenantId: string,
    eventType: string,
    payload: any,
    options?: {
      userId?: string;
      room?: string;
      excludeUser?: string;
    },
  ): Promise<boolean> {
    const webSocketEvent: WebSocketEvent = {
      type: eventType,
      payload,
      tenantId,
      userId: options?.userId,
      room: options?.room,
      timestamp: new Date(),
    };

    return this.emit('websocket.broadcast', {
      ...webSocketEvent,
      excludeUser: options?.excludeUser,
    });
  }

  /**
   * Obtiene estadísticas de eventos
   */
  getEventStats(): {
    listenerCount: number;
    eventNames: string[];
  } {
    return {
      listenerCount: this.eventEmitter.listenerCount(),
      eventNames: this.eventEmitter.eventNames() as string[],
    };
  }

  /**
   * Registra un listener con logging automático
   */
  onEvent<T = any>(
    eventType: BusinessEventType,
    listener: (payload: T) => void | Promise<void>,
    options?: {
      once?: boolean;
      priority?: number;
    },
  ): void {
    const wrappedListener = async (payload: T) => {
      const startTime = Date.now();
      
      try {
        this.logger.debug(`Processing event: ${eventType}`, {
          eventType,
          payload,
        });

        await listener(payload);

        const duration = Date.now() - startTime;
        this.logger.debug(`Event processed successfully: ${eventType}`, {
          eventType,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(`Error processing event: ${eventType}`, {
          eventType,
          error: error.message,
          stack: error.stack,
          duration,
        });
        throw error;
      }
    };

    if (options?.once) {
      this.eventEmitter.once(eventType, wrappedListener);
    } else {
      this.eventEmitter.on(eventType, wrappedListener);
    }

    this.logger.log(`Event listener registered: ${eventType}`, {
      eventType,
      once: options?.once || false,
    });
  }

  /**
   * Desregistra un listener
   */
  offEvent(eventType: BusinessEventType, listener?: (...args: any[]) => void): void {
    if (listener) {
      this.eventEmitter.off(eventType, listener);
    } else {
      this.eventEmitter.removeAllListeners(eventType);
    }

    this.logger.log(`Event listener removed: ${eventType}`);
  }
}