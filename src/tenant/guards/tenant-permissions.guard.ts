import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';

/**
 * Decorator to require specific permissions
 * 
 * Usage:
 * @RequirePermissions('read:customers', 'write:customers')
 * @Get()
 * async getCustomers() { ... }
 */
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to require specific roles
 * 
 * Usage:
 * @RequireRoles('admin', 'manager')
 * @Delete(':id')
 * async deleteCustomer() { ... }
 */
export const RequireRoles = (...roles: string[]) => 
  SetMetadata(ROLES_KEY, roles);

@Injectable()
export class TenantPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions or roles are required, allow access
    if (!requiredPermissions && !requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('Tenant context not found');
    }

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(tenant.role);
      if (!hasRole) {
        throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
      }
    }

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = tenant.permissions || [];
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new ForbiddenException(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
      }
    }

    return true;
  }
}

/**
 * Permission constants for common operations
 */
export const PERMISSIONS = {
  // CRM Permissions
  CRM_READ: 'crm:read',
  CRM_WRITE: 'crm:write',
  CRM_DELETE: 'crm:delete',
  
  // Customer Permissions
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_WRITE: 'customers:write',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_ASSIGN: 'customers:assign',
  
  // Orders Permissions
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_ASSIGN: 'orders:assign',
  
  // Tasks Permissions
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',
  TASKS_DELETE: 'tasks:delete',
  TASKS_ASSIGN: 'tasks:assign',
  
  // Products Permissions
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  PRODUCTS_DELETE: 'products:delete',
  
  // Inventory Permissions
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  INVENTORY_ADJUST: 'inventory:adjust',
  
  // Financial Permissions
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  FINANCE_DELETE: 'finance:delete',
  
  // Reports Permissions
  REPORTS_READ: 'reports:read',
  REPORTS_WRITE: 'reports:write',
  REPORTS_EXPORT: 'reports:export',
  
  // Settings Permissions
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  
  // Users Permissions
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_INVITE: 'users:invite',
  
  // Admin Permissions
  ADMIN_ALL: 'admin:all',
} as const;

/**
 * Role constants
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
  OPERATOR: 'operator',
  ACCOUNTANT: 'accountant',
  VIEWER: 'viewer',
} as const;

/**
 * Default permissions by role
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.ADMIN_ALL,
    // All permissions for admin
    ...Object.values(PERMISSIONS),
  ],
  
  [ROLES.MANAGER]: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.CUSTOMERS_ASSIGN,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.ORDERS_ASSIGN,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.TASKS_ASSIGN,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_WRITE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.USERS_INVITE,
  ],
  
  [ROLES.SALES]: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.REPORTS_READ,
  ],
  
  [ROLES.OPERATOR]: [
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.INVENTORY_READ,
  ],
  
  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_WRITE,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  
  [ROLES.VIEWER]: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.REPORTS_READ,
  ],
};