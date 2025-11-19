#!/usr/bin/env ts-node
/**
 * Script CLI para provisionar manualmente un tenant
 * 
 * Uso:
 *   npm run provision:tenant -- --slug=acme --env=prod
 *   npm run provision:tenant -- --slug=testco --env=dev
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const execAsync = promisify(exec);

interface ProvisionOptions {
  slug: string;
  env: 'prod' | 'dev';
}

async function main() {
  const args = process.argv.slice(2);
  const options: Partial<ProvisionOptions> = {};

  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith('--slug=')) {
      options.slug = arg.split('=')[1];
    } else if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1] as 'prod' | 'dev';
    }
  }

  // Validate required arguments
  if (!options.slug) {
    console.error('❌ Error: --slug es requerido');
    console.log('Uso: npm run provision:tenant -- --slug=acme --env=prod');
    process.exit(1);
  }

  if (!options.env) {
    options.env = process.env.NODE_ENV === 'development' ? 'dev' : 'prod';
    console.log(`⚠️  --env no especificado, usando: ${options.env}`);
  }

  const dbName = `tenant_${options.slug}_${options.env}`;

  console.log('\n🚀 NIDIA Flow - Provisioning Manual de Tenant');
  console.log('==============================================\n');
  console.log(`📋 Configuración:`);
  console.log(`   Slug: ${options.slug}`);
  console.log(`   Environment: ${options.env}`);
  console.log(`   Database: ${dbName}\n`);

  try {
    // 1. Validar que el tenant existe en SuperAdmin
    console.log('1️⃣  Validando tenant en SuperAdmin DB...');
    const tenant = await prisma.tenant.findUnique({
      where: { slug: options.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        dbName: true,
        dbHost: true,
        dbPort: true,
        dbUsername: true,
        isActive: true,
        provisionedAt: true,
      },
    });

    if (!tenant) {
      console.error(`❌ Error: Tenant con slug "${options.slug}" no existe en SuperAdmin DB`);
      console.log('   Crea el tenant primero usando el endpoint POST /tenants');
      process.exit(1);
    }

    console.log(`   ✅ Tenant encontrado: ${tenant.name} (${tenant.id})`);

    if (tenant.dbName && tenant.dbName !== dbName) {
      console.log(`   ⚠️  Tenant tiene dbName diferente: ${tenant.dbName}`);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('   ¿Continuar de todas formas? (s/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 's') {
        console.log('   ❌ Operación cancelada');
        process.exit(0);
      }
    }

    // 2. Verificar si la BD ya existe
    console.log('\n2️⃣  Verificando si la base de datos existe...');
    const dbHost = tenant.dbHost || process.env.TENANT_DB_HOST || 'localhost';
    const dbPort = tenant.dbPort || parseInt(process.env.TENANT_DB_PORT || '5432');
    const dbUsername = tenant.dbUsername || process.env.TENANT_DB_USERNAME || 'postgres';
    const dbPassword = process.env.TENANT_DB_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres';
    const adminConnectionUrl = process.env.DATABASE_URL;

    if (!adminConnectionUrl) {
      console.error('❌ Error: DATABASE_URL no configurada');
      process.exit(1);
    }

    try {
      const { stdout } = await execAsync(
        `psql "${adminConnectionUrl}" -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`
      );
      const dbExists = stdout.trim() === '1';

      if (dbExists) {
        console.log(`   ⚠️  Base de datos ${dbName} ya existe`);
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('   ¿Eliminar y recrear? (s/N): ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() === 's') {
          console.log(`   🗑️  Eliminando base de datos ${dbName}...`);
          await execAsync(
            `psql "${adminConnectionUrl}" -c "DROP DATABASE IF EXISTS \\"${dbName}\\";"`
          );
          console.log('   ✅ Base de datos eliminada');
        } else {
          console.log('   ℹ️  Usando base de datos existente');
        }
      } else {
        console.log(`   ✅ Base de datos ${dbName} no existe, será creada`);
      }
    } catch (error) {
      console.log(`   ⚠️  No se pudo verificar existencia de BD: ${error.message}`);
    }

    // 3. Crear base de datos
    console.log('\n3️⃣  Creando base de datos...');
    try {
      await execAsync(
        `psql "${adminConnectionUrl}" -c "CREATE DATABASE \\"${dbName}\\";"`
      );
      console.log(`   ✅ Base de datos ${dbName} creada`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`   ℹ️  Base de datos ${dbName} ya existe`);
      } else {
        throw error;
      }
    }

    // 4. Ejecutar migraciones
    console.log('\n4️⃣  Ejecutando migraciones...');
    const tenantConnectionUrl = `postgresql://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
    
    try {
      await execAsync(
        `DATABASE_URL="${tenantConnectionUrl}" npx prisma migrate deploy --schema=prisma/tenant-schema.prisma`,
        { env: { ...process.env, DATABASE_URL: tenantConnectionUrl } }
      );
      console.log('   ✅ Migraciones ejecutadas');
    } catch (error) {
      console.error('   ❌ Error ejecutando migraciones:', error);
      throw error;
    }

    // 5. Verificar que la BD funciona
    console.log('\n5️⃣  Verificando conexión...');
    try {
      const { stdout } = await execAsync(
        `psql "${tenantConnectionUrl}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`
      );
      const tableCount = parseInt(stdout.trim());
      console.log(`   ✅ Conexión exitosa. ${tableCount} tablas encontradas`);
    } catch (error) {
      console.error('   ❌ Error verificando conexión:', error);
      throw error;
    }

    // 6. Actualizar tenant en SuperAdmin
    console.log('\n6️⃣  Actualizando registro del tenant...');
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        dbName,
        provisionedAt: new Date(),
      },
    });
    console.log('   ✅ Tenant actualizado en SuperAdmin');

    console.log('\n🎉 ¡Provisioning completado exitosamente!');
    console.log(`\n📊 Resumen:`);
    console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Host: ${dbHost}:${dbPort}`);
    console.log(`   Username: ${dbUsername}`);
    console.log(`\n💡 Próximos pasos:`);
    console.log(`   1. Verificar que el tenant puede hacer login`);
    console.log(`   2. Crear usuario inicial en la BD del tenant`);
    console.log(`   3. Probar operaciones CRUD\n`);

  } catch (error: any) {
    console.error('\n❌ Error durante el provisioning:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

