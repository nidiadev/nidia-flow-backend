import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';

interface JwtPayload {
  sub?: string; // User ID en la BD del tenant (para operaciones en tenant DB)
  userId?: string; // Alias de sub (legacy)
  superAdminUserId?: string; // ID del usuario en SuperAdmin DB
  tenantUserId?: string; // ID del usuario en Tenant DB (alias de sub)
  tenantId?: string | null;
  dbName?: string;
  role?: string;
  systemRole?: string; // For superadmins
  permissions?: string[];
  iat?: number;
  exp?: number;
}

interface TenantRequest extends Request {
  tenant?: {
    tenantId: string;
    userId: string | undefined; // ID del usuario en la BD del tenant (undefined si tenant_admin sin usuario en BD del tenant)
    superAdminUserId?: string; // ID del usuario en SuperAdmin DB (para referencias)
    dbName: string; // SIEMPRE presente: "tenant_{slug}_prod"
    role: string;
    permissions: string[];
  };
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantPrismaService: TenantPrismaService,
    private readonly tenantService: TenantService,
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Normalize path (remove /api/v1 prefix if present)
      const normalizedPath = req.path.replace(/^\/api\/v1/, '') || req.path;
      
      // Skip tenant resolution for certain paths (check both normalized and original path)
      // IMPORTANTE: No saltar rutas que empiezan con /dashboard, /crm, /tenant, etc.
      // Solo saltar rutas exactas o rutas de sistema
      if (this.shouldSkipTenantResolution(normalizedPath) || this.shouldSkipTenantResolution(req.path)) {
        // Verificar que no sea una ruta de tenant (dashboard, crm, etc.)
        if (!normalizedPath.startsWith('/dashboard') && 
            !normalizedPath.startsWith('/crm') && 
            !normalizedPath.startsWith('/tenant') &&
            !normalizedPath.startsWith('/orders') &&
            !normalizedPath.startsWith('/products') &&
            !normalizedPath.startsWith('/users')) {
        this.logger.debug(`Skipping tenant resolution for path: ${req.path} (normalized: ${normalizedPath})`);
        return next();
        }
      }

      // Extract JWT token from Authorization header
      const token = this.extractTokenFromHeader(req);
      if (!token) {
        // For public endpoints, allow without token
        if (normalizedPath.includes('/public') || req.path.includes('/public')) {
          this.logger.debug(`Allowing public endpoint without token: ${req.path}`);
          return next();
        }
        throw new UnauthorizedException('No authentication token provided');
      }

      // Verify and decode JWT
      const payload = await this.verifyToken(token);
      
      // Skip tenant resolution for superadmins - they don't have tenantId
      if (payload.systemRole === 'super_admin') {
        this.logger.debug(`Skipping tenant resolution for superadmin user: ${payload.sub || payload.userId}`);
        return next();
      }

      // Validate required fields for non-superadmin users
      // SOLUCIÓN DEFINITIVA: Para tenant_admin, usar tenantUserId del payload (no sub, que es SuperAdmin ID)
      // Para tenant_user, sub es el tenantUserId
      let tenantUserId: string | undefined;
      if (payload.systemRole === 'tenant_user') {
        // Para tenant_user, sub es el tenantUserId
        tenantUserId = payload.sub || payload.tenantUserId;
      } else {
        // Para tenant_admin, usar tenantUserId del payload (nunca sub, que es SuperAdmin ID)
        tenantUserId = payload.tenantUserId;
      }
      
      const superAdminUserId = payload.superAdminUserId;
      
      // Para tenant_admin sin usuario en BD del tenant, tenantUserId puede ser undefined
      // Esto es válido si el usuario tiene view_all (se manejará en los servicios)
      // Pero aún necesitamos tenantId y dbName para establecer el contexto
      if (!payload.tenantId || !payload.dbName) {
        throw new UnauthorizedException('Invalid token payload: missing required fields (tenantId, dbName) for tenant context');
      }
      
      // Si no hay tenantUserId y no es tenant_admin con view_all, es un error
      // Pero esto se validará en los servicios que lo requieran
      
