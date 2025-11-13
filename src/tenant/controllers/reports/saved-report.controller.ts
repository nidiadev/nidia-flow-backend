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
import { 
  CreateSavedReportDto, 
  UpdateSavedReportDto, 
  SavedReportResponseDto,
  ReportType 
} from '../../dto/reports/saved-report.dto';

@ApiTags('Saved Reports')
@ApiBearerAuth()
@Controller('reports/saved')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SavedReportController {
  constructor(private readonly savedReportService: SavedReportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new saved report' })
  @ApiResponse({ 
    status: 201, 
    description: 'Saved report created successfully',
    type: SavedReportResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async create(
    @Body() createSavedReportDto: CreateSavedReportDto,
    @CurrentUser() user: any,
  ): Promise<SavedReportResponseDto> {
    return this.savedReportService.create(createSavedReportDto, user.userId);
  }

  @Get()
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
  async findAll(
    @Query('reportType') reportType?: ReportType,
    @Query('isScheduled') isScheduled?: boolean,
    @Query('isActive') isActive?: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.savedReportService.findAll(reportType, isScheduled, isActive, page, limit);
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Get scheduled reports that need to be executed' })
  @ApiResponse({ 
    status: 200, 
    description: 'Scheduled reports retrieved successfully',
    type: [SavedReportResponseDto] 
  })
  async findScheduledReports(): Promise<SavedReportResponseDto[]> {
    return this.savedReportService.findScheduledReports();
  }

  @Get('statistics')
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
  async getStatistics() {
    return this.savedReportService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved report by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Saved report retrieved successfully',
    type: SavedReportResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Saved report not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SavedReportResponseDto> {
    return this.savedReportService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Saved report updated successfully',
    type: SavedReportResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Saved report not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSavedReportDto: UpdateSavedReportDto,
  ): Promise<SavedReportResponseDto> {
    return this.savedReportService.update(id, updateSavedReportDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved report' })
  @ApiResponse({ status: 200, description: 'Saved report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Saved report not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.savedReportService.remove(id);
    return { message: 'Saved report deleted successfully' };
  }
}