export interface JwtPayload {
  sub: string; // User ID en la BD del tenant (para operaciones en tenant DB)
  email: string;
  superAdminUserId?: string; // ID del usuario en SuperAdmin DB (para referencias y auditoría)
  tenantUserId?: string; // ID del usuario en Tenant DB (alias de sub, para claridad)
  tenantId?: string; // SIEMPRE presente para usuarios de tenant (nunca null)
  tenantSlug?: string; // Slug del tenant para URLs amigables (ej: "mi-empresa")
  dbName?: string; // SIEMPRE presente para usuarios de tenant: "tenant_{uuid}_{env}"
  systemRole: string; // 'super_admin' | 'tenant_admin' | 'tenant_user' | 'support'
  role?: string; // Rol dentro del tenant: 'admin' | 'manager' | 'sales' | etc (solo para tenant_user)
  permissions?: string[]; // Permisos específicos del usuario
  iat?: number;
  exp?: number;
}