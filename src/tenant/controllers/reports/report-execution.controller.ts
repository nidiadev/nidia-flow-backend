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
import { ReportExecutionService } from '../../services/reports/report-execution.service';
import { 
  CreateReportExecutionDto, 
  UpdateReportExecutionDto, 
  ReportExecutionResponseDto,
  ExecutionStatus 
} from '../../dto/reports/report-execution.dto';

@ApiTags('Report Executions')
@ApiBearerAuth()
@Controller('reports/executions')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportExecutionController {
  constructor(private readonly reportExecutionService: ReportExecutionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new report execution' })
  @ApiResponse({ 
    status: 201, 
    description: 'Report execution created successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async create(
    @Body() createReportExecutionDto: CreateReportExecutionDto,
  ): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.create(createReportExecutionDto);
  }

  @Post('start')
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

  @Post(':id/complete')
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

  @Post(':id/fail')
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

  @Get()
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
  async findAll(
    @Query('savedReportId') savedReportId?: string,
    @Query('status') status?: ExecutionStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.reportExecutionService.findAll(savedReportId, status, page, limit);
  }

  @Get('saved-report/:savedReportId')
  @ApiOperation({ summary: 'Get executions by saved report ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report executions retrieved successfully',
    type: [ReportExecutionResponseDto] 
  })
  async findBySavedReport(
    @Param('savedReportId', ParseUUIDPipe) savedReportId: string,
  ): Promise<ReportExecutionResponseDto[]> {
    return this.reportExecutionService.findBySavedReport(savedReportId);
  }

  @Get('statistics')
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
  async getStatistics() {
    return this.reportExecutionService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report execution by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report execution retrieved successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a report execution' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report execution updated successfully',
    type: ReportExecutionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReportExecutionDto: UpdateReportExecutionDto,
  ): Promise<ReportExecutionResponseDto> {
    return this.reportExecutionService.update(id, updateReportExecutionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report execution' })
  @ApiResponse({ status: 200, description: 'Report execution deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report execution not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.reportExecutionService.remove(id);
    return { message: 'Report execution deleted successfully' };
  }

  @Post('cleanup')
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
}