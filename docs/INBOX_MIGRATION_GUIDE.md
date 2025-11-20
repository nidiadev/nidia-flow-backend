# Guía de Migración: Bandeja Unificada (Unified Inbox)

## 📋 Resumen

Esta guía documenta los cambios realizados para implementar el módulo de Bandeja Unificada según el Sprint 3 del MVP CRM.

## 🗄️ Cambios en el Schema de Prisma

### Nuevos Modelos Agregados

1. **Conversation** - Conversaciones unificadas
   - Campos principales: `customerId`, `contactId`, `channel`, `recipient`, `status`, `assignedTo`, `priority`
   - SLA tracking: `slaMinutes`, `firstMessageAt`, `firstResponseAt`, `lastMessageAt`, `lastResponseAt`
   - Estados: `status` (open, pending, resolved, spam, archived)
   - Relaciones: `customer`, `contact`, `assignedToUser`, `createdByUser`, `messages`, `notes`

2. **Message** - Mensajes individuales en conversaciones
   - Campos: `conversationId`, `direction` (inbound/outbound), `channel`, `type`, `body`, `subject`, `bodyHtml`
   - Attachments: `attachments` (JSON array)
   - Status tracking: `status` (sent, delivered, read, failed)
   - Relaciones: `conversation`, `messageLog`

3. **ConversationNote** - Notas internas en conversaciones
   - Campos: `conversationId`, `content`, `isInternal`
   - Relaciones: `conversation`, `createdByUser`

### Cambios en Modelos Existentes

- **Customer**: Agregada relación `conversations Conversation[]`
- **CustomerContact**: Agregada relación `conversations Conversation[]`
- **User**: Agregadas relaciones `conversationsCreated Conversation[]`, `conversationsAssigned Conversation[]`, `conversationNotes ConversationNote[]`
- **MessageLog**: Agregada relación `message Message?` (opcional, uno-a-uno)

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
- `src/tenant/dto/crm/conversation.dto.ts` - DTOs completos para Conversation y Message

**Servicios:**
- `src/tenant/services/crm/conversation.service.ts` - Lógica de negocio para conversaciones
- `src/tenant/services/integrations/whatsapp.service.ts` - Estructura básica para WhatsApp
- `src/tenant/services/integrations/sendgrid.service.ts` - Estructura básica para SendGrid

**Controladores:**
- `src/tenant/controllers/crm/inbox.controller.ts` - Endpoints REST para bandeja unificada
- `src/tenant/controllers/integrations/webhooks.controller.ts` - Webhooks de proveedores

### Archivos Modificados

- `prisma/tenant-schema.prisma` - Agregados modelos Conversation, Message, ConversationNote
- `src/tenant/modules/crm.module.ts` - Integrados InboxController y ConversationService
- `src/tenant/modules/communications.module.ts` - Integrados WebhooksController y servicios de integración
- `src/tenant/services/data-scope.service.ts` - Agregado método `getConversationScope()`
- `src/common/events/business-events.ts` - Agregados eventos: `CONVERSATION_CREATED`, `CONVERSATION_ASSIGNED`, `CONVERSATION_STATUS_CHANGED`, `MESSAGE_RECEIVED`

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
# Crear conversación
POST /api/v1/crm/inbox/conversations
{
  "channel": "whatsapp",
  "recipient": "+573001234567",
  "customerId": "..."
}

# Obtener conversaciones
GET /api/v1/crm/inbox/conversations?status=open

# Obtener estadísticas
GET /api/v1/crm/inbox/conversations/stats

# Enviar mensaje
POST /api/v1/crm/inbox/conversations/:id/messages
{
  "body": "Hola, ¿cómo puedo ayudarte?"
}

# Agregar nota
POST /api/v1/crm/inbox/conversations/:id/notes
{
  "content": "Cliente muy interesado",
  "isInternal": true
}
```

## 🎯 Funcionalidades Implementadas

### Sprint 3 Completado ✅

- ✅ Modelo Conversation, Message y ConversationNote en Prisma
- ✅ DTOs completos (create, update, filter, response)
- ✅ ConversationService con lógica de bandeja unificada
- ✅ InboxController con todos los endpoints
- ✅ SLA tracking y cálculo
- ✅ Asignación de conversaciones
- ✅ Estados personalizables (open, pending, resolved, spam, archived)
- ✅ Notas internas
- ✅ Estadísticas de inbox
- ✅ Estructura básica WhatsApp (WhatsAppService)
- ✅ Estructura básica SendGrid (SendGridService)
- ✅ WebhooksController para recepción de mensajes
- ✅ Integración en CrmModule y CommunicationsModule
- ✅ Eventos de negocio para conversaciones
- ✅ DataScopeService para permisos

## 🚀 Próximos Pasos (Sprint 4+)

1. **Integración Completa WhatsApp**
   - Implementar envío real con 360Dialog/Twilio
   - Template management para mensajes aprobados
   - Media handling (imágenes, videos, documentos)
   - Verificación de webhook signatures

2. **Integración Completa SendGrid**
   - Implementar envío real de emails
   - Template management
   - Attachment handling
   - Webhook parsing completo

3. **Frontend - Vista de Inbox**
   - Lista de conversaciones
   - Vista de conversación individual
   - Envío de mensajes
   - Filtros y búsqueda

4. **Funcionalidades Avanzadas**
   - Respuestas rápidas con variables
   - SLA alerts visuales
   - Asignación automática
   - Notificaciones en tiempo real

## 📝 Notas Importantes

1. **Webhooks**: Los webhooks NO requieren autenticación JWT pero deben verificar signatures de los proveedores.

2. **SLA Tracking**: El SLA se calcula desde `firstMessageAt`. Si no hay respuesta en `slaMinutes`, se marca como violado.

3. **Conversaciones Duplicadas**: El sistema previene conversaciones duplicadas buscando por `channel` + `recipient` antes de crear.

4. **Permisos**: Los endpoints requieren permisos `crm:read`/`crm:write` o `communications:read`/`communications:write`.

5. **Data Scope**: Los usuarios sin permiso `view_all` solo ven conversaciones asignadas a ellos o creadas por ellos.

6. **Integraciones**: Los servicios de WhatsApp y SendGrid están estructurados pero requieren configuración de credenciales y implementación completa de APIs.

## 🔗 Referencias

- [Análisis Completo CRM MVP](./CRM_MVP_ANALISIS_COMPLETO.md)
- [Documentación Prisma](https://www.prisma.io/docs)
- [SendGrid API Docs](https://docs.sendgrid.com/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

**Fecha de Implementación:** Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Completado - Sprint 3

