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
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { CategoryService } from '../../services/products/category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryFilterDto,
  CategoryResponseDto,
  CategoryTreeDto,
  CategoryStatsDto,
} from '../../dto/products/category.dto';

@ApiTags('Product Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new category',
    description: 'Creates a new product category. Supports hierarchical categories with parent-child relationships.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or parent category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category with this name already exists at this level',
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<{ success: boolean; data: CategoryResponseDto; message: string }> {
    const category = await this.categoryService.create(createCategoryDto);
    return {
      success: true,
      data: category,
      message: 'Category created successfully',
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all categories',
    description: 'Retrieves a paginated list of categories with filtering and search capabilities.'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name and description' })
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent category ID (null for root categories)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (default: sortOrder)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: { $ref: '#/components/schemas/CategoryResponseDto' } },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
  })
  async findAll(
    @Query() filterDto: CategoryFilterDto,
  ): Promise<{ success: boolean; data: CategoryResponseDto[]; pagination: any }> {
    const result = await this.categoryService.findMany(filterDto);
    return {
      success: true,
      ...result,
    };
  }

  @Get('tree')
  @ApiOperation({ 
    summary: 'Get category tree',
    description: 'Retrieves all categories organized in a hierarchical tree structure.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category tree retrieved successfully',
    type: [CategoryTreeDto],
  })
  async getTree(): Promise<{ success: boolean; data: CategoryTreeDto[] }> {
    const tree = await this.categoryService.getTree();
    return {
      success: true,
      data: tree,
    };
  }

  @Get('root')
  @ApiOperation({ 
    summary: 'Get root categories',
    description: 'Retrieves only root categories (categories without parent) with their immediate children.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Root categories retrieved successfully',
    type: [CategoryResponseDto],
  })
  async getRootCategories(): Promise<{ success: boolean; data: CategoryResponseDto[] }> {
    const categories = await this.categoryService.getRootCategories();
    return {
      success: true,
      data: categories,
    };
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get category statistics',
    description: 'Retrieves comprehensive statistics about categories including counts and product distribution.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category statistics retrieved successfully',
    type: CategoryStatsDto,
  })
  async getStats(): Promise<{ success: boolean; data: CategoryStatsDto }> {
    const stats = await this.categoryService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get category by ID',
    description: 'Retrieves detailed information about a specific category including children and sample products.'
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: CategoryResponseDto }> {
    const category = await this.categoryService.findById(id);
    return {
      success: true,
      data: category,
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update category',
    description: 'Updates an existing category. Prevents circular references in parent-child relationships.'
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parent category or circular reference detected',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category name already exists at this level',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<{ success: boolean; data: CategoryResponseDto; message: string }> {
    const category = await this.categoryService.update(id, updateCategoryDto);
    return {
      success: true,
      data: category,
      message: 'Category updated successfully',
    };
  }

  @Patch(':id/activate')
  @ApiOperation({ 
    summary: 'Activate category',
    description: 'Activates a previously deactivated category.'
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category activated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: CategoryResponseDto; message: string }> {
    const category = await this.categoryService.activate(id);
    return {
      success: true,
      data: category,
      message: 'Category activated successfully',
    };
  }

  @Post('reorder')
  @ApiOperation({ 
    summary: 'Reorder categories',
    description: 'Updates the sort order of multiple categories in a single operation.'
  })
  @ApiBody({
    description: 'Array of category IDs with their new sort orders',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              sortOrder: { type: 'number', minimum: 0 },
            },
            required: ['id', 'sortOrder'],
          },
        },
      },
      required: ['categories'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid category data',
  })
  async reorder(
    @Body() body: { categories: { id: string; sortOrder: number }[] },
  ): Promise<{ success: boolean; message: string }> {
    await this.categoryService.reorderCategories(body.categories);
    return {
      success: true,
      message: 'Categories reordered successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Soft delete category',
    description: 'Soft deletes a category by setting isActive to false. Cannot delete categories with active subcategories or products.'
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete category with active subcategories or products',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.categoryService.softDelete(id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}