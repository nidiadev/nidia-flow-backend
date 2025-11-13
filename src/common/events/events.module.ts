import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { TenantModule } from '../../tenant/tenant.module';
import { BusinessEventEmitterService } from './event-emitter.service';
import { AutomationEngineService } from './automation-engine.service';
import { WebSocketEventService } from './websocket-event.service';
import { AuditLoggerService } from './audit-logger.service';
import { MetricsService } from './metrics.service';
import { EventsController } from './events.controller';

/**
 * Módulo global de eventos que proporciona:
 * - Sistema de eventos de negocio centralizado
 * - Motor de automatización con hooks inteligentes
 * - WebSocket para tiempo real
 * - Logging automático de auditoría
 * - Sistema de métricas en tiempo real
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Configuración del EventEmitter
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 30,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
    TenantModule,
  ],
  controllers: [EventsController],
  providers: [
    BusinessEventEmitterService,
    AutomationEngineService,
    WebSocketEventService,
    AuditLoggerService,
    MetricsService,
  ],
  exports: [
    BusinessEventEmitterService,
    AutomationEngineService,
    WebSocketEventService,
    AuditLoggerService,
    MetricsService,
  ],
})
export class EventsModule {}