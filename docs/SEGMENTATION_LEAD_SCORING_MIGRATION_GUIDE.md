# Guía de Migración: Segmentación y Lead Scoring (Sprints 5-6)

## 📋 Resumen

Esta guía documenta los cambios realizados para implementar el módulo de Segmentación (Smart Lists) y Lead Scoring Automático según los Sprints 5 y 6 del MVP CRM.

## 🗄️ Cambios en el Schema de Prisma

### Nuevos Modelos

#### 1. SmartList (Segmentación)
```prisma
model SmartList {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name String @db.VarChar(255)
  description String? @db.Text
  isActive Boolean @default(true) @map("is_active")
  isSystem Boolean @default(false) @map("is_system")
  filterConfig Json @default("{}") @map("filter_config")
  filterLogic String @default("AND") @map("filter_logic") @db.VarChar(10)
  autoUpdate Boolean @default(true) @map("auto_update")
  lastUpdatedAt DateTime? @map("last_updated_at")
  memberCount Int @default(0) @map("member_count")
  tags String[] @map("tags")
  metadata Json @default("{}") @map("metadata")
  createdBy String @map("created_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  createdByUser User @relation(...)
  members SmartListMember[]
  @@map("smart_lists")
}
```

#### 2. SmartListMember (Junction Table)
```prisma
model SmartListMember {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  smartListId String @map("smart_list_id") @db.Uuid
  customerId String @map("customer_id") @db.Uuid
  addedAt DateTime @default(now()) @map("added_at")
  smartList SmartList @relation(...)
  customer Customer @relation(...)
  @@unique([smartListId, customerId])
  @@map("smart_list_members")
}
```

#### 3. LeadScoringRule (Reglas de Scoring)
```prisma
model LeadScoringRule {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name String @db.VarChar(255)
  description String? @db.Text
  category String @db.VarChar(50) // demographic, engagement, behavior, fit
  isActive Boolean @default(true) @map("is_active")
  isSystem Boolean @default(false) @map("is_system")
  condition Json @map("condition")
  points Int @default(0)
  priority Int @default(0)
  sortOrder Int @default(0) @map("sort_order")
  metadata Json @default("{}") @map("metadata")
  createdBy String @map("created_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  createdByUser User @relation(...)
  @@map("lead_scoring_rules")
}
```

#### 4. LeadScoreHistory (Historial de Cambios)
```prisma
model LeadScoreHistory {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  customerId String @map("customer_id") @db.Uuid
  oldScore Int @map("old_score")
  newScore Int @map("new_score")
  change Int
  triggerType String @map("trigger_type") @db.VarChar(50)
  triggerId String? @map("trigger_id") @db.Uuid
  reason String? @db.Text
  metadata Json @default("{}") @map("metadata")
  createdAt DateTime @default(now()) @map("created_at")
  customer Customer @relation(...)
  @@map("lead_score_history")
}
```

### Cambios en Modelos Existentes

- **User**: Agregadas relaciones `smartListsCreated` y `leadScoringRulesCreated`
- **Customer**: Agregadas relaciones `smartListMembers` y `leadScoreHistory`

## 🔄 Aplicación de Migraciones

### Para Desarrollo Local

```bash
# Generar cliente de Prisma
npm run db:generate

# Aplicar cambios al schema de tenant (desarrollo local)
npm run db:push:tenant
```

**Nota:** Asegúrate de tener configurada la variable de entorno `TENANT_DATABASE_URL`.

### Para Producción / Nuevos Tenants

Los nuevos tenants se provisionan automáticamente con el schema actualizado. Para tenants existentes:

```bash
export TENANT_DATABASE_URL="postgresql://user:password@host:port/tenant_db?schema=public"
npm run db:push:tenant
```

## 📦 Archivos Creados/Modificados

### Nuevos Archivos

**DTOs:**
- `src/tenant/dto/crm/smart-list.dto.ts` - DTOs para Smart Lists
- `src/tenant/dto/crm/lead-scoring.dto.ts` - DTOs para Lead Scoring

**Servicios:**
- `src/tenant/services/crm/smart-list.service.ts` - Servicio de Smart Lists
- `src/tenant/services/crm/lead-scoring.service.ts` - Servicio de Lead Scoring

**Controladores:**
- `src/tenant/controllers/crm/smart-list.controller.ts` - Endpoints de Smart Lists
- `src/tenant/controllers/crm/lead-scoring.controller.ts` - Endpoints de Lead Scoring

### Archivos Modificados

- `prisma/tenant-schema.prisma` - Agregados modelos SmartList, SmartListMember, LeadScoringRule, LeadScoreHistory
- `src/tenant/modules/crm.module.ts` - Integrados nuevos servicios y controladores
- `src/common/events/business-events.ts` - Agregados eventos de lead scoring

