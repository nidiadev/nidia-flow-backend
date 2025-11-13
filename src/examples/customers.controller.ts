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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  ManagerOrHigher,
  SalesTeam,
  TenantAdminOrHigher,
} from '../auth/decorators/roles.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant, TenantId } from '../tenant/decorators/tenant.decorator';

/**
 * Example controller demonstrating role and permission-based access control
 */
@ApiTags('Customers (Example)')
@Controller('customers')
@UseGuards(AuthGuard('jwt'), TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {

  @Get()
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async listCustomers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return {
      message: 'List customers endpoint',
      tenantId,
      userRole: user.systemRole || user.tenantRole,
      permissions: 'customer:read required',
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomer(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return {
      message: 'Get customer endpoint',
      customerId: id,
      tenantId,
      permissions: 'customer:read required',
    };
  }

  @Post()
  @RequirePermissions('customer:create')
  @SalesTeam() // Only sales team and above can create customers
  @ApiOperation({ summary: 'Create new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createCustomer(
    @Body() customerData: any,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return {
      message: 'Create customer endpoint',
      tenantId,
      userRole: user.systemRole || user.tenantRole,
      permissions: 'customer:create required + sales team role',
    };
  }

  @Put(':id')
  @RequirePermissions('customer:update')
  @SalesTeam()
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async updateCustomer(
    @Param('id') id: string,
    @Body() customerData: any,
    @TenantId() tenantId: string,
  ) {
    return {
      message: 'Update customer endpoint',
      customerId: id,
      tenantId,
      permissions: 'customer:read + customer:update required + sales team role',
    };
  }

  @Delete(':id')
  @RequirePermissions('customer:delete')
  @ManagerOrHigher() // Only managers and above can delete customers
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async deleteCustomer(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return {
      message: 'Delete customer endpoint',
      customerId: id,
      tenantId,
      permissions: 'customer:delete required + manager role or higher',
    };
  }

  @Post(':id/assign')
  @RequirePermissions('customer:assign', 'customer:update')
  @ManagerOrHigher()
  @ApiOperation({ summary: 'Assign customer to user' })
  @ApiResponse({ status: 200, description: 'Customer assigned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async assignCustomer(
    @Param('id') customerId: string,
    @Body() assignData: { userId: string },
    @TenantId() tenantId: string,
  ) {
    return {
      message: 'Assign customer endpoint',
      customerId,
      assignToUserId: assignData.userId,
      tenantId,
      permissions: 'customer:assign OR customer:update required + manager role or higher',
    };
  }

  @Get(':id/export')
  @RequirePermissions('crm:export')
  @TenantAdminOrHigher() // Only tenant admins and above can export
  @ApiOperation({ summary: 'Export customer data' })
  @ApiResponse({ status: 200, description: 'Customer data exported successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async exportCustomer(
    @Param('id') customerId: string,
    @TenantId() tenantId: string,
  ) {
    return {
      message: 'Export customer endpoint',
      customerId,
      tenantId,
      permissions: 'customer:export required + tenant admin role or higher',
    };
  }

  @Get('reports/summary')
  @RequirePermissions('reports:read', 'crm:read')
  @ManagerOrHigher()
  @ApiOperation({ summary: 'Get customer reports summary' })
  @ApiResponse({ status: 200, description: 'Customer reports retrieved successfully' })
  async getCustomerReports(@TenantId() tenantId: string) {
    return {
      message: 'Customer reports endpoint',
      tenantId,
      permissions: 'reports:view AND customer:read required + manager role or higher',
    };
  }
}