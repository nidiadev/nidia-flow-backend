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
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { SmartListService } from '../../services/crm/smart-list.service';
import {
  CreateSmartListDto,
  UpdateSmartListDto,
  SmartListFilterDto,
  SmartListResponseDto,
  BulkActionDto,
} from '../../dto/crm/smart-list.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Smart Lists (Segmentation)')
@Controller('crm/smart-lists')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class SmartListController {
  constructor(private readonly smartListService: SmartListService) {}

  @Post()
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Create a new smart list' })
  @ApiResponse({ status: 201, description: 'Smart list created successfully', type: SmartListResponseDto })
  async create(
    @Body(ValidationPipe) createDto: CreateSmartListDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<SmartListResponseDto>> {
    const smartList = await this.smartListService.create(createDto, req.user.userId);
    return {
      success: true,
      message: 'Smart list created successfully',
      data: smartList,
    };
  }

  @Get()
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get all smart lists' })
  @ApiResponse({ status: 200, description: 'Smart lists retrieved successfully' })
  async findMany(
    @Query(ValidationPipe) filters: SmartListFilterDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<{ data: SmartListResponseDto[]; pagination: any }>> {
    const result = await this.smartListService.findMany(filters, req.user.userId);
    return {
      success: true,
      message: 'Smart lists retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get smart list by ID' })
  @ApiResponse({ status: 200, description: 'Smart list retrieved successfully', type: SmartListResponseDto })
  async findById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<SmartListResponseDto>> {
    const smartList = await this.smartListService.findById(id, req.user.userId);
    return {
      success: true,
      message: 'Smart list retrieved successfully',
      data: smartList,
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Update smart list' })
  @ApiResponse({ status: 200, description: 'Smart list updated successfully', type: SmartListResponseDto })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateSmartListDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<SmartListResponseDto>> {
    const smartList = await this.smartListService.update(id, updateDto, req.user.userId);
    return {
      success: true,
      message: 'Smart list updated successfully',
      data: smartList,
    };
  }

  @Delete(':id')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Delete smart list' })
  @ApiResponse({ status: 200, description: 'Smart list deleted successfully' })
  async delete(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.smartListService.delete(id, req.user.userId);
    return {
      success: true,
      message: 'Smart list deleted successfully',
      data: null,
    };
  }

  @Get(':id/members')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get smart list members' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  async getMembers(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<{ data: any[]; pagination: any }>> {
    const result = await this.smartListService.getMembers(
      id,
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
    return {
      success: true,
      message: 'Members retrieved successfully',
      data: result,
    };
  }

  @Post(':id/update-members')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Manually update smart list members' })
  @ApiResponse({ status: 200, description: 'Members updated successfully' })
  async updateMembers(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.smartListService.updateListMembers(id);
    return {
      success: true,
      message: 'Members updated successfully',
      data: null,
    };
  }

  @Post(':id/bulk-action')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Execute bulk action on smart list members' })
  @ApiResponse({ status: 200, description: 'Bulk action executed successfully' })
  async executeBulkAction(
    @Param('id') id: string,
    @Body(ValidationPipe) actionDto: BulkActionDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<{ affected: number }>> {
    const result = await this.smartListService.executeBulkAction(id, actionDto, req.user.userId);
    return {
      success: true,
      message: 'Bulk action executed successfully',
      data: result,
    };
  }
}

