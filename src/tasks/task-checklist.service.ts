import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/services/tenant-prisma.service';

@Injectable()
export class TaskChecklistService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async getTaskChecklist(taskId: string) {
    const client = await this.prisma.getTenantClient();

    const checklist = await client.taskChecklist.findMany({
      where: { taskId },
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
    });

    return checklist;
  }

  async addChecklistItem(taskId: string, item: string, sortOrder?: number) {
    const client = await this.prisma.getTenantClient();

    // Verificar que la tarea existe
    const task = await client.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Si no se proporciona sortOrder, usar el siguiente disponible
    if (sortOrder === undefined) {
      const lastItem = await client.taskChecklist.findFirst({
        where: { taskId },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = lastItem ? lastItem.sortOrder + 1 : 0;
    }

    const checklistItem = await client.taskChecklist.create({
      data: {
        taskId,
        item,
        sortOrder,
      },
    });

    return checklistItem;
  }

  async updateChecklistItem(id: string, item?: string, sortOrder?: number) {
    const client = await this.prisma.getTenantClient();

    const existingItem = await client.taskChecklist.findUnique({
      where: { id },
    });

    if (!existingItem) {
      throw new NotFoundException('Checklist item not found');
    }

    const updateData: any = {};
    if (item !== undefined) updateData.item = item;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updatedItem = await client.taskChecklist.update({
      where: { id },
      data: updateData,
    });

    return updatedItem;
  }

  async completeChecklistItem(id: string, userId: string) {
    const client = await this.prisma.getTenantClient();

    const checklistItem = await client.taskChecklist.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!checklistItem) {
      throw new NotFoundException('Checklist item not found');
    }

    if (checklistItem.isCompleted) {
      throw new BadRequestException('Checklist item is already completed');
    }

    // Verificar que la tarea esté en progreso
    if (checklistItem.task.status !== 'in_progress') {
      throw new BadRequestException('Task must be in progress to complete checklist items');
    }

    // Verificar que el usuario es el asignado a la tarea
    if (checklistItem.task.assignedTo !== userId) {
      throw new BadRequestException('Only assigned user can complete checklist items');
    }

    const updatedItem = await client.taskChecklist.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: userId,
      },
      include: {
        completedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedItem;
  }

  async uncompleteChecklistItem(id: string, userId: string) {
    const client = await this.prisma.getTenantClient();

    const checklistItem = await client.taskChecklist.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!checklistItem) {
      throw new NotFoundException('Checklist item not found');
    }

    if (!checklistItem.isCompleted) {
      throw new BadRequestException('Checklist item is not completed');
    }

    // Verificar que la tarea esté en progreso
    if (checklistItem.task.status !== 'in_progress') {
      throw new BadRequestException('Task must be in progress to modify checklist items');
    }

    // Verificar que el usuario es el asignado a la tarea
    if (checklistItem.task.assignedTo !== userId) {
      throw new BadRequestException('Only assigned user can modify checklist items');
    }

    const updatedItem = await client.taskChecklist.update({
      where: { id },
      data: {
        isCompleted: false,
        completedAt: null,
        completedBy: null,
      },
    });

    return updatedItem;
  }

  async deleteChecklistItem(id: string) {
    const client = await this.prisma.getTenantClient();

    const checklistItem = await client.taskChecklist.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!checklistItem) {
      throw new NotFoundException('Checklist item not found');
    }

    // No permitir eliminar si la tarea está completada
    if (checklistItem.task.status === 'completed') {
      throw new BadRequestException('Cannot delete checklist items from completed tasks');
    }

    await client.taskChecklist.delete({
      where: { id },
    });

    return { message: 'Checklist item deleted successfully' };
  }

  async reorderChecklist(taskId: string, itemOrders: { id: string; sortOrder: number }[]) {
    const client = await this.prisma.getTenantClient();

    // Verificar que la tarea existe
    const task = await client.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Actualizar el orden de todos los items
    await client.$transaction(
      itemOrders.map(({ id, sortOrder }) =>
        client.taskChecklist.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    // Retornar la lista actualizada
    return this.getTaskChecklist(taskId);
  }

  async getChecklistProgress(taskId: string) {
    const client = await this.prisma.getTenantClient();

    const checklist = await client.taskChecklist.findMany({
      where: { taskId },
    });

    const totalItems = checklist.length;
    const completedItems = checklist.filter(item => item.isCompleted).length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return {
      totalItems,
      completedItems,
      progress: Math.round(progress),
      isComplete: completedItems === totalItems && totalItems > 0,
    };
  }
}