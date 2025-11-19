import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { SystemUsersService } from './system-users.service';
import { SystemUsersController } from './system-users.controller';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [forwardRef(() => TenantModule)], // Usar forwardRef para evitar dependencia circular - TenantModule exporta PlanLimitsGuard
  providers: [UsersService, RolesService, SystemUsersService],
  controllers: [UsersController, RolesController, SystemUsersController],
  exports: [UsersService, RolesService, SystemUsersService],
})
export class UsersModule {}