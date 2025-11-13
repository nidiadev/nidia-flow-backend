import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get permission requirements from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // No permission requirements, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin role bypasses all permission checks
    if (user.role === 'admin') {
      return true;
    }

    // Get user permissions (from role + individual permissions)
    const userPermissions = this.getUserPermissions(user);
    
    // Check if user has any of the required permissions
    const hasRequiredPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(' or ')}`,
      );
    }

    return true;
  }

  private getUserPermissions(user: any): string[] {
    const permissions: string[] = [];

    // Add role-based permissions
    const rolePermissions = this.getRolePermissions(user.role);
    permissions.push(...rolePermissions);

    // Add individual permissions
    if (user.permissions && Array.isArray(user.permissions)) {
      permissions.push(...user.permissions);
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissionMap: Record<string, string[]> = {
      admin: [
        'crm:read', 'crm:write', 'crm:delete', 'crm:export', 'crm:assign',
        'orders:read', 'orders:write', 'orders:delete', 'orders:assign', 'orders:approve',
        'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign', 'tasks:complete',
        'products:read', 'products:write', 'products:delete', 'products:manage_inventory',
        'accounting:read', 'accounting:write', 'accounting:delete', 'accounting:reports',
        'reports:read', 'reports:create', 'reports:schedule', 'reports:export',
        'users:read', 'users:write', 'users:delete', 'users:invite', 'users:manage_roles',
        'settings:read', 'settings:write', 'settings:integrations',
      ],
      manager: [
        'crm:read', 'crm:write', 'crm:export', 'crm:assign',
        'orders:read', 'orders:write', 'orders:assign', 'orders:approve',
        'tasks:read', 'tasks:write', 'tasks:assign', 'tasks:complete',
        'products:read', 'products:write', 'products:manage_inventory',
        'accounting:read', 'accounting:reports',
        'reports:read', 'reports:create', 'reports:export',
        'users:read', 'users:write', 'users:invite',
      ],
      sales: [
        'crm:read', 'crm:write', 'crm:export',
        'orders:read', 'orders:write',
        'tasks:read', 'tasks:write',
        'products:read',
        'reports:read',
      ],
      operator: [
        'crm:read',
        'orders:read',
        'tasks:read', 'tasks:write', 'tasks:complete',
        'products:read',
      ],
      accountant: [
        'crm:read',
        'orders:read',
        'accounting:read', 'accounting:write', 'accounting:reports',
        'reports:read', 'reports:create', 'reports:export',
      ],
      viewer: [
        'crm:read',
        'orders:read',
        'tasks:read',
        'products:read',
        'accounting:read',
        'reports:read',
      ],
    };

    return rolePermissionMap[role] || [];
  }
}