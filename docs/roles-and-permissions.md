# NIDIA Flow - Sistema de Roles y Permisos

## Descripción General

NIDIA Flow implementa un sistema completo de control de acceso basado en roles (RBAC) y permisos granulares que proporciona seguridad y flexibilidad para gestionar el acceso a diferentes funcionalidades del sistema.

## Arquitectura del Sistema

### Tipos de Roles

#### 1. Roles del Sistema (System Roles)
Roles para el personal de NIDIA y administración del sistema:

- **Super Admin** (`super_admin`): Acceso completo al sistema NIDIA Flow
- **Soporte NIDIA** (`support`): Acceso de soporte para ayudar a los tenants
- **Admin de Facturación** (`billing_admin`): Gestión de facturación y pagos
- **Admin de Tenant** (`tenant_admin`): Administrador principal de la empresa

#### 2. Roles de Tenant (Tenant Roles)
Roles internos para usuarios dentro de cada empresa:

- **Administrador** (`admin`): Acceso completo dentro del tenant
- **Gerente** (`manager`): Gestión y reportes
- **Ventas** (`sales`): CRM y gestión de órdenes
- **Operador** (`operator`): Tareas y operaciones de campo
- **Contador** (`accountant`): Finanzas y reportes contables
- **Visualizador** (`viewer`): Solo lectura

### Jerarquía de Roles

```
Super Admin (1000)
├── Support (900)
├── Billing Admin (800)
└── Tenant Admin (700)
    └── Admin (600)
        └── Manager (500)
            ├── Sales (400)
            ├── Operator (300)
            ├── Accountant (200)
            └── Viewer (100)
```

## Sistema de Permisos

### Categorías de Permisos

#### Sistema
- `system:admin` - Administración del sistema
- `system:support` - Funciones de soporte
- `system:billing` - Gestión de facturación

#### Gestión de Tenants
- `tenant:create` - Crear tenants
- `tenant:read` - Ver información de tenants
- `tenant:update` - Actualizar tenants
- `tenant:delete` - Eliminar tenants
- `tenant:suspend` - Suspender tenants

#### Gestión de Usuarios
- `user:create` - Crear usuarios
- `user:read` - Ver usuarios
- `user:update` - Actualizar usuarios
- `user:delete` - Eliminar usuarios
- `user:assign_roles` - Asignar roles

#### CRM (Clientes)
- `customer:create` - Crear clientes
- `customer:read` - Ver clientes
- `customer:update` - Actualizar clientes
- `customer:delete` - Eliminar clientes
- `customer:assign` - Asignar clientes
- `customer:export` - Exportar datos de clientes

#### Productos
- `product:create` - Crear productos
- `product:read` - Ver productos
- `product:update` - Actualizar productos
- `product:delete` - Eliminar productos
- `product:manage_inventory` - Gestionar inventario

#### Órdenes
- `order:create` - Crear órdenes
- `order:read` - Ver órdenes
- `order:update` - Actualizar órdenes
- `order:delete` - Eliminar órdenes
- `order:approve` - Aprobar órdenes
- `order:cancel` - Cancelar órdenes

#### Tareas
- `task:create` - Crear tareas
- `task:read` - Ver tareas
- `task:update` - Actualizar tareas
- `task:delete` - Eliminar tareas
- `task:assign` - Asignar tareas
- `task:complete` - Completar tareas

#### Pagos
- `payment:create` - Registrar pagos
- `payment:read` - Ver pagos
- `payment:update` - Actualizar pagos
- `payment:delete` - Eliminar pagos
- `payment:approve` - Aprobar pagos

#### Contabilidad
- `accounting:read` - Ver información contable
- `accounting:create` - Crear registros contables
- `accounting:update` - Actualizar contabilidad
- `accounting:reports` - Generar reportes contables

#### Reportes y Analítica
- `reports:view` - Ver reportes
- `reports:create` - Crear reportes
- `reports:export` - Exportar reportes
- `analytics:view` - Ver analítica

