import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionResolverService } from '../services/permission-resolver.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionResolver: PermissionResolverService,
  ) {}

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

    // Get user permissions (from role + individual permissions)
    const userPermissions = this.getUserPermissions(user);
    
    // Check if user has any of the required permissions (OR logic)
    // Uses the new PermissionResolverService for hierarchical permission checking
    const hasRequiredPermission = this.permissionResolver.hasAnyPermission(
      userPermissions,
      requiredPermissions,
    );

    if (!hasRequiredPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required one of: ${requiredPermissions.join(' or ')}`,
      );
    }

    return true;
  }

  private getUserPermissions(user: any): string[] {
    const permissions: string[] = [];

    // Add role-based permissions (for backward compatibility)
    // Note: In the future, roles should be stored in DB with their permissions
    const rolePermissions = this.getRolePermissions(user.role);
    permissions.push(...rolePermissions);

    // Add individual permissions (from user.permissions array)
    // These take precedence over role permissions
    if (user.permissions && Array.isArray(user.permissions)) {
      permissions.push(...user.permissions);
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  /**
   * Get default permissions for a role
   * This is for backward compatibility. In production, roles and their permissions
   * should be stored in the database and managed via the roles system.
   */
  private getRolePermissions(role: string): string[] {
    // Super admin and admin get all permissions including view_all
    if (role === 'admin' || role === 'super_admin') {
      return ['*', 'view_all', '*:view_all', 'dashboard:read', 'reports:read'];
    }

    // Default role permissions (can be overridden by individual user permissions)
    const rolePermissionMap: Record<string, string[]> = {
      manager: [
        'crm:read', 'crm:write', 'crm:export', 'crm:assign',
        'orders:read', 'orders:write', 'orders:assign', 'orders:approve',
        'tasks:read', 'tasks:write', 'tasks:assign', 'tasks:complete',
        'products:read', 'products:write', 'products:manage_inventory',
        'accounting:read', 'accounting:reports',
        'reports:read', 'reports:create', 'reports:export',
        'users:read', 'users:write', 'users:invite',
        'view_all', // Managers can view all data
      ],
      sales: [
        'crm:customers:read', 'crm:customers:write', 'crm:customers:export',
        'crm:interactions:read', 'crm:interactions:write',
        'orders:read', 'orders:write',
        'tasks:read', 'tasks:write',
        'products:read',
        'reports:read',
        // Note: sales does NOT have 'view_all', so they only see their own data
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
        'view_all', // Accountants can view all financial data
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