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
  Headers,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { WebFormService } from '../../services/crm/web-form.service';
import {
  CreateWebFormDto,
  UpdateWebFormDto,
  WebFormFilterDto,
  WebFormResponseDto,
  WebFormSubmissionResponseDto,
  SubmitWebFormDto,
} from '../../dto/crm/web-form.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Web Forms')
@Controller('crm/web-forms')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class WebFormController {
  constructor(private readonly webFormService: WebFormService) {}

  @Post()
  @RequirePermissions('crm:write', 'crm:workflows:write')
  @ApiOperation({ summary: 'Create a new web form' })
  @ApiResponse({ status: 201, description: 'Web form created successfully', type: WebFormResponseDto })
  async create(
    @Body(ValidationPipe) createDto: CreateWebFormDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<WebFormResponseDto>> {
    const form = await this.webFormService.create(createDto, req.user.userId);
    return {
      success: true,
      message: 'Web form created successfully',
      data: form,
    };
  }

  @Get()
  @RequirePermissions('crm:read', 'crm:workflows:read')
  @ApiOperation({ summary: 'Get all web forms' })
  @ApiResponse({ status: 200, description: 'Web forms retrieved successfully' })
  async findMany(
    @Query(ValidationPipe) filters: WebFormFilterDto,
  ): Promise<ApiResponseDto<{ data: WebFormResponseDto[]; pagination: any }>> {
    const result = await this.webFormService.findMany(filters);
    return {
      success: true,
      message: 'Web forms retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read', 'crm:workflows:read')
  @ApiOperation({ summary: 'Get web form by ID' })
  @ApiResponse({ status: 200, description: 'Web form retrieved successfully', type: WebFormResponseDto })
  async findById(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<WebFormResponseDto>> {
    const form = await this.webFormService.findById(id);
    return {
      success: true,
      message: 'Web form retrieved successfully',
      data: form,
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write', 'crm:workflows:write')
  @ApiOperation({ summary: 'Update web form' })
  @ApiResponse({ status: 200, description: 'Web form updated successfully', type: WebFormResponseDto })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateWebFormDto,
  ): Promise<ApiResponseDto<WebFormResponseDto>> {
    const form = await this.webFormService.update(id, updateDto);
    return {
      success: true,
      message: 'Web form updated successfully',
      data: form,
    };
  }

  @Delete(':id')
  @RequirePermissions('crm:write', 'crm:workflows:write')
  @ApiOperation({ summary: 'Delete web form' })
  @ApiResponse({ status: 200, description: 'Web form deleted successfully' })
  async delete(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.webFormService.delete(id);
    return {
      success: true,
      message: 'Web form deleted successfully',
      data: null,
    };
  }

  @Get(':id/submissions')
  @RequirePermissions('crm:read', 'crm:workflows:read')
  @ApiOperation({ summary: 'Get form submissions' })
  @ApiResponse({ status: 200, description: 'Submissions retrieved successfully' })
  async getSubmissions(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<ApiResponseDto<{ data: WebFormSubmissionResponseDto[]; pagination: any }>> {
    const result = await this.webFormService.getSubmissions(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return {
      success: true,
      message: 'Submissions retrieved successfully',
      data: result,
    };
  }
}

/**
 * Public controller for form submissions (no auth required)
 */
@ApiTags('Public - Web Forms')
@Controller('public/forms')
export class PublicWebFormController {
  constructor(private readonly webFormService: WebFormService) {}

  @Get(':embedId')
  @ApiOperation({ summary: 'Get public web form by embed ID' })
  @ApiResponse({ status: 200, description: 'Web form retrieved successfully', type: WebFormResponseDto })
  async getForm(
    @Param('embedId') embedId: string,
  ): Promise<ApiResponseDto<WebFormResponseDto>> {
    const form = await this.webFormService.findByEmbedId(embedId);
    return {
      success: true,
      message: 'Web form retrieved successfully',
      data: form,
    };
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit web form (public)' })
  @ApiResponse({ status: 201, description: 'Form submitted successfully', type: WebFormSubmissionResponseDto })
  async submitForm(
    @Param('id') id: string,
    @Body(ValidationPipe) submitDto: SubmitWebFormDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('referer') referer: string,
  ): Promise<ApiResponseDto<WebFormSubmissionResponseDto>> {
    const submission = await this.webFormService.submitForm(id, submitDto, {
      ipAddress,
      userAgent,
      sourceUrl: referer,
    });
    return {
      success: true,
      message: 'Form submitted successfully',
      data: submission,
    };
  }
}

