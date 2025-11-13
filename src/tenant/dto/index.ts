// Base DTOs
export * from './base/base.dto';

// CRM DTOs
export * from './crm/customer.dto';
export * from './crm/customer-contact.dto';
export * from './crm/interaction.dto';

// Products DTOs
export * from './products/product.dto';
export * from './products/category.dto';
export * from './products/product-variant.dto';

// Orders DTOs
export * from './orders/order.dto';

// Tasks DTOs
export * from './tasks/task.dto';

// Financial DTOs
export * from './financial/transaction.dto';
export * from './financial/bank-account.dto';
export * from './financial/budget-category.dto';

// Communications DTOs
export * from './communications/message-template.dto';
export * from './communications/message-log.dto';
export * from './communications/notification.dto';

// Files DTOs
export * from './files/file.dto';

// Reports DTOs
export * from './reports/saved-report.dto';
export * from './reports/report-execution.dto';

// Settings DTOs
export * from './settings/company-setting.dto';

// Audit DTOs
export * from './audit/audit-log.dto';

// Existing DTOs
export * from './create-tenant.dto';
export * from './update-tenant.dto';

// Validators and Transformers
export * from '../validators/custom-validators';
export * from '../transformers/custom-transformers';
export * from '../config/validation.config';