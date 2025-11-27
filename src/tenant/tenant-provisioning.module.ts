import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TenantProvisioningProcessor } from './processors/tenant-provisioning.processor';
import { TenantProvisioningController } from './controllers/tenant-provisioning.controller';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
// NO importar TenantModule directamente - es @Global() y tiene servicios REQUEST-scoped
// Los servicios TenantService y TenantProvisioningService estarán disponibles por ser globales

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
    // NO importar TenantModule - es @Global() y sus servicios (TenantService, TenantProvisioningService) 
    // estarán disponibles automáticamente sin necesidad de importarlo
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

