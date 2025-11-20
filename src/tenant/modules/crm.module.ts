import { Module, forwardRef } from '@nestjs/common';
import { CustomerController } from '../controllers/crm/customer.controller';
import { InteractionController } from '../controllers/crm/interaction.controller';
import { CustomerContactController } from '../controllers/crm/customer-contact.controller';
import { DealController } from '../controllers/crm/deal.controller';
import { DealStageController } from '../controllers/crm/deal-stage.controller';
import { CustomerService } from '../services/crm/customer.service';
import { InteractionService } from '../services/crm/interaction.service';
import { CustomerContactService } from '../services/crm/customer-contact.service';
import { DealService } from '../services/crm/deal.service';
import { DealStageService } from '../services/crm/deal-stage.service';
import { PlansModule } from '../../plans/plans.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// BusinessEventEmitterService se obtiene del EventsModule (global)
// DataScopeService se obtiene del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [
    CustomerController,
    InteractionController,
    CustomerContactController,
    DealController,
    DealStageController,
  ],
  providers: [
    CustomerService,
    InteractionService,
    CustomerContactService,
    DealService,
    DealStageService,
  ],
  exports: [
    CustomerService,
    InteractionService,
    CustomerContactService,
    DealService,
    DealStageService,
  ],
})
export class CrmModule {}