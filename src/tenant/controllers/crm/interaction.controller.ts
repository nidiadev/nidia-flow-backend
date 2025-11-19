import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
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
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPermissions } from '../../../common/decorators/user-permissions.decorator';
import { InteractionService } from '../../services/crm/interaction.service';
import {
  CreateInteractionDto,
  UpdateInteractionDto,
  InteractionFilterDto,
  InteractionResponseDto,
  ScheduleInteractionDto,
  CompleteInteractionDto,
  InteractionSummaryDto,
  InteractionType,
  InteractionStatus,
  InteractionOutcome,
  InteractionDirection,
} from '../../dto/crm/interaction.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Interactions')
@ApiBearerAuth()
@Controller('crm/interactions')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) {}

  @Post()
  @RequirePermissions('crm:write', 'crm:interactions:write')
  @ApiOperation({ 
    summary: 'Create a new interaction',
    description: 'Creates a new interaction record for a customer (call, email, meeting, note, etc.)'
  })
  @ApiBody({ type: CreateInteractionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Interaction created successfully',
    type: InteractionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or customer not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to create interactions',
  })
  async create(
    @Body(ValidationPipe) createInteractionDto: CreateInteractionDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<InteractionResponseDto>> {
    const interaction = await this.interactionService.create(createInteractionDto, userId);
    return {
      success: true,
      data: interaction,
      message: 'Interaction created successfully',
    };
  }

  @Post('schedule')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Schedule a future interaction',
    description: 'Creates a scheduled interaction (meeting, call, etc.) for a future date and time'
  })
  @ApiBody({ type: ScheduleInteractionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Interaction scheduled successfully',
    type: InteractionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or scheduled date in the past',
  })
  async schedule(
    @Body(ValidationPipe) scheduleInteractionDto: ScheduleInteractionDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<InteractionResponseDto>> {
    const interaction = await this.interactionService.create(scheduleInteractionDto, userId);
    return {
      success: true,
      data: interaction,
      message: 'Interaction scheduled successfully',
    };
  }

  @Get()
  @RequirePermissions('crm:read', 'crm:interactions:read')
  @ApiOperation({ 
    summary: 'Get interactions with filtering and pagination',
    description: 'Retrieves a paginated list of interactions with optional filtering by customer, type, status, etc.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in subject and content' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'type', required: false, enum: InteractionType, description: 'Filter by interaction type' })
  @ApiQuery({ name: 'status', required: false, enum: InteractionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'direction', required: false, enum: InteractionDirection, description: 'Filter by direction' })
  @ApiQuery({ name: 'outcome', required: false, enum: InteractionOutcome, description: 'Filter by outcome' })
  @ApiQuery({ name: 'createdBy', required: false, type: String, description: 'Filter by creator user ID' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/InteractionResponseDto' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async findMany(
    @Query(ValidationPipe) filterDto: InteractionFilterDto,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() userPermissions?: string[],
  ): Promise<ApiResponseDto<InteractionResponseDto[]>> {
    const result = await this.interactionService.findMany(filterDto, userId, userPermissions);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('customer/:customerId')
  @RequirePermissions('crm:read', 'crm:interactions:read')
  @ApiOperation({ 
    summary: 'Get customer interactions timeline',
    description: 'Retrieves all interactions for a specific customer in chronological order'
  })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'type', required: false, enum: InteractionType, description: 'Filter by interaction type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer interactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/InteractionResponseDto' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async getCustomerTimeline(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: InteractionType,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() userPermissions?: string[],
  ): Promise<ApiResponseDto<InteractionResponseDto[]>> {
    const filterDto: InteractionFilterDto = {
      customerId,
      page: page || 1,
      limit: limit || 20,
      type,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await this.interactionService.findMany(filterDto, userId, userPermissions);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: `Retrieved ${result.data.length} interactions for customer`,
    };
  }

  @Get('upcoming')
  @RequirePermissions('crm:read', 'crm:interactions:read')
  @ApiOperation({ 
    summary: 'Get upcoming scheduled interactions',
    description: 'Retrieves all scheduled interactions for the current user or all users (if admin)'
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days ahead to look (default: 7)' })
  @ApiQuery({ name: 'assignedTo', required: false, type: String, description: 'Filter by assigned user (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upcoming interactions retrieved successfully',
    type: [InteractionResponseDto],
  })
  async getUpcoming(
    @CurrentUser('userId') userId: string,
    @Query('days') days?: number,
    @Query('assignedTo') assignedTo?: string,
    @UserPermissions() userPermissions?: string[],
  ): Promise<ApiResponseDto<InteractionResponseDto[]>> {
    const daysAhead = days || 7;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const filterDto: InteractionFilterDto = {
      status: InteractionStatus.SCHEDULED,
      createdBy: assignedTo || userId, // Use assignedTo if provided (admin), otherwise current user
      scheduledAt: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      sortBy: 'scheduledAt',
      sortOrder: 'asc',
      limit: 100,
    };

    const result = await this.interactionService.findMany(filterDto, userId, userPermissions);
    return {
      success: true,
      data: result.data,
      message: `Found ${result.data.length} upcoming interactions`,
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get interaction by ID',
    description: 'Retrieves detailed interaction information including customer and creator details'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Interaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interaction retrieved successfully',
    type: InteractionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Interaction not found',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<InteractionResponseDto>> {
    const interaction = await this.interactionService.findById(id);
    return {
      success: true,
      data: interaction,
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write', 'crm:interactions:write')
  @ApiOperation({ 
    summary: 'Update interaction',
    description: 'Updates interaction information with provided data'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Interaction ID' })
  @ApiBody({ type: UpdateInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interaction updated successfully',
    type: InteractionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Interaction not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateInteractionDto: UpdateInteractionDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<InteractionResponseDto>> {
    const interaction = await this.interactionService.update(id, updateInteractionDto, userId);
    return {
      success: true,
      data: interaction,
      message: 'Interaction updated successfully',
    };
  }

  @Put(':id/complete')
  @RequirePermissions('crm:write', 'crm:interactions:write')
  @ApiOperation({ 
    summary: 'Complete a scheduled interaction',
    description: 'Marks a scheduled interaction as completed and updates outcome and next actions'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Interaction ID' })
  @ApiBody({ type: CompleteInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interaction completed successfully',
    type: InteractionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Interaction not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Interaction is not scheduled or already completed',
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) completeDto: CompleteInteractionDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<InteractionResponseDto>> {
    const updateDto: UpdateInteractionDto = {
      ...completeDto,
      status: InteractionStatus.COMPLETED,
    };

    const interaction = await this.interactionService.update(id, updateDto, userId);
    return {
      success: true,
      data: interaction,
      message: 'Interaction completed successfully',
    };
  }
}