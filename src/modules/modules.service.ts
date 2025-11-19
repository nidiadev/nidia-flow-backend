import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import prisma from '../lib/prisma';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { AssignModuleToPlanDto } from './dto/assign-module-to-plan.dto';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor() {}

  /**
   * Create a new module definition
   */
  async create(createModuleDto: CreateModuleDto) {
    try {
      // Check if module with same name already exists
      const existing = await prisma.moduleDefinition.findUnique({
        where: { name: createModuleDto.name },
      });

      if (existing) {
        throw new BadRequestException(`Module with name "${createModuleDto.name}" already exists`);
      }

      const module = await prisma.moduleDefinition.create({
        data: {
          name: createModuleDto.name,
          displayName: createModuleDto.displayName,
          description: createModuleDto.description,
          icon: createModuleDto.icon,
          path: createModuleDto.path,
          category: createModuleDto.category,
          sortOrder: createModuleDto.sortOrder ?? 0,
          isActive: createModuleDto.isActive ?? true,
          isVisible: createModuleDto.isVisible ?? true,
          metadata: createModuleDto.metadata ?? {},
        },
      });

      this.logger.log(`Module created: ${module.name}`);
      return module;
    } catch (error) {
      this.logger.error(`Failed to create module: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all modules
   */
  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    return prisma.moduleDefinition.findMany({
      where,
      include: {
        planAssignments: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        subModules: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { displayName: 'asc' },
      ],
    });
  }

  /**
   * Get all public modules (visible and active)
   */
  async findPublicModules(includeInactive = false) {
    const where = includeInactive 
      ? { isVisible: true } 
      : { isActive: true, isVisible: true };
    
    return prisma.moduleDefinition.findMany({
      where,
      include: {
        subModules: {
          where: includeInactive ? { isVisible: true } : { isActive: true, isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { displayName: 'asc' },
      ],
    });
  }

  /**
   * Get a single module by ID
   */
  async findOne(id: string) {
    const module = await prisma.moduleDefinition.findUnique({
      where: { id },
      include: {
        planAssignments: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                displayName: true,
                isActive: true,
              },
            },
          },
        },
        subModules: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        tenantAssignments: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }

    return module;
  }

  /**
   * Get a module by name
   */
  async findByName(name: string) {
    const module = await prisma.moduleDefinition.findUnique({
      where: { name },
      include: {
        planAssignments: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with name "${name}" not found`);
    }

    return module;
  }

  /**
   * Update a module
   */
  async update(id: string, updateModuleDto: UpdateModuleDto) {
    const module = await this.findOne(id);

    // If updating name, check for conflicts
    if (updateModuleDto.name && updateModuleDto.name !== module.name) {
      const existing = await prisma.moduleDefinition.findUnique({
        where: { name: updateModuleDto.name },
      });

      if (existing) {
        throw new BadRequestException(`Module with name "${updateModuleDto.name}" already exists`);
      }
    }

    const updated = await prisma.moduleDefinition.update({
      where: { id },
      data: updateModuleDto,
    });

    this.logger.log(`Module updated: ${updated.name}`);
    return updated;
  }

  /**
   * Delete a module
   */
  async remove(id: string) {
    const module = await this.findOne(id);

    // Delete all plan assignments first (cascade)
    await prisma.modulePlanAssignment.deleteMany({
      where: { moduleId: id },
    });

    await prisma.moduleDefinition.delete({
      where: { id },
    });

    this.logger.log(`Module deleted: ${module.name}`);
    return { message: 'Module deleted successfully' };
  }

  /**
   * Assign a module to a plan
   */
  async assignToPlan(assignDto: AssignModuleToPlanDto) {
    // Verify module exists
    await this.findOne(assignDto.moduleId);

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: assignDto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID "${assignDto.planId}" not found`);
    }

    // Create or update assignment
    const assignment = await prisma.modulePlanAssignment.upsert({
      where: {
        moduleId_planId: {
          moduleId: assignDto.moduleId,
          planId: assignDto.planId,
        },
      },
      create: {
        moduleId: assignDto.moduleId,
        planId: assignDto.planId,
        isEnabled: assignDto.isEnabled ?? true,
      },
      update: {
        isEnabled: assignDto.isEnabled ?? true,
      },
    });

    this.logger.log(`Module ${assignDto.moduleId} assigned to plan ${assignDto.planId}`);
    return assignment;
  }

  /**
   * Remove module assignment from a plan
   */
  async removeFromPlan(moduleId: string, planId: string) {
    await prisma.modulePlanAssignment.delete({
      where: {
        moduleId_planId: {
          moduleId,
          planId,
        },
      },
    });

    this.logger.log(`Module ${moduleId} removed from plan ${planId}`);
    return { message: 'Module assignment removed successfully' };
  }

  /**
   * Get modules enabled for a specific plan
   */
  async getModulesForPlan(planId: string) {
    const assignments = await prisma.modulePlanAssignment.findMany({
      where: {
        planId,
        isEnabled: true,
      },
      include: {
        module: true,
      },
      orderBy: {
        module: {
          sortOrder: 'asc',
        },
      },
    });

    return { data: assignments.map(a => a.module) };
  }

  /**
   * Get all modules with their plan assignments
   */
  async getModulesWithPlanStatus() {
    const modulesResult = await this.findAll(true);
    const modules = modulesResult.data || modulesResult;
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true },
    });

    return modules.map((module: any) => ({
      ...module,
      planStatus: plans.map(plan => {
        const assignment = (module.planAssignments || []).find((a: any) => a.planId === plan.id);
        return {
          planId: plan.id,
          planName: plan.name,
          planDisplayName: plan.displayName,
          isEnabled: assignment?.isEnabled ?? false,
        };
      }),
    }));
  }
}

