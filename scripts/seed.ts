#!/usr/bin/env ts-node

import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create super admin user
    const adminEmail = 'admin@nidiaflow.com';
    const adminPassword = 'SuperAdmin123!';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin',
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
        role: admin.systemRole,
      });
    } else {
      console.log('ℹ️  Super admin user already exists');
    }

    // Create default plans
    const plans = [
      {
        name: 'free',
        displayName: 'Plan Gratuito',
        description: 'Plan básico para empezar',
        priceMonthly: 0,
        priceYearly: 0,
        maxUsers: 2,
        maxStorageGb: 1,
        maxMonthlyEmails: 100,
        maxMonthlyWhatsapp: 50,
        maxMonthlyApiCalls: 1000,
        features: ['basic_crm', 'basic_tasks'],
        enabledModules: ['crm', 'tasks'],
        isVisible: true,
        sortOrder: 1,
      },
      {
        name: 'basic',
        displayName: 'Plan Básico',
        description: 'Para pequeñas empresas',
        priceMonthly: 29.99,
        priceYearly: 299.99,
        maxUsers: 5,
        maxStorageGb: 5,
        maxMonthlyEmails: 1000,
        maxMonthlyWhatsapp: 500,
        maxMonthlyApiCalls: 10000,
        features: ['full_crm', 'task_management', 'basic_reports'],
        enabledModules: ['crm', 'tasks', 'reports'],
        isVisible: true,
        sortOrder: 2,
      },
      {
        name: 'professional',
        displayName: 'Plan Profesional',
        description: 'Para empresas en crecimiento',
        priceMonthly: 79.99,
        priceYearly: 799.99,
        maxUsers: 15,
        maxStorageGb: 20,
        maxMonthlyEmails: 5000,
        maxMonthlyWhatsapp: 2000,
        maxMonthlyApiCalls: 50000,
        features: ['full_crm', 'advanced_tasks', 'advanced_reports', 'integrations'],
        enabledModules: ['crm', 'tasks', 'reports', 'integrations', 'accounting'],
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
          data: planData,
        });
        console.log(`✅ Plan created: ${planData.displayName}`);
      } else {
        console.log(`ℹ️  Plan already exists: ${planData.displayName}`);
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