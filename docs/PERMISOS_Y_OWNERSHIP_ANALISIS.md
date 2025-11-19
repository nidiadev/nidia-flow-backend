# Análisis: Permisos Granulares y Ownership Multi-Tenant

## 📋 Resumen Ejecutivo

Necesitamos implementar:
1. **Permisos granulares por submódulo**: Un usuario puede tener `crm:customers:read` y `crm:customers:write` pero NO `crm:customers:delete`
2. **Ownership a nivel de usuario**: Vendedores ven solo sus leads/órdenes, admins ven todo
3. **Dashboard agregado**: Gráficas con datos de todos los vendedores para administradores

## ✅ Lo que YA existe

### Backend
- ✅ Sistema de permisos básico (`crm:read`, `crm:write`, `crm:delete`)
- ✅ `PermissionsGuard` con roles predefinidos (admin, manager, sales, etc.)
- ✅ Ownership en modelos:
  - `Customer.assignedTo` - Asignado a usuario
  - `Customer.createdBy` - Creado por usuario
  - `Order.assignedTo` - Asignado a usuario
  - `Order.createdBy` - Creado por usuario
  - `Task.assignedTo` - Asignado a usuario
- ✅ Endpoints de asignación (`PATCH /crm/customers/:id/assign`)

### Frontend
- ✅ Sistema de roles y permisos básico
- ✅ Tablas con DataTable
- ✅ Filtros por usuario asignado

## ❌ Lo que FALTA

### 1. Permisos Granulares por Submódulo

**Problema actual:**
- Permisos son genéricos: `crm:read`, `crm:write`, `crm:delete`
- No hay granularidad: si tienes `crm:write`, puedes escribir en TODO el módulo CRM

**Solución propuesta:**
- Permisos granulares: `crm:customers:read`, `crm:customers:write`, `crm:customers:delete`
- Permisos por submódulo: `crm:interactions:read`, `crm:contacts:read`, etc.
- Backward compatibility: `crm:read` sigue funcionando como permiso general

**Estructura de permisos:**
```
crm:
  - crm:read (general - acceso a todo CRM)
  - crm:write (general - escribir en todo CRM)
  - crm:delete (general - eliminar en todo CRM)
  - crm:customers:read
  - crm:customers:write
  - crm:customers:delete
  - crm:interactions:read
  - crm:interactions:write
  - crm:contacts:read
  - crm:contacts:write
```

### 2. Filtrado Automático por Ownership

**Problema actual:**
- Los servicios no filtran automáticamente por ownership
- Un vendedor puede ver todos los customers si tiene `crm:read`
- No hay distinción entre "mis datos" y "todos los datos"

**Solución propuesta:**
- Crear `DataScopeService` que determine el scope según el rol:
  - `sales`: Solo datos donde `assignedTo = userId` o `createdBy = userId`
  - `manager`: Datos de su equipo (usuarios bajo su supervisión)
  - `admin`: Todos los datos (sin filtro)
- Interceptor o decorador que aplique el filtro automáticamente
- Endpoints especiales para admin: `/crm/customers/all` (sin filtro)

### 3. Dashboard con Agregaciones por Vendedor

**Problema actual:**
- Dashboard solo muestra métricas generales
- No hay desglose por vendedor
- No hay comparativas entre vendedores

**Solución propuesta:**
- Endpoints de dashboard con agregaciones:
  - `GET /dashboard/sales/by-user` - Métricas por vendedor
  - `GET /dashboard/customers/by-user` - Customers por vendedor
  - `GET /dashboard/orders/by-user` - Órdenes por vendedor
  - `GET /dashboard/revenue/by-user` - Revenue por vendedor
- Gráficas comparativas en frontend

## 🔧 Plan de Implementación

### Fase 1: Permisos Granulares

1. **Extender `PermissionsGuard`**
   - Soporte para permisos granulares (`module:submodule:action`)
   - Backward compatibility con permisos generales
   - Validación jerárquica: `crm:read` permite `crm:customers:read`

