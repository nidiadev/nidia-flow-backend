import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

/**
 * Decorator to inject tenant Prisma client into controller methods
 * 
 * Usage:
 * @Get()
 * async getCustomers(@TenantDatabase() prisma: PrismaClient) {
 *   return prisma.customer.findMany();
 * }
 */
export const TenantDatabase = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Get TenantPrismaService from the request context
    // This assumes the service is available in the module
    const tenantPrismaService = request.tenantPrismaService;
    
    if (!tenantPrismaService) {
      throw new Error('TenantPrismaService not available. Ensure it is properly injected.');
    }

    return tenantPrismaService.getTenantClient();
  },
);

/**
 * Decorator to inject tenant context into controller methods
 * 
 * Usage:
 * @Get()
 * async getProfile(@TenantContext() context: TenantContext) {
 *   return { tenantId: context.tenantId, userId: context.userId };
 * }
 */
export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

/**
 * Decorator to inject current user ID from tenant context
 * 
 * Usage:
 * @Get()
 * async getMyOrders(@CurrentUser() userId: string) {
 *   // userId is automatically extracted from JWT
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.userId;
  },
);

/**
 * Decorator to inject current tenant ID from tenant context
 * 
 * Usage:
 * @Get()
 * async getTenantSettings(@CurrentTenant() tenantId: string) {
 *   // tenantId is automatically extracted from JWT
 * }
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.tenantId;
  },
);

/**
 * Decorator to inject user role from tenant context
 * 
 * Usage:
 * @Get()
 * async getAdminData(@UserRole() role: string) {
 *   if (role !== 'admin') throw new ForbiddenException();
 * }
 */
export const UserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.role;
  },
);

/**
 * Decorator to inject user permissions from tenant context
 * 
 * Usage:
 * @Get()
 * async getData(@UserPermissions() permissions: string[]) {
 *   if (!permissions.includes('read:customers')) throw new ForbiddenException();
 * }
 */
export const UserPermissions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.permissions || [];
  },
);