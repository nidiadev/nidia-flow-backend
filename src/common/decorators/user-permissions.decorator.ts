import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract user permissions from request
 * Usage: @UserPermissions() permissions: string[]
 */
export const UserPermissions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return [];
    }

    const permissions: string[] = [];

    // Get permissions from role (for backward compatibility)
    // In production, these should come from the database
    const rolePermissions = getRolePermissions(user.role);
    permissions.push(...rolePermissions);

    // Add individual permissions (from user.permissions array)
    if (user.permissions && Array.isArray(user.permissions)) {
      permissions.push(...user.permissions);
    }

    return [...new Set(permissions)]; // Remove duplicates
  },
);

/**
 * Get default permissions for a role
 * This matches the logic in PermissionsGuard
 */
function getRolePermissions(role: string): string[] {
  if (role === 'admin') {
    return ['*', 'view_all', '*:view_all'];
  }

  const rolePermissionMap: Record<string, string[]> = {
    manager: [
      'crm:read', 'crm:write', 'crm:export', 'crm:assign',
      'orders:read', 'orders:write', 'orders:assign', 'orders:approve',
      'tasks:read', 'tasks:write', 'tasks:assign', 'tasks:complete',
      'products:read', 'products:write', 'products:manage_inventory',
      'accounting:read', 'accounting:reports',
      'reports:read', 'reports:create', 'reports:export',
      'users:read', 'users:write', 'users:invite',
      'view_all',
    ],
    sales: [
      'crm:customers:read', 'crm:customers:write', 'crm:customers:export',
      'crm:interactions:read', 'crm:interactions:write',
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
      'view_all',
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

