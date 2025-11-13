import { Injectable, Logger, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private readonly logger = new Logger(TenantPrismaService.name);

  constructor() {
    this.logger.log('TenantPrismaService initialized in simple mode');
  }

  // Simplified methods that return null for now
  setTenantContext(context: any): void {
    this.logger.warn('setTenantContext called - ignoring in simple mode');
  }

  getTenantContext(): any {
    this.logger.warn('getTenantContext called - returning null in simple mode');
    return null;
  }

  async getTenantClient(): Promise<any> {
    this.logger.warn('getTenantClient called - returning null in simple mode');
    return null;
  }

  async getClient(tenantId: string): Promise<any> {
    this.logger.warn(`getClient called with ${tenantId} - returning null in simple mode`);
    return null;
  }

  async getTenantClientById(tenantId: string): Promise<any> {
    this.logger.warn(`getTenantClientById called with ${tenantId} - returning null in simple mode`);
    return null;
  }

  async executeTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    this.logger.warn('executeTransaction called - throwing error in simple mode');
    throw new Error('Multi-tenant operations not available in simple mode');
  }

  async executeRawQuery<T = any>(query: string, params?: any[]): Promise<T> {
    this.logger.warn('executeRawQuery called - throwing error in simple mode');
    throw new Error('Multi-tenant operations not available in simple mode');
  }

  async getTenantDatabaseStats(tenantId?: string): Promise<any> {
    this.logger.warn('getTenantDatabaseStats called - returning empty stats in simple mode');
    return {
      tenantId: tenantId || 'unknown',
      stats: [],
      connectionHealth: { isConnected: false, lastChecked: new Date() }
    };
  }

  // Additional methods expected by other services
  getConnectionsHealth(): any {
    this.logger.warn('getConnectionsHealth called - returning empty in simple mode');
    return {};
  }

  getActiveConnectionsCount(): number {
    this.logger.warn('getActiveConnectionsCount called - returning 0 in simple mode');
    return 0;
  }

  getTenantHealth(tenantId: string): any {
    this.logger.warn(`getTenantHealth called with ${tenantId} - returning healthy in simple mode`);
    return { isConnected: true, lastChecked: new Date(), error: null };
  }
}