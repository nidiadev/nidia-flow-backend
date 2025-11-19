export interface JwtPayload {
  sub: string; // User ID (puede ser de SuperAdmin DB o Tenant DB)
  email: string;
  tenantId?: string; // SIEMPRE presente para usuarios de tenant (nunca null)
  tenantSlug?: string; // Slug del tenant para URLs amigables (ej: "mi-empresa")
  dbName?: string; // SIEMPRE presente para usuarios de tenant: "tenant_{uuid}_{env}"
  systemRole: string; // 'super_admin' | 'tenant_admin' | 'tenant_user' | 'support'
  role?: string; // Rol dentro del tenant: 'admin' | 'manager' | 'sales' | etc (solo para tenant_user)
  permissions?: string[]; // Permisos específicos del usuario
  iat?: number;
  exp?: number;
}