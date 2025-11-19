import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskChecklistService } from './task-checklist.service';
import { TaskDependencyService } from './task-dependency.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [forwardRef(() => TenantModule)],
  controllers: [TasksController],
  providers: [TasksService, TaskChecklistService, TaskDependencyService],
  exports: [TasksService, TaskChecklistService, TaskDependencyService],
})
export class TasksModule {}