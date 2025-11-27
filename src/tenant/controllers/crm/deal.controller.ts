import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
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
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPermissions } from '../../../common/decorators/user-permissions.decorator';
import { DealService } from '../../services/crm/deal.service';
import {
  CreateDealDto,
  UpdateDealDto,
  DealFilterDto,
  DealResponseDto,
  DealSummaryDto,
  ChangeDealStageDto,
  WinLoseDealDto,
} from '../../dto/crm/deal.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Deals')
@ApiBearerAuth()
@Controller('crm/deals')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Create a new deal',
    description: 'Creates a new opportunity/deal in the pipeline'
  })
  @ApiBody({ type: CreateDealDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Deal created successfully',
    type: DealResponseDto,
  })
  async create(
    @Body(ValidationPipe) createDealDto: CreateDealDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealResponseDto>> {
    const deal = await this.dealService.create(createDealDto, userId);
    return {
      success: true,
      data: deal,
      message: 'Deal created successfully',
    };
  }

  @Get()
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get deals with filtering and pagination',
    description: 'Retrieves a paginated list of deals with optional filtering'
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'stageId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deals retrieved successfully',
  })
  async findMany(
    @Query(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false })) filterDto: DealFilterDto,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<DealSummaryDto[]>> {
    const result = await this.dealService.findMany(filterDto, userId, userPermissions);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('pipeline')
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get deals grouped by stage (for Kanban view)',
    description: 'Returns all active stages with their deals for pipeline visualization'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline retrieved successfully',
  })
  async getPipeline(
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    // This will be handled by a separate endpoint that groups by stage
    const stats = await this.dealService.getPipelineStats(userId, userPermissions);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('pipeline/stats')
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get pipeline statistics',
    description: 'Returns aggregated statistics for the pipeline'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline statistics retrieved successfully',
  })
  async getPipelineStats(
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const stats = await this.dealService.getPipelineStats(userId, userPermissions);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('forecast')
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get forecast for a month',
    description: 'Returns forecasted deals for a specific month'
  })
  @ApiQuery({ name: 'year', required: true, type: Number, description: 'Year (e.g., 2024)' })
  @ApiQuery({ name: 'month', required: true, type: Number, description: 'Month (1-12)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Forecast retrieved successfully',
  })
  async getForecast(
    @Query('year') year: number,
    @Query('month') month: number,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const forecast = await this.dealService.getForecast(
      parseInt(year.toString()),
      parseInt(month.toString()),
      userId,
      userPermissions,
    );
    return {
      success: true,
      data: forecast,
    };
  }

  @Get('stage/:stageId')
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get deals by stage',
    description: 'Returns all deals in a specific stage (for Kanban column)'
  })
  @ApiParam({ name: 'stageId', type: String, description: 'Stage ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deals retrieved successfully',
    type: [DealSummaryDto],
  })
  async findByStage(
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<DealSummaryDto[]>> {
    const deals = await this.dealService.findByStage(stageId, userId, userPermissions);
    return {
      success: true,
      data: deals,
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get deal by ID',
    description: 'Retrieves a single deal with all details'
  })
  @ApiParam({ name: 'id', type: String, description: 'Deal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal retrieved successfully',
    type: DealResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deal not found',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<DealResponseDto>> {
    const deal = await this.dealService.findById(id);
    return {
      success: true,
      data: deal,
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Update deal',
    description: 'Updates an existing deal'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateDealDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal updated successfully',
    type: DealResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDealDto: UpdateDealDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealResponseDto>> {
    const deal = await this.dealService.update(id, updateDealDto, userId);
    return {
      success: true,
      data: deal,
      message: 'Deal updated successfully',
    };
  }

  @Patch(':id/stage')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Change deal stage',
    description: 'Moves a deal to a different stage in the pipeline'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: ChangeDealStageDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal stage changed successfully',
    type: DealResponseDto,
  })
  async changeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) changeDto: ChangeDealStageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealResponseDto>> {
    const deal = await this.dealService.changeStage(id, changeDto, userId);
    return {
      success: true,
      data: deal,
      message: 'Deal stage changed successfully',
    };
  }

  @Patch(':id/win')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Mark deal as won',
    description: 'Marks a deal as won and moves it to the won stage'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: WinLoseDealDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal marked as won',
    type: DealResponseDto,
  })
  async winDeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) winDto: WinLoseDealDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealResponseDto>> {
    const deal = await this.dealService.winDeal(id, winDto, userId);
    return {
      success: true,
      data: deal,
      message: 'Deal marked as won',
    };
  }

  @Patch(':id/lose')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Mark deal as lost',
    description: 'Marks a deal as lost with a reason'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: WinLoseDealDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal marked as lost',
    type: DealResponseDto,
  })
  async loseDeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) loseDto: WinLoseDealDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealResponseDto>> {
    const deal = await this.dealService.loseDeal(id, loseDto, userId);
    return {
      success: true,
      data: deal,
      message: 'Deal marked as lost',
    };
  }

  @Delete(':id')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Delete deal',
    description: 'Soft deletes a deal by marking it as abandoned'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Deal deleted successfully',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<null>> {
    await this.dealService.delete(id, userId);
    return {
      success: true,
      data: null,
      message: 'Deal deleted successfully',
    };
  }
}

