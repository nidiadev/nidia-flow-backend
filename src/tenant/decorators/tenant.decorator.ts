import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get current tenant ID from request
 */
export const CurrentTenant = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant;

    return data ? tenant?.[data] : tenant;
  },
);

/**
 * Decorator to get tenant ID specifically
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);

/**
 * Decorator to get tenant slug specifically
 */
export const TenantSlug = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantSlug;
  },
);

/**
 * Decorator to get tenant database connection
 */
export const TenantConnection = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return await request.tenantConnection;
  },
);