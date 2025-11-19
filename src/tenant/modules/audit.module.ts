import { Module, forwardRef } from '@nestjs/common';
import { AuditController } from '../controllers/audit.controller';
import { AuditLogService } from '../services/audit/audit-log.service';
import { PlansModule } from '../../plans/plans.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [AuditController],
  providers: [
    AuditLogService,
  ],
  exports: [AuditLogService],
})
export class AuditModule {}