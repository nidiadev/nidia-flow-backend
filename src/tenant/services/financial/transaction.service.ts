import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionFilterDto } from '../../dto/financial/transaction.dto';
import { Transaction, Prisma } from '../../../../generated/tenant-prisma';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string): Promise<Transaction> {
    const { 
      type, 
      category, 
      subcategory, 
      amount, 
      description, 
      referenceType, 
      referenceId,
      paymentMethod,
      transactionDate,
      dueDate,
      supplierCustomerName,
      invoiceNumber,
      receiptUrl,
      isTaxable,
      taxAmount,
      notes
    } = createTransactionDto;

    const client = await this.prisma.getTenantClient();

    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber();

    // Validate reference if provided
    if (referenceType && referenceId) {
      await this.validateReference(referenceType, referenceId);
    }

    // Auto-categorize if not provided
    const finalCategory = category || await this.autoCategorizeTransaction(type, description, amount);

    const transaction = await client.transaction.create({
      data: {
        transactionNumber,
        type,
        category: finalCategory,
        subcategory,
        amount,
        description,
        referenceType,
        referenceId,
        paymentMethod,
        transactionDate: new Date(transactionDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        supplierCustomerName,
        invoiceNumber,
        receiptUrl,
        isTaxable: isTaxable || false,
        taxAmount: taxAmount || 0,
        notes,
        createdBy: userId,
      },
    });

    return transaction;
  }

  async findAll(filters: TransactionFilterDto = {}) {
    const {
      type,
      category,
      status,
      dateFrom,
      dateTo,
      paymentMethod,
      page = 1,
      limit = 20,
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = filters;

    const where: Prisma.TransactionWhereInput = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    
    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
      if (dateTo) where.transactionDate.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const client = await this.prisma.getTenantClient();

    const [transactions, total] = await Promise.all([
      client.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      client.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Transaction> {
    const client = await this.prisma.getTenantClient();
    const transaction = await client.transaction.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const existingTransaction = await this.findOne(id);

    if (existingTransaction.status === 'cancelled') {
      throw new BadRequestException('Cannot update cancelled transaction');
    }

    const client = await this.prisma.getTenantClient();
    const updatedTransaction = await client.transaction.update({
      where: { id },
      data: {
        ...updateTransactionDto,
        transactionDate: updateTransactionDto.transactionDate 
          ? new Date(updateTransactionDto.transactionDate) 
          : undefined,
        dueDate: updateTransactionDto.dueDate 
          ? new Date(updateTransactionDto.dueDate) 
          : undefined,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedTransaction;
  }

  async remove(id: string): Promise<void> {
    const transaction = await this.findOne(id);

    if (transaction.status === 'completed') {
      throw new BadRequestException('Cannot delete completed transaction. Cancel it first.');
    }

    const client = await this.prisma.getTenantClient();
    await client.transaction.delete({
      where: { id },
    });
  }

  async cancel(id: string, reason?: string): Promise<Transaction> {
    const transaction = await this.findOne(id);

    if (transaction.status === 'cancelled') {
      throw new BadRequestException('Transaction is already cancelled');
    }

    const client = await this.prisma.getTenantClient();
    return client.transaction.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: reason ? `${transaction.notes || ''}\nCancellation reason: ${reason}` : transaction.notes,
      },
    });
  }

  async getFinancialSummary(dateFrom?: string, dateTo?: string) {
    const where: Prisma.TransactionWhereInput = {
      status: 'completed',
    };

    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
      if (dateTo) where.transactionDate.lte = new Date(dateTo);
    }

    const client = await this.prisma.getTenantClient();

    const [incomeResult, expenseResult, categoryBreakdown] = await Promise.all([
      client.transaction.aggregate({
        where: { ...where, type: 'income' },
        _sum: { amount: true },
        _count: true,
      }),
      client.transaction.aggregate({
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
        _count: true,
      }),
      client.transaction.groupBy({
        by: ['category', 'type'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = incomeResult._sum.amount || 0;
    const totalExpenses = expenseResult._sum.amount || 0;
    const netIncome = Number(totalIncome) - Number(totalExpenses);

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      incomeTransactions: incomeResult._count,
      expenseTransactions: expenseResult._count,
      categoryBreakdown: categoryBreakdown.map(item => ({
        category: item.category,
        type: item.type,
        amount: item._sum.amount || 0,
        count: item._count,
      })),
    };
  }

  private async generateTransactionNumber(): Promise<string> {
    const client = await this.prisma.getTenantClient();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `TXN-${year}${month}${day}`;
    
    const lastTransaction = await client.transaction.findFirst({
      where: {
        transactionNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        transactionNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastTransaction) {
      const lastSequence = parseInt(lastTransaction.transactionNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  private async validateReference(referenceType: string, referenceId: string): Promise<void> {
    const client = await this.prisma.getTenantClient();
    switch (referenceType) {
      case 'order':
        const order = await client.order.findUnique({ where: { id: referenceId } });
        if (!order) {
          throw new BadRequestException(`Order with ID ${referenceId} not found`);
        }
        break;
      case 'payment':
        const payment = await client.payment.findUnique({ where: { id: referenceId } });
        if (!payment) {
          throw new BadRequestException(`Payment with ID ${referenceId} not found`);
        }
        break;
    }
  }

  private async autoCategorizeTransaction(type: string, description: string, amount: number): Promise<string> {
    const descriptionLower = description.toLowerCase();
    
    if (type === 'income') {
      if (descriptionLower.includes('venta') || descriptionLower.includes('orden') || descriptionLower.includes('servicio')) {
        return 'sales';
      }
      return 'other_income';
    } else {
      // Expense categorization
      if (descriptionLower.includes('salario') || descriptionLower.includes('nomina') || descriptionLower.includes('sueldo')) {
        return 'salaries';
      }
      if (descriptionLower.includes('arriendo') || descriptionLower.includes('alquiler') || descriptionLower.includes('renta')) {
        return 'rent';
      }
      if (descriptionLower.includes('servicio') || descriptionLower.includes('luz') || descriptionLower.includes('agua') || descriptionLower.includes('internet')) {
        return 'utilities';
      }
      if (descriptionLower.includes('material') || descriptionLower.includes('insumo') || descriptionLower.includes('compra')) {
        return 'supplies';
      }
      if (descriptionLower.includes('combustible') || descriptionLower.includes('gasolina') || descriptionLower.includes('transporte')) {
        return 'transportation';
      }
      return 'other_expenses';
    }
  }
}