import { Module, MiddlewareConsumer, NestModule, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantHealthController } from './controllers/tenant-health.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { TenantGuard } from './guards/tenant.guard';
import { TenantConnectionMiddleware } from './middleware/tenant-connection.middleware';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { TenantPrismaService } from './services/tenant-prisma.service';
import { TenantHealthService } from './services/tenant-health.service';
import { TenantPermissionsGuard } from './guards/tenant-permissions.guard';
import { TenantPrismaInterceptor } from './interceptors/tenant-prisma.interceptor';
import { CrmModule } from './modules/crm.module';
import { ProductsModule } from './modules/products.module';
import { FinancialModule } from './modules/financial.module';
import { CommunicationsModule } from './modules/communications.module';
import { FilesModule } from './modules/files.module';
import { ReportsModule } from './modules/reports.module';
import { SettingsModule } from './modules/settings.module';
import { AuditModule } from './modules/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    forwardRef(() => AuthModule), // Usar forwardRef para evitar dependencia circular - AuthModule ya exporta PassportModule y JwtStrategy
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
    forwardRef(() => PlansModule), // Importar PlansModule para usar PlansService en SubscriptionsController (usar forwardRef para evitar dependencia circular)
    CrmModule,
    ProductsModule,
    FinancialModule,
    CommunicationsModule,
    FilesModule,
    ReportsModule,
    SettingsModule,
    AuditModule,
  ],
  providers: [
    TenantService,
    TenantPrismaService,
    TenantHealthService,
    TenantGuard,
    TenantPermissionsGuard,
    TenantPrismaInterceptor,
    // JwtStrategy NO debe estar aquí - se obtiene de AuthModule que ya lo exporta
  ],
  controllers: [TenantController, TenantHealthController, SubscriptionsController],
  exports: [
    TenantService, // Exportar TenantService para que esté disponible en otros módulos
    TenantPrismaService,
    TenantHealthService,
    TenantGuard, // Exportar TenantGuard para que esté disponible en otros módulos
    TenantPermissionsGuard,
    TenantPrismaInterceptor,
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes except auth and system routes
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        'auth/*path',
        'health',
        'metrics', 
        'docs/*path',
        'swagger/*path',
        'system/*path',
        'superadmin/*path',
        'plans/*path', // Excluir rutas de planes del middleware de tenant
      )
      .forRoutes('*path');
  }
}