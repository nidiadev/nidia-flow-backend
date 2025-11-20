# Guía de Migración: Actividades y Calendario (Sprint 4)

## 📋 Resumen

Esta guía documenta los cambios realizados para implementar el módulo de Actividades y Calendario según el Sprint 4 del MVP CRM.

## 🗄️ Cambios en el Schema de Prisma

### Modelo Interaction - Campos Agregados

1. **Prioridad y Asignación**
   - `priority` (low, normal, high, urgent) - Prioridad de la actividad
   - `assignedTo` (UUID) - Usuario asignado a la actividad
   - `scheduledEndAt` (DateTime) - Hora de finalización para reuniones

2. **Recurrencia**
   - `isRecurring` (Boolean) - Indica si es una actividad recurrente
   - `recurrenceRule` (String) - Regla de recurrencia (daily, weekly, monthly)
   - `recurrenceEndDate` (DateTime) - Fecha de finalización de la recurrencia
   - `parentInteractionId` (UUID) - ID de la actividad padre (para series recurrentes)

3. **Ubicación**
   - `location` (String) - Ubicación física para reuniones
   - `locationUrl` (String) - URL para videollamadas

4. **Completado**
   - `completedAt` (DateTime) - Timestamp de cuando se completó la actividad

### Nuevo Modelo: ActivityReminder

```prisma
model ActivityReminder {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interactionId String @map("interaction_id") @db.Uuid
  reminderMinutes Int @map("reminder_minutes")
  reminderAt DateTime @map("reminder_at")
  sentAt DateTime? @map("sent_at")
  notificationSent Boolean @default(false) @map("notification_sent")
  emailSent Boolean @default(false) @map("email_sent")
  createdAt DateTime @default(now()) @map("created_at")
  interaction Interaction @relation(...)
  @@index([interactionId])
  @@index([reminderAt])
  @@index([notificationSent])
  @@map("activity_reminders")
}
```

### Cambios en Modelos Existentes

- **User**: Agregadas relaciones `interactionsAssigned Interaction[]` y `interactions Interaction[]` (actualizada)

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

**Servicios:**
- `src/tenant/services/crm/activity-reminder.service.ts` - Servicio para programar recordatorios
- `src/tenant/processors/activity-reminder.processor.ts` - Processor de BullMQ para recordatorios

**Controladores:**
- `src/tenant/controllers/crm/calendar.controller.ts` - Endpoints de calendario

### Archivos Modificados

- `prisma/tenant-schema.prisma` - Agregados campos a Interaction y modelo ActivityReminder
- `src/tenant/dto/crm/interaction.dto.ts` - DTOs extendidos con nuevos campos
- `src/tenant/services/crm/interaction.service.ts` - Métodos de calendario agregados
- `src/tenant/modules/crm.module.ts` - Integrados CalendarController y servicios de recordatorios
- `src/app.module.ts` - Registrada cola `activity-reminders`
- `package.json` - Agregado `@nestjs/schedule` para cron jobs

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

```bash
# Vista de calendario mensual
GET /api/v1/crm/calendar/view?view=month&year=2024&month=12

# Vista de calendario semanal
GET /api/v1/crm/calendar/view?view=week&year=2024&month=12&week=50

# Vista de calendario diaria
GET /api/v1/crm/calendar/view?view=day&year=2024&month=12&day=25

# Actividades de hoy
GET /api/v1/crm/calendar/today

# Crear actividad recurrente
POST /api/v1/crm/calendar/recurring
{
  "customerId": "...",
  "type": "meeting",
  "subject": "Reunión semanal",
  "scheduledAt": "2024-12-25T10:00:00Z",
  "recurrenceRule": "weekly",
  "recurrenceEndDate": "2025-12-31T23:59:59Z",
  "status": "scheduled"
}

# Agregar recordatorio
POST /api/v1/crm/calendar/activities/:id/reminders
{
  "reminderMinutes": 15
}

# Completar actividad
POST /api/v1/crm/calendar/activities/:id/complete
{
  "content": "Reunión completada exitosamente",
  "outcome": "interested",
  "durationMinutes": 30
}
```

## 🎯 Funcionalidades Implementadas

### Sprint 4 Completado ✅

- ✅ Modelo Interaction mejorado con prioridad, asignación, recurrencia
- ✅ Modelo ActivityReminder para recordatorios configurables
- ✅ DTOs completos (CalendarFilterDto, CreateRecurringActivityDto, CreateReminderDto)
- ✅ InteractionService con métodos de calendario
- ✅ CalendarController con todos los endpoints
- ✅ Vista de calendario mensual, semanal, diaria
- ✅ Actividades de hoy
- ✅ Actividades recurrentes (daily, weekly, monthly)
- ✅ Recordatorios configurables
- ✅ Sistema de notificaciones para recordatorios
- ✅ Processor de BullMQ para procesar recordatorios
- ✅ Integración con WebSocket para notificaciones en tiempo real
- ✅ Completar actividades con notas y resultados

## 🚀 Sistema de Recordatorios

### Funcionamiento

1. **Creación de Recordatorio**: Cuando se agrega un recordatorio a una actividad, se crea un registro en `ActivityReminder` con `reminderAt` calculado.

2. **Procesamiento**: El `ActivityReminderProcessor` se ejecuta cada minuto (cron job) y busca recordatorios pendientes (`reminderAt <= now` y `notificationSent = false`).

3. **Notificación**: Para cada recordatorio pendiente:
   - Se crea una notificación en el sistema
   - Se envía una notificación WebSocket en tiempo real
   - Se marca el recordatorio como enviado

### Configuración

El sistema de recordatorios está configurado para ejecutarse automáticamente. No requiere configuración adicional.

## 📝 Notas Importantes

1. **Recordatorios**: Los recordatorios se procesan cada minuto. Para recordatorios más precisos, ajustar el cron job.

2. **Actividades Recurrentes**: Las actividades recurrentes crean una serie de instancias. La primera instancia es el "padre" y las demás son "hijas".

3. **Permisos**: Los endpoints requieren permisos `crm:read`/`crm:write`.

4. **Data Scope**: Los usuarios sin permiso `view_all` solo ven actividades asignadas a ellos o creadas por ellos.

5. **Prioridades**: Las prioridades son: `low`, `normal`, `high`, `urgent`.

6. **Estados**: Los estados de actividades son: `completed`, `scheduled`, `cancelled`.

## 🔗 Referencias

- [Análisis Completo CRM MVP](./CRM_MVP_ANALISIS_COMPLETO.md)
- [Documentación Prisma](https://www.prisma.io/docs)
- [NestJS Schedule](https://docs.nestjs.com/techniques/task-scheduling)
- [BullMQ](https://docs.bullmq.io/)

---

**Fecha de Implementación:** Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Completado - Sprint 4

