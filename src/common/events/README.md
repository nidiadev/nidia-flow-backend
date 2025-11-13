# Sistema de Eventos y Automatización - NIDIA Flow

Este módulo implementa un sistema completo de eventos de negocio, automatización y tiempo real para NIDIA Flow.

## 🚀 Características Principales

### 1. **Eventos de Negocio Tipados**
- Eventos centralizados y tipados con TypeScript
- Emisión y escucha de eventos de forma type-safe
- Logging automático de todos los eventos

### 2. **Motor de Automatización**
- Hooks inteligentes que responden a eventos de negocio
- Generación automática de tareas desde órdenes
- Actualización automática de inventario y métricas
- Seguimiento automático de leads y conversiones

### 3. **WebSocket en Tiempo Real**
- Actualizaciones en tiempo real para todos los clientes conectados
- Rooms por tenant para aislamiento de datos
- Notificaciones push automáticas
- Tracking de ubicación GPS en tiempo real

### 4. **Auditoría Automática**
- Logging automático de todas las acciones críticas
- Trazabilidad completa de cambios
- Filtros avanzados para consulta de logs

### 5. **Métricas en Tiempo Real**
- Actualización automática de KPIs
- Dashboard de métricas de negocio
- Métricas de performance del sistema

## 📋 Eventos Disponibles

### Órdenes
- `order.created` - Nueva orden creada
- `order.status.changed` - Cambio de estado de orden
- `order.assigned` - Orden asignada a usuario

### Tareas
- `task.created` - Nueva tarea creada
- `task.assigned` - Tarea asignada a usuario
- `task.status.changed` - Cambio de estado de tarea
- `task.checked.in` - Check-in en tarea
- `task.completed` - Tarea completada

### Clientes
- `customer.created` - Nuevo cliente creado
- `customer.status.changed` - Cambio de estado de cliente
- `lead.converted` - Lead convertido a cliente

### Inventario
- `inventory.updated` - Inventario actualizado
- `stock.low.alert` - Alerta de stock bajo

### Comunicaciones
- `message.sent` - Mensaje enviado
- `message.received` - Mensaje recibido

### Pagos
- `payment.received` - Pago recibido
- `payment.failed` - Pago fallido

### Sistema
- `user.login` - Usuario logueado
- `system.error` - Error del sistema
- `audit.log` - Log de auditoría
- `metric.updated` - Métrica actualizada

## 🔧 Uso del Sistema

### 1. Emitir Eventos

```typescript
import { BusinessEventEmitterService, BusinessEventTypes } from '../common/events';

@Injectable()
export class MyService {
  constructor(private eventEmitter: BusinessEventEmitterService) {}

  async createOrder(orderData: any, userId: string) {
    // ... lógica de creación de orden

    // Emitir evento
    await this.eventEmitter.emit(BusinessEventTypes.ORDER_CREATED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderType: order.type,
      customerId: order.customerId,
      assignedTo: order.assignedTo,
      total: order.total,
      createdBy: userId,
      timestamp: new Date(),
    });
  }
}
```

### 2. Escuchar Eventos para Automatización

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { BusinessEventTypes, OrderCreatedEvent } from '../common/events';

@Injectable()
export class MyAutomationService {
  @OnEvent(BusinessEventTypes.ORDER_CREATED)
  async handleOrderCreated(event: OrderCreatedEvent) {
    // Generar tareas automáticamente
    await this.generateTasksForOrder(event.orderId, event.orderType);
    
    // Enviar notificación al cliente
    await this.sendOrderConfirmation(event.customerId, event.orderNumber);
  }
}
```

### 3. Broadcasting WebSocket

```typescript
// Automático - Los eventos se propagan automáticamente via WebSocket

// Manual
await this.eventEmitter.emitWebSocketEvent(
  tenantId,
  'order_updated',
  { orderId: '123', status: 'completed' },
  { userId: 'user-123' } // Opcional: enviar solo a usuario específico
);
```

### 4. Métricas Automáticas

```typescript
// Las métricas se actualizan automáticamente basadas en eventos
// También se pueden actualizar manualmente:

