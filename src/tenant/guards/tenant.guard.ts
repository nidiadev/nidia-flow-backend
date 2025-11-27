import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantService } from '../tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private reflector: Reflector,
    private tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const authHeader = request.headers?.authorization;

    this.logger.debug(`[TENANT_GUARD] Checking tenant access for: ${request.method} ${request.url}`);
    this.logger.debug(`[TENANT_GUARD] User present: ${!!user}, Auth header: ${!!authHeader}`);

    if (!user) {
      this.logger.warn('[TENANT_GUARD] User not authenticated');
      this.logger.warn(`[TENANT_GUARD] Request details: ${request.method} ${request.url}`);
      this.logger.warn(`[TENANT_GUARD] Auth header: ${authHeader ? 'present' : 'missing'}`);
      this.logger.warn(`[TENANT_GUARD] Request.user: ${JSON.stringify(request.user)}`);
      throw new ForbiddenException('User not authenticated');
    }

    // Super admins can access any tenant
    if (user.systemRole === 'super_admin') {
      this.logger.debug('[TENANT_GUARD] Super admin bypassing tenant check');
      return true;
    }

    // Tenant admins and tenant users can use their tenantId from JWT
    if ((user.systemRole === 'tenant_admin' || user.systemRole === 'tenant_user') && user.tenantId) {
      this.logger.debug(`[TENANT_GUARD] Using tenantId from JWT: ${user.tenantId}`);
      request.tenantId = user.tenantId;
      return true;
    }

    // Get tenant ID from various sources
    const tenantId = this.extractTenantId(request);
    
    if (!tenantId) {
      this.logger.warn(`[TENANT_GUARD] Tenant ID not found. User: ${user.email}, systemRole: ${user.systemRole}, user.tenantId: ${user.tenantId}`);
      throw new BadRequestException('Tenant ID not provided');
    }

    // Validate tenant access
    await this.validateTenantAccess(user, tenantId);

    // Store tenant ID in request for later use
    request.tenantId = tenantId;

    return true;
  }

  private extractTenantId(request: any): string | null {
    // Try to get tenant ID from different sources in order of preference
    
    // 1. From route parameters
    if (request.params?.tenantId) {
      return request.params.tenantId;
    }

    // 2. From query parameters
    if (request.query?.tenantId) {
      return request.query.tenantId;
    }

    // 3. From request body
    if (request.body?.tenantId) {
      return request.body.tenantId;
    }

    // 4. From custom header
    if (request.headers['x-tenant-id']) {
      return request.headers['x-tenant-id'];
    }

    // 5. From subdomain (if using subdomain routing)
    if (request.headers.host) {
      const subdomain = this.extractSubdomain(request.headers.host);
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain; // This would need to be resolved to tenant ID
      }
    }

    // 6. From user's tenant (for tenant admins)
    if (request.user?.tenantId) {
      return request.user.tenantId;
    }

    return null;
  }

  private extractSubdomain(host: string): string | null {
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    return null;
  }

  private async validateTenantAccess(user: any, tenantId: string): Promise<void> {
    // NIDIA staff can access any tenant
    if (['super_admin', 'support', 'billing_admin'].includes(user.systemRole)) {
      return;
    }

    // Tenant admins and tenant users can only access their own tenant
    if (user.systemRole === 'tenant_admin' || user.systemRole === 'tenant_user') {
      if (user.tenantId !== tenantId) {
        throw new ForbiddenException('Access denied to this tenant');
      }
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}