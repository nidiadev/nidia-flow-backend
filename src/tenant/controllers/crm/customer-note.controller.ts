import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPermissions } from '../../decorators/tenant-database.decorator';
import { CustomerNoteService } from '../../services/crm/customer-note.service';
import {
  CreateCustomerNoteDto,
  UpdateCustomerNoteDto,
  CustomerNoteResponseDto,
} from '../../dto/crm/customer-note.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Customer Notes')
@ApiBearerAuth()
@Controller('crm/customer-notes')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomerNoteController {
  constructor(private readonly customerNoteService: CustomerNoteService) {}

  @Post()
  @RequirePermissions('crm:write', 'crm:customers:write')
  @ApiOperation({ 
    summary: 'Create a new customer note',
    description: 'Creates a new note for a customer'
  })
  @ApiBody({ type: CreateCustomerNoteDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Note created successfully',
    type: CustomerNoteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or customer not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to create notes',
  })
  async create(
    @Body(ValidationPipe) createNoteDto: CreateCustomerNoteDto,
    @CurrentUser('userId') userId?: string,
  ): Promise<ApiResponseDto<CustomerNoteResponseDto>> {
    const note = await this.customerNoteService.create(createNoteDto, userId);
    return {
      success: true,
      data: note,
      message: 'Note created successfully',
    };
  }

  @Get('customer/:customerId')
  @RequirePermissions('crm:read', 'crm:customers:read')
  @ApiOperation({ 
    summary: 'Get all notes for a customer',
    description: 'Retrieves all notes associated with a specific customer'
  })
  @ApiParam({ 
    name: 'customerId', 
    description: 'Customer ID',
    type: String,
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notes retrieved successfully',
    type: [CustomerNoteResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to read notes',
  })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser('userId') userId?: string,
    @UserPermissions() permissions: string[] = [],
  ): Promise<ApiResponseDto<CustomerNoteResponseDto[]>> {
    const notes = await this.customerNoteService.findByCustomer(customerId, userId, permissions);
    return {
      success: true,
      data: notes,
      message: 'Notes retrieved successfully',
    };
  }

  @Put(':id')
  @RequirePermissions('crm:write', 'crm:customers:write')
  @ApiOperation({ 
    summary: 'Update a customer note',
    description: 'Updates an existing customer note'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Note ID',
    type: String,
    format: 'uuid'
  })
  @ApiBody({ type: UpdateCustomerNoteDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Note updated successfully',
    type: CustomerNoteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Note not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to update notes',
  })
  async update(
    @Param('id', ParseUUIDPipe) noteId: string,
    @Body(ValidationPipe) updateNoteDto: UpdateCustomerNoteDto,
    @CurrentUser('userId') userId?: string,
  ): Promise<ApiResponseDto<CustomerNoteResponseDto>> {
    const note = await this.customerNoteService.update(noteId, updateNoteDto, userId);
    return {
      success: true,
      data: note,
      message: 'Note updated successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions('crm:write', 'crm:customers:write')
  @ApiOperation({ 
    summary: 'Delete a customer note',
    description: 'Deletes an existing customer note'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Note ID',
    type: String,
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Note deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Note not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to delete notes',
  })
  async delete(
    @Param('id', ParseUUIDPipe) noteId: string,
    @CurrentUser('userId') userId?: string,
  ): Promise<ApiResponseDto<void>> {
    await this.customerNoteService.delete(noteId, userId);
    return {
      success: true,
      data: undefined,
      message: 'Note deleted successfully',
    };
  }
}

