/**
 * Business Events - Definición de todos los eventos de negocio del sistema
 * Estos eventos permiten la automatización y comunicación entre módulos
 */

// Eventos de Órdenes
export interface OrderCreatedEvent {
  orderId: string;
  orderNumber: string;
  orderType: string;
  customerId: string;
  assignedTo?: string;
  scheduledDate?: Date;
  serviceLocation?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  createdBy: string;
  timestamp: Date;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  orderNumber: string;
  oldStatus: string;
  newStatus: string;
  customerId: string;
  assignedTo?: string;
  reason?: string;
  userId: string;
  timestamp: Date;
}

export interface OrderAssignedEvent {
  orderId: string;
  orderNumber: string;
  customerId: string;
  assignedTo: string;
  assignedBy: string;
  timestamp: Date;
}

// Eventos de Tareas
export interface TaskCreatedEvent {
  taskId: string;
  orderId?: string;
  customerId?: string;
  title: string;
  type: string;
  priority: string;
  assignedTo?: string;
  scheduledStart?: Date;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  createdBy: string;
  timestamp: Date;
}

export interface TaskAssignedEvent {
  taskId: string;
  orderId?: string;
  customerId?: string;
  assignedTo: string;
  assignedBy: string;
  timestamp: Date;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  orderId?: string;
  customerId?: string;
  oldStatus: string;
  newStatus: string;
  assignedTo?: string;
  userId: string;
  timestamp: Date;
}

export interface TaskCheckedInEvent {
  taskId: string;
  orderId?: string;
  assignedTo: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
}

export interface TaskCompletedEvent {
  taskId: string;
  orderId?: string;
  customerId?: string;
  assignedTo: string;
  actualDuration?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  photos?: string[];
  signatureUrl?: string;
  timestamp: Date;
}

// Eventos de Inventario
export interface InventoryUpdatedEvent {
  productId: string;
  productVariantId?: string;
  oldQuantity: number;
  newQuantity: number;
  movementType: 'in' | 'out' | 'adjustment';
  quantity: number;
  referenceType: 'order' | 'task' | 'adjustment' | 'return';
  referenceId: string;
  reason: string;
  userId: string;
  timestamp: Date;
}

export interface StockLowAlertEvent {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  timestamp: Date;
}

// Eventos de Clientes
export interface CustomerCreatedEvent {
  customerId: string;
  customerType: 'lead' | 'prospect' | 'active';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  leadSource?: string;
  assignedTo?: string;
  createdBy: string;
  timestamp: Date;
}

export interface CustomerStatusChangedEvent {
  customerId: string;
  oldStatus: string;
  newStatus: string;
  leadScore?: number;
  assignedTo?: string;
  userId: string;
  timestamp: Date;
}

export interface LeadConvertedEvent {
  customerId: string;
  leadScore: number;
  conversionDate: Date;
  assignedTo?: string;
  firstOrderId?: string;
  timestamp: Date;
}

// Eventos de Comunicaciones
export interface MessageSentEvent {
  messageId: string;
  customerId: string;
  channel: 'whatsapp' | 'email' | 'sms';
  templateId?: string;
  subject?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentBy: string;
  timestamp: Date;
}

export interface MessageReceivedEvent {
  messageId: string;
  customerId?: string;
  channel: 'whatsapp' | 'email' | 'sms';
  content: string;
  fromNumber?: string;
  fromEmail?: string;
  timestamp: Date;
}

// Eventos de Pagos
export interface PaymentReceivedEvent {
  paymentId: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  receivedBy: string;
  timestamp: Date;
}

export interface PaymentFailedEvent {
  paymentId: string;
  orderId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

// Eventos de Sistema
export interface UserLoginEvent {
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface SystemErrorEvent {
  errorId: string;
  errorType: string;
  message: string;
  stack?: string;
  userId?: string;
  context?: Record<string, any>;
  timestamp: Date;
}

// Eventos de Auditoría
export interface AuditLogEvent {
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Eventos de Métricas
export interface MetricUpdatedEvent {
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

// Eventos de WebSocket para tiempo real
export interface WebSocketEvent {
  type: string;
  payload: any;
  tenantId: string;
  userId?: string;
  room?: string;
  timestamp: Date;
}

// Tipos de eventos para el EventEmitter
export const BusinessEventTypes = {
  // Órdenes
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  ORDER_ASSIGNED: 'order.assigned',
  
  // Tareas
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATUS_CHANGED: 'task.status.changed',
  TASK_CHECKED_IN: 'task.checked.in',
  TASK_COMPLETED: 'task.completed',
  
  // Inventario
  INVENTORY_UPDATED: 'inventory.updated',
  STOCK_LOW_ALERT: 'stock.low.alert',
  
  // Clientes
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_STATUS_CHANGED: 'customer.status.changed',
  LEAD_CONVERTED: 'lead.converted',
  
  // Comunicaciones
  MESSAGE_SENT: 'message.sent',
  MESSAGE_RECEIVED: 'message.received',
  
  // Pagos
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  
  // Sistema
  USER_LOGIN: 'user.login',
  SYSTEM_ERROR: 'system.error',
  
  // Auditoría
  AUDIT_LOG: 'audit.log',
  
  // Métricas
  METRIC_UPDATED: 'metric.updated',
  
  // WebSocket
  WEBSOCKET_BROADCAST: 'websocket.broadcast',
} as const;

export type BusinessEventType = typeof BusinessEventTypes[keyof typeof BusinessEventTypes];