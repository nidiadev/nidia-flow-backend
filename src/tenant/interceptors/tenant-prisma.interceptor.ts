import { Injectable, NestInterceptor, ExecutionContext, CallHandler, InternalServerErrorException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantPrismaService } from '../services/tenant-prisma.service';

@Injectable()
export class TenantPrismaInterceptor implements NestInterceptor {
  constructor(private readonly tenantPrismaService: TenantPrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Verificar que el contexto del tenant esté configurado
    const tenantContext = this.tenantPrismaService.getTenantContext();
    if (!tenantContext && request.tenant) {
      // Si el request tiene tenant pero el servicio no tiene contexto, configurarlo
      this.tenantPrismaService.setTenantContext({
        tenantId: request.tenant.tenantId,
        userId: request.tenant.userId,
        dbName: request.tenant.dbName,
        role: request.tenant.role,
      });
    } else if (!tenantContext && !request.tenant) {
      // Si no hay contexto ni tenant en el request, puede ser un superadmin o un error
      // No lanzar error aquí, dejar que el servicio lo maneje
    }
    
    // Inject TenantPrismaService into request for use in decorators
    request.tenantPrismaService = this.tenantPrismaService;
    
    return next.handle();
  }
}