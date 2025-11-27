import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import prisma from '../../lib/prisma';

/**
 * TenantUserIndexService
 * 
 * Mantiene un índice de usuarios de tenant en SuperAdmin DB para búsquedas rápidas.
 * También usa Redis como cache para búsquedas aún más rápidas.
 * 
 * Este servicio se usa cuando un tenant_admin crea usuarios en su BD del tenant.
 * Cada vez que se crea/actualiza/elimina un usuario en una BD de tenant,
 * se debe actualizar este índice.
 */
@Injectable()
export class TenantUserIndexService {
  private readonly logger = new Logger(TenantUserIndexService.name);
  private redis: Redis;

  constructor() {
    // Inicializar Redis para cache
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
      this.logger.log('✅ Redis connection initialized using REDIS_URL');
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      });
      this.logger.log('✅ Redis connection initialized using individual variables');
    }
  }

  /**
   * Buscar tenantId por email (con cache en Redis)
   * @param email Email del usuario
   * @returns tenantId si se encuentra, null si no
   */
  async findTenantByEmail(email: string): Promise<{ tenantId: string; userId: string } | null> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Buscar en cache de Redis primero (más rápido)
    try {
      const cacheKey = `tenant_user:${normalizedEmail}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        this.logger.debug(`Cache hit for email: ${normalizedEmail}`);
        return data;
      }
    } catch (error) {
      this.logger.warn(`Error reading from Redis cache: ${error.message}`);
    }

    // 2. Buscar en índice de SuperAdmin DB
    try {
      const indexEntry = await prisma.tenantUserIndex.findUnique({
        where: { email: normalizedEmail },
        select: {
          tenantId: true,
          userId: true,
          isActive: true,
        },
      });

      if (!indexEntry || !indexEntry.isActive) {
        return null;
      }

      const result = {
        tenantId: indexEntry.tenantId,
        userId: indexEntry.userId,
      };

      // 3. Guardar en cache de Redis (TTL: 1 hora)
      try {
        const cacheKey = `tenant_user:${normalizedEmail}`;
        await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
      } catch (error) {
        this.logger.warn(`Error writing to Redis cache: ${error.message}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error finding tenant by email in index: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Agregar o actualizar entrada en el índice
   * Se llama cuando se crea o actualiza un usuario en una BD de tenant
   */
  async upsertUser(email: string, tenantId: string, userId: string, isActive: boolean = true): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      await prisma.tenantUserIndex.upsert({
        where: { email: normalizedEmail },
        update: {
          tenantId,
          userId,
          isActive,
          updatedAt: new Date(),
        },
        create: {
          email: normalizedEmail,
          tenantId,
          userId,
          isActive,
        },
      });

      // Actualizar cache
      const cacheKey = `tenant_user:${normalizedEmail}`;
      await this.redis.setex(
        cacheKey,
        3600,
        JSON.stringify({ tenantId, userId }),
      );

      this.logger.debug(`Index updated for email: ${normalizedEmail} -> tenant: ${tenantId}`);
    } catch (error: any) {
      this.logger.error(`Error upserting user in index: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Eliminar entrada del índice
   * Se llama cuando se elimina un usuario de una BD de tenant
   */
  async removeUser(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      await prisma.tenantUserIndex.delete({
        where: { email: normalizedEmail },
      });

      // Eliminar de cache
      const cacheKey = `tenant_user:${normalizedEmail}`;
      await this.redis.del(cacheKey);

      this.logger.debug(`Index entry removed for email: ${normalizedEmail}`);
    } catch (error: any) {
      // Si no existe, no es error
      if (error.code !== 'P2025') {
        this.logger.error(`Error removing user from index: ${error.message}`, error);
      }
    }
  }

  /**
   * Desactivar usuario en el índice (sin eliminarlo)
   */
  async deactivateUser(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      await prisma.tenantUserIndex.update({
        where: { email: normalizedEmail },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Eliminar de cache (forzar refresh en próxima búsqueda)
      const cacheKey = `tenant_user:${normalizedEmail}`;
      await this.redis.del(cacheKey);

      this.logger.debug(`User deactivated in index: ${normalizedEmail}`);
    } catch (error: any) {
      if (error.code !== 'P2025') {
        this.logger.error(`Error deactivating user in index: ${error.message}`, error);
      }
    }
  }

  /**
   * Sincronizar índice completo desde una BD de tenant
   * Útil para migraciones o reparación del índice
   */
  async syncTenantUsers(tenantId: string): Promise<number> {
    try {
      // Obtener información del tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          dbName: true,
          dbHost: true,
          dbPort: true,
          dbUsername: true,
          dbPasswordEncrypted: true,
        },
      });

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      // Conectar a BD del tenant y obtener todos los usuarios
      const { PrismaClient } = await import('@prisma/tenant');
      const dbPassword = this.decryptPassword(tenant.dbPasswordEncrypted);
      const databaseUrl = `postgresql://${tenant.dbUsername}:${encodeURIComponent(dbPassword)}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;

      const tenantClient = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });

      await tenantClient.$connect();

      const users = await tenantClient.user.findMany({
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      });

      // Sincronizar con índice
      let synced = 0;
      for (const user of users) {
        await this.upsertUser(user.email, tenantId, user.id, user.isActive);
        synced++;
      }

      await tenantClient.$disconnect();

      this.logger.log(`Synced ${synced} users from tenant ${tenantId}`);
      return synced;
    } catch (error: any) {
      this.logger.error(`Error syncing tenant users: ${error.message}`, error);
      throw error;
    }
  }

  private decryptPassword(encryptedPassword: string): string {
    const crypto = require('crypto');
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

