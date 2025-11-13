import { Module, forwardRef } from '@nestjs/common';
import { SavedReportController } from '../controllers/reports/saved-report.controller';
import { ReportExecutionController } from '../controllers/reports/report-execution.controller';
import { ReportController } from '../controllers/reports/report.controller';
import { SavedReportService } from '../services/reports/saved-report.service';
import { ReportExecutionService } from '../services/reports/report-execution.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [SavedReportController, ReportExecutionController, ReportController],
  providers: [SavedReportService, ReportExecutionService, TenantPrismaService, TenantService],
  exports: [SavedReportService, ReportExecutionService],
})
export class ReportsModule {}