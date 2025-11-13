import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { BudgetCategoryService } from '../../services/financial/budget-category.service';
import {
  CreateBudgetCategoryDto,
  UpdateBudgetCategoryDto,
  BudgetCategoryType,
} from '../../dto/financial/budget-category.dto';

@ApiTags('Financial - Budget Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/budget-categories')
export class BudgetCategoryController {
  constructor(private readonly budgetCategoryService: BudgetCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget category' })
  @ApiResponse({
    status: 201,
    description: 'Budget category created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Budget category already exists or invalid input data',
  })
  @RequirePermissions('accounting:write')
  async create(@Body() createBudgetCategoryDto: CreateBudgetCategoryDto) {
    return this.budgetCategoryService.create(createBudgetCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budget categories' })
  @ApiResponse({
    status: 200,
    description: 'Budget categories retrieved successfully',
  })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    enum: BudgetCategoryType,
    description: 'Filter by category type'
  })
  @ApiQuery({ 
    name: 'includeInactive', 
    required: false, 
    type: 'boolean',
    description: 'Include inactive categories in results'
  })
  @RequirePermissions('accounting:read')
  async findAll(
    @Query('type') type?: BudgetCategoryType,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.budgetCategoryService.findAll(type, includeInactive);
  }

  @Get('analysis')
  @ApiOperation({ summary: 'Get budget analysis for a specific period' })
  @ApiResponse({
    status: 200,
    description: 'Budget analysis retrieved successfully',
  })
  @ApiQuery({ 
    name: 'year', 
    required: false, 
    type: 'number',
    description: 'Year for analysis (defaults to current year)'
  })
  @ApiQuery({ 
    name: 'month', 
    required: false, 
    type: 'number',
    description: 'Month for analysis (defaults to current month)'
  })
  @RequirePermissions('accounting:read')
  async getBudgetAnalysis(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.budgetCategoryService.getBudgetAnalysis(year, month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Budget category retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Budget category not found',
  })
  @RequirePermissions('accounting:read')
  async findOne(@Param('id') id: string) {
    return this.budgetCategoryService.findOne(id);
  }

  @Get(':id/trends')
  @ApiOperation({ summary: 'Get spending trends for a category' })
  @ApiResponse({
    status: 200,
    description: 'Spending trends retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Budget category not found',
  })
  @ApiQuery({ 
    name: 'months', 
    required: false, 
    type: 'number',
    description: 'Number of months to analyze (defaults to 6)'
  })
  @RequirePermissions('accounting:read')
  async getSpendingTrends(
    @Param('id') id: string,
    @Query('months') months?: number,
  ) {
    return this.budgetCategoryService.getSpendingTrends(id, months);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update budget category' })
  @ApiResponse({
    status: 200,
    description: 'Budget category updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Budget category not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Budget category name already exists',
  })
  @RequirePermissions('accounting:write')
  async update(
    @Param('id') id: string,
    @Body() updateBudgetCategoryDto: UpdateBudgetCategoryDto,
  ) {
    return this.budgetCategoryService.update(id, updateBudgetCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete budget category' })
  @ApiResponse({
    status: 204,
    description: 'Budget category deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Budget category not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('accounting:delete')
  async remove(@Param('id') id: string) {
    return this.budgetCategoryService.remove(id);
  }
}