#### Configuración
- `settings:read` - Ver configuración
- `settings:update` - Actualizar configuración
- `settings:integrations` - Gestionar integraciones

#### Comunicación
- `communication:send` - Enviar comunicaciones
- `communication:templates` - Gestionar plantillas
- `communication:history` - Ver historial

## Implementación

### Guards (Guardias)

#### PermissionsGuard
Valida permisos granulares en endpoints:

```typescript
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions([Permission.CUSTOMER_CREATE])
async createCustomer() {
  // Lógica del endpoint
}
```

#### RolesGuard
Valida roles y jerarquía:

```typescript
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ManagerOrHigher()
async managerEndpoint() {
  // Solo gerentes y superiores
}
```

### Decoradores

#### Decoradores de Permisos

```typescript
// Requiere permisos específicos
@RequirePermissions([Permission.CUSTOMER_READ, Permission.CUSTOMER_UPDATE])

// Requiere CUALQUIER permiso de la lista
@RequireAnyPermission(Permission.CUSTOMER_READ, Permission.ORDER_READ)

// Requiere TODOS los permisos de la lista
@RequireAllPermissions(Permission.CUSTOMER_READ, Permission.CUSTOMER_UPDATE)

// Acceso de solo lectura
@RequireReadAccess('customer') // Equivale a customer:read

// Acceso de escritura
@RequireWriteAccess('customer') // Equivale a customer:read + customer:update

// Acceso de creación
@RequireCreateAccess('customer') // Equivale a customer:create

// Acceso de eliminación
@RequireDeleteAccess('customer') // Equivale a customer:delete
```

#### Decoradores de Roles

```typescript
// Solo super administradores
@SuperAdminOnly()

// Personal de soporte
@SupportOnly()

// Administradores de facturación
@BillingAdminOnly()

// Administradores de tenant o superior
@TenantAdminOrHigher()

// Gerentes o superior
@ManagerOrHigher()

// Equipo de ventas
@SalesTeam()

// Equipo de operaciones
@OperationsTeam()

// Equipo de contabilidad
@AccountingTeam()
```

### Servicio de Permisos

```typescript
@Injectable()
export class MyService {
  constructor(private permissionsService: PermissionsService) {}

  async checkUserAccess(userRole: string) {
    const userPermissions = this.permissionsService.getUserPermissions(userRole);
    
    // Verificar permiso específico
    if (userPermissions.canAccess(Permission.CUSTOMER_CREATE)) {
      // Usuario puede crear clientes
    }
    
    // Verificar múltiples permisos (ANY)
    if (userPermissions.canAccessAny([Permission.REPORTS_VIEW, Permission.ANALYTICS_VIEW])) {
      // Usuario puede ver reportes O analítica
    }
    
    // Verificar múltiples permisos (ALL)
    if (userPermissions.canAccessAll([Permission.CUSTOMER_READ, Permission.CUSTOMER_UPDATE])) {
      // Usuario puede leer Y actualizar clientes
    }
  }
}
```

## Ejemplos de Uso

### Controlador con Permisos Granulares

```typescript
@Controller('customers')
@UseGuards(AuthGuard('jwt'), TenantGuard, PermissionsGuard)
export class CustomersController {
  
  @Get()
  @RequireReadAccess('customer')
  async listCustomers() {
    // Solo usuarios con customer:read
  }

  @Post()
  @RequireCreateAccess('customer')
  @SalesTeam()
  async createCustomer() {
    // Requiere customer:create Y rol de ventas o superior
  }

  @Delete(':id')
  @RequireDeleteAccess('customer')
  @ManagerOrHigher()
  async deleteCustomer() {
    // Requiere customer:delete Y rol de gerente o superior
  }

  @Post(':id/assign')
  @RequireAnyPermission(Permission.CUSTOMER_ASSIGN, Permission.CUSTOMER_UPDATE)
  @ManagerOrHigher()
  async assignCustomer() {
    // Requiere customer:assign O customer:update Y rol de gerente o superior
  }
}
```

