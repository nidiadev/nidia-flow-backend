# NIDIA Flow Multi-Tenant Architecture

## Overview

NIDIA Flow implements a **database-per-tenant** multi-tenancy model where each tenant gets their own dedicated PostgreSQL database. This approach provides maximum data isolation, security, and scalability.

## Architecture Components

### 1. SuperAdmin Database
- **Purpose**: Manages all tenants, billing, support, and system operations
- **Location**: Central database shared across all tenants
- **Schema**: `prisma/schema.prisma`
- **Contains**:
  - Tenant metadata and configuration
  - User authentication and sessions
  - Billing and subscription data
  - Support tickets and system logs
  - Usage tracking and analytics

### 2. Tenant Databases
- **Purpose**: Stores each tenant's business data
- **Location**: Dedicated database per tenant
- **Schema**: `prisma/tenant-schema.prisma`
- **Contains**:
  - CRM data (customers, interactions)
  - Product catalog and inventory
  - Orders and payments
  - Tasks and operations
  - Internal users and permissions

## Key Services

### TenantService
**Location**: `src/tenant/tenant.service.ts`

**Responsibilities**:
- Create and manage tenant records
- Provision dedicated databases
- Manage database connections
- Track usage and enforce limits
- Handle tenant lifecycle

**Key Methods**:
```typescript
// Create new tenant with dedicated database
createTenant(tenantData: CreateTenantData): Promise<Tenant>

// Get tenant database connection
getTenantConnection(tenantId: string): Promise<PrismaClient>

// Resolve tenant by slug or domain
getTenantBySlug(slug: string): Promise<Tenant>
getTenantByDomain(domain: string): Promise<Tenant>

// Usage tracking and limits
getTenantUsage(tenantId: string): Promise<UsageStats>
checkUsageLimits(tenantId: string): Promise<LimitsCheck>
```

### TenantProvisioningService
**Location**: `src/tenant/services/tenant-provisioning.service.ts`

**Responsibilities**:
- Create PostgreSQL databases and users
- Run Prisma migrations on tenant databases
- Seed initial data
- Database cleanup and deletion

## Security & Access Control

### TenantGuard
**Location**: `src/tenant/guards/tenant.guard.ts`

**Features**:
- Validates tenant access permissions
- Supports multiple tenant resolution methods
- Role-based access control
- Super admin bypass for system operations

**Access Rules**:
- **Super Admins**: Can access any tenant
- **Support Staff**: Can access any tenant (read-only)
- **Tenant Admins**: Can only access their own tenant
- **Tenant Users**: Inherit tenant admin restrictions

### TenantConnectionMiddleware
**Location**: `src/tenant/middleware/tenant-connection.middleware.ts`

**Features**:
- Automatic tenant resolution from request
- Lazy database connection loading
- Request context enrichment
- Performance optimization

**Tenant Resolution Order**:
1. Subdomain (`tenant.nidiaflow.com`)
2. Custom header (`X-Tenant-Slug`)
3. Route parameters (`/api/tenants/:slug`)
4. Query parameters (`?tenant=slug`)

## Database Provisioning

### Automatic Provisioning Process

1. **Tenant Creation**:
   ```typescript
   const tenant = await tenantService.createTenant({
     name: 'Acme Corp',
     slug: 'acme-corp',
     billingEmail: 'billing@acme.com'
   });
   ```

2. **Database Creation**:
   - Generate unique database name: `tenant_acme_corp_prod`
   - Create PostgreSQL user with restricted permissions
   - Set up connection pooling and security

3. **Schema Migration**:
   - Deploy tenant schema using Prisma Migrate
   - Create indexes and constraints
   - Set up initial data and configurations

4. **Connection Management**:
   - Establish connection pool
   - Cache connection for reuse
   - Monitor connection health

### Database Naming Convention
```
tenant_{slug}_{environment}
```

Examples:
- `tenant_acme_corp_prod`
- `tenant_acme_corp_staging`
- `tenant_acme_corp_dev`

## Usage Tracking & Limits

### Tracked Metrics
- **Users**: Active user count
- **Storage**: Database size in GB
- **Communications**: Monthly emails and WhatsApp messages
- **API Calls**: Monthly API request count

