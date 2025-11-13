import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { 
  CreateSavedReportDto, 
  UpdateSavedReportDto, 
  SavedReportResponseDto,
  ReportType,
  ScheduleFrequency 
} from '../../dto/reports/saved-report.dto';

@Injectable()
export class SavedReportService {
  constructor(private readonly prisma: TenantPrismaService) {}

  private async getClient() {
    return this.prisma.getTenantClient();
  }

  /**
   * Create a new saved report
   */
  async create(createSavedReportDto: CreateSavedReportDto, createdBy: string): Promise<SavedReportResponseDto> {
    try {
      const client = await this.getClient();
      // Convert schedule time string to Date if provided
      let scheduleTime: Date | undefined;
      if (createSavedReportDto.scheduleTime) {
        scheduleTime = this.parseTimeString(createSavedReportDto.scheduleTime);
      }

      const savedReport = await client.savedReport.create({
        data: {
          name: createSavedReportDto.name,
          reportType: createSavedReportDto.reportType,
          filters: createSavedReportDto.filters || {},
          isScheduled: createSavedReportDto.isScheduled || false,
          scheduleFrequency: createSavedReportDto.scheduleFrequency,
          scheduleDayOfWeek: createSavedReportDto.scheduleDayOfWeek,
          scheduleDayOfMonth: createSavedReportDto.scheduleDayOfMonth,
          scheduleTime,
          emailRecipients: createSavedReportDto.emailRecipients || [],
          createdBy,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(savedReport);
    } catch (error) {
      throw new BadRequestException(`Failed to create saved report: ${error.message}`);
    }
  }

  /**
   * Find all saved reports with optional filtering
   */
  async findAll(
    reportType?: ReportType,
    isScheduled?: boolean,
    isActive?: boolean,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ reports: SavedReportResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const client = await this.getClient();
    
    const where: any = {};
    if (reportType) where.reportType = reportType;
    if (isScheduled !== undefined) where.isScheduled = isScheduled;
    if (isActive !== undefined) where.isActive = isActive;

    const [reports, total] = await Promise.all([
      client.savedReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              completedAt: true,
            },
          },
        },
      }),
      client.savedReport.count({ where }),
    ]);

    return {
      reports: reports.map(report => this.mapToResponseDto(report)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find scheduled reports that need to be executed
   */
  async findScheduledReports(): Promise<SavedReportResponseDto[]> {
    const client = await this.getClient();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayOfWeek = now.getDay();
    const currentDayOfMonth = now.getDate();

    const reports = await client.savedReport.findMany({
      where: {
        isScheduled: true,
        isActive: true,
        OR: [
          // Daily reports
          {
            scheduleFrequency: ScheduleFrequency.DAILY,
          },
          // Weekly reports
          {
            scheduleFrequency: ScheduleFrequency.WEEKLY,
            scheduleDayOfWeek: currentDayOfWeek,
          },
          // Monthly reports
          {
            scheduleFrequency: ScheduleFrequency.MONTHLY,
            scheduleDayOfMonth: currentDayOfMonth,
          },
        ],
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Filter by time if scheduleTime is set
    const filteredReports = reports.filter(report => {
      if (!report.scheduleTime) return true;
      
      const scheduleHour = report.scheduleTime.getHours();
      const scheduleMinute = report.scheduleTime.getMinutes();
      
      return scheduleHour === currentHour && scheduleMinute === currentMinute;
    });

    return filteredReports.map(report => this.mapToResponseDto(report));
  }

  /**
   * Find a saved report by ID
   */
  async findOne(id: string): Promise<SavedReportResponseDto> {
    const client = await this.getClient();
    const savedReport = await client.savedReport.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!savedReport) {
      throw new NotFoundException(`Saved report with ID ${id} not found`);
    }

    return this.mapToResponseDto(savedReport);
  }

  /**
   * Update a saved report
   */
  async update(id: string, updateSavedReportDto: UpdateSavedReportDto): Promise<SavedReportResponseDto> {
    const client = await this.getClient();
    const existingReport = await client.savedReport.findUnique({
      where: { id },
    });

    if (!existingReport) {
      throw new NotFoundException(`Saved report with ID ${id} not found`);
    }

    try {
      // Convert schedule time string to Date if provided
      let scheduleTime: Date | undefined;
      if (updateSavedReportDto.scheduleTime) {
        scheduleTime = this.parseTimeString(updateSavedReportDto.scheduleTime);
      }

      const updatedReport = await client.savedReport.update({
        where: { id },
        data: {
          name: updateSavedReportDto.name,
          filters: updateSavedReportDto.filters,
          isScheduled: updateSavedReportDto.isScheduled,
          scheduleFrequency: updateSavedReportDto.scheduleFrequency,
          scheduleDayOfWeek: updateSavedReportDto.scheduleDayOfWeek,
          scheduleDayOfMonth: updateSavedReportDto.scheduleDayOfMonth,
          scheduleTime,
          emailRecipients: updateSavedReportDto.emailRecipients,
          isActive: updateSavedReportDto.isActive,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedReport);
    } catch (error) {
      throw new BadRequestException(`Failed to update saved report: ${error.message}`);
    }
  }

  /**
   * Delete a saved report
   */
  async remove(id: string): Promise<void> {
    const client = await this.getClient();
    const existingReport = await client.savedReport.findUnique({
      where: { id },
    });

    if (!existingReport) {
      throw new NotFoundException(`Saved report with ID ${id} not found`);
    }

    try {
      await client.savedReport.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to delete saved report: ${error.message}`);
    }
  }

  /**
   * Get report statistics
   */
  async getStatistics(): Promise<{
    totalReports: number;
    scheduledReports: number;
    reportsByType: Record<string, number>;
    recentExecutions: number;
  }> {
    const client = await this.getClient();
    const [totalReports, scheduledReports, reportsByType, recentExecutions] = await Promise.all([
      client.savedReport.count(),
      client.savedReport.count({
        where: { isScheduled: true, isActive: true },
      }),
      client.savedReport.groupBy({
        by: ['reportType'],
        _count: {
          id: true,
        },
      }),
      client.reportExecution.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalReports,
      scheduledReports,
      reportsByType: reportsByType.reduce((acc, item) => {
        acc[item.reportType] = item._count.id;
        return acc;
      }, {}),
      recentExecutions,
    };
  }

  /**
   * Parse time string (HH:MM) to Date object
   */
  private parseTimeString(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Format time from Date to string (HH:MM)
   */
  private formatTimeString(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(savedReport: any): SavedReportResponseDto {
    return {
      id: savedReport.id,
      name: savedReport.name,
      reportType: savedReport.reportType,
      filters: savedReport.filters,
      isScheduled: savedReport.isScheduled,
      scheduleFrequency: savedReport.scheduleFrequency,
      scheduleDayOfWeek: savedReport.scheduleDayOfWeek,
      scheduleDayOfMonth: savedReport.scheduleDayOfMonth,
      scheduleTime: savedReport.scheduleTime ? this.formatTimeString(savedReport.scheduleTime) : undefined,
      emailRecipients: savedReport.emailRecipients,
      isActive: savedReport.isActive,
      createdBy: savedReport.createdBy,
      createdAt: savedReport.createdAt,
      updatedAt: savedReport.updatedAt,
    };
  }
}