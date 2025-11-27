import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseBoolPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdatePasswordDto, InviteUserDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PlanLimitsGuard } from '../tenant/guards/plan-limits.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CheckLimit, LimitType } from '../tenant/decorators/check-limit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Logger } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, PlanLimitsGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private usersService: UsersService) {
    // Log para verificar que el controller se está inicializando correctamente
    this.logger.debug('UsersController initialized');
    this.logger.debug('JwtAuthGuard available:', !!JwtAuthGuard);
  }

  @Post()
  @RequirePermissions('users:write')
  @CheckLimit(LimitType.USERS)
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Create a new user within the tenant with specified role and permissions'
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        role: { type: 'string', example: 'sales' },
        department: { type: 'string', example: 'Sales' },
        position: { type: 'string', example: 'Sales Representative' },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') createdBy: string,
    @CurrentUser('email') createdByEmail?: string,
  ) {
    return this.usersService.createTenantUser(createUserDto, tenantId, createdBy, createdByEmail);
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ 
    summary: 'Get all users',
    description: 'Retrieve all users within the tenant with pagination and filtering'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, email, or employee ID' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              role: { type: 'string' },
              department: { type: 'string' },
              position: { type: 'string' },
              isActive: { type: 'boolean' },
              lastLoginAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          }
        }
      }
    }
  })
  async findAll(
    @CurrentUser('tenantId') tenantId: string | undefined,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @Req() request?: Request & { tenant?: { tenantId: string }; user?: { tenantId: string } },
  ) {
    // Fallback to request.tenant.tenantId or request.user.tenantId if CurrentUser doesn't provide it
    const effectiveTenantId = tenantId || request?.tenant?.tenantId || request?.user?.tenantId;
    if (!effectiveTenantId) {
      console.error('[UsersController] No tenantId available:', {
        fromCurrentUser: tenantId,
        fromRequestTenant: request?.tenant?.tenantId,
        fromRequestUser: request?.user?.tenantId,
      });
      throw new Error('Tenant ID not available');
    }
    return this.usersService.findAllTenantUsers(effectiveTenantId, page, limit, search, role, isActive);
  }

  @Get('profile')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Get the profile of the currently authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.getTenantUserProfile(userId, tenantId);
  }

  @Patch('profile')
  @ApiOperation({ 
    summary: 'Update current user profile',
    description: 'Update the profile of the currently authenticated user (limited fields)'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @Body() updateUserDto: Partial<UpdateUserDto>,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.updateTenantUserProfile(userId, updateUserDto, tenantId);
  }

  @Patch('profile/password')
  @ApiOperation({ 
    summary: 'Update current user password',
    description: 'Update the password of the currently authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect',
  })
  async updatePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.updateTenantUserPassword(userId, updatePasswordDto, tenantId);
  }

  @Post('invite')
  @RequirePermissions('users:invite')
  @ApiOperation({ 
    summary: 'Invite a new user',
    description: 'Send an invitation to a new user with a temporary password'
  })
  @ApiResponse({
    status: 201,
    description: 'User invited successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
          }
        },
        message: { type: 'string', example: 'User invited successfully. Invitation email sent.' },
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') invitedBy: string,
  ) {
    return this.usersService.inviteUser(inviteUserDto, tenantId, invitedBy);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.findTenantUserById(id, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('users:write')
  @ApiOperation({ 
    summary: 'Update user',
    description: 'Update user information (admin only)'
  })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.updateTenantUser(id, updateUserDto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @ApiOperation({ 
    summary: 'Delete user',
    description: 'Delete or deactivate user. Users with related data will be deactivated instead of deleted.'
  })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User deleted or deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.deleteTenantUser(id, tenantId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
  })
  async getSessions(@CurrentUser('id') userId: string) {
    return this.usersService.getUserSessions(userId);
  }
}