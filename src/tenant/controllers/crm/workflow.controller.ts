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
import { WorkflowService } from '../../services/crm/workflow.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilterDto,
  WorkflowResponseDto,
  WorkflowExecutionResponseDto,
  WorkflowExecutionLogResponseDto,
} from '../../dto/crm/workflow.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Workflows (Automations)')
@Controller('crm/workflows')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @RequirePermissions('crm:write', 'crm:workflows:write')
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully', type: WorkflowResponseDto })
  async create(
    @Body(ValidationPipe) createDto: CreateWorkflowDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<WorkflowResponseDto>> {
    const workflow = await this.workflowService.create(createDto, req.user.userId);
    return {
      success: true,
      message: 'Workflow created successfully',
      data: workflow,
    };
  }

  @Get()
  @RequirePermissions('crm:read', 'crm:workflows:read')
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async findMany(
    @Query(ValidationPipe) filters: WorkflowFilterDto,
  ): Promise<ApiResponseDto<{ data: WorkflowResponseDto[]; pagination: any }>> {
    const result = await this.workflowService.findMany(filters);
    return {
      success: true,
      message: 'Workflows retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read', 'crm:workflows:read')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully', type: WorkflowResponseDto })
  async findById(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<WorkflowResponseDto>> {
    const workflow = await this.workflowService.findById(id);
    return {
      success: true,
      message: 'Workflow retrieved successfully',
      data: workflow,
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write', 'crm:workflows:write')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully', type: WorkflowResponseDto })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateWorkflowDto,
  ): Promise<ApiResponseDto<WorkflowResponseDto>> {
    const workflow = await this.workflowService.update(id, updateDto);
    return {
      success: true,
      message: 'Workflow updated successfully',
      data: workflow,
    };
  }

  @Delete(':id')
  @RequirePermissions('crm:write', 'crm:workflows:write')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  async delete(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.workflowService.delete(id);
    return {
      success: true,
      message: 'Workflow deleted successfully',
      data: null,
    };
  }

  @Get(':id/executions')
  @RequirePermissions('crm:read', 'crm:workflows:read')
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiResponse({ status: 200, description: 'Executions retrieved successfully' })
  async getExecutions(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<ApiResponseDto<{ data: WorkflowExecutionResponseDto[]; pagination: any }>> {
    const result = await this.workflowService.getExecutions(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return {
      success: true,
      message: 'Workflow executions retrieved successfully',
      data: result,
    };
  }

  @Get('executions/:executionId/logs')
  @RequirePermissions('crm:read', 'crm:workflows:read')
  @ApiOperation({ summary: 'Get workflow execution logs' })
  @ApiResponse({ status: 200, description: 'Execution logs retrieved successfully' })
  async getExecutionLogs(
    @Param('executionId') executionId: string,
  ): Promise<ApiResponseDto<WorkflowExecutionLogResponseDto[]>> {
    const logs = await this.workflowService.getExecutionLogs(executionId);
    return {
      success: true,
      message: 'Execution logs retrieved successfully',
      data: logs,
    };
  }
}

