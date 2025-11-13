# Products API Controllers

This directory contains the complete API controllers for the Products and Catalog module of NIDIA Flow system.

## Controllers Overview

### 1. ProductController (`/products`)
Manages products, services, and combo items with comprehensive CRUD operations.

**Key Features:**
- Support for three product types: `product`, `service`, `combo`
- Advanced search and filtering capabilities
- Price calculation with taxes, discounts, and variants
- Inventory tracking integration
- Comprehensive Swagger/OpenAPI documentation

**Endpoints:**
- `POST /products` - Create new product
- `GET /products` - List products with filtering
- `GET /products/stats` - Get product statistics
- `GET /products/:id` - Get product details
- `GET /products/:id/price` - Calculate final price
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Soft delete product

### 2. CategoryController (`/categories`)
Manages hierarchical product categories with parent-child relationships.

**Key Features:**
- Hierarchical category structure
- Tree view and flat list views
- Category reordering functionality
- Prevents circular references
- Statistics and analytics

**Endpoints:**
- `POST /categories` - Create new category
- `GET /categories` - List categories with filtering
- `GET /categories/tree` - Get hierarchical tree
- `GET /categories/root` - Get root categories only
- `GET /categories/stats` - Get category statistics
- `GET /categories/:id` - Get category details
- `PATCH /categories/:id` - Update category
- `PATCH /categories/:id/activate` - Activate category
- `POST /categories/reorder` - Reorder categories
- `DELETE /categories/:id` - Soft delete category

### 3. ProductVariantController (`/products/:productId/variants`)
Manages product variants (sizes, colors, etc.) for products.

**Key Features:**
- Nested resource under products
- SKU management for variants
- Price adjustments per variant
- Individual stock tracking
- Two-option system (e.g., Color + Size)

**Endpoints:**
- `POST /products/:productId/variants` - Create variant
- `GET /products/:productId/variants` - List product variants
- `GET /products/:productId/variants/:variantId` - Get variant details
- `PATCH /products/:productId/variants/:variantId` - Update variant
- `DELETE /products/:productId/variants/:variantId` - Soft delete variant

### 4. InventoryController (`/inventory`)
Manages inventory movements, stock levels, and alerts.

**Key Features:**
- Inventory movement tracking (in, out, adjustment)
- Stock level monitoring
- Low stock and out-of-stock alerts
- Inventory valuation calculations
- Movement history and audit trail

**Endpoints:**
- `POST /inventory/movements` - Record inventory movement
- `GET /inventory/movements` - List inventory movements
- `GET /inventory/stock-levels` - Get current stock levels
- `GET /inventory/alerts` - Get stock alerts
- `POST /inventory/alerts/:alertId/resolve` - Resolve stock alert
- `GET /inventory/valuation` - Get inventory valuation

## Advanced Features Implemented

### 1. Search and Filtering
All list endpoints support comprehensive filtering:
- **Products**: Search by name, SKU, barcode, brand; filter by type, category, stock status
- **Categories**: Search by name/description; filter by parent, active status
- **Inventory**: Filter by product, movement type, date range

### 2. Pagination
Consistent pagination across all endpoints:
- `page` parameter (default: 1)
- `limit` parameter (default: 20, max: 100)
- Response includes pagination metadata

### 3. Sorting
Flexible sorting options:
- `sortBy` parameter (field name)
- `sortOrder` parameter (`asc` or `desc`)

### 4. Price Calculations
Advanced pricing system:
- Base price + variant adjustments
- Discount percentage application
- Tax rate calculations
- Combo product pricing (sum of components)

### 5. Stock Management
Comprehensive inventory features:
- Real-time stock tracking
- Low stock alerts (configurable thresholds)
- Movement history with audit trail
- Inventory valuation reports

## Data Validation

All endpoints implement robust validation using:
- **class-validator** decorators for input validation
- **UUID validation** for ID parameters
- **Business logic validation** (e.g., preventing circular category references)
- **Conflict detection** (e.g., duplicate SKUs)

## Error Handling

Consistent error responses:
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Business rule violation (e.g., duplicate SKU)

## Security

All endpoints are protected with:
- **JWT Authentication** (`JwtAuthGuard`)
- **Multi-tenant isolation** (`TenantGuard`)
- **Permission-based access control** (where applicable)

## Swagger Documentation

Complete OpenAPI/Swagger documentation includes:
- Detailed endpoint descriptions
- Request/response schemas
- Example values
- Parameter descriptions
- Error response codes

## Integration with Services

Controllers integrate with existing services:
- `ProductService` - Core product business logic
- `CategoryService` - Category management
- `InventoryService` - Stock management
- `StockAlertService` - Alert management
- `TenantPrismaService` - Multi-tenant database access

## Module Organization

All controllers are organized in the `ProductsModule`:
- Clean separation of concerns
- Proper dependency injection
- Service layer abstraction
- Reusable across the application

## Requirements Fulfilled

This implementation addresses **Requirement 4** from the specification:
- ✅ Product types: product, service, combo
- ✅ Category hierarchy management
- ✅ Product variant support (sizes, colors)
- ✅ Advanced search and filtering
- ✅ Stock management and alerts
- ✅ Complete Swagger/OpenAPI documentation
- ✅ Multi-tenant architecture support
- ✅ Comprehensive CRUD operations

## Next Steps

The controllers are ready for:
1. Integration testing with the existing backend
2. Frontend integration
3. Additional business logic implementation in services
4. Performance optimization for large catalogs
5. Advanced reporting features