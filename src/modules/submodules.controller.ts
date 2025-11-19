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
import { SubModulesService } from './submodules.service';
import { CreateSubModuleDto } from './dto/create-submodule.dto';
import { UpdateSubModuleDto } from './dto/update-submodule.dto';
import { AssignSubModuleToPlanDto } from './dto/assign-submodule-to-plan.dto';

@ApiTags('SubModules')
@ApiBearerAuth()
@Controller('submodules')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('super_admin')
export class SubModulesController {
  constructor(private readonly subModulesService: SubModulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new submodule definition' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'SubModule created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or submodule already exists' })
  async create(@Body(ValidationPipe) createSubModuleDto: CreateSubModuleDto) {
    return this.subModulesService.create(createSubModuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all submodules' })
  @ApiQuery({ name: 'moduleId', required: false, type: String, description: 'Filter by module ID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive submodules' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of submodules' })
  async findAll(
    @Query('moduleId') moduleId?: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.subModulesService.findAll(moduleId, includeInactive === true);
  }

  @Get('with-plan-status')
  @ApiOperation({ summary: 'Get all submodules with their plan assignment status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of submodules with plan status' })
  async getWithPlanStatus() {
    return this.subModulesService.getWithPlanStatus();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a submodule by ID' })
  @ApiParam({ name: 'id', type: String, description: 'SubModule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SubModule details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'SubModule not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subModulesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a submodule' })
  @ApiParam({ name: 'id', type: String, description: 'SubModule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SubModule updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'SubModule not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateSubModuleDto: UpdateSubModuleDto,
  ) {
    return this.subModulesService.update(id, updateSubModuleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a submodule' })
  @ApiParam({ name: 'id', type: String, description: 'SubModule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SubModule deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'SubModule not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subModulesService.remove(id);
  }

  @Post('assign-to-plan')
  @ApiOperation({ summary: 'Assign a submodule to a plan' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'SubModule assigned to plan successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'SubModule or Plan not found' })
  async assignToPlan(@Body(ValidationPipe) assignDto: AssignSubModuleToPlanDto) {
    return this.subModulesService.assignToPlan(assignDto);
  }

  @Delete('assign-to-plan/:subModuleId/:planId')
  @ApiOperation({ summary: 'Remove submodule assignment from a plan' })
  @ApiParam({ name: 'subModuleId', type: String, description: 'SubModule ID' })
  @ApiParam({ name: 'planId', type: String, description: 'Plan ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  async removeFromPlan(
    @Param('subModuleId', ParseUUIDPipe) subModuleId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.subModulesService.removeFromPlan(subModuleId, planId);
  }
}

