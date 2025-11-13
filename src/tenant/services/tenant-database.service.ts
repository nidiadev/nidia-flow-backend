import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient as SuperAdminPrismaClient } from '@prisma/superadmin';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantDatabaseService {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private readonly tenantClients = new Map<string, TenantPrismaClient>();
  private superAdminClient: SuperAdminPrismaClient;

  constructor(private configService: ConfigService) {
    // Initialize SuperAdmin client
    this.superAdminClient = new SuperAdminPrismaClient({
      datasources: {
        db: {
          url: this.configService.get<string>('DATABASE_URL'),
        },
      },
    });
  }

  /**
   * Get SuperAdmin Prisma client
   */
  getSuperAdminClient(): SuperAdminPrismaClient {
    return this.superAdminClient;
  }

  /**
   * Get or create a tenant Prisma client
   */
  async getTenantClient(tenantId: string): Promise<TenantPrismaClient> {
    // Check if client already exists in cache
    if (this.tenantClients.has(tenantId)) {
      return this.tenantClients.get(tenantId)!;
    }

    // Get tenant database connection info from SuperAdmin DB
    const tenant = await this.superAdminClient.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        dbName: true,
        dbHost: true,
        dbPort: true,
        dbUsername: true,
        dbPasswordEncrypted: true,
        isActive: true,
        isSuspended: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.isActive || tenant.isSuspended) {
      throw new BadRequestException(`Tenant is not active or suspended: ${tenantId}`);
    }

    // Create database URL for tenant
    const databaseUrl = this.buildTenantDatabaseUrl(tenant);

    // Create new Prisma client for tenant
    const tenantClient = new TenantPrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // Test connection
    try {
      await tenantClient.$connect();
      this.logger.log(`Connected to tenant database: ${tenant.slug}`);
    } catch (error) {
      this.logger.error(`Failed to connect to tenant database: ${tenant.slug}`, error);
      throw new BadRequestException(`Failed to connect to tenant database: ${tenant.slug}`);
    }

    // Cache the client
    this.tenantClients.set(tenantId, tenantClient);

    return tenantClient;
  }

  /**
   * Get tenant client by slug (for development)
   */
  async getTenantClientBySlug(slug: string): Promise<TenantPrismaClient> {
    const tenant = await this.superAdminClient.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      throw new BadRequestException(`Tenant not found with slug: ${slug}`);
    }

    return this.getTenantClient(tenant.id);
  }

  /**
   * Create a new tenant database
   */
  async createTenantDatabase(tenantData: {
    name: string;
    slug: string;
    dbName: string;
    adminEmail: string;
  }): Promise<{ tenantId: string; databaseUrl: string }> {
    // For development, we'll use the demo database configuration
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    
    if (isDevelopment) {
      // In development, use the pre-configured tenant database
      const databaseUrl = this.configService.get<string>('TENANT_DATABASE_URL');
      
      // Create tenant record in SuperAdmin DB
      const tenant = await this.superAdminClient.tenant.create({
        data: {
          name: tenantData.name,
          slug: tenantData.slug,
          dbName: tenantData.dbName,
          dbHost: 'localhost',
          dbPort: 5433,
          dbUsername: 'postgres',
          dbPasswordEncrypted: 'password', // In production, this should be encrypted
          billingEmail: tenantData.adminEmail,
          planType: 'basic',
          planStatus: 'active',
          isActive: true,
          provisionedAt: new Date(),
          enabledModules: ['crm', 'orders', 'tasks', 'accounting', 'reports'],
        },
      });

      this.logger.log(`Created tenant in development mode: ${tenant.slug}`);
      
      return {
        tenantId: tenant.id,
        databaseUrl: databaseUrl!,
      };
    }

    // In production, implement actual database provisioning
    throw new BadRequestException('Production tenant provisioning not implemented yet');
  }

  /**
   * Build database URL for tenant
   */
  private buildTenantDatabaseUrl(tenant: {
    dbHost: string;
    dbPort: number;
    dbUsername: string;
    dbPasswordEncrypted: string;
    dbName: string;
  }): string {
    // In development, use simple password (in production, decrypt the password)
    const password = tenant.dbPasswordEncrypted; // TODO: Implement decryption
    
    return `postgresql://${tenant.dbUsername}:${password}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
  }

  /**
   * Disconnect all tenant clients
   */
  async disconnectAll(): Promise<void> {
    this.logger.log('Disconnecting all tenant clients...');
    
    // Disconnect all tenant clients
    for (const [tenantId, client] of this.tenantClients.entries()) {
      try {
        await client.$disconnect();
        this.logger.log(`Disconnected tenant client: ${tenantId}`);
      } catch (error) {
        this.logger.error(`Error disconnecting tenant client ${tenantId}:`, error);
      }
    }
    
    // Clear the cache
    this.tenantClients.clear();
    
    // Disconnect SuperAdmin client
    try {
      await this.superAdminClient.$disconnect();
      this.logger.log('Disconnected SuperAdmin client');
    } catch (error) {
      this.logger.error('Error disconnecting SuperAdmin client:', error);
    }
  }

  /**
   * Get tenant info by ID
   */
  async getTenantInfo(tenantId: string) {
    return this.superAdminClient.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        planType: true,
        planStatus: true,
        isActive: true,
        isSuspended: true,
        enabledModules: true,
        maxUsers: true,
        currentUsers: true,
        maxStorageGb: true,
        currentStorageGb: true,
      },
    });
  }

  /**
   * Check if module is enabled for tenant
   */
  async isModuleEnabled(tenantId: string, moduleName: string): Promise<boolean> {
    const tenant = await this.getTenantInfo(tenantId);
    return tenant?.enabledModules.includes(moduleName) || false;
  }

  /**
   * Health check for tenant database
   */
  async healthCheck(tenantId: string): Promise<boolean> {
    try {
      const client = await this.getTenantClient(tenantId);
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`Health check failed for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Get demo tenant client (for development)
   */
  async getDemoTenantClient(): Promise<TenantPrismaClient> {
    const demoSlug = this.configService.get<string>('DEMO_TENANT_SLUG', 'demo-empresa');
    return this.getTenantClientBySlug(demoSlug);
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async onModuleDestroy() {
    await this.disconnectAll();
  }
}