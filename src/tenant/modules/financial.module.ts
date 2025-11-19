import { Module, forwardRef } from '@nestjs/common';
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
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [
    TransactionController,
    BankAccountController,
    BudgetCategoryController,
  ],
  providers: [
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