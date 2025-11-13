# Financial System API Controllers

This directory contains the REST API controllers for the financial system module of NIDIA Flow. The financial system provides comprehensive accounting functionality including transaction management, bank account management, and budget tracking.

## Controllers Overview

### TransactionController (`/tenant/transactions`)

Manages financial transactions (income and expenses) with comprehensive filtering and reporting capabilities.

**Key Features:**
- Create, read, update, delete transactions
- Auto-categorization of transactions
- Financial summaries and reporting
- Transaction cancellation with audit trail
- Support for various payment methods
- Tax calculation and tracking

**Main Endpoints:**
- `POST /tenant/transactions` - Create new transaction
- `GET /tenant/transactions` - List transactions with filters
- `GET /tenant/transactions/summary` - Get financial summary
- `GET /tenant/transactions/:id` - Get transaction details
- `PATCH /tenant/transactions/:id` - Update transaction
- `PATCH /tenant/transactions/:id/cancel` - Cancel transaction
- `DELETE /tenant/transactions/:id` - Delete transaction

### BankAccountController (`/tenant/bank-accounts`)

Manages bank accounts and account balances with multi-currency support.

**Key Features:**
- Multiple bank account management
- Primary account designation
- Balance tracking and reconciliation
- Multi-currency support
- Account activation/deactivation
- Balance aggregation and reporting

**Main Endpoints:**
- `POST /tenant/bank-accounts` - Create new bank account
- `GET /tenant/bank-accounts` - List all bank accounts
- `GET /tenant/bank-accounts/balance/total` - Get total balance
- `GET /tenant/bank-accounts/balance/by-currency` - Get balances by currency
- `GET /tenant/bank-accounts/:id` - Get account details
- `PATCH /tenant/bank-accounts/:id` - Update account
- `PATCH /tenant/bank-accounts/:id/set-primary` - Set as primary account
- `PATCH /tenant/bank-accounts/:id/balance` - Update balance
- `PATCH /tenant/bank-accounts/:id/reconcile` - Reconcile balance
- `DELETE /tenant/bank-accounts/:id` - Deactivate account

### BudgetCategoryController (`/tenant/budget-categories`)

Manages budget categories and provides budget analysis and spending trends.

**Key Features:**
- Income and expense category management
- Monthly budget allocation
- Budget vs actual analysis
- Spending trend analysis
- Category-based reporting
- Budget variance tracking

**Main Endpoints:**
- `POST /tenant/budget-categories` - Create new budget category
- `GET /tenant/budget-categories` - List all categories
- `GET /tenant/budget-categories/analysis` - Get budget analysis
- `GET /tenant/budget-categories/:id` - Get category details
- `GET /tenant/budget-categories/:id/trends` - Get spending trends
- `PATCH /tenant/budget-categories/:id` - Update category
- `DELETE /tenant/budget-categories/:id` - Delete category

## Authentication & Authorization

All endpoints require:
- **Authentication**: Valid JWT token via `Authorization: Bearer <token>`
- **Tenant Context**: Automatic tenant resolution from JWT
- **Permissions**: Specific accounting permissions:
  - `accounting:read` - View financial data
  - `accounting:write` - Create/update financial records
  - `accounting:delete` - Delete financial records

## Data Models

### Transaction
- Supports both income and expense transactions
- Auto-categorization based on description
- Reference linking to orders/payments
- Tax calculation and tracking
- Multiple payment methods
- Audit trail with user tracking

### Bank Account
- Multi-currency support
- Primary account designation
- Balance tracking and reconciliation
- Account activation status
- Connection to external banking systems

### Budget Category
- Income/expense categorization
- Monthly budget allocation
- Variance tracking
- Spending trend analysis
- Category hierarchy support

## Error Handling

All controllers implement comprehensive error handling:
- **400 Bad Request**: Invalid input data or business rule violations
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resources or constraint violations

## Filtering and Pagination

### Transaction Filters
- `type`: income/expense
- `category`: transaction category
- `status`: completed/pending/cancelled
- `dateFrom`/`dateTo`: date range
- `paymentMethod`: payment method filter
- Standard pagination: `page`, `limit`, `sortBy`, `sortOrder`

### Bank Account Filters
- `includeInactive`: include deactivated accounts
- `currency`: filter by currency code

### Budget Category Filters
- `type`: income/expense categories
- `includeInactive`: include inactive categories
- `year`/`month`: analysis period

## Integration Points

The financial system integrates with:
- **Orders Module**: Automatic transaction creation from payments
- **Audit System**: Complete audit trail for all financial operations
- **Reporting System**: Financial reports and analytics
- **Multi-tenant System**: Tenant-isolated data access

## Performance Considerations

- Database queries are optimized with proper indexing
- Pagination is enforced for large datasets
- Financial summaries use aggregation queries
- Caching is implemented for frequently accessed data
- Connection pooling for database efficiency

## Security Features

- All financial data is tenant-isolated
- Sensitive operations require elevated permissions
- Audit logging for all financial transactions
- Input validation and sanitization
- Rate limiting on financial endpoints
- Encryption for sensitive financial data

## Future Enhancements

- Integration with external accounting systems
- Advanced financial reporting and analytics
- Automated reconciliation with bank feeds
- Multi-currency exchange rate management
- Advanced budgeting and forecasting
- Financial dashboard and KPI tracking