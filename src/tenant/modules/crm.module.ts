import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomerController } from '../controllers/crm/customer.controller';
import { InteractionController } from '../controllers/crm/interaction.controller';
import { CustomerContactController } from '../controllers/crm/customer-contact.controller';
import { DealController } from '../controllers/crm/deal.controller';
import { DealStageController } from '../controllers/crm/deal-stage.controller';
import { InboxController } from '../controllers/crm/inbox.controller';
import { CalendarController } from '../controllers/crm/calendar.controller';
import { SmartListController } from '../controllers/crm/smart-list.controller';
import { LeadScoringController } from '../controllers/crm/lead-scoring.controller';
import { CrmReportsController } from '../controllers/crm/reports.controller';
import { WorkflowController } from '../controllers/crm/workflow.controller';
import { CustomerService } from '../services/crm/customer.service';
import { InteractionService } from '../services/crm/interaction.service';
import { CustomerContactService } from '../services/crm/customer-contact.service';
import { DealService } from '../services/crm/deal.service';
import { DealStageService } from '../services/crm/deal-stage.service';
import { ConversationService } from '../services/crm/conversation.service';
import { SmartListService } from '../services/crm/smart-list.service';
import { LeadScoringService } from '../services/crm/lead-scoring.service';
import { CrmReportsService } from '../services/crm/crm-reports.service';
import { WorkflowService } from '../services/crm/workflow.service';
import { ActivityReminderProcessor } from '../processors/activity-reminder.processor';
import { WorkflowProcessor } from '../processors/workflow.processor';
import { ActivityReminderService } from '../services/crm/activity-reminder.service';
import { PlansModule } from '../../plans/plans.module';
import { CommunicationsModule } from './communications.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// BusinessEventEmitterService se obtiene del EventsModule (global)
// DataScopeService se obtiene del TenantModule (global)
// NotificationService se obtiene del CommunicationsModule
// WebSocketEventService se obtiene del EventsModule
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [
    forwardRef(() => PlansModule),
    forwardRef(() => CommunicationsModule),
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'activity-reminders',
    }),
    BullModule.registerQueue({
      name: 'workflows',
    }),
  ],
  controllers: [
    CustomerController,
    InteractionController,
    CustomerContactController,
    DealController,
    DealStageController,
    InboxController,
    CalendarController,
    SmartListController,
    LeadScoringController,
    CrmReportsController,
    WorkflowController,
  ],
  providers: [
    CustomerService,
    InteractionService,
    CustomerContactService,
    DealService,
    DealStageService,
    ConversationService,
    SmartListService,
    LeadScoringService,
    CrmReportsService,
    WorkflowService,
    ActivityReminderProcessor,
    WorkflowProcessor,
    ActivityReminderService,
  ],
  exports: [
    CustomerService,
    InteractionService,
    CustomerContactService,
    DealService,
    DealStageService,
    ConversationService,
    SmartListService,
    LeadScoringService,
    CrmReportsService,
  ],
})
export class CrmModule {}