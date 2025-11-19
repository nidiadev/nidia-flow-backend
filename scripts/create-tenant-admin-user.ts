/**
 * Script para crear el usuario admin en la BD del tenant
 * 
 * Uso: 
 *   npx ts-node scripts/create-tenant-admin-user.ts <tenantId> <email> <password>
 * 
 * Ejemplo:
 *   npx ts-node scripts/create-tenant-admin-user.ts 123e4567-e89b-12d3-a456-426614174000 admin@empresa.com password123
 */

import { PrismaClient as SuperAdminPrismaClient } from '@prisma/superadmin';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant';
import * as bcrypt from 'bcryptjs';
import { resolve } from 'path';

const superAdminPrisma = new SuperAdminPrismaClient();

async function createTenantAdminUser(tenantId: string, email: string, password: string) {
  try {
    console.log(`🔍 Buscando tenant ${tenantId}...`);
    
    // 1. Obtener información del tenant desde SuperAdmin DB
    const tenant = await superAdminPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        dbName: true,
        dbHost: true,
        dbPort: true,
        dbUsername: true,
        dbPasswordEncrypted: true,
      },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    console.log(`✅ Tenant encontrado: ${tenant.slug} (${tenant.dbName})`);

    // 2. Verificar que el usuario existe en SuperAdmin DB
    const superAdminUser = await superAdminPrisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        tenantId: true,
        systemRole: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!superAdminUser) {
      throw new Error(`User ${email} not found in SuperAdmin DB`);
    }

    if (superAdminUser.tenantId !== tenantId) {
      throw new Error(`User ${email} belongs to different tenant (${superAdminUser.tenantId})`);
    }

    console.log(`✅ Usuario encontrado en SuperAdmin DB: ${superAdminUser.email} (${superAdminUser.systemRole})`);

    // 3. Desencriptar password del tenant
    const decryptPassword = (encrypted: string): string => {
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      const parts = encrypted.split(':');
      if (parts.length !== 2) {
        return encrypted; // Asumir texto plano
      }
      const crypto = require('crypto');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      const key = crypto.scryptSync(encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    };

    const dbPassword = decryptPassword(tenant.dbPasswordEncrypted);
    
    // 4. Construir URL de conexión
    const adminConnectionUrl = process.env.DATABASE_URL;
    if (!adminConnectionUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const adminUrl = new URL(adminConnectionUrl);
    const adminUser = adminUrl.username;
    const adminPassword = adminUrl.password;
    const adminHost = adminUrl.hostname;
    const adminPort = adminUrl.port || '5432';

    const tenantConnectionUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPassword)}@${adminHost}:${adminPort}/${tenant.dbName}?schema=public`;

    console.log(`🔗 Conectando a BD del tenant: ${tenant.dbName}...`);

    // 5. Conectar a BD del tenant
    const tenantPrismaPath = resolve(process.cwd(), 'generated', 'tenant-prisma');
    const { PrismaClient } = require(tenantPrismaPath);
    const tenantClient = new PrismaClient({
      datasources: {
        db: {
          url: tenantConnectionUrl,
        },
      },
    });

    await tenantClient.$connect();
    console.log(`✅ Conectado a BD del tenant`);

    // 6. Verificar si el usuario ya existe
    const existingUser = await tenantClient.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  Usuario ${email} ya existe en BD del tenant (ID: ${existingUser.id})`);
      console.log(`   Actualizando password...`);
      
      const hashedPassword = await bcrypt.hash(password, 12);
      await tenantClient.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: hashedPassword,
          isActive: true,
          role: 'admin',
        },
      });
      
      console.log(`✅ Usuario actualizado en BD del tenant`);
    } else {
      console.log(`📝 Creando usuario en BD del tenant...`);
      
      // 7. Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // 8. Crear usuario en BD del tenant
      const createdUser = await tenantClient.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName: superAdminUser.firstName || null,
          lastName: superAdminUser.lastName || null,
          role: 'admin',
          permissions: [],
          isActive: true,
        },
      });

      console.log(`✅ Usuario creado en BD del tenant: ${createdUser.email} (ID: ${createdUser.id})`);
    }

    // 9. Verificar creación
    const verifyUser = await tenantClient.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!verifyUser) {
      throw new Error('Usuario no se pudo crear o verificar');
    }

    console.log(`✅ Verificación: Usuario ${verifyUser.email} existe en BD del tenant con role: ${verifyUser.role}`);

    // 10. Contar usuarios
    const userCount = await tenantClient.user.count();
    console.log(`📊 Total usuarios en BD del tenant: ${userCount}`);

    await tenantClient.$disconnect();
    console.log(`\n✅ Proceso completado exitosamente!`);
    console.log(`\n📋 Resumen:`);
    console.log(`   - Tenant: ${tenant.slug} (${tenant.dbName})`);
    console.log(`   - Usuario: ${email}`);
    console.log(`   - Role en tenant: admin`);
    console.log(`   - Usuario puede hacer login ahora`);

  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  } finally {
    await superAdminPrisma.$disconnect();
  }
}

// Ejecutar script
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('❌ Uso: npx ts-node scripts/create-tenant-admin-user.ts <tenantId> <email> <password>');
  process.exit(1);
}

const [tenantId, email, password] = args;
createTenantAdminUser(tenantId, email, password);

