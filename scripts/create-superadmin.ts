#!/usr/bin/env ts-node

import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔐 Creating SuperAdmin user...');

    const adminEmail = 'hola@nidia.com.co';
    const adminPassword = 'Ale04112018';

    // Verificar si el usuario ya existe
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log('⚠️  User already exists. Updating password...');
      
      // Actualizar password
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const updatedAdmin = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash: hashedPassword,
          systemRole: 'super_admin',
          isActive: true,
          emailVerified: true,
        },
      });

      console.log('✅ Super admin password updated:', {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        role: updatedAdmin.systemRole,
      });
    } else {
      // Crear nuevo usuario
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
        name: `${admin.firstName} ${admin.lastName}`,
        role: admin.systemRole,
      });
    }

    console.log('');
    console.log('📧 Super Admin Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();