### Verificación Programática

```typescript
async checkPermissions(user: any) {
  const userRole = user.systemRole || user.tenantRole;
  const permissions = this.permissionsService.getUserPermissions(userRole);
  
  // Verificaciones individuales
  const canCreateCustomers = permissions.canAccess(Permission.CUSTOMER_CREATE);
  const canViewReports = permissions.canAccess(Permission.REPORTS_VIEW);
  
  // Verificaciones complejas
  const canManageCustomers = permissions.canAccessAll([
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_ASSIGN,
  ]);
  
  return {
    canCreateCustomers,
    canViewReports,
    canManageCustomers,
  };
}
```

## Configuración por Rol

### Super Admin
- **Permisos**: Todos los permisos del sistema
- **Acceso**: Completo a todos los tenants y funcionalidades
- **Restricciones**: Ninguna

### Tenant Admin
- **Permisos**: Todos los permisos del tenant (excepto sistema)
- **Acceso**: Completo dentro de su tenant
- **Restricciones**: No puede acceder a otros tenants

### Manager
- **Permisos**: Gestión de usuarios, clientes, productos, órdenes, tareas, reportes
- **Acceso**: Amplio dentro del tenant
- **Restricciones**: No puede gestionar configuración del sistema

### Sales
- **Permisos**: CRM, órdenes, comunicación, reportes básicos
- **Acceso**: Enfocado en ventas y clientes
- **Restricciones**: No puede gestionar usuarios o configuración

### Operator
- **Permisos**: Tareas, inventario, órdenes (lectura), comunicación básica
- **Acceso**: Operaciones de campo
- **Restricciones**: Acceso limitado a gestión

### Accountant
- **Permisos**: Pagos, contabilidad, reportes financieros
- **Acceso**: Información financiera y contable
- **Restricciones**: No puede gestionar operaciones

### Viewer
- **Permisos**: Solo lectura en la mayoría de módulos
- **Acceso**: Visualización de información
- **Restricciones**: No puede crear, actualizar o eliminar

## Mejores Prácticas

### 1. Principio de Menor Privilegio
- Asignar solo los permisos mínimos necesarios
- Usar roles específicos en lugar de roles amplios cuando sea posible

### 2. Combinación de Guards
```typescript
@UseGuards(AuthGuard('jwt'), TenantGuard, PermissionsGuard)
```
- Siempre usar autenticación primero
- Validar tenant antes que permisos
- Aplicar permisos granulares al final

### 3. Decoradores Específicos
```typescript
// Preferir esto:
@RequireCreateAccess('customer')

// En lugar de esto:
@RequirePermissions([Permission.CUSTOMER_CREATE])
```

### 4. Validación en Servicios
```typescript
// Validar permisos también en la lógica de negocio
async createCustomer(userRole: string, customerData: any) {
  const permissions = this.permissionsService.getUserPermissions(userRole);
  
  if (!permissions.canAccess(Permission.CUSTOMER_CREATE)) {
    throw new ForbiddenException('Insufficient permissions');
  }
  
  // Lógica de creación
}
```

### 5. Manejo de Errores
```typescript
// Los guards lanzan ForbiddenException automáticamente
// Manejar en filtros de excepción globales
```

## Extensibilidad

### Agregar Nuevos Permisos
1. Definir en `permissions.enum.ts`
2. Asignar a roles en `ROLE_PERMISSIONS`
3. Usar en decoradores y guards

### Agregar Nuevos Roles
1. Definir en `roles.enum.ts`
2. Agregar jerarquía en `ROLE_HIERARCHY`
3. Definir permisos en `ROLE_PERMISSIONS`
4. Actualizar `PermissionsService`

### Personalización por Tenant
El sistema permite personalización futura de permisos por tenant manteniendo la estructura base de roles y permisos.