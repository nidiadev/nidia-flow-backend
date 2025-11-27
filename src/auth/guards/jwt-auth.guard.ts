import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
    // Log para verificar que el guard se está instanciando
    this.logger.debug('JwtAuthGuard instance created');
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    this.logger.debug(`[JWT_AUTH] canActivate called for: ${request.method} ${request.url}`);
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      this.logger.debug(`[JWT_AUTH] Route is public, skipping authentication`);
      return true;
    }
    
    this.logger.debug(`[JWT_AUTH] Route requires authentication, calling super.canActivate`);
    const result = super.canActivate(context);
    
    // Log if result is a Promise
    if (result instanceof Promise) {
      this.logger.debug(`[JWT_AUTH] canActivate returned a Promise`);
      return result;
    }
    
    this.logger.debug(`[JWT_AUTH] canActivate returned: ${result}`);
    return result;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    
    this.logger.debug(`[JWT_AUTH] Validating request: ${request.method} ${request.url}`);
    this.logger.debug(`[JWT_AUTH] Auth header present: ${!!authHeader}`);
    
    if (err) {
      this.logger.error(`[JWT_AUTH] Error validating token: ${err.message}`, err.stack);
      throw err || new UnauthorizedException('Invalid token');
    }
    
    if (!user) {
      this.logger.warn(`[JWT_AUTH] No user found. Info: ${info?.message || JSON.stringify(info)}`);
      this.logger.warn(`[JWT_AUTH] Auth header: ${authHeader ? 'present' : 'missing'}`);
      throw new UnauthorizedException('User not authenticated');
    }
    
    // CRÍTICO: Asegurar que el usuario se establece en request.user
    // Passport debería hacerlo automáticamente, pero lo hacemos explícitamente para garantizar
    request.user = user;
    
    this.logger.debug(`[JWT_AUTH] User authenticated: ${user.email} (${user.systemRole}), userId: ${user.id}`);
    return user;
  }
}