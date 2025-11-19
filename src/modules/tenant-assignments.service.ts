import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import prisma from '../lib/prisma';
import { AssignModuleToTenantDto } from './dto/assign-module-to-tenant.dto';
import { AssignSubModuleToTenantDto } from './dto/assign-submodule-to-tenant.dto';

@Injectable()
export class TenantAssignmentsService {
  private readonly logger = new Logger(TenantAssignmentsService.name);

  /**
   * Assign a module directly to a tenant (independent of plans)
   */
  async assignModuleToTenant(assignDto: AssignModuleToTenantDto, assignedBy?: string) {
    // Verify module exists
    const module = await prisma.moduleDefinition.findUnique({
      where: { id: assignDto.moduleId },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${assignDto.moduleId}" not found`);
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: assignDto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${assignDto.tenantId}" not found`);
    }

    // Validate dates
    if (assignDto.startsAt && assignDto.endsAt) {
      const start = new Date(assignDto.startsAt);
      const end = new Date(assignDto.endsAt);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Create or update assignment
    const assignment = await prisma.moduleTenantAssignment.upsert({
      where: {
        moduleId_tenantId: {
          moduleId: assignDto.moduleId,
          tenantId: assignDto.tenantId,
        },
      },
      create: {
        moduleId: assignDto.moduleId,
        tenantId: assignDto.tenantId,
        isEnabled: assignDto.isEnabled ?? true,
        startsAt: assignDto.startsAt ? new Date(assignDto.startsAt) : null,
        endsAt: assignDto.endsAt ? new Date(assignDto.endsAt) : null,
        reason: assignDto.reason,
        assignedBy: assignedBy,
      },
      update: {
        isEnabled: assignDto.isEnabled ?? true,
        startsAt: assignDto.startsAt ? new Date(assignDto.startsAt) : null,
        endsAt: assignDto.endsAt ? new Date(assignDto.endsAt) : null,
        reason: assignDto.reason,
        assignedBy: assignedBy,
      },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(
      `Module ${module.name} assigned to tenant ${tenant.name} (${assignment.isEnabled ? 'enabled' : 'disabled'})`
    );
    return assignment;
  }

  /**
   * Assign a submodule directly to a tenant (independent of plans)
   */
  async assignSubModuleToTenant(assignDto: AssignSubModuleToTenantDto, assignedBy?: string) {
    // Verify submodule exists
    const subModule = await prisma.subModuleDefinition.findUnique({
      where: { id: assignDto.subModuleId },
    });

    if (!subModule) {
      throw new NotFoundException(`SubModule with ID "${assignDto.subModuleId}" not found`);
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: assignDto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${assignDto.tenantId}" not found`);
    }

    // Validate dates
    if (assignDto.startsAt && assignDto.endsAt) {
      const start = new Date(assignDto.startsAt);
      const end = new Date(assignDto.endsAt);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Create or update assignment
    const assignment = await prisma.subModuleTenantAssignment.upsert({
      where: {
        subModuleId_tenantId: {
          subModuleId: assignDto.subModuleId,
          tenantId: assignDto.tenantId,
        },
      },
      create: {
        subModuleId: assignDto.subModuleId,
        tenantId: assignDto.tenantId,
        isEnabled: assignDto.isEnabled ?? true,
        startsAt: assignDto.startsAt ? new Date(assignDto.startsAt) : null,
        endsAt: assignDto.endsAt ? new Date(assignDto.endsAt) : null,
        reason: assignDto.reason,
        assignedBy: assignedBy,
      },
      update: {
        isEnabled: assignDto.isEnabled ?? true,
        startsAt: assignDto.startsAt ? new Date(assignDto.startsAt) : null,
        endsAt: assignDto.endsAt ? new Date(assignDto.endsAt) : null,
        reason: assignDto.reason,
        assignedBy: assignedBy,
      },
      include: {
        subModule: {
          select: {
            id: true,
            name: true,
            displayName: true,
            module: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(
      `SubModule ${subModule.name} assigned to tenant ${tenant.name} (${assignment.isEnabled ? 'enabled' : 'disabled'})`
    );
    return assignment;
  }

  /**
   * Remove module assignment from tenant
   */
  async removeModuleFromTenant(moduleId: string, tenantId: string) {
    const assignment = await prisma.moduleTenantAssignment.findUnique({
      where: {
        moduleId_tenantId: {
          moduleId,
          tenantId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Module assignment not found');
    }

    await prisma.moduleTenantAssignment.delete({
      where: {
        moduleId_tenantId: {
          moduleId,
          tenantId,
        },
      },
    });

    this.logger.log(`Module ${moduleId} removed from tenant ${tenantId}`);
    return { message: 'Module assignment removed successfully' };
  }

  /**
   * Remove submodule assignment from tenant
   */
  async removeSubModuleFromTenant(subModuleId: string, tenantId: string) {
    const assignment = await prisma.subModuleTenantAssignment.findUnique({
      where: {
        subModuleId_tenantId: {
          subModuleId,
          tenantId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('SubModule assignment not found');
    }

    await prisma.subModuleTenantAssignment.delete({
      where: {
        subModuleId_tenantId: {
          subModuleId,
          tenantId,
        },
      },
    });

    this.logger.log(`SubModule ${subModuleId} removed from tenant ${tenantId}`);
    return { message: 'SubModule assignment removed successfully' };
  }

  /**
   * Get all module assignments for a tenant
   */
  async getTenantModuleAssignments(tenantId: string) {
    const assignments = await prisma.moduleTenantAssignment.findMany({
      where: { tenantId },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            icon: true,
            path: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments;
  }

  /**
   * Get all submodule assignments for a tenant
   */
  async getTenantSubModuleAssignments(tenantId: string) {
    const assignments = await prisma.subModuleTenantAssignment.findMany({
      where: { tenantId },
      include: {
        subModule: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            icon: true,
            path: true,
            module: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        assignedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments;
  }

  /**
   * Get all assignments for a specific module
   */
  async getModuleTenantAssignments(moduleId: string) {
    const assignments = await prisma.moduleTenantAssignment.findMany({
      where: { moduleId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments;
  }

  /**
   * Get all assignments for a specific submodule
   */
  async getSubModuleTenantAssignments(subModuleId: string) {
    const assignments = await prisma.subModuleTenantAssignment.findMany({
      where: { subModuleId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments;
  }
}

