import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to set permission requirements for endpoints
 */
export const RequirePermissions = (...permissions: string[]) => {
  return SetMetadata('permissions', permissions);
};