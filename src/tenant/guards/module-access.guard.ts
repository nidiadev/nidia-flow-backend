import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantModulesService } from '../services/modules.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

export const RequireModule = (moduleName: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('requiredModule', moduleName, descriptor.value);
    } else {
      Reflect.defineMetadata('requiredModule', moduleName, target);
    }
  };
};

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private modulesService: TenantModulesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins have access to all modules
    if (user?.systemRole === 'super_admin') {
      return true;
    }

    // Get required module from metadata
    const requiredModule = this.reflector.get<string>(
      'requiredModule',
      context.getHandler(),
    ) || this.reflector.get<string>('requiredModule', context.getClass());

    if (!requiredModule) {
      // No module requirement, allow access
      return true;
    }

    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID not found');
    }

    const isEnabled = await this.modulesService.isModuleEnabled(tenantId, requiredModule);

    if (!isEnabled) {
      throw new ForbiddenException(
        `El módulo "${requiredModule}" no está habilitado en tu plan. Actualiza tu plan para acceder a este módulo.`
      );
    }

    return true;
  }
}

