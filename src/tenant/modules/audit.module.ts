import { Module, forwardRef } from '@nestjs/common';
import { AuditController } from '../controllers/audit.controller';
import { AuditLogService } from '../services/audit/audit-log.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [AuditController],
  providers: [
    AuditLogService,
    TenantPrismaService,
    TenantService,
  ],
  exports: [AuditLogService],
})
export class AuditModule {}