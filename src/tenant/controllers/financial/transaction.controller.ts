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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TransactionService } from '../../services/financial/transaction.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionFilterDto,
} from '../../dto/financial/transaction.dto';

@ApiTags('Financial - Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @RequirePermissions('accounting:write')
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionService.create(createTransactionDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions with filters' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['income', 'expense'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['completed', 'pending', 'cancelled'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: 'string', format: 'date' })
  @ApiQuery({ name: 'dateTo', required: false, type: 'string', format: 'date' })
  @ApiQuery({ name: 'paymentMethod', required: false })
  @ApiQuery({ name: 'page', required: false, type: 'number', minimum: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', minimum: 1, maximum: 100 })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @RequirePermissions('accounting:read')
  async findAll(@Query() filters: TransactionFilterDto) {
    return this.transactionService.findAll(filters);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get financial summary' })
  @ApiResponse({
    status: 200,
    description: 'Financial summary retrieved successfully',
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: 'string', format: 'date' })
  @ApiQuery({ name: 'dateTo', required: false, type: 'string', format: 'date' })
  @RequirePermissions('accounting:read')
  async getFinancialSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.transactionService.getFinancialSummary(dateFrom, dateTo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  @RequirePermissions('accounting:read')
  async findOne(@Param('id') id: string) {
    return this.transactionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update cancelled transaction',
  })
  @RequirePermissions('accounting:write')
  async update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionService.update(id, updateTransactionDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Transaction is already cancelled',
  })
  @RequirePermissions('accounting:write')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.transactionService.cancel(id, reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({
    status: 204,
    description: 'Transaction deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete completed transaction',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('accounting:delete')
  async remove(@Param('id') id: string) {
    return this.transactionService.remove(id);
  }
}