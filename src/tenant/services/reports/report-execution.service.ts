import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { 
  CreateReportExecutionDto, 
  UpdateReportExecutionDto, 
  ReportExecutionResponseDto,
  ExecutionStatus 
} from '../../dto/reports/report-execution.dto';

@Injectable()
export class ReportExecutionService {
  constructor(private readonly prisma: TenantPrismaService) {}

  private async getClient() {
    return this.prisma.getTenantClient();
  }

  /**
   * Create a new report execution
   */
  async create(createReportExecutionDto: CreateReportExecutionDto): Promise<ReportExecutionResponseDto> {
    try {
      const client = await this.getClient();
      const reportExecution = await client.reportExecution.create({
        data: {
          savedReportId: createReportExecutionDto.savedReportId,
          status: createReportExecutionDto.status,
          startedAt: createReportExecutionDto.status === ExecutionStatus.RUNNING ? new Date() : undefined,
          completedAt: createReportExecutionDto.status === ExecutionStatus.COMPLETED ? new Date() : undefined,
          resultFileUrl: createReportExecutionDto.resultFileUrl,
          errorMessage: createReportExecutionDto.errorMessage,
        },
        include: {
          savedReport: {
            select: {
              id: true,
              name: true,
              reportType: true,
            },
          },
        },
      });

      return this.mapToResponseDto(reportExecution);
    } catch (error) {
      throw new BadRequestException(`Failed to create report execution: ${error.message}`);
    }
  }

  /**
   * Start a new report execution
   */
  async startExecution(savedReportId?: string): Promise<ReportExecutionResponseDto> {
    try {
      const client = await this.getClient();
      const reportExecution = await client.reportExecution.create({
        data: {
          savedReportId,
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
        },    
    include: {
          savedReport: {
            select: {
              id: true,
              name: true,
              reportType: true,
            },
          },
        },
      });

      return this.mapToResponseDto(reportExecution);
    } catch (error) {
      throw new BadRequestException(`Failed to start report execution: ${error.message}`);
    }
  }

