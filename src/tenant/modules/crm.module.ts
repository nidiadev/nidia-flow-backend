import { Module, forwardRef } from '@nestjs/common';
import { CustomerController } from '../controllers/crm/customer.controller';
import { InteractionController } from '../controllers/crm/interaction.controller';
import { CustomerContactController } from '../controllers/crm/customer-contact.controller';
import { CustomerService } from '../services/crm/customer.service';
import { InteractionService } from '../services/crm/interaction.service';
import { CustomerContactService } from '../services/crm/customer-contact.service';
import { PlansModule } from '../../plans/plans.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// BusinessEventEmitterService se obtiene del EventsModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

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
  ],
  exports: [
    CustomerService,
    InteractionService,
    CustomerContactService,
  ],
})
export class CrmModule {}