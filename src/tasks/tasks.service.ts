import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/services/tenant-prisma.service';
import { BusinessEventEmitterService } from '../common/events/event-emitter.service';
import { BusinessEventTypes } from '../common/events/business-events';
import { CreateTaskDto, TaskStatus, TaskPriority } from './dto/create-task.dto';
import { UpdateTaskDto, CheckInDto, CheckOutDto, LocationUpdateDto, TaskSearchDto, UploadPhotosDto, CaptureSignatureDto } from './dto/update-task.dto';
import { TaskDependencyService } from './task-dependency.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly eventEmitter: BusinessEventEmitterService,
    private readonly taskDependencyService: TaskDependencyService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    // Validar dependencias si existen
    if (createTaskDto.dependencies && createTaskDto.dependencies.length > 0) {
      await this.taskDependencyService.validateDependencies(createTaskDto.dependencies);
    }

    const task = await client.$transaction(async (tx) => {
      // Crear la tarea
      const newTask = await tx.task.create({
        data: {
          orderId: createTaskDto.orderId,
          customerId: createTaskDto.customerId,
          title: createTaskDto.title,
          description: createTaskDto.description,
          type: createTaskDto.type,
          status: TaskStatus.PENDING,
          priority: createTaskDto.priority || TaskPriority.MEDIUM,
          assignedTo: createTaskDto.assignedTo,
          scheduledStart: createTaskDto.scheduledStart ? new Date(createTaskDto.scheduledStart) : null,
          scheduledEnd: createTaskDto.scheduledEnd ? new Date(createTaskDto.scheduledEnd) : null,
          estimatedDurationMinutes: createTaskDto.estimatedDurationMinutes,
          locationAddress: createTaskDto.locationAddress,
          locationCity: createTaskDto.locationCity,
          locationLatitude: createTaskDto.locationLatitude,
          locationLongitude: createTaskDto.locationLongitude,
          notes: createTaskDto.notes,
          createdBy: userId,
        },
        include: {
          customer: true,
          assignedToUser: true,
          order: true,
        },
      });

      // Crear checklist si existe
      if (createTaskDto.checklist && createTaskDto.checklist.length > 0) {
        await Promise.all(
          createTaskDto.checklist.map((item, index) =>
            tx.taskChecklist.create({
              data: {
                taskId: newTask.id,
                item: item.item,
                sortOrder: item.sortOrder || index,
              },
            }),
          ),
        );
      }

      // Crear dependencias si existen
      if (createTaskDto.dependencies && createTaskDto.dependencies.length > 0) {
        await Promise.all(
          createTaskDto.dependencies.map((dependsOnTaskId) =>
            tx.taskDependency.create({
              data: {
                taskId: newTask.id,
                dependsOnTaskId,
                dependencyType: 'finish_to_start',
              },
            }),
          ),
        );
      }

      return newTask;
    });

    // Emitir evento
    await this.eventEmitter.emit(BusinessEventTypes.TASK_CREATED, {
      taskId: task.id,
      orderId: task.orderId,
      customerId: task.customerId,
      title: task.title,
      type: task.type,
      priority: task.priority,
      assignedTo: task.assignedTo,
      scheduledStart: task.scheduledStart,
      location: {
        address: task.locationAddress,
        latitude: task.locationLatitude,
        longitude: task.locationLongitude,
      },
      createdBy: userId,
      timestamp: new Date(),
    });

    return task;
  }

  async findAll(filters?: {
    status?: TaskStatus;
    assignedTo?: string;
    customerId?: string;
    orderId?: string;
    type?: string;
    priority?: TaskPriority;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const client = await this.prisma.getTenantClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledStart = {};
      if (filters.dateFrom) {
        where.scheduledStart.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.scheduledStart.lte = new Date(filters.dateTo);
      }
    }

    const [tasks, total] = await Promise.all([
      client.task.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              type: true,
            },
          },
          checklists: {
            orderBy: { sortOrder: 'asc' },
          },
          dependencies: {
            include: {
              dependsOnTask: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledStart: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      client.task.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
        checklists: {
          orderBy: { sortOrder: 'asc' },
          include: {
            completedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        dependencies: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
                completedAt: true,
              },
            },
          },
        },
        dependentTasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    const existingTask = await client.task.findUnique({
      where: { id },
      include: { dependencies: true },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    // Validar transiciones de estado
    if (updateTaskDto.status) {
      this.validateStatusTransition(existingTask.status as TaskStatus, updateTaskDto.status);
      
      // Validar dependencias antes de iniciar tarea
      if (updateTaskDto.status === TaskStatus.IN_PROGRESS) {
        await this.taskDependencyService.validateCanStart(id);
      }
    }

    const updatedTask = await client.$transaction(async (tx) => {
      const updateData: any = { ...updateTaskDto };

      // Agregar timestamps específicos según el estado
      if (updateTaskDto.status === TaskStatus.ASSIGNED) {
        updateData.assignedAt = new Date();
      } else if (updateTaskDto.status === TaskStatus.IN_PROGRESS) {
        updateData.startedAt = new Date();
      } else if (updateTaskDto.status === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (updateTaskDto.status === TaskStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
      }

      const task = await tx.task.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          assignedToUser: true,
          order: true,
        },
      });

      // Actualizar checklist si se proporciona
      if (updateTaskDto.checklist) {
        // Eliminar checklist existente
        await tx.taskChecklist.deleteMany({
          where: { taskId: id },
        });

        // Crear nuevo checklist
        await Promise.all(
          updateTaskDto.checklist.map((item, index) =>
            tx.taskChecklist.create({
              data: {
                taskId: id,
                item: item.item,
                sortOrder: item.sortOrder || index,
              },
            }),
          ),
        );
      }

      return task;
    });

    // Emitir evento si cambió el estado
    if (updateTaskDto.status && updateTaskDto.status !== existingTask.status) {
      await this.eventEmitter.emit(BusinessEventTypes.TASK_STATUS_CHANGED, {
        taskId: id,
        orderId: updatedTask.orderId,
        customerId: updatedTask.customerId,
        oldStatus: existingTask.status,
        newStatus: updateTaskDto.status,
        assignedTo: updatedTask.assignedTo,
        userId,
        timestamp: new Date(),
      });
    }

    return updatedTask;
  }

  async checkIn(id: string, checkInDto: CheckInDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException('Task must be assigned to check in');
    }

    if (task.assignedTo !== userId) {
      throw new BadRequestException('Only assigned user can check in');
    }

    // Validar dependencias
    await this.taskDependencyService.validateCanStart(id);

    const updatedTask = await client.task.update({
      where: { id },
      data: {
        status: TaskStatus.IN_PROGRESS,
        startedAt: new Date(),
        checkinTime: new Date(),
        checkinLatitude: checkInDto.latitude,
        checkinLongitude: checkInDto.longitude,
        notes: checkInDto.notes || task.notes,
      },
      include: {
        customer: true,
        assignedToUser: true,
      },
    });

    // Emitir evento
    await this.eventEmitter.emit(BusinessEventTypes.TASK_CHECKED_IN, {
      taskId: id,
      orderId: task.orderId,
      assignedTo: userId,
      location: {
        latitude: checkInDto.latitude,
        longitude: checkInDto.longitude,
      },
      timestamp: new Date(),
    });

    return updatedTask;
  }

  async checkOut(id: string, checkOutDto: CheckOutDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
      include: { checklists: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Task must be in progress to check out');
    }

    if (task.assignedTo !== userId) {
      throw new BadRequestException('Only assigned user can check out');
    }

    // Validar que el checklist esté completo
    const incompleteItems = task.checklists.filter(item => !item.isCompleted);
    if (incompleteItems.length > 0) {
      throw new BadRequestException('All checklist items must be completed before checking out');
    }

    // Calcular duración real
    const actualDurationMinutes = task.startedAt 
      ? Math.round((new Date().getTime() - task.startedAt.getTime()) / (1000 * 60))
      : null;

    const updatedTask = await client.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        checkoutTime: new Date(),
        checkoutLatitude: checkOutDto.latitude,
        checkoutLongitude: checkOutDto.longitude,
        actualDurationMinutes,
        completionNotes: checkOutDto.completionNotes,
        photos: checkOutDto.photos || [],
        signatureUrl: checkOutDto.signatureUrl,
      },
      include: {
        customer: true,
        assignedToUser: true,
        order: true,
      },
    });

    // Emitir evento
    await this.eventEmitter.emit(BusinessEventTypes.TASK_COMPLETED, {
      taskId: id,
      orderId: task.orderId,
      customerId: task.customerId,
      assignedTo: userId,
      actualDuration: actualDurationMinutes,
      location: {
        latitude: checkOutDto.latitude,
        longitude: checkOutDto.longitude,
      },
      photos: checkOutDto.photos,
      signatureUrl: checkOutDto.signatureUrl,
      timestamp: new Date(),
    });

    return updatedTask;
  }

  async assignTask(id: string, assignedTo: string, userId: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Can only assign pending tasks');
    }

    // Verificar que el usuario asignado existe
    const assignedUser = await client.user.findUnique({
      where: { id: assignedTo },
    });

    if (!assignedUser) {
      throw new NotFoundException('Assigned user not found');
    }

    const updatedTask = await client.task.update({
      where: { id },
      data: {
        assignedTo,
        status: TaskStatus.ASSIGNED,
        assignedAt: new Date(),
      },
      include: {
        customer: true,
        assignedToUser: true,
      },
    });

    // Emitir evento
    await this.eventEmitter.emit(BusinessEventTypes.TASK_ASSIGNED, {
      taskId: id,
      orderId: task.orderId,
      customerId: task.customerId,
      assignedTo,
      assignedBy: userId,
      timestamp: new Date(),
    });

    return updatedTask;
  }

  async remove(id: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
      include: { 
        dependencies: true,
        dependentTasks: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Validar que se puede eliminar
    if (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete task in progress or completed');
    }

    if (task.dependentTasks.length > 0) {
      throw new BadRequestException('Cannot delete task with dependent tasks');
    }

    await client.$transaction(async (tx) => {
      // Eliminar dependencias
      await tx.taskDependency.deleteMany({
        where: { taskId: id },
      });

      // Eliminar checklist
      await tx.taskChecklist.deleteMany({
        where: { taskId: id },
      });

      // Eliminar tarea
      await tx.task.delete({
        where: { id },
      });
    });

    return { message: 'Task deleted successfully' };
  }

  async searchTasks(searchDto: any) {
    const client = await this.prisma.getTenantClient();
    const {
      q,
      status,
      assignedTo,
      customerId,
      type,
      priority,
      dateFrom,
      dateTo,
      radius,
      centerLat,
      centerLng,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = searchDto;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Text search
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { locationAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    // Date range
    if (dateFrom || dateTo) {
      where.scheduledStart = {};
      if (dateFrom) where.scheduledStart.gte = new Date(dateFrom);
      if (dateTo) where.scheduledStart.lte = new Date(dateTo);
    }

    // Location-based search (simplified - in production use PostGIS)
    if (radius && centerLat && centerLng) {
      where.AND = [
        { locationLatitude: { not: null } },
        { locationLongitude: { not: null } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [tasks, total] = await Promise.all([
      client.task.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              type: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      client.task.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async uploadPhotos(id: string, files: any[], uploadDto: any, userId: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignedTo !== userId) {
      throw new BadRequestException('Only assigned user can upload photos');
    }

    // In production, upload to S3 and get URLs
    // For now, simulate photo URLs
    const photoUrls = files.map((file, index) => {
      return `https://storage.example.com/tasks/${id}/photo_${Date.now()}_${index}.jpg`;
    });

    const updatedTask = await client.task.update({
      where: { id },
      data: {
        photos: [...(task.photos || []), ...photoUrls],
      },
    });

    // Emit event
    await this.eventEmitter.emit(BusinessEventTypes.TASK_STATUS_CHANGED, {
      taskId: id,
      oldStatus: task.status,
      newStatus: task.status,
      assignedTo: task.assignedTo,
      userId,
      timestamp: new Date(),
    });

    return {
      message: 'Photos uploaded successfully',
      photoUrls,
      totalPhotos: updatedTask.photos.length,
    };
  }

  async captureSignature(id: string, signatureDto: any, userId: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignedTo !== userId) {
      throw new BadRequestException('Only assigned user can capture signature');
    }

    // In production, save signature to S3 and get URL
    const signatureUrl = `https://storage.example.com/tasks/${id}/signature_${Date.now()}.png`;

    const updatedTask = await client.task.update({
      where: { id },
      data: {
        signatureUrl,
      },
    });

    // Emit event
    await this.eventEmitter.emit(BusinessEventTypes.TASK_STATUS_CHANGED, {
      taskId: id,
      oldStatus: task.status,
      newStatus: task.status,
      assignedTo: task.assignedTo,
      userId,
      timestamp: new Date(),
    });

    return {
      message: 'Signature captured successfully',
      signatureUrl,
    };
  }

  async updateLocation(id: string, locationDto: any, userId: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignedTo !== userId) {
      throw new BadRequestException('Only assigned user can update location');
    }

    if (task.status !== 'in_progress') {
      throw new BadRequestException('Task must be in progress to update location');
    }

    // Emit real-time location update
    await this.eventEmitter.emit(BusinessEventTypes.WEBSOCKET_BROADCAST, {
      type: 'task.location.updated',
      payload: {
        taskId: id,
        latitude: locationDto.latitude,
        longitude: locationDto.longitude,
      },
      tenantId: 'current', // This should be extracted from context
      userId,
      timestamp: new Date(),
    });

    return {
      message: 'Location updated successfully',
      latitude: locationDto.latitude,
      longitude: locationDto.longitude,
    };
  }

  async getRoute(id: string, fromLat: number, fromLng: number) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        locationAddress: true,
        locationLatitude: true,
        locationLongitude: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.locationLatitude || !task.locationLongitude) {
      throw new BadRequestException('Task location not set');
    }

    // In production, integrate with Google Maps API for real routing
    const distance = this.calculateDistance(
      fromLat,
      fromLng,
      Number(task.locationLatitude),
      Number(task.locationLongitude),
    );

    return {
      taskId: id,
      taskTitle: task.title,
      destination: {
        address: task.locationAddress,
        latitude: task.locationLatitude,
        longitude: task.locationLongitude,
      },
      route: {
        distance: `${distance.toFixed(2)} km`,
        estimatedTime: `${Math.ceil(distance * 2)} minutes`, // Rough estimate
        // In production, include actual route polyline from Google Maps
      },
    };
  }

  async getTaskTimeline(id: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id },
      include: {
        checklists: {
          orderBy: { completedAt: 'asc' },
          include: {
            completedByUser: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const timeline: any[] = [];

    // Task created
    timeline.push({
      event: 'Task Created',
      timestamp: task.createdAt,
      description: `Task "${task.title}" was created`,
    });

    // Task assigned
    if (task.assignedAt) {
      timeline.push({
        event: 'Task Assigned',
        timestamp: task.assignedAt,
        description: 'Task was assigned to technician',
      });
    }

    // Task started
    if (task.startedAt) {
      timeline.push({
        event: 'Task Started',
        timestamp: task.startedAt,
        description: 'Technician checked in and started the task',
      });
    }

    // Checklist completions
    task.checklists.forEach((item) => {
      if (item.completedAt) {
        timeline.push({
          event: 'Checklist Item Completed',
          timestamp: item.completedAt,
          description: `Completed: ${item.item}`,
          completedBy: item.completedByUser
            ? `${item.completedByUser.firstName} ${item.completedByUser.lastName}`
            : 'Unknown',
        });
      }
    });

    // Task completed
    if (task.completedAt) {
      timeline.push({
        event: 'Task Completed',
        timestamp: task.completedAt,
        description: 'Task was completed successfully',
      });
    }

    // Task cancelled
    if (task.cancelledAt) {
      timeline.push({
        event: 'Task Cancelled',
        timestamp: task.cancelledAt,
        description: task.cancellationReason || 'Task was cancelled',
      });
    }

    return {
      taskId: id,
      timeline: timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    };
  }

  async duplicateTask(id: string, options: any, userId: string) {
    const client = await this.prisma.getTenantClient();

    const originalTask = await client.task.findUnique({
      where: { id },
      include: {
        checklists: true,
        dependencies: true,
      },
    });

    if (!originalTask) {
      throw new NotFoundException('Task not found');
    }

    const newTask = await client.$transaction(async (tx) => {
      // Create new task
      const task = await tx.task.create({
        data: {
          customerId: options.customerId || originalTask.customerId,
          title: `${originalTask.title} (Copy)`,
          description: originalTask.description,
          type: originalTask.type,
          priority: originalTask.priority,
          scheduledStart: options.scheduledStart ? new Date(options.scheduledStart) : null,
          estimatedDurationMinutes: originalTask.estimatedDurationMinutes,
          locationAddress: originalTask.locationAddress,
          locationCity: originalTask.locationCity,
          locationLatitude: originalTask.locationLatitude,
          locationLongitude: originalTask.locationLongitude,
          notes: originalTask.notes,
          createdBy: userId,
        },
      });

      // Copy checklist
      if (originalTask.checklists.length > 0) {
        await Promise.all(
          originalTask.checklists.map((item) =>
            tx.taskChecklist.create({
              data: {
                taskId: task.id,
                item: item.item,
                sortOrder: item.sortOrder,
              },
            }),
          ),
        );
      }

      return task;
    });

    return newTask;
  }

  async getTaskTemplates() {
    // In production, this would come from a task_templates table
    return [
      {
        id: '1',
        name: 'Standard Installation',
        description: 'Standard equipment installation template',
        estimatedDuration: 120,
        checklist: [
          'Verify equipment condition',
          'Prepare installation area',
          'Install equipment',
          'Test functionality',
          'Customer walkthrough',
          'Collect signature',
        ],
      },
      {
        id: '2',
        name: 'Maintenance Visit',
        description: 'Routine maintenance template',
        estimatedDuration: 60,
        checklist: [
          'Visual inspection',
          'Clean equipment',
          'Check connections',
          'Test operation',
          'Update maintenance log',
        ],
      },
    ];
  }

  async createTaskTemplate(options: any, userId: string) {
    const client = await this.prisma.getTenantClient();

    const task = await client.task.findUnique({
      where: { id: options.taskId },
      include: { checklists: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // In production, save to task_templates table
    const template = {
      id: `template_${Date.now()}`,
      name: options.templateName,
      description: options.description,
      type: task.type,
      estimatedDuration: task.estimatedDurationMinutes,
      checklist: task.checklists.map((item) => item.item),
      createdBy: userId,
      createdAt: new Date(),
    };

    return {
      message: 'Template created successfully',
      template,
    };
  }

  async getTaskAnalytics(filters: any) {
    const client = await this.prisma.getTenantClient();
    const { dateFrom, dateTo, assignedTo } = filters;

    const where: any = {};
    if (assignedTo) where.assignedTo = assignedTo;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      cancelledTasks,
      avgDuration,
    ] = await Promise.all([
      client.task.count({ where }),
      client.task.count({ where: { ...where, status: 'completed' } }),
      client.task.count({ where: { ...where, status: 'pending' } }),
      client.task.count({ where: { ...where, status: 'in_progress' } }),
      client.task.count({ where: { ...where, status: 'cancelled' } }),
      client.task.aggregate({
        where: { ...where, status: 'completed', actualDurationMinutes: { not: null } },
        _avg: { actualDurationMinutes: true },
      }),
    ]);

    return {
      summary: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        cancelledTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
        avgDurationMinutes: avgDuration._avg.actualDurationMinutes || 0,
      },
      period: {
        from: dateFrom,
        to: dateTo,
      },
    };
  }

  async getNearbyTasks(lat: number, lng: number, radius: number, assignedTo?: string) {
    const client = await this.prisma.getTenantClient();

    const where: any = {
      locationLatitude: { not: null },
      locationLongitude: { not: null },
      status: { in: ['assigned', 'in_progress'] },
    };

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    const tasks = await client.task.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    // Filter by distance (in production, use PostGIS for better performance)
    const nearbyTasks = tasks
      .map((task) => {
        const distance = this.calculateDistance(
          lat,
          lng,
          Number(task.locationLatitude),
          Number(task.locationLongitude),
        );
        return { ...task, distance };
      })
      .filter((task) => task.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return {
      center: { latitude: lat, longitude: lng },
      radius,
      tasks: nearbyTasks,
    };
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private validateStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus) {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PENDING]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
      [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      [TaskStatus.COMPLETED]: [], // No transitions from completed
      [TaskStatus.CANCELLED]: [], // No transitions from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}