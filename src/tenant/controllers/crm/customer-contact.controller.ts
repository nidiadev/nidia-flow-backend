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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CustomerContactService } from '../../services/crm/customer-contact.service';
import {
  CreateCustomerContactDto,
  UpdateCustomerContactDto,
  CustomerContactResponseDto,
} from '../../dto/crm/customer-contact.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Customer Contacts')
@ApiBearerAuth()
@Controller('crm/customers/:customerId/contacts')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomerContactController {
  constructor(private readonly customerContactService: CustomerContactService) {}

  @Post()
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Add contact to customer',
    description: 'Creates a new contact person for a customer'
  })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiBody({ type: CreateCustomerContactDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contact created successfully',
    type: CustomerContactResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or customer not found',
  })
  async create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body(ValidationPipe) createContactDto: CreateCustomerContactDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerContactResponseDto>> {
    const contact = await this.customerContactService.create(customerId, createContactDto, userId);
    return {
      success: true,
      data: contact,
      message: 'Contact created successfully',
    };
  }

  @Get()
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get customer contacts',
    description: 'Retrieves all contacts for a specific customer'
  })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive contacts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contacts retrieved successfully',
    type: [CustomerContactResponseDto],
  })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<ApiResponseDto<CustomerContactResponseDto[]>> {
    const contacts = await this.customerContactService.findByCustomer(customerId, includeInactive);
    return {
      success: true,
      data: contacts,
      message: `Found ${contacts.length} contacts`,
    };
  }

  @Get(':contactId')
  @RequirePermissions('crm:read')
  @ApiOperation({ 
    summary: 'Get contact by ID',
    description: 'Retrieves detailed contact information'
  })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact retrieved successfully',
    type: CustomerContactResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async findById(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<ApiResponseDto<CustomerContactResponseDto>> {
    const contact = await this.customerContactService.findById(contactId);
    return {
      success: true,
      data: contact,
    };
  }

  @Put(':contactId')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Update contact',
    description: 'Updates contact information'
  })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact ID' })
  @ApiBody({ type: UpdateCustomerContactDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact updated successfully',
    type: CustomerContactResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async update(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body(ValidationPipe) updateContactDto: UpdateCustomerContactDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerContactResponseDto>> {
    const contact = await this.customerContactService.update(contactId, updateContactDto, userId);
    return {
      success: true,
      data: contact,
      message: 'Contact updated successfully',
    };
  }

  @Delete(':contactId')
  @RequirePermissions('crm:delete')
  @ApiOperation({ 
    summary: 'Delete contact',
    description: 'Soft deletes a customer contact'
  })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async delete(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<null>> {
    await this.customerContactService.delete(contactId, userId);
    return {
      success: true,
      data: null,
      message: 'Contact deleted successfully',
    };
  }

  @Put(':contactId/set-primary')
  @RequirePermissions('crm:write')
  @ApiOperation({ 
    summary: 'Set contact as primary',
    description: 'Sets a contact as the primary contact for the customer'
  })
  @ApiParam({ name: 'customerId', type: 'string', format: 'uuid', description: 'Customer ID' })
  @ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Primary contact updated successfully',
    type: CustomerContactResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async setPrimary(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<CustomerContactResponseDto>> {
    const contact = await this.customerContactService.setPrimary(contactId, userId);
    return {
      success: true,
      data: contact,
      message: 'Primary contact updated successfully',
    };
  }
}