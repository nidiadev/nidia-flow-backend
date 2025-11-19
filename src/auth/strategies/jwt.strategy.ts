import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import prisma from '../../lib/prisma';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    try {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
      });
      // Log para verificar que la estrategia se está registrando
      console.log('✅ JwtStrategy inicializada con nombre "jwt"');
      console.log('🔍 Prisma disponible:', !!prisma);
    } catch (error) {
      console.error('❌ Error al inicializar JwtStrategy:', error);
      throw error;
    }
  }

  async validate(payload: JwtPayload) {
    // Si es usuario de tenant (tenant_user), validar en BD del tenant
    if (payload.systemRole === 'tenant_user') {
      // Para usuarios de tenant, confiar en el JWT ya que validamos en login
      // No necesitamos consultar la BD en cada request (mejora performance)
      // Solo validamos que el payload tenga la información necesaria
      if (!payload.tenantId || !payload.dbName) {
        throw new UnauthorizedException('Invalid token: missing tenant information');
      }
      
      return {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        systemRole: payload.systemRole,
        role: payload.role || 'user', // Incluir role del JWT
        permissions: payload.permissions || [], // Incluir permissions del JWT
        firstName: null, // No disponible en JWT para tenant_user
        lastName: null, // No disponible en JWT para tenant_user
      };
    }

    // Para usuarios de SuperAdmin (super_admin, tenant_admin), validar en SuperAdmin DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
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
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Account is locked');
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      systemRole: user.systemRole,
      role: payload.role || (user.systemRole === 'super_admin' ? 'super_admin' : 'admin'), // Incluir role del JWT o inferir
      permissions: payload.permissions || [], // Incluir permissions del JWT
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}