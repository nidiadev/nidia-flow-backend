#!/usr/bin/env node

/**
 * NIDIA Flow - Setup Validation Script
 * Validates that the development environment is properly configured
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

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: 'pipe' });
    log(`✅ ${description}`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description}`, 'red');
    return false;
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description}`, 'red');
    return false;
  }
}

function checkPort(port, service) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'pipe' });
    log(`✅ Puerto ${port} en uso (${service})`, 'green');
    return true;
  } catch (error) {
    log(`❌ Puerto ${port} no está en uso (${service})`, 'red');
    return false;
  }
}

async function checkDatabaseConnection(connectionString, description) {
  try {
    // Use docker to test connection
    const [, , user, , host, port, database] = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    
    const command = `docker exec nidia-superadmin-db pg_isready -U ${user} -d ${database} -h ${host} -p 5432`;
    execSync(command, { stdio: 'pipe' });
    log(`✅ ${description}`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description}`, 'red');
    return false;
  }
}

async function main() {
  log('🔍 NIDIA Flow - Validación de Configuración', 'cyan');
  log('=============================================', 'cyan');

  let allChecksPass = true;

  // Check Docker
  log('\n📦 Verificando Docker...', 'blue');
  if (!checkCommand('docker --version', 'Docker instalado')) allChecksPass = false;
  if (!checkCommand('docker info', 'Docker ejecutándose')) allChecksPass = false;

  // Check Node.js and npm
  log('\n📦 Verificando Node.js...', 'blue');
  if (!checkCommand('node --version', 'Node.js instalado')) allChecksPass = false;
  if (!checkCommand('npm --version', 'npm instalado')) allChecksPass = false;

  // Check required files
  log('\n📁 Verificando archivos requeridos...', 'blue');
  const requiredFiles = [
    { path: '.env', desc: 'Archivo .env existe' },
    { path: 'prisma/superadmin-schema.prisma', desc: 'Schema SuperAdmin existe' },
    { path: 'prisma/tenant-schema.prisma', desc: 'Schema Tenant existe' },
    { path: 'docker-compose.dev.yml', desc: 'Docker Compose config existe' },
    { path: 'package.json', desc: 'package.json existe' }
  ];

  for (const file of requiredFiles) {
    if (!checkFile(file.path, file.desc)) allChecksPass = false;
  }

  // Check Docker containers
  log('\n🐳 Verificando contenedores Docker...', 'blue');
  const containers = [
    'nidia-superadmin-db',
    'nidia-tenant-db',
    'nidia-redis'
  ];

  for (const container of containers) {
    if (!checkCommand(`docker ps -q -f name=${container}`, `Contenedor ${container} ejecutándose`)) {
      allChecksPass = false;
    }
  }

  // Check ports
  log('\n🔌 Verificando puertos...', 'blue');
  const ports = [
    { port: 5432, service: 'SuperAdmin DB' },
    { port: 5433, service: 'Tenant DB' },
    { port: 6379, service: 'Redis' },
    { port: 8080, service: 'pgAdmin' }
  ];

  for (const { port, service } of ports) {
    if (!checkPort(port, service)) allChecksPass = false;
  }

  // Check database connections
  log('\n🗄️ Verificando conexiones de base de datos...', 'blue');
  
  // Load environment variables
  require('dotenv').config();
  
  if (process.env.DATABASE_URL) {
    await checkDatabaseConnection(process.env.DATABASE_URL, 'Conexión SuperAdmin DB');
  } else {
    log('❌ DATABASE_URL no configurada', 'red');
    allChecksPass = false;
  }

  // Check Prisma clients
  log('\n🔧 Verificando clientes Prisma...', 'blue');
  const prismaClients = [
    { path: 'generated/prisma', desc: 'Cliente Prisma SuperAdmin generado' },
    { path: 'generated/tenant-prisma', desc: 'Cliente Prisma Tenant generado' }
  ];

  for (const client of prismaClients) {
    if (!checkFile(client.path, client.desc)) allChecksPass = false;
  }

  // Check node_modules
  log('\n📦 Verificando dependencias...', 'blue');
  if (!checkFile('node_modules', 'Dependencias instaladas (node_modules)')) allChecksPass = false;

  // Test API endpoints (if server is running)
  log('\n🌐 Verificando servidor API...', 'blue');
  try {
    execSync('curl -f http://localhost:3001/health', { stdio: 'pipe' });
    log('✅ Servidor API respondiendo', 'green');
  } catch (error) {
    log('⚠️  Servidor API no está ejecutándose (esto es normal si no lo has iniciado)', 'yellow');
  }

  // Summary
  log('\n📊 Resumen de Validación', 'cyan');
  log('========================', 'cyan');

  if (allChecksPass) {
    log('🎉 ¡Todas las verificaciones pasaron exitosamente!', 'green');
    log('✅ Tu entorno de desarrollo está listo para usar', 'green');
    log('', 'reset');
    log('🚀 Para iniciar el servidor:', 'blue');
    log('   npm run start:dev', 'yellow');
    log('', 'reset');
    log('📚 Para abrir Prisma Studio:', 'blue');
    log('   npm run db:studio', 'yellow');
    log('', 'reset');
    log('🌐 Para ver la documentación API:', 'blue');
    log('   http://localhost:3001/docs (después de iniciar el servidor)', 'yellow');
  } else {
    log('❌ Algunas verificaciones fallaron', 'red');
    log('🔧 Ejecuta el setup automático:', 'yellow');
    log('   npm run dev:setup', 'yellow');
    log('', 'reset');
    log('🧹 O para configuración limpia:', 'yellow');
    log('   npm run dev:setup:clean', 'yellow');
  }

  process.exit(allChecksPass ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log('❌ Error no manejado:', 'red');
  log(error.message, 'red');
  process.exit(1);
});

// Run the script
main().catch((error) => {
  log('❌ Error en la validación:', 'red');
  log(error.message, 'red');
  process.exit(1);
});