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
    // Usar Prisma directamente para evitar dependencias circulares
    // Esto consulta la SuperAdmin DB donde están los usuarios del sistema
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
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}