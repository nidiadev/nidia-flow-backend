import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CustomerService } from '../../services/crm/customer.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilterDto,
  CustomerResponseDto,
  AssignCustomerDto,
  ConvertLeadDto,
  CustomerType,
  CustomerStatus,
  LeadSource,
} from '../../dto/crm/customer.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Create a new customer',
    description: 'Creates a new customer (lead, prospect, or active customer) with all provided information'
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or customer with email already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to create customers',
  })
  async create(
    @Body(ValidationPipe) createCustomerDto: CreateCustomerDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    const customer = await this.customerService.create(createCustomerDto, userId);
    return {
      success: true,
      data: customer,
      message: 'Customer created successfully',
    };
  }

  @Get()
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get customers with filtering and pagination',
    description: 'Retrieves a paginated list of customers with optional filtering by type, status, assigned user, etc.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name, email, company' })
  @ApiQuery({ name: 'type', required: false, enum: CustomerType, description: 'Filter by customer type' })
  @ApiQuery({ name: 'status', required: false, enum: CustomerStatus, description: 'Filter by customer status' })
  @ApiQuery({ name: 'leadSource', required: false, enum: LeadSource, description: 'Filter by lead source' })
  @ApiQuery({ name: 'assignedTo', required: false, type: String, description: 'Filter by assigned user ID' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city' })
  @ApiQuery({ name: 'industry', required: false, type: String, description: 'Filter by industry' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CustomerResponseDto' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async findMany(
    @Query(ValidationPipe) filterDto: CustomerFilterDto,
  ): Promise<ApiResponseDto<CustomerResponseDto[]>> {
    const result = await this.customerService.findMany(filterDto);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('search')
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Search customers by text',
    description: 'Quick search customers by name, email, phone, or company name'
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default: 10)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: [CustomerResponseDto],
  })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<ApiResponseDto<CustomerResponseDto[]>> {
    const customers = await this.customerService.search(query, limit);
    return {
      success: true,
      data: customers,
      message: `Found ${customers.length} customers`,
    };
  }

  @Get('statistics')
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get customer statistics',
    description: 'Retrieves comprehensive statistics about customers including counts by type, status, conversion rates, etc.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalCustomers: { type: 'number' },
            byType: { 
              type: 'object',
              additionalProperties: { type: 'number' }
            },
            byStatus: { 
              type: 'object',
              additionalProperties: { type: 'number' }
            },
            byLeadSource: { 
              type: 'object',
              additionalProperties: { type: 'number' }
            },
            averageLeadScore: { type: 'number' },
            conversionRate: { type: 'number' },
          },
        },
      },
    },
  })
  async getStatistics(): Promise<ApiResponseDto<any>> {
    const statistics = await this.customerService.getStatistics();
    return {
      success: true,
      data: statistics,
    };
  }

  @Get(':id')
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get customer by ID',
    description: 'Retrieves detailed customer information including contacts, recent interactions, and orders'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer retrieved successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    const customer = await this.customerService.findById(id);
    return {
      success: true,
      data: customer,
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Update customer',
    description: 'Updates customer information with provided data'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer updated successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or email already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCustomerDto: UpdateCustomerDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    const customer = await this.customerService.update(id, updateCustomerDto, userId);
    return {
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions('crm:delete')
  @ApiOperation({ 
    summary: 'Delete customer',
    description: 'Soft deletes a customer (sets isActive to false)'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<null>> {
    await this.customerService.delete(id, userId);
    return {
      success: true,
      data: null,
      message: 'Customer deleted successfully',
    };
  }

  @Patch(':id/assign')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Assign customer to user',
    description: 'Assigns a customer to a specific user and creates an interaction record'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiBody({ type: AssignCustomerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer assigned successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer or assigned user not found',
  })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) assignDto: AssignCustomerDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    const customer = await this.customerService.assign(id, assignDto, userId);
    return {
      success: true,
      data: customer,
      message: 'Customer assigned successfully',
    };
  }

  @Patch(':id/convert')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Convert lead to customer',
    description: 'Converts a lead to prospect or active customer and creates an interaction record'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Lead ID' })
  @ApiBody({ type: ConvertLeadDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lead converted successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only leads can be converted',
  })
  async convertLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) convertDto: ConvertLeadDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    const customer = await this.customerService.convertLead(id, convertDto, userId);
    return {
      success: true,
      data: customer,
      message: 'Lead converted successfully',
    };
  }

  @Patch(':id/lead-score')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Update lead score',
    description: 'Updates the lead score for a customer (0-100)'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100, example: 85 },
      },
      required: ['score'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lead score updated successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid score value (must be 0-100)',
  })
  async updateLeadScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('score') score: number,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    const customer = await this.customerService.updateLeadScore(id, score, userId);
    return {
      success: true,
      data: customer,
      message: 'Lead score updated successfully',
    };
  }
}