await this.eventEmitter.emit(BusinessEventTypes.METRIC_UPDATED, {
  metricName: 'custom_metric',
  metricType: 'counter',
  value: 1,
  labels: { category: 'sales' },
  timestamp: new Date(),
});
```

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Events Module                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Event Emitter   │ Automation      │ WebSocket Service       │
│ Service         │ Engine          │                         │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Audit Logger    │ Metrics         │ Events Controller       │
│ Service         │ Service         │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                Business Services                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Orders Service  │ Tasks Service   │ Customer Service        │
│                 │                 │                         │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Products        │ Communications  │ Financial Services      │
│ Service         │ Service         │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🔄 Flujo de Automatización

### Ejemplo: Creación de Orden → Generación de Tareas

1. **Usuario crea orden** → `OrdersService.create()`
2. **Se emite evento** → `BusinessEventTypes.ORDER_CREATED`
3. **Motor de automatización escucha** → `AutomationEngineService.handleOrderCreated()`
4. **Se generan tareas automáticamente** basadas en el tipo de orden
5. **Se emiten eventos de tareas** → `BusinessEventTypes.TASK_CREATED`
6. **WebSocket propaga cambios** → Clientes reciben actualizaciones en tiempo real
7. **Se registra auditoría** → `AuditLoggerService` registra todas las acciones
8. **Se actualizan métricas** → `MetricsService` actualiza KPIs

## 📊 Métricas Disponibles

### Dashboard Principal
- Total de órdenes (hoy/semana/mes)
- Tareas completadas y tasa de completación
- Nuevos clientes y conversiones
- Revenue total y valor promedio de orden

### Performance
- Duración promedio de tareas
- Tiempo de procesamiento de órdenes
- Distribución de estados de tareas y órdenes

### Negocio
- Conversión de leads
- Fuentes de leads más efectivas
- Performance por usuario asignado

## 🔐 Seguridad

- **Aislamiento por tenant**: Todos los eventos respetan el contexto del tenant
- **Autenticación JWT**: WebSocket requiere token válido
- **Validación de permisos**: Los eventos respetan los permisos del usuario
- **Auditoría completa**: Todas las acciones se registran con usuario e IP

## 🚀 Endpoints API

### Estadísticas del Sistema
```
GET /events/stats
```

### Logs de Auditoría
```
GET /events/audit-logs?entityType=order&dateFrom=2024-01-01
```

### Métricas del Dashboard
```
GET /events/metrics/dashboard?period=week
```

### Métricas de Performance
```
GET /events/metrics/performance
```

### Testing (Solo desarrollo)
```
POST /events/test/notification
POST /events/test/event
POST /events/test/metric
```

## 🔧 Configuración

El sistema se configura automáticamente al importar `EventsModule` en `AppModule`. 

### Variables de Entorno

```env
# JWT para WebSocket
JWT_SECRET=your-secret-key

# Frontend URL para CORS
FRONTEND_URL=http://localhost:3000

# Nivel de logging
LOG_LEVEL=debug
```

## 🧪 Testing

### Emitir Evento de Prueba
```bash
curl -X POST http://localhost:3001/events/test/event \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "order.created",
    "payload": {
      "orderId": "test-123",
      "orderNumber": "ORD-TEST-001",
      "customerId": "customer-123"
    }
  }'
```

### Conectar WebSocket (Frontend)
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001/events', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('business_event', (event) => {
  console.log('Received event:', event);
});

socket.on('notification', (notification) => {
  console.log('Received notification:', notification);
});
```

## 📈 Monitoreo

### Logs Estructurados
Todos los eventos generan logs estructurados que incluyen:
- Timestamp
- Tipo de evento
- Payload del evento
- Usuario que lo generó
- Duración del procesamiento

### Métricas de Sistema
- Número de eventos emitidos por tipo
- Tiempo de procesamiento de eventos
- Conexiones WebSocket activas
- Errores en el procesamiento

## 🔮 Próximas Funcionalidades

- [ ] **Reglas de automatización configurables** - Permitir configurar reglas desde la UI
- [ ] **Webhooks externos** - Enviar eventos a sistemas externos
- [ ] **Retry automático** - Reintentar eventos fallidos
- [ ] **Event sourcing** - Almacenar todos los eventos para replay
- [ ] **Métricas avanzadas** - Histogramas y percentiles
- [ ] **Alertas inteligentes** - Alertas basadas en patrones de eventos

---

## 📝 Notas de Implementación

Este sistema está diseñado para ser:
- **Escalable**: Soporta múltiples tenants y alta concurrencia
- **Confiable**: Manejo robusto de errores y logging completo
- **Extensible**: Fácil agregar nuevos eventos y automatizaciones
- **Performante**: Procesamiento asíncrono y caché inteligente
- **Mantenible**: Código bien estructurado y documentado