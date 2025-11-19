import { Injectable, Logger, Scope, OnModuleInit, OnModuleDestroy, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import * as path from 'path';
import prisma from '../../lib/prisma';
import * as crypto from 'crypto';

let TenantPrismaClientClass: any;
try {
  TenantPrismaClientClass = require('@prisma/tenant').PrismaClient;
} catch {
  const tenantPrismaPath = path.resolve(process.cwd(), 'generated', 'tenant-prisma');
  TenantPrismaClientClass = require(tenantPrismaPath).PrismaClient;
}

type TenantPrismaClient = InstanceType<typeof TenantPrismaClientClass>;

interface TenantContext {
  tenantId: string;
  userId: string;
  dbName: string;
  role?: string;
}

/**
 * TenantPrismaService - Cliente Prisma para bases de datos de tenants
 * 
 * CONTEXTO: TENANT ONLY
 * Este servicio se conecta a la base de datos específica del tenant actual
 * La base de datos se determina desde el JWT (dbName)
 * 
 * IMPORTANTE: Cada tenant tiene su propia base de datos aislada
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaService.name);
  private tenantContext: TenantContext | null = null;
  private static dedicatedClients: Map<string, TenantPrismaClient> = new Map();

  constructor() {
    this.logger.log('TenantPrismaService initialized');
  }

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

  async onModuleInit() {}

  async onModuleDestroy() {}

  setTenantContext(context: TenantContext): void {
    this.tenantContext = context;
    this.logger.debug(`Tenant context set: ${context.tenantId} (DB: ${context.dbName})`);
  }

  getTenantContext(): TenantContext | null {
    return this.tenantContext;
  }

  async getTenantClient(): Promise<TenantPrismaClient> {
    if (!this.tenantContext) {
      throw new InternalServerErrorException('Tenant context not set. Cannot get Prisma client.');
    }

    const { tenantId, dbName } = this.tenantContext;

    if (!dbName) {
      throw new InternalServerErrorException(`Tenant ${tenantId} missing dbName`);
    }

    if (!TenantPrismaService.dedicatedClients.has(tenantId)) {
      this.logger.log(`🔌 [getTenantClient] Creando nueva conexión para tenant ${tenantId}, dbName: ${dbName}`);
      const connectionString = await this.buildConnectionString(tenantId, dbName);
      
      this.logger.log(`🔌 [getTenantClient] Intentando conectar con Prisma...`);
      const client = new TenantPrismaClientClass({
        datasources: {
          db: {
            url: connectionString,
          },
        },
      });

      try {
        await client.$connect();
        this.logger.log(`✅ [getTenantClient] Prisma client conectado exitosamente para tenant ${tenantId} (${dbName})`);
        TenantPrismaService.dedicatedClients.set(tenantId, client);
      } catch (connectError: any) {
        this.logger.error(`❌ [getTenantClient] Error al conectar Prisma client:`, connectError);
        this.logger.error(`❌ [getTenantClient] Error code: ${connectError.code}, Error message: ${connectError.message}`);
        throw connectError;
      }
    } else {
      this.logger.debug(`♻️ [getTenantClient] Reutilizando conexión existente para tenant ${tenantId}`);
    }

    return TenantPrismaService.dedicatedClients.get(tenantId)!;
  }

  async executeTransaction<T>(
    callback: (client: TenantPrismaClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getTenantClient();
    return client.$transaction(async (tx) => {
      return callback(tx as any);
    });
  }

  async executeRawQuery<T = any>(query: string, params?: any[]): Promise<T> {
    const client = await this.getTenantClient();
    
    if (params && params.length > 0) {
      return await (client.$queryRawUnsafe as any)(query, ...params) as T;
    }
    return await (client.$queryRawUnsafe as any)(query) as T;
  }

  async getClient(tenantId: string): Promise<TenantPrismaClient> {
    if (this.tenantContext && this.tenantContext.tenantId === tenantId) {
      return this.getTenantClient();
    }
    
    throw new InternalServerErrorException(`Cannot get client for tenant ${tenantId} without context`);
  }

  private async buildConnectionString(tenantId: string, dbName: string): Promise<string> {
    try {
      this.logger.log(`🔍 [buildConnectionString] Obteniendo credenciales para tenant ${tenantId}, dbName: ${dbName}`);
      
      // Obtener credenciales del tenant desde SuperAdmin DB
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          dbHost: true,
          dbPort: true,
          dbUsername: true,
          dbPasswordEncrypted: true,
        },
      });

      if (!tenant) {
        this.logger.error(`❌ Tenant ${tenantId} not found in SuperAdmin database`);
        throw new InternalServerErrorException(`Tenant ${tenantId} not found in SuperAdmin database`);
      }

      this.logger.log(`📋 [buildConnectionString] Credenciales obtenidas: host=${tenant.dbHost}, port=${tenant.dbPort}, username=${tenant.dbUsername}, hasPassword=${!!tenant.dbPasswordEncrypted}`);

      if (!tenant.dbHost || !tenant.dbPort || !tenant.dbUsername || !tenant.dbPasswordEncrypted) {
        // Fallback a variables de entorno si no hay credenciales específicas
        this.logger.warn(`⚠️ Tenant ${tenantId} missing database credentials, using environment variables`);
        const host = process.env.TENANT_DB_HOST || process.env.DATABASE_HOST || 'localhost';
        const port = process.env.TENANT_DB_PORT || process.env.DATABASE_PORT || '5432';
        const user = process.env.TENANT_DB_USERNAME || process.env.DATABASE_USER || 'postgres';
        const password = process.env.TENANT_DB_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres';
        // Codificar credenciales para la URL
        const encodedUser = encodeURIComponent(user);
        const encodedPassword = encodeURIComponent(password);
        const connectionString = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${dbName}?schema=public`;
        this.logger.log(`🔗 [buildConnectionString] Usando fallback: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);
        return connectionString;
      }

      // Descifrar la contraseña
      let password: string;
      try {
        password = this.decryptPassword(tenant.dbPasswordEncrypted);
        this.logger.log(`✅ [buildConnectionString] Contraseña descifrada exitosamente (length: ${password.length})`);
      } catch (decryptError) {
        this.logger.error(`❌ [buildConnectionString] Error al descifrar contraseña:`, decryptError);
        // Si falla el descifrado, intentar usar la contraseña directamente (puede estar sin cifrar en dev)
        this.logger.warn(`⚠️ Intentando usar contraseña sin descifrar (modo desarrollo)`);
        password = tenant.dbPasswordEncrypted;
      }

      // CRITICAL: Codificar username y password para la URL (pueden tener caracteres especiales)
      const encodedUsername = encodeURIComponent(tenant.dbUsername);
      const encodedPassword = encodeURIComponent(password);
      
      const connectionString = `postgresql://${encodedUsername}:${encodedPassword}@${tenant.dbHost}:${tenant.dbPort}/${dbName}?schema=public`;
      // Log connection string sin la contraseña por seguridad
      const maskedConnectionString = connectionString.replace(/:[^:@]+@/, ':***@');
      this.logger.log(`🔗 [buildConnectionString] Connection string construida: ${maskedConnectionString}`);
      this.logger.debug(`🔗 [buildConnectionString] Username codificado: ${encodedUsername}, Password length: ${password.length}`);
      
      return connectionString;
    } catch (error) {
      this.logger.error(`❌ [buildConnectionString] Error building connection string for tenant ${tenantId}:`, error);
      // Fallback a variables de entorno en caso de error
      const host = process.env.TENANT_DB_HOST || process.env.DATABASE_HOST || 'localhost';
      const port = process.env.TENANT_DB_PORT || process.env.DATABASE_PORT || '5432';
      const user = process.env.TENANT_DB_USERNAME || process.env.DATABASE_USER || 'postgres';
      const password = process.env.TENANT_DB_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres';
      // Codificar credenciales para la URL
      const encodedUser = encodeURIComponent(user);
      const encodedPassword = encodeURIComponent(password);
      const connectionString = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${dbName}?schema=public`;
      this.logger.log(`🔗 [buildConnectionString] Usando fallback por error: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);
      return connectionString;
    }
  }

  async getTenantDatabaseStats(tenantId?: string): Promise<any> {
    const targetTenantId = tenantId || this.tenantContext?.tenantId;
    if (!targetTenantId) {
      return { error: 'Tenant ID required' };
    }

    try {
      const client = await this.getTenantClient();
      const stats = {
        tenantId: targetTenantId,
        dbName: this.tenantContext?.dbName || 'unknown',
        connectionHealth: {
          isConnected: true,
          lastChecked: new Date(),
        },
      };

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get stats for tenant ${targetTenantId}:`, error);
      return {
        tenantId: targetTenantId,
        error: error.message,
        connectionHealth: {
          isConnected: false,
          lastChecked: new Date(),
        },
      };
    }
  }

  getConnectionsHealth(): any {
    return {
      dedicated: {
        count: TenantPrismaService.dedicatedClients.size,
        tenants: Array.from(TenantPrismaService.dedicatedClients.keys()),
      },
    };
  }

  getActiveConnectionsCount(): number {
    return TenantPrismaService.dedicatedClients.size;
  }

  getTenantHealth(tenantId: string): any {
    const isConnected = TenantPrismaService.dedicatedClients.has(tenantId);

    return {
      isConnected,
      lastChecked: new Date(),
      error: isConnected ? null : 'Not connected',
    };
  }

  static async disconnectAll(): Promise<void> {
    for (const [tenantId, client] of TenantPrismaService.dedicatedClients.entries()) {
      await client.$disconnect();
    }
    TenantPrismaService.dedicatedClients.clear();
  }
}
