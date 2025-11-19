import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const modules = [
  {
    name: 'crm',
    displayName: 'CRM',
    description: 'Gestión de relaciones con clientes',
    icon: 'Users',
    path: '/crm',
    category: 'business',
    sortOrder: 1,
    isActive: true,
    isVisible: true,
    metadata: {
      permissions: ['crm:read', 'crm:write'],
    },
  },
  {
    name: 'products',
    displayName: 'Productos',
    description: 'Gestión de productos y catálogo',
    icon: 'Package',
    path: '/products',
    category: 'business',
    sortOrder: 2,
    isActive: true,
    isVisible: true,
    metadata: {
      permissions: ['products:read', 'products:write'],
    },
  },
  {
    name: 'orders',
    displayName: 'Órdenes',
    description: 'Gestión de órdenes y pedidos',
    icon: 'ShoppingCart',
    path: '/orders',
    category: 'business',
    sortOrder: 3,
    isActive: true,
    isVisible: true,
    metadata: {
      permissions: ['orders:read', 'orders:write'],
    },
  },
  {
    name: 'tasks',
    displayName: 'Operaciones',
    description: 'Gestión de tareas y operaciones de campo',
    icon: 'CheckSquare',
    path: '/tasks',
    category: 'operations',
    sortOrder: 4,
    isActive: true,
    isVisible: true,
    metadata: {
      permissions: ['tasks:read', 'tasks:write'],
    },
  },
  {
    name: 'accounting',
    displayName: 'Contabilidad',
    description: 'Gestión contable y financiera',
    icon: 'DollarSign',
    path: '/accounting',
    category: 'finance',
    sortOrder: 5,
    isActive: true,
    isVisible: true,
    metadata: {
      permissions: ['accounting:read', 'accounting:write'],
    },
  },
  {
    name: 'reports',
    displayName: 'Reportes',
    description: 'Generación de reportes y análisis',
    icon: 'BarChart3',
    path: '/reports',
    category: 'analytics',
    sortOrder: 6,
    isActive: true,
    isVisible: true,
    metadata: {
      permissions: ['reports:read', 'reports:write'],
    },
  },
  {
    name: 'integrations',
    displayName: 'Integraciones',
    description: 'Conecta con servicios externos y APIs',
    icon: 'Plug',
    path: '/integrations',
    category: 'integrations',
    sortOrder: 7,
    isActive: true,
    isVisible: true,
    metadata: {
      permissions: ['integrations:read', 'integrations:write'],
    },
  },
];

async function seedModules() {
  try {
    console.log('🌱 Seeding modules...');

    for (const moduleData of modules) {
      const existing = await prisma.moduleDefinition.findUnique({
        where: { name: moduleData.name },
      });

      if (existing) {
        console.log(`⏭️  Module "${moduleData.name}" already exists, skipping...`);
        continue;
      }

      const module = await prisma.moduleDefinition.create({
        data: moduleData,
      });

      console.log(`✅ Created module: ${module.name}`);
    }

    console.log('✅ Modules seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding modules:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedModules();

