import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_LIMIT_KEY, LimitType } from '../decorators/check-limit.decorator';
import { TenantModulesService } from '../services/modules.service';
import { TenantPrismaService } from '../services/tenant-prisma.service';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private modulesService: TenantModulesService,
    private tenantPrisma: TenantPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass limits
    if (user?.systemRole === 'super_admin') {
      return true;
    }

    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID not found');
    }

    const limitType = this.reflector.get<LimitType>(CHECK_LIMIT_KEY, context.getHandler());
    if (!limitType) {
      return true; // No limit check required
    }

    // Get plan limits
    const limits = await this.modulesService.getTenantLimits(tenantId);

    switch (limitType) {
      case LimitType.USERS:
        const userCheck = await this.modulesService.canCreateUser(tenantId);
        if (!userCheck.allowed) {
          throw new ForbiddenException(userCheck.reason || 'Límite de usuarios alcanzado');
        }
        break;

      case LimitType.STORAGE:
        // Get file size from request file, files, or body
        let fileSize: number = 0;
        if (request.file) {
          fileSize = request.file.size || 0;
        } else if (request.files && Array.isArray(request.files)) {
          fileSize = request.files.reduce((total: number, file: any) => total + (file.size || 0), 0);
        } else if (request.files && typeof request.files === 'object') {
          // Handle multiple file fields
          fileSize = Object.values(request.files).reduce((total: number, files: any) => {
            const filesArray = Array.isArray(files) ? files : [files];
            return total + filesArray.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
          }, 0) as number;
        } else {
          fileSize = request.body?.fileSize || request.body?.size || 0;
        }
        const storageCheck = await this.modulesService.canUploadStorage(tenantId, fileSize);
        if (!storageCheck.allowed) {
          throw new ForbiddenException(storageCheck.reason || 'Límite de almacenamiento alcanzado');
        }
        break;

      case LimitType.MONTHLY_EMAILS:
        const emailCheck = await this.modulesService.canSendEmail(tenantId);
        if (!emailCheck.allowed) {
          throw new ForbiddenException(emailCheck.reason || 'Límite de emails mensuales alcanzado');
        }
        break;

      case LimitType.MONTHLY_WHATSAPP:
        const whatsappCheck = await this.modulesService.canSendWhatsApp(tenantId);
        if (!whatsappCheck.allowed) {
          throw new ForbiddenException(whatsappCheck.reason || 'Límite de mensajes de WhatsApp mensuales alcanzado');
        }
        break;

      case LimitType.MONTHLY_API_CALLS:
        const apiCallCheck = await this.modulesService.canMakeApiCall(tenantId);
        if (!apiCallCheck.allowed) {
          throw new ForbiddenException(apiCallCheck.reason || 'Límite de llamadas de API mensuales alcanzado');
        }
        break;
    }

    return true;
  }
}

