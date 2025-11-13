import { Module, forwardRef } from '@nestjs/common';
import { SettingsController } from '../controllers/settings.controller';
import { CompanySettingService } from '../services/settings/company-setting.service';
import { AuditLogService } from '../services/audit/audit-log.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [SettingsController],
  providers: [
    CompanySettingService,
    AuditLogService,
    TenantPrismaService,
    TenantService,
  ],
  exports: [CompanySettingService],
})
export class SettingsModule {}