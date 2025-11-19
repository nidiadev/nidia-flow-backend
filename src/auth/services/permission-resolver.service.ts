import { Injectable } from '@nestjs/common';

/**
 * Service to resolve and validate granular permissions
 * Supports hierarchical permission checking:
 * - module:action (e.g., 'crm:read') grants access to all submodules
 * - module:submodule:action (e.g., 'crm:customers:read') grants access to specific submodule
 * 
 * This system is scalable: new modules/submodules work automatically
 */
@Injectable()
export class PermissionResolverService {
  /**
   * Check if a user has a specific permission
   * Supports hierarchical checking:
   * - If user has 'crm:read', they have 'crm:customers:read'
   * - If user has 'crm:customers:read', they only have that specific permission
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Admin always has all permissions
    if (userPermissions.includes('*') || userPermissions.includes('admin:*')) {
      return true;
    }

    // Exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Parse permission structure: module:submodule:action or module:action
    const parts = requiredPermission.split(':');
    
    if (parts.length === 2) {
      // module:action (e.g., 'crm:read')
      const [module, action] = parts;
      
      // Check for general module permission
      if (userPermissions.includes(`${module}:*`)) {
        return true;
      }
      
      // Check for specific action on module
      if (userPermissions.includes(`${module}:${action}`)) {
        return true;
      }
    } else if (parts.length === 3) {
      // module:submodule:action (e.g., 'crm:customers:read')
      const [module, submodule, action] = parts;
      
      // Check for general module permission (e.g., 'crm:read' grants 'crm:customers:read')
      if (userPermissions.includes(`${module}:*`) || userPermissions.includes(`${module}:${action}`)) {
        return true;
      }
      
      // Check for specific submodule permission
      if (userPermissions.includes(`${module}:${submodule}:*`) || 
          userPermissions.includes(`${module}:${submodule}:${action}`)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any of the required permissions (OR logic)
   */
  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(userPermissions, permission));
  }

  /**
   * Check if user has all required permissions (AND logic)
   */
  hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => this.hasPermission(userPermissions, permission));
  }

  /**
   * Get all permissions for a specific module
   * Useful for UI to show/hide features
   */
  getModulePermissions(userPermissions: string[], module: string): {
    read: boolean;
    write: boolean;
    delete: boolean;
    [key: string]: boolean;
  } {
    const actions = ['read', 'write', 'delete', 'export', 'assign', 'approve', 'manage'];
    const result: Record<string, boolean> = {};

    actions.forEach(action => {
      result[action] = this.hasPermission(userPermissions, `${module}:${action}`);
    });

    return result as { read: boolean; write: boolean; delete: boolean; [key: string]: boolean };
  }

  /**
   * Get permissions for a specific submodule
   */
  getSubModulePermissions(
    userPermissions: string[],
    module: string,
    submodule: string,
  ): {
    read: boolean;
    write: boolean;
    delete: boolean;
    [key: string]: boolean;
  } {
    const actions = ['read', 'write', 'delete', 'export', 'assign', 'approve', 'manage'];
    const result: Record<string, boolean> = {};

    actions.forEach(action => {
      // Check specific submodule permission
      const specific = this.hasPermission(userPermissions, `${module}:${submodule}:${action}`);
      // Check general module permission
      const general = this.hasPermission(userPermissions, `${module}:${action}`);
      
      result[action] = specific || general;
    });

    return result as { read: boolean; write: boolean; delete: boolean; [key: string]: boolean };
  }

  /**
   * Extract module and submodule from permission string
   */
  parsePermission(permission: string): {
    module: string;
    submodule?: string;
    action: string;
  } {
    const parts = permission.split(':');
    
    if (parts.length === 2) {
      return { module: parts[0], action: parts[1] };
    } else if (parts.length === 3) {
      return { module: parts[0], submodule: parts[1], action: parts[2] };
    }
    
    throw new Error(`Invalid permission format: ${permission}`);
  }

  /**
   * Check if user can view all data (admin-like permission)
   * Users with 'view_all' or '*:view_all' can see all data regardless of ownership
   */
  canViewAllData(userPermissions: string[]): boolean {
    return this.hasPermission(userPermissions, 'view_all') || 
           this.hasPermission(userPermissions, '*:view_all') ||
           userPermissions.includes('*') ||
           userPermissions.includes('admin:*');
  }

  /**
   * Check if user can only view their own data
   * Users without 'view_all' can only see data they own (assignedTo or createdBy)
   */
  canOnlyViewOwnData(userPermissions: string[]): boolean {
    return !this.canViewAllData(userPermissions);
  }
}