2. **Actualizar `PermissionsService`**
   - Método `hasPermission(permission: string, context?: { module?, submodule? })`
   - Validación jerárquica de permisos

3. **Actualizar decoradores**
   - `@RequirePermissions('crm:customers:read', 'crm:customers:write')`
   - Soporte para múltiples permisos con OR logic

4. **Actualizar roles predefinidos**
   - Roles con permisos granulares específicos
   - Ejemplo: `sales` tiene `crm:customers:read`, `crm:customers:write` pero NO `crm:customers:delete`

### Fase 2: DataScopeService

1. **Crear `DataScopeService`**
   ```typescript
   class DataScopeService {
     getScope(user: User, resource: 'customers' | 'orders' | 'tasks'): PrismaWhereInput {
       if (user.role === 'admin') return {}; // Sin filtro
       if (user.role === 'sales') {
         return { OR: [{ assignedTo: user.id }, { createdBy: user.id }] };
       }
       // ... otros roles
     }
   }
   ```

2. **Crear decorador `@DataScope`**
   - Aplica automáticamente el filtro de scope
   - Usa `DataScopeService` para determinar el filtro

3. **Actualizar servicios**
   - `CustomerService.findMany()` usa `DataScopeService`
   - `OrderService.findMany()` usa `DataScopeService`
   - Mantener endpoints especiales para admin

### Fase 3: Dashboard Agregado

1. **Crear `DashboardService`**
   - Métodos para agregaciones por usuario
   - Métodos para comparativas entre usuarios

2. **Endpoints de dashboard**
   - `GET /dashboard/sales/by-user`
   - `GET /dashboard/customers/by-user`
   - `GET /dashboard/orders/by-user`
   - `GET /dashboard/revenue/by-user`

3. **Frontend**
   - Componentes de gráficas por vendedor
   - Tablas comparativas
   - Filtros por vendedor en dashboard

### Fase 4: Frontend

1. **Actualizar componentes de tabla**
   - Ocultar acciones según permisos granulares
   - Mostrar badge de "Solo lectura" si no tiene write
   - Deshabilitar botón de eliminar si no tiene delete

2. **Actualizar hooks de permisos**
   - `useHasPermission('crm:customers:delete')`
   - `useCanWrite('crm:customers')`

3. **Dashboard de admin**
   - Gráficas agregadas
   - Selector de vendedor para filtrar
   - Comparativas entre vendedores

## 📊 Estructura de Datos

### Permisos en User/Role

```typescript
interface User {
  role: string; // 'admin', 'manager', 'sales', etc.
  permissions: string[]; // ['crm:customers:read', 'crm:customers:write']
}
```

### Scope de Datos

```typescript
interface DataScope {
  customers: PrismaWhereInput;
  orders: PrismaWhereInput;
  tasks: PrismaWhereInput;
}
```

## 🎯 Prioridades

1. **Alta**: Permisos granulares (bloquea funcionalidad crítica)
2. **Alta**: Filtrado automático por ownership (seguridad de datos)
3. **Media**: Dashboard agregado (mejora UX para admin)
4. **Baja**: Comparativas entre vendedores (nice to have)

## 🔒 Consideraciones de Seguridad

1. **Validación en backend**: NUNCA confiar en el frontend para permisos
2. **Filtrado automático**: Aplicar siempre, incluso si el frontend no lo solicita
3. **Auditoría**: Loggear todos los accesos a datos sensibles
4. **Rate limiting**: Limitar queries de agregación (pueden ser costosas)

## 📝 Notas de Implementación

- Mantener backward compatibility con permisos generales
- Los permisos granulares son más restrictivos que los generales
- Un usuario con `crm:read` puede acceder a todo CRM
- Un usuario con solo `crm:customers:read` solo puede leer customers
- Admin siempre tiene acceso completo (bypass de permisos)