  /**
   * Complete a report execution
   */
  async completeExecution(id: string, resultFileUrl?: string): Promise<ReportExecutionResponseDto> {
    const client = await this.getClient();
    const existingExecution = await client.reportExecution.findUnique({
      where: { id },
    });

    if (!existingExecution) {
      throw new NotFoundException(`Report execution with ID ${id} not found`);
    }

    try {
      const updatedExecution = await client.reportExecution.update({
        where: { id },
        data: {
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date(),
          resultFileUrl,
          errorMessage: null, // Clear any previous error
        },
        include: {
          savedReport: {
            select: {
              id: true,
              name: true,
              reportType: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedExecution);
    } catch (error) {
      throw new BadRequestException(`Failed to complete report execution: ${error.message}`);
    }
  }

  /**
   * Fail a report execution
   */
  async failExecution(id: string, errorMessage: string): Promise<ReportExecutionResponseDto> {
    const client = await this.getClient();
    const existingExecution = await client.reportExecution.findUnique({
      where: { id },
    });

    if (!existingExecution) {
      throw new NotFoundException(`Report execution with ID ${id} not found`);
    }

    try {
      const updatedExecution = await client.reportExecution.update({
        where: { id },
        data: {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          errorMessage,
        },    
    include: {
          savedReport: {
            select: {
              id: true,
              name: true,
              reportType: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedExecution);
    } catch (error) {
      throw new BadRequestException(`Failed to fail report execution: ${error.message}`);
    }
  }

  /**
   * Find all report executions with optional filtering
   */
  async findAll(
    savedReportId?: string,
    status?: ExecutionStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ executions: ReportExecutionResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const client = await this.getClient();
    
    const where: any = {};
    if (savedReportId) where.savedReportId = savedReportId;
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      client.reportExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          savedReport: {
            select: {
              id: true,
              name: true,
              reportType: true,
            },
          },
        },
      }),
      client.reportExecution.count({ where }),
    ]);

    return {
      executions: executions.map(execution => this.mapToResponseDto(execution)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find executions by saved report ID
   */
  async findBySavedReport(savedReportId: string): Promise<ReportExecutionResponseDto[]> {
    const client = await this.getClient();
    const executions = await client.reportExecution.findMany({
      where: { savedReportId },
      orderBy: { createdAt: 'desc' },
      include: {
        savedReport: {
          select: {
            id: true,
            name: true,
            reportType: true,
          },
        },
      },
    });

    return executions.map(execution => this.mapToResponseDto(execution));
  }  /**
   
* Find a report execution by ID
   */
  async findOne(id: string): Promise<ReportExecutionResponseDto> {
    const client = await this.getClient();
    const reportExecution = await client.reportExecution.findUnique({
      where: { id },
      include: {
        savedReport: {
          select: {
            id: true,
            name: true,
            reportType: true,
            filters: true,
          },
        },
      },
    });

    if (!reportExecution) {
      throw new NotFoundException(`Report execution with ID ${id} not found`);
    }

    return this.mapToResponseDto(reportExecution);
  }

  /**
   * Update a report execution
   */
  async update(id: string, updateReportExecutionDto: UpdateReportExecutionDto): Promise<ReportExecutionResponseDto> {
    const client = await this.getClient();
    const existingExecution = await client.reportExecution.findUnique({
      where: { id },
    });

    if (!existingExecution) {
      throw new NotFoundException(`Report execution with ID ${id} not found`);
    }

    try {
      const updatedExecution = await client.reportExecution.update({
        where: { id },
        data: {
          status: updateReportExecutionDto.status,
          completedAt: updateReportExecutionDto.status === ExecutionStatus.COMPLETED ? new Date() : undefined,
          resultFileUrl: updateReportExecutionDto.resultFileUrl,
          errorMessage: updateReportExecutionDto.errorMessage,
        },
        include: {
          savedReport: {
            select: {
              id: true,
              name: true,
              reportType: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedExecution);
    } catch (error) {
      throw new BadRequestException(`Failed to update report execution: ${error.message}`);
    }
  }

  /**
   * Delete a report execution
   */
  async remove(id: string): Promise<void> {
    const client = await this.getClient();
    const existingExecution = await client.reportExecution.findUnique({
      where: { id },
    });

    if (!existingExecution) {
      throw new NotFoundException(`Report execution with ID ${id} not found`);
    }

    try {
      await client.reportExecution.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to delete report execution: ${error.message}`);
    }
  }  
/**
   * Get execution statistics
   */
  async getStatistics(): Promise<{
    totalExecutions: number;
    runningExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  }> {
    const client = await this.getClient();
    const [totalExecutions, runningExecutions, completedExecutions, failedExecutions, executionTimes] = await Promise.all([
      client.reportExecution.count(),
      client.reportExecution.count({
        where: { status: ExecutionStatus.RUNNING },
      }),
      client.reportExecution.count({
        where: { status: ExecutionStatus.COMPLETED },
      }),
      client.reportExecution.count({
        where: { status: ExecutionStatus.FAILED },
      }),
      client.reportExecution.findMany({
        where: {
          status: ExecutionStatus.COMPLETED,
          startedAt: { not: null },
          completedAt: { not: null },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Calculate average execution time in seconds
    let averageExecutionTime = 0;
    if (executionTimes.length > 0) {
      const totalTime = executionTimes.reduce((sum, execution) => {
        if (execution.startedAt && execution.completedAt) {
          return sum + (execution.completedAt.getTime() - execution.startedAt.getTime());
        }
        return sum;
      }, 0);
      averageExecutionTime = Math.round(totalTime / executionTimes.length / 1000); // Convert to seconds
    }

    return {
      totalExecutions,
      runningExecutions,
      completedExecutions,
      failedExecutions,
      averageExecutionTime,
    };
  }

  /**
   * Clean up old executions (older than specified days)
   */
  async cleanupOldExecutions(daysOld: number = 30): Promise<{ deletedCount: number }> {
    const client = await this.getClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedExecutions = await client.reportExecution.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED],
        },
      },
    });

    return { deletedCount: deletedExecutions.count };
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(reportExecution: any): ReportExecutionResponseDto {
    return {
      id: reportExecution.id,
      savedReportId: reportExecution.savedReportId,
      status: reportExecution.status,
      startedAt: reportExecution.startedAt,
      completedAt: reportExecution.completedAt,
      resultFileUrl: reportExecution.resultFileUrl,
      errorMessage: reportExecution.errorMessage,
      createdAt: reportExecution.createdAt,
    };
  }
}