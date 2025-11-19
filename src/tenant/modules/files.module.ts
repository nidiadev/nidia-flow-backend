import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FileController } from '../controllers/files/file.controller';
import { FileService } from '../services/files/file.service';
import { S3Service } from '../services/files/s3.service';
import { PlansModule } from '../../plans/plans.module';
import { TenantModule } from '../tenant.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [
    forwardRef(() => PlansModule),
    forwardRef(() => TenantModule), // Import TenantModule to access TenantModulesService and PlanLimitsGuard
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  ],
  controllers: [FileController],
  providers: [FileService, S3Service],
  exports: [FileService, S3Service],
})
export class FilesModule {}