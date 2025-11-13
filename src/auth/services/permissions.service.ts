import { Injectable } from '@nestjs/common';
import { Permission, getRolePermissions, hasPermission, hasAnyPermission, hasAllPermissions } from '../enums/permissions.enum';
import { SystemRole, TenantRole, hasRoleHierarchy, ROLE_HIERARCHY } from '../enums/roles.enum';

export interface UserPermissions {
  role: string;
  permissions: Permission[];
  canAccess: (permission: Permission) => boolean;
  canAccessAny: (permissions: Permission[]) => boolean;
  canAccessAll: (permissions: Permission[]) => boolean;
  hasRole: (role: string) => boolean;
  hasRoleOrHigher: (role: string) => boolean;
}

export interface RoleDefinition {
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  hierarchy: number;
  isSystemRole: boolean;
}

@Injectable()
export class PermissionsService {
  /**
   * Get user permissions based on their role
   */
  getUserPermissions(role: string): UserPermissions {
    const permissions = getRolePermissions(role);

    return {
      role,
      permissions,
      canAccess: (permission: Permission) => hasPermission(role, permission),
      canAccessAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
      canAccessAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
      hasRole: (checkRole: string) => role === checkRole,
      hasRoleOrHigher: (checkRole: string) => hasRoleHierarchy(role, checkRole),
    };
  }

  /**
   * Get all available roles with their definitions
   */
  getAllRoles(): RoleDefinition[] {
    return [
      // System Roles
      {
        name: SystemRole.SUPER_ADMIN,
        displayName: 'Super Administrador',
        description: 'Acceso completo al sistema NIDIA Flow',
        permissions: getRolePermissions(SystemRole.SUPER_ADMIN),
        hierarchy: ROLE_HIERARCHY[SystemRole.SUPER_ADMIN],
        isSystemRole: true,
      },
      {
        name: SystemRole.SUPPORT,
        displayName: 'Soporte NIDIA',
        description: 'Acceso de soporte para ayudar a los tenants',
        permissions: getRolePermissions(SystemRole.SUPPORT),
        hierarchy: ROLE_HIERARCHY[SystemRole.SUPPORT],
        isSystemRole: true,
      },
      {
        name: SystemRole.BILLING_ADMIN,
        displayName: 'Administrador de Facturación',
        description: 'Gestión de facturación y pagos',
        permissions: getRolePermissions(SystemRole.BILLING_ADMIN),
        hierarchy: ROLE_HIERARCHY[SystemRole.BILLING_ADMIN],
        isSystemRole: true,
      },
      {
        name: SystemRole.TENANT_ADMIN,
        displayName: 'Administrador de Tenant',
        description: 'Administrador principal de la empresa',
        permissions: getRolePermissions(SystemRole.TENANT_ADMIN),
        hierarchy: ROLE_HIERARCHY[SystemRole.TENANT_ADMIN],
        isSystemRole: true,
      },
      
      // Tenant Roles
      {
        name: TenantRole.ADMIN,
        displayName: 'Administrador',
        description: 'Administrador interno de la empresa con acceso completo',
        permissions: getRolePermissions(TenantRole.ADMIN),
        hierarchy: ROLE_HIERARCHY[TenantRole.ADMIN],
        isSystemRole: false,
      },
      {
        name: TenantRole.MANAGER,
        displayName: 'Gerente',
        description: 'Gerente con acceso a gestión y reportes',
        permissions: getRolePermissions(TenantRole.MANAGER),
        hierarchy: ROLE_HIERARCHY[TenantRole.MANAGER],
        isSystemRole: false,
      },
      {
        name: TenantRole.SALES,
        displayName: 'Ventas',
        description: 'Equipo de ventas con acceso a CRM y órdenes',
        permissions: getRolePermissions(TenantRole.SALES),
        hierarchy: ROLE_HIERARCHY[TenantRole.SALES],
        isSystemRole: false,
      },
      {
        name: TenantRole.OPERATOR,
        displayName: 'Operador',
        description: 'Operador de campo con acceso a tareas y operaciones',
        permissions: getRolePermissions(TenantRole.OPERATOR),
        hierarchy: ROLE_HIERARCHY[TenantRole.OPERATOR],
        isSystemRole: false,
      },
      {
        name: TenantRole.ACCOUNTANT,
        displayName: 'Contador',
        description: 'Contador con acceso a finanzas y reportes',
        permissions: getRolePermissions(TenantRole.ACCOUNTANT),
        hierarchy: ROLE_HIERARCHY[TenantRole.ACCOUNTANT],
        isSystemRole: false,
      },
      {
        name: TenantRole.VIEWER,
        displayName: 'Visualizador',
        description: 'Acceso de solo lectura a la información',
        permissions: getRolePermissions(TenantRole.VIEWER),
        hierarchy: ROLE_HIERARCHY[TenantRole.VIEWER],
        isSystemRole: false,
      },
    ];
  }

  /**
   * Get system roles only
   */
  getSystemRoles(): RoleDefinition[] {
    return this.getAllRoles().filter(role => role.isSystemRole);
  }

  /**
   * Get tenant roles only
   */
  getTenantRoles(): RoleDefinition[] {
    return this.getAllRoles().filter(role => !role.isSystemRole);
  }

  /**
   * Get role definition by name
   */
  getRoleDefinition(roleName: string): RoleDefinition | null {
    return this.getAllRoles().find(role => role.name === roleName) || null;
  }

  /**
   * Check if role exists
   */
  isValidRole(roleName: string): boolean {
    return this.getAllRoles().some(role => role.name === roleName);
  }

  /**
   * Check if role is system role
   */
  isSystemRole(roleName: string): boolean {
    const role = this.getRoleDefinition(roleName);
    return role?.isSystemRole || false;
  }

  /**
   * Check if role is tenant role
   */
  isTenantRole(roleName: string): boolean {
    const role = this.getRoleDefinition(roleName);
    return role ? !role.isSystemRole : false;
  }

  /**
   * Get roles that user can assign (same level or lower)
   */
  getAssignableRoles(userRole: string, isSystemContext: boolean = false): RoleDefinition[] {
    const userHierarchy = ROLE_HIERARCHY[userRole] || 0;
    const allRoles = isSystemContext ? this.getSystemRoles() : this.getTenantRoles();
    
    return allRoles.filter(role => role.hierarchy <= userHierarchy);
  }

  /**
   * Check if user can assign specific role
   */
  canAssignRole(userRole: string, targetRole: string): boolean {
    const userHierarchy = ROLE_HIERARCHY[userRole] || 0;
    const targetHierarchy = ROLE_HIERARCHY[targetRole] || 0;
    
    return userHierarchy >= targetHierarchy;
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Get permissions by category
   */
  getPermissionsByCategory(): Record<string, Permission[]> {
    const permissions = this.getAllPermissions();
    const categories: Record<string, Permission[]> = {};

    permissions.forEach(permission => {
      const category = permission.split(':')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(permission);
    });

    return categories;
  }

  /**
   * Validate permission format
   */
  isValidPermission(permission: string): boolean {
    return Object.values(Permission).includes(permission as Permission);
  }
}