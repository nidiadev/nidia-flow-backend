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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SystemUsersService } from './system-users.service';
import { CreateSystemUserDto, UpdateSystemUserDto } from './dto/system-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('System Users')
@Controller('system-users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SystemUsersController {
  constructor(private readonly systemUsersService: SystemUsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create system user (Super Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'System user created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user data',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - only super admins can create system users',
  })
  async create(
    @Body() createDto: CreateSystemUserDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('systemRole') userRole: string,
  ) {
    // Solo super admins pueden crear usuarios del sistema
    if (userRole !== 'super_admin') {
      throw new Error('Solo los super administradores pueden crear usuarios del sistema');
    }

    return this.systemUsersService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all system users (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by email, first name, or last name' })
  @ApiQuery({ name: 'systemRole', required: false, enum: ['super_admin', 'support'], description: 'Filter by system role' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({
    status: 200,
    description: 'System users retrieved successfully',
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('systemRole') systemRole?: 'super_admin' | 'support',
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Solo super admins pueden listar usuarios del sistema
    if (userRole !== 'super_admin') {
      throw new Error('Solo los super administradores pueden listar usuarios del sistema');
    }

    return this.systemUsersService.findAll({
      page,
      limit,
      search,
      systemRole,
      isActive,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system users statistics (Super Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats(@CurrentUser('systemRole') userRole?: string) {
    // Solo super admins pueden ver estadísticas
    if (userRole !== 'super_admin') {
      throw new Error('Solo los super administradores pueden ver estadísticas');
    }

    return this.systemUsersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get system user by ID (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'System user retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Solo super admins pueden ver detalles de usuarios del sistema
    if (userRole !== 'super_admin') {
      throw new Error('Solo los super administradores pueden ver detalles de usuarios del sistema');
    }

    return this.systemUsersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update system user (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'System user updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSystemUserDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Solo super admins pueden actualizar usuarios del sistema
    if (userRole !== 'super_admin') {
      throw new Error('Solo los super administradores pueden actualizar usuarios del sistema');
    }

    return this.systemUsersService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete (deactivate) system user (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'System user deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Solo super admins pueden eliminar usuarios del sistema
    if (userRole !== 'super_admin') {
      throw new Error('Solo los super administradores pueden eliminar usuarios del sistema');
    }

    return this.systemUsersService.remove(id);
  }
}