      // Validar formato de dbName: debe ser "tenant_{uuid}_{env}" (UUID sin guiones)
      if (!payload.dbName.startsWith('tenant_') || (!payload.dbName.endsWith('_prod') && !payload.dbName.endsWith('_dev') && !payload.dbName.endsWith('_development') && !payload.dbName.endsWith('_production'))) {
        throw new UnauthorizedException(`Invalid dbName format: ${payload.dbName}. Expected format: tenant_{uuid}_{env}`);
      }
      
      // Calcular permisos para tenant_admin (deben incluir siempre '*')
      let effectivePermissions = payload.permissions || [];
      
      // Si es tenant_admin o super_admin, asegurar que tenga '*'
      if (payload.systemRole === 'tenant_admin' || payload.systemRole === 'super_admin') {
        if (!effectivePermissions.includes('*')) {
          effectivePermissions = ['*', 'view_all', '*:view_all', ...effectivePermissions];
        }
      }
      
      // Set tenant context in request
      // userId debe ser el ID del usuario en la BD del tenant (para operaciones en tenant DB)
      // Si tenantUserId es undefined (tenant_admin sin usuario en BD del tenant), usar undefined
      req.tenant = {
        tenantId: payload.tenantId,
        userId: tenantUserId, // ID del usuario en la BD del tenant (undefined si no existe)
        superAdminUserId: superAdminUserId, // ID del usuario en SuperAdmin (para referencias)
        dbName: payload.dbName,
        role: payload.role || 'user',
        permissions: effectivePermissions, // Usar permisos calculados, no solo del JWT
      };
      
      this.logger.debug(`[TENANT_CONTEXT] Permissions set: ${effectivePermissions.slice(0, 5).join(', ')}${effectivePermissions.length > 5 ? '...' : ''} (${effectivePermissions.length} total)`);

      // Set tenant context in TenantPrismaService
      // Usar tenantUserId para operaciones en la BD del tenant
      this.tenantPrismaService.setTenantContext({
        tenantId: payload.tenantId,
        userId: tenantUserId, // ID del usuario en la BD del tenant (undefined si no existe)
        dbName: payload.dbName,
        role: payload.role || 'user',
      });

      this.logger.debug(`Tenant context set for request: ${payload.tenantId} (${payload.role})`);
      
      next();
    } catch (error) {
      this.logger.error('Failed to resolve tenant context', error.stack);
      
      if (error instanceof UnauthorizedException) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'TENANT_RESOLUTION_FAILED',
          message: 'Failed to resolve tenant context',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Extract JWT token from Authorization header
   */
  private extractTokenFromHeader(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verify JWT token and extract payload
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Basic validation - at least userId or sub must be present
      if (!payload.sub && !payload.userId) {
        throw new UnauthorizedException('Invalid token payload: missing user identifier');
      }

      return payload as JwtPayload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      } else {
        throw new UnauthorizedException('Token verification failed');
      }
    }
  }

  /**
   * Check if tenant resolution should be skipped for this path
   */
  private shouldSkipTenantResolution(path: string): boolean {
    // Rutas exactas que deben saltarse (no rutas que contengan estas cadenas)
    const exactSkipPaths = [
      '/health',
      '/metrics', // Solo /metrics (Prometheus), NO /dashboard/metrics
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/superadmin',
      '/docs',
      '/swagger',
      '/tenants/validate-slug',
    ];
    
    // Verificar match exacto
    if (exactSkipPaths.includes(path)) {
      return true;
    }
    
    // Rutas que empiezan con estos prefijos también se saltan
    const prefixSkipPaths = [
      '/plans/public',
      '/api/v1/plans/public',
      '/modules/public',
      '/api/v1/modules/public',
      '/plans',
      '/api/v1/plans',
    ];

    // Verificar si el path empieza con alguno de los prefijos
    for (const prefix of prefixSkipPaths) {
      if (path.startsWith(prefix)) {
        return true;
      }
    }
    
    return false;
  }
}