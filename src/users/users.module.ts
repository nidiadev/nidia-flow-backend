import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { SystemUsersService } from './system-users.service';
import { SystemUsersController } from './system-users.controller';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    forwardRef(() => TenantModule), // Usar forwardRef para evitar dependencia circular - TenantModule exporta PlanLimitsGuard
    forwardRef(() => AuthModule), // Importar AuthModule para tener acceso a JwtAuthGuard y otros guards
  ],
  providers: [
    UsersService, 
    RolesService, 
    SystemUsersService,
    // Agregar JwtAuthGuard explícitamente para asegurar que esté disponible
    // Aunque AuthModule es @Global(), los guards a veces necesitan estar explícitamente en providers
    JwtAuthGuard,
  ],
  controllers: [UsersController, RolesController, SystemUsersController],
  exports: [UsersService, RolesService, SystemUsersService],
})
export class UsersModule {}