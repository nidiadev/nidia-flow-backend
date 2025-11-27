import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantProvisioningModule } from './tenant/tenant-provisioning.module';
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
      connection: (() => {
        // Si hay REDIS_URL, usarla (prioridad)
        if (process.env.REDIS_URL) {
          try {
            const redisUrl = new URL(process.env.REDIS_URL);
            return {
              host: redisUrl.hostname,
              port: parseInt(redisUrl.port || '6379'),
              password: redisUrl.password || undefined,
              username: redisUrl.username || undefined,
            };
          } catch (error) {
            console.warn('Invalid REDIS_URL format, falling back to individual variables');
          }
        }
        // Fallback a variables individuales
        return {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        };
      })(),
    }),
    // Queue de provisioning registrada en TenantProvisioningModule
    // Registrar queue de recordatorios de actividades
    BullModule.registerQueue({
      name: 'activity-reminders',
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    }),
    // Registrar queue de workflows
    BullModule.registerQueue({
      name: 'workflows',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    }),
    EventsModule, // Módulo global de eventos (incluye EventEmitterModule)
    AuthModule, // Importar AuthModule PRIMERO para que JwtStrategy esté disponible
    UsersModule,
    ModulesModule, // Módulo para gestión de módulos del sistema - DEBE estar ANTES de TenantModule para que tenga prioridad en el routing
    PlansModule, // Módulo independiente para gestión de planes
    TenantModule, // TenantModule depende de AuthModule - DEBE estar antes de TenantProvisioningModule
    TenantProvisioningModule, // Módulo separado para el procesador de provisioning (debe estar después de TenantModule para que los servicios globales estén disponibles)
    OrdersModule,
    TasksModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}