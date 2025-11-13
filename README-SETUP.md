# NIDIA Flow - Configuración de Entorno de Desarrollo

Este documento describe cómo configurar el entorno de desarrollo completo para NIDIA Flow con bases de datos PostgreSQL multi-tenant.

## 🏗️ Arquitectura de Bases de Datos

NIDIA Flow utiliza una arquitectura **database-per-tenant** con dos tipos de bases de datos:

### 1. SuperAdmin Database (`nidia_superadmin`)
- **Puerto**: 5432
- **Propósito**: Gestión de tenants, facturación, usuarios globales, planes
- **Esquema**: `prisma/schema.prisma`
- **Cliente**: `generated/prisma`

### 2. Tenant Databases (`tenant_*_prod`)
- **Puerto**: 5433 (demo)
- **Propósito**: Datos operativos de cada empresa (CRM, órdenes, productos, etc.)
- **Esquema**: `prisma/tenant-schema.prisma`
- **Cliente**: `generated/tenant-prisma`

## 🚀 Configuración Rápida

### Prerrequisitos
- Docker Desktop instalado y ejecutándose
- Node.js 18+ instalado
- npm o yarn instalado

### 1. Configuración Automática (Recomendado)

```bash
# Clonar el repositorio y navegar al backend
cd nidia-flow-backend

# Ejecutar configuración automática
npm run dev:setup

# O para configuración limpia (elimina datos existentes)
npm run dev:setup:clean
```

### 2. Iniciar el Servidor de Desarrollo

```bash
# Inicia Docker y el servidor en modo watch
npm run start:dev

# O manualmente
npm run docker:up
npm run start
```

## 🔧 Configuración Manual

Si prefieres configurar paso a paso:

### 1. Variables de Entorno

Copia y configura las variables de entorno:

```bash
cp .env.example .env
```

Las variables principales ya están configuradas para desarrollo local.

### 2. Iniciar Servicios Docker

```bash
# Iniciar todos los servicios
docker-compose -f docker-compose.dev.yml up -d

# Verificar que estén ejecutándose
docker-compose -f docker-compose.dev.yml ps
```

### 3. Configurar Prisma

```bash
# Generar clientes de Prisma
npm run db:generate

# Sincronizar esquemas con las bases de datos
npm run db:push
npm run db:push:tenant
```

### 4. Verificar Conexiones

```bash
# Verificar SuperAdmin DB
docker exec nidia-superadmin-db pg_isready -U postgres -d nidia_superadmin

# Verificar Tenant DB
docker exec nidia-tenant-db pg_isready -U postgres -d tenant_demo_empresa_prod
```

## 🗄️ Gestión de Bases de Datos

### Prisma Studio

```bash
# SuperAdmin Database
npm run db:studio

# Tenant Database
npm run db:studio:tenant
```

### pgAdmin (Interfaz Web)

Accede a [http://localhost:8080](http://localhost:8080)
- **Email**: admin@nidia.com
- **Password**: password

Los servidores están preconfigurados y aparecerán automáticamente.

### Comandos Útiles

```bash
# Ver logs de Docker
npm run docker:logs

# Reiniciar servicios
npm run docker:down
npm run docker:up

# Limpiar todo (elimina volúmenes)
npm run docker:clean

# Reset de bases de datos
npm run db:reset          # SuperAdmin
npm run db:reset:tenant   # Tenant
```

## 📊 Datos de Demostración

### SuperAdmin Database
- **Usuario Admin**: admin@nidia.com
- **Planes**: Free, Basic, Professional, Enterprise
- **Tenant Demo**: Demo Empresa (slug: demo-empresa)

### Tenant Database (Demo Empresa)
- **Usuario Admin**: admin@demoempresa.com
- **Productos**: 4 productos/servicios de ejemplo
- **Clientes**: 3 clientes de demostración
- **Configuración**: Empresa colombiana con configuración típica

## 🔌 Conexiones de Base de Datos

### SuperAdmin DB
```
Host: localhost
Port: 5432
Database: nidia_superadmin
Username: postgres
Password: password
```

### Tenant Demo DB
```
Host: localhost
Port: 5433
Database: tenant_demo_empresa_prod
Username: postgres
Password: password
```

### Redis
```
Host: localhost
Port: 6379
Password: (ninguna)
```

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests E2E
npm run test:e2e

# Tests con coverage
npm run test:cov
```

## 🐛 Solución de Problemas

### Error: "Docker no está ejecutándose"
```bash
# Verificar Docker
docker --version
docker info

# Iniciar Docker Desktop si no está ejecutándose
```

### Error: "Puerto ya en uso"
```bash
# Verificar puertos ocupados
lsof -i :5432
lsof -i :5433
lsof -i :6379

# Detener servicios conflictivos
npm run docker:down
```

### Error: "Prisma Client no generado"
```bash
# Regenerar clientes
npm run db:generate
```

### Error: "Conexión a base de datos falló"
```bash
# Verificar salud de contenedores
docker-compose -f docker-compose.dev.yml ps

# Ver logs de errores
docker-compose -f docker-compose.dev.yml logs superadmin-db
docker-compose -f docker-compose.dev.yml logs tenant-db
```

### Reinicio Completo
```bash
# Detener todo
npm run docker:down

# Limpiar volúmenes
docker volume prune

# Configuración limpia
npm run dev:setup:clean
```

## 📁 Estructura de Archivos

```
nidia-flow-backend/
├── prisma/
│   ├── schema.prisma              # SuperAdmin schema
│   └── tenant-schema.prisma       # Tenant schema
├── generated/
│   ├── prisma/                    # SuperAdmin client
│   └── tenant-prisma/             # Tenant client
├── scripts/
│   ├── dev-setup.sh              # Setup automático
│   ├── init-superadmin.sql       # Datos iniciales SuperAdmin
│   ├── init-tenant.sql           # Datos iniciales Tenant
│   └── setup-prisma.js           # Configuración Prisma
├── src/
│   ├── tenant/
│   │   ├── services/
│   │   │   ├── tenant-prisma.service.ts
│   │   │   └── tenant-database.service.ts
│   │   └── controllers/
│   └── ...
├── docker-compose.dev.yml        # Servicios Docker
└── .env                          # Variables de entorno
```

## 🚀 Próximos Pasos

Una vez configurado el entorno:

1. **Explorar APIs**: Visita [http://localhost:3001/docs](http://localhost:3001/docs) para ver la documentación Swagger
2. **Revisar Datos**: Usa pgAdmin o Prisma Studio para explorar los datos
3. **Desarrollar**: Los controladores de Settings y Audit ya están implementados
4. **Testing**: Ejecuta los tests para verificar que todo funciona

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `npm run docker:logs`
2. Verifica la salud de los servicios: `docker-compose ps`
3. Reinicia con configuración limpia: `npm run dev:setup:clean`

---

¡Listo para desarrollar con NIDIA Flow! 🎯