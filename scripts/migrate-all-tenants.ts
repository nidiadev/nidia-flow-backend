#!/usr/bin/env ts-node

/**
 * Script para aplicar migraciones a todas las bases de datos de los tenants
 * 
 * Uso:
 *   npm run migrate:all-tenants
 *   o
 *   ts-node scripts/migrate-all-tenants.ts
 */

import { PrismaClient as SuperAdminPrismaClient } from '@prisma/superadmin';
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
    // Desencriptar contraseña
    const dbPassword = decryptPassword(tenant.dbPasswordEncrypted);
    
    // Construir connection URL
    const tenantConnectionUrl = `postgresql://${tenant.dbUsername}:${encodeURIComponent(dbPassword)}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;
    
    // Verificar que la base de datos existe
    console.log('   🔍 Verificando que la base de datos existe...');
    try {
      const { stdout } = await execAsync(
        `psql "${tenantConnectionUrl}" -tAc "SELECT 1" 2>&1 || echo "ERROR"`
      );
      if (stdout.includes('ERROR') || stdout.trim() !== '1') {
        throw new Error(`Database ${tenant.dbName} does not exist or is not accessible`);
      }
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

    // Verificar que las tablas se crearon correctamente
    console.log('   🔍 Verificando tablas...');
    try {
      const { stdout } = await execAsync(
        `psql "${tenantConnectionUrl}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'prisma_%' AND table_name NOT LIKE '_prisma_%';"`
      );
      const tableCount = parseInt(stdout.trim());
      console.log(`   ✅ ${tableCount} tablas encontradas`);
      
      // Verificar específicamente que deal_stages existe
      const { stdout: dealStagesCheck } = await execAsync(
        `psql "${tenantConnectionUrl}" -tAc "SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_stages');"`
      );
      if (dealStagesCheck.trim() === 't') {
        console.log('   ✅ Tabla deal_stages existe');
      } else {
        console.warn('   ⚠️  Tabla deal_stages no encontrada');
      }
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
        // Solo tenants que ya tienen base de datos provisionada
        dbName: {
          not: null,
        },
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

