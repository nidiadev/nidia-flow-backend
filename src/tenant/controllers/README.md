# Settings and Audit Controllers

This document describes the newly implemented Settings and Audit API controllers for task 4.10.

## Settings Controller (`/settings`)

The Settings Controller provides comprehensive company configuration management with audit logging.

### Endpoints

#### GET `/settings`
- **Description**: Get current company settings
- **Permissions**: `settings:read`
- **Response**: Complete company configuration including masked API keys

#### PUT `/settings`
- **Description**: Update company settings
- **Permissions**: `settings:write`
- **Body**: `UpdateCompanySettingDto`
- **Features**: Automatic audit logging of changes

#### PUT `/settings/api-keys/whatsapp`
- **Description**: Update WhatsApp API configuration
- **Permissions**: `settings:write`, `integrations:manage`
- **Body**: `{ apiKey: string, phoneId?: string }`
- **Features**: API key masking, audit logging

#### PUT `/settings/api-keys/sendgrid`
- **Description**: Update SendGrid API configuration
- **Permissions**: `settings:write`, `integrations:manage`
- **Body**: `{ apiKey: string, fromEmail?: string }`

#### PUT `/settings/api-keys/google-maps`
- **Description**: Update Google Maps API configuration
- **Permissions**: `settings:write`, `integrations:manage`
- **Body**: `{ apiKey: string }`

#### PUT `/settings/modules`
- **Description**: Update enabled modules
- **Permissions**: `settings:write`, `modules:manage`
- **Body**: `{ modules: string[] }`
- **Features**: Module activation/deactivation with audit trail

#### PUT `/settings/business-hours`
- **Description**: Update business hours configuration
- **Permissions**: `settings:write`
- **Body**: Business hours object with day-specific settings

#### GET `/settings/modules/status?module=<name>`
- **Description**: Check if a specific module is enabled
- **Permissions**: `settings:read`
- **Response**: `{ module: string, enabled: boolean }`

#### GET `/settings/business-config`
- **Description**: Get business configuration (timezone, currency, etc.)
- **Permissions**: `settings:read`
- **Response**: Essential business configuration data

## Audit Controller (`/audit`)

The Audit Controller provides comprehensive audit logging and reporting capabilities.

### Endpoints

#### GET `/audit/logs`
- **Description**: Get audit logs with filtering and pagination
- **Permissions**: `audit:read`
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 50, max: 100)
  - `userId` (optional): Filter by user ID
  - `action` (optional): Filter by action type
  - `entityType` (optional): Filter by entity type
  - `entityId` (optional): Filter by entity ID
  - `startDate` (optional): Start date filter (ISO string)
  - `endDate` (optional): End date filter (ISO string)

#### GET `/audit/statistics`
- **Description**: Get audit statistics and analytics
- **Permissions**: `audit:read`
- **Query Parameters**:
  - `days` (optional): Number of days to analyze (default: 30, max: 365)
- **Response**: Statistics including logs by action, entity, user, and recent activity

## Key Features

### Security
- All endpoints require JWT authentication
- Granular permission-based access control
- API key masking for security
- Rate limiting and input validation

### Audit Logging
- Automatic audit trail for all configuration changes
- Detailed change tracking (before/after values)
- User attribution and IP address logging
- Comprehensive action categorization

### Integration Management
- Secure API key storage and management
- Support for WhatsApp Business API, SendGrid, and Google Maps
- Module-based feature activation
- Business configuration management

### Data Export
- CSV export capabilities for audit logs
- Filtered data export with custom date ranges
- Comprehensive audit trail reporting

## DTOs and Validation

### Settings DTOs
- `UpdateCompanySettingDto`: Complete company settings update
- `UpdateWhatsAppApiKeyDto`: WhatsApp API configuration
- `UpdateSendGridApiKeyDto`: SendGrid API configuration
- `UpdateGoogleMapsApiKeyDto`: Google Maps API configuration
- `UpdateEnabledModulesDto`: Module management
- `UpdateBusinessHoursDto`: Business hours configuration

### Audit DTOs
- `AuditLogFilterDto`: Filtering parameters for audit logs
- `AuditLogResponseDto`: Audit log entry response format

## Module Structure

### Settings Module
- `SettingsController`: API endpoints
- `CompanySettingService`: Business logic
- `AuditLogService`: Audit logging integration

### Audit Module
- `AuditController`: API endpoints
- `AuditLogService`: Audit log management and reporting

## Swagger Documentation

All endpoints are fully documented with Swagger/OpenAPI including:
- Request/response schemas
- Parameter descriptions
- Example values
- Error responses
- Authentication requirements

## Usage Examples

### Update Company Settings
```typescript
PUT /settings
{
  "companyName": "Mi Empresa",
  "email": "contact@miempresa.com",
  "timezone": "America/Bogota",
  "currency": "COP"
}
```

### Enable Modules
```typescript
PUT /settings/modules
{
  "modules": ["crm", "orders", "tasks", "accounting", "reports"]
}
```

### Get Audit Logs
```typescript
GET /audit/logs?page=1&limit=50&action=company_settings_updated&startDate=2025-01-01
```

This implementation provides a complete configuration and audit management system that meets the requirements of task 4.10.