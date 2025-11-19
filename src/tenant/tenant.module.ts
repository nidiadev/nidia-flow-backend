import { Module, MiddlewareConsumer, NestModule, forwardRef, RequestMethod, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantHealthController } from './controllers/tenant-health.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { TenantProvisioningController } from './controllers/tenant-provisioning.controller';
import { TenantGuard } from './guards/tenant.guard';
import { TenantConnectionMiddleware } from './middleware/tenant-connection.middleware';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { TenantPrismaService } from './services/tenant-prisma.service';
import { TenantHealthService } from './services/tenant-health.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import { TenantProvisioningProcessor } from './processors/tenant-provisioning.processor';
import { TenantPermissionsGuard } from './guards/tenant-permissions.guard';
import { TenantPrismaInterceptor } from './interceptors/tenant-prisma.interceptor';
import { PlanLimitsGuard } from './guards/plan-limits.guard';
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
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { DashboardController } from './controllers/dashboard.controller';
import { TenantModulesController } from './controllers/modules.controller';
import { TenantModulesService } from './services/modules.service';
import { DataScopeService } from './services/data-scope.service';
import { DashboardService } from './services/dashboard.service';

@Global() // Hacer el módulo global para que TenantPrismaService esté disponible en todos los submódulos
@Module({
  imports: [
    forwardRef(() => AuthModule), // Usar forwardRef para evitar dependencia circular - AuthModule ya exporta PassportModule y JwtStrategy
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
    forwardRef(() => PlansModule), // Importar PlansModule para usar PlansService en SubscriptionsController (usar forwardRef para evitar dependencia circular)
    forwardRef(() => UsersModule), // Para usar UsersService en processor
    BullModule.registerQueue({
      name: 'tenant-provisioning',
    }),
    CrmModule,
    ProductsModule,
    FinancialModule,
    CommunicationsModule,
    FilesModule,
    ReportsModule,
    SettingsModule,
    AuditModule,
    forwardRef(() => OrdersModule), // Usar forwardRef para evitar dependencia circular
  ],
  providers: [
    TenantService,
    TenantPrismaService,
    TenantHealthService,
    TenantProvisioningService,
    TenantProvisioningProcessor,
    TenantModulesService,
    DataScopeService,
    DashboardService,
    TenantGuard,
    TenantPermissionsGuard,
    TenantPrismaInterceptor,
    PlanLimitsGuard,
    // JwtStrategy NO debe estar aquí - se obtiene de AuthModule que ya lo exporta
  ],
  controllers: [
    TenantController,
    TenantHealthController,
    SubscriptionsController,
    TenantProvisioningController,
    DashboardController,
    TenantModulesController,
  ],
  exports: [
    TenantService, // Exportar TenantService para que esté disponible en otros módulos
    TenantPrismaService,
    TenantHealthService,
    TenantProvisioningService,
    TenantModulesService, // Exportar TenantModulesService para uso en AuthModule
    DataScopeService, // Exportar DataScopeService para uso en servicios de tenant
    TenantGuard, // Exportar TenantGuard para que esté disponible en otros módulos
    TenantPermissionsGuard,
    TenantPrismaInterceptor,
    PlanLimitsGuard, // Exportar PlanLimitsGuard para uso en UsersModule
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        { path: 'auth/(.*)', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
        { path: 'docs/(.*)', method: RequestMethod.ALL },
        { path: 'swagger/(.*)', method: RequestMethod.ALL },
        { path: 'system/(.*)', method: RequestMethod.ALL },
        { path: 'superadmin/(.*)', method: RequestMethod.ALL },
        { path: 'plans/(.*)', method: RequestMethod.ALL },
        { path: 'modules/public', method: RequestMethod.ALL },
        { path: 'tenant/provisioning/(.*)', method: RequestMethod.ALL },
        { path: 'tenants/validate-slug/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}