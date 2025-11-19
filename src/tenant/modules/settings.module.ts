import { Module, forwardRef } from '@nestjs/common';
import { SettingsController } from '../controllers/settings.controller';
import { CompanySettingService } from '../services/settings/company-setting.service';
import { AuditLogService } from '../services/audit/audit-log.service';
import { PlansModule } from '../../plans/plans.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [SettingsController],
  providers: [
    CompanySettingService,
    AuditLogService,
  ],
  exports: [CompanySettingService],
})
export class SettingsModule {}