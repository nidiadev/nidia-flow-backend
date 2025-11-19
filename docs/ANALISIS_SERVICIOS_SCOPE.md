# Análisis: Servicios que Necesitan DataScopeService

## 📋 Criterio para Aplicar DataScopeService

Un servicio necesita `DataScopeService` si:
1. El modelo tiene campos de ownership (`assignedTo`, `createdBy`, `owner`)
2. Los usuarios deben ver solo sus propios datos (sin permiso `view_all`)
3. Es un recurso que se asigna a usuarios específicos (customers, orders, tasks)

## ✅ Servicios que SÍ Necesitan DataScopeService

### 1. CustomerService ✅ (YA ACTUALIZADO)
- **Modelo**: `Customer`
- **Campos de ownership**: `assignedTo`, `createdBy`
- **Razón**: Los vendedores deben ver solo sus customers asignados
- **Estado**: ✅ Completado

### 2. OrderService
- **Modelo**: `Order`
- **Campos de ownership**: `assignedTo`, `createdBy`
- **Razón**: Los vendedores deben ver solo sus órdenes
- **Ubicación**: `src/orders/orders.service.ts`
- **Estado**: ⏳ Pendiente

### 3. TaskService
- **Modelo**: `Task`
- **Campos de ownership**: `assignedTo`, `createdBy`
- **Razón**: Los usuarios deben ver solo sus tareas asignadas
- **Ubicación**: Buscar en `src/tenant/services/` o `src/tasks/`
- **Estado**: ⏳ Pendiente

### 4. InteractionService (Opcional)
- **Modelo**: `Interaction`
- **Campos de ownership**: `createdBy` (indirecto a través de `customer.assignedTo`)
- **Razón**: Las interacciones están vinculadas a customers, el scope se aplica indirectamente
- **Nota**: Podría ser útil filtrar por `createdBy` directamente
- **Estado**: ⏳ Evaluar

## ❌ Servicios que NO Necesitan DataScopeService

### 1. ProductService
- **Modelo**: `Product`
- **Campos**: `createdBy` (solo para auditoría)
- **Razón**: Los productos son compartidos por todo el tenant, no tienen ownership funcional
- **Estado**: ✅ No aplicar

### 2. CategoryService
- **Modelo**: `Category`
- **Campos**: No tiene ownership
- **Razón**: Las categorías son compartidas
- **Estado**: ✅ No aplicar

### 3. SettingsService
- **Modelo**: `CompanySetting`
- **Campos**: No tiene ownership funcional
- **Razón**: La configuración es global del tenant
- **Estado**: ✅ No aplicar

### 4. ReportService
- **Modelo**: `SavedReport`
- **Campos**: `createdBy` (solo para auditoría)
- **Razón**: Los reportes pueden ser compartidos o privados, pero no es ownership funcional
- **Estado**: ✅ No aplicar (o evaluar caso por caso)

### 5. FileService
- **Modelo**: `File`
- **Campos**: `createdBy` (solo para auditoría)
- **Razón**: Los archivos pueden ser compartidos o privados, pero no es ownership funcional de negocio
- **Estado**: ✅ No aplicar (o evaluar caso por caso)

### 6. TransactionService
- **Modelo**: `Transaction`
- **Campos**: `createdBy` (solo para auditoría)
- **Razón**: Las transacciones son del tenant completo, no tienen ownership funcional
- **Estado**: ✅ No aplicar

## 🎯 Plan de Actualización

### Fase 1: Servicios Críticos (Ownership Funcional)
1. ✅ CustomerService - COMPLETADO
2. ⏳ OrderService - Pendiente
3. ⏳ TaskService - Pendiente

### Fase 2: Servicios Opcionales
4. ⏳ InteractionService - Evaluar si es necesario

### Fase 3: Verificación
5. ⏳ Verificar que no haya endpoints duplicados
6. ⏳ Asegurar que los permisos granulares estén en todos los controllers

## 📝 Notas Importantes

- **No duplicar lógica**: Si un servicio no tiene ownership funcional, no aplicar DataScopeService
- **Permisos granulares**: Todos los controllers deben usar permisos granulares, incluso si no usan DataScopeService
- **Consistencia**: Mantener el mismo patrón en todos los servicios que usan DataScopeService

