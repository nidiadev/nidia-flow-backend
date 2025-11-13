/**
 * DTO Usage Examples
 * 
 * This file demonstrates how to use the DTOs and validation system
 * in controllers and services.
 */

import { Controller, Post, Put, Get, Body, Param, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { 
  CreateCustomerDto, 
  UpdateCustomerDto, 
  CustomerFilterDto,
  CustomerResponseDto,
  AssignCustomerDto,
  ConvertLeadDto,
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
  ProductResponseDto,
  CreateOrderDto,
  UpdateOrderDto,
  OrderFilterDto,
  OrderResponseDto,
  CreateTaskDto,
  TaskFilterDto,
  TaskResponseDto,
  CheckInTaskDto,
  CompleteTaskDto,
  ApiResponseDto
} from '../dto';
import { 
  TenantPermissionsGuard, 
  RequirePermissions, 
  PERMISSIONS 
} from '../guards/tenant-permissions.guard';
import { createTenantValidationPipe } from '../config/validation.config';

// Example 1: Customer Management with Full Validation
@ApiTags('Customers')
@Controller('customers')
@UseGuards(TenantPermissionsGuard)
@UsePipes(createTenantValidationPipe())
export class CustomersExampleController {

  @Post()
  @RequirePermissions(PERMISSIONS.CUSTOMERS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ 
    status: 201, 
    description: 'Customer created successfully',
    type: CustomerResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error',
    schema: {
      example: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            {
              field: 'firstName',
              value: '',
              constraints: {
                minLength: 'firstName must be longer than or equal to 1 characters'
              }
            }
          ]
        }
      }
    }
  })
  async createCustomer(
    @Body() createCustomerDto: CreateCustomerDto
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    // The DTO will automatically:
    // - Validate all fields according to decorators
    // - Transform data (trim strings, format phone numbers, etc.)
    // - Apply custom validators (Colombian phone, NIT, coordinates)
    // - Return formatted validation errors if validation fails
    
    console.log('Validated customer data:', createCustomerDto);
    
    // Example of the transformed data:
    // {
    //   type: 'lead',
    //   firstName: 'John',  // Trimmed and title-cased
    //   lastName: 'Doe',
    //   email: 'john.doe@example.com',  // Validated email format
    //   phone: '+57 300 123 4567',  // Formatted Colombian phone
    //   taxId: '900123456-1',  // Formatted NIT with check digit
    //   latitude: 4.71100000,  // Formatted coordinates
    //   longitude: -74.07210000,
    //   tags: ['vip', 'enterprise'],  // Cleaned and deduplicated
    //   customFields: { source: 'website' },
    //   metadata: { version: '1.0' }
    // }
    
    return {
      success: true,
      data: createCustomerDto as any, // In real implementation, save to DB
      message: 'Customer created successfully'
    };
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async updateCustomer(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    // UpdateCustomerDto extends PartialType(CreateCustomerDto)
    // So all fields are optional but still validated when provided
    
    return {
      success: true,
      data: { id, ...updateCustomerDto } as any,
      message: 'Customer updated successfully'
    };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CUSTOMERS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customers with filters' })
  @ApiResponse({ status: 200, type: [CustomerResponseDto] })
  async getCustomers(
    @Query() filterDto: CustomerFilterDto
  ): Promise<ApiResponseDto<CustomerResponseDto[]>> {
    // Query parameters are automatically validated and transformed
    // Example: ?page=1&limit=10&type=lead&minLeadScore=50&city=Bogotá
    
    console.log('Validated filters:', filterDto);
    // {
    //   page: 1,  // Transformed to number
    //   limit: 10,  // Transformed to number
    //   type: 'lead',  // Validated enum
    //   minLeadScore: 50,  // Validated range 0-100
    //   city: 'Bogotá',  // String
    //   sortBy: 'createdAt',
    //   sortOrder: 'desc'
    // }
    
    return {
      success: true,
      data: [],
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
        total: 0,
        totalPages: 0
      }
    };
  }

  @Post(':id/assign')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_ASSIGN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign customer to user' })
  async assignCustomer(
    @Param('id') id: string,
    @Body() assignDto: AssignCustomerDto
  ): Promise<ApiResponseDto<void>> {
    // Validates that assignedTo is a valid UUID
    
    return {
      success: true,
      data: undefined,
      message: `Customer assigned to ${assignDto.assignedTo}`
    };
  }

  @Post(':id/convert')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert lead to customer' })
  async convertLead(
    @Param('id') id: string,
    @Body() convertDto: ConvertLeadDto
  ): Promise<ApiResponseDto<CustomerResponseDto>> {
    // Validates that targetType is either 'prospect' or 'active'
    
    return {
      success: true,
      data: { id, type: convertDto.targetType } as any,
      message: 'Lead converted successfully'
    };
  }
}

