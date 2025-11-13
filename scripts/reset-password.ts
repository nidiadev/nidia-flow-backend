#!/usr/bin/env ts-node

import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const email = process.argv[2] || 'admin@nidiaflow.com';
    const newPassword = process.argv[3] || 'SuperAdmin123!';

    console.log(`🔐 Reseteando contraseña para: ${email}`);
    console.log(`📝 Nueva contraseña: ${newPassword}\n`);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ Usuario no encontrado: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.firstName} ${user.lastName}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Rol: ${user.systemRole}`);
    console.log(`   Activo: ${user.isActive ? '✅' : '❌'}`);
    console.log(`   Bloqueado: ${user.isLocked ? '❌' : '✅'}`);
    console.log(`   Intentos de login: ${user.loginAttempts}\n`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('🔒 Generando hash de contraseña...');

    // Update password and reset login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        loginAttempts: 0,
        isLocked: false,
        lockedReason: null,
        lockedAt: null,
      },
    });

    console.log('✅ Contraseña actualizada exitosamente!\n');
    console.log('📋 Credenciales actualizadas:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}\n`);

  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();

