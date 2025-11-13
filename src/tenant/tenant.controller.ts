import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { TenantGuard } from './guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant, TenantId } from './decorators/tenant.decorator';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new tenant' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid tenant data or slug already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('systemRole') userRole: string,
  ) {
    // Only super admins can create tenants
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can create tenants');
    }

    return this.tenantService.createTenant(createTenantDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiResponse({
    status: 200,
    description: 'Tenants retrieved successfully',
  })
  async listTenants(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can list all tenants
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can list all tenants');
    }

    const result = await this.tenantService.listTenants({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
    });

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('domain/:domain')
  @ApiOperation({ summary: 'Get tenant by domain' })
  @ApiParam({ name: 'domain', description: 'Domain name' })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found for domain',
  })
  async getTenantByDomain(@Param('domain') domain: string) {
    return this.tenantService.getTenantByDomain(domain);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant by slug or ID' })
  @ApiParam({ name: 'slug', description: 'Tenant slug or ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantBySlug(@Param('slug') slug: string) {
    // Detectar si es un UUID (ID) o un slug
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(slug);

    if (isUuid) {
      // Es un ID (UUID), usar getTenantById
      const tenant = await this.tenantService.getTenantById(slug);
      return {
        success: true,
        data: tenant,
      };
    } else {
      // Es un slug, usar getTenantBySlug
      const tenant = await this.tenantService.getTenantBySlug(slug);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      return {
        success: true,
        data: tenant,
      };
    }
  }

  @Get(':tenantId/usage')
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Get tenant usage statistics' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
  })
  async getTenantUsage(@Param('tenantId') tenantId: string) {
    return this.tenantService.getTenantUsage(tenantId);
  }

  @Get(':tenantId/limits')
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Check tenant usage limits' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Usage limits checked successfully',
  })
  async checkUsageLimits(@Param('tenantId') tenantId: string) {
    return this.tenantService.checkUsageLimits(tenantId);
  }

  @Put(':tenantId')
  @ApiOperation({ summary: 'Update tenant (Super Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can update tenants
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can update tenants');
    }

    const tenant = await this.tenantService.updateTenant(tenantId, updateTenantDto);
    return {
      success: true,
      data: tenant,
    };
  }

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (Super Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getDashboardStats(@CurrentUser('systemRole') userRole?: string) {
    // Only super admins can get dashboard stats
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can get dashboard statistics');
    }

    const stats = await this.tenantService.getDashboardStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Put(':tenantId/status')
  @ApiOperation({ summary: 'Update tenant status' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant status updated successfully',
  })
  async updateTenantStatus(
    @Param('tenantId') tenantId: string,
    @Body() statusData: { isActive: boolean; reason?: string },
    @CurrentUser('systemRole') userRole: string,
  ) {
    // Only super admins and support can update tenant status
    if (!['super_admin', 'support'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    await this.tenantService.updateTenantStatus(
      tenantId,
      statusData.isActive,
      statusData.reason,
    );

    return { message: 'Tenant status updated successfully' };
  }
}