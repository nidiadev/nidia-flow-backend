# CRM API Controllers

This directory contains the complete CRM API implementation for NIDIA Flow System.

## Implemented Controllers

### 1. CustomerController (`/customers`)

**Endpoints:**
- `POST /customers` - Create a new customer (lead, prospect, or active)
- `GET /customers` - Get customers with filtering and pagination
- `GET /customers/search?q={query}` - Quick search customers by text
- `GET /customers/statistics` - Get customer statistics and metrics
- `GET /customers/:id` - Get customer by ID with full details
- `PUT /customers/:id` - Update customer information
- `DELETE /customers/:id` - Soft delete customer
- `PATCH /customers/:id/assign` - Assign customer to user
- `PATCH /customers/:id/convert` - Convert lead to customer
- `PATCH /customers/:id/lead-score` - Update lead score (0-100)

**Features:**
- Complete CRUD operations
- Advanced filtering (type, status, lead source, assigned user, location, etc.)
- Search by name, email, phone, company
- Lead scoring and conversion tracking
- Customer assignment and reassignment
- Comprehensive statistics and analytics
- Full Swagger/OpenAPI documentation

### 2. InteractionController (`/interactions`)

**Endpoints:**
- `POST /interactions` - Create a new interaction
- `POST /interactions/schedule` - Schedule a future interaction
- `GET /interactions` - Get interactions with filtering and pagination
- `GET /interactions/customer/:customerId` - Get customer timeline
- `GET /interactions/upcoming` - Get upcoming scheduled interactions
- `GET /interactions/:id` - Get interaction by ID
- `PUT /interactions/:id` - Update interaction
- `PUT /interactions/:id/complete` - Complete a scheduled interaction

**Features:**
- Support for all interaction types (call, email, WhatsApp, meeting, note, task)
- Interaction scheduling and completion tracking
- Customer timeline view
- Outcome tracking and next actions
- Integration with orders and tasks
- Real-time updates for scheduled interactions

### 3. CustomerContactController (`/customers/:customerId/contacts`)

**Endpoints:**
- `POST /customers/:customerId/contacts` - Add contact to customer
- `GET /customers/:customerId/contacts` - Get customer contacts
- `GET /customers/:customerId/contacts/:contactId` - Get contact by ID
- `PUT /customers/:customerId/contacts/:contactId` - Update contact
- `DELETE /customers/:customerId/contacts/:contactId` - Delete contact
- `PUT /customers/:customerId/contacts/:contactId/set-primary` - Set primary contact

**Features:**
- Multiple contacts per customer
- Primary contact designation
- Contact roles and departments
- Soft delete functionality
- Contact search and filtering

## Key Features Implemented

### 1. Lead Management & Conversion
- Lead scoring (0-100) with automatic calculation
- Lead source tracking
- Lead to prospect/customer conversion
- Conversion rate analytics

### 2. Customer Pipeline
- Customer types: lead, prospect, active, inactive, churned
- Status management and tracking
- Assignment to sales representatives
- Customer lifecycle analytics

### 3. Interaction Tracking
- Complete interaction history
- Multiple interaction types
- Outcome tracking and next actions
- Scheduled interactions with reminders
- Customer timeline view

### 4. Search & Filtering
- Advanced filtering by multiple criteria
- Full-text search across customer data
- Geographic filtering (city, state)
- Industry and segment filtering
- Date range filtering

### 5. Analytics & Reporting
- Customer statistics by type, status, source
- Conversion rate tracking
- Lead score analytics
- User performance metrics

### 6. Integration Ready
- Event-driven architecture for automation
- WebSocket support for real-time updates
- Audit logging for all actions
- Business event emission for workflows

## Authentication & Permissions

All endpoints require:
- JWT authentication (`@UseGuards(JwtAuthGuard)`)
- Tenant isolation (`@UseGuards(TenantGuard)`)
- Permission-based access control (`@UseGuards(PermissionsGuard)`)

**Required Permissions:**
- `crm:read` - View customers and interactions
- `crm:write` - Create and update customers and interactions
- `crm:delete` - Delete customers and contacts

## API Documentation

All endpoints are fully documented with Swagger/OpenAPI including:
- Request/response schemas
- Parameter descriptions
- Example values
- Error responses
- Authentication requirements

Access the interactive API documentation at `/docs` when the server is running.

## Usage Examples

### Create a Lead
```bash
POST /customers
{
  "type": "lead",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+57 300 123 4567",
  "companyName": "Acme Corp",
  "leadSource": "website",
  "industry": "Technology"
}
```

### Search Customers
```bash
GET /customers/search?q=john&limit=10
```

### Convert Lead
```bash
PATCH /customers/{id}/convert
{
  "targetType": "prospect",
  "notes": "Showed interest in our premium package"
}
```

### Create Interaction
```bash
POST /interactions
{
  "customerId": "uuid",
  "type": "call",
  "direction": "outbound",
  "subject": "Follow-up call",
  "content": "Discussed pricing and implementation timeline",
  "outcome": "interested",
  "nextAction": "Send proposal",
  "nextActionDate": "2024-12-30T09:00:00.000Z"
}
```

This implementation provides a complete, production-ready CRM API that supports the full customer lifecycle from lead capture to customer management.