import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantModule } from './tenant/tenant.module';
import { PlansModule } from './plans/plans.module';
import { ModulesModule } from './modules/modules.module';
import { OrdersModule } from './orders/orders.module';
import { TasksModule } from './tasks/tasks.module';
import { EventsModule } from './common/events/events.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Configurar BullMQ con Redis
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    // Registrar queue de provisioning
    BullModule.registerQueue({
      name: 'tenant-provisioning',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: 100, // Mantener últimos 100 completados
        removeOnFail: 100, // Mantener últimos 100 fallidos
      },
    }),
    EventsModule, // Módulo global de eventos (incluye EventEmitterModule)
    AuthModule, // Importar AuthModule PRIMERO para que JwtStrategy esté disponible
    UsersModule,
    ModulesModule, // Módulo para gestión de módulos del sistema - DEBE estar ANTES de TenantModule para que tenga prioridad en el routing
    PlansModule, // Módulo independiente para gestión de planes
    TenantModule, // TenantModule depende de AuthModule
    OrdersModule,
    TasksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}