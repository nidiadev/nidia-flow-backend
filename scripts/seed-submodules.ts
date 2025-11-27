#!/usr/bin/env ts-node

/**
 * Script para crear todos los submódulos del sistema
 * Basado en el análisis completo de módulos y funcionalidades
 */

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

interface SubModuleDefinition {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  path?: string;
  sortOrder: number;
  permissions: string[];
}

const subModulesByModule: Record<string, SubModuleDefinition[]> = {
  crm: [
    {
      name: 'customers',
      displayName: 'Clientes',
      description: 'Gestión completa de clientes, leads y prospects',
      icon: 'Users',
      path: '/crm/customers',
      sortOrder: 1,
      permissions: ['crm:read', 'crm:write', 'crm:customers:read', 'crm:customers:write', 'crm:customers:delete'],
    },
    {
      name: 'customer-contacts',
      displayName: 'Contactos de Clientes',
      description: 'Gestión de contactos y personas de contacto de clientes',
      icon: 'UserCircle',
      path: '/crm/contacts',
      sortOrder: 2,
      permissions: ['crm:read', 'crm:write', 'crm:customers:read', 'crm:customers:write'],
    },
    {
      name: 'pipeline',
      displayName: 'Pipeline',
      description: 'Vista Kanban del pipeline de oportunidades (Deals)',
      icon: 'TrendingUp',
      path: '/crm/pipeline',
      sortOrder: 3,
      permissions: ['crm:read', 'crm:write', 'crm:deals:read', 'crm:deals:write'],
    },
    {
      name: 'inbox',
      displayName: 'Bandeja Unificada',
      description: 'Bandeja única para WhatsApp, Email y SMS',
      icon: 'Inbox',
      path: '/crm/inbox',
      sortOrder: 4,
      permissions: ['crm:read', 'crm:write', 'crm:conversations:read', 'crm:conversations:write'],
    },
    {
      name: 'calendar',
      displayName: 'Calendario',
      description: 'Vista de calendario para actividades y reuniones',
      icon: 'Calendar',
      path: '/crm/calendar',
      sortOrder: 5,
      permissions: ['crm:read', 'crm:write', 'crm:activities:read', 'crm:activities:write'],
    },
    {
      name: 'smart-lists',
      displayName: 'Listas Inteligentes',
      description: 'Segmentación dinámica de clientes con filtros avanzados',
      icon: 'List',
      path: '/crm/smart-lists',
      sortOrder: 6,
      permissions: ['crm:read', 'crm:write', 'crm:segments:read', 'crm:segments:write'],
    },
    {
      name: 'lead-scoring',
      displayName: 'Lead Scoring',
      description: 'Sistema de puntuación automática de leads',
      icon: 'TrendingUp',
      path: '/crm/lead-scoring',
      sortOrder: 7,
      permissions: ['crm:read', 'crm:write', 'crm:scoring:read', 'crm:scoring:write'],
    },
    {
      name: 'reports',
      displayName: 'Reportes CRM',
      description: 'Reportes y KPIs del CRM (pipeline, conversión, forecast)',
      icon: 'BarChart3',
      path: '/crm/reports',
      sortOrder: 8,
      permissions: ['crm:read', 'reports:read', 'crm:reports:read'],
    },
    {
      name: 'workflows',
      displayName: 'Automatizaciones',
      description: 'Workflows y automatizaciones del CRM',
      icon: 'Zap',
      path: '/crm/workflows',
      sortOrder: 9,
      permissions: ['crm:read', 'crm:write', 'crm:workflows:read', 'crm:workflows:write'],
    },
    {
      name: 'web-forms',
      displayName: 'Formularios Web',
      description: 'Constructor de formularios embebibles para captura de leads',
      icon: 'FileEdit',
      path: '/crm/web-forms',
      sortOrder: 10,
      permissions: ['crm:read', 'crm:write', 'crm:forms:read', 'crm:forms:write'],
    },
  ],
  products: [
    {
      name: 'catalog',
      displayName: 'Catálogo de Productos',
      description: 'Gestión completa de productos, servicios y combos',
      icon: 'Package',
      path: '/products/catalog',
      sortOrder: 1,
      permissions: ['read', 'write', 'delete'],
    },
    {
      name: 'categories',
      displayName: 'Categorías',
      description: 'Sistema jerárquico de categorías de productos',
      icon: 'FolderTree',
      path: '/products/categories',
      sortOrder: 2,
      permissions: ['read', 'write', 'delete'],
    },
    {
      name: 'variants',
      displayName: 'Variantes',
      description: 'Gestión de variantes (tallas, colores, modelos)',
      icon: 'Layers',
      path: '/products/variants',
      sortOrder: 3,
      permissions: ['read', 'write', 'delete'],
    },
    {
      name: 'pricing',
      displayName: 'Gestión de Precios',
      description: 'Configuración de precios, descuentos e impuestos',
      icon: 'Tag',
      path: '/products/pricing',
      sortOrder: 4,
      permissions: ['read', 'write'],
    },
  ],
  orders: [
    {
      name: 'management',
      displayName: 'Gestión de Órdenes',
      description: 'Creación, edición y seguimiento de órdenes',
      icon: 'ShoppingCart',
      path: '/orders',
      sortOrder: 1,
      permissions: ['read', 'write', 'delete'],
    },
    {
      name: 'scheduling',
      displayName: 'Programación',
      description: 'Agendamiento de servicios y entregas',
      icon: 'Calendar',
      path: '/orders/scheduling',
      sortOrder: 2,
      permissions: ['read', 'write'],
    },
    {
      name: 'tracking',
      displayName: 'Seguimiento',
      description: 'Tracking de estado y ubicación de órdenes',
      icon: 'MapPin',
      path: '/orders/tracking',
      sortOrder: 3,
      permissions: ['read'],
    },
    {
      name: 'history',
      displayName: 'Historial',
      description: 'Historial completo de órdenes',
      icon: 'History',
      path: '/orders/history',
      sortOrder: 4,
      permissions: ['read'],
    },
  ],
  tasks: [
    {
      name: 'management',
      displayName: 'Gestión de Tareas',
      description: 'Creación, asignación y seguimiento de tareas',
      icon: 'CheckSquare',
      path: '/tasks',
      sortOrder: 1,
      permissions: ['read', 'write', 'delete'],
    },
    {
      name: 'scheduling',
      displayName: 'Programación',
      description: 'Agendamiento y calendarización de tareas',
      icon: 'Calendar',
      path: '/tasks/scheduling',
      sortOrder: 2,
      permissions: ['read', 'write'],
    },
    {
      name: 'checklists',
      displayName: 'Listas de Verificación',
      description: 'Checklists y validaciones por tarea',
      icon: 'ListChecks',
      path: '/tasks/checklists',
      sortOrder: 3,
      permissions: ['read', 'write'],
    },
    {
      name: 'gps-tracking',
      displayName: 'Seguimiento GPS',
      description: 'Check-in/check-out con geolocalización',
      icon: 'MapPin',
      path: '/tasks/gps',
      sortOrder: 4,
      permissions: ['read', 'write'],
    },
    {
      name: 'evidence',
      displayName: 'Evidencia',
      description: 'Fotos, firmas y documentación de tareas',
      icon: 'Camera',
      path: '/tasks/evidence',
      sortOrder: 5,
      permissions: ['read', 'write'],
    },
    {
      name: 'dependencies',
      displayName: 'Dependencias',
      description: 'Gestión de dependencias entre tareas',
      icon: 'GitBranch',
      path: '/tasks/dependencies',
      sortOrder: 6,
      permissions: ['read', 'write'],
    },
  ],
  accounting: [
    {
      name: 'transactions',
      displayName: 'Transacciones',
      description: 'Gestión de ingresos y gastos',
      icon: 'Receipt',
      path: '/accounting/transactions',
      sortOrder: 1,
      permissions: ['read', 'write', 'delete'],
    },
    {
      name: 'bank-accounts',
      displayName: 'Cuentas Bancarias',
      description: 'Gestión de múltiples cuentas bancarias',
      icon: 'Building2',
      path: '/accounting/bank-accounts',
      sortOrder: 2,
      permissions: ['read', 'write'],
    },
    {
      name: 'budgets',
      displayName: 'Presupuestos',
      description: 'Categorías de presupuesto y análisis',
      icon: 'PiggyBank',
      path: '/accounting/budgets',
      sortOrder: 3,
      permissions: ['read', 'write'],
    },
    {
      name: 'reports',
      displayName: 'Reportes Financieros',
      description: 'Reportes de flujo de caja y rentabilidad',
      icon: 'FileText',
      path: '/accounting/reports',
      sortOrder: 4,
      permissions: ['read'],
    },
  ],
  reports: [
    {
      name: 'saved',
      displayName: 'Reportes Guardados',
      description: 'Creación y gestión de reportes guardados',
      icon: 'Bookmark',
      path: '/reports/saved',
      sortOrder: 1,
      permissions: ['read', 'write', 'delete'],
    },
    {
      name: 'execution',
      displayName: 'Ejecución',
      description: 'Ejecución manual y programada de reportes',
      icon: 'Play',
      path: '/reports/execution',
      sortOrder: 2,
      permissions: ['read', 'write'],
    },
    {
      name: 'types',
      displayName: 'Tipos de Reportes',
      description: 'Ventas, tareas, clientes, financieros, inventario',
      icon: 'FileBarChart',
      path: '/reports/types',
      sortOrder: 3,
      permissions: ['read'],
    },
  ],
  integrations: [
    {
      name: 'api-keys',
      displayName: 'API Keys',
      description: 'Gestión de claves API para integraciones',
      icon: 'Key',
      path: '/integrations/api-keys',
      sortOrder: 1,
      permissions: ['read', 'write'],
    },
    {
      name: 'webhooks',
      displayName: 'Webhooks',
      description: 'Configuración de webhooks para eventos',
      icon: 'Webhook',
      path: '/integrations/webhooks',
      sortOrder: 2,
      permissions: ['read', 'write'],
    },
    {
      name: 'external-services',
      displayName: 'Servicios Externos',
      description: 'Integración con servicios de terceros',
      icon: 'Plug',
      path: '/integrations/external',
      sortOrder: 3,
      permissions: ['read', 'write'],
    },
  ],
};

