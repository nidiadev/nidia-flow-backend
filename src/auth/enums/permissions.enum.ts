/**
 * Available permissions in the system
 */
export enum Permission {
  // System Administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_SUPPORT = 'system:support',
  SYSTEM_BILLING = 'system:billing',
  
  // Tenant Management
  TENANT_CREATE = 'tenant:create',
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  TENANT_SUSPEND = 'tenant:suspend',
  
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ASSIGN_ROLES = 'user:assign_roles',
  
  // Customer Management (CRM)
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_READ = 'customer:read',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_DELETE = 'customer:delete',
  CUSTOMER_ASSIGN = 'customer:assign',
  CUSTOMER_EXPORT = 'customer:export',
  
  // Product Management
  PRODUCT_CREATE = 'product:create',
  PRODUCT_READ = 'product:read',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_MANAGE_INVENTORY = 'product:manage_inventory',
  
  // Order Management
  ORDER_CREATE = 'order:create',
  ORDER_READ = 'order:read',
  ORDER_UPDATE = 'order:update',
  ORDER_DELETE = 'order:delete',
  ORDER_APPROVE = 'order:approve',
  ORDER_CANCEL = 'order:cancel',
  
  // Task Management
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',
  TASK_COMPLETE = 'task:complete',
  
  // Financial Management
  PAYMENT_CREATE = 'payment:create',
  PAYMENT_READ = 'payment:read',
  PAYMENT_UPDATE = 'payment:update',
  PAYMENT_DELETE = 'payment:delete',
  PAYMENT_APPROVE = 'payment:approve',
  
  // Accounting
  ACCOUNTING_READ = 'accounting:read',
  ACCOUNTING_CREATE = 'accounting:create',
  ACCOUNTING_UPDATE = 'accounting:update',
  ACCOUNTING_REPORTS = 'accounting:reports',
  
  // Reports and Analytics
  REPORTS_VIEW = 'reports:view',
  REPORTS_CREATE = 'reports:create',
  REPORTS_EXPORT = 'reports:export',
  ANALYTICS_VIEW = 'analytics:view',
  
  // Settings and Configuration
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
  SETTINGS_INTEGRATIONS = 'settings:integrations',
  
  // Communication
  COMMUNICATION_SEND = 'communication:send',
  COMMUNICATION_TEMPLATES = 'communication:templates',
  COMMUNICATION_HISTORY = 'communication:history',
}

/**
 * Role-based permission mapping
 */
export const ROLE_PERMISSIONS = {
  // System Roles
  super_admin: [
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_SUPPORT,
    Permission.SYSTEM_BILLING,
    Permission.TENANT_CREATE,
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.TENANT_DELETE,
    Permission.TENANT_SUSPEND,
    // All other permissions
    ...Object.values(Permission),
  ],
  
  support: [
    Permission.SYSTEM_SUPPORT,
    Permission.TENANT_READ,
    Permission.USER_READ,
    Permission.CUSTOMER_READ,
    Permission.ORDER_READ,
    Permission.TASK_READ,
    Permission.REPORTS_VIEW,
  ],
  
  billing_admin: [
    Permission.SYSTEM_BILLING,
    Permission.TENANT_READ,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_CREATE,
    Permission.PAYMENT_UPDATE,
    Permission.ACCOUNTING_READ,
    Permission.ACCOUNTING_REPORTS,
    Permission.REPORTS_VIEW,
  ],
  
  tenant_admin: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_ASSIGN_ROLES,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.REPORTS_VIEW,
    Permission.ANALYTICS_VIEW,
    // All tenant-level permissions
    ...Object.values(Permission).filter(p => 
      !p.startsWith('system:') && !p.startsWith('tenant:')
    ),
  ],
  
  // Tenant Internal Roles
  admin: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_ASSIGN_ROLES,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_DELETE,
    Permission.CUSTOMER_ASSIGN,
    Permission.CUSTOMER_EXPORT,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.PRODUCT_MANAGE_INVENTORY,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_DELETE,
    Permission.ORDER_APPROVE,
    Permission.ORDER_CANCEL,
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,
    Permission.TASK_COMPLETE,
    Permission.PAYMENT_CREATE,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_UPDATE,
    Permission.PAYMENT_APPROVE,
    Permission.ACCOUNTING_READ,
    Permission.ACCOUNTING_CREATE,
    Permission.ACCOUNTING_UPDATE,
    Permission.ACCOUNTING_REPORTS,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_CREATE,
    Permission.REPORTS_EXPORT,
    Permission.ANALYTICS_VIEW,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.SETTINGS_INTEGRATIONS,
    Permission.COMMUNICATION_SEND,
    Permission.COMMUNICATION_TEMPLATES,
    Permission.COMMUNICATION_HISTORY,
  ],
  
  manager: [
    Permission.USER_READ,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_ASSIGN,
    Permission.CUSTOMER_EXPORT,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_MANAGE_INVENTORY,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_APPROVE,
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_ASSIGN,
    Permission.TASK_COMPLETE,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_CREATE,
    Permission.ACCOUNTING_READ,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_CREATE,
    Permission.ANALYTICS_VIEW,
    Permission.COMMUNICATION_SEND,
    Permission.COMMUNICATION_HISTORY,
  ],
  
  sales: [
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_ASSIGN,
    Permission.PRODUCT_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.COMMUNICATION_SEND,
    Permission.COMMUNICATION_HISTORY,
    Permission.REPORTS_VIEW,
  ],
  
  operator: [
    Permission.CUSTOMER_READ,
    Permission.PRODUCT_READ,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_COMPLETE,
    Permission.PRODUCT_MANAGE_INVENTORY,
    Permission.COMMUNICATION_SEND,
  ],
  
  accountant: [
    Permission.CUSTOMER_READ,
    Permission.ORDER_READ,
    Permission.PAYMENT_CREATE,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_UPDATE,
    Permission.ACCOUNTING_READ,
    Permission.ACCOUNTING_CREATE,
    Permission.ACCOUNTING_UPDATE,
    Permission.ACCOUNTING_REPORTS,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_CREATE,
    Permission.REPORTS_EXPORT,
  ],
  
  viewer: [
    Permission.CUSTOMER_READ,
    Permission.PRODUCT_READ,
    Permission.ORDER_READ,
    Permission.TASK_READ,
    Permission.PAYMENT_READ,
    Permission.ACCOUNTING_READ,
    Permission.REPORTS_VIEW,
  ],
};

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role has specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}