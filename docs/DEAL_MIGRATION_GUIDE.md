# Guía de Migración: Pipeline de Oportunidades (Deals)

## 📋 Resumen

Esta guía documenta los cambios realizados para implementar el módulo de Pipeline de Oportunidades (Deals) según los Sprints 1-2 del MVP CRM.

## 🗄️ Cambios en el Schema de Prisma

### Nuevos Modelos Agregados

1. **DealStage** - Etapas configurables del pipeline
   - Campos: `id`, `name`, `displayName`, `description`, `probability`, `sortOrder`, `isActive`, `isDefault`, `color`
   - Relación: `deals Deal[]`

2. **Deal** - Oportunidades de venta
   - Campos principales: `name`, `description`, `customerId`, `stageId`, `probability`, `amount`, `currency`, `expectedCloseDate`
   - Estados: `status` (open, won, lost, abandoned)
   - Tracking: `daysInStage`, `lastStageChangeAt`, `stageHistory` (JSON)
   - Relaciones: `customer`, `stage`, `assignedToUser`, `createdByUser`, `contacts`, `products`, `interactions`, `orders`

3. **DealContact** - Contactos vinculados a deals
   - Campos: `dealId`, `contactId`, `role`, `isPrimary`
   - Relaciones: `deal`, `contact` (CustomerContact)

4. **DealProduct** - Productos vinculados a deals
   - Campos: `dealId`, `productId`, `quantity`, `unitPrice`, `discount`, `total`
   - Relaciones: `deal`, `product`

### Cambios en Modelos Existentes

- **Customer**: Agregada relación `deals Deal[]`
- **CustomerContact**: Agregada relación `dealContacts DealContact[]`
- **Product**: Agregada relación `dealProducts DealProduct[]`
- **Order**: Agregado campo `dealId` y relación `deal Deal?`
- **Interaction**: Agregado campo `relatedDealId` y relación `deal Deal?`
- **User**: Agregadas relaciones `dealsCreated Deal[]` y `dealsAssigned Deal[]`

## 🔄 Aplicación de Migraciones

### Para Desarrollo Local

El proyecto usa `prisma db push` para aplicar cambios al schema de tenant. Para aplicar los cambios:

```bash
# Generar cliente de Prisma
npm run db:generate

# Aplicar cambios al schema de tenant (desarrollo local)
npm run db:push:tenant
```

**Nota:** Asegúrate de tener configurada la variable de entorno `TENANT_DATABASE_URL` antes de ejecutar `db:push:tenant`.

### Para Producción / Nuevos Tenants

Los nuevos tenants se provisionan automáticamente con el schema actualizado. El servicio `TenantProvisioningService` ejecuta `prisma db push` durante el proceso de provisioning.

Para tenants existentes, se debe ejecutar manualmente:

```bash
# Conectar a la base de datos del tenant
export TENANT_DATABASE_URL="postgresql://user:password@host:port/tenant_db?schema=public"

# Aplicar cambios
npm run db:push:tenant
```

## 📦 Archivos Creados/Modificados

### Nuevos Archivos

**DTOs:**
- `src/tenant/dto/crm/deal.dto.ts` - DTOs para Deal (create, update, filter, response)
- `src/tenant/dto/crm/deal-stage.dto.ts` - DTOs para DealStage

**Servicios:**
- `src/tenant/services/crm/deal.service.ts` - Lógica de negocio para Deal
- `src/tenant/services/crm/deal-stage.service.ts` - Lógica de negocio para DealStage

**Controladores:**
- `src/tenant/controllers/crm/deal.controller.ts` - Endpoints REST para Deal
- `src/tenant/controllers/crm/deal-stage.controller.ts` - Endpoints REST para DealStage

### Archivos Modificados

- `prisma/tenant-schema.prisma` - Agregados modelos Deal, DealStage, DealContact, DealProduct
- `src/tenant/modules/crm.module.ts` - Integrados nuevos servicios y controladores
- `src/tenant/services/data-scope.service.ts` - Agregado método `getDealScope()`
- `src/common/events/business-events.ts` - Agregados eventos: `DEAL_CREATED`, `DEAL_STAGE_CHANGED`, `DEAL_WON`, `DEAL_LOST`

## ✅ Verificación Post-Migración

### 1. Verificar Schema

```bash
# Validar schema
npx prisma validate --schema=prisma/tenant-schema.prisma
```

### 2. Verificar Cliente Generado

```bash
# Generar cliente
npm run db:generate

# Verificar que no hay errores
npx tsc --noEmit
```

### 3. Inicializar Etapas por Defecto

Para cada tenant, se deben inicializar las etapas por defecto. Esto se puede hacer mediante:

```bash
# Llamar al endpoint de inicialización
POST /api/v1/crm/deal-stages/initialize
```

O programáticamente:

```typescript
const dealStageService = new DealStageService(tenantPrisma);
await dealStageService.initializeDefaultStages(userId);
```

### 4. Probar Endpoints

```bash
# Crear un deal
POST /api/v1/crm/deals
{
  "name": "Implementación CRM",
  "customerId": "...",
  "stageId": "...",
  "amount": 5000000,
  "currency": "COP"
}

# Obtener pipeline
GET /api/v1/crm/deals/pipeline/stats

# Obtener forecast
GET /api/v1/crm/deals/forecast?year=2024&month=12
```

## 🎯 Funcionalidades Implementadas

### Sprint 1-2 Completado ✅

- ✅ Modelo Deal y DealStage en Prisma
- ✅ DTOs completos (create, update, filter, response)
- ✅ DealService con lógica de negocio completa
- ✅ DealStageService con gestión de etapas
- ✅ DealController con todos los endpoints
- ✅ DealStageController para gestión de etapas
- ✅ Integración en CrmModule
- ✅ Eventos de negocio (DEAL_CREATED, DEAL_STAGE_CHANGED, DEAL_WON, DEAL_LOST)
- ✅ DataScopeService para permisos
- ✅ Forecasting básico
- ✅ Estadísticas de pipeline
- ✅ Historial de cambios de etapa
- ✅ Win/Lose deals con razones

## 🚀 Próximos Pasos (Sprint 3)

1. **Frontend - Vista Kanban**
   - Componente de Kanban board
   - Drag and drop de deals entre etapas
   - Actualización en tiempo real

2. **Frontend - Formularios**
   - Formulario de creación de deal
   - Formulario de edición
   - Selector de contactos y productos

3. **Frontend - Dashboard**
   - Estadísticas del pipeline
   - Gráficas de forecast
   - Métricas por etapa

## 📝 Notas Importantes

1. **Migraciones Automáticas**: Los nuevos tenants se provisionan automáticamente con el schema actualizado.

2. **Tenants Existentes**: Para tenants existentes, se debe ejecutar `db:push:tenant` manualmente o crear un script de migración.

3. **Etapas por Defecto**: Las etapas por defecto se inicializan automáticamente cuando un tenant no tiene etapas configuradas.

4. **Permisos**: Los endpoints requieren permisos `crm:read` o `crm:write` según corresponda.

5. **Data Scope**: Los usuarios sin permiso `view_all` solo verán deals asignados a ellos o creados por ellos.

## 🔗 Referencias

- [Análisis Completo CRM MVP](./CRM_MVP_ANALISIS_COMPLETO.md)
- [Documentación Prisma](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com/)

---

**Fecha de Implementación:** Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Completado - Sprint 1-2

