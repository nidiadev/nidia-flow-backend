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

import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import { WebSocketEventService } from '../../common/events/websocket-event.service';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [
    forwardRef(() => PlansModule),
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
    TenantPrismaService,
    TenantService,
    WebSocketEventService,
  ],
  exports: [
    MessageTemplateService,
    MessageLogService,
    NotificationService,
  ],
})
export class CommunicationsModule {}