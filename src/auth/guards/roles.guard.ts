import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole, TenantRole, hasRoleHierarchy } from '../enums/roles.enum';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public - if so, skip role validation
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user's effective role
    const userRole = this.getUserEffectiveRole(user, request);

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some(role => {
      // Direct role match
      if (userRole === role) {
        return true;
      }

      // Hierarchy check - if user has higher role
      return hasRoleHierarchy(userRole, role);
    });

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Insufficient role. Required one of: ${requiredRoles.join(', ')}. Current: ${userRole}`,
      );
    }

    return true;
  }

  private getUserEffectiveRole(user: any, request: any): string {
    // For system operations, use system role
    if (this.isSystemOperation(request)) {
      return user.systemRole;
    }

    // For tenant operations, use tenant role if available, otherwise system role
    if (request.tenantId) {
      // If user has tenant role and belongs to the same tenant
      if (user.tenantRole && user.tenantId === request.tenantId) {
        return user.tenantRole;
      }
      
      // If user is tenant admin for this tenant
      if (user.systemRole === SystemRole.TENANT_ADMIN && user.tenantId === request.tenantId) {
        return user.systemRole;
      }
      
      // System roles (super_admin, support) can access any tenant
      if ([SystemRole.SUPER_ADMIN, SystemRole.SUPPORT].includes(user.systemRole)) {
        return user.systemRole;
      }
    }

    // Fallback to system role
    return user.systemRole;
  }

  private isSystemOperation(request: any): boolean {
    const systemPaths = [
      '/api/v1/admin',
      '/api/v1/system',
      '/api/v1/tenants',
      '/api/v1/billing',
    ];

    return systemPaths.some(path => request.path.startsWith(path));
  }
}