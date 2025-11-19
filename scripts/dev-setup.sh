#!/bin/bash

# NIDIA Flow - Development Environment Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 NIDIA Flow - Configurando entorno de desarrollo..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker no está ejecutándose. Por favor inicia Docker Desktop."
    exit 1
fi

print_success "Docker está ejecutándose ✓"

# Stop any existing containers
print_status "Deteniendo contenedores existentes..."
docker-compose -f docker-compose.dev.yml down --remove-orphans || true

# Remove existing volumes if they exist (for clean setup)
if [ "$1" = "--clean" ]; then
    print_warning "Modo limpio activado - eliminando volúmenes existentes..."
    docker volume rm nidia-flow-backend_superadmin_db_data || true
    docker volume rm nidia-flow-backend_tenant_db_data || true
    docker volume rm nidia-flow-backend_redis_data || true
    docker volume rm nidia-flow-backend_pgadmin_data || true
fi

# Start Docker services
print_status "Iniciando servicios Docker..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for databases to be ready
print_status "Esperando que las bases de datos estén listas..."
sleep 10

# Check SuperAdmin DB health
print_status "Verificando SuperAdmin DB..."
for i in {1..30}; do
    if docker exec nidia-superadmin-db pg_isready -U postgres -d nidia_superadmin > /dev/null 2>&1; then
        print_success "SuperAdmin DB está lista ✓"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "SuperAdmin DB no está respondiendo después de 30 intentos"
        exit 1
    fi
    sleep 2
done

# Check Tenant DB health
print_status "Verificando Tenant DB..."
for i in {1..30}; do
    if docker exec nidia-tenant-db pg_isready -U postgres -d tenant_demo_empresa_prod > /dev/null 2>&1; then
        print_success "Tenant DB está lista ✓"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Tenant DB no está respondiendo después de 30 intentos"
        exit 1
    fi
    sleep 2
done

# Check Redis health
print_status "Verificando Redis..."
for i in {1..15}; do
    if docker exec nidia-redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis está listo ✓"
        break
    fi
    if [ $i -eq 15 ]; then
        print_error "Redis no está respondiendo después de 15 intentos"
        exit 1
    fi
    sleep 2
done

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Instalando dependencias de Node.js..."
    npm install
    print_success "Dependencias instaladas ✓"
fi

# Generate Prisma clients
print_status "Generando clientes de Prisma..."
npx prisma generate --schema=prisma/superadmin-schema.prisma
npx prisma generate --schema=prisma/tenant-schema.prisma
print_success "Clientes de Prisma generados ✓"

# Run SuperAdmin migrations
print_status "Ejecutando migraciones de SuperAdmin..."
npx prisma db push --schema=prisma/superadmin-schema.prisma --accept-data-loss
print_success "Migraciones de SuperAdmin completadas ✓"

# Run Tenant migrations
print_status "Ejecutando migraciones de Tenant..."
DATABASE_URL="postgresql://postgres:password@localhost:5433/tenant_demo_empresa_prod?schema=public" \
npx prisma db push --schema=prisma/tenant-schema.prisma --accept-data-loss
print_success "Migraciones de Tenant completadas ✓"

# Seed SuperAdmin database
print_status "Insertando datos de demostración en SuperAdmin DB..."
docker exec nidia-superadmin-db psql -U postgres -d nidia_superadmin -f /docker-entrypoint-initdb.d/seed-superadmin.sql || \
docker exec -i nidia-superadmin-db psql -U postgres -d nidia_superadmin < scripts/seed-superadmin.sql
print_success "Datos de SuperAdmin insertados ✓"

# Seed Tenant database
print_status "Insertando datos de demostración en Tenant DB..."
docker exec nidia-tenant-db psql -U postgres -d tenant_demo_empresa_prod -f /docker-entrypoint-initdb.d/seed-tenant.sql || \
docker exec -i nidia-tenant-db psql -U postgres -d tenant_demo_empresa_prod < scripts/seed-tenant.sql
print_success "Datos de Tenant insertados ✓"

print_success "Configuración de base de datos completada ✓"

# Display connection information
echo ""
echo "🎉 ¡Entorno de desarrollo configurado exitosamente!"
echo ""
echo "📊 Información de conexión:"
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│ SuperAdmin DB:                                              │"
echo "│   Host: localhost:5432                                      │"
echo "│   Database: nidia_superadmin                                │"
echo "│   User: postgres / Password: password                       │"
echo "│                                                             │"
echo "│ Tenant Demo DB:                                             │"
echo "│   Host: localhost:5433                                      │"
echo "│   Database: tenant_demo_empresa_prod                        │"
echo "│   User: postgres / Password: password                       │"
echo "│                                                             │"
echo "│ Redis:                                                      │"
echo "│   Host: localhost:6379                                      │"
echo "│                                                             │"
echo "│ pgAdmin:                                                    │"
echo "│   URL: http://localhost:8080                                │"
echo "│   Email: admin@nidia.com / Password: password               │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo "🚀 Para iniciar el servidor de desarrollo:"
echo "   npm run start:dev"
echo ""
echo "📚 Para abrir Prisma Studio:"
echo "   SuperAdmin: npm run db:studio"
echo "   Tenant: DATABASE_URL=\"postgresql://postgres:password@localhost:5433/tenant_demo_empresa_prod\" npx prisma studio --schema=prisma/tenant-schema.prisma"
echo ""
echo "🔧 Para reiniciar con datos limpios:"
echo "   ./scripts/dev-setup.sh --clean"
echo ""
print_success "¡Listo para desarrollar! 🎯"