import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrderEventsListener } from './listeners/order-events.listener';
import { TenantModule } from '../tenant/tenant.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [forwardRef(() => TenantModule), TasksModule],
  controllers: [OrdersController, PaymentsController],
  providers: [OrdersService, PaymentsService, OrderEventsListener],
  exports: [OrdersService, PaymentsService],
})
export class OrdersModule {}