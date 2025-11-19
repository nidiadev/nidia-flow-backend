import { Injectable, Scope } from '@nestjs/common';
import { PermissionResolverService } from '../../auth/services/permission-resolver.service';

// Using 'any' for Prisma types since we're working with dynamic tenant schemas
// Each tenant may have slightly different Prisma client types
// The actual types are resolved at runtime when the tenant Prisma client is used
type PrismaWhereInput = any;
type PrismaJsonObject = any;

/**
 * Service to determine data scope based on user permissions
 * This is permission-based, not role-based, making it scalable and flexible
 * 
 * Key concept: Users with 'view_all' permission see all data
 * Users without 'view_all' only see data they own (assignedTo or createdBy)
 */
@Injectable({ scope: Scope.REQUEST })
export class DataScopeService {
  constructor(private readonly permissionResolver: PermissionResolverService) {}

  /**
   * Get data scope for customers
   * Returns Prisma where clause to filter data based on user permissions
   */
  getCustomerScope(
    userPermissions: string[],
    userId: string,
    additionalFilters?: PrismaWhereInput,
  ): PrismaWhereInput {
    const baseScope = this.getBaseScope(userPermissions, userId, {
      assignedToField: 'assignedTo',
      createdByField: 'createdBy',
    });

    return {
      ...baseScope,
      ...additionalFilters,
    };
  }

  /**
   * Get data scope for orders
   */
  getOrderScope(
    userPermissions: string[],
    userId: string,
    additionalFilters?: PrismaWhereInput,
  ): PrismaWhereInput {
    const baseScope = this.getBaseScope(userPermissions, userId, {
      assignedToField: 'assignedTo',
      createdByField: 'createdBy',
    });

    return {
      ...baseScope,
      ...additionalFilters,
    };
  }

  /**
   * Get data scope for tasks
   */
  getTaskScope(
    userPermissions: string[],
    userId: string,
    additionalFilters?: PrismaWhereInput,
  ): PrismaWhereInput {
    const baseScope = this.getBaseScope(userPermissions, userId, {
      assignedToField: 'assignedTo',
      createdByField: 'createdBy',
    });

    return {
      ...baseScope,
      ...additionalFilters,
    };
  }

  /**
   * Generic method to get base scope for any resource
   * This is the core logic that determines if user sees all data or only their own
   */
  private getBaseScope(
    userPermissions: string[],
    userId: string,
    options: {
      assignedToField: string;
      createdByField: string;
    },
  ): PrismaJsonObject {
    // If user has 'view_all' permission, they see all data (no filter)
    if (this.permissionResolver.canViewAllData(userPermissions)) {
      return {};
    }

    // Otherwise, user only sees data they own
    // Data is "owned" if:
    // 1. assignedTo = userId, OR
    // 2. createdBy = userId
    return {
      OR: [
        { [options.assignedToField]: userId },
        { [options.createdByField]: userId },
      ],
    } as PrismaJsonObject;
  }

  /**
   * Get scope for a custom resource
   * This allows the system to work with any new module/submodule automatically
   */
  getCustomScope(
    userPermissions: string[],
    userId: string,
    resourceConfig: {
      assignedToField?: string;
      createdByField?: string;
      ownerField?: string; // Alternative to assignedToField
    },
    additionalFilters?: PrismaJsonObject,
  ): PrismaJsonObject {
    // If user has 'view_all' permission, they see all data
    if (this.permissionResolver.canViewAllData(userPermissions)) {
      return additionalFilters || {};
    }

    // Build ownership filter
    const ownershipConditions: PrismaJsonObject[] = [];

    if (resourceConfig.assignedToField) {
      ownershipConditions.push({
        [resourceConfig.assignedToField]: userId,
      } as PrismaJsonObject);
    }

    if (resourceConfig.createdByField) {
      ownershipConditions.push({
        [resourceConfig.createdByField]: userId,
      } as PrismaJsonObject);
    }

    if (resourceConfig.ownerField) {
      ownershipConditions.push({
        [resourceConfig.ownerField]: userId,
      } as PrismaJsonObject);
    }

    if (ownershipConditions.length === 0) {
      // If no ownership fields defined, user can't see any data
      // This is a safety measure for new resources
      return { id: '00000000-0000-0000-0000-000000000000' } as PrismaJsonObject; // Impossible ID
    }

    const baseScope: PrismaJsonObject = {
      OR: ownershipConditions,
    } as PrismaJsonObject;

    return {
      ...baseScope,
      ...additionalFilters,
    } as PrismaJsonObject;
  }

  /**
   * Check if user can view all data for a specific module
   * Useful for UI to show/hide "View All" options
   */
  canViewAll(userPermissions: string[]): boolean {
    return this.permissionResolver.canViewAllData(userPermissions);
  }

  /**
   * Check if user can only view their own data
   */
  canOnlyViewOwn(userPermissions: string[]): boolean {
    return this.permissionResolver.canOnlyViewOwnData(userPermissions);
  }
}

