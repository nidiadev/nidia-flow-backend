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
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { LeadScoringService } from '../../services/crm/lead-scoring.service';
import {
  CreateLeadScoringRuleDto,
  UpdateLeadScoringRuleDto,
  LeadScoringRuleFilterDto,
  LeadScoringRuleResponseDto,
  RecalculateScoreDto,
  LeadScoreHistoryResponseDto,
  LeadScoreSummaryDto,
} from '../../dto/crm/lead-scoring.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Lead Scoring')
@Controller('crm/lead-scoring')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class LeadScoringController {
  constructor(private readonly leadScoringService: LeadScoringService) {}

  @Post('rules')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Create a new lead scoring rule' })
  @ApiResponse({ status: 201, description: 'Rule created successfully', type: LeadScoringRuleResponseDto })
  async createRule(
    @Body(ValidationPipe) createDto: CreateLeadScoringRuleDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<LeadScoringRuleResponseDto>> {
    const rule = await this.leadScoringService.create(createDto, req.user.userId);
    return {
      success: true,
      message: 'Lead scoring rule created successfully',
      data: rule,
    };
  }

  @Get('rules')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get all lead scoring rules' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async getRules(
    @Query(ValidationPipe) filters: LeadScoringRuleFilterDto,
  ): Promise<ApiResponseDto<{ data: LeadScoringRuleResponseDto[]; pagination: any }>> {
    const result = await this.leadScoringService.findMany(filters);
    return {
      success: true,
      message: 'Lead scoring rules retrieved successfully',
      data: result,
    };
  }

  @Get('rules/:id')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get lead scoring rule by ID' })
  @ApiResponse({ status: 200, description: 'Rule retrieved successfully', type: LeadScoringRuleResponseDto })
  async getRule(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<LeadScoringRuleResponseDto>> {
    const rule = await this.leadScoringService.findById(id);
    return {
      success: true,
      message: 'Lead scoring rule retrieved successfully',
      data: rule,
    };
  }

  @Put('rules/:id')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Update lead scoring rule' })
  @ApiResponse({ status: 200, description: 'Rule updated successfully', type: LeadScoringRuleResponseDto })
  async updateRule(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateLeadScoringRuleDto,
  ): Promise<ApiResponseDto<LeadScoringRuleResponseDto>> {
    const rule = await this.leadScoringService.update(id, updateDto);
    return {
      success: true,
      message: 'Lead scoring rule updated successfully',
      data: rule,
    };
  }

  @Delete('rules/:id')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Delete lead scoring rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
  async deleteRule(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.leadScoringService.delete(id);
    return {
      success: true,
      message: 'Lead scoring rule deleted successfully',
      data: null,
    };
  }

  @Post('recalculate')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Recalculate lead scores' })
  @ApiResponse({ status: 200, description: 'Scores recalculated successfully' })
  async recalculate(
    @Body(ValidationPipe) recalculateDto: RecalculateScoreDto,
  ): Promise<ApiResponseDto<{ oldScore: number; newScore: number; change: number } | { processed: number; updated: number }>> {
    if (recalculateDto.customerId) {
      const result = await this.leadScoringService.recalculateScore(
        recalculateDto.customerId,
        'manual',
      );
      return {
        success: true,
        message: 'Lead score recalculated successfully',
        data: result,
      };
    } else {
      const result = await this.leadScoringService.recalculateAllScores();
      return {
        success: true,
        message: 'All lead scores recalculated successfully',
        data: result,
      };
    }
  }

  @Get('customers/:customerId/summary')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get lead score summary for a customer' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully', type: LeadScoreSummaryDto })
  async getScoreSummary(
    @Param('customerId') customerId: string,
  ): Promise<ApiResponseDto<LeadScoreSummaryDto>> {
    const summary = await this.leadScoringService.getScoreSummary(customerId);
    return {
      success: true,
      message: 'Lead score summary retrieved successfully',
      data: summary,
    };
  }

  @Get('customers/:customerId/history')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get lead score history for a customer' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getScoreHistory(
    @Param('customerId') customerId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<ApiResponseDto<{ data: LeadScoreHistoryResponseDto[]; pagination: any }>> {
    const result = await this.leadScoringService.getScoreHistory(
      customerId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return {
      success: true,
      message: 'Lead score history retrieved successfully',
      data: result,
    };
  }

  @Post('initialize-defaults')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Initialize default lead scoring rules' })
  @ApiResponse({ status: 200, description: 'Default rules initialized successfully' })
  async initializeDefaults(
    @Request() req: any,
  ): Promise<ApiResponseDto<null>> {
    await this.leadScoringService.initializeDefaultRules(req.user.userId);
    return {
      success: true,
      message: 'Default lead scoring rules initialized successfully',
      data: null,
    };
  }
}

