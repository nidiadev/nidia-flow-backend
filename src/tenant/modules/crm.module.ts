import { Module, forwardRef } from '@nestjs/common';
import { CustomerController } from '../controllers/crm/customer.controller';
import { InteractionController } from '../controllers/crm/interaction.controller';
import { CustomerContactController } from '../controllers/crm/customer-contact.controller';
import { CustomerService } from '../services/crm/customer.service';
import { InteractionService } from '../services/crm/interaction.service';
import { CustomerContactService } from '../services/crm/customer-contact.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import { BusinessEventEmitterService } from '../../common/events/event-emitter.service';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [
    CustomerController,
    InteractionController,
    CustomerContactController,
  ],
  providers: [
    CustomerService,
    InteractionService,
    CustomerContactService,
    TenantPrismaService,
    TenantService,
    BusinessEventEmitterService,
  ],
  exports: [
    CustomerService,
    InteractionService,
    CustomerContactService,
  ],
})
export class CrmModule {}