import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionsService } from '../services/permissions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { Permission } from '../enums/permissions.enum';
import { PermissionsGuard } from '../guards/permissions.guard';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) { }

  @Get('my-permissions')
  @ApiOperation({ summary: 'Get current user permissions' })
  @ApiResponse({
    status: 200,
    description: 'User permissions retrieved successfully',
  })
  async getMyPermissions(@CurrentUser() user: any) {
    const userRole = user.systemRole || user.tenantRole;
    const permissions = this.permissionsService.getUserPermissions(userRole);

    return {
      role: permissions.role,
      permissions: permissions.permissions,
      roleDefinition: this.permissionsService.getRoleDefinition(userRole),
    };
  }

  @Get('roles')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:manage_roles')
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiQuery({ name: 'type', required: false, enum: ['system', 'tenant', 'all'] })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
  })
  async getRoles(
    @Query('type') type: 'system' | 'tenant' | 'all' = 'all',
    @CurrentUser() user: any,
  ) {
    let roles;

    switch (type) {
      case 'system':
        roles = this.permissionsService.getSystemRoles();
        break;
      case 'tenant':
        roles = this.permissionsService.getTenantRoles();
        break;
      default:
        roles = this.permissionsService.getAllRoles();
    }

    // Filter roles based on user's ability to assign them
    const userRole = user.systemRole || user.tenantRole;
    const assignableRoles = roles.filter(role =>
      this.permissionsService.canAssignRole(userRole, role.name)
    );

    return {
      roles: assignableRoles,
      total: assignableRoles.length,
    };
  }

  @Get('assignable-roles')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:manage_roles')
  @ApiOperation({ summary: 'Get roles that current user can assign' })
  @ApiQuery({ name: 'context', required: false, enum: ['system', 'tenant'] })
  @ApiResponse({
    status: 200,
    description: 'Assignable roles retrieved successfully',
  })
  async getAssignableRoles(
    @Query('context') context: 'system' | 'tenant' = 'tenant',
    @CurrentUser() user: any,
  ) {
    const userRole = user.systemRole || user.tenantRole;
    const isSystemContext = context === 'system';

    const assignableRoles = this.permissionsService.getAssignableRoles(
      userRole,
      isSystemContext,
    );

    return {
      roles: assignableRoles,
      total: assignableRoles.length,
      context,
    };
  }

  @Get('permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:manage_roles')
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  async getPermissions() {
    const permissionsByCategory = this.permissionsService.getPermissionsByCategory();
    const allPermissions = this.permissionsService.getAllPermissions();

    return {
      permissions: allPermissions,
      categories: permissionsByCategory,
      total: allPermissions.length,
    };
  }

  @Get('role/:roleName')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get role definition and permissions' })
  @ApiResponse({
    status: 200,
    description: 'Role definition retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async getRoleDefinition(@Query('roleName') roleName: string) {
    const roleDefinition = this.permissionsService.getRoleDefinition(roleName);

    if (!roleDefinition) {
      return {
        error: 'Role not found',
        roleName,
      };
    }

    return {
      role: roleDefinition,
      permissionCount: roleDefinition.permissions.length,
    };
  }

  @Get('check-permission')
  @ApiOperation({ summary: 'Check if current user has specific permission' })
  @ApiQuery({ name: 'permission', required: true })
  @ApiResponse({
    status: 200,
    description: 'Permission check completed',
  })
  async checkPermission(
    @Query('permission') permission: string,
    @CurrentUser() user: any,
  ) {
    const userRole = user.systemRole || user.tenantRole;
    const userPermissions = this.permissionsService.getUserPermissions(userRole);

    const hasPermission = this.permissionsService.isValidPermission(permission) &&
      userPermissions.canAccess(permission as Permission);

    return {
      hasPermission,
      permission,
      userRole,
      isValidPermission: this.permissionsService.isValidPermission(permission),
    };
  }
}