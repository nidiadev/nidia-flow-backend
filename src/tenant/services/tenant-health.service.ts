import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import prisma from '../../lib/prisma';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: any;
  timestamp: Date;
  responseTime?: number;
}

export interface TenantHealthSummary {
  tenantId: string;
  slug: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastChecked: Date;
  connectionCount: number;
  responseTime?: number;
  error?: string;
}

@Injectable()
export class TenantHealthService {
  private readonly logger = new Logger(TenantHealthService.name);

  constructor(private readonly tenantPrismaService: TenantPrismaService) {}

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Check SuperAdmin database
    results.push(await this.checkSuperAdminDatabase());

    // Check tenant connections
    results.push(await this.checkTenantConnections());

    // Check system resources
    results.push(await this.checkSystemResources());

    return results;
  }

  /**
   * Check SuperAdmin database health
   */
  private async checkSuperAdminDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1 as health_check`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'superadmin_database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        message: `SuperAdmin database responding in ${responseTime}ms`,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'superadmin_database',
        status: 'unhealthy',
        message: `SuperAdmin database error: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check tenant connections health
   */
  private async checkTenantConnections(): Promise<HealthCheckResult> {
    try {
      const connectionsHealth = this.tenantPrismaService.getConnectionsHealth();
      const activeConnections = this.tenantPrismaService.getActiveConnectionsCount();
      
      const unhealthyConnections = connectionsHealth.filter(h => !h.isConnected);
      const healthyConnections = connectionsHealth.filter(h => h.isConnected);
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = `${activeConnections} active tenant connections`;
      
      if (unhealthyConnections.length > 0) {
        if (unhealthyConnections.length >= healthyConnections.length) {
          status = 'unhealthy';
          message = `${unhealthyConnections.length} unhealthy tenant connections`;
        } else {
          status = 'degraded';
          message = `${unhealthyConnections.length} unhealthy, ${healthyConnections.length} healthy connections`;
        }
      }

      return {
        service: 'tenant_connections',
        status,
        message,
        details: {
          activeConnections,
          healthyConnections: healthyConnections.length,
          unhealthyConnections: unhealthyConnections.length,
          connections: connectionsHealth,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'tenant_connections',
        status: 'unhealthy',
        message: `Tenant connections check failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<HealthCheckResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Convert bytes to MB
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };

      // Determine status based on memory usage
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = `System healthy - Uptime: ${Math.round(uptime / 60)}min, Memory: ${memoryUsageMB.heapUsed}MB`;

      if (memoryUsageMB.heapUsed > 1000) { // > 1GB
        status = 'degraded';
        message = `High memory usage: ${memoryUsageMB.heapUsed}MB`;
      }

      if (memoryUsageMB.heapUsed > 2000) { // > 2GB
        status = 'unhealthy';
        message = `Critical memory usage: ${memoryUsageMB.heapUsed}MB`;
      }

      return {
        service: 'system_resources',
        status,
        message,
        details: {
          uptime: Math.round(uptime),
          memoryUsage: memoryUsageMB,
          nodeVersion: process.version,
          platform: process.platform,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'system_resources',
        status: 'unhealthy',
        message: `System resources check failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get health summary for all tenants
   */
  async getTenantHealthSummary(): Promise<TenantHealthSummary[]> {
    try {
      // Get all active tenants
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          slug: true,
          lastActivityAt: true,
        },
      });

      const healthSummaries: TenantHealthSummary[] = [];

      for (const tenant of tenants) {
        const health = this.tenantPrismaService.getTenantHealth(tenant.id);
        
        healthSummaries.push({
          tenantId: tenant.id,
          slug: tenant.slug,
          status: health?.isConnected ? 'healthy' : 'unhealthy',
          lastChecked: health?.lastChecked || new Date(),
          connectionCount: health?.connectionCount || 0,
          error: health?.error,
        });
      }

      return healthSummaries;
    } catch (error) {
      this.logger.error('Failed to get tenant health summary', error.stack);
      return [];
    }
  }

  /**
   * Get detailed health info for specific tenant
   */
  async getTenantDetailedHealth(tenantId: string): Promise<any> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          slug: true,
          isActive: true,
          isSuspended: true,
          lastActivityAt: true,
          dbName: true,
          dbHost: true,
          dbPort: true,
        },
      });

      if (!tenant) {
        return {
          tenantId,
          status: 'not_found',
          message: 'Tenant not found',
        };
      }

      const connectionHealth = this.tenantPrismaService.getTenantHealth(tenantId);
      
      // Try to get database stats if connection is healthy
      let databaseStats = null;
      if (connectionHealth?.isConnected) {
        try {
          databaseStats = await this.tenantPrismaService.getTenantDatabaseStats(tenantId);
        } catch (error) {
          this.logger.warn(`Failed to get database stats for tenant ${tenantId}`, error.message);
        }
      }

      return {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          isActive: tenant.isActive,
          isSuspended: tenant.isSuspended,
          lastActivityAt: tenant.lastActivityAt,
          database: {
            name: tenant.dbName,
            host: tenant.dbHost,
            port: tenant.dbPort,
          },
        },
        connection: connectionHealth,
        database: databaseStats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get detailed health for tenant ${tenantId}`, error.stack);
      return {
        tenantId,
        status: 'error',
        message: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test connection to specific tenant
   */
  async testTenantConnection(tenantId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Get tenant info from SuperAdmin DB
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          dbName: true,
        },
      });

      if (!tenant || !tenant.dbName) {
        throw new Error(`Tenant ${tenantId} not found or missing dbName`);
      }

      // Set tenant context
      this.tenantPrismaService.setTenantContext({
        tenantId: tenant.id,
        userId: 'system', // System user for health checks
        dbName: tenant.dbName,
      });

      // Get client and test connection
      const client = await this.tenantPrismaService.getTenantClient();
      
      // Test with a simple query
      await client.$queryRaw`SELECT 1 as connection_test`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: `tenant_${tenantId}`,
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        message: `Tenant database responding in ${responseTime}ms`,
        responseTime,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        service: `tenant_${tenantId}`,
        status: 'unhealthy',
        message: `Tenant database error: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get overall system health status
   */
  async getOverallHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message: string;
    checks: HealthCheckResult[];
    summary: {
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  }> {
    const checks = await this.performHealthCheck();
    
    const summary = {
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    };

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let message = 'All systems operational';

    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
      message = `${summary.unhealthy} critical issues detected`;
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
      message = `${summary.degraded} performance issues detected`;
    }

    return {
      status: overallStatus,
      message,
      checks,
      summary,
    };
  }
}