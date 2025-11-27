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
    // Para operaciones en BD del tenant, siempre usar tenantUserId
    // Prioridad: request.tenant.userId (del middleware) > request.user.tenantUserId (del JWT) > request.user.id (solo si es tenant_user)
    // NO usar request.user.id para tenant_admin porque es el SuperAdmin ID
    const tenantUserId = request.tenant?.userId || request.user?.tenantUserId;
    
    // Si es tenant_user, su ID ya es el tenantUserId
    if (request.user?.systemRole === 'tenant_user') {
      return tenantUserId || request.user?.id;
    }
    
    // Para tenant_admin y super_admin, solo usar tenantUserId (nunca SuperAdmin ID)
    return tenantUserId;
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
    const tenant = request.tenant;
    const user = request.user;
    
    // Si hay permisos en request.tenant, usarlos
    if (tenant?.permissions && tenant.permissions.length > 0) {
      return tenant.permissions;
    }
    
    // Si hay permisos en request.user, usarlos
    if (user?.permissions && user.permissions.length > 0) {
      return user.permissions;
    }
    
    // Si es tenant_admin o super_admin, devolver permisos completos
    if (user?.systemRole === 'tenant_admin' || user?.systemRole === 'super_admin') {
      return ['*', 'view_all', '*:view_all'];
    }
    
    return [];
  },
);