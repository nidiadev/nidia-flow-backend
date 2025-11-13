# Users and Roles API

This module provides comprehensive user and role management for NIDIA Flow tenants.

## Features

### User Management
- **CRUD Operations**: Create, read, update, and delete users within a tenant
- **Profile Management**: Users can update their own profiles and passwords
- **User Invitations**: Invite new users with temporary passwords
- **Role Assignment**: Assign roles and specific permissions to users
- **Search and Filtering**: Search users by name, email, or employee ID
- **Pagination**: Efficient pagination for large user lists

### Role Management
- **System Roles**: Predefined roles (admin, manager, sales, operator, accountant, viewer)
- **Custom Roles**: Create custom roles with specific permission combinations
- **Permission System**: Granular permissions for different modules
- **Role Protection**: System roles cannot be modified or deleted

## API Endpoints

### Users

#### `POST /users`
Create a new user within the tenant.
- **Permission**: `users:write`
- **Body**: `CreateUserDto`

#### `GET /users`
Get all users with pagination and filtering.
- **Permission**: `users:read`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search by name, email, or employee ID
  - `role`: Filter by role
  - `isActive`: Filter by active status

#### `GET /users/profile`
Get current user's profile.
- **Permission**: Authenticated user only

#### `PATCH /users/profile`
Update current user's profile (limited fields).
- **Permission**: Authenticated user only

#### `PATCH /users/profile/password`
Update current user's password.
- **Permission**: Authenticated user only
- **Body**: `UpdatePasswordDto`

#### `POST /users/invite`
Invite a new user with temporary password.
- **Permission**: `users:invite`
- **Body**: `InviteUserDto`

#### `GET /users/:id`
Get user by ID.
- **Permission**: `users:read`

#### `PATCH /users/:id`
Update user (admin only).
- **Permission**: `users:write`
- **Body**: `UpdateUserDto`

#### `DELETE /users/:id`
Delete or deactivate user.
- **Permission**: `users:delete`
- **Note**: Users with related data will be deactivated instead of deleted

### Roles

#### `POST /roles`
Create a custom role.
- **Permission**: `users:manage_roles`
- **Body**: `CreateRoleDto`

#### `GET /roles`
Get all roles (system and custom).
- **Permission**: `users:read`

#### `GET /roles/permissions`
Get all available permissions grouped by module.
- **Permission**: `users:read`

#### `GET /roles/:id`
Get role by ID.
- **Permission**: `users:read`

#### `PATCH /roles/:id`
Update custom role (system roles cannot be modified).
- **Permission**: `users:manage_roles`
- **Body**: `UpdateRoleDto`

#### `DELETE /roles/:id`
Delete custom role (system roles cannot be deleted).
- **Permission**: `users:manage_roles`
- **Note**: Cannot delete roles assigned to users

#### `POST /roles/system/create`
Create default system roles for tenant.
- **Permission**: `users:manage_roles`
- **Note**: Typically called during tenant setup

## Permission System

### Available Permissions

#### CRM Module
- `crm:read` - View customers and leads
- `crm:write` - Create and edit customers
- `crm:delete` - Delete customers
- `crm:export` - Export customer data
- `crm:assign` - Assign customers to users

#### Orders Module
- `orders:read` - View orders
- `orders:write` - Create and edit orders
- `orders:delete` - Delete orders
- `orders:assign` - Assign orders to users
- `orders:approve` - Approve orders

#### Tasks Module
- `tasks:read` - View tasks
- `tasks:write` - Create and edit tasks
- `tasks:delete` - Delete tasks
- `tasks:assign` - Assign tasks to users
- `tasks:complete` - Mark tasks as complete

#### Products Module
- `products:read` - View products
- `products:write` - Create and edit products
- `products:delete` - Delete products
- `products:manage_inventory` - Manage inventory

#### Accounting Module
- `accounting:read` - View financial data
- `accounting:write` - Create and edit transactions
- `accounting:delete` - Delete transactions
- `accounting:reports` - Generate financial reports

#### Reports Module
- `reports:read` - View reports
- `reports:create` - Create custom reports
- `reports:schedule` - Schedule automated reports
- `reports:export` - Export reports

#### Users Module
- `users:read` - View users
- `users:write` - Create and edit users
- `users:delete` - Delete users
- `users:invite` - Invite new users
- `users:manage_roles` - Manage roles and permissions

#### Settings Module
- `settings:read` - View settings
- `settings:write` - Modify settings
- `settings:integrations` - Manage integrations

### System Roles

#### Admin
- Full access to all modules and permissions
- Can manage users and roles
- Can access all system settings

#### Manager
- Management-level access to most modules
- Can manage team members
- Cannot delete critical data

#### Sales
- Access to CRM, orders, and basic tasks
- Can manage their own customers and orders
- Read-only access to products and reports

#### Operator
- Field operations access
- Can view and complete assigned tasks
- Limited access to customer and order data

#### Accountant
- Financial data access
- Can manage transactions and generate reports
- Read-only access to other modules

#### Viewer
- Read-only access to most modules
- Cannot create, edit, or delete data
- Suitable for stakeholders and observers

## Security Features

- **Multi-tenant Isolation**: All operations are scoped to the current tenant
- **Permission-based Access**: Granular permissions for fine-grained control
- **Role Hierarchy**: Admin role bypasses most permission checks
- **Password Security**: Bcrypt hashing with 10 rounds
- **Input Validation**: Comprehensive validation using class-validator
- **Audit Trail**: All user actions are logged for security

## Usage Examples

### Creating a User
```typescript
const newUser = {
  email: 'john.doe@company.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe',
  role: 'sales',
  department: 'Sales',
  position: 'Sales Representative'
};
```

### Creating a Custom Role
```typescript
const customRole = {
  name: 'Project Manager',
  description: 'Custom role for project managers',
  permissions: [
    'crm:read',
    'crm:write',
    'orders:read',
    'orders:write',
    'tasks:read',
    'tasks:write',
    'tasks:assign',
    'reports:read'
  ]
};
```

### Inviting a User
```typescript
const invitation = {
  email: 'newuser@company.com',
  firstName: 'Jane',
  lastName: 'Smith',
  role: 'operator',
  department: 'Operations',
  message: 'Welcome to our team!'
};
```