# NIDIA Flow SuperAdmin Database Schema

## Overview

This document describes the SuperAdmin database schema for NIDIA Flow, which manages all tenants, billing, support, and system operations.

## Core Models

### 🏢 Tenant Management

#### `tenants`
- **Purpose**: Core tenant management and configuration
- **Key Fields**:
  - `id` (UUID): Primary key
  - `name`: Company name
  - `slug`: URL-safe identifier (unique)
  - `plan_type`: Current subscription plan
  - `plan_status`: Subscription status (trial, active, suspended, etc.)
  - `db_name`: Tenant's dedicated database name (unique)
  - `db_host`, `db_port`, `db_username`: Database connection info
  - `billing_email`: Primary billing contact
  - `max_users`, `max_storage_gb`: Usage limits
  - `current_users`, `current_storage_gb`: Current usage

#### `tenant_domains`
- **Purpose**: Custom domains for tenants
- **Key Fields**:
  - `domain`: Custom domain (unique)
  - `is_verified`: Domain verification status
  - `is_primary`: Primary domain flag
  - `ssl_enabled`: SSL certificate status

### 👥 User Management

#### `users`
- **Purpose**: NIDIA staff and tenant administrators
- **Key Fields**:
  - `tenant_id`: NULL for NIDIA staff, tenant ID for tenant admins
  - `email`: Unique email address
  - `system_role`: super_admin, support, billing_admin, tenant_admin
  - `is_active`, `is_locked`: Account status
  - `login_attempts`: Failed login tracking
  - `last_login_at`, `last_login_ip`: Security tracking

#### `user_sessions`
- **Purpose**: JWT refresh token management
- **Key Fields**:
  - `token_hash`: Hashed refresh token
  - `device_name`, `device_type`: Device identification
  - `expires_at`: Session expiration
  - `is_active`: Session status

### 💰 Billing & Subscriptions

#### `plans`
- **Purpose**: Subscription plan definitions
- **Key Fields**:
  - `name`: Plan identifier (unique)
  - `price_monthly`, `price_yearly`: Pricing
  - `max_users`, `max_storage_gb`: Resource limits
  - `features`: JSON array of included features
  - `stripe_price_id_monthly`: Stripe integration

#### `subscriptions`
- **Purpose**: Tenant subscription records
- **Key Fields**:
  - `tenant_id`, `plan_id`: Foreign keys
  - `status`: active, cancelled, past_due, etc.
  - `current_period_start`, `current_period_end`: Billing period
  - `stripe_subscription_id`: Stripe integration

#### `invoices`
- **Purpose**: Billing invoices
- **Key Fields**:
  - `invoice_number`: Unique invoice identifier
  - `amount_total`: Total amount
  - `status`: draft, pending, paid, failed
  - `line_items`: JSON array of invoice items
  - `stripe_invoice_id`: Stripe integration

#### `payment_methods`
- **Purpose**: Stored payment methods
- **Key Fields**:
  - `type`: card, bank_account
  - `card_last4`, `card_brand`: Card information
  - `is_default`: Default payment method flag

### 🎫 Support System

#### `support_tickets`
- **Purpose**: Customer support tickets
- **Key Fields**:
  - `ticket_number`: Unique ticket identifier
  - `subject`, `description`: Ticket content
  - `priority`: low, medium, high, urgent
  - `status`: open, in_progress, resolved, closed
  - `created_by`, `assigned_to`: User assignments

#### `ticket_messages`
- **Purpose**: Support ticket conversations
- **Key Fields**:
  - `content`: Message content
  - `is_internal`: Internal staff notes flag
  - `attachments`: JSON array of file URLs

### 📊 Analytics & Monitoring

#### `tenant_usage_daily`
- **Purpose**: Daily usage metrics per tenant
- **Key Fields**:
  - `date`: Usage date
  - `active_users`: Daily active users
  - `storage_used_gb`: Storage consumption
  - `emails_sent`, `whatsapp_messages_sent`: Communication usage
  - `api_calls_made`: API usage

#### `audit_logs`
- **Purpose**: System audit trail
- **Key Fields**:
  - `action`: Action performed
  - `entity_type`, `entity_id`: Target entity
  - `old_values`, `new_values`: Change tracking
  - `user_id`: User who performed action

### 🔧 System Configuration

#### `system_settings`
- **Purpose**: Global system configuration
- **Key Fields**:
  - `key`: Setting identifier (unique)
  - `value`: Setting value
  - `category`: Setting category
  - `is_public`: Visible to tenant admins

#### `webhook_endpoints`
- **Purpose**: Webhook configuration
- **Key Fields**:
  - `url`: Webhook endpoint URL
  - `enabled_events`: Array of subscribed events
  - `secret`: Webhook signing secret

## Relationships

### Primary Relationships
- `users.tenant_id` → `tenants.id`
- `subscriptions.tenant_id` → `tenants.id`
- `subscriptions.plan_id` → `plans.id`
- `invoices.tenant_id` → `tenants.id`
- `user_sessions.user_id` → `users.id`

### Support Relationships
- `support_tickets.tenant_id` → `tenants.id`
- `support_tickets.created_by` → `users.id`
- `ticket_messages.ticket_id` → `support_tickets.id`

### Analytics Relationships
- `tenant_usage_daily.tenant_id` → `tenants.id`
- `audit_logs.tenant_id` → `tenants.id`
- `audit_logs.user_id` → `users.id`

## Indexes

### Performance Indexes
- `tenants`: slug, plan_type, plan_status, is_active
- `users`: email, tenant_id, system_role, is_active
- `subscriptions`: tenant_id, plan_id, status, current_period_end
- `invoices`: tenant_id, invoice_number, status, issued_at
- `user_sessions`: user_id, token_hash, expires_at

### Search Indexes
- `support_tickets`: tenant_id, status, priority, created_at
- `audit_logs`: tenant_id, action, entity_type, created_at
- `tenant_usage_daily`: tenant_id, date

## Security Features

### Data Protection
- All passwords stored as bcrypt hashes
- Refresh tokens stored as hashes
- Tenant database passwords encrypted with AES-256
- Audit logging for all sensitive operations

### Access Control
- Role-based access control (RBAC)
- Tenant isolation at database level
- Session management with automatic expiration
- Rate limiting for authentication

### Compliance
- GDPR request tracking (`gdpr_requests`)
- Data retention policies
- Audit trail for all changes
- Secure data deletion capabilities

## Migration Strategy

1. **Initial Setup**: Create all tables with proper constraints
2. **Seed Data**: Insert default plans and super admin user
3. **Indexes**: Create performance indexes
4. **Constraints**: Add foreign key constraints
5. **Triggers**: Set up audit triggers (if needed)

## Maintenance

### Regular Tasks
- Clean up expired sessions
- Archive old audit logs
- Update usage statistics
- Process billing cycles

### Monitoring
- Track database performance
- Monitor storage usage
- Alert on failed payments
- Watch for security issues