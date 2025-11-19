# NIDIA Flow - Backend API

Sistema de gestión empresarial multi-tenant desarrollado con NestJS, PostgreSQL y Prisma. Proporciona una plataforma SaaS completa para la gestión de clientes, productos, órdenes, tareas y operaciones de campo.

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Arquitectura Multi-Tenant](#arquitectura-multi-tenant)
5. [Flujos Principales](#flujos-principales)
6. [Sistema de Autenticación](#sistema-de-autenticación)
7. [Sistema de Roles y Permisos](#sistema-de-roles-y-permisos)
8. [Provisión de Tenants](#provisión-de-tenants)
9. [Estructura del Proyecto](#estructura-del-proyecto)
10. [Variables de Entorno](#variables-de-entorno)
11. [Scripts Disponibles](#scripts-disponibles)
12. [Testing](#testing)
13. [Despliegue](#despliegue)

## Descripción General

NIDIA Flow es una plataforma SaaS multi-tenant que permite a empresas gestionar sus operaciones comerciales incluyendo CRM, inventario, órdenes, tareas de campo, finanzas y comunicaciones. Cada cliente (tenant) tiene su propia base de datos aislada, garantizando máxima seguridad y privacidad de datos.

### Características Principales

- Arquitectura multi-tenant con base de datos por tenant (Database-per-Tenant)
- Provisión asíncrona de bases de datos usando BullMQ
- Autenticación JWT con refresh tokens
- Sistema de roles y permisos granulares (RBAC)
- API RESTful completa con documentación Swagger
- WebSockets para notificaciones en tiempo real
- Sistema de eventos y automatización
- Módulos: CRM, Productos, Órdenes, Tareas, Finanzas, Comunicaciones, Reportes

## Arquitectura del Sistema

### Diagrama de Arquitectura General

```mermaid
graph TB
    subgraph "Cliente"
        FE[Frontend Next.js]
    end
    
    subgraph "Backend NestJS"
        API[API REST]
        WS[WebSocket Server]
        AUTH[Auth Module]
        TENANT[Tenant Module]
        CRM[CRM Module]
        PROD[Products Module]
        ORD[Orders Module]
        TASK[Tasks Module]
        FIN[Financial Module]
        COMM[Communications Module]
    end
    
    subgraph "Cola de Trabajos"
        BULLMQ[BullMQ Queue]
        PROC[Tenant Provisioning Processor]
    end
    
    subgraph "Almacenamiento"
        REDIS[(Redis)]
        SUPERADMIN[(SuperAdmin DB)]
        TENANT1[(Tenant DB 1)]
        TENANT2[(Tenant DB 2)]
        TENANTN[(Tenant DB N)]
    end
    
    FE -->|HTTP/WS| API
    FE -->|WebSocket| WS
    API --> AUTH
    API --> TENANT
    API --> CRM
    API --> PROD
    API --> ORD
    API --> TASK
    API --> FIN
    API --> COMM
    
    AUTH --> SUPERADMIN
    TENANT --> SUPERADMIN
    TENANT --> BULLMQ
    BULLMQ --> PROC
    PROC --> TENANT1
    PROC --> TENANT2
    PROC --> TENANTN
    
    CRM --> TENANT1
    PROD --> TENANT1
    ORD --> TENANT1
    TASK --> TENANT1
    
    BULLMQ --> REDIS
    WS --> REDIS
```

### Diagrama de Componentes

```mermaid
graph LR
    subgraph "Capa de Presentación"
        CTRL[Controllers]
        DTO[DTOs]
        GUARD[Guards]
    end
    
    subgraph "Capa de Aplicación"
        SVC[Services]
        MID[Middleware]
        INT[Interceptors]
    end
    
    subgraph "Capa de Dominio"
        ENT[Entities]
        VAL[Validators]
        TYPES[Types]
    end
    
    subgraph "Capa de Infraestructura"
        PRISMA[Prisma Clients]
        REDIS_CLIENT[Redis Client]
        BULLMQ_CLIENT[BullMQ Client]
    end
    
    CTRL --> SVC
    CTRL --> GUARD
    SVC --> ENT
    SVC --> PRISMA
    SVC --> REDIS_CLIENT
    SVC --> BULLMQ_CLIENT
    MID --> SVC
    INT --> PRISMA
```

## Instalación y Configuración

### Prerrequisitos

- Node.js 18 o superior
- PostgreSQL 14 o superior
- Redis 6 o superior
- Docker y Docker Compose (opcional, para desarrollo)

### Instalación Rápida

```bash
# Clonar repositorio
git clone <repository-url>
cd nidia-flow-backend

# Instalar dependencias
yarn install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Generar clientes Prisma
npm run db:generate

# Iniciar servicios con Docker
npm run docker:up

# Aplicar migraciones
npm run db:push

# Poblar base de datos con datos demo
npm run db:seed

# Iniciar servidor de desarrollo
npm run start:dev
```

El servidor estará disponible en `http://localhost:4001` y la documentación Swagger en `http://localhost:4001/api/docs`.

### Configuración Manual

Si prefieres configurar sin Docker:

1. **PostgreSQL**: Crear base de datos `nidia_superadmin`
2. **Redis**: Iniciar servidor Redis en puerto 6379
3. **Variables de entorno**: Configurar `.env` con las credenciales
4. **Migraciones**: Ejecutar `npm run db:push`

## Arquitectura Multi-Tenant

### Modelo Database-per-Tenant

NIDIA Flow utiliza el modelo **Database-per-Tenant**, donde cada tenant tiene su propia base de datos PostgreSQL completamente aislada. Este modelo proporciona:

- Aislamiento total de datos
- Escalabilidad independiente por tenant
- Facilidad de backup y restauración
- Cumplimiento de regulaciones de privacidad
- Sin necesidad de filtros de tenant_id en queries

### Diagrama de Bases de Datos

```mermaid
erDiagram
    SUPERADMIN_DB ||--o{ TENANT : manages
    SUPERADMIN_DB ||--o{ USER : contains
    SUPERADMIN_DB ||--o{ PLAN : defines
    SUPERADMIN_DB ||--o{ SUBSCRIPTION : tracks
    
    TENANT ||--|| TENANT_DB : has
    TENANT_DB ||--o{ CUSTOMER : contains
    TENANT_DB ||--o{ PRODUCT : contains
    TENANT_DB ||--o{ ORDER : contains
    TENANT_DB ||--o{ TASK : contains
    TENANT_DB ||--o{ USER : contains
    
    SUPERADMIN_DB {
        uuid id PK
        string name
        string slug UK
        string db_name UK
        string db_host
        int db_port
        string db_username
        text db_password_encrypted
        boolean is_active
        string provisioning_status
    }
    
    TENANT_DB {
        uuid id PK
        string email UK
        string password_hash
        uuid tenant_id FK
    }
```

### Estructura de Bases de Datos

#### SuperAdmin Database (`nidia_superadmin`)

Gestiona toda la información de la plataforma:

- **Tenants**: Información de todos los clientes
- **Users**: Usuarios del sistema y administradores de tenants
- **Plans**: Planes de suscripción disponibles
- **Subscriptions**: Suscripciones activas de tenants
- **Invoices**: Facturación y pagos
- **System Logs**: Logs del sistema y auditoría

#### Tenant Databases (`tenant_{slug}_{env}`)

Cada tenant tiene su propia base de datos con:

- **Users**: Usuarios internos del tenant
- **Customers**: Clientes y leads del CRM
- **Products**: Catálogo de productos e inventario
- **Orders**: Órdenes y pedidos
- **Tasks**: Tareas y operaciones de campo
- **Transactions**: Transacciones financieras
- **Settings**: Configuración del tenant

### Resolución de Tenant

El sistema resuelve el tenant actual mediante:

1. **JWT Token**: Contiene `tenantId` y `dbName` en el payload
2. **Subdomain**: `{tenant-slug}.nidiaflow.com`
3. **Header personalizado**: `X-Tenant-Slug`
4. **Parámetro de ruta**: `/api/tenants/:slug/...`
5. **Query parameter**: `?tenant={slug}`

## Flujos Principales

### Flujo de Registro y Provisión

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend
    participant API as Auth API
    participant SA as SuperAdmin DB
    participant Q as BullMQ Queue
    participant P as Provisioning Processor
    participant TD as Tenant DB
    
    U->>FE: Registro con datos
    FE->>API: POST /auth/register
    API->>SA: Validar email/slug únicos
    API->>SA: Crear tenant (inactivo)
    API->>SA: Crear usuario (inactivo)
    API->>Q: Encolar job de provisioning
    API->>FE: Respuesta: status=provisioning
    FE->>U: Redirigir a página de provisioning
    
    Q->>P: Procesar job
    P->>TD: Crear base de datos
    P->>TD: Ejecutar migraciones
    P->>TD: Crear usuario admin inicial
    P->>TD: Verificar integridad
    P->>SA: Activar tenant y usuario
    P->>REDIS: Actualizar progreso
    
    FE->>API: GET /tenant/provisioning/:id/status
    API->>REDIS: Obtener progreso
    API->>FE: Retornar estado
    FE->>U: Mostrar progreso
    
    alt Provisioning completado
        FE->>U: Redirigir a login
    else Error
        FE->>U: Mostrar error
    end
```

### Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend
    participant API as Auth API
    participant SA as SuperAdmin DB
    participant TD as Tenant DB
    participant JWT as JWT Service
    
    U->>FE: Credenciales
    FE->>API: POST /auth/login
    API->>SA: Validar usuario
    alt Usuario válido
        API->>SA: Obtener tenant info
        API->>JWT: Generar access token
        API->>JWT: Generar refresh token
        JWT->>API: Tokens firmados
        API->>FE: Tokens + user info
        FE->>FE: Almacenar tokens
        FE->>U: Redirigir a dashboard
    else Credenciales inválidas
        API->>FE: Error 401
        FE->>U: Mostrar error
    end
    
    Note over FE,TD: Requests subsecuentes
    FE->>API: Request con Authorization header
    API->>JWT: Validar token
    JWT->>API: Payload (tenantId, dbName)
    API->>TD: Query con contexto de tenant
    TD->>API: Datos del tenant
    API->>FE: Respuesta
```

### Flujo de Request con Contexto de Tenant

```mermaid
sequenceDiagram
    participant C as Cliente
    participant MW as Middleware
    participant G as Guards
    participant CTRL as Controller
    participant SVC as Service
    participant TD as Tenant DB
    
    C->>MW: Request HTTP
    MW->>MW: Extraer JWT token
    MW->>MW: Decodificar payload
    MW->>MW: Obtener tenantId y dbName
    MW->>MW: Establecer contexto de tenant
    MW->>G: Continuar
    
    G->>G: Validar autenticación
    G->>G: Validar acceso al tenant
    G->>G: Verificar permisos
    G->>CTRL: Permitir acceso
    
    CTRL->>SVC: Llamar servicio
    SVC->>SVC: Obtener cliente Prisma del tenant
    SVC->>TD: Query a base de datos del tenant
    TD->>SVC: Resultados
    SVC->>CTRL: Datos procesados
    CTRL->>C: Respuesta JSON
```

## Sistema de Autenticación

### JWT Tokens

El sistema utiliza JWT (JSON Web Tokens) para autenticación:

- **Access Token**: Válido por 15 minutos, contiene información del usuario y tenant
- **Refresh Token**: Válido por 7 días, usado para renovar access tokens
- **Payload del Token**: Incluye `sub` (user ID), `email`, `tenantId`, `dbName`, `role`, `permissions`

### Estructura del JWT Payload

```typescript
interface JwtPayload {
  sub: string;           // User ID
  email: string;
  tenantId?: string;     // ID del tenant (si aplica)
  dbName?: string;       // Nombre de la BD del tenant
  role?: string;         // Rol del usuario
  permissions?: string[]; // Permisos del usuario
  iat: number;          // Issued at
  exp: number;          // Expiration
}
```

### Refresh Token Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Auth API
    participant JWT as JWT Service
    
    FE->>API: Request con access token expirado
    API->>FE: 401 Unauthorized
    FE->>API: POST /auth/refresh (con refresh token)
    API->>JWT: Validar refresh token
    alt Token válido
        JWT->>API: Payload válido
        API->>JWT: Generar nuevo access token
        API->>FE: Nuevo access token
        FE->>FE: Actualizar token
        FE->>API: Reintentar request original
    else Token inválido/expirado
        API->>FE: 401 Unauthorized
        FE->>FE: Redirigir a login
    end
```

## Sistema de Roles y Permisos

### Jerarquía de Roles

```mermaid
graph TD
    SA[Super Admin<br/>Nivel 1000]
    SUP[Support<br/>Nivel 900]
    BA[Billing Admin<br/>Nivel 800]
    TA[Tenant Admin<br/>Nivel 700]
    ADM[Admin<br/>Nivel 600]
    MGR[Manager<br/>Nivel 500]
    SAL[Sales<br/>Nivel 400]
    OPS[Operator<br/>Nivel 300]
    ACC[Accountant<br/>Nivel 200]
    VWR[Viewer<br/>Nivel 100]
    
    SA --> SUP
    SA --> BA
    SA --> TA
    TA --> ADM
    ADM --> MGR
    MGR --> SAL
    MGR --> OPS
    MGR --> ACC
    MGR --> VWR
```

### Categorías de Permisos

El sistema implementa permisos granulares organizados por módulo:

- **Sistema**: `system:admin`, `system:support`, `system:billing`
- **Tenants**: `tenant:create`, `tenant:read`, `tenant:update`, `tenant:delete`
- **Usuarios**: `user:create`, `user:read`, `user:update`, `user:delete`, `user:assign_roles`
- **CRM**: `customer:create`, `customer:read`, `customer:update`, `customer:delete`, `customer:assign`
- **Productos**: `product:create`, `product:read`, `product:update`, `product:delete`, `product:manage_inventory`
- **Órdenes**: `order:create`, `order:read`, `order:update`, `order:delete`, `order:approve`
- **Tareas**: `task:create`, `task:read`, `task:update`, `task:delete`, `task:assign`
- **Finanzas**: `payment:create`, `payment:read`, `accounting:read`, `accounting:reports`
- **Reportes**: `reports:view`, `reports:create`, `reports:export`
- **Configuración**: `settings:read`, `settings:update`, `settings:integrations`

### Uso de Guards y Decoradores

```typescript
// Ejemplo de controlador con permisos
@Controller('customers')
@UseGuards(AuthGuard('jwt'), TenantGuard, PermissionsGuard)
export class CustomerController {
  
  @Get()
  @RequireReadAccess('customer')
  async listCustomers() {
    // Solo usuarios con customer:read
  }

  @Post()
  @RequireCreateAccess('customer')
  @SalesTeam()
  async createCustomer() {
    // Requiere customer:create Y rol de ventas o superior
  }

  @Delete(':id')
  @RequireDeleteAccess('customer')
  @ManagerOrHigher()
  async deleteCustomer() {
    // Requiere customer:delete Y rol de gerente o superior
  }
}
```

## Provisión de Tenants

### Proceso Asíncrono de Provisioning

El provisioning de nuevos tenants se realiza de forma asíncrona usando BullMQ para evitar timeouts y proporcionar mejor experiencia de usuario.

### Estados de Provisioning

```mermaid
stateDiagram-v2
    [*] --> pending: Registro inicial
    pending --> provisioning: Job encolado
    provisioning --> creating_database: Inicio
    creating_database --> running_migrations: BD creada
    running_migrations --> creating_initial_user: Migraciones OK
    creating_initial_user --> completed: Usuario creado
    completed --> [*]: Tenant activo
    
    creating_database --> failed: Error
    running_migrations --> failed: Error
    creating_initial_user --> failed: Error
    failed --> [*]: Reintento o rollback
```

### Pasos del Provisioning

1. **Crear Base de Datos** (10%): Crear base de datos PostgreSQL y usuario
2. **Ejecutar Migraciones** (50%): Aplicar schema de tenant usando Prisma Migrate
3. **Crear Usuario Inicial** (80%): Crear usuario administrador en la BD del tenant
4. **Verificar Integridad** (100%): Validar que la BD esté correctamente configurada
5. **Activar Tenant**: Marcar tenant y usuario como activos en SuperAdmin DB

### Monitoreo de Progreso

El progreso se almacena en Redis con TTL de 1 hora y puede ser consultado mediante:

```
GET /api/v1/tenant/provisioning/:tenantId/status
```

Respuesta:
```json
{
  "status": "provisioning",
  "progress": 50,
  "currentStep": "Ejecutando migraciones...",
  "startedAt": "2025-01-13T10:00:00Z",
  "jobId": "123",
  "attempts": 0,
  "maxAttempts": 3
}
```

## Estructura del Proyecto

```
nidia-flow-backend/
├── prisma/
│   ├── superadmin-schema.prisma    # Schema de SuperAdmin DB
│   └── tenant-schema.prisma        # Schema de Tenant DB
├── generated/
│   ├── prisma/                     # Cliente Prisma SuperAdmin
│   └── tenant-prisma/              # Cliente Prisma Tenant
├── src/
│   ├── auth/                       # Módulo de autenticación
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── guards/                 # Guards de autenticación
│   │   ├── strategies/             # Estrategias Passport
│   │   └── dto/                    # Data Transfer Objects
│   ├── tenant/                     # Módulo de tenants
│   │   ├── tenant.service.ts        # Gestión de tenants (SUPERADMIN)
│   │   ├── services/
│   │   │   ├── tenant-prisma.service.ts      # Cliente Prisma tenant (TENANT)
│   │   │   ├── tenant-provisioning.service.ts # Provisioning (SUPERADMIN)
│   │   │   └── tenant-health.service.ts
│   │   ├── processors/
│   │   │   └── tenant-provisioning.processor.ts # BullMQ processor
│   │   ├── controllers/            # Controladores de módulos tenant
│   │   ├── middleware/             # Middleware de contexto
│   │   ├── guards/                 # Guards de tenant
│   │   └── modules/                # Módulos de negocio
│   │       ├── crm.module.ts
│   │       ├── products.module.ts
│   │       ├── financial.module.ts
│   │       └── ...
│   ├── users/                      # Gestión de usuarios
│   ├── plans/                      # Gestión de planes
│   ├── orders/                     # Módulo de órdenes
│   ├── tasks/                      # Módulo de tareas
│   ├── common/                     # Utilidades comunes
│   │   ├── events/                 # Sistema de eventos
│   │   └── decorators/             # Decoradores personalizados
│   └── lib/
│       └── prisma.ts               # Cliente Prisma SuperAdmin
├── scripts/                        # Scripts de utilidad
├── test/                           # Tests
├── docs/                           # Documentación adicional
└── docker-compose.dev.yml          # Configuración Docker
```

### Separación de Contextos

El código está claramente marcado con comentarios que indican el contexto de ejecución:

- **SUPERADMIN**: Código que se ejecuta en contexto de SuperAdmin (gestión de tenants)
- **TENANT**: Código que se ejecuta en contexto de tenant (operaciones de negocio)

Ejemplo:
```typescript
/**
 * TenantService - Gestión de tenants
 * 
 * CONTEXTO DE EJECUCIÓN:
 * - SUPERADMIN: Operaciones de gestión de tenants
 * - TENANT: Operaciones de consulta de información del tenant actual
 */
```

## Variables de Entorno

### Variables Requeridas

```env
# Base de datos SuperAdmin
DATABASE_URL="postgresql://user:password@localhost:5432/nidia_superadmin"

# Configuración de base de datos para tenants
TENANT_DB_HOST="localhost"
TENANT_DB_PORT="5432"
TENANT_DB_USERNAME="postgres"
TENANT_DB_PASSWORD="your_secure_password"

# Redis (para BullMQ y cache)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_REFRESH_EXPIRES_IN="7d"

# Aplicación
PORT=4001
NODE_ENV="development"
FRONTEND_URL="http://localhost:4002"
API_PREFIX="api/v1"

# Email (para notificaciones)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_app_password"
SMTP_FROM="noreply@nidiaflow.com"

# Encriptación
ENCRYPTION_KEY="your-encryption-key-change-in-production"
```

## Scripts Disponibles

### Base de Datos

```bash
npm run db:generate          # Generar clientes Prisma
npm run db:push              # Aplicar schema SuperAdmin
npm run db:push:tenant       # Aplicar schema tenant
npm run db:migrate           # Ejecutar migraciones SuperAdmin
npm run db:migrate:tenant    # Ejecutar migraciones tenant
npm run db:studio            # Abrir Prisma Studio (SuperAdmin)
npm run db:studio:tenant     # Abrir Prisma Studio (Tenant)
npm run db:seed              # Poblar BD con datos demo
npm run db:reset             # Resetear BD SuperAdmin
```

### Desarrollo

```bash
npm run start:dev            # Modo desarrollo con watch
npm run start:debug          # Modo debug
npm run build                # Compilar para producción
npm run start:prod           # Ejecutar producción
```

### Docker

```bash
npm run docker:up            # Iniciar servicios
npm run docker:down          # Detener servicios
npm run docker:logs          # Ver logs
npm run docker:clean         # Limpiar volúmenes
```

### Utilidades

```bash
npm run db:seed              # Poblar BD con datos demo
npx ts-node scripts/list-users.ts     # Listar usuarios
npx ts-node scripts/test-auth.ts      # Probar autenticación
npx ts-node scripts/provision-tenant.ts # Provisionar tenant manual
```

## Testing

### Tests Unitarios

```bash
npm run test
npm run test:watch
npm run test:cov
```

### Tests E2E

```bash
npm run test:e2e
```

## Despliegue

### Build de Producción

```bash
npm run build
npm run start:prod
```

### Consideraciones de Producción

1. **Variables de Entorno**: Usar valores seguros y únicos
2. **Base de Datos**: Configurar conexiones de producción
3. **Redis**: Configurar Redis en la nube (AWS ElastiCache, Redis Cloud, etc.)
4. **SSL/TLS**: Configurar certificados SSL
5. **Rate Limiting**: Configurar límites apropiados
6. **Monitoring**: Implementar logging y monitoreo
7. **Backups**: Configurar backups automáticos de bases de datos

### Docker en Producción

```bash
docker build -t nidia-flow-backend .
docker run -p 4001:4001 --env-file .env.production nidia-flow-backend
```

## Documentación API

La documentación interactiva de la API está disponible en Swagger cuando el servidor está ejecutándose:

```
http://localhost:4001/api/docs
```

## Usuarios Demo

### SuperAdmin

- **Email**: `admin@nidiaflow.com`
- **Password**: `SuperAdmin123!`
- **Rol**: `super_admin`

### Listar Usuarios

```bash
npx ts-node scripts/list-users.ts
```

## Solución de Problemas

### Error: "Docker no está ejecutándose"

Verificar que Docker Desktop esté ejecutándose y accesible.

### Error: "Puerto ya en uso"

```bash
# Verificar puertos ocupados
lsof -i :4001
lsof -i :5432
lsof -i :6379

# Detener servicios conflictivos
npm run docker:down
```

### Error: "Prisma Client no generado"

```bash
npm run db:generate
```

### Error: "Conexión a base de datos falló"

1. Verificar que PostgreSQL esté ejecutándose
2. Verificar credenciales en `.env`
3. Verificar que la BD `nidia_superadmin` exista

### Reinicio Completo

```bash
npm run docker:down
docker volume prune
npm run dev:setup:clean
```

## Referencias

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
