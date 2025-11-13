# NIDIA Flow - Backend

Backend API desarrollado con NestJS para el sistema de gestión empresarial NIDIA Flow.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL 14+
- Docker y Docker Compose (opcional, para desarrollo)

### Instalación

```bash
# Instalar dependencias
yarn install

# Generar cliente Prisma
npm run db:generate

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de base de datos
```

### Configuración de Base de Datos

```bash
# Ejecutar migraciones
npm run db:migrate

# O aplicar el schema directamente (desarrollo)
npm run db:push
```

### Poblar Base de Datos con Datos Demo

```bash
# Crear usuarios SuperAdmin y planes por defecto
npx ts-node scripts/seed.ts
```

Este script crea:
- Usuario SuperAdmin con credenciales válidas
- Planes por defecto (Free, Basic, Professional, Enterprise)

## 👤 Usuarios Demo

### Usuarios SuperAdmin

El sistema incluye usuarios SuperAdmin para gestionar la plataforma multi-tenant:

#### Usuario Principal (Recomendado)
- **Email**: `admin@nidiaflow.com`
- **Password**: `SuperAdmin123!`
- **Rol**: `super_admin`
- **Estado**: Activo y verificado

#### Usuario Alternativo
- **Email**: `admin@nidia.com`
- **Password**: Verificar en `scripts/seed-superadmin.sql` (puede ser placeholder)
- **Rol**: `super_admin`
- **Estado**: Activo y verificado

### Listar Usuarios Disponibles

Para ver todos los usuarios creados en la base de datos:

```bash
npx ts-node scripts/list-users.ts
```

Este script muestra:
- Todos los usuarios SuperAdmin
- Todos los tenants y sus usuarios
- Resumen de usuarios por tipo
- Credenciales de prueba disponibles

### Crear Nuevos Usuarios

#### SuperAdmin
Ejecuta el script de seed:
```bash
npx ts-node scripts/seed.ts
```

#### Usuarios de Tenant
Los usuarios de tenant se crean a través de:
1. La API REST (`POST /users`) después de autenticarse como SuperAdmin
2. El panel de administración del tenant
3. Scripts SQL específicos del tenant (ver `scripts/seed-tenant.sql`)

## 🛠️ Desarrollo

### Ejecutar en Modo Desarrollo

```bash
# Iniciar servicios con Docker
npm run docker:up

# Iniciar servidor en modo watch
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

### Scripts Disponibles

```bash
# Base de datos
npm run db:generate          # Generar cliente Prisma
npm run db:push              # Aplicar schema a BD
npm run db:migrate           # Ejecutar migraciones
npm run db:push:tenant       # Aplicar schema de tenant

# Desarrollo
npm run start:dev            # Modo desarrollo con watch
npm run start:debug          # Modo debug
npm run build                # Compilar para producción

# Docker
npm run docker:up            # Iniciar servicios
npm run docker:down          # Detener servicios
npm run docker:logs          # Ver logs
npm run docker:clean         # Limpiar volúmenes

# Utilidades
npx ts-node scripts/seed.ts           # Poblar BD con datos demo
npx ts-node scripts/list-users.ts     # Listar usuarios
npx ts-node scripts/test-auth.ts      # Probar autenticación
```

## 📚 Documentación API

La documentación de la API está disponible en Swagger cuando el servidor está en ejecución:

```
http://localhost:3000/api
```

## 🏗️ Arquitectura

### Multi-Tenant

El sistema utiliza una arquitectura multi-tenant donde:
- **Base de datos principal**: Almacena SuperAdmin, tenants, planes y configuración global
- **Bases de datos de tenant**: Cada tenant tiene su propia base de datos para datos de negocio

### Módulos Principales

- **Auth**: Autenticación JWT, registro, login, refresh tokens
- **Users**: Gestión de usuarios (SuperAdmin y tenant)
- **Tenant**: Gestión de tenants y configuración
- **Orders**: Gestión de órdenes y pedidos
- **Tasks**: Sistema de tareas
- **CRM**: Gestión de clientes y leads

## 🔐 Seguridad

- Autenticación JWT con refresh tokens
- Rate limiting en endpoints de autenticación
- Validación de permisos por rol
- Aislamiento de datos por tenant
- Encriptación de contraseñas con bcrypt

## 📝 Variables de Entorno

Principales variables de entorno necesarias:

```env
# Base de datos principal
DATABASE_URL="postgresql://user:password@localhost:5432/nidia_flow"

# Base de datos de tenant (opcional, para desarrollo)
TENANT_DATABASE_URL="postgresql://user:password@localhost:5432/tenant_demo"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Aplicación
PORT=3000
NODE_ENV=development
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📦 Producción

```bash
# Compilar
npm run build

# Ejecutar
npm run start:prod
```

## ⚠️ Importante

- **Cambiar contraseñas por defecto en producción**
- Los usuarios demo son solo para desarrollo y testing
- No usar credenciales de demo en entornos de producción
- Revisar y actualizar variables de entorno antes de desplegar

## 📞 Soporte

Para más información sobre la arquitectura y configuración, consulta:
- `docs/multi-tenant-architecture.md` - Arquitectura multi-tenant
- `docs/roles-and-permissions.md` - Sistema de roles y permisos
