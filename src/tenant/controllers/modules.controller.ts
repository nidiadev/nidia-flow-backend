import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
  ForbiddenException,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantModulesService } from '../services/modules.service';

@ApiTags('Tenant - Modules')
@ApiBearerAuth()
@Controller('tenant/modules')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantModulesController {
  constructor(private readonly modulesService: TenantModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all modules with enabled status and submodules for current tenant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of modules with enabled status and their submodules',
  })
  async getModules(@CurrentUser() user: any) {
    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID no encontrado');
    }

    return this.modulesService.getTenantModules(tenantId);
  }

  @Get('submodules/:moduleName')
  @ApiOperation({ summary: 'Get all submodules for a specific module' })
  @ApiParam({ name: 'moduleName', type: String, description: 'Module name (e.g., "crm", "products")' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of submodules for the specified module',
  })
  async getSubModules(@CurrentUser() user: any, @Param('moduleName') moduleName: string) {
    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID no encontrado');
    }
    return this.modulesService.getTenantSubModules(tenantId, moduleName);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Get plan limits for current tenant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan limits',
  })
  async getLimits(@CurrentUser('tenantId') tenantId: string) {
    return this.modulesService.getTenantLimits(tenantId);
  }

  @Get('check-user-creation')
  @ApiOperation({ summary: 'Check if tenant can create a new user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User creation check result',
  })
  async checkUserCreation(@CurrentUser('tenantId') tenantId: string) {
    return this.modulesService.canCreateUser(tenantId);
  }
}

