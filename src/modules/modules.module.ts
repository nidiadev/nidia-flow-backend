import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { SubModulesController } from './submodules.controller';
import { SubModulesService } from './submodules.service';
import { TenantAssignmentsController } from './tenant-assignments.controller';
import { TenantAssignmentsService } from './tenant-assignments.service';

@Module({
  controllers: [ModulesController, SubModulesController, TenantAssignmentsController],
  providers: [ModulesService, SubModulesService, TenantAssignmentsService],
  exports: [ModulesService, SubModulesService, TenantAssignmentsService],
})
export class ModulesModule {}

