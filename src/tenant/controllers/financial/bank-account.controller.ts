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
import { BankAccountService } from '../../services/financial/bank-account.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '../../dto/financial/bank-account.dto';

@ApiTags('Financial - Bank Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({
    status: 201,
    description: 'Bank account created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @RequirePermissions('accounting:write')
  async create(@Body() createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountService.create(createBankAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bank accounts' })
  @ApiResponse({
    status: 200,
    description: 'Bank accounts retrieved successfully',
  })
  @ApiQuery({ 
    name: 'includeInactive', 
    required: false, 
    type: 'boolean',
    description: 'Include inactive accounts in results'
  })
  @RequirePermissions('accounting:read')
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    return this.bankAccountService.findAll(includeInactive);
  }

  @Get('balance/total')
  @ApiOperation({ summary: 'Get total balance across all accounts' })
  @ApiResponse({
    status: 200,
    description: 'Total balance retrieved successfully',
  })
  @ApiQuery({ 
    name: 'currency', 
    required: false, 
    description: 'Filter by currency code'
  })
  @RequirePermissions('accounting:read')
  async getTotalBalance(@Query('currency') currency?: string) {
    return this.bankAccountService.getTotalBalance(currency);
  }

  @Get('balance/by-currency')
  @ApiOperation({ summary: 'Get balances grouped by currency' })
  @ApiResponse({
    status: 200,
    description: 'Balances by currency retrieved successfully',
  })
  @RequirePermissions('accounting:read')
  async getBalancesByCurrency() {
    return this.bankAccountService.getBalancesByCurrency();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiResponse({
    status: 200,
    description: 'Bank account retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  @RequirePermissions('accounting:read')
  async findOne(@Param('id') id: string) {
    return this.bankAccountService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  @RequirePermissions('accounting:write')
  async update(
    @Param('id') id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.bankAccountService.update(id, updateBankAccountDto);
  }

  @Patch(':id/set-primary')
  @ApiOperation({ summary: 'Set account as primary' })
  @ApiResponse({
    status: 200,
    description: 'Account set as primary successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot set inactive account as primary',
  })
  @RequirePermissions('accounting:write')
  async setPrimary(@Param('id') id: string) {
    return this.bankAccountService.setPrimary(id);
  }

  @Patch(':id/balance')
  @ApiOperation({ summary: 'Update account balance' })
  @ApiResponse({
    status: 200,
    description: 'Balance updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update balance of inactive account',
  })
  @RequirePermissions('accounting:write')
  async updateBalance(
    @Param('id') id: string,
    @Body('newBalance') newBalance: number,
    @Body('reason') reason?: string,
  ) {
    return this.bankAccountService.updateBalance(id, newBalance, reason);
  }

  @Patch(':id/reconcile')
  @ApiOperation({ summary: 'Reconcile account balance' })
  @ApiResponse({
    status: 200,
    description: 'Balance reconciled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  @RequirePermissions('accounting:write')
  async reconcileBalance(
    @Param('id') id: string,
    @Body('actualBalance') actualBalance: number,
    @Body('reason') reason: string,
  ) {
    return this.bankAccountService.reconcileBalance(id, actualBalance, reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate bank account' })
  @ApiResponse({
    status: 204,
    description: 'Bank account deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete primary bank account',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('accounting:delete')
  async remove(@Param('id') id: string) {
    return this.bankAccountService.remove(id);
  }
}