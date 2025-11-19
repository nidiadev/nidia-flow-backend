import { Module, forwardRef } from '@nestjs/common';
import { SavedReportController } from '../controllers/reports/saved-report.controller';
import { ReportExecutionController } from '../controllers/reports/report-execution.controller';
import { ReportController } from '../controllers/reports/report.controller';
import { SavedReportService } from '../services/reports/saved-report.service';
import { ReportExecutionService } from '../services/reports/report-execution.service';
import { PlansModule } from '../../plans/plans.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [SavedReportController, ReportExecutionController, ReportController],
  providers: [SavedReportService, ReportExecutionService],
  exports: [SavedReportService, ReportExecutionService],
})
export class ReportsModule {}