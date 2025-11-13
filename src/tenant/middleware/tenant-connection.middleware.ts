import { Injectable, NestMiddleware, Logger, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../tenant.service';

// Extend Express Request interface to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      tenantConnection?: any;
      tenant?: any;
    }
  }
}

@Injectable()
export class TenantConnectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantConnectionMiddleware.name);

  constructor(private tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Skip tenant resolution for certain paths
      if (this.shouldSkipTenantResolution(req.path)) {
        return next();
      }

      // Extract tenant identifier
      const tenantIdentifier = this.extractTenantIdentifier(req);
      
      if (!tenantIdentifier) {
        // For some endpoints, tenant is optional
        if (this.isTenantOptional(req.path)) {
          return next();
        }
        
        throw new BadRequestException('Tenant identifier not provided');
      }

      // Resolve tenant
      const tenant = await this.resolveTenant(tenantIdentifier);
      
      if (!tenant) {
        throw new BadRequestException('Tenant not found');
      }

      // Check tenant status
      if (!tenant.isActive || tenant.isSuspended) {
        throw new BadRequestException('Tenant is not active');
      }

      // Set tenant context in request
      req.tenantId = tenant.id;
      req.tenantSlug = tenant.slug;
      req.tenant = tenant;

      // Get tenant database connection (lazy loading)
      // Connection will be established when first accessed
      let cachedConnection: any = null;
      Object.defineProperty(req, 'tenantConnection', {
        get: async () => {
          if (!cachedConnection) {
            cachedConnection = await this.tenantService.getTenantConnection(tenant.id);
          }
          return cachedConnection;
        },
        configurable: true,
      });

      this.logger.debug(`Tenant context set: ${tenant.slug} (${tenant.id})`);
      next();

    } catch (error) {
      this.logger.error(`Tenant middleware error: ${error.message}`);
      next(error);
    }
  }

  private extractTenantIdentifier(req: Request): string | null {
    // 1. From subdomain
    if (req.headers.host) {
      const subdomain = this.extractSubdomain(req.headers.host);
      if (subdomain && !['www', 'api', 'admin'].includes(subdomain)) {
        return subdomain;
      }
    }

    // 2. From custom header
    if (req.headers['x-tenant-slug']) {
      return req.headers['x-tenant-slug'] as string;
    }

    // 3. From route parameters
    if (req.params?.tenantSlug) {
      return req.params.tenantSlug;
    }

    // 4. From query parameters
    if (req.query?.tenant) {
      return req.query.tenant as string;
    }

    return null;
  }

  private extractSubdomain(host: string): string | null {
    // Remove port if present
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');
    
    // For localhost development
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      return null;
    }

    // For domains like tenant.nidiaflow.com
    if (parts.length >= 3) {
      return parts[0];
    }

    return null;
  }

  private async resolveTenant(identifier: string): Promise<any> {
    // Try to resolve by slug first
    let tenant = await this.tenantService.getTenantBySlug(identifier);
    
    if (!tenant) {
      // Try to resolve by domain
      tenant = await this.tenantService.getTenantByDomain(identifier);
    }

    return tenant;
  }

  private shouldSkipTenantResolution(path: string): boolean {
    const skipPaths = [
      '/api/v1/auth',
      '/api/v1/health',
      '/api/docs',
      '/api/v1/system',
      '/api/v1/admin', // SuperAdmin endpoints
    ];

    return skipPaths.some(skipPath => path.startsWith(skipPath));
  }

  private isTenantOptional(path: string): boolean {
    const optionalPaths = [
      '/api/v1/tenants', // Tenant management endpoints
      '/api/v1/users/me', // User profile endpoints
    ];

    return optionalPaths.some(optionalPath => path.startsWith(optionalPath));
  }
}