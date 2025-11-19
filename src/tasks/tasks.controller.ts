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
  Request,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { TaskChecklistService } from './task-checklist.service';
import { TaskDependencyService } from './task-dependency.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto, CheckInDto, CheckOutDto, LocationUpdateDto, TaskSearchDto, UploadPhotosDto, CaptureSignatureDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPermissions } from '../common/decorators/user-permissions.decorator';

@ApiTags('Tasks - Advanced Operations API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly checklistService: TaskChecklistService,
    private readonly dependencyService: TaskDependencyService,
  ) {}

  @Post()
  @RequirePermissions('tasks:write', 'tasks:create')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.create(createTaskDto, userId);
  }

  @Get()
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Get all tasks with filters' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async findAll(
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('customerId') customerId?: string,
    @Query('orderId') orderId?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() userPermissions?: string[],
  ) {
    const filters = {
      status: status as any,
      assignedTo,
      customerId,
      orderId,
      type,
      priority: priority as any,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return this.tasksService.findAll(filters, userId, userPermissions);
  }

  @Get(':id')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('tasks:write', 'tasks:update')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.update(id, updateTaskDto, userId);
  }

  @Post(':id/assign/:userId')
  @ApiOperation({ summary: 'Assign task to user' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 400, description: 'Cannot assign task' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  async assignTask(
    @Param('id') id: string,
    @Param('userId') assignedTo: string,
    @Request() req: any,
  ) {
    return this.tasksService.assignTask(id, assignedTo, req.user.userId);
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Check in to task' })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Cannot check in' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async checkIn(
    @Param('id') id: string,
    @Body() checkInDto: CheckInDto,
    @Request() req: any,
  ) {
    return this.tasksService.checkIn(id, checkInDto, req.user.userId);
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Check out from task' })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({ status: 400, description: 'Cannot check out' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async checkOut(
    @Param('id') id: string,
    @Body() checkOutDto: CheckOutDto,
    @Request() req: any,
  ) {
    return this.tasksService.checkOut(id, checkOutDto, req.user.userId);
  }

  @Delete(':id')
  @RequirePermissions('tasks:delete')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  // Checklist endpoints
  @Get(':id/checklist')
  @ApiOperation({ summary: 'Get task checklist' })
  @ApiResponse({ status: 200, description: 'Checklist retrieved successfully' })
  async getChecklist(@Param('id') taskId: string) {
    return this.checklistService.getTaskChecklist(taskId);
  }

  @Post(':id/checklist')
  @ApiOperation({ summary: 'Add checklist item' })
  @ApiResponse({ status: 201, description: 'Checklist item added successfully' })
  async addChecklistItem(
    @Param('id') taskId: string,
    @Body() body: { item: string; sortOrder?: number },
  ) {
    return this.checklistService.addChecklistItem(taskId, body.item, body.sortOrder);
  }

  @Patch('checklist/:itemId/complete')
  @ApiOperation({ summary: 'Complete checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item completed successfully' })
  async completeChecklistItem(
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    return this.checklistService.completeChecklistItem(itemId, req.user.userId);
  }

  @Patch('checklist/:itemId/uncomplete')
  @ApiOperation({ summary: 'Uncomplete checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item uncompleted successfully' })
  async uncompleteChecklistItem(
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    return this.checklistService.uncompleteChecklistItem(itemId, req.user.userId);
  }

  @Delete('checklist/:itemId')
  @ApiOperation({ summary: 'Delete checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item deleted successfully' })
  async deleteChecklistItem(@Param('itemId') itemId: string) {
    return this.checklistService.deleteChecklistItem(itemId);
  }

  @Get(':id/checklist/progress')
  @ApiOperation({ summary: 'Get checklist progress' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getChecklistProgress(@Param('id') taskId: string) {
    return this.checklistService.getChecklistProgress(taskId);
  }

  // Dependencies endpoints
  @Get(':id/dependencies')
  @ApiOperation({ summary: 'Get task dependencies' })
  @ApiResponse({ status: 200, description: 'Dependencies retrieved successfully' })
  async getDependencies(@Param('id') taskId: string) {
    return this.dependencyService.getTaskDependencies(taskId);
  }

  @Post(':id/dependencies/:dependsOnTaskId')
  @ApiOperation({ summary: 'Add task dependency' })
  @ApiResponse({ status: 201, description: 'Dependency added successfully' })
  @ApiResponse({ status: 400, description: 'Cannot add dependency' })
  async addDependency(
    @Param('id') taskId: string,
    @Param('dependsOnTaskId') dependsOnTaskId: string,
    @Body() body?: { dependencyType?: string },
  ) {
    return this.dependencyService.addDependency(
      taskId,
      dependsOnTaskId,
      body?.dependencyType as any,
    );
  }

  @Delete(':id/dependencies/:dependsOnTaskId')
  @ApiOperation({ summary: 'Remove task dependency' })
  @ApiResponse({ status: 200, description: 'Dependency removed successfully' })
  async removeDependency(
    @Param('id') taskId: string,
    @Param('dependsOnTaskId') dependsOnTaskId: string,
  ) {
    return this.dependencyService.removeDependency(taskId, dependsOnTaskId);
  }

  @Get(':id/dependents')
  @ApiOperation({ summary: 'Get dependent tasks' })
  @ApiResponse({ status: 200, description: 'Dependent tasks retrieved successfully' })
  async getDependentTasks(@Param('id') taskId: string) {
    return this.dependencyService.getDependentTasks(taskId);
  }

  // Advanced Task Operations

  @Post('search')
  @ApiOperation({ 
    summary: 'Advanced task search with filters',
    description: 'Search tasks with multiple filters including text search, location-based search, and advanced filtering options'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tasks found successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Task' }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async searchTasks(@Body() searchDto: TaskSearchDto) {
    return this.tasksService.searchTasks(searchDto);
  }

  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload photos for task evidence',
    description: 'Upload multiple photos as evidence for task completion. Maximum 10 photos per upload.'
  })
  @ApiBody({
    description: 'Photos and optional descriptions',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          }
        },
        descriptions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Photos uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        photoUrls: { type: 'array', items: { type: 'string' } },
        totalPhotos: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @ApiResponse({ status: 403, description: 'Only assigned user can upload photos' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: any[],
    @Body() uploadDto: UploadPhotosDto,
    @Request() req: any,
  ) {
    return this.tasksService.uploadPhotos(id, files, uploadDto, req.user.userId);
  }

  @Post(':id/signature')
  @ApiOperation({ 
    summary: 'Capture digital signature for task completion',
    description: 'Capture customer digital signature as proof of task completion and customer acceptance'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Signature captured successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        signatureUrl: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid signature data' })
  @ApiResponse({ status: 403, description: 'Only assigned user can capture signature' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async captureSignature(
    @Param('id') id: string,
    @Body() signatureDto: CaptureSignatureDto,
    @Request() req: any,
  ) {
    return this.tasksService.captureSignature(id, signatureDto, req.user.userId);
  }

  @Post(':id/location')
  @ApiOperation({ summary: 'Update task location in real-time' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid location data' })
  async updateLocation(
    @Param('id') id: string,
    @Body() locationDto: LocationUpdateDto,
    @Request() req: any,
  ) {
    return this.tasksService.updateLocation(id, locationDto, req.user.userId);
  }

  @Get(':id/route')
  @ApiOperation({ summary: 'Get optimized route to task location' })
  @ApiResponse({ status: 200, description: 'Route calculated successfully' })
  async getRoute(
    @Param('id') id: string,
    @Query('fromLat') fromLat: string,
    @Query('fromLng') fromLng: string,
  ) {
    return this.tasksService.getRoute(id, parseFloat(fromLat), parseFloat(fromLng));
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get task timeline with all events' })
  @ApiResponse({ status: 200, description: 'Timeline retrieved successfully' })
  async getTaskTimeline(@Param('id') id: string) {
    return this.tasksService.getTaskTimeline(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate task with new schedule' })
  @ApiResponse({ status: 201, description: 'Task duplicated successfully' })
  async duplicateTask(
    @Param('id') id: string,
    @Body() body: { scheduledStart?: string; customerId?: string },
    @Request() req: any,
  ) {
    return this.tasksService.duplicateTask(id, body, req.user.userId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get task templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTaskTemplates() {
    return this.tasksService.getTaskTemplates();
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create task template from existing task' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTaskTemplate(
    @Body() body: { taskId: string; templateName: string; description?: string },
    @Request() req: any,
  ) {
    return this.tasksService.createTaskTemplate(body, req.user.userId);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get task analytics summary' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getTaskAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.tasksService.getTaskAnalytics({ dateFrom, dateTo, assignedTo });
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby tasks for location optimization' })
  @ApiResponse({ status: 200, description: 'Nearby tasks retrieved successfully' })
  async getNearbyTasks(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.tasksService.getNearbyTasks(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 10,
      assignedTo,
    );
  }
}