import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import prisma from '../lib/prisma';
import { CreateSubModuleDto } from './dto/create-submodule.dto';
import { UpdateSubModuleDto } from './dto/update-submodule.dto';
import { AssignSubModuleToPlanDto } from './dto/assign-submodule-to-plan.dto';

@Injectable()
export class SubModulesService {
  private readonly logger = new Logger(SubModulesService.name);

  /**
   * Create a new submodule definition
   */
  async create(createSubModuleDto: CreateSubModuleDto) {
    try {
      // Verify module exists
      const module = await prisma.moduleDefinition.findUnique({
        where: { id: createSubModuleDto.moduleId },
      });

      if (!module) {
        throw new NotFoundException(`Module with ID "${createSubModuleDto.moduleId}" not found`);
      }

      // Check if submodule with same name already exists in this module
      const existing = await prisma.subModuleDefinition.findUnique({
        where: {
          moduleId_name: {
            moduleId: createSubModuleDto.moduleId,
            name: createSubModuleDto.name,
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `SubModule with name "${createSubModuleDto.name}" already exists in module "${module.name}"`
        );
      }

      const subModule = await prisma.subModuleDefinition.create({
        data: {
          moduleId: createSubModuleDto.moduleId,
          name: createSubModuleDto.name,
          displayName: createSubModuleDto.displayName,
          description: createSubModuleDto.description,
          icon: createSubModuleDto.icon,
          path: createSubModuleDto.path,
          sortOrder: createSubModuleDto.sortOrder ?? 0,
          isActive: createSubModuleDto.isActive ?? true,
          isVisible: createSubModuleDto.isVisible ?? true,
          permissions: createSubModuleDto.permissions ?? [],
          metadata: createSubModuleDto.metadata ?? {},
        },
        include: {
          module: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });

      this.logger.log(`SubModule created: ${subModule.name} in module ${module.name}`);
      return subModule;
    } catch (error) {
      this.logger.error(`Failed to create submodule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all submodules, optionally filtered by module
   */
  async findAll(moduleId?: string, includeInactive = false) {
    const where: any = {};

    if (moduleId) {
      where.moduleId = moduleId;
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.subModuleDefinition.findMany({
      where,
      include: {
        module: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
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
      orderBy: [
        { sortOrder: 'asc' },
        { displayName: 'asc' },
      ],
    });
  }

  /**
   * Get a single submodule by ID
   */
  async findOne(id: string) {
    const subModule = await prisma.subModuleDefinition.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
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

    if (!subModule) {
      throw new NotFoundException(`SubModule with ID "${id}" not found`);
    }

    return subModule;
  }

  /**
   * Update a submodule
   */
  async update(id: string, updateSubModuleDto: UpdateSubModuleDto) {
    try {
      // Verify submodule exists
      await this.findOne(id);

      const updateData: any = {};

      if (updateSubModuleDto.displayName !== undefined) {
        updateData.displayName = updateSubModuleDto.displayName;
      }
      if (updateSubModuleDto.description !== undefined) {
        updateData.description = updateSubModuleDto.description;
      }
      if (updateSubModuleDto.icon !== undefined) {
        updateData.icon = updateSubModuleDto.icon;
      }
      if (updateSubModuleDto.path !== undefined) {
        updateData.path = updateSubModuleDto.path;
      }
      if (updateSubModuleDto.sortOrder !== undefined) {
        updateData.sortOrder = updateSubModuleDto.sortOrder;
      }
      if (updateSubModuleDto.isActive !== undefined) {
        updateData.isActive = updateSubModuleDto.isActive;
      }
      if (updateSubModuleDto.isVisible !== undefined) {
        updateData.isVisible = updateSubModuleDto.isVisible;
      }
      if (updateSubModuleDto.permissions !== undefined) {
        updateData.permissions = updateSubModuleDto.permissions;
      }
      if (updateSubModuleDto.metadata !== undefined) {
        updateData.metadata = updateSubModuleDto.metadata;
      }

      // If name is being updated, check for conflicts
      if (updateSubModuleDto.name !== undefined) {
        const subModule = await prisma.subModuleDefinition.findUnique({
          where: { id },
        });

        const existing = await prisma.subModuleDefinition.findUnique({
          where: {
            moduleId_name: {
              moduleId: subModule!.moduleId,
              name: updateSubModuleDto.name,
            },
          },
        });

        if (existing && existing.id !== id) {
          throw new BadRequestException(
            `SubModule with name "${updateSubModuleDto.name}" already exists in this module`
          );
        }

        updateData.name = updateSubModuleDto.name;
      }

      const updated = await prisma.subModuleDefinition.update({
        where: { id },
        data: updateData,
        include: {
          module: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });

      this.logger.log(`SubModule updated: ${updated.name}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update submodule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a submodule
   */
  async remove(id: string) {
    try {
      const subModule = await this.findOne(id);

      await prisma.subModuleDefinition.delete({
        where: { id },
      });

      this.logger.log(`SubModule deleted: ${subModule.name}`);
      return { message: 'SubModule deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete submodule: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Assign a submodule to a plan
   */
  async assignToPlan(assignDto: AssignSubModuleToPlanDto) {
    // Verify submodule exists
    await this.findOne(assignDto.subModuleId);

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: assignDto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID "${assignDto.planId}" not found`);
    }

    // Create or update assignment
    const assignment = await prisma.subModulePlanAssignment.upsert({
      where: {
        subModuleId_planId: {
          subModuleId: assignDto.subModuleId,
          planId: assignDto.planId,
        },
      },
      create: {
        subModuleId: assignDto.subModuleId,
        planId: assignDto.planId,
        isEnabled: assignDto.isEnabled ?? true,
      },
      update: {
        isEnabled: assignDto.isEnabled ?? true,
      },
    });

    this.logger.log(`SubModule ${assignDto.subModuleId} assigned to plan ${assignDto.planId}`);
    return assignment;
  }

  /**
   * Remove submodule assignment from a plan
   */
  async removeFromPlan(subModuleId: string, planId: string) {
    await this.findOne(subModuleId);

    const assignment = await prisma.subModulePlanAssignment.findUnique({
      where: {
        subModuleId_planId: {
          subModuleId,
          planId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('SubModule assignment not found');
    }

    await prisma.subModulePlanAssignment.delete({
      where: {
        subModuleId_planId: {
          subModuleId,
          planId,
        },
      },
    });

    this.logger.log(`SubModule ${subModuleId} removed from plan ${planId}`);
    return { message: 'SubModule assignment removed successfully' };
  }

  /**
   * Get submodules with plan status
   */
  async getWithPlanStatus() {
    const subModules = await prisma.subModuleDefinition.findMany({
      where: { isActive: true },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
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
      orderBy: [
        { module: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
      ],
    });

    return subModules.map((subModule) => ({
      id: subModule.id,
      moduleId: subModule.moduleId,
      moduleName: subModule.module.name,
      moduleDisplayName: subModule.module.displayName,
      name: subModule.name,
      displayName: subModule.displayName,
      description: subModule.description,
      icon: subModule.icon,
      path: subModule.path,
      sortOrder: subModule.sortOrder,
      permissions: subModule.permissions,
      planStatus: subModule.planAssignments.map((assignment) => ({
        planId: assignment.plan.id,
        planName: assignment.plan.name,
        planDisplayName: assignment.plan.displayName,
        isEnabled: assignment.isEnabled,
      })),
    }));
  }
}

