import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantHealthService, HealthCheckResult, TenantHealthSummary } from '../services/tenant-health.service';
import { TenantPermissionsGuard, RequireRoles, ROLES } from '../guards/tenant-permissions.guard';

@ApiTags('Tenant Health')
@Controller('health/tenant')
export class TenantHealthController {
  constructor(private readonly tenantHealthService: TenantHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall system health status' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getOverallHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message: string;
    checks: HealthCheckResult[];
    summary: { healthy: number; degraded: number; unhealthy: number; };
  }> {
    return this.tenantHealthService.getOverallHealthStatus();
  }

  @Get('check')
  @ApiOperation({ summary: 'Perform comprehensive health check' })
  @ApiResponse({ status: 200, description: 'Detailed health check results' })
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    return this.tenantHealthService.performHealthCheck();
  }

  @Get('tenants')
  @UseGuards(TenantPermissionsGuard)
  @RequireRoles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get health summary for all tenants (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant health summaries' })
  async getTenantHealthSummary(): Promise<TenantHealthSummary[]> {
    return this.tenantHealthService.getTenantHealthSummary();
  }

  @Get('tenant/:tenantId')
  @UseGuards(TenantPermissionsGuard)
  @RequireRoles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed health info for specific tenant (Admin only)' })
  @ApiResponse({ status: 200, description: 'Detailed tenant health info' })
  async getTenantDetailedHealth(@Param('tenantId') tenantId: string): Promise<any> {
    return this.tenantHealthService.getTenantDetailedHealth(tenantId);
  }

  @Get('tenant/:tenantId/test')
  @UseGuards(TenantPermissionsGuard)
  @RequireRoles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test connection to specific tenant (Admin only)' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testTenantConnection(@Param('tenantId') tenantId: string): Promise<HealthCheckResult> {
    return this.tenantHealthService.testTenantConnection(tenantId);
  }
}