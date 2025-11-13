import { SetMetadata } from '@nestjs/common';
import { SystemRole, TenantRole } from '../enums/roles.enum';

/**
 * Decorator to set required roles for endpoints
 */
export const RequireRoles = (...roles: (SystemRole | TenantRole | string)[]) =>
  SetMetadata('roles', roles);

/**
 * Decorator for super admin only endpoints
 */
export const SuperAdminOnly = () => RequireRoles(SystemRole.SUPER_ADMIN);

/**
 * Decorator for support staff endpoints
 */
export const SupportOnly = () => RequireRoles(SystemRole.SUPER_ADMIN, SystemRole.SUPPORT);

/**
 * Decorator for billing admin endpoints
 */
export const BillingAdminOnly = () => RequireRoles(SystemRole.SUPER_ADMIN, SystemRole.BILLING_ADMIN);

/**
 * Decorator for tenant admin or higher endpoints
 */
export const TenantAdminOrHigher = () => RequireRoles(
  SystemRole.SUPER_ADMIN,
  SystemRole.SUPPORT,
  SystemRole.TENANT_ADMIN,
  TenantRole.ADMIN,
);

/**
 * Decorator for manager or higher endpoints
 */
export const ManagerOrHigher = () => RequireRoles(
  SystemRole.SUPER_ADMIN,
  SystemRole.SUPPORT,
  SystemRole.TENANT_ADMIN,
  TenantRole.ADMIN,
  TenantRole.MANAGER,
);

/**
 * Decorator for sales team endpoints
 */
export const SalesTeam = () => RequireRoles(
  SystemRole.SUPER_ADMIN,
  SystemRole.TENANT_ADMIN,
  TenantRole.ADMIN,
  TenantRole.MANAGER,
  TenantRole.SALES,
);

/**
 * Decorator for operations team endpoints
 */
export const OperationsTeam = () => RequireRoles(
  SystemRole.SUPER_ADMIN,
  SystemRole.TENANT_ADMIN,
  TenantRole.ADMIN,
  TenantRole.MANAGER,
  TenantRole.OPERATOR,
);

/**
 * Decorator for accounting team endpoints
 */
export const AccountingTeam = () => RequireRoles(
  SystemRole.SUPER_ADMIN,
  SystemRole.BILLING_ADMIN,
  SystemRole.TENANT_ADMIN,
  TenantRole.ADMIN,
  TenantRole.MANAGER,
  TenantRole.ACCOUNTANT,
);