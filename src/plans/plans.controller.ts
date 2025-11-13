import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Plans')
@Controller('plans')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List all active plans (Super Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Plans retrieved successfully',
  })
  async findAll(@CurrentUser('systemRole') userRole?: string) {
    // Only super admins can list all plans
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can list all plans');
    }

    const plans = await this.plansService.findAll();
    return {
      success: true,
      data: plans,
    };
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Get plan by name (Super Admin only)' })
  @ApiParam({ name: 'name', description: 'Plan name' })
  @ApiResponse({
    status: 200,
    description: 'Plan retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async findByName(
    @Param('name') name: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can view plan details
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can view plan details');
    }

    const plan = await this.plansService.findByName(name);
    if (!plan) {
      throw new Error('Plan not found');
    }
    return {
      success: true,
      data: plan,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can view plan details
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can view plan details');
    }

    const plan = await this.plansService.findOne(id);
    if (!plan) {
      throw new Error('Plan not found');
    }
    return {
      success: true,
      data: plan,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new plan (Super Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Plan created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid plan data',
  })
  async create(
    @Body() createPlanDto: CreatePlanDto,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can create plans
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can create plans');
    }

    const plan = await this.plansService.create(createPlanDto);
    return {
      success: true,
      data: plan,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a plan (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can update plans
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can update plans');
    }

    const plan = await this.plansService.update(id, updatePlanDto);
    return {
      success: true,
      data: plan,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a plan (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: 204,
    description: 'Plan deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser('systemRole') userRole?: string,
  ) {
    // Only super admins can delete plans
    if (userRole !== 'super_admin') {
      throw new Error('Only super admins can delete plans');
    }

    await this.plansService.delete(id);
    return {
      success: true,
      message: 'Plan deleted successfully',
    };
  }
}

