# Arquitectura del Sistema NIDIA Flow

Este documento describe en detalle la arquitectura técnica del sistema NIDIA Flow.

## Diagrama de Arquitectura de Alto Nivel

```mermaid
graph TB
    subgraph "Capa de Cliente"
        WEB[Web Browser]
        MOBILE[Mobile App]
    end
    
    subgraph "Capa de Aplicación"
        FE[Next.js Frontend]
        API[NestJS Backend API]
    end
    
    subgraph "Capa de Servicios"
        AUTH_SVC[Auth Service]
        TENANT_SVC[Tenant Service]
        CRM_SVC[CRM Service]
        PROD_SVC[Products Service]
        ORDER_SVC[Orders Service]
        TASK_SVC[Tasks Service]
    end
    
    subgraph "Capa de Infraestructura"
        BULLMQ[BullMQ Queue]
        REDIS[(Redis Cache)]
        SUPERADMIN[(SuperAdmin DB)]
        TENANT_DBS[(Tenant Databases)]
    end
    
    WEB --> FE
    MOBILE --> API
    FE --> API
    API --> AUTH_SVC
    API --> TENANT_SVC
    API --> CRM_SVC
    API --> PROD_SVC
    API --> ORDER_SVC
    API --> TASK_SVC
    
    AUTH_SVC --> SUPERADMIN
    TENANT_SVC --> SUPERADMIN
    TENANT_SVC --> BULLMQ
    BULLMQ --> REDIS
    
    CRM_SVC --> TENANT_DBS
    PROD_SVC --> TENANT_DBS
    ORDER_SVC --> TENANT_DBS
    TASK_SVC --> TENANT_DBS
```

## Arquitectura Multi-Tenant

### Modelo Database-per-Tenant

```mermaid
graph LR
    subgraph "SuperAdmin Database"
        TENANTS[Tenants Table]
        USERS[Users Table]
        PLANS[Plans Table]
        SUBS[Subscriptions Table]
    end
    
    subgraph "Tenant Database 1"
        T1_USERS[Users]
        T1_CUSTOMERS[Customers]
        T1_PRODUCTS[Products]
        T1_ORDERS[Orders]
    end
    
    subgraph "Tenant Database 2"
        T2_USERS[Users]
        T2_CUSTOMERS[Customers]
        T2_PRODUCTS[Products]
        T2_ORDERS[Orders]
    end
    
    TENANTS -->|dbName: tenant_acme_prod| T1_USERS
    TENANTS -->|dbName: tenant_globex_prod| T2_USERS
```

### Flujo de Conexión a Base de Datos

```mermaid
sequenceDiagram
    participant REQ as Request
    participant MW as TenantContextMiddleware
    participant JWT as JWT Decoder
    participant TS as TenantService
    participant TPS as TenantPrismaService
    participant TD as Tenant DB
    
    REQ->>MW: HTTP Request con JWT
    MW->>JWT: Decodificar token
    JWT->>MW: Payload (tenantId, dbName)
    MW->>TS: getTenantById(tenantId)
    TS->>MW: Tenant info
    MW->>TPS: setTenantContext({tenantId, dbName})
    MW->>REQ: Continuar
    
    REQ->>TPS: getTenantClient()
    TPS->>TPS: Verificar si existe conexión
    alt Conexión no existe
        TPS->>TD: Crear PrismaClient
        TPS->>TD: $connect()
        TPS->>TPS: Cachear conexión
    end
    TPS->>REQ: PrismaClient del tenant
```

## Diagrama de Clases Principal