async function seedSubModules() {
  try {
    console.log('🌱 Iniciando seed de submódulos...\n');

    // Obtener todos los módulos existentes
    const modules = await prisma.moduleDefinition.findMany({
      where: { isActive: true },
    });

    const moduleMap = new Map(modules.map((m) => [m.name, m]));

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const [moduleName, subModules] of Object.entries(subModulesByModule)) {
      const module = moduleMap.get(moduleName);

      if (!module) {
        console.log(`⚠️  Módulo "${moduleName}" no encontrado, saltando...`);
        continue;
      }

      console.log(`\n📦 Módulo: ${module.displayName} (${module.name})`);

      for (const subModule of subModules) {
        const existing = await prisma.subModuleDefinition.findUnique({
          where: {
            moduleId_name: {
              moduleId: module.id,
              name: subModule.name,
            },
          },
        });

        if (existing) {
          // Actualizar submódulo existente
          await prisma.subModuleDefinition.update({
            where: { id: existing.id },
            data: {
              displayName: subModule.displayName,
              description: subModule.description,
              icon: subModule.icon,
              path: subModule.path,
              sortOrder: subModule.sortOrder,
              permissions: subModule.permissions,
              isActive: true,
              isVisible: true,
            },
          });
          totalUpdated++;
          console.log(`   ✓ Actualizado: ${subModule.displayName}`);
        } else {
          // Crear nuevo submódulo
          await prisma.subModuleDefinition.create({
            data: {
              moduleId: module.id,
              name: subModule.name,
              displayName: subModule.displayName,
              description: subModule.description,
              icon: subModule.icon,
              path: subModule.path,
              sortOrder: subModule.sortOrder,
              permissions: subModule.permissions,
              isActive: true,
              isVisible: true,
            },
          });
          totalCreated++;
          console.log(`   ✅ Creado: ${subModule.displayName}`);
        }
      }
    }

    console.log(`\n\n✨ Seed completado:`);
    console.log(`   - Submódulos creados: ${totalCreated}`);
    console.log(`   - Submódulos actualizados: ${totalUpdated}`);
    console.log(`   - Total procesado: ${totalCreated + totalUpdated}`);
  } catch (error) {
    console.error('❌ Error en seed de submódulos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSubModules();
