import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantPrismaService } from '../services/tenant-prisma.service';

@Injectable()
export class TenantPrismaInterceptor implements NestInterceptor {
  constructor(private readonly tenantPrismaService: TenantPrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Inject TenantPrismaService into request for use in decorators
    request.tenantPrismaService = this.tenantPrismaService;
    
    return next.handle();
  }
}