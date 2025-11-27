import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { ProvisioningProgress, ProvisioningStatus } from '../types/provisioning.types';
import prisma from '../../lib/prisma';

@Controller('tenant/provisioning')
export class TenantProvisioningController {
  private redis: Redis;

  constructor(
    @InjectQueue('tenant-provisioning')
    private provisioningQueue: Queue,
  ) {
    // Inicializar Redis para leer progreso
    // Usar REDIS_URL si está disponible (prioridad), sino usar variables individuales
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      });
    }
  }

  @Get(':tenantId/status')
  async getProvisioningStatus(@Param('tenantId') tenantId: string) {
    try {
      // 1. Obtener status desde Redis
      const key = `provisioning:${tenantId}`;
      const statusStr = await this.redis.get(key);

      // 2. Obtener info del job en BullMQ (hacerlo antes para tener más información)
      const jobs = await this.provisioningQueue.getJobs([
        'active',
        'waiting',
        'completed',
        'failed',
      ]);

      const job = jobs.find((j) => j.data?.tenantId === tenantId);

      // Obtener estado del job (active, waiting, completed, failed)
      let jobState: string | undefined;
      if (job) {
        // Determinar el estado basado en en qué array está
        const activeJobs = await this.provisioningQueue.getJobs(['active']);
        const waitingJobs = await this.provisioningQueue.getJobs(['waiting']);
        const completedJobs = await this.provisioningQueue.getJobs(['completed']);
        const failedJobs = await this.provisioningQueue.getJobs(['failed']);
        
        if (activeJobs.some(j => j.id === job.id)) jobState = 'active';
        else if (waitingJobs.some(j => j.id === job.id)) jobState = 'waiting';
        else if (completedJobs.some(j => j.id === job.id)) jobState = 'completed';
        else if (failedJobs.some(j => j.id === job.id)) jobState = 'failed';
      }

      // Log para debugging
      console.log(`[STATUS] Tenant ${tenantId}: Redis key exists: ${!!statusStr}, Job found: ${!!job}, Job state: ${jobState || 'N/A'}`);

      if (!statusStr) {
        // Si no hay status en Redis, verificar en la BD si el tenant ya está provisionado
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            provisioningStatus: true,
            isActive: true,
            provisionedAt: true,
            provisioningError: true,
          },
        });

        if (!tenant) {
          return {
            status: 'not_found',
            message: 'No se encontró información de provisioning',
            progress: 0,
            jobId: job?.id,
            jobState: jobState,
          };
        }

        // Si el tenant está completado y activo, retornar estado completado
        if (tenant.provisioningStatus === 'completed' && tenant.isActive) {
          return {
            status: 'completed',
            progress: 100,
            currentStep: 'Provisioning completado',
            startedAt: tenant.provisionedAt || new Date(),
            completedAt: tenant.provisionedAt || new Date(),
            jobId: job?.id,
            jobState: jobState,
          };
        }

        // Si el tenant falló, retornar estado fallido
        if (tenant.provisioningStatus === 'failed') {
          return {
            status: 'failed',
            progress: 0,
            currentStep: 'Error en provisioning',
            error: tenant.provisioningError || 'Error desconocido',
            jobId: job?.id,
            jobState: jobState,
          };
        }

        // Si está en proceso pero no hay Redis, verificar si hay un job activo
        if (job && (jobState === 'active' || jobState === 'waiting')) {
          return {
            status: tenant.provisioningStatus || 'provisioning',
            progress: job.progress || 0,
            currentStep: 'Procesando...',
            message: 'El job está en proceso pero no hay información de progreso en Redis',
            jobId: job.id,
            jobState: jobState,
            attempts: job.attemptsMade || 0,
            maxAttempts: job.opts?.attempts || 3,
          };
        }

        // Si está en proceso pero no hay Redis, retornar estado desconocido
        return {
          status: tenant.provisioningStatus || 'unknown',
          progress: 0,
          currentStep: 'Verificando estado...',
          message: 'No se encontró información de progreso en tiempo real',
          jobId: job?.id,
          jobState: jobState,
        };
      }

      const status: ProvisioningProgress = JSON.parse(statusStr);

      // 3. Retornar información completa
      return {
        ...status,
        jobId: job?.id,
        jobState: jobState,
        attempts: job?.attemptsMade || 0,
        maxAttempts: job?.opts?.attempts || 3,
        nextRetryAt: job?.opts?.backoff && job?.attemptsMade && job.attemptsMade < (job?.opts?.attempts || 3)
          ? this.calculateNextRetry(job)
          : null,
      };
    } catch (error: any) {
      console.error(`[STATUS] Error obteniendo status para tenant ${tenantId}:`, error);
      throw new BadRequestException(`Error obteniendo status: ${error.message}`);
    }
  }

  private calculateNextRetry(job: Job): Date | null {
    if (!job.opts?.backoff) {
      return null;
    }

    const backoff = job.opts.backoff;
    const attemptsMade = job.attemptsMade || 0;

    // Check if backoff is an object with type and delay properties
    if (typeof backoff === 'object' && 'type' in backoff && backoff.type === 'exponential') {
      const delay = (backoff as { delay: number }).delay * Math.pow(2, attemptsMade - 1);
      const nextRetry = new Date();
      nextRetry.setSeconds(nextRetry.getSeconds() + delay / 1000);
      return nextRetry;
    }

    // If backoff is a number, use it directly
    if (typeof backoff === 'number') {
      const delay = backoff * Math.pow(2, attemptsMade - 1);
      const nextRetry = new Date();
      nextRetry.setSeconds(nextRetry.getSeconds() + delay / 1000);
      return nextRetry;
    }

    return null;
  }
}

