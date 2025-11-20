import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import {
  MessageTemplateController,
  CommunicationController,
  NotificationController,
} from '../controllers/communications';
import { WebhooksController } from '../controllers/integrations/webhooks.controller';

// Services
import {
  MessageTemplateService,
  MessageLogService,
  NotificationService,
} from '../services/communications';
import { WhatsAppService } from '../services/integrations/whatsapp.service';
import { SendGridService } from '../services/integrations/sendgrid.service';

import { WebSocketEventService } from '../../common/events/websocket-event.service';
import { PlansModule } from '../../plans/plans.module';
import { TenantModule } from '../tenant.module';
import { CrmModule } from './crm.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// ConversationService se obtiene del CrmModule
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [
    forwardRef(() => PlansModule),
    forwardRef(() => TenantModule), // Import TenantModule to access TenantModulesService
    forwardRef(() => CrmModule), // Import CrmModule to access ConversationService
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
    WebhooksController,
  ],
  providers: [
    MessageTemplateService,
    MessageLogService,
    NotificationService,
    WebSocketEventService,
    WhatsAppService,
    SendGridService,
  ],
  exports: [
    MessageTemplateService,
    MessageLogService,
    NotificationService,
    WhatsAppService,
    SendGridService,
  ],
})
export class CommunicationsModule {}