import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import {
  MessageTemplateController,
  CommunicationController,
  NotificationController,
} from '../controllers/communications';

// Services
import {
  MessageTemplateService,
  MessageLogService,
  NotificationService,
} from '../services/communications';

import { WebSocketEventService } from '../../common/events/websocket-event.service';
import { PlansModule } from '../../plans/plans.module';
import { TenantModule } from '../tenant.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [
    forwardRef(() => PlansModule),
    forwardRef(() => TenantModule), // Import TenantModule to access TenantModulesService
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '15m' },
    }),
    EventEmitterModule,
  ],
  controllers: [
    MessageTemplateController,
    CommunicationController,
    NotificationController,
  ],
  providers: [
    MessageTemplateService,
    MessageLogService,
    NotificationService,
    WebSocketEventService,
  ],
  exports: [
    MessageTemplateService,
    MessageLogService,
    NotificationService,
  ],
})
export class CommunicationsModule {}