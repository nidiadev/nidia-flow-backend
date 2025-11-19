# Implementación de Submódulos y Asignaciones Granulares

## 📋 Resumen

Se ha implementado un sistema completo de **submódulos** con **control granular de permisos** que permite:

1. **Definir submódulos** para cada módulo del sistema
2. **Asignar submódulos a planes** de suscripción
3. **Asignar módulos y submódulos directamente a tenants** (independiente de planes)
4. **Control temporal** de asignaciones (fechas de inicio y fin)
5. **Permisos granulares** por submódulo

---

## 🗄️ Cambios en el Schema de Prisma

### Nuevos Modelos

#### 1. `SubModuleDefinition`
Define los submódulos que pertenecen a cada módulo.

```prisma
model SubModuleDefinition {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  moduleId    String  @map("module_id") @db.Uuid
  name        String  @db.VarChar(100)
  displayName String  @map("display_name") @db.VarChar(255)
  description String? @db.Text
  icon        String? @db.VarChar(100)
  path        String? @db.VarChar(255)
  sortOrder   Int     @default(0) @map("sort_order")
  isActive    Boolean @default(true) @map("is_active")
  isVisible   Boolean @default(true) @map("is_visible")
  permissions Json?   @map("permissions") // Array de permisos
  metadata    Json?   @map("metadata")
  // ...
}
```

#### 2. `SubModulePlanAssignment`
Asigna submódulos a planes de suscripción.

```prisma
model SubModulePlanAssignment {
  id          String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subModuleId String @map("submodule_id") @db.Uuid
  planId      String @map("plan_id") @db.Uuid
  isEnabled   Boolean @default(true) @map("is_enabled")
  // ...
}
```

#### 3. `ModuleTenantAssignment`
Asignación directa de módulos a tenants (independiente de planes).

```prisma
model ModuleTenantAssignment {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  moduleId   String    @map("module_id") @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  isEnabled  Boolean   @default(true) @map("is_enabled")
  startsAt   DateTime? @map("starts_at") // Fecha de inicio
  endsAt     DateTime? @map("ends_at")   // Fecha de fin (null = permanente)
  reason     String?   @db.Text          // Razón de la asignación
  assignedBy String?   @map("assigned_by") @db.Uuid
  // ...
}
```

#### 4. `SubModuleTenantAssignment`
Asignación directa de submódulos a tenants (independiente de planes).

```prisma
model SubModuleTenantAssignment {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subModuleId String  @map("submodule_id") @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  isEnabled  Boolean   @default(true) @map("is_enabled")
  startsAt   DateTime? @map("starts_at")
  endsAt     DateTime? @map("ends_at")
  reason     String?   @db.Text
  assignedBy String?   @map("assigned_by") @db.Uuid
  // ...
}
```

---

## 📦 Submódulos Definidos

### Dashboard (`dashboard`)
- `sales` - Dashboard de Ventas
- `operational` - Dashboard Operacional
- `financial` - Dashboard Financiero
- `customers` - Dashboard de Clientes

### CRM (`crm`)
- `customers` - Gestión de Clientes
- `contacts` - Contactos de Clientes
- `interactions` - Interacciones
- `lead-scoring` - Lead Scoring
- `analytics` - Analytics CRM

### Productos (`products`)
- `catalog` - Catálogo de Productos
- `categories` - Categorías
- `variants` - Variantes
- `pricing` - Gestión de Precios

### Inventario (`inventory`)
- `stock` - Control de Stock
- `movements` - Movimientos de Inventario
- `alerts` - Alertas de Stock
- `valuation` - Valoración de Inventario

### Órdenes (`orders`)
- `management` - Gestión de Órdenes
- `scheduling` - Programación
- `tracking` - Seguimiento
- `history` - Historial

### Tareas (`tasks`)
- `management` - Gestión de Tareas
- `scheduling` - Programación
- `checklists` - Listas de Verificación
- `gps-tracking` - Seguimiento GPS
- `evidence` - Evidencia
- `dependencies` - Dependencias

### Pagos (`payments`)
- `registration` - Registro de Pagos
- `refunds` - Reembolsos
- `history` - Historial de Pagos

### Contabilidad (`accounting`)
- `transactions` - Transacciones
- `bank-accounts` - Cuentas Bancarias
- `budgets` - Presupuestos
- `reports` - Reportes Financieros

### Comunicaciones (`communications`)
- `templates` - Plantillas de Mensajes
- `sending` - Envío de Mensajes
- `logs` - Log de Mensajes
- `integrations` - Integraciones
- `statistics` - Estadísticas

### Notificaciones (`notifications`)
- `internal` - Notificaciones Internas
- `real-time` - Tiempo Real

### Archivos (`files`)
- `upload` - Subida de Archivos
- `organization` - Organización

### Reportes (`reports`)
- `saved` - Reportes Guardados
- `execution` - Ejecución
- `types` - Tipos de Reportes

### Configuración (`settings`)
- `company` - Configuración de Empresa
- `business` - Configuración de Negocio
- `integrations` - Integraciones y API Keys
- `modules` - Módulos

### Usuarios (`users`)
- `management` - Gestión de Usuarios
- `roles` - Roles y Permisos

### Auditoría (`audit`)
- `logs` - Logs de Auditoría
- `search` - Búsqueda

---

## 🔧 API Endpoints

### Submódulos (SuperAdmin)

