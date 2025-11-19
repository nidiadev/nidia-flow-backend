import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { AssignModuleToPlanDto } from './dto/assign-module-to-plan.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('super_admin')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get all active and visible modules (Public endpoint)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of modules' })
  async findPublicModules(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.modulesService.findPublicModules(include);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new module definition' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Module created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or module already exists' })
  async create(@Body(ValidationPipe) createModuleDto: CreateModuleDto) {
    return this.modulesService.create(createModuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modules' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive modules' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of modules' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.modulesService.findAll(includeInactive === 'true');
  }

  @Get('with-plan-status')
  @ApiOperation({ summary: 'Get all modules with their plan assignment status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Modules with plan status' })
  async getModulesWithPlanStatus() {
    const modules = await this.modulesService.getModulesWithPlanStatus();
    return { data: modules };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a module by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Module ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Module details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modulesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', type: String, description: 'Module ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Module updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateModuleDto: UpdateModuleDto,
  ) {
    return this.modulesService.update(id, updateModuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a module' })
  @ApiParam({ name: 'id', type: String, description: 'Module ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Module deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.modulesService.remove(id);
  }

  @Post('assign-to-plan')
  @ApiOperation({ summary: 'Assign a module to a plan' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Module assigned to plan successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Module or plan not found' })
  async assignToPlan(@Body(ValidationPipe) assignDto: AssignModuleToPlanDto) {
    return this.modulesService.assignToPlan(assignDto);
  }

  @Delete(':moduleId/plans/:planId')
  @ApiOperation({ summary: 'Remove module assignment from a plan' })
  @ApiParam({ name: 'moduleId', type: String, description: 'Module ID' })
  @ApiParam({ name: 'planId', type: String, description: 'Plan ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Module assignment removed successfully' })
  async removeFromPlan(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.modulesService.removeFromPlan(moduleId, planId);
  }

  @Get('plans/:planId')
  @ApiOperation({ summary: 'Get modules enabled for a specific plan' })
  @ApiParam({ name: 'planId', type: String, description: 'Plan ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of modules for the plan' })
  async getModulesForPlan(@Param('planId', ParseUUIDPipe) planId: string) {
    const modules = await this.modulesService.getModulesForPlan(planId);
    return { data: modules };
  }
}

