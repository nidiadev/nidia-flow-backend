import { Module, forwardRef } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import {
  TransactionController,
  BankAccountController,
  BudgetCategoryController,
} from '../controllers/financial';
import {
  TransactionService,
  BankAccountService,
  BudgetCategoryService,
} from '../services/financial';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [
    TransactionController,
    BankAccountController,
    BudgetCategoryController,
  ],
  providers: [
    TenantPrismaService,
    TenantService,
    TransactionService,
    BankAccountService,
    BudgetCategoryService,
  ],
  exports: [
    TransactionService,
    BankAccountService,
    BudgetCategoryService,
  ],
})
export class FinancialModule {}