import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateBudgetCategoryDto, UpdateBudgetCategoryDto } from '../../dto/financial/budget-category.dto';
import { BudgetCategory } from '../../../../generated/tenant-prisma';

@Injectable()
export class BudgetCategoryService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createBudgetCategoryDto: CreateBudgetCategoryDto): Promise<BudgetCategory> {
    const {
      name,
      type,
      monthlyBudget
    } = createBudgetCategoryDto;

    const client = await this.prisma.getTenantClient();

    // Check if category with same name and type already exists
    const existingCategory = await client.budgetCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        type,
        isActive: true,
      },
    });

    if (existingCategory) {
      throw new BadRequestException(`Budget category '${name}' of type '${type}' already exists`);
    }

    const budgetCategory = await client.budgetCategory.create({
      data: {
        name,
        type,
        monthlyBudget: monthlyBudget || null,
      },
    });

    return budgetCategory;
  }

  async findAll(type?: 'income' | 'expense', includeInactive = false) {
    const client = await this.prisma.getTenantClient();
    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (!includeInactive) {
      where.isActive = true;
    }

    const budgetCategories = await client.budgetCategory.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return budgetCategories;
  }

  async findOne(id: string): Promise<BudgetCategory> {
    const client = await this.prisma.getTenantClient();
    const budgetCategory = await client.budgetCategory.findUnique({
      where: { id },
    });

    if (!budgetCategory) {
      throw new NotFoundException(`Budget category with ID ${id} not found`);
    }

    return budgetCategory;
  }

  async update(id: string, updateBudgetCategoryDto: UpdateBudgetCategoryDto): Promise<BudgetCategory> {
    await this.findOne(id); // Ensure it exists
    const client = await this.prisma.getTenantClient();

    // Check for name conflicts if name is being updated
    if (updateBudgetCategoryDto.name) {
      const existingCategory = await client.budgetCategory.findFirst({
        where: {
          name: {
            equals: updateBudgetCategoryDto.name,
            mode: 'insensitive',
          },
          type: updateBudgetCategoryDto.type,
          isActive: true,
          id: { not: id },
        },
      });

      if (existingCategory) {
        throw new BadRequestException(`Budget category '${updateBudgetCategoryDto.name}' already exists`);
      }
    }

    const updatedCategory = await client.budgetCategory.update({
      where: { id },
      data: updateBudgetCategoryDto,
    });

    return updatedCategory;
  }

  async remove(id: string): Promise<void> {
    const budgetCategory = await this.findOne(id);
    const client = await this.prisma.getTenantClient();

    // Check if category is being used in transactions
    const transactionCount = await client.transaction.count({
      where: { category: budgetCategory.name },
    });

    if (transactionCount > 0) {
      // Soft delete - mark as inactive instead of deleting
      await client.budgetCategory.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no transactions reference it
      await client.budgetCategory.delete({
        where: { id },
      });
    }
  }

  async getBudgetAnalysis(year?: number, month?: number) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Get all active budget categories
    const categories = await this.findAll();

    // Get actual spending/income for the period
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const client = await this.prisma.getTenantClient();
    const actualAmounts = await client.transaction.groupBy({
      by: ['category', 'type'],
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'completed',
      },
      _sum: { amount: true },
    });

    // Create analysis for each category
    const analysis = categories.map(category => {
      const actual = actualAmounts.find(
        a => a.category === category.name && a.type === category.type
      );
      const actualAmount = actual?._sum.amount || 0;
      const budgetAmount = category.monthlyBudget || 0;
      
      let variance = 0;
      let variancePercentage = 0;
      
      if (Number(budgetAmount) > 0) {
        variance = Number(actualAmount) - Number(budgetAmount);
        variancePercentage = (variance / Number(budgetAmount)) * 100;
      }

      return {
        categoryId: category.id,
        categoryName: category.name,
        type: category.type,
        budgetAmount,
        actualAmount,
        variance,
        variancePercentage,
        isOverBudget: variance > 0 && category.type === 'expense',
        isUnderBudget: variance < 0 && category.type === 'expense',
      };
    });

    // Calculate totals
    const totalBudgetIncome = analysis
      .filter(a => a.type === 'income')
      .reduce((sum, a) => sum + Number(a.budgetAmount), 0);
    
    const totalActualIncome = analysis
      .filter(a => a.type === 'income')
      .reduce((sum, a) => sum + Number(a.actualAmount), 0);
    
    const totalBudgetExpenses = analysis
      .filter(a => a.type === 'expense')
      .reduce((sum, a) => sum + Number(a.budgetAmount), 0);
    
    const totalActualExpenses = analysis
      .filter(a => a.type === 'expense')
      .reduce((sum, a) => sum + Number(a.actualAmount), 0);

    return {
      period: {
        year: currentYear,
        month: currentMonth,
        startDate,
        endDate,
      },
      categories: analysis,
      summary: {
        totalBudgetIncome,
        totalActualIncome,
        incomeVariance: totalActualIncome - totalBudgetIncome,
        totalBudgetExpenses,
        totalActualExpenses,
        expenseVariance: totalActualExpenses - totalBudgetExpenses,
        budgetedNetIncome: totalBudgetIncome - totalBudgetExpenses,
        actualNetIncome: totalActualIncome - totalActualExpenses,
      },
    };
  }

  async getSpendingTrends(categoryId: string, months = 6) {
    const category = await this.findOne(categoryId);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const client = await this.prisma.getTenantClient();
    const monthlySpending = await client.$queryRaw`
      SELECT 
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE category = ${category.name}
        AND type = ${category.type}
        AND status = 'completed'
        AND transaction_date >= ${startDate}
        AND transaction_date <= ${endDate}
      GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
      ORDER BY year, month
    `;

    return {
      categoryId: category.id,
      categoryName: category.name,
      type: category.type,
      monthlyBudget: category.monthlyBudget,
      trends: monthlySpending,
    };
  }
}