import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FileController } from '../controllers/files/file.controller';
import { FileService } from '../services/files/file.service';
import { S3Service } from '../services/files/s3.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [
    forwardRef(() => PlansModule),
    MulterModule.register({
      dest: './uploads', // Temporary storage before S3 upload
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  ],
  controllers: [FileController],
  providers: [FileService, S3Service, TenantPrismaService, TenantService],
  exports: [FileService, S3Service],
})
export class FilesModule {}