## ✅ Verificación Post-Migración

### 1. Verificar Schema

```bash
npx prisma validate --schema=prisma/tenant-schema.prisma
```

### 2. Verificar Cliente Generado

```bash
npm run db:generate
npx tsc --noEmit
```

### 3. Probar Endpoints

#### Smart Lists (Segmentación)

```bash
# Crear smart list
POST /api/v1/crm/smart-lists
{
  "name": "Leads Calientes",
  "description": "Leads con score alto",
  "filterConfig": {
    "logic": "AND",
    "conditions": [
      {
        "field": "leadScore",
        "fieldType": "number",
        "operator": "greater_than",
        "value": 70
      },
      {
        "field": "type",
        "fieldType": "string",
        "operator": "equals",
        "value": "lead"
      }
    ]
  },
  "autoUpdate": true
}

# Obtener smart lists
GET /api/v1/crm/smart-lists

# Obtener miembros de una lista
GET /api/v1/crm/smart-lists/:id/members

# Actualizar miembros manualmente
POST /api/v1/crm/smart-lists/:id/update-members

# Ejecutar acción masiva
POST /api/v1/crm/smart-lists/:id/bulk-action
{
  "action": "tag",
  "tags": ["hot-lead"]
}
```

#### Lead Scoring

```bash
# Crear regla de scoring
POST /api/v1/crm/lead-scoring/rules
{
  "name": "CEO Bonus Points",
  "description": "Puntos adicionales para CEOs",
  "category": "demographic",
  "condition": {
    "field": "jobTitle",
    "operator": "in",
    "value": ["CEO", "Director", "Gerente"]
  },
  "points": 20,
  "priority": 10
}

# Obtener reglas
GET /api/v1/crm/lead-scoring/rules

# Recalcular score de un cliente
POST /api/v1/crm/lead-scoring/recalculate
{
  "customerId": "..."
}

# Recalcular todos los scores
POST /api/v1/crm/lead-scoring/recalculate
{}

# Obtener resumen de score
GET /api/v1/crm/lead-scoring/customers/:customerId/summary

# Obtener historial de score
GET /api/v1/crm/lead-scoring/customers/:customerId/history

# Inicializar reglas por defecto
POST /api/v1/crm/lead-scoring/initialize-defaults
```

## 🎯 Funcionalidades Implementadas

### Sprint 5: Segmentación y Listas Inteligentes ✅

- ✅ Modelo SmartList con configuración de filtros
- ✅ Modelo SmartListMember para miembros
- ✅ DTOs completos con soporte para filtros complejos
- ✅ SmartListService con evaluación de filtros
- ✅ Soporte para filtros anidados con lógica AND/OR
- ✅ Auto-actualización de listas
- ✅ Acciones masivas (assign, tag, untag, change_type, change_owner)
- ✅ Contador de miembros en tiempo real
- ✅ SmartListController con todos los endpoints

### Sprint 6: Lead Scoring Automático ✅

- ✅ Modelo LeadScoringRule para reglas configurables
- ✅ Modelo LeadScoreHistory para historial
- ✅ DTOs completos con categorías de scoring
- ✅ LeadScoringService con evaluación de reglas
- ✅ Re-cálculo automático de scores
- ✅ Historial completo de cambios
- ✅ Alertas cuando score cruza umbral
- ✅ Clasificación visual (Cold/Warm/Hot)
- ✅ Reglas por defecto pre-configuradas
- ✅ LeadScoringController con todos los endpoints
- ✅ Eventos de negocio para lead scoring

## 📝 Notas Importantes

1. **Smart Lists**: Las listas se actualizan automáticamente cuando `autoUpdate` está habilitado. Puedes actualizar manualmente con el endpoint `/update-members`.

2. **Filtros**: Los filtros soportan operadores complejos (equals, contains, greater_than, between, in, etc.) y pueden anidarse con lógica AND/OR.

3. **Lead Scoring**: Las reglas se evalúan en orden de prioridad. Las reglas del sistema no pueden ser eliminadas o modificadas.

4. **Re-cálculo**: El re-cálculo puede ejecutarse para un cliente específico o para todos. Se guarda historial de todos los cambios.

5. **Permisos**: Todos los endpoints requieren permisos `crm:read`/`crm:write`.

6. **Data Scope**: Los usuarios sin permiso `view_all` solo ven listas y reglas que crearon.

## 🔗 Referencias

- [Análisis Completo CRM MVP](./CRM_MVP_ANALISIS_COMPLETO.md)
- [Documentación Prisma](https://www.prisma.io/docs)
- [NestJS](https://docs.nestjs.com/)

---

**Fecha de Implementación:** Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Completado - Sprints 5-6

