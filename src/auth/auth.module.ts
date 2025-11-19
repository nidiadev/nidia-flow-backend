import { Module, forwardRef, Global, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PermissionsService } from './services/permissions.service';
import { PermissionResolverService } from './services/permission-resolver.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';

@Global() // Hacer AuthModule global para que PassportModule y JwtStrategy estén disponibles en todos los módulos
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // Registrar PassportModule con estrategia por defecto
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' }, // Access token expires in 15 minutes
    }),
    BullModule.registerQueue({
      name: 'tenant-provisioning',
    }),
    forwardRef(() => UsersModule), // Usar forwardRef para manejar dependencias circulares
    forwardRef(() => TenantModule), // Importar TenantModule para tener acceso a TenantService, TenantGuard y TenantModulesService
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy, // JwtStrategy debe estar en providers para que Passport lo registre
    PermissionsService,
    PermissionResolverService,
    PermissionsGuard,
    RolesGuard,
  ],
  controllers: [AuthController, PermissionsController],
  exports: [
    AuthService, 
    PermissionsService,
    PermissionResolverService,
    PermissionsGuard, 
    RolesGuard,
    PassportModule, // Exportar PassportModule para que otros módulos puedan usar las estrategias
    JwtStrategy, // Exportar JwtStrategy explícitamente
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(private jwtStrategy: JwtStrategy) {
    // Log inmediato para verificar que JwtStrategy se está inyectando
    console.log('🔍 AuthModule constructor - JwtStrategy inyectado:', !!this.jwtStrategy);
  }

  onModuleInit() {
    // Verificar que JwtStrategy se haya inicializado correctamente
    console.log('🔍 AuthModule inicializado, verificando JwtStrategy...');
    console.log('✅ JwtStrategy disponible:', !!this.jwtStrategy);
    if (this.jwtStrategy) {
      console.log('✅ JwtStrategy tipo:', this.jwtStrategy.constructor.name);
    } else {
      console.error('❌ JwtStrategy NO está disponible en AuthModule.onModuleInit');
    }
  }
}