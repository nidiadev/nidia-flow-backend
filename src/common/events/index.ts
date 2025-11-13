/**
 * Sistema de Eventos y Automatización de NIDIA Flow
 * 
 * Este módulo proporciona:
 * - Eventos de negocio tipados y centralizados
 * - Motor de automatización con hooks inteligentes
 * - WebSocket para actualizaciones en tiempo real
 * - Logging automático de auditoría
 * - Sistema de métricas en tiempo real
 */

// Tipos y eventos
export * from './business-events';

// Servicios principales
export { BusinessEventEmitterService } from './event-emitter.service';
export { AutomationEngineService } from './automation-engine.service';
export { WebSocketEventService } from './websocket-event.service';
export { AuditLoggerService } from './audit-logger.service';
export { MetricsService } from './metrics.service';

// Módulo y controlador
export { EventsModule } from './events.module';
export { EventsController } from './events.controller';

/**
 * Guía de uso:
 * 
 * 1. Emitir eventos de negocio:
 * ```typescript
 * constructor(private eventEmitter: BusinessEventEmitterService) {}
 * 
 * await this.eventEmitter.emit(BusinessEventTypes.ORDER_CREATED, {
 *   orderId: '123',
 *   orderNumber: 'ORD-001',
 *   // ... otros datos
 * });
 * ```
 * 
 * 2. Escuchar eventos para automatización:
 * ```typescript
 * @OnEvent(BusinessEventTypes.ORDER_CREATED)
 * async handleOrderCreated(event: OrderCreatedEvent) {
 *   // Lógica de automatización
 * }
 * ```
 * 
 * 3. Broadcasting WebSocket:
 * ```typescript
 * await this.eventEmitter.emitWebSocketEvent(
 *   tenantId,
 *   'order_updated',
 *   { orderId: '123', status: 'completed' }
 * );
 * ```
 * 
 * 4. Logging de auditoría automático:
 * Los eventos se registran automáticamente en audit logs
 * 
 * 5. Métricas automáticas:
 * Las métricas se actualizan automáticamente basadas en eventos
 */