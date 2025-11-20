import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';
import { TenantProvisioningService } from '../services/tenant-provisioning.service';
import { TenantService } from '../tenant.service';
import { UsersService } from '../../users/users.service';
import { PlansService } from '../../plans/plans.service';
import prisma from '../../lib/prisma';
import {
  TenantProvisioningData,
  ProvisioningStatus,
  ProvisioningProgress,
} from '../types/provisioning.types';
import { Redis } from 'ioredis';

/**
 * TenantProvisioningProcessor - Processor de BullMQ para provisioning asíncrono
 * 
 * CONTEXTO: SUPERADMIN ONLY
 * Procesa jobs de provisioning en background usando BullMQ
 * 
 * IMPORTANTE: Debe ser singleton (default) para que los event listeners funcionen
 * NOTA: El scope DEFAULT es necesario para que BullMQ pueda registrar los event listeners
 */
@Processor('tenant-provisioning')
@Injectable()
export class TenantProvisioningProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(TenantProvisioningProcessor.name);
  private redis: Redis;

  constructor(
    private readonly provisioningService: TenantProvisioningService,
    private readonly tenantService: TenantService,
    private readonly usersService: UsersService,
    private readonly plansService: PlansService,
  ) {
    super();
    this.logger.log('🔧 [PROCESSOR] TenantProvisioningProcessor constructor called');
    // Usar REDIS_URL si está disponible (prioridad), sino usar variables individuales
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
      this.logger.log('✅ [PROCESSOR] Redis connection initialized using REDIS_URL');
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      });
      this.logger.log('✅ [PROCESSOR] Redis connection initialized using individual variables');
    }
    this.logger.log('✅ [PROCESSOR] TenantProvisioningProcessor initialized successfully');
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async process(job: Job<TenantProvisioningData>): Promise<void> {
    const { tenantId, slug, dbName, adminEmail, adminPassword, adminFirstName, adminLastName, companyName, planId } = job.data;
    const startedAt = new Date();

    this.logger.log(`🚀 [PROCESSOR] ==========================================`);
    this.logger.log(`🚀 [PROCESSOR] Starting provisioning for tenant ${tenantId} (${slug})`);
    this.logger.log(`🚀 [PROCESSOR] Job ID: ${job.id}`);
    this.logger.log(`🚀 [PROCESSOR] Job data: ${JSON.stringify({ tenantId, slug, dbName, adminEmail, companyName })}`);
    this.logger.log(`🚀 [PROCESSOR] Redis connection: ${this.redis ? 'OK' : 'FAILED'}`);
    this.logger.log(`🚀 [PROCESSOR] ==========================================`);

    try {
      // Actualizar status en BD
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { provisioningStatus: 'provisioning' },
      });

      // Actualizar status inicial en Redis
      await this.updateStatus(tenantId, {
        status: ProvisioningStatus.PROVISIONING,
        progress: 0,
        currentStep: 'Iniciando provisioning...',
        startedAt,
      });

      await job.updateProgress(0);

      // Obtener configuración de BD del tenant
      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      const dbHost = tenant.dbHost || process.env.TENANT_DB_HOST || 'localhost';
      const dbPort = tenant.dbPort || parseInt(process.env.TENANT_DB_PORT || '5432');
      const dbUsername = tenant.dbUsername || process.env.TENANT_DB_USERNAME || 'postgres';
      
      // CRITICAL: Usar la contraseña descifrada del tenant, no la de las variables de entorno
      // La contraseña se generó durante el registro y se cifró, debemos descifrarla aquí
      let dbPassword: string;
      if (tenant.dbPasswordEncrypted) {
        try {
          // Usar el método privado de TenantService para descifrar
          // Como es privado, necesitamos accederlo de otra manera o hacerlo público
          // Por ahora, usaremos el mismo método de descifrado aquí
          dbPassword = this.decryptPassword(tenant.dbPasswordEncrypted);
          this.logger.log(`✅ Contraseña del tenant descifrada exitosamente para provisioning (length: ${dbPassword.length})`);
          this.logger.log(`🔐 [PROCESSOR] Usando contraseña descifrada del tenant para crear usuario PostgreSQL: ${dbUsername}`);
        } catch (decryptError) {
          this.logger.error(`❌ Error al descifrar contraseña del tenant:`, decryptError);
          // Fallback a variables de entorno si falla el descifrado
          this.logger.warn(`⚠️ Usando contraseña de variables de entorno como fallback`);
          dbPassword = process.env.TENANT_DB_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres';
        }
      } else {
        // Si no hay contraseña cifrada, usar variables de entorno
        this.logger.error(`❌ CRITICAL: Tenant ${tenantId} no tiene contraseña cifrada (dbPasswordEncrypted es null/undefined)`);
        this.logger.warn(`⚠️ Usando contraseña de variables de entorno como fallback`);
        dbPassword = process.env.TENANT_DB_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres';
      }

      // Log connection information for debugging
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl) {
        try {
          const dbUrl = new URL(databaseUrl);
          this.logger.log(`🔍 DATABASE_URL hostname: ${dbUrl.hostname}`);
          this.logger.log(`🔍 DATABASE_URL port: ${dbUrl.port || '5432'}`);
          this.logger.log(`🔍 DATABASE_URL database: ${dbUrl.pathname.split('/')[1] || 'N/A'}`);
          this.logger.log(`🔍 DATABASE_URL user: ${dbUrl.username}`);
        } catch (e) {
          this.logger.warn(`Could not parse DATABASE_URL for logging: ${e}`);
        }
      }
      this.logger.log(`📋 Tenant DB config - Host: ${dbHost}, Port: ${dbPort}, Username: ${dbUsername}, DB Name: ${dbName}`);
      this.logger.log(`⚠️  IMPORTANT: Database will be created on the server specified in DATABASE_URL, not necessarily the tenant config values`);

      // Paso 1: Crear base de datos (10%)
      this.logger.log(`[${tenantId}] Step 1: Creating database ${dbName}`);
      await this.updateStatus(tenantId, {
        status: ProvisioningStatus.CREATING_DATABASE,
        progress: 10,
        currentStep: 'Creando base de datos...',
        startedAt,
      });
      await job.updateProgress(10);

      await this.provisioningService.createTenantDatabase({
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: dbUsername,
        password: dbPassword,
      });

      // CRITICAL VERIFICATION: Verify database was created before continuing
      const dbExists = await this.provisioningService.databaseExists(dbName);
      if (!dbExists) {
        const errorMsg = `❌ CRITICAL: Database ${dbName} was not created. Cannot proceed with provisioning.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      this.logger.log(`✅ Database ${dbName} confirmed to exist before proceeding to migrations`);

      // Paso 2: Ejecutar migraciones (50%)
      this.logger.log(`[${tenantId}] Step 2: Running migrations`);
      await this.updateStatus(tenantId, {
        status: ProvisioningStatus.RUNNING_MIGRATIONS,
        progress: 50,
        currentStep: 'Ejecutando migraciones...',
        startedAt,
      });
      await job.updateProgress(50);

      await this.provisioningService.runTenantMigration({
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: dbUsername,
        password: dbPassword,
      });

      // CRITICAL VERIFICATION: Verify database still exists after migrations
      const dbExistsAfterMigration = await this.provisioningService.databaseExists(dbName);
      if (!dbExistsAfterMigration) {
        const errorMsg = `❌ CRITICAL: Database ${dbName} disappeared after migrations. Cannot proceed.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      this.logger.log(`✅ Database ${dbName} confirmed to exist after migrations`);

      // Paso 3: Crear usuario inicial (80%)
      this.logger.log(`[${tenantId}] Step 3: Creating initial admin user`);
      this.logger.log(`[${tenantId}] User data: email=${adminEmail}, firstName=${adminFirstName}, lastName=${adminLastName}`);
      await this.updateStatus(tenantId, {
        status: ProvisioningStatus.CREATING_INITIAL_USER,
        progress: 80,
        currentStep: 'Creando usuario administrador...',
        startedAt,
      });
      await job.updateProgress(80);

      try {
        this.logger.log(`[${tenantId}] Calling createInitialUser with config: host=${dbHost}, port=${dbPort}, database=${dbName}, username=${dbUsername}`);
        await this.provisioningService.createInitialUser(
          {
            host: dbHost,
            port: dbPort,
            database: dbName,
            username: dbUsername,
            password: dbPassword,
          },
          {
            email: adminEmail,
            passwordHash: adminPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
          },
        );
        this.logger.log(`[${tenantId}] ✅ createInitialUser completed successfully`);
      } catch (error: any) {
        this.logger.error(`[${tenantId}] ❌ Error in createInitialUser:`, error);
        this.logger.error(`[${tenantId}] Error message: ${error.message}`);
        this.logger.error(`[${tenantId}] Error stack: ${error.stack}`);
        throw error;
      }

      // Paso 4: Verificar integridad (100%)
      this.logger.log(`[${tenantId}] Step 4: Verifying database`);
      await this.updateStatus(tenantId, {
        status: ProvisioningStatus.COMPLETED,
        progress: 100,
        currentStep: 'Verificando integridad...',
        startedAt,
        completedAt: new Date(),
      });
      await job.updateProgress(100);

      // Final verification: Ensure database exists after all steps
      const dbExistsFinal = await this.provisioningService.databaseExists(dbName);
      if (!dbExistsFinal) {
        const errorMsg = `❌ CRITICAL: Database ${dbName} does not exist after provisioning. Provisioning failed.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      this.logger.log(`✅ Final verification: Database ${dbName} exists and provisioning is complete`);

      // Activar tenant, crear suscripción y activar usuario en SuperAdmin
      await this.activateTenant(tenantId, adminEmail, planId, slug);

      this.logger.log(`✅ Provisioning completed successfully for tenant ${tenantId}`);
      
      // Limpiar registro de Redis después de un breve delay (para que el frontend pueda leer el estado final)
      // Esperamos 10 segundos para asegurar que el frontend haya leído el estado final
      setTimeout(async () => {
        await this.clearStatus(tenantId);
        this.logger.log(`🧹 [PROCESSOR] Redis status cleared for completed tenant ${tenantId}`);
      }, 10000); // 10 segundos después de completar

    } catch (error: any) {
      this.logger.error(`❌ Provisioning failed for tenant ${tenantId}:`, error);

      await this.updateStatus(tenantId, {
        status: ProvisioningStatus.FAILED,
        progress: 0,
        currentStep: 'Error en provisioning',
        error: error.message || 'Unknown error',
        startedAt,
        completedAt: new Date(),
      });

      // Actualizar tenant con error
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          provisioningStatus: 'failed',
          provisioningError: error.message || 'Unknown error',
          provisioningAttempts: { increment: 1 },
        },
      });

      // La limpieza final de Redis se maneja en el event listener onFailed
      // para saber si fue el último intento o no

      throw error; // Re-lanzar para que BullMQ maneje el retry
    }
  }

  private async updateStatus(
    tenantId: string,
    progress: ProvisioningProgress,
  ): Promise<void> {
    const key = `provisioning:${tenantId}`;
    await this.redis.setex(key, 3600, JSON.stringify(progress)); // TTL: 1 hora (fallback)
  }

  /**
   * Limpiar el registro de estado del provisioning en Redis
   */
  private async clearStatus(tenantId: string): Promise<void> {
    try {
      const key = `provisioning:${tenantId}`;
      await this.redis.del(key);
      this.logger.log(`🧹 [PROCESSOR] Cleared Redis key: ${key}`);
    } catch (error) {
      this.logger.error(`❌ [PROCESSOR] Error clearing Redis status for tenant ${tenantId}:`, error);
    }
  }

  private async activateTenant(tenantId: string, adminEmail: string, planId: string | undefined, slug: string): Promise<void> {
    // 1. Obtener plan (del planId proporcionado o plan gratuito por defecto)
    let plan;
    if (planId) {
      plan = await this.plansService.findOne(planId);
      if (!plan) {
        this.logger.warn(`Plan with ID ${planId} not found, using free plan as fallback`);
        plan = await this.plansService.findByName('free');
      }
    } else {
      // Buscar plan gratuito por defecto
      plan = await this.plansService.findByName('free');
      if (!plan) {
        // Si no existe plan 'free', buscar el primer plan activo ordenado por sortOrder
        const allPlans = await this.plansService.findAll();
        plan = allPlans.find(p => p.isActive) || allPlans[0];
      }
    }

    if (!plan) {
      this.logger.error(`No plan found for tenant ${tenantId}. Cannot create subscription.`);
      throw new Error('No plan available for subscription creation');
    }

    this.logger.log(`📦 Using plan ${plan.id} (${plan.displayName}) for tenant ${tenantId}`);

    // 2. Crear suscripción automáticamente (1 mes gratis, todos los planes)
    try {
      const now = new Date();
      const currentPeriodStart = now;
      const currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 mes desde ahora

      // Calcular montos (todos los planes son gratis por ahora)
      const amount = 0; // Todos los planes son gratis por ahora
      const discountAmount = 0;
      const totalAmount = 0;
      const currency = plan.currency || 'USD';

      // Crear suscripción activa (sin trial, directamente activa)
      const subscription = await prisma.subscription.create({
        data: {
          tenantId: tenantId,
          planId: plan.id,
          billingCycle: 'monthly',
          amount,
          discountAmount,
          totalAmount,
          currency,
          status: 'active', // Activa directamente (todos los planes son gratis)
          currentPeriodStart,
          currentPeriodEnd,
          trialStart: null, // Sin trial
          trialEnd: null,
          cancelAtPeriodEnd: false,
          metadata: {
            createdFrom: 'tenant_provisioning',
            tenantSlug: slug,
            autoCreated: true,
          },
        },
      });

      this.logger.log(`✅ Subscription created successfully for tenant ${tenantId}: ${subscription.id} (Plan: ${plan.displayName})`);
    } catch (subscriptionError: any) {
      this.logger.error(`❌ Failed to create subscription for tenant ${tenantId}:`, subscriptionError);
      // No lanzamos error, el tenant ya está provisionado, pero logueamos el error
    }

    // 3. Activar tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: true,
        provisioningStatus: 'completed',
        provisionedAt: new Date(),
      },
    });

    // 4. Activar usuario en SuperAdmin
    const user = await this.usersService.findByEmail(adminEmail);
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
      this.logger.log(`✅ User ${user.id} activated for tenant ${tenantId}`);
    } else {
      this.logger.warn(`⚠️ User with email ${adminEmail} not found in SuperAdmin database`);
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<TenantProvisioningData>) {
    try {
      const { tenantId } = job.data;
      this.logger.log(`✅ [PROCESSOR] Job ${job.id} completed successfully for tenant ${tenantId}`);
      
      // Limpiar registro de Redis después de completar
      // Esperamos un poco más para asegurar que el frontend haya leído el estado final
      setTimeout(async () => {
        await this.clearStatus(tenantId);
        this.logger.log(`🧹 [PROCESSOR] Redis status cleared for completed tenant ${tenantId} (from onCompleted event)`);
      }, 15000); // 15 segundos después de completar (redundancia con el clearStatus en process)
    } catch (error) {
      this.logger.error(`❌ [PROCESSOR] Error in onCompleted handler:`, error);
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TenantProvisioningData>, error: Error) {
    try {
      const { tenantId } = job.data;
      const attemptsMade = (job as any).attemptsMade || 0;
      const maxAttempts = (job as any).opts?.attempts || 3;
      
      this.logger.error(`❌ [PROCESSOR] Job ${job.id} failed for tenant ${tenantId} (attempt ${attemptsMade + 1}/${maxAttempts}):`, error);
      
      // Limpiar Redis cuando falle definitivamente (último intento)
      // O limpiar inmediatamente si no hay más intentos
      if (attemptsMade >= maxAttempts - 1) {
        setTimeout(async () => {
          await this.clearStatus(tenantId);
          this.logger.log(`🧹 [PROCESSOR] Redis status cleared for failed tenant ${tenantId} (all attempts exhausted)`);
        }, 10000); // 10 segundos después del último fallo para que el frontend pueda leer el error
      } else {
        // Si aún hay intentos, mantener el registro para debugging pero loguear
        this.logger.log(`⚠️ [PROCESSOR] Keeping Redis status for tenant ${tenantId} (will retry, attempt ${attemptsMade + 1}/${maxAttempts})`);
      }
    } catch (handlerError) {
      this.logger.error(`❌ [PROCESSOR] Error in onFailed handler:`, handlerError);
    }
  }

  /**
   * Descifrar contraseña del tenant usando el mismo método que TenantService
   */
  private decryptPassword(encryptedPassword: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const parts = encryptedPassword.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted password format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

