import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantAssignmentsService } from './tenant-assignments.service';
import { AssignModuleToTenantDto } from './dto/assign-module-to-tenant.dto';
import { AssignSubModuleToTenantDto } from './dto/assign-submodule-to-tenant.dto';

@ApiTags('Tenant Assignments')
@ApiBearerAuth()
@Controller('tenant-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('super_admin')
export class TenantAssignmentsController {
  constructor(private readonly tenantAssignmentsService: TenantAssignmentsService) {}

  @Post('module')
  @ApiOperation({ summary: 'Assign a module directly to a tenant (independent of plans)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Module assigned to tenant successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module or Tenant not found' })
  async assignModuleToTenant(
    @Body(ValidationPipe) assignDto: AssignModuleToTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantAssignmentsService.assignModuleToTenant(assignDto, user?.id);
  }

  @Post('submodule')
  @ApiOperation({ summary: 'Assign a submodule directly to a tenant (independent of plans)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'SubModule assigned to tenant successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'SubModule or Tenant not found' })
  async assignSubModuleToTenant(
    @Body(ValidationPipe) assignDto: AssignSubModuleToTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantAssignmentsService.assignSubModuleToTenant(assignDto, user?.id);
  }

  @Delete('module/:moduleId/:tenantId')
  @ApiOperation({ summary: 'Remove module assignment from tenant' })
  @ApiParam({ name: 'moduleId', type: String, description: 'Module ID' })
  @ApiParam({ name: 'tenantId', type: String, description: 'Tenant ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  async removeModuleFromTenant(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.tenantAssignmentsService.removeModuleFromTenant(moduleId, tenantId);
  }

  @Delete('submodule/:subModuleId/:tenantId')
  @ApiOperation({ summary: 'Remove submodule assignment from tenant' })
  @ApiParam({ name: 'subModuleId', type: String, description: 'SubModule ID' })
  @ApiParam({ name: 'tenantId', type: String, description: 'Tenant ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  async removeSubModuleFromTenant(
    @Param('subModuleId', ParseUUIDPipe) subModuleId: string,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.tenantAssignmentsService.removeSubModuleFromTenant(subModuleId, tenantId);
  }

  @Get('tenant/:tenantId/modules')
  @ApiOperation({ summary: 'Get all module assignments for a tenant' })
  @ApiParam({ name: 'tenantId', type: String, description: 'Tenant ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of module assignments' })
  async getTenantModuleAssignments(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.tenantAssignmentsService.getTenantModuleAssignments(tenantId);
  }

  @Get('tenant/:tenantId/submodules')
  @ApiOperation({ summary: 'Get all submodule assignments for a tenant' })
  @ApiParam({ name: 'tenantId', type: String, description: 'Tenant ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of submodule assignments' })
  async getTenantSubModuleAssignments(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.tenantAssignmentsService.getTenantSubModuleAssignments(tenantId);
  }

  @Get('module/:moduleId/tenants')
  @ApiOperation({ summary: 'Get all tenant assignments for a module' })
  @ApiParam({ name: 'moduleId', type: String, description: 'Module ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of tenant assignments' })
  async getModuleTenantAssignments(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.tenantAssignmentsService.getModuleTenantAssignments(moduleId);
  }

  @Get('submodule/:subModuleId/tenants')
  @ApiOperation({ summary: 'Get all tenant assignments for a submodule' })
  @ApiParam({ name: 'subModuleId', type: String, description: 'SubModule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of tenant assignments' })
  async getSubModuleTenantAssignments(@Param('subModuleId', ParseUUIDPipe) subModuleId: string) {
    return this.tenantAssignmentsService.getSubModuleTenantAssignments(subModuleId);
  }
}

