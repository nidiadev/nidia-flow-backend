# Dashboard Agregado por Usuario - Especificación

## 🎯 Objetivo

Crear endpoints de dashboard que permitan:
1. **Vendedores**: Ver solo sus propios datos agregados (leads, órdenes, ventas)
2. **Admins/Managers**: Ver datos agregados de TODOS los usuarios Y poder filtrar por usuario específico

## 📊 Endpoints a Crear/Actualizar

### 1. Dashboard General (Actualizar existente)
**Endpoint**: `GET /dashboard/metrics`

**Comportamiento**:
- **Con `view_all`**: Muestra métricas de TODOS los usuarios
- **Sin `view_all`**: Muestra métricas solo del usuario actual

**Métricas incluidas**:
- Total de customers/leads
- Total de órdenes
- Total de ventas (revenue)
- Órdenes por estado
- Top productos vendidos
- Conversión de leads a customers

### 2. Dashboard por Usuario Específico (NUEVO)
**Endpoint**: `GET /dashboard/users/:userId/metrics`

**Permisos requeridos**: `view_all` (solo admins/managers)

**Métricas del usuario específico**:
- Customers/leads asignados
- Órdenes creadas/asignadas
- Ventas totales
- Conversión rate
- Promedio de ticket
- Actividad reciente

### 3. Customers por Usuario (NUEVO)
**Endpoint**: `GET /dashboard/users/:userId/customers`

**Permisos requeridos**: `view_all` (solo admins/managers)

**Datos**:
- Lista de customers asignados al usuario
- Estadísticas: total, por tipo, por status
- Gráfica de conversión de leads

### 4. Órdenes por Usuario (NUEVO)
**Endpoint**: `GET /dashboard/users/:userId/orders`

**Permisos requeridos**: `view_all` (solo admins/managers)

**Datos**:
- Lista de órdenes del usuario
- Estadísticas: total, por estado, revenue
- Gráfica de órdenes en el tiempo

### 5. Ventas por Usuario (NUEVO)
**Endpoint**: `GET /dashboard/users/:userId/sales`

**Permisos requeridos**: `view_all` (solo admins/managers)

**Datos**:
- Revenue total
- Revenue por período (día, semana, mes)
- Comparativa con períodos anteriores
- Top productos vendidos por el usuario

### 6. Comparativa de Usuarios (NUEVO)
**Endpoint**: `GET /dashboard/users/comparison`

**Permisos requeridos**: `view_all` (solo admins/managers)

**Datos**:
- Lista de usuarios (vendedores) con métricas agregadas
- Ranking de ventas
- Comparativa de performance
- Gráfica comparativa

## 🔒 Lógica de Permisos

### Usuario con `view_all` (Admin/Manager)
```typescript
// Puede ver todo
GET /dashboard/metrics → Todos los datos
GET /dashboard/users/:userId/metrics → Datos del usuario específico
GET /dashboard/users/comparison → Comparativa de todos
```

### Usuario sin `view_all` (Vendedor)
```typescript
// Solo puede ver sus propios datos
GET /dashboard/metrics → Solo sus datos (automático por DataScopeService)
GET /dashboard/users/:userId/metrics → 403 Forbidden (no tiene permiso)
GET /dashboard/users/comparison → 403 Forbidden (no tiene permiso)
```

## 📝 Estructura de Respuesta

### Ejemplo: `/dashboard/users/:userId/metrics`

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "userName": "Juan Pérez",
    "userEmail": "juan@example.com",
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "customers": {
      "total": 45,
      "leads": 20,
      "prospects": 15,
      "active": 10,
      "conversionRate": 22.2
    },
    "orders": {
      "total": 32,
      "pending": 5,
      "confirmed": 10,
      "inProgress": 8,
      "completed": 9,
      "cancelled": 0
    },
    "sales": {
      "totalRevenue": 1250000,
      "averageTicket": 39062.5,
      "byStatus": {
        "completed": 1000000,
        "pending": 250000
      }
    },
    "performance": {
      "leadsToOrders": 71.1,
      "ordersToSales": 28.1,
      "averageDaysToClose": 12.5
    }
  }
}
```

### Ejemplo: `/dashboard/users/comparison`

```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "users": [
      {
        "userId": "uuid-1",
        "userName": "Juan Pérez",
        "customers": 45,
        "orders": 32,
        "revenue": 1250000,
        "conversionRate": 22.2
      },
      {
        "userId": "uuid-2",
        "userName": "María García",
        "customers": 38,
        "orders": 28,
        "revenue": 980000,
        "conversionRate": 18.5
      }
    ],
    "totals": {
      "customers": 83,
      "orders": 60,
      "revenue": 2230000
    }
  }
}
```

## 🔧 Implementación

### Servicio: `DashboardService`

```typescript
@Injectable()
export class DashboardService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    private readonly customerService: CustomerService,
    private readonly ordersService: OrdersService,
  ) {}

  async getMetrics(
    userId: string,
    userPermissions: string[],
    days?: number,
  ) {
    // Aplicar scope automático
    const canViewAll = this.dataScope.canViewAll(userPermissions);
    
    if (canViewAll) {
      // Métricas de todos
      return this.getAllMetrics(days);
    } else {
      // Métricas solo del usuario
      return this.getUserMetrics(userId, days);
    }
  }

  async getUserSpecificMetrics(
    targetUserId: string,
    userPermissions: string[],
    days?: number,
  ) {
    // Verificar permiso view_all
    if (!this.dataScope.canViewAll(userPermissions)) {
      throw new ForbiddenException('No tiene permiso para ver datos de otros usuarios');
    }
    
    return this.getUserMetrics(targetUserId, days);
  }

  async getUsersComparison(
    userPermissions: string[],
    days?: number,
  ) {
    // Verificar permiso view_all
    if (!this.dataScope.canViewAll(userPermissions)) {
      throw new ForbiddenException('No tiene permiso para ver comparativas');
    }
    
    // Obtener todos los usuarios activos
    const users = await this.getActiveUsers();
    
    // Calcular métricas para cada usuario
    const comparison = await Promise.all(
      users.map(user => this.getUserMetrics(user.id, days))
    );
    
    return {
      users: comparison,
      totals: this.calculateTotals(comparison),
    };
  }
}
```

## ✅ Checklist de Implementación

- [ ] Actualizar `DashboardController` para usar `DataScopeService`
- [ ] Crear `DashboardService` con lógica de agregación
- [ ] Implementar `getMetrics()` con scope automático
- [ ] Implementar `getUserSpecificMetrics()` (solo admins)
- [ ] Implementar `getUsersComparison()` (solo admins)
- [ ] Agregar permisos granulares a todos los endpoints
- [ ] Agregar validación de `view_all` para endpoints de admin
- [ ] Crear DTOs para respuestas
- [ ] Agregar documentación Swagger
- [ ] Probar con diferentes roles de usuario

## 🎨 Frontend (Paso 2)

Una vez implementado el backend, el frontend podrá:
- Mostrar dashboard personalizado según permisos
- Selector de usuario (solo para admins)
- Gráficas comparativas (solo para admins)
- Filtros de período