```mermaid
classDiagram
    class TenantService {
        -plansService: PlansService
        -provisioningService: TenantProvisioningService
        +getTenantById(id: string): Promise~Tenant~
        +getTenantBySlug(slug: string): Promise~Tenant~
        +createTenant(data: CreateTenantDto): Promise~Tenant~
    }
    
    class TenantProvisioningService {
        +createTenantDatabase(config): Promise~void~
        +runTenantMigration(config): Promise~void~
        +createInitialUser(config, userData): Promise~void~
        +verifyDatabase(dbName): Promise~void~
    }
    
    class TenantPrismaService {
        -tenantContext: TenantContext
        -dedicatedClients: Map~string, PrismaClient~
        +setTenantContext(context): void
        +getTenantClient(): Promise~PrismaClient~
        +executeTransaction(callback): Promise~T~
    }
    
    class TenantProvisioningProcessor {
        -provisioningService: TenantProvisioningService
        -tenantService: TenantService
        -usersService: UsersService
        -redis: Redis
        +process(job: Job): Promise~void~
        -updateStatus(tenantId, progress): Promise~void~
        -activateTenant(tenantId, email): Promise~void~
    }
    
    class AuthService {
        -usersService: UsersService
        -jwtService: JwtService
        -tenantService: TenantService
        -provisioningQueue: Queue
        +login(credentials): Promise~AuthResponse~
        +register(data): Promise~AuthResponse~
        +refreshToken(token): Promise~AuthResponse~
    }
    
    TenantService --> TenantProvisioningService
    TenantProvisioningProcessor --> TenantProvisioningService
    TenantProvisioningProcessor --> TenantService
    AuthService --> TenantService
    AuthService --> Queue
```

## Diagrama de Secuencia de Provisioning

```mermaid
sequenceDiagram
    participant U as Usuario
    participant API as AuthService
    participant SA as SuperAdmin DB
    participant Q as BullMQ Queue
    participant P as ProvisioningProcessor
    participant PS as ProvisioningService
    participant TD as Tenant DB
    participant R as Redis
    
    U->>API: POST /auth/register
    API->>SA: Validar email/slug
    API->>SA: Crear tenant (isActive=false)
    API->>SA: Crear usuario (isActive=false)
    API->>Q: add('provision-tenant', data)
    API->>U: {status: 'provisioning', tenantId}
    
    Q->>P: process(job)
    P->>SA: Update provisioningStatus='provisioning'
    P->>R: setex('provisioning:tenantId', progress)
    P->>P: updateProgress(0)
    
    P->>PS: createTenantDatabase(config)
    PS->>TD: CREATE DATABASE
    P->>R: updateStatus(progress: 10)
    P->>P: updateProgress(10)
    
    P->>PS: runTenantMigration(config)
    PS->>TD: prisma migrate deploy
    P->>R: updateStatus(progress: 50)
    P->>P: updateProgress(50)
    
    P->>PS: createInitialUser(config, userData)
    PS->>TD: INSERT INTO users
    P->>R: updateStatus(progress: 80)
    P->>P: updateProgress(80)
    
    P->>PS: verifyDatabase(dbName)
    PS->>TD: SELECT 1
    P->>R: updateStatus(progress: 100, status: 'completed')
    P->>P: updateProgress(100)
    
    P->>SA: Update tenant (isActive=true, provisioningStatus='completed')
    P->>SA: Update user (isActive=true)
    P->>Q: Job completed
```

## Diagrama de Estados del Tenant

```mermaid
stateDiagram-v2
    [*] --> Pending: Registro
    Pending --> Provisioning: Job iniciado
    Provisioning --> CreatingDatabase: Paso 1
    CreatingDatabase --> RunningMigrations: BD creada
    RunningMigrations --> CreatingUser: Migraciones OK
    CreatingUser --> Verifying: Usuario creado
    Verifying --> Active: Verificación OK
    Active --> [*]
    
    CreatingDatabase --> Failed: Error
    RunningMigrations --> Failed: Error
    CreatingUser --> Failed: Error
    Verifying --> Failed: Error
    
    Failed --> Provisioning: Retry
    Failed --> Suspended: Max retries
    Suspended --> [*]
    
    Active --> Suspended: Suspensión manual
    Suspended --> Active: Reactivación
```

## Diagrama de Componentes de Módulos

