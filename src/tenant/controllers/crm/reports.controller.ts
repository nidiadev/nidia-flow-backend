import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPermissions } from '../../../common/decorators/user-permissions.decorator';
import { CrmReportsService } from '../../services/crm/crm-reports.service';
import { DealService } from '../../services/crm/deal.service';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('crm/reports')
export class CrmReportsController {
  constructor(
    private readonly crmReportsService: CrmReportsService,
    private readonly dealService: DealService,
  ) {}

  @Get('pipeline-kpis')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get pipeline KPIs' })
  @ApiResponse({ status: 200, description: 'Pipeline KPIs retrieved successfully' })
  async getPipelineKPIs(
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const kpis = await this.crmReportsService.getPipelineKPIs(userId, userPermissions);
    return {
      success: true,
      message: 'Pipeline KPIs retrieved successfully',
      data: kpis,
    };
  }

  @Get('win-rate')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get win rate (global and by seller)' })
  @ApiQuery({ name: 'sellerId', required: false, description: 'Filter by seller ID' })
  @ApiResponse({ status: 200, description: 'Win rate retrieved successfully' })
  async getWinRate(
    @Query('sellerId') sellerId: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const winRate = await this.crmReportsService.getWinRate(
      userId,
      userPermissions,
      sellerId,
    );
    return {
      success: true,
      message: 'Win rate retrieved successfully',
      data: winRate,
    };
  }

  @Get('average-time-to-close')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get average time to close deals' })
  @ApiQuery({ name: 'sellerId', required: false, description: 'Filter by seller ID' })
  @ApiResponse({ status: 200, description: 'Average time to close retrieved successfully' })
  async getAverageTimeToClose(
    @Query('sellerId') sellerId: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const avgTime = await this.crmReportsService.getAverageTimeToClose(
      userId,
      userPermissions,
      sellerId,
    );
    return {
      success: true,
      message: 'Average time to close retrieved successfully',
      data: avgTime,
    };
  }

  @Get('forecast')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get monthly forecast' })
  @ApiQuery({ name: 'year', required: false, description: 'Year (default: current year)' })
  @ApiQuery({ name: 'month', required: false, description: 'Month 1-12 (default: current month)' })
  @ApiResponse({ status: 200, description: 'Forecast retrieved successfully' })
  async getForecast(
    @Query('year') year: string,
    @Query('month') month: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const now = new Date();
    const forecastYear = year ? parseInt(year) : now.getFullYear();
    const forecastMonth = month ? parseInt(month) : now.getMonth() + 1;

    const forecast = await this.dealService.getForecast(
      forecastYear,
      forecastMonth,
      userId,
      userPermissions,
    );

    return {
      success: true,
      message: 'Forecast retrieved successfully',
      data: forecast,
    };
  }

  @Get('conversion-funnel')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get conversion funnel report' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Conversion funnel retrieved successfully' })
  async getConversionFunnel(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const funnel = await this.crmReportsService.getConversionFunnel(
      userId,
      userPermissions,
      from,
      to,
    );

    return {
      success: true,
      message: 'Conversion funnel retrieved successfully',
      data: funnel,
    };
  }

  @Get('pipeline-velocity')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get pipeline velocity report' })
  @ApiResponse({ status: 200, description: 'Pipeline velocity retrieved successfully' })
  async getPipelineVelocity(
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const velocity = await this.crmReportsService.getPipelineVelocity(
      userId,
      userPermissions,
    );

    return {
      success: true,
      message: 'Pipeline velocity retrieved successfully',
      data: velocity,
    };
  }

  @Get('seller-performance')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get seller performance report' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Seller performance retrieved successfully' })
  async getSellerPerformance(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const performance = await this.crmReportsService.getSellerPerformance(
      userId,
      userPermissions,
      from,
      to,
    );

    return {
      success: true,
      message: 'Seller performance retrieved successfully',
      data: performance,
    };
  }

  @Get('loss-analysis')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get loss analysis report' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Loss analysis retrieved successfully' })
  async getLossAnalysis(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const analysis = await this.crmReportsService.getLossAnalysis(
      userId,
      userPermissions,
      from,
      to,
    );

    return {
      success: true,
      message: 'Loss analysis retrieved successfully',
      data: analysis,
    };
  }

  @Get('lead-sources')
  @RequirePermissions('crm:read', 'reports:read')
  @ApiOperation({ summary: 'Get lead sources report' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Lead sources retrieved successfully' })
  async getLeadSources(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    const sources = await this.crmReportsService.getLeadSources(
      userId,
      userPermissions,
      from,
      to,
    );

    return {
      success: true,
      message: 'Lead sources retrieved successfully',
      data: sources,
    };
  }
}

