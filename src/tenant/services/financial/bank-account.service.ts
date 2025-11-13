import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../../dto/financial/bank-account.dto';
import { BankAccount } from '../../../../generated/tenant-prisma';

@Injectable()
export class BankAccountService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createBankAccountDto: CreateBankAccountDto): Promise<BankAccount> {
    const {
      accountName,
      bankName,
      accountNumber,
      accountType,
      currency,
      initialBalance,
      isPrimary
    } = createBankAccountDto;

    const client = await this.prisma.getTenantClient();

    // If this is set as primary, unset other primary accounts
    if (isPrimary) {
      await client.bankAccount.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const bankAccount = await client.bankAccount.create({
      data: {
        accountName,
        bankName,
        accountNumber,
        accountType,
        currency: currency || 'COP',
        initialBalance: initialBalance || 0,
        currentBalance: initialBalance || 0,
        isPrimary: isPrimary || false,
      },
    });

    return bankAccount;
  }

  async findAll(includeInactive = false) {
    const client = await this.prisma.getTenantClient();
    const where = includeInactive ? {} : { isActive: true };

    const bankAccounts = await client.bankAccount.findMany({
      where,
      orderBy: [
        { isPrimary: 'desc' },
        { accountName: 'asc' },
      ],
    });

    return bankAccounts;
  }

  async findOne(id: string): Promise<BankAccount> {
    const client = await this.prisma.getTenantClient();
    const bankAccount = await client.bankAccount.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      throw new NotFoundException(`Bank account with ID ${id} not found`);
    }

    return bankAccount;
  }

  async update(id: string, updateBankAccountDto: UpdateBankAccountDto): Promise<BankAccount> {
    const existingAccount = await this.findOne(id);
    const client = await this.prisma.getTenantClient();

    // If this is set as primary, unset other primary accounts
    if (updateBankAccountDto.isPrimary && !existingAccount.isPrimary) {
      await client.bankAccount.updateMany({
        where: { 
          isPrimary: true,
          id: { not: id }
        },
        data: { isPrimary: false },
      });
    }

    const updatedAccount = await client.bankAccount.update({
      where: { id },
      data: updateBankAccountDto,
    });

    return updatedAccount;
  }

  async remove(id: string): Promise<void> {
    const bankAccount = await this.findOne(id);

    if (bankAccount.isPrimary) {
      throw new BadRequestException('Cannot delete primary bank account. Set another account as primary first.');
    }

    const client = await this.prisma.getTenantClient();
    await client.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async setPrimary(id: string): Promise<BankAccount> {
    const bankAccount = await this.findOne(id);

    if (!bankAccount.isActive) {
      throw new BadRequestException('Cannot set inactive account as primary');
    }

    const client = await this.prisma.getTenantClient();

    // Unset other primary accounts
    await client.bankAccount.updateMany({
      where: { 
        isPrimary: true,
        id: { not: id }
      },
      data: { isPrimary: false },
    });

    // Set this account as primary
    const updatedAccount = await client.bankAccount.update({
      where: { id },
      data: { isPrimary: true },
    });

    return updatedAccount;
  }

  async updateBalance(id: string, newBalance: number, reason?: string): Promise<BankAccount> {
    const bankAccount = await this.findOne(id);

    if (!bankAccount.isActive) {
      throw new BadRequestException('Cannot update balance of inactive account');
    }

    const client = await this.prisma.getTenantClient();
    const updatedAccount = await client.bankAccount.update({
      where: { id },
      data: { currentBalance: newBalance },
    });

    // TODO: Log balance change in audit log or transaction history
    // This could be implemented as part of a balance history feature

    return updatedAccount;
  }

  async getTotalBalance(currency?: string) {
    const where = currency ? { currency, isActive: true } : { isActive: true };

    const client = await this.prisma.getTenantClient();
    const result = await client.bankAccount.aggregate({
      where,
      _sum: { currentBalance: true },
      _count: true,
    });

    return {
      totalBalance: result._sum.currentBalance || 0,
      accountCount: result._count,
      currency: currency || 'ALL',
    };
  }

  async getBalancesByCurrency() {
    const client = await this.prisma.getTenantClient();
    const balances = await client.bankAccount.groupBy({
      by: ['currency'],
      where: { isActive: true },
      _sum: { currentBalance: true },
      _count: true,
    });

    return balances.map(balance => ({
      currency: balance.currency,
      totalBalance: balance._sum.currentBalance || 0,
      accountCount: balance._count,
    }));
  }

  async reconcileBalance(id: string, actualBalance: number, reason: string): Promise<BankAccount> {
    const bankAccount = await this.findOne(id);
    const difference = actualBalance - Number(bankAccount.currentBalance);

    if (Math.abs(difference) < 0.01) {
      // No significant difference, no reconciliation needed
      return bankAccount;
    }

    // Update the balance
    const updatedAccount = await this.updateBalance(id, actualBalance, reason);

    // TODO: Create a reconciliation transaction record
    // This would help track discrepancies and maintain audit trail

    return updatedAccount;
  }
}