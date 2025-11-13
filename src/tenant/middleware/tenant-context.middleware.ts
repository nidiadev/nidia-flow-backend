import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantPrismaService } from '../services/tenant-prisma.service';

interface JwtPayload {
  sub?: string; // User ID (from JwtStrategy)
  userId?: string;
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
    userId: string;
    dbName: string;
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
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Skip tenant resolution for certain paths
      if (this.shouldSkipTenantResolution(req.path)) {
        return next();
      }

      // Extract JWT token from Authorization header
      const token = this.extractTokenFromHeader(req);
      if (!token) {
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
      const userId = payload.sub || payload.userId;
      if (!userId || !payload.tenantId || !payload.dbName) {
        throw new UnauthorizedException('Invalid token payload: missing required fields for tenant context');
      }
      
      // Set tenant context in request
      req.tenant = {
        tenantId: payload.tenantId,
        userId: userId,
        dbName: payload.dbName,
        role: payload.role || 'user',
        permissions: payload.permissions || [],
      };

      // Set tenant context in TenantPrismaService
      this.tenantPrismaService.setTenantContext({
        tenantId: payload.tenantId,
        userId: userId,
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
    const skipPaths = [
      '/health',
      '/metrics',
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/superadmin',
      '/docs',
      '/swagger',
    ];

    // Also skip for /tenants endpoint when accessed by superadmin (handled in use method)
    // This is a fallback in case the path check happens before token verification
    return skipPaths.some(skipPath => path.startsWith(skipPath));
  }
}