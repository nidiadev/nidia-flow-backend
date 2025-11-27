import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionResolverService } from '../services/permission-resolver.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

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
    
    this.logger.debug(`[PERMISSIONS] User: ${user.email}, systemRole: ${user.systemRole}, role: ${user.role}`);
    this.logger.debug(`[PERMISSIONS] Required: ${requiredPermissions.join(', ')}`);
    this.logger.debug(`[PERMISSIONS] User has: ${userPermissions.slice(0, 10).join(', ')}${userPermissions.length > 10 ? '...' : ''} (${userPermissions.length} total)`);
    
    // Check if user has any of the required permissions (OR logic)
    // Uses the new PermissionResolverService for hierarchical permission checking
    const hasRequiredPermission = this.permissionResolver.hasAnyPermission(
      userPermissions,
      requiredPermissions,
    );

    if (!hasRequiredPermission) {
      this.logger.warn(`[PERMISSIONS] Access denied for ${user.email}. Required: ${requiredPermissions.join(' or ')}, Has: ${userPermissions.length} permissions`);
      throw new ForbiddenException(
        `Insufficient permissions. Required one of: ${requiredPermissions.join(' or ')}`,
      );
    }

    this.logger.debug(`[PERMISSIONS] Access granted for ${user.email}`);

    return true;
  }

  private getUserPermissions(user: any): string[] {
    const permissions: string[] = [];

    // For system roles (super_admin, tenant_admin), use systemRole
    // For tenant users, use role from tenant DB
    // IMPORTANTE: Si systemRole no está definido, inferir desde role o tenantId
    let systemRole = user.systemRole;
    if (!systemRole) {
      // Compatibilidad hacia atrás: si no hay systemRole pero hay tenantId, es tenant_admin
      if (user.tenantId) {
        systemRole = 'tenant_admin';
        this.logger.warn(`[PERMISSIONS] Token antiguo detectado para ${user.email}, inferiendo systemRole=tenant_admin desde tenantId`);
      } else {
        systemRole = user.role || 'user';
      }
    }

    const roleToCheck = systemRole === 'tenant_admin' || systemRole === 'super_admin' 
      ? systemRole 
      : (user.role || systemRole);

    this.logger.debug(`[PERMISSIONS] Resolved systemRole: ${systemRole}, roleToCheck: ${roleToCheck}`);

    // Add role-based permissions (for backward compatibility)
    // Note: In the future, roles should be stored in DB with their permissions
    const rolePermissions = this.getRolePermissions(roleToCheck);
    permissions.push(...rolePermissions);

    // Add individual permissions (from user.permissions array or JWT)
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
    // Super admin and tenant_admin get all permissions including view_all
    if (role === 'admin' || role === 'super_admin' || role === 'tenant_admin') {
      return [
        '*', 'view_all', '*:view_all', 
        'dashboard:read', 'reports:read',
        'users:read', 'users:write', 'users:create', 'users:update', 'users:delete', 'users:invite',
        'crm:read', 'crm:write', 'crm:create', 'crm:update', 'crm:delete',
        'orders:read', 'orders:write', 'orders:create', 'orders:update', 'orders:delete',
        'tasks:read', 'tasks:write', 'tasks:create', 'tasks:update', 'tasks:delete',
        'products:read', 'products:write', 'products:create', 'products:update', 'products:delete',
        'accounting:read', 'accounting:write', 'accounting:create', 'accounting:update',
      ];
    }

    // Default role permissions (can be overridden by individual user permissions)
    const rolePermissionMap: Record<string, string[]> = {
      manager: [
        'crm:read', 'crm:write', 'crm:export', 'crm:assign',
        'crm:deals:read', 'crm:deals:write',
        'crm:interactions:read', 'crm:interactions:write',
        'crm:customers:read', 'crm:customers:write',
        'crm:segments:read', 'crm:segments:write',
        'crm:scoring:read', 'crm:scoring:write',
        'crm:workflows:read', 'crm:workflows:write',
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
        'crm:deals:read', 'crm:deals:write',
        'crm:interactions:read', 'crm:interactions:write',
        'crm:segments:read',
        'crm:scoring:read',
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