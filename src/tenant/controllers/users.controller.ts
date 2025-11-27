import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantUsersService, CreateTenantUserDto, UpdateTenantUserDto } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../decorators/tenant-database.decorator';
import { ApiResponseDto } from '../dto/base/base.dto';

@ApiTags('Tenant Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TenantUsersController {
  constructor(private readonly usersService: TenantUsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create a new user in tenant database' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or user already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body(ValidationPipe) createDto: CreateTenantUserDto,
    @CurrentUser() userId: string,
  ): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.create(createDto, userId);
    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users in tenant database' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async findAll(
    @Query('isActive') isActive?: boolean,
    @Query('role') role?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ApiResponseDto<any>> {
    // TODO: Implementar listado con paginación
    return {
      success: true,
      data: [],
      message: 'Users retrieved successfully',
    };
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    // TODO: Implementar búsqueda por ID
    return {
      success: true,
      data: null,
      message: 'User retrieved successfully',
    };
  }

  @Put(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateTenantUserDto,
    @CurrentUser() userId: string,
  ): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.update(id, updateDto, userId);
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Patch(':id/activate')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({
    status: 200,
    description: 'User activated successfully',
  })
  async activate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.activate(id);
    return {
      success: true,
      data: user,
      message: 'User activated successfully',
    };
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
  })
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.deactivate(id);
    return {
      success: true,
      data: user,
      message: 'User deactivated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users:delete')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async delete(@Param('id') id: string): Promise<void> {
    await this.usersService.delete(id);
  }
}

