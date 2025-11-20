import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
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
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DealStageService } from '../../services/crm/deal-stage.service';
import {
  CreateDealStageDto,
  UpdateDealStageDto,
  DealStageResponseDto,
} from '../../dto/crm/deal-stage.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Deal Stages')
@ApiBearerAuth()
@Controller('crm/deal-stages')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DealStageController {
  constructor(private readonly dealStageService: DealStageService) {}

  @Post()
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Create a new deal stage',
    description: 'Creates a new stage for the pipeline'
  })
  @ApiBody({ type: CreateDealStageDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Deal stage created successfully',
    type: DealStageResponseDto,
  })
  async create(
    @Body(ValidationPipe) createDto: CreateDealStageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealStageResponseDto>> {
    const stage = await this.dealStageService.create(createDto, userId);
    return {
      success: true,
      data: stage,
      message: 'Deal stage created successfully',
    };
  }

  @Get()
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get all deal stages',
    description: 'Retrieves all active deal stages ordered by sort order'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal stages retrieved successfully',
    type: [DealStageResponseDto],
  })
  async findAll(): Promise<ApiResponseDto<DealStageResponseDto[]>> {
    const stages = await this.dealStageService.findAll();
    return {
      success: true,
      data: stages,
    };
  }

  @Get('initialize')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Initialize default deal stages',
    description: 'Creates default pipeline stages if none exist'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default stages initialized successfully',
    type: [DealStageResponseDto],
  })
  async initializeDefaults(
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealStageResponseDto[]>> {
    const stages = await this.dealStageService.initializeDefaultStages(userId);
    return {
      success: true,
      data: stages,
      message: 'Default stages initialized successfully',
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read', 'crm:deals:read')
  @ApiOperation({ 
    summary: 'Get deal stage by ID',
    description: 'Retrieves a single deal stage'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal stage retrieved successfully',
    type: DealStageResponseDto,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<DealStageResponseDto>> {
    const stage = await this.dealStageService.findById(id);
    return {
      success: true,
      data: stage,
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Update deal stage',
    description: 'Updates an existing deal stage'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateDealStageDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deal stage updated successfully',
    type: DealStageResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateDealStageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<DealStageResponseDto>> {
    const stage = await this.dealStageService.update(id, updateDto, userId);
    return {
      success: true,
      data: stage,
      message: 'Deal stage updated successfully',
    };
  }

  @Patch('reorder')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Reorder deal stages',
    description: 'Updates the sort order of deal stages'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        stageIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Array of stage IDs in the desired order',
        },
      },
      required: ['stageIds'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stages reordered successfully',
    type: [DealStageResponseDto],
  })
  async reorder(
    @Body('stageIds', ValidationPipe) stageIds: string[],
  ): Promise<ApiResponseDto<DealStageResponseDto[]>> {
    const stages = await this.dealStageService.reorder(stageIds);
    return {
      success: true,
      data: stages,
      message: 'Stages reordered successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions('crm:write', 'crm:deals:write')
  @ApiOperation({ 
    summary: 'Delete deal stage',
    description: 'Soft deletes a deal stage (cannot delete default stages or stages with active deals)'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Deal stage deleted successfully',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.dealStageService.delete(id);
    return {
      success: true,
      data: null,
      message: 'Deal stage deleted successfully',
    };
  }
}

