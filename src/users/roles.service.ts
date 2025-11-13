import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { TenantPrismaService } from '../tenant/services/tenant-prisma.service';

@Injectable()
export class RolesService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  async create(createRoleDto: CreateRoleDto, tenantId: string) {
    const prisma = await this.tenantPrisma.getClient(tenantId);

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    return prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: createRoleDto.permissions,
        isSystemRole: createRoleDto.isSystemRole || false,
      },
    });
  }

  async findAll(tenantId: string) {
    const prisma = await this.tenantPrisma.getClient(tenantId);

    return prisma.role.findMany({
      orderBy: [
        { isSystemRole: 'desc' }, // System roles first
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string, tenantId: string) {
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, tenantId: string) {
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('Cannot modify system roles');
    }

    // Check if new name conflicts with existing role
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await prisma.role.findUnique({
        where: { name: updateRoleDto.name },
      });

      if (existingRole) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    return prisma.role.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        description: updateRoleDto.description,
        permissions: updateRoleDto.permissions,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is being used by any users
    const usersWithRole = await prisma.user.count({
      where: { role: role.name },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`
      );
    }

    return prisma.role.delete({
      where: { id },
    });
  }

  async getPermissions(tenantId: string) {
    // Return all available permissions in the system
    return {
      crm: [
        'crm:read',
        'crm:write',
        'crm:delete',
        'crm:export',
        'crm:assign',
      ],
      orders: [
        'orders:read',
        'orders:write',
        'orders:delete',
        'orders:assign',
        'orders:approve',
      ],
      tasks: [
        'tasks:read',
        'tasks:write',
        'tasks:delete',
        'tasks:assign',
        'tasks:complete',
      ],
      products: [
        'products:read',
        'products:write',
        'products:delete',
        'products:manage_inventory',
      ],
      accounting: [
        'accounting:read',
        'accounting:write',
        'accounting:delete',
        'accounting:reports',
      ],
      reports: [
        'reports:read',
        'reports:create',
        'reports:schedule',
        'reports:export',
      ],
      users: [
        'users:read',
        'users:write',
        'users:delete',
        'users:invite',
        'users:manage_roles',
      ],
      settings: [
        'settings:read',
        'settings:write',
        'settings:integrations',
      ],
    };
  }

  async createSystemRoles(tenantId: string) {
    const prisma = await this.tenantPrisma.getClient(tenantId);

    const systemRoles = [
      {
        name: 'admin',
        description: 'Full system access',
        permissions: [
          'crm:read', 'crm:write', 'crm:delete', 'crm:export', 'crm:assign',
          'orders:read', 'orders:write', 'orders:delete', 'orders:assign', 'orders:approve',
          'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign', 'tasks:complete',
          'products:read', 'products:write', 'products:delete', 'products:manage_inventory',
          'accounting:read', 'accounting:write', 'accounting:delete', 'accounting:reports',
          'reports:read', 'reports:create', 'reports:schedule', 'reports:export',
          'users:read', 'users:write', 'users:delete', 'users:invite', 'users:manage_roles',
          'settings:read', 'settings:write', 'settings:integrations',
        ],
        isSystemRole: true,
      },
      {
        name: 'manager',
        description: 'Management level access',
        permissions: [
          'crm:read', 'crm:write', 'crm:export', 'crm:assign',
          'orders:read', 'orders:write', 'orders:assign', 'orders:approve',
          'tasks:read', 'tasks:write', 'tasks:assign', 'tasks:complete',
          'products:read', 'products:write', 'products:manage_inventory',
          'accounting:read', 'accounting:reports',
          'reports:read', 'reports:create', 'reports:export',
          'users:read', 'users:write', 'users:invite',
        ],
        isSystemRole: true,
      },
      {
        name: 'sales',
        description: 'Sales team access',
        permissions: [
          'crm:read', 'crm:write', 'crm:export',
          'orders:read', 'orders:write',
          'tasks:read', 'tasks:write',
          'products:read',
          'reports:read',
        ],
        isSystemRole: true,
      },
      {
        name: 'operator',
        description: 'Field operations access',
        permissions: [
          'crm:read',
          'orders:read',
          'tasks:read', 'tasks:write', 'tasks:complete',
          'products:read',
        ],
        isSystemRole: true,
      },
      {
        name: 'accountant',
        description: 'Accounting and financial access',
        permissions: [
          'crm:read',
          'orders:read',
          'accounting:read', 'accounting:write', 'accounting:reports',
          'reports:read', 'reports:create', 'reports:export',
        ],
        isSystemRole: true,
      },
      {
        name: 'viewer',
        description: 'Read-only access',
        permissions: [
          'crm:read',
          'orders:read',
          'tasks:read',
          'products:read',
          'accounting:read',
          'reports:read',
        ],
        isSystemRole: true,
      },
    ];

    const createdRoles: any[] = [];
    for (const roleData of systemRoles) {
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = await prisma.role.create({
          data: roleData,
        });
        createdRoles.push(role);
      }
    }

    return createdRoles;
  }
}