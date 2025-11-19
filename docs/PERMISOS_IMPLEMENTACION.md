# Implementación: Sistema de Permisos Granulares y Ownership

## ✅ Lo Implementado

### 1. PermissionResolverService
**Ubicación**: `src/auth/services/permission-resolver.service.ts`

Servicio escalable que resuelve permisos granulares con jerarquía:
- **Formato**: `module:submodule:action` (ej: `crm:customers:read`)
- **Jerarquía**: `crm:read` permite acceso a `crm:customers:read`
- **Escalable**: Funciona automáticamente con nuevos módulos/submódulos

**Métodos principales**:
- `hasPermission()`: Verifica un permiso específico
- `hasAnyPermission()`: Verifica si tiene alguno de los permisos (OR)
- `hasAllPermissions()`: Verifica si tiene todos los permisos (AND)
- `getSubModulePermissions()`: Obtiene permisos de un submódulo específico
- `canViewAllData()`: Verifica si puede ver todos los datos (permiso `view_all`)

### 2. DataScopeService
**Ubicación**: `src/tenant/services/data-scope.service.ts`

Servicio que determina el scope de datos basado en permisos (NO roles):
- **Permiso `view_all`**: Usuario ve todos los datos (sin filtro)
- **Sin `view_all`**: Usuario solo ve datos propios (`assignedTo` o `createdBy`)

**Métodos principales**:
- `getCustomerScope()`: Scope para customers
- `getOrderScope()`: Scope para orders
- `getTaskScope()`: Scope para tasks
- `getCustomScope()`: Scope genérico para cualquier recurso nuevo

**Escalable**: Funciona con cualquier recurso que tenga `assignedTo` o `createdBy`.

### 3. PermissionsGuard Actualizado
**Ubicación**: `src/auth/guards/permissions.guard.ts`

Actualizado para usar `PermissionResolverService`:
- Soporta permisos granulares
- Mantiene backward compatibility con permisos generales
- Admin tiene permiso `*` (todos los permisos)

### 4. UserPermissions Decorator
**Ubicación**: `src/common/decorators/user-permissions.decorator.ts`

Decorator para extraer permisos del usuario en controllers:
```typescript
@Get()
async findMany(
  @UserPermissions() userPermissions: string[],
) {
  // userPermissions contiene todos los permisos del usuario
}
```

### 5. CustomerService Actualizado
**Ubicación**: `src/tenant/services/crm/customer.service.ts`

Actualizado para usar `DataScopeService`:
- `findMany()` ahora recibe `userId` y `userPermissions`
- Aplica filtrado automático basado en permisos
- Usuarios sin `view_all` solo ven sus propios customers

### 6. CustomerController Actualizado
**Ubicación**: `src/tenant/controllers/crm/customer.controller.ts`

Actualizado para:
- Usar permisos granulares: `@RequirePermissions('crm:read', 'crm:customers:read')`
- Pasar `userId` y `userPermissions` al servicio
- Aplicar filtrado automático

## 🎯 Cómo Funciona

### Ejemplo: Vendedor (Sales)

**Permisos del vendedor**:
```typescript
[
  'crm:customers:read',
  'crm:customers:write',
  'crm:customers:export',
  'orders:read',
  'orders:write',
  // NO tiene 'view_all'
]
```

**Comportamiento**:
1. Puede leer customers (`crm:customers:read`)
2. Puede escribir customers (`crm:customers:write`)
3. **NO puede eliminar** customers (no tiene `crm:customers:delete`)
4. **Solo ve sus propios customers** (no tiene `view_all`)
   - Customers donde `assignedTo = userId` O `createdBy = userId`

### Ejemplo: Administrador (Admin)

**Permisos del admin**:
```typescript
['*', 'view_all', '*:view_all']
```

**Comportamiento**:
1. Tiene todos los permisos (`*`)
2. Puede ver todos los datos (`view_all`)
3. No hay filtrado por ownership
4. Ve todos los customers, orders, tasks, etc.

### Ejemplo: Manager

**Permisos del manager**:
```typescript
[
  'crm:read',
  'crm:write',
  'view_all', // Puede ver todos los datos
  // ...
]
```

**Comportamiento**:
1. Tiene permisos generales de CRM (`crm:read`, `crm:write`)
2. Puede ver todos los datos (`view_all`)
3. Ve customers de todos los vendedores

## 📝 Uso en Nuevos Módulos

### 1. En el Controller

```typescript
@Controller('nuevo-modulo/recursos')
export class NuevoModuloController {
  @Get()
  @RequirePermissions('nuevo-modulo:read', 'nuevo-modulo:recursos:read')
  async findMany(
    @Query() filterDto: FilterDto,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ) {
    return this.service.findMany(filterDto, userId, userPermissions);
  }
}
```

### 2. En el Service

```typescript
@Injectable()
export class NuevoModuloService {
  constructor(
    private readonly dataScope: DataScopeService,
    // ...
  ) {}

  async findMany(
    filterDto: FilterDto,
    userId: string,
    userPermissions: string[],
  ) {
    const userFilters = this.buildWhereClause(filterDto);
    
    // Aplicar scope automático
    const scopeFilter = this.dataScope.getCustomScope(
      userPermissions,
      userId,
      {
        assignedToField: 'assignedTo',
        createdByField: 'createdBy',
      },
      userFilters,
    );

    return prisma.recurso.findMany({
      where: scopeFilter as any,
      // ...
    });
  }
}
```

## 🔒 Seguridad

1. **Validación en backend**: Los permisos se validan en el guard, no en el frontend
2. **Filtrado automático**: Se aplica siempre, incluso si el frontend no lo solicita
3. **Escalable**: Nuevos módulos funcionan automáticamente sin cambios en el código base
4. **Basado en permisos**: No hay hardcoding de roles, todo es configurable

## 🚀 Próximos Pasos

1. ✅ Permisos granulares - **COMPLETADO**
2. ✅ DataScopeService - **COMPLETADO**
3. ✅ CustomerService actualizado - **COMPLETADO**
4. ⏳ Actualizar otros servicios (Orders, Tasks, etc.)
5. ⏳ Crear endpoints de dashboard agregado
6. ⏳ Actualizar frontend para respetar permisos granulares

## 📚 Referencias

- Documento de análisis: `docs/PERMISOS_Y_OWNERSHIP_ANALISIS.md`
- PermissionResolverService: `src/auth/services/permission-resolver.service.ts`
- DataScopeService: `src/tenant/services/data-scope.service.ts`

