import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPermissions } from '../../../common/decorators/user-permissions.decorator';
import { InteractionService } from '../../services/crm/interaction.service';
import {
  CalendarFilterDto,
  InteractionResponseDto,
  CreateRecurringActivityDto,
  CreateReminderDto,
  CompleteInteractionDto,
} from '../../dto/crm/interaction.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Calendar')
@ApiBearerAuth()
@Controller('crm/calendar')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CalendarController {
  constructor(private readonly interactionService: InteractionService) {}

  @Get('view')
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get calendar view',
    description: 'Retrieves activities for month, week, or day view'
  })
  @ApiQuery({ name: 'view', enum: ['month', 'week', 'day'], required: true })
  @ApiQuery({ name: 'year', type: Number, required: true })
  @ApiQuery({ name: 'month', type: Number, required: true })
  @ApiQuery({ name: 'week', type: Number, required: false })
  @ApiQuery({ name: 'day', type: Number, required: false })
  @ApiQuery({ name: 'assignedTo', type: String, required: false })
  @ApiQuery({ name: 'type', type: String, required: false })
  @ApiQuery({ name: 'priority', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calendar view retrieved successfully',
  })
  async getCalendarView(
    @Query(ValidationPipe) filterDto: CalendarFilterDto,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<{ activities: InteractionResponseDto[]; dateRange: { start: string; end: string } }>> {
    const result = await this.interactionService.getCalendarView(filterDto, userId, userPermissions);
    return {
      success: true,
      data: result,
    };
  }

  @Get('today')
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get today\'s activities',
    description: 'Retrieves all scheduled activities for today'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Today\'s activities retrieved successfully',
    type: [InteractionResponseDto],
  })
  async getTodayActivities(
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<InteractionResponseDto[]>> {
    const activities = await this.interactionService.getTodayActivities(userId, userPermissions);
    return {
      success: true,
      data: activities,
    };
  }

  @Post('recurring')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Create recurring activity',
    description: 'Creates a recurring activity with multiple instances'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Recurring activity created successfully',
    type: [InteractionResponseDto],
  })
  async createRecurringActivity(
    @Body(ValidationPipe) createDto: CreateRecurringActivityDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<InteractionResponseDto[]>> {
    const activities = await this.interactionService.createRecurringActivity(createDto, userId);
    return {
      success: true,
      data: activities,
      message: `Recurring activity created with ${activities.length} instances`,
    };
  }

  @Post('activities/:id/reminders')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Add reminder to activity',
    description: 'Adds a reminder to a scheduled activity'
  })
  @ApiParam({ name: 'id', type: String, description: 'Activity ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reminder added successfully',
  })
  async addReminder(
    @Param('id', ParseUUIDPipe) activityId: string,
    @Body(ValidationPipe) reminderDto: CreateReminderDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<null>> {
    await this.interactionService.addReminder(activityId, reminderDto, userId);
    return {
      success: true,
      message: 'Reminder added successfully',
      data: null,
    };
  }

  @Post('activities/:id/complete')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Complete an activity',
    description: 'Marks an activity as completed with optional notes and outcome'
  })
  @ApiParam({ name: 'id', type: String, description: 'Activity ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity completed successfully',
    type: InteractionResponseDto,
  })
  async completeActivity(
    @Param('id', ParseUUIDPipe) activityId: string,
    @Body(ValidationPipe) completeDto: CompleteInteractionDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<InteractionResponseDto>> {
    const activity = await this.interactionService.completeActivity(activityId, completeDto, userId);
    return {
      success: true,
      data: activity,
      message: 'Activity completed successfully',
    };
  }
}

