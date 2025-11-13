import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SavedReportService } from '../../services/reports/saved-report.service';
import { ReportExecutionService } from '../../services/reports/report-execution.service';
import { 
  CreateSavedReportDto, 
  UpdateSavedReportDto, 
  SavedReportResponseDto,
  ReportType 
} from '../../dto/reports/saved-report.dto';
import { 
  CreateReportExecutionDto, 
  UpdateReportExecutionDto, 
  ReportExecutionResponseDto,
  ExecutionStatus 
} from '../../dto/reports/report-execution.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportController {
  constructor(
    private readonly savedReportService: SavedReportService,
    private readonly reportExecutionService: ReportExecutionService,
  ) {}

  // ===== SAVED REPORTS ENDPOINTS =====

  @Post('saved')
  @ApiOperation({ summary: 'Create a new saved report' })
  @ApiResponse({ 
    status: 201, 
    description: 'Saved report created successfully',
    type: SavedReportResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async createSavedReport(
    @Body() createSavedReportDto: CreateSavedReportDto,
    @CurrentUser() user: any,
  ): Promise<SavedReportResponseDto> {
    return this.savedReportService.create(createSavedReportDto, user.userId);
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get all saved reports with optional filtering' })
  @ApiQuery({ name: 'reportType', required: false, enum: ReportType })
  @ApiQuery({ name: 'isScheduled', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ 
    status: 200, 
    description: 'Saved reports retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        reports: {
          type: 'array',
          items: { $ref: '#/components/schemas/SavedReportResponseDto' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  async findAllSavedReports(
    @Query('reportType') reportType?: ReportType,
    @Query('isScheduled') isScheduled?: boolean,
    @Query('isActive') isActive?: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.savedReportService.findAll(reportType, isScheduled, isActive, page, limit);
  }

  @Get('saved/scheduled')
  @ApiOperation({ summary: 'Get scheduled reports that need to be executed' })
  @ApiResponse({ 
    status: 200, 
    description: 'Scheduled reports retrieved successfully',
    type: [SavedReportResponseDto] 
  })
  async findScheduledReports(): Promise<SavedReportResponseDto[]> {
    return this.savedReportService.findScheduledReports();
  }

  @Get('saved/statistics')
  @ApiOperation({ summary: 'Get saved report statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalReports: { type: 'number' },
        scheduledReports: { type: 'number' },
        reportsByType: { type: 'object' },
        recentExecutions: { type: 'number' }
      }
    }
  })
  async getSavedReportStatistics() {
    return this.savedReportService.getStatistics();
  }

  @Get('saved/:id')
  @ApiOperation({ summary: 'Get a saved report by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Saved report retrieved successfully',
    type: SavedReportResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Saved report not found' })
  async findOneSavedReport(@Param('id', ParseUUIDPipe) id: string): Promise<SavedReportResponseDto> {
    return this.savedReportService.findOne(id);
  }

  @Patch('saved/:id')
  @ApiOperation({ summary: 'Update a saved report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Saved report updated successfully',
    type: SavedReportResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Saved report not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async updateSavedReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSavedReportDto: UpdateSavedReportDto,
  ): Promise<SavedReportResponseDto> {
    return this.savedReportService.update(id, updateSavedReportDto);
  }

  @Delete('saved/:id')
  @ApiOperation({ summary: 'Delete a saved report' })
  @ApiResponse({ status: 200, description: 'Saved report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Saved report not found' })
  async removeSavedReport(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.savedReportService.remove(id);
    return { message: 'Saved report deleted successfully' };
  }

  // ===== REPORT EXECUTION ENDPOINTS =====

  @Post('executions')
  @ApiOperation({ summary: 'Create a new report execution' })
  @ApiResponse({ 
    status: 201, 
    description: 'Report execution created successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async createExecution(
    @Body() createReportExecutionDto: CreateReportExecutionDto,
  ): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.create(createReportExecutionDto);
  }

  @Post('executions/start')
  @ApiOperation({ summary: 'Start a new report execution' })
  @ApiResponse({ 
    status: 201, 
    description: 'Report execution started successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async startExecution(
    @Body('savedReportId') savedReportId?: string,
  ): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.startExecution(savedReportId);
  }

  @Post('executions/:id/complete')
  @ApiOperation({ summary: 'Complete a report execution' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report execution completed successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  async completeExecution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resultFileUrl') resultFileUrl?: string,
  ): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.completeExecution(id, resultFileUrl);
  }

  @Post('executions/:id/fail')
  @ApiOperation({ summary: 'Mark a report execution as failed' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report execution marked as failed',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  async failExecution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('errorMessage') errorMessage: string,
  ): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.failExecution(id, errorMessage);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Get all report executions with optional filtering' })
  @ApiQuery({ name: 'savedReportId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ExecutionStatus })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ 
    status: 200, 
    description: 'Report executions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        executions: {
          type: 'array',
          items: { $ref: '#/components/schemas/ReportExecutionResponseDto' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  async findAllExecutions(
    @Query('savedReportId') savedReportId?: string,
    @Query('status') status?: ExecutionStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.reportExecutionService.findAll(savedReportId, status, page, limit);
  }

  @Get('executions/saved-report/:savedReportId')
  @ApiOperation({ summary: 'Get executions by saved report ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report executions retrieved successfully',
    type: [ReportExecutionResponseDto] 
  })
  async findExecutionsBySavedReport(
    @Param('savedReportId', ParseUUIDPipe) savedReportId: string,
  ): Promise<ReportExecutionResponseDto[]> {
    return this.reportExecutionService.findBySavedReport(savedReportId);
  }

  @Get('executions/statistics')
  @ApiOperation({ summary: 'Get report execution statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalExecutions: { type: 'number' },
        runningExecutions: { type: 'number' },
        completedExecutions: { type: 'number' },
        failedExecutions: { type: 'number' },
        averageExecutionTime: { type: 'number' }
      }
    }
  })
  async getExecutionStatistics() {
    return this.reportExecutionService.getStatistics();
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get a report execution by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report execution retrieved successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  async findOneExecution(@Param('id', ParseUUIDPipe) id: string): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.findOne(id);
  }

  @Patch('executions/:id')
  @ApiOperation({ summary: 'Update a report execution' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report execution updated successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async updateExecution(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReportExecutionDto: UpdateReportExecutionDto,
  ): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.update(id, updateReportExecutionDto);
  }

  @Delete('executions/:id')
  @ApiOperation({ summary: 'Delete a report execution' })
  @ApiResponse({ status: 200, description: 'Report execution deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  async removeExecution(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.reportExecutionService.remove(id);
    return { message: 'Report execution deleted successfully' };
  }

  @Post('executions/cleanup')
  @ApiOperation({ summary: 'Clean up old report executions' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cleanup completed successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' }
      }
    }
  })
  async cleanupOldExecutions(
    @Body('daysOld') daysOld: number = 30,
  ) {
    return this.reportExecutionService.cleanupOldExecutions(daysOld);
  }

  // ===== COMBINED ENDPOINTS =====

  @Get('dashboard')
  @ApiOperation({ summary: 'Get reports dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        savedReports: { type: 'object' },
        executions: { type: 'object' },
        recentReports: { type: 'array' },
        recentExecutions: { type: 'array' }
      }
    }
  })
  async getReportsDashboard() {
    const [savedReportsStats, executionStats, recentReports, recentExecutions] = await Promise.all([
      this.savedReportService.getStatistics(),
      this.reportExecutionService.getStatistics(),
      this.savedReportService.findAll(undefined, undefined, undefined, 1, 5),
      this.reportExecutionService.findAll(undefined, undefined, 1, 5),
    ]);

    return {
      savedReports: savedReportsStats,
      executions: executionStats,
      recentReports: recentReports.reports,
      recentExecutions: recentExecutions.executions,
    };
  }

  @Post('saved/:id/execute')
  @ApiOperation({ summary: 'Execute a saved report immediately' })
  @ApiResponse({ 
    status: 201, 
    description: 'Report execution started successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Saved report not found' })
  async executeSavedReport(
    @Param('id', ParseUUIDPipe) savedReportId: string,
  ): Promise<ReportExecutionResponseDto> {
    // Verify the saved report exists
    await this.savedReportService.findOne(savedReportId);
    
    // Start execution
    return this.reportExecutionService.startExecution(savedReportId);
  }
}