/**
 * Ejemplo de automatización de generación de tareas desde órdenes
 * 
 * Este archivo muestra cómo funciona la automatización implementada en la tarea 3.5
 */

import { OrderType } from '../dto/create-order.dto';

/**
 * Ejemplo 1: Crear una orden de servicio técnico
 * 
 * Cuando se crea una orden de tipo "service", automáticamente se genera:
 * - 1 tarea de "Realizar servicio técnico" con checklist completo
 */
export const serviceOrderExample = {
  customerId: "customer-uuid-123",
  type: OrderType.SERVICE,
  items: [
    {
      description: "Reparación de aire acondicionado",
      quantity: 1,
      unitPrice: 150000,
      taxRate: 19
    }
  ],
  paymentMethod: "cash",
  scheduledDate: "2025-01-15T09:00:00Z",
  serviceAddress: "Calle 123 #45-67, Bogotá",
  assignedTo: "technician-uuid-456"
};

/**
 * Resultado automático:
 * - Se crea la orden con número ORD-20250115-000001
 * - Se genera automáticamente 1 tarea:
 *   * Título: "Realizar servicio técnico"
 *   * Tipo: VISIT
 *   * Duración estimada: 120 minutos
 *   * Checklist de 6 items:
 *     - Verificar herramientas necesarias
 *     - Contactar al cliente antes de llegar
 *     - Realizar diagnóstico inicial
 *     - Ejecutar el servicio
 *     - Probar funcionamiento
 *     - Obtener firma del cliente
 */

/**
 * Ejemplo 2: Crear una orden de instalación
 * 
 * Cuando se crea una orden de tipo "installation", automáticamente se generan:
 * - 2 tareas secuenciales con dependencias
 */
export const installationOrderExample = {
  customerId: "customer-uuid-789",
  type: OrderType.INSTALLATION,
  items: [
    {
      description: "Instalación de sistema de seguridad",
      quantity: 1,
      unitPrice: 800000,
      taxRate: 19
    }
  ],
  paymentMethod: "card",
  scheduledDate: "2025-01-16T08:00:00Z",
  serviceAddress: "Carrera 45 #123-89, Medellín",
  assignedTo: "installer-uuid-789"
};

/**
 * Resultado automático:
 * - Se crea la orden con número ORD-20250116-000001
 * - Se generan automáticamente 2 tareas:
 *   1. "Preparación para instalación" (30 min)
 *      - Verificar herramientas de instalación
 *      - Confirmar materiales necesarios
 *      - Revisar planos o especificaciones
 *   
 *   2. "Instalación del producto" (180 min)
 *      - Preparar área de instalación
 *      - Instalar producto según especificaciones
 *      - Realizar pruebas de funcionamiento
 *      - Capacitar al cliente en uso básico
 *      - Obtener firma de conformidad
 */

/**
 * Ejemplo 3: Flujo completo de trabajo con dependencias
 */
export const workflowExample = {
  // 1. Se crea la orden
  order: installationOrderExample,
  
  // 2. Automáticamente se generan las tareas
  generatedTasks: [
    {
      id: "task-prep-uuid",
      title: "Preparación para instalación",
      status: "pending",
      dependencies: [] // Sin dependencias
    },
    {
      id: "task-install-uuid", 
      title: "Instalación del producto",
      status: "pending",
      dependencies: ["task-prep-uuid"] // Depende de la preparación
    }
  ],
  
  // 3. El técnico puede iniciar solo la primera tarea
  availableActions: [
    "Asignar tarea de preparación",
    "Hacer check-in en preparación"
  ],
  
  // 4. Una vez completada la preparación, se habilita la instalación
  afterPrepCompletion: [
    "Asignar tarea de instalación",
    "Hacer check-in en instalación"
  ]
};

/**
 * Ejemplo 4: API calls para el flujo completo
 */
export const apiCallsExample = {
  // 1. Crear orden (automáticamente genera tareas)
  createOrder: {
    method: "POST",
    url: "/orders",
    body: serviceOrderExample,
    response: {
      id: "order-uuid-123",
      orderNumber: "ORD-20250115-000001",
      status: "pending",
      // ... otros campos
    }
  },
  
  // 2. Listar tareas generadas automáticamente
  getTasks: {
    method: "GET", 
    url: "/tasks?orderId=order-uuid-123",
    response: {
      data: [
        {
          id: "task-uuid-456",
          title: "Realizar servicio técnico",
          status: "pending",
          orderId: "order-uuid-123",
          checklist: [
            { item: "Verificar herramientas necesarias", isCompleted: false },
            // ... más items
          ]
        }
      ]
    }
  },
  
  // 3. Asignar tarea al técnico
  assignTask: {
    method: "POST",
    url: "/tasks/task-uuid-456/assign/technician-uuid-456",
    response: {
      id: "task-uuid-456",
      status: "assigned",
      assignedTo: "technician-uuid-456"
    }
  },
  
  // 4. Técnico hace check-in
  checkIn: {
    method: "POST",
    url: "/tasks/task-uuid-456/checkin",
    body: {
      latitude: 4.6097100,
      longitude: -74.0817500,
      notes: "Llegué al sitio, iniciando servicio"
    },
    response: {
      status: "in_progress",
      checkinTime: "2025-01-15T09:15:00Z"
    }
  },
  
  // 5. Completar items del checklist
  completeChecklistItem: {
    method: "PATCH",
    url: "/tasks/checklist/checklist-item-uuid/complete",
    response: {
      isCompleted: true,
      completedAt: "2025-01-15T09:30:00Z"
    }
  },
  
  // 6. Técnico hace check-out (completa tarea)
  checkOut: {
    method: "POST",
    url: "/tasks/task-uuid-456/checkout", 
    body: {
      latitude: 4.6097100,
      longitude: -74.0817500,
      completionNotes: "Servicio completado exitosamente",
      photos: ["https://s3.amazonaws.com/photo1.jpg"],
      signatureUrl: "https://s3.amazonaws.com/signature.png"
    },
    response: {
      status: "completed",
      completedAt: "2025-01-15T11:15:00Z",
      actualDurationMinutes: 120
    }
  }
};

/**
 * Beneficios de la automatización implementada:
 * 
 * 1. **Consistencia**: Todas las órdenes del mismo tipo generan las mismas tareas
 * 2. **Eficiencia**: No hay que crear tareas manualmente
 * 3. **Checklists estandarizados**: Garantiza que se sigan todos los pasos
 * 4. **Dependencias automáticas**: Las tareas se ejecutan en el orden correcto
 * 5. **Trazabilidad**: Todo queda registrado automáticamente
 * 6. **Escalabilidad**: Fácil agregar nuevos tipos de órdenes y tareas
 */