### Limit Enforcement
```typescript
// Check if tenant has exceeded limits
const limits = await tenantService.checkUsageLimits(tenantId);

if (limits.exceeded) {
  // Handle limit exceeded scenarios
  // - Block new users
  // - Restrict API access
  // - Show upgrade prompts
}
```

### Usage Patterns
- **Real-time**: Check limits before operations
- **Daily**: Update usage statistics
- **Monthly**: Reset monthly counters
- **Billing**: Generate usage reports

## Request Flow

### 1. Incoming Request
```
GET https://acme-corp.nidiaflow.com/api/customers
```

### 2. Middleware Processing
```typescript
// TenantConnectionMiddleware
1. Extract tenant identifier: 'acme-corp'
2. Resolve tenant from SuperAdmin DB
3. Validate tenant status (active, not suspended)
4. Set tenant context in request
5. Prepare database connection (lazy)
```

### 3. Guard Validation
```typescript
// TenantGuard
1. Verify user authentication
2. Check tenant access permissions
3. Validate user belongs to tenant
4. Allow/deny request
```

### 4. Controller Execution
```typescript
// CustomerController
1. Access tenant context via decorators
2. Get tenant database connection
3. Execute business logic
4. Return response
```

## Decorators & Utilities

### Tenant Context Decorators
```typescript
// Get current tenant
@Get('info')
async getTenantInfo(@CurrentTenant() tenant: Tenant) {
  return tenant;
}

// Get tenant ID only
@Get('stats')
async getStats(@TenantId() tenantId: string) {
  return this.statsService.getStats(tenantId);
}

// Get tenant database connection
@Post('customers')
async createCustomer(
  @TenantConnection() db: PrismaClient,
  @Body() customerData: CreateCustomerDto
) {
  return db.customer.create({ data: customerData });
}
```

## Performance Optimizations

### Connection Pooling
- **Per-tenant pools**: Each tenant has dedicated connection pool
- **Pool sizing**: Configurable based on tenant plan
- **Connection reuse**: Cached connections for active tenants
- **Cleanup**: Automatic cleanup of inactive connections

### Caching Strategy
- **Tenant metadata**: Cache tenant info for fast resolution
- **Connection objects**: Cache database connections
- **Usage statistics**: Cache frequently accessed metrics
- **TTL management**: Automatic cache invalidation

### Monitoring
- **Connection health**: Monitor database connectivity
- **Performance metrics**: Track query performance per tenant
- **Resource usage**: Monitor CPU, memory, and storage
- **Alerts**: Automated alerts for issues

## Scaling Considerations

### Horizontal Scaling
- **Database sharding**: Distribute tenants across multiple database servers
- **Read replicas**: Use read replicas for reporting and analytics
- **Load balancing**: Distribute tenant connections across servers

### Vertical Scaling
- **Resource allocation**: Adjust resources based on tenant usage
- **Plan-based limits**: Different resource limits per subscription plan
- **Auto-scaling**: Automatic resource adjustment based on demand

## Security Features

### Data Isolation
- **Physical separation**: Each tenant has dedicated database
- **Access control**: Database-level user permissions
- **Network isolation**: VPC and firewall rules
- **Encryption**: Data encryption at rest and in transit

### Audit & Compliance
- **Access logging**: Log all tenant access attempts
- **Data changes**: Track all data modifications
- **GDPR compliance**: Data export and deletion capabilities
- **Backup & recovery**: Tenant-specific backup strategies

## Deployment & Operations

### Environment Management
- **Development**: Local PostgreSQL with Docker
- **Staging**: Shared database server with tenant isolation
- **Production**: Dedicated database servers per region

### Monitoring & Alerting
- **Health checks**: Automated tenant database health monitoring
- **Performance alerts**: Alert on slow queries or high resource usage
- **Capacity planning**: Monitor growth and plan scaling
- **Incident response**: Automated incident detection and response

## Best Practices

### Development
1. Always use tenant context in business logic
2. Test with multiple tenants to ensure isolation
3. Use decorators for clean tenant access
4. Implement proper error handling for tenant operations

### Operations
1. Monitor tenant database sizes and performance
2. Implement automated backup strategies
3. Plan for tenant migration and scaling
4. Maintain security patches and updates

### Security
1. Validate tenant access on every request
2. Use least-privilege database permissions
3. Implement rate limiting per tenant
4. Regular security audits and penetration testing