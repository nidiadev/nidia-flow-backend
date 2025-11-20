import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TenantProvisioningProcessor } from './processors/tenant-provisioning.processor';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import { TenantProvisioningController } from './controllers/tenant-provisioning.controller';
import { TenantService } from './tenant.service';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { TenantModule } from './tenant.module';

/**
 * TenantProvisioningModule
 * 
 * Módulo separado para el procesador de provisioning
 * Esto asegura que el procesador tenga scope singleton y no sea afectado
 * por el módulo global TenantModule
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tenant-provisioning',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: 100, // Mantener últimos 100 completados
        removeOnFail: 100, // Mantener últimos 100 fallidos
      },
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => PlansModule),
    forwardRef(() => TenantModule), // Importar TenantModule para acceder a TenantService y TenantProvisioningService
  ],
  controllers: [
    TenantProvisioningController,
  ],
  providers: [
    TenantProvisioningProcessor,
    // TenantProvisioningService y TenantService se obtienen de TenantModule (global)
  ],
  exports: [
    TenantProvisioningProcessor,
  ],
})
export class TenantProvisioningModule {}

