#!/usr/bin/env ts-node

/**
 * Script para aplicar migraciones a todas las bases de datos de los tenants
 * 
 * Uso:
 *   npm run migrate:all-tenants
 *   o
 *   ts-node scripts/migrate-all-tenants.ts
 */

import { PrismaClient as SuperAdminPrismaClient } from '../generated/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

// Función para desencriptar la contraseña (mismo método que TenantService)
function decryptPassword(encryptedPassword: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const parts = encryptedPassword.split(':');
  
  // Si no tiene el formato encriptado (iv:encrypted), asumir texto plano
  if (parts.length !== 2) {
    return encryptedPassword;
  }
  
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Si falla la desencriptación, asumir que no está encriptado (modo desarrollo)
    console.warn('⚠️  Warning: Could not decrypt password, using as plain text');
    return encryptedPassword;
  }
}

async function migrateTenantDatabase(tenant: {
  id: string;
  name: string;
  slug: string;
  dbName: string;
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPasswordEncrypted: string;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string }> {
  console.log(`\n📦 Migrando tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   Database: ${tenant.dbName}`);
  console.log(`   Host: ${tenant.dbHost}:${tenant.dbPort}`);

  try {
    // Usar credenciales de administrador para migraciones (como en TenantProvisioningService)
    const adminConnectionUrl = process.env.DATABASE_URL;
    if (!adminConnectionUrl) {
      throw new Error('DATABASE_URL not configured for admin operations');
    }

    // Parse admin connection URL to extract credentials
    const adminUrl = new URL(adminConnectionUrl);
    const adminUser = adminUrl.username;
    const adminPassword = adminUrl.password;
    const adminHost = adminUrl.hostname;
    const adminPort = adminUrl.port || '5432';

    // Use admin credentials to connect to tenant database for migration
    const tenantConnectionUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPassword)}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
    
    // Verificar que la base de datos existe usando Prisma
    console.log('   🔍 Verificando que la base de datos existe...');
    try {
      const { PrismaClient: TenantPrismaClient } = await import('../generated/tenant-prisma');
      const testClient = new TenantPrismaClient({
        datasources: {
          db: {
            url: tenantConnectionUrl,
          },
        },
      });
      
      await testClient.$connect();
      await testClient.$queryRaw`SELECT 1`;
      await testClient.$disconnect();
      console.log('   ✅ Base de datos verificada');
    } catch (error: any) {
      console.error(`   ❌ Error verificando base de datos: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Aplicar migraciones usando prisma db push (más seguro para esquemas en evolución)
    console.log('   🔄 Aplicando migraciones...');
    try {
      await execAsync(
        `DATABASE_URL="${tenantConnectionUrl}" npx prisma db push --schema=prisma/tenant-schema.prisma --accept-data-loss --skip-generate`,
        {
          env: {
            ...process.env,
            DATABASE_URL: tenantConnectionUrl,
          },
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );
      console.log('   ✅ Migraciones aplicadas exitosamente');
    } catch (error: any) {
      console.error(`   ❌ Error aplicando migraciones: ${error.message}`);
      if (error.stdout) console.error(`   STDOUT: ${error.stdout}`);
      if (error.stderr) console.error(`   STDERR: ${error.stderr}`);
      return { success: false, error: error.message };
    }

    // Verificar que las tablas se crearon correctamente usando Prisma
    console.log('   🔍 Verificando tablas...');
    try {
      const { PrismaClient: TenantPrismaClient } = await import('../generated/tenant-prisma');
      const verifyClient = new TenantPrismaClient({
        datasources: {
          db: {
            url: tenantConnectionUrl,
          },
        },
      });
      
      await verifyClient.$connect();
      
      // Contar tablas
      const tableCountResult = await verifyClient.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT LIKE 'prisma_%' 
        AND table_name NOT LIKE '_prisma_%'
      `;
      const tableCount = Number(tableCountResult[0]?.count || 0);
      console.log(`   ✅ ${tableCount} tablas encontradas`);
      
      // Verificar específicamente que deal_stages existe
      const dealStagesResult = await verifyClient.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS(
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'deal_stages'
        ) as exists
      `;
      
      if (dealStagesResult[0]?.exists) {
        console.log('   ✅ Tabla deal_stages existe');
      } else {
        console.warn('   ⚠️  Tabla deal_stages no encontrada');
      }
      
      await verifyClient.$disconnect();
    } catch (error: any) {
      console.warn(`   ⚠️  No se pudo verificar tablas: ${error.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error(`   ❌ Error inesperado: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Iniciando migración de todas las bases de datos de tenants...\n');

  // Conectar a SuperAdmin DB
  const prisma = new SuperAdminPrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    // Obtener todos los tenants activos
    console.log('📋 Obteniendo lista de tenants...');
    const tenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        dbName: true,
        dbHost: true,
        dbPort: true,
        dbUsername: true,
        dbPasswordEncrypted: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (tenants.length === 0) {
      console.log('⚠️  No se encontraron tenants activos con base de datos provisionada');
      return;
    }

    console.log(`✅ Se encontraron ${tenants.length} tenant(s) para migrar\n`);

    // Migrar cada tenant
    const results: Array<{ tenant: string; success: boolean; error?: string }> = [];
    
    for (const tenant of tenants) {
      if (!tenant.dbName) {
        console.log(`⚠️  Saltando ${tenant.name}: no tiene base de datos asignada`);
        continue;
      }

      const result = await migrateTenantDatabase(tenant);
      results.push({
        tenant: tenant.name,
        success: result.success,
        error: result.error,
      });

      // Pequeña pausa entre migraciones para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIONES');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n✅ Exitosas: ${successful}`);
    console.log(`❌ Fallidas: ${failed}`);
    console.log(`📦 Total: ${results.length}`);

    if (failed > 0) {
      console.log('\n❌ Tenants con errores:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.tenant}: ${r.error}`);
        });
    }

    if (successful === results.length) {
      console.log('\n🎉 ¡Todas las migraciones se completaron exitosamente!');
    } else {
      console.log('\n⚠️  Algunas migraciones fallaron. Revisa los errores arriba.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
if (require.main === module) {
  main().catch((error) => {
    console.error('Error no manejado:', error);
    process.exit(1);
  });
}

export { main };

