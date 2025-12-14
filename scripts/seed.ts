#!/usr/bin/env ts-node

import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create super admin user
    const adminEmail = 'nidia.dev.co@gmail.com';
    const adminPassword = 'nidia123';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          firstName: 'Camilo',
          lastName: 'Bastidas',
          systemRole: 'super_admin',
          emailVerified: true,
          isActive: true,
          language: 'es',
          timezone: 'America/Bogota',
        },
      });

      console.log('✅ Super admin user created:', {
        id: admin.id,
        email: admin.email,
        name: `${admin.firstName} ${admin.lastName}`,
        role: admin.systemRole,
      });
    } else {
      console.log('ℹ️  Super admin user already exists');
    }

    // MODULES SEEDING
    console.log('📦 Seeding modules...');

    const modules = [
      {
        name: 'products',
        displayName: 'Catálogo',
        description: 'Gestión de productos, servicios y combos',
        icon: 'Package',
        path: '/products',
        category: 'operations',
        sortOrder: 1,
        isActive: true,
        isVisible: true,
        subModules: [
          {
            name: 'catalog',
            displayName: 'Productos',
            description: 'Listado de productos',
            icon: 'List',
            path: '/products/catalog',
            sortOrder: 1,
            isActive: true,
            isVisible: true,
          },
          {
            name: 'categories',
            displayName: 'Categorías',
            description: 'Gestión de categorías',
            icon: 'Layers',
            path: '/products/categories',
            sortOrder: 2,
            isActive: true,
            isVisible: true,
          },
          {
            name: 'variants',
            displayName: 'Variantes',
            description: 'Gestión de variantes',
            icon: 'Copy',
            path: '/products/variants',
            sortOrder: 3,
            isActive: true,
            isVisible: true,
          },
          {
            name: 'attributes',
            displayName: 'Atributos',
            description: 'Gestión de atributos globales',
            icon: 'List',
            path: '/products/attributes',
            sortOrder: 4,
            isActive: true,
            isVisible: true,
          },
          {
            name: 'inventory',
            displayName: 'Inventario',
            description: 'Movimientos de inventario',
            icon: 'ArrowRightLeft',
            path: '/products/inventory',
            sortOrder: 5,
            isActive: true,
            isVisible: true,
          },
           {
            name: 'warehouses',
            displayName: 'Bodegas',
            description: 'Gestión de bodegas y sucursales',
            icon: 'Building2',
            path: '/products/warehouses',
            sortOrder: 6,
            isActive: true,
            isVisible: true,
          },
          {
            name: 'pricing',
            displayName: 'Precios',
            description: 'Gestión de precios',
            icon: 'DollarSign',
            path: '/products/pricing',
            sortOrder: 7,
            isActive: true,
            isVisible: true,
          },
          {
            name: 'alerts',
            displayName: 'Alertas',
            description: 'Alertas de stock',
            icon: 'Bell',
            path: '/products/alerts',
            sortOrder: 8,
            isActive: true,
            isVisible: true,
          },
        ],
      },
      // ... other modules can remain or be re-added if this seed is meant to be idempotent
    ];

    for (const moduleData of modules) {
      // Upsert module
      const module = await prisma.moduleDefinition.upsert({
        where: { name: moduleData.name },
        update: {
            displayName: moduleData.displayName,
            description: moduleData.description,
            icon: moduleData.icon,
            path: moduleData.path,
            category: moduleData.category,
            sortOrder: moduleData.sortOrder,
            isActive: moduleData.isActive,
            isVisible: moduleData.isVisible,
        },
        create: {
            name: moduleData.name,
            displayName: moduleData.displayName,
            description: moduleData.description,
            icon: moduleData.icon,
            path: moduleData.path,
            category: moduleData.category,
            sortOrder: moduleData.sortOrder,
            isActive: moduleData.isActive,
            isVisible: moduleData.isVisible,
        },
      });
      console.log(`✅ Module upserted: ${module.name}`);

      // Upsert submodules
      for (const subModuleData of moduleData.subModules) {
        const subModule = await prisma.subModuleDefinition.upsert({
          where: {
            moduleId_name: {
              moduleId: module.id,
              name: subModuleData.name,
            },
          },
          update: {
            displayName: subModuleData.displayName,
            description: subModuleData.description,
            icon: subModuleData.icon,
            path: subModuleData.path,
            sortOrder: subModuleData.sortOrder,
            isActive: subModuleData.isActive,
            isVisible: subModuleData.isVisible,
          },
          create: {
            moduleId: module.id,
            name: subModuleData.name,
            displayName: subModuleData.displayName,
            description: subModuleData.description,
            icon: subModuleData.icon,
            path: subModuleData.path,
            sortOrder: subModuleData.sortOrder,
            isActive: subModuleData.isActive,
            isVisible: subModuleData.isVisible,
          },
        });
        console.log(`  - SubModule upserted: ${subModule.name}`);
      }
    }

    // Create default plans (prices in Colombian Pesos - COP)
    const plans = [
      {
        name: 'free',
        displayName: 'Plan Gratuito',
        description: 'Plan básico para empezar. Tu propia base de datos privada y segura, sin costo inicial.',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'COP',
        maxUsers: 3,
        maxStorageGb: 1,
        maxMonthlyEmails: 1000,
        maxMonthlyWhatsapp: 500,
        maxMonthlyApiCalls: 10000,
        features: ['basic_crm', 'basic_tasks'],
        enabledModules: ['crm', 'tasks'],
        badge: null,
        badgeColor: null,
        accentColor: 'green',
        featuredFeatures: ['Base de datos dedicada', '3 usuarios', 'Módulos básicos'],
        isVisible: true,
        sortOrder: 1,
      },
      {
        name: 'basic',
        displayName: 'Plan Básico',
        description: 'Para pequeñas empresas en crecimiento. Más recursos con tu propia base de datos privada.',
        priceMonthly: 120000,
        priceYearly: 1200000,
        currency: 'COP',
        maxUsers: 10,
        maxStorageGb: 5,
        maxMonthlyEmails: 5000,
        maxMonthlyWhatsapp: 2000,
        maxMonthlyApiCalls: 50000,
        features: ['full_crm', 'task_management', 'basic_reports'],
        enabledModules: ['crm', 'tasks', 'reports', 'products', 'orders'],
        badge: 'Popular',
        badgeColor: 'blue',
        accentColor: 'blue',
        featuredFeatures: ['Base de datos dedicada', '10 usuarios', 'Todos los módulos básicos', 'Soporte por email'],
        isVisible: true,
        sortOrder: 2,
      },
      {
        name: 'professional',
        displayName: 'Plan Profesional',
        description: 'Base de datos completamente aislada. Máxima seguridad y personalización para empresas establecidas.',
        priceMonthly: 320000,
        priceYearly: 3200000,
        currency: 'COP',
        maxUsers: 25,
        maxStorageGb: 50,
        maxMonthlyEmails: 20000,
        maxMonthlyWhatsapp: 10000,
        maxMonthlyApiCalls: 200000,
        features: ['full_crm', 'advanced_tasks', 'advanced_reports', 'integrations', 'accounting'],
        enabledModules: ['crm', 'tasks', 'reports', 'products', 'orders', 'accounting', 'communications'],
        badge: 'Recomendado',
        badgeColor: 'purple',
        accentColor: 'purple',
        featuredFeatures: ['Base de datos dedicada', '25 usuarios', 'API avanzado', 'Soporte prioritario', 'Customizaciones'],
        isVisible: true,
        sortOrder: 3,
      },
    ];

    for (const planData of plans) {
      const existingPlan = await prisma.plan.findUnique({
        where: { name: planData.name },
      });

      if (!existingPlan) {
        await prisma.plan.create({
          data: {
            ...planData,
            features: planData.features || {},
            enabledModules: planData.enabledModules || [],
            featuredFeatures: planData.featuredFeatures || null,
          },
        });
        console.log(`✅ Plan created: ${planData.displayName}`);
      } else {
        // Update existing plan with new fields
        await prisma.plan.update({
          where: { name: planData.name },
          data: {
            ...planData,
            features: planData.features || {},
            enabledModules: planData.enabledModules || [],
            featuredFeatures: planData.featuredFeatures || null,
          },
        });
        console.log(`✅ Plan updated: ${planData.displayName}`);
      }
    }

    // Create system settings
    const systemSettings = [
      {
        key: 'app_name',
        value: 'NIDIA Flow',
        description: 'Application name',
        isPublic: true,
      },
      {
        key: 'app_version',
        value: '1.0.0',
        description: 'Application version',
        isPublic: true,
      },
      {
        key: 'maintenance_mode',
        value: false,
        description: 'Maintenance mode flag',
        isPublic: true,
      },
      {
        key: 'max_tenants',
        value: 1000,
        description: 'Maximum number of tenants allowed',
        isPublic: false,
      },
      {
        key: 'default_trial_days',
        value: 30,
        description: 'Default trial period in days',
        isPublic: false,
      },
    ];

    for (const settingData of systemSettings) {
      const existingSetting = await prisma.systemSetting.findUnique({
        where: { key: settingData.key },
      });

      if (!existingSetting) {
        await prisma.systemSetting.create({
          data: {
            key: settingData.key,
            value: settingData.value,
            description: settingData.description,
            isPublic: settingData.isPublic,
          },
        });
        console.log(`✅ System setting created: ${settingData.key}`);
      } else {
        console.log(`ℹ️  System setting already exists: ${settingData.key}`);
      }
    }

    // Create coupons (in Colombian Pesos - COP)
    const coupons = [
      {
        code: 'WELCOME30',
        name: 'Bienvenida 30%',
        description: 'Descuento de bienvenida del 30%',
        discountType: 'percentage',
        discountValue: 30.00,
        currency: 'COP',
        appliesTo: 'all',
        applicablePlanIds: [],
        maxRedemptions: 1000,
        maxRedemptionsPerTenant: 1,
        duration: 'once',
        durationInMonths: null,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        isActive: true,
      },
      {
        code: 'FIRST3MONTHS',
        name: 'Primeros 3 Meses',
        description: 'Descuento para los primeros 3 meses',
        discountType: 'percentage',
        discountValue: 50.00,
        currency: 'COP',
        appliesTo: 'all',
        applicablePlanIds: [],
        maxRedemptions: 500,
        maxRedemptionsPerTenant: 1,
        duration: 'repeating',
        durationInMonths: 3,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
        isActive: true,
      },
    ];

    for (const couponData of coupons) {
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: couponData.code },
      });

      if (!existingCoupon) {
        await prisma.coupon.create({
          data: couponData,
        });
        console.log(`✅ Coupon created: ${couponData.code} - ${couponData.name}`);
      } else {
        console.log(`ℹ️  Coupon already exists: ${couponData.code}`);
      }
    }

    // Create feature flags
    const featureFlags = [
      {
        name: 'whatsapp_integration',
        description: 'WhatsApp Business API Integration',
        isEnabled: true,
        rolloutPercentage: 100,
        enabledForTenants: [],
        metadata: {},
      },
      {
        name: 'advanced_analytics',
        description: 'Advanced Analytics Dashboard',
        isEnabled: false,
        rolloutPercentage: 0,
        enabledForTenants: [],
        metadata: {},
      },
      {
        name: 'mobile_app',
        description: 'Mobile Application Access',
        isEnabled: true,
        rolloutPercentage: 100,
        enabledForTenants: [],
        metadata: {},
      },
      {
        name: 'ai_insights',
        description: 'AI-Powered Business Insights',
        isEnabled: false,
        rolloutPercentage: 10,
        enabledForTenants: [],
        metadata: {},
      },
    ];

    for (const flagData of featureFlags) {
      const existingFlag = await prisma.featureFlag.findUnique({
        where: { name: flagData.name },
      });

      if (!existingFlag) {
        await prisma.featureFlag.create({
          data: flagData,
        });
        console.log(`✅ Feature flag created: ${flagData.name}`);
      } else {
        console.log(`ℹ️  Feature flag already exists: ${flagData.name}`);
      }
    }

    console.log('🎉 Database seeded successfully!');
    console.log('');
    console.log('Super Admin Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the admin password in production!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