#### `POST /api/v1/submodules`
Crear un nuevo submódulo

#### `GET /api/v1/submodules`
Listar todos los submódulos (opcional: filtrar por `moduleId`)

#### `GET /api/v1/submodules/with-plan-status`
Obtener submódulos con estado de asignación a planes

#### `GET /api/v1/submodules/:id`
Obtener detalles de un submódulo

#### `PUT /api/v1/submodules/:id`
Actualizar un submódulo

#### `DELETE /api/v1/submodules/:id`
Eliminar un submódulo

#### `POST /api/v1/submodules/assign-to-plan`
Asignar un submódulo a un plan

#### `DELETE /api/v1/submodules/assign-to-plan/:subModuleId/:planId`
Remover asignación de submódulo a plan

### Asignaciones Directas a Tenants (SuperAdmin)

#### `POST /api/v1/tenant-assignments/module`
Asignar un módulo directamente a un tenant

#### `POST /api/v1/tenant-assignments/submodule`
Asignar un submódulo directamente a un tenant

#### `DELETE /api/v1/tenant-assignments/module/:moduleId/:tenantId`
Remover asignación de módulo a tenant

#### `DELETE /api/v1/tenant-assignments/submodule/:subModuleId/:tenantId`
Remover asignación de submódulo a tenant

#### `GET /api/v1/tenant-assignments/tenant/:tenantId/modules`
Obtener todas las asignaciones de módulos de un tenant

#### `GET /api/v1/tenant-assignments/tenant/:tenantId/submodules`
Obtener todas las asignaciones de submódulos de un tenant

#### `GET /api/v1/tenant-assignments/module/:moduleId/tenants`
Obtener todos los tenants asignados a un módulo

#### `GET /api/v1/tenant-assignments/submodule/:subModuleId/tenants`
Obtener todos los tenants asignados a un submódulo

### Módulos del Tenant

#### `GET /api/v1/tenant/modules`
Obtener todos los módulos con su estado habilitado y submódulos (actualizado)

#### `GET /api/v1/tenant/modules/submodules/:moduleName`
Obtener todos los submódulos de un módulo específico

---

## 🎯 Lógica de Habilitación

El sistema determina si un módulo o submódulo está habilitado para un tenant considerando:

1. **Asignaciones del Plan**: Módulos/submódulos asignados al plan activo del tenant
2. **Asignaciones Directas**: Módulos/submódulos asignados directamente al tenant
3. **Fechas de Validez**: 
   - `startsAt`: Si existe, debe ser <= fecha actual
   - `endsAt`: Si existe, debe ser >= fecha actual (o null para permanente)
4. **Estado**: `isEnabled` debe ser `true`

**Prioridad**: Las asignaciones directas tienen prioridad sobre las asignaciones del plan.

---

## 📝 Scripts

### Seed de Submódulos

```bash
# Ejecutar el script para crear todos los submódulos
ts-node scripts/seed-submodules.ts
```

Este script:
- Crea todos los submódulos definidos para cada módulo
- Actualiza submódulos existentes si ya existen
- Mantiene la integridad referencial con los módulos

---

## 🔐 Permisos por Submódulo

Cada submódulo puede tener un array de permisos definido:

```json
{
  "permissions": ["read", "write", "delete"]
}
```

Estos permisos pueden ser utilizados en:
- Guards del backend para validar acceso
- Componentes del frontend para mostrar/ocultar funcionalidades
- Validación de acciones específicas

---

## 🚀 Próximos Pasos

1. **Ejecutar migración de Prisma**:
   ```bash
   npx prisma migrate dev --name add_submodules_and_tenant_assignments
   ```

2. **Ejecutar seed de submódulos**:
   ```bash
   ts-node scripts/seed-submodules.ts
   ```

3. **Actualizar frontend**:
   - Crear páginas de gestión de submódulos en SuperAdmin
   - Actualizar interfaz de asignación de módulos a planes para incluir submódulos
   - Crear interfaz para asignaciones directas a tenants
   - Actualizar sidebar para mostrar submódulos habilitados
   - Implementar validación de permisos en el frontend

4. **Actualizar guards del backend**:
   - Crear guard para validar acceso a submódulos
   - Integrar validación de permisos en controladores

---

## 📊 Ejemplo de Uso

### Asignar un módulo directamente a un tenant por 30 días

```typescript
POST /api/v1/tenant-assignments/module
{
  "moduleId": "uuid-del-modulo",
  "tenantId": "uuid-del-tenant",
  "isEnabled": true,
  "startsAt": "2024-01-01T00:00:00Z",
  "endsAt": "2024-01-31T23:59:59Z",
  "reason": "Prueba gratuita de 30 días"
}
```

### Asignar un submódulo específico a un tenant

```typescript
POST /api/v1/tenant-assignments/submodule
{
  "subModuleId": "uuid-del-submodulo",
  "tenantId": "uuid-del-tenant",
  "isEnabled": true,
  "reason": "Cliente VIP - acceso premium"
}
```

---

## ✅ Estado de Implementación

- ✅ Schema de Prisma actualizado
- ✅ Modelos de base de datos creados
- ✅ DTOs creados
- ✅ Servicios implementados
- ✅ Controladores implementados
- ✅ Servicio de tenant actualizado
- ✅ Script de seed creado
- ⏳ Frontend pendiente
- ⏳ Guards de validación pendientes

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.0