// Example 2: Product Management with Complex Validation
@ApiTags('Products')
@Controller('products')
@UseGuards(TenantPermissionsGuard)
@UsePipes(createTenantValidationPipe())
export class ProductsExampleController {

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(
    @Body() createProductDto: CreateProductDto
  ): Promise<ApiResponseDto<ProductResponseDto>> {
    // Validates complex product data including:
    // - Product type enum
    // - Price validation (positive number)
    // - SKU format validation
    // - Stock quantity validation
    // - Image URL validation
    // - Custom fields validation
    
    console.log('Validated product data:', createProductDto);
    
    return {
      success: true,
      data: createProductDto as any,
      message: 'Product created successfully'
    };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products with advanced filters' })
  async getProducts(
    @Query() filterDto: ProductFilterDto
  ): Promise<ApiResponseDto<ProductResponseDto[]>> {
    // Advanced filtering with:
    // - Type, category, brand filters
    // - Price range validation
    // - Boolean transformations for isActive, isFeatured
    // - Special filters for lowStock, outOfStock
    
    console.log('Product filters:', filterDto);
    
    return {
      success: true,
      data: [],
      pagination: {
        page: filterDto.page || 1,
        limit: filterDto.limit || 10,
        total: 0,
        totalPages: 0
      }
    };
  }
}

// Example 3: Order Management with Nested Validation
@ApiTags('Orders')
@Controller('orders')
@UseGuards(TenantPermissionsGuard)
@UsePipes(createTenantValidationPipe())
export class OrdersExampleController {

  @Post()
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto
  ): Promise<ApiResponseDto<OrderResponseDto>> {
    // Validates complex order with nested items:
    // - Customer ID validation
    // - Order type enum
    // - Items array with nested validation
    // - Each item validates: productId, quantity, unitPrice, etc.
    // - Coordinate validation for service location
    // - Time format validation for scheduled times
    
    console.log('Validated order data:', createOrderDto);
    console.log('Order items:', createOrderDto.items);
    
    // Example of validated nested data:
    // {
    //   customerId: 'uuid-customer',
    //   type: 'service',
    //   items: [
    //     {
    //       productId: 'uuid-product',
    //       description: 'Premium Widget - Red Large',
    //       quantity: 2.00,  // Formatted to 2 decimal places
    //       unitPrice: 99.99,  // Validated positive number
    //       discountPercentage: 10.00,  // Validated 0-100 range
    //       taxRate: 19.00  // Validated tax rate
    //     }
    //   ],
    //   serviceLatitude: 4.71100000,  // Formatted coordinates
    //   serviceLongitude: -74.07210000,
    //   scheduledTimeStart: '09:00',  // Formatted time
    //   scheduledTimeEnd: '17:00'
    // }
    
    return {
      success: true,
      data: createOrderDto as any,
      message: 'Order created successfully'
    };
  }
}

// Example 4: Task Management with GPS and File Validation
@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(TenantPermissionsGuard)
@UsePipes(createTenantValidationPipe())
export class TasksExampleController {

  @Post()
  @RequirePermissions(PERMISSIONS.TASKS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new task' })
  async createTask(
    @Body() createTaskDto: CreateTaskDto
  ): Promise<ApiResponseDto<TaskResponseDto>> {
    // Validates task with:
    // - Optional order and customer references
    // - Task type and priority enums
    // - Date validation for scheduling
    // - GPS coordinates validation
    // - Nested checklist items validation
    // - Task dependencies validation
    
    return {
      success: true,
      data: createTaskDto as any,
      message: 'Task created successfully'
    };
  }

  @Post(':id/checkin')
  @RequirePermissions(PERMISSIONS.TASKS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in to task location' })
  async checkInTask(
    @Param('id') id: string,
    @Body() checkInDto: CheckInTaskDto
  ): Promise<ApiResponseDto<void>> {
    // Validates GPS coordinates are within Colombian territory
    
    console.log('Check-in coordinates:', checkInDto);
    // {
    //   latitude: 4.71100000,  // Validated Colombian coordinates
    //   longitude: -74.07210000,
    //   notes: 'Arrived at customer location'
    // }
    
    return {
      success: true,
      data: undefined,
      message: 'Checked in successfully'
    };
  }

  @Post(':id/complete')
  @RequirePermissions(PERMISSIONS.TASKS_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete task with evidence' })
  async completeTask(
    @Param('id') id: string,
    @Body() completeDto: CompleteTaskDto
  ): Promise<ApiResponseDto<TaskResponseDto>> {
    // Validates completion data including:
    // - Optional completion notes
    // - Photo URLs array validation
    // - Signature URL validation
    
    return {
      success: true,
      data: { id, status: 'completed', ...completeDto } as any,
      message: 'Task completed successfully'
    };
  }
}

/**
 * Key Features Demonstrated:
 * 
 * 1. **Automatic Validation**: All DTOs are automatically validated
 * 2. **Data Transformation**: Strings are trimmed, formatted, and converted
 * 3. **Custom Validators**: Colombian-specific validation (phone, NIT, coordinates)
 * 4. **Nested Validation**: Complex objects with nested arrays are validated
 * 5. **Error Formatting**: Structured error responses with field-level details
 * 6. **Type Safety**: Full TypeScript support with generated types
 * 7. **API Documentation**: Swagger/OpenAPI integration with examples
 * 8. **Permission Control**: Role and permission-based access control
 * 9. **Localization**: Support for Spanish and English error messages
 * 10. **Performance**: Efficient validation with caching and optimization
 */