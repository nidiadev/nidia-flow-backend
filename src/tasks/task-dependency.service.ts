import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/services/tenant-prisma.service';

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
}

@Injectable()
export class TaskDependencyService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async addDependency(taskId: string, dependsOnTaskId: string, dependencyType: DependencyType = DependencyType.FINISH_TO_START) {
    const client = await this.prisma.getTenantClient();

    // Verificar que ambas tareas existen
    const [task, dependsOnTask] = await Promise.all([
      client.task.findUnique({ where: { id: taskId } }),
      client.task.findUnique({ where: { id: dependsOnTaskId } }),
    ]);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!dependsOnTask) {
      throw new NotFoundException('Dependency task not found');
    }

    // Verificar que no se cree una dependencia circular
    await this.validateNoCyclicDependency(taskId, dependsOnTaskId);

    // Verificar que la dependencia no existe ya
    const existingDependency = await client.taskDependency.findFirst({
      where: {
        taskId,
        dependsOnTaskId,
      },
    });

    if (existingDependency) {
      throw new BadRequestException('Dependency already exists');
    }

    const dependency = await client.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
        dependencyType,
      },
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
    });

    return dependency;
  }

  async removeDependency(taskId: string, dependsOnTaskId: string) {
    const client = await this.prisma.getTenantClient();

    const dependency = await client.taskDependency.findFirst({
      where: {
        taskId,
        dependsOnTaskId,
      },
    });

    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    await client.taskDependency.delete({
      where: { id: dependency.id },
    });

    return { message: 'Dependency removed successfully' };
  }

  async getTaskDependencies(taskId: string) {
    const client = await this.prisma.getTenantClient();

    const dependencies = await client.taskDependency.findMany({
      where: { taskId },
      include: {
        dependsOnTask: {
          select: {
            id: true,
            title: true,
            status: true,
            completedAt: true,
            assignedTo: true,
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return dependencies;
  }

  async getDependentTasks(taskId: string) {
    const client = await this.prisma.getTenantClient();

    const dependentTasks = await client.taskDependency.findMany({
      where: { dependsOnTaskId: taskId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            assignedTo: true,
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return dependentTasks;
  }

  async validateCanStart(taskId: string): Promise<boolean> {
    const client = await this.prisma.getTenantClient();

    const dependencies = await client.taskDependency.findMany({
      where: { taskId },
      include: {
        dependsOnTask: {
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    const blockedDependencies = dependencies.filter(dep => {
      const dependsOnTask = dep.dependsOnTask;
      
      if (dep.dependencyType === DependencyType.FINISH_TO_START) {
        // La tarea dependiente debe estar completada
        return dependsOnTask.status !== 'completed';
      } else if (dep.dependencyType === DependencyType.START_TO_START) {
        // La tarea dependiente debe haber iniciado
        return dependsOnTask.status === 'pending';
      }
      
      return false;
    });

    if (blockedDependencies.length > 0) {
      const blockedTitles = blockedDependencies.map(dep => dep.dependsOnTask.title);
      throw new BadRequestException(
        `Cannot start task. Waiting for dependencies: ${blockedTitles.join(', ')}`
      );
    }

    return true;
  }

  async validateDependencies(dependencyIds: string[]): Promise<boolean> {
    const client = await this.prisma.getTenantClient();

    // Verificar que todas las tareas de dependencia existen
    const tasks = await client.task.findMany({
      where: {
        id: { in: dependencyIds },
      },
    });

    if (tasks.length !== dependencyIds.length) {
      const foundIds = tasks.map(t => t.id);
      const missingIds = dependencyIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Dependency tasks not found: ${missingIds.join(', ')}`);
    }

    return true;
  }

  private async validateNoCyclicDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    // Verificar si la tarea dependiente ya depende de la tarea actual (directa o indirectamente)
    const hasCycle = await this.checkForCycle(dependsOnTaskId, taskId, new Set());

    if (hasCycle) {
      throw new BadRequestException('Cannot create dependency: would create a circular dependency');
    }
  }

  private async checkForCycle(currentTaskId: string, targetTaskId: string, visited: Set<string>): Promise<boolean> {
    if (currentTaskId === targetTaskId) {
      return true;
    }

    if (visited.has(currentTaskId)) {
      return false;
    }

    visited.add(currentTaskId);

    const client = await this.prisma.getTenantClient();
    const dependencies = await client.taskDependency.findMany({
      where: { taskId: currentTaskId },
      select: { dependsOnTaskId: true },
    });

    for (const dep of dependencies) {
      if (await this.checkForCycle(dep.dependsOnTaskId, targetTaskId, visited)) {
        return true;
      }
    }

    return false;
  }

  async getDependencyGraph(taskIds: string[]) {
    const client = await this.prisma.getTenantClient();

    const dependencies = await client.taskDependency.findMany({
      where: {
        OR: [
          { taskId: { in: taskIds } },
          { dependsOnTaskId: { in: taskIds } },
        ],
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        dependsOnTask: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Construir grafo de dependencias
    const graph: Record<string, any> = {};
    
    taskIds.forEach(taskId => {
      graph[taskId] = {
        dependencies: [],
        dependents: [],
      };
    });

    dependencies.forEach(dep => {
      if (graph[dep.taskId]) {
        graph[dep.taskId].dependencies.push({
          id: dep.dependsOnTaskId,
          title: dep.dependsOnTask.title,
          status: dep.dependsOnTask.status,
          type: dep.dependencyType,
        });
      }

      if (graph[dep.dependsOnTaskId]) {
        graph[dep.dependsOnTaskId].dependents.push({
          id: dep.taskId,
          title: dep.task.title,
          status: dep.task.status,
          type: dep.dependencyType,
        });
      }
    });

    return graph;
  }

  async getTaskExecutionOrder(taskIds: string[]): Promise<string[]> {
    const client = await this.prisma.getTenantClient();

    // Obtener todas las dependencias
    const dependencies = await client.taskDependency.findMany({
      where: {
        taskId: { in: taskIds },
        dependsOnTaskId: { in: taskIds },
      },
    });

    // Algoritmo de ordenamiento topológico (Kahn's algorithm)
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    // Inicializar grafo
    taskIds.forEach(taskId => {
      graph[taskId] = [];
      inDegree[taskId] = 0;
    });

    // Construir grafo y calcular grados de entrada
    dependencies.forEach(dep => {
      graph[dep.dependsOnTaskId].push(dep.taskId);
      inDegree[dep.taskId]++;
    });

    // Cola de tareas sin dependencias
    const queue: string[] = [];
    taskIds.forEach(taskId => {
      if (inDegree[taskId] === 0) {
        queue.push(taskId);
      }
    });

    const result: string[] = [];

    while (queue.length > 0) {
      const currentTask = queue.shift()!;
      result.push(currentTask);

      // Procesar tareas dependientes
      graph[currentTask].forEach(dependentTask => {
        inDegree[dependentTask]--;
        if (inDegree[dependentTask] === 0) {
          queue.push(dependentTask);
        }
      });
    }

    // Verificar si hay ciclos
    if (result.length !== taskIds.length) {
      throw new BadRequestException('Circular dependency detected in task list');
    }

    return result;
  }
}