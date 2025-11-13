export interface JwtPayload {
  sub: string; // User ID
  email: string;
  tenantId?: string;
  systemRole: string;
  iat?: number;
  exp?: number;
}