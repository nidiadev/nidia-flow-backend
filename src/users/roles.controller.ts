import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { TenantGuard } from '../tenant/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthGuard('jwt'), TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('users:manage_roles')
  @ApiOperation({ 
    summary: 'Create a new role',
    description: 'Create a custom role with specific permissions. System roles cannot be created via API.'
  })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        name: { type: 'string', example: 'Custom Manager' },
        description: { type: 'string', example: 'Custom role with specific permissions' },
        permissions: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['crm:read', 'crm:write', 'orders:read']
        },
        isSystemRole: { type: 'boolean', example: false },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'Role with this name already exists',
  })
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.rolesService.create(createRoleDto, tenantId);
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ 
    summary: 'Get all roles',
    description: 'Retrieve all roles including system and custom roles'
  })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          isSystemRole: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        }
      }
    }
  })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get('permissions')
  @RequirePermissions('users:read')
  @ApiOperation({ 
    summary: 'Get all available permissions',
    description: 'Retrieve all available permissions grouped by module'
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        crm: { type: 'array', items: { type: 'string' } },
        orders: { type: 'array', items: { type: 'string' } },
        tasks: { type: 'array', items: { type: 'string' } },
        products: { type: 'array', items: { type: 'string' } },
        accounting: { type: 'array', items: { type: 'string' } },
        reports: { type: 'array', items: { type: 'string' } },
        users: { type: 'array', items: { type: 'string' } },
        settings: { type: 'array', items: { type: 'string' } },
      }
    }
  })
  async getPermissions(@CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.getPermissions(tenantId);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Role retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.rolesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('users:manage_roles')
  @ApiOperation({ 
    summary: 'Update role',
    description: 'Update a custom role. System roles cannot be modified.'
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot modify system roles',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Role with this name already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.rolesService.update(id, updateRoleDto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('users:manage_roles')
  @ApiOperation({ 
    summary: 'Delete role',
    description: 'Delete a custom role. System roles cannot be deleted. Cannot delete roles that are assigned to users.'
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system roles or roles assigned to users',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.rolesService.remove(id, tenantId);
  }

  @Post('system/create')
  @RequirePermissions('users:manage_roles')
  @ApiOperation({ 
    summary: 'Create system roles',
    description: 'Create default system roles for the tenant. This is typically called during tenant setup.'
  })
  @ApiResponse({
    status: 201,
    description: 'System roles created successfully',
  })
  async createSystemRoles(@CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.createSystemRoles(tenantId);
  }
}