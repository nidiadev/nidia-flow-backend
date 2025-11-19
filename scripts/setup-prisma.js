#!/usr/bin/env node

/**
 * NIDIA Flow - Prisma Setup Script
 * Configures Prisma for both SuperAdmin and Tenant databases
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completado`, 'green');
  } catch (error) {
    log(`❌ Error en: ${description}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

function checkFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    log(`❌ Archivo requerido no encontrado: ${filePath}`, 'red');
    log(`   ${description}`, 'yellow');
    return false;
  }
  log(`✅ ${description}`, 'green');
  return true;
}

async function main() {
  log('🚀 NIDIA Flow - Configuración de Prisma', 'cyan');
  log('==========================================', 'cyan');

  // Check required files
  const requiredFiles = [
    { path: 'prisma/superadmin-schema.prisma', desc: 'Schema SuperAdmin encontrado' },
    { path: 'prisma/tenant-schema.prisma', desc: 'Schema Tenant encontrado' },
    { path: '.env', desc: 'Archivo .env encontrado' }
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (!checkFile(file.path, file.desc)) {
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    log('❌ Archivos requeridos faltantes. Abortando.', 'red');
    process.exit(1);
  }

  // Load environment variables
  require('dotenv').config();

  // Check environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'TENANT_DATABASE_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      log(`❌ Variable de entorno requerida: ${envVar}`, 'red');
      process.exit(1);
    }
  }

  log('✅ Variables de entorno verificadas', 'green');

  // Generate Prisma clients
  execCommand(
    'npx prisma generate --schema=prisma/superadmin-schema.prisma',
    'Generando cliente Prisma SuperAdmin'
  );

  execCommand(
    'npx prisma generate --schema=prisma/tenant-schema.prisma',
    'Generando cliente Prisma Tenant'
  );

  // Push schemas to databases
  log('📊 Sincronizando esquemas con bases de datos...', 'blue');

  // SuperAdmin schema
  execCommand(
    'npx prisma db push --schema=prisma/superadmin-schema.prisma --accept-data-loss',
    'Sincronizando schema SuperAdmin'
  );

  // Tenant schema
  execCommand(
    `DATABASE_URL="${process.env.TENANT_DATABASE_URL}" npx prisma db push --schema=prisma/tenant-schema.prisma --accept-data-loss`,
    'Sincronizando schema Tenant'
  );

  // Create directories for generated clients
  const generatedDirs = [
    'generated/prisma',
    'generated/tenant-prisma',
  ];

  for (const dir of generatedDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`📁 Directorio creado: ${dir}`, 'green');
    }
  }

  log('', 'reset');
  log('🎉 ¡Configuración de Prisma completada exitosamente!', 'green');
  log('', 'reset');
  log('📚 Comandos útiles:', 'cyan');
  log('  SuperAdmin Studio: npm run db:studio', 'yellow');
  log('  Tenant Studio: npm run db:studio:tenant', 'yellow');
  log('  Reset SuperAdmin: npm run db:reset', 'yellow');
  log('  Reset Tenant: npm run db:reset:tenant', 'yellow');
  log('', 'reset');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log('❌ Error no manejado:', 'red');
  log(error.message, 'red');
  process.exit(1);
});

// Run the script
main().catch((error) => {
  log('❌ Error en la configuración:', 'red');
  log(error.message, 'red');
  process.exit(1);
});