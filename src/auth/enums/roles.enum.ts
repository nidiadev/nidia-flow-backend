/**
 * System roles for SuperAdmin access
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  SUPPORT = 'support',
  BILLING_ADMIN = 'billing_admin',
  TENANT_ADMIN = 'tenant_admin',
}

/**
 * Tenant internal roles for business operations
 */
export enum TenantRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  OPERATOR = 'operator',
  ACCOUNTANT = 'accountant',
  VIEWER = 'viewer',
}

/**
 * All available roles
 */
export const ALL_ROLES = {
  ...SystemRole,
  ...TenantRole,
};

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY = {
  [SystemRole.SUPER_ADMIN]: 1000,
  [SystemRole.SUPPORT]: 900,
  [SystemRole.BILLING_ADMIN]: 800,
  [SystemRole.TENANT_ADMIN]: 700,
  [TenantRole.ADMIN]: 600,
  [TenantRole.MANAGER]: 500,
  [TenantRole.SALES]: 400,
  [TenantRole.OPERATOR]: 300,
  [TenantRole.ACCOUNTANT]: 200,
  [TenantRole.VIEWER]: 100,
};

/**
 * Check if role has higher or equal hierarchy level
 */
export function hasRoleHierarchy(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}