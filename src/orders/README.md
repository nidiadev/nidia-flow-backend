# Orders and Payments API

This module provides comprehensive order and payment management functionality for the NIDIA Flow system.

## Features

### Order Management
- ✅ Complete CRUD operations for orders
- ✅ Order status management with validation
- ✅ Automatic task generation based on order type
- ✅ Inventory management integration
- ✅ Multi-item orders with tax and discount calculations
- ✅ GPS location support for service orders
- ✅ Technician assignment and scheduling
- ✅ Bulk operations (assign, status updates)
- ✅ Order duplication
- ✅ Comprehensive statistics and analytics

### Payment Management
- ✅ Payment processing and tracking
- ✅ Multiple payment methods support
- ✅ Partial payments handling
- ✅ Refund management
- ✅ Payment statistics and reporting
- ✅ Integration with order lifecycle

## API Endpoints

### Orders Controller (`/orders`)

#### Basic CRUD Operations
- `POST /orders` - Create a new order
- `GET /orders` - Get all orders with filtering and pagination
- `GET /orders/:id` - Get order by ID with full details
- `PATCH /orders/:id` - Update order
- `DELETE /orders/:id` - Delete order (with validations)

#### Status Management
- `PATCH /orders/:id/status` - Update order status with validation

#### Statistics and Analytics
- `GET /orders/statistics/summary` - Get comprehensive order statistics
- `GET /orders/statistics/by-status` - Get order counts grouped by status
- `GET /orders/statistics/revenue` - Get revenue statistics by time period

#### Bulk Operations
- `PATCH /orders/bulk/assign` - Bulk assign orders to technician
- `PATCH /orders/bulk/status` - Bulk update order status

#### Utility Operations
- `POST /orders/:id/duplicate` - Duplicate an existing order

### Payments Controller (`/payments`)

#### Basic Operations
- `POST /payments` - Create a new payment
- `GET /payments/:id` - Get payment by ID
- `GET /payments/order/:orderId` - Get all payments for an order
- `GET /payments/order/:orderId/summary` - Get payment summary for order

#### Refund Management
- `PATCH /payments/:id/refund` - Process payment refund

#### Statistics and Reports
- `GET /payments/statistics/summary` - Get payment statistics
- `GET /payments/statistics/by-method` - Get payments grouped by method
- `GET /payments/pending-orders` - Get orders with pending payments

## Order Types and Automation

The system supports different order types with automatic task generation:

### Service Orders (`OrderType.SERVICE`)
- Generates: "Realizar servicio técnico" task
- Duration: 120 minutes
- Includes comprehensive checklist for service execution

### Delivery Orders (`OrderType.DELIVERY`)
- Generates: "Entrega de productos" task
- Duration: 60 minutes
- Includes delivery verification checklist

### Installation Orders (`OrderType.INSTALLATION`)
- Generates: Two tasks:
  1. "Preparación para instalación" (30 min)
  2. "Instalación del producto" (180 min)
- Includes preparation and installation checklists

### Rental Orders (`OrderType.RENTAL`)
- Generates: "Entrega de equipo en renta" task
- Duration: 90 minutes
- Includes equipment condition documentation

## Order Status Flow

```
pending → confirmed → in_progress → completed
    ↓         ↓           ↓
cancelled  cancelled  cancelled
```

### Status Validations
- Orders can only transition to valid next states
- Completed and cancelled orders cannot be modified
- Status changes trigger automatic events and notifications

## Payment Integration

### Payment Status Management
- `pending` - No payments received
- `partial` - Some payment received, balance remaining
- `paid` - Full payment received
- `refunded` - Payment has been refunded

### Automatic Calculations
- Order totals calculated from items (quantity × unit price)
- Discount application (percentage and fixed amounts)
- Tax calculations per item and order level
- Payment balance tracking

## Event System

The module emits business events for integration with other systems:

### Order Events
- `order.created` - Triggers automatic task generation
- `order.status.changed` - Updates related tasks and notifications
- `order.assigned` - Notifies assigned technician

### Payment Events
- `payment.created` - Updates order payment status
- `payment.refunded` - Adjusts order balance

## Filtering and Search

### Order Filters
- Status filtering
- Customer filtering
- Assigned technician filtering
- Date range filtering
- Pagination support

### Payment Filters
- Date range filtering
- Payment method filtering
- Status filtering

## Statistics and Analytics

### Order Statistics
- Total orders and revenue
- Average order value
- Completion rates
- Status distribution
- Revenue trends by time period

### Payment Statistics
- Payment success rates
- Payment method distribution
- Refund tracking
- Pending payment monitoring

## Security and Validation

### Authentication
- All endpoints require JWT authentication
- Tenant isolation enforced
- Role-based access control

### Data Validation
- Comprehensive DTO validation
- Business rule enforcement
- Status transition validation
- Inventory availability checks

## Integration Points

### Inventory Management
- Automatic stock updates on order creation/modification
- Stock availability validation
- Inventory movement tracking

### Task Management
- Automatic task generation based on order type
- Task assignment to technicians
- Location and scheduling integration

### Customer Management
- Customer validation and linking
- Interaction history tracking
- Customer communication triggers

## Error Handling

The API provides comprehensive error handling with appropriate HTTP status codes:

- `400 Bad Request` - Validation errors, invalid transitions
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - System errors

All errors include descriptive messages and validation details where applicable.