```mermaid
graph TB
    subgraph "Auth Module"
        AUTH_CTRL[AuthController]
        AUTH_SVC[AuthService]
        JWT_STRAT[JwtStrategy]
        PERM_GUARD[PermissionsGuard]
    end
    
    subgraph "Tenant Module"
        TENANT_CTRL[TenantController]
        TENANT_SVC[TenantService]
        TENANT_PRISMA[TenantPrismaService]
        PROV_SVC[TenantProvisioningService]
        PROV_PROC[TenantProvisioningProcessor]
        TENANT_GUARD[TenantGuard]
        TENANT_MW[TenantContextMiddleware]
    end
    
    subgraph "CRM Module"
        CRM_CTRL[CustomerController]
        CRM_SVC[CustomerService]
    end
    
    subgraph "Products Module"
        PROD_CTRL[ProductController]
        PROD_SVC[ProductService]
    end
    
    AUTH_CTRL --> AUTH_SVC
    AUTH_SVC --> JWT_STRAT
    AUTH_SVC --> TENANT_SVC
    
    TENANT_CTRL --> TENANT_SVC
    TENANT_SVC --> PROV_SVC
    PROV_PROC --> PROV_SVC
    PROV_PROC --> TENANT_SVC
    
    CRM_CTRL --> CRM_SVC
    CRM_SVC --> TENANT_PRISMA
    PROD_CTRL --> PROD_SVC
    PROD_SVC --> TENANT_PRISMA
    
    TENANT_MW --> TENANT_PRISMA
    TENANT_GUARD --> TENANT_SVC
```

## Flujo de Datos en Request

```mermaid
flowchart TD
    START[Request HTTP] --> MIDDLEWARE{TenantContextMiddleware}
    MIDDLEWARE -->|Extraer JWT| DECODE[Decodificar Token]
    DECODE -->|Obtener tenantId, dbName| SET_CTX[Establecer Contexto]
    SET_CTX --> GUARD{TenantGuard}
    GUARD -->|Validar acceso| PERM_GUARD{PermissionsGuard}
    PERM_GUARD -->|Validar permisos| CTRL[Controller]
    CTRL --> SVC[Service]
    SVC --> PRISMA[TenantPrismaService]
    PRISMA -->|Obtener cliente| CLIENT{Cliente existe?}
    CLIENT -->|No| CREATE[Crear PrismaClient]
    CLIENT -->|Sí| USE[Usar cliente cacheado]
    CREATE --> CONNECT[Conectar a BD]
    CONNECT --> USE
    USE --> QUERY[Ejecutar Query]
    QUERY --> RESPONSE[Respuesta JSON]
```

## Modelo de Datos SuperAdmin

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ SUBSCRIPTION : has
    TENANT ||--o{ INVOICE : generates
    TENANT ||--o{ TENANT_DOMAIN : has
    PLAN ||--o{ SUBSCRIPTION : used_in
    USER ||--o{ SESSION : has
    
    TENANT {
        uuid id PK
        string slug UK
        string db_name UK
        string db_host
        int db_port
        string db_username
        text db_password_encrypted
        boolean is_active
        string provisioning_status
        json settings
    }
    
    USER {
        uuid id PK
        string email UK
        string password_hash
        uuid tenant_id FK
        string system_role
        boolean is_active
    }
    
    PLAN {
        uuid id PK
        string name UK
        int max_users
        int max_storage_gb
        decimal price_monthly
    }
    
    SUBSCRIPTION {
        uuid id PK
        uuid tenant_id FK
        uuid plan_id FK
        string status
        date current_period_start
        date current_period_end
    }
```

## Modelo de Datos Tenant

```mermaid
erDiagram
    USER ||--o{ CUSTOMER : manages
    USER ||--o{ TASK : assigned_to
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ INTERACTION : has
    PRODUCT ||--o{ ORDER_ITEM : in
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--o{ PAYMENT : has
    TASK ||--o{ TASK_CHECKLIST : has
    
    USER {
        uuid id PK
        string email UK
        string password_hash
        string role
        string[] permissions
        boolean is_active
    }
    
    CUSTOMER {
        uuid id PK
        string name
        string email
        string phone
        string type
        decimal lead_score
    }
    
    PRODUCT {
        uuid id PK
        string name
        string sku UK
        decimal price
        int stock_quantity
    }
    
    ORDER {
        uuid id PK
        uuid customer_id FK
        string status
        decimal total_amount
        date created_at
    }
    
    TASK {
        uuid id PK
        uuid assigned_to_id FK
        string title
        string status
        date due_date
    }
```

## Patrones de Diseño Utilizados

### Singleton Pattern
- `TenantPrismaService`: Gestiona conexiones Prisma por tenant
- `Prisma Client`: Instancias únicas por base de datos

### Factory Pattern
- `TenantProvisioningService`: Crea bases de datos y configuraciones
- `TenantPrismaService`: Crea instancias de PrismaClient

### Strategy Pattern
- `JwtStrategy`: Estrategia de autenticación JWT
- `LocalStrategy`: Estrategia de autenticación local

### Middleware Pattern
- `TenantContextMiddleware`: Establece contexto de tenant
- `TenantConnectionMiddleware`: Gestiona conexiones

### Guard Pattern
- `TenantGuard`: Valida acceso a tenant
- `PermissionsGuard`: Valida permisos
- `RolesGuard`: Valida roles

## Escalabilidad

### Escalabilidad Horizontal

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX/HAProxy]
    end
    
    subgraph "API Instances"
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance N]
    end
    
    subgraph "Queue Workers"
        W1[Worker 1]
        W2[Worker 2]
        WN[Worker N]
    end
    
    subgraph "Databases"
        SA_DB[(SuperAdmin DB)]
        T_DB1[(Tenant DB 1)]
        T_DB2[(Tenant DB 2)]
        T_DBN[(Tenant DB N)]
    end
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> SA_DB
    API2 --> SA_DB
    API3 --> SA_DB
    
    API1 --> T_DB1
    API2 --> T_DB2
    API3 --> T_DBN
    
    W1 --> SA_DB
    W2 --> SA_DB
    WN --> SA_DB
```

### Estrategias de Escalabilidad

1. **API Servers**: Múltiples instancias detrás de load balancer
2. **Queue Workers**: Workers distribuidos para procesar jobs
3. **Database Sharding**: Distribuir tenants en múltiples servidores de BD
4. **Read Replicas**: Replicas de lectura para reportes y analytics
5. **Caching**: Redis para cache de queries frecuentes

## Seguridad

### Capas de Seguridad

```mermaid
graph TD
    REQ[Request] --> HTTPS[HTTPS/TLS]
    HTTPS --> RATE[Rate Limiting]
    RATE --> AUTH[Authentication]
    AUTH --> TENANT[Tenant Isolation]
    TENANT --> PERM[Permission Check]
    PERM --> VALID[Input Validation]
    VALID --> SQL[SQL Injection Protection]
    SQL --> RESP[Response]
```

### Medidas de Seguridad Implementadas

1. **Autenticación**: JWT con refresh tokens
2. **Autorización**: RBAC con permisos granulares
3. **Aislamiento**: Base de datos por tenant
4. **Encriptación**: Contraseñas con bcrypt, datos sensibles encriptados
5. **Validación**: Validación de entrada con class-validator
6. **Rate Limiting**: Límites de requests por IP/usuario
7. **HTTPS**: Forzado en producción
8. **CORS**: Configuración restrictiva

## Monitoreo y Observabilidad

### Métricas Clave

- Tiempo de respuesta de API
- Tasa de errores
- Uso de recursos (CPU, memoria)
- Conexiones de base de datos activas
- Jobs de BullMQ procesados/fallidos
- Uso de almacenamiento por tenant

### Logging

- Logs estructurados con niveles (error, warn, info, debug)
- Contexto de tenant en todos los logs
- Trazabilidad de requests con request IDs
- Auditoría de acciones críticas

