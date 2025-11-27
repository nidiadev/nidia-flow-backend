import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import prisma from '../../lib/prisma';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    try {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
      });
      // Log para verificar que la estrategia se está registrando
      // Usar console.log aquí porque this.logger puede no estar disponible inmediatamente después de super()
      console.log('✅ JwtStrategy inicializada con nombre "jwt"');
      console.log('🔍 Prisma disponible:', !!prisma);
      console.log('🔍 JWT_SECRET configurado:', !!process.env.JWT_SECRET);
    } catch (error) {
      // Usar console.error porque this.logger no está disponible si super() falla
      console.error('❌ Error al inicializar JwtStrategy:', error);
      throw error;
    }
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`[JWT_STRATEGY] Validating token for: ${payload.email} (${payload.systemRole})`);
    
    // Si es usuario de tenant (tenant_user), validar en BD del tenant
    if (payload.systemRole === 'tenant_user') {
      this.logger.debug(`[JWT_STRATEGY] Validating tenant_user: ${payload.email}`);
      // Para usuarios de tenant, confiar en el JWT ya que validamos en login
      // No necesitamos consultar la BD en cada request (mejora performance)
      // Solo validamos que el payload tenga la información necesaria
      if (!payload.tenantId || !payload.dbName) {
        throw new UnauthorizedException('Invalid token: missing tenant information');
      }
      
      return {
        id: payload.sub, // ID del usuario en la BD del tenant
        email: payload.email,
        tenantId: payload.tenantId,
        systemRole: payload.systemRole,
        role: payload.role || 'user', // Incluir role del JWT
        permissions: payload.permissions || [], // Incluir permissions del JWT
        superAdminUserId: payload.superAdminUserId, // Incluir SuperAdmin ID si existe
        tenantUserId: payload.tenantUserId || payload.sub, // ID del usuario en Tenant DB
        firstName: null, // No disponible en JWT para tenant_user
        lastName: null, // No disponible en JWT para tenant_user
      };
    }

    // Para usuarios de SuperAdmin (super_admin, tenant_admin), validar en SuperAdmin DB
    // Usar superAdminUserId si está disponible, de lo contrario usar sub (para compatibilidad con tokens antiguos)
    const superAdminUserId = payload.superAdminUserId || payload.sub;
    this.logger.debug(`[JWT_STRATEGY] Validating SuperAdmin user: ${payload.email}, userId: ${superAdminUserId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: superAdminUserId },
      select: {
        id: true,
        email: true,
        tenantId: true,
        systemRole: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isLocked: true,
      },
    });
    
    if (!user) {
      this.logger.warn(`[JWT_STRATEGY] User not found: ${superAdminUserId}`);
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      this.logger.warn(`[JWT_STRATEGY] User account deactivated: ${user.email}`);
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.isLocked) {
      this.logger.warn(`[JWT_STRATEGY] User account locked: ${user.email}`);
      throw new UnauthorizedException('Account is locked');
    }

    // Asegurar que tenant_admin y super_admin siempre tengan '*' en sus permisos
    let effectivePermissions = payload.permissions || [];
    if ((user.systemRole === 'tenant_admin' || user.systemRole === 'super_admin') && !effectivePermissions.includes('*')) {
      effectivePermissions = ['*', 'view_all', '*:view_all', ...effectivePermissions];
      this.logger.debug(`[JWT_STRATEGY] Added '*' permissions for ${user.systemRole}`);
    }
    
    this.logger.debug(`[JWT_STRATEGY] User validated successfully: ${user.email} (${user.systemRole})`);
    
    // Para tenant_admin, tenantUserId puede venir del payload o ser el mismo que sub si existe en tenant DB
    // Si no hay tenantUserId en payload, intentar usar sub (que ahora siempre es superAdminUserId para tenant_admin)
    // pero para queries en tenant DB, necesitamos el tenantUserId real
    const tenantUserId = payload.tenantUserId || 
                         (user.systemRole === 'tenant_admin' && payload.sub !== payload.superAdminUserId ? payload.sub : undefined);
    
    return {
      id: user.id, // ID del usuario en SuperAdmin DB
      email: user.email,
      tenantId: user.tenantId,
      systemRole: user.systemRole,
      role: payload.role || (user.systemRole === 'super_admin' ? 'super_admin' : 'admin'), // Incluir role del JWT o inferir
      permissions: effectivePermissions, // Incluir permissions del JWT con '*' garantizado para admins
      superAdminUserId: user.id, // Para usuarios de SuperAdmin, ambos IDs son el mismo
      tenantUserId: tenantUserId, // ID del usuario en Tenant DB (si existe, undefined para tenant_admin sin usuario en tenant DB)
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}