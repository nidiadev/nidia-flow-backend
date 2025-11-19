# Análisis de Seguridad: Autenticación Multi-Tenant

## 1. Seguridad del JWT

### ❌ NO es seguro guardar en JWT:
- Cadenas de conexión completas (`postgresql://user:pass@host:port/db`)
- Passwords o secrets
- Información crítica de negocio
- Credenciales de acceso

### ✅ SÍ es seguro guardar en JWT:
- Identificadores (userId, tenantId)
- Nombres de base de datos (`dbName`) - **Solo el nombre, NO la cadena de conexión**
- Roles y permisos básicos
- Email (público)

### 📊 Análisis Actual:

**Estado actual:**
- ✅ `dbName` en JWT: **SEGURO** (solo identificador, formato: `tenant_{uuid}_{env}`)
- ✅ `tenantId` en JWT: **SEGURO** (solo identificador UUID)
- ✅ Credenciales de conexión: **NUNCA en JWT** - Se obtienen desde SuperAdmin DB cuando se necesita

**Recomendación:**
- El sistema actual es **suficientemente seguro** para la mayoría de casos
- **Opcional**: Usar Redis para cachear información sensible con TTL igual al JWT
- **Ventaja de Redis**: Permite invalidar tokens inmediatamente (logout forzado)

### 🔒 Mejora Opcional con Redis:

```typescript
// En lugar de guardar dbName en JWT, guardar solo tenantId
// Y cachear dbName en Redis con TTL = expiración del JWT
const redisKey = `session:${userId}:${tenantId}`;
await redis.setex(redisKey, jwtExpiration, JSON.stringify({
  dbName: tenant.dbName,
  role: user.role,
  permissions: user.permissions,
}));
```

**Ventajas:**
- Invalidación inmediata de sesiones
- Menos información en JWT
- Mejor control de sesiones activas

**Desventajas:**
- Dependencia adicional (Redis)
- Más complejidad
- Latencia adicional (mínima)

## 2. Login Multi-Tenant

### Problema Actual:
- El login solo busca en **SuperAdmin DB**
- Los usuarios internos del tenant (creados en BD del tenant) **NO pueden autenticarse**

### Solución Propuesta:

#### Opción A: Búsqueda Inteligente (Recomendada)
1. Buscar primero en SuperAdmin DB
2. Si no se encuentra, buscar en BD de tenants
3. Identificar tenant por:
   - `tenantId` en el request (si se proporciona)
   - Dominio del email (ej: `user@tenant-slug.com`)
   - Subdominio de la URL (ej: `tenant-slug.app.com`)

#### Opción B: Login con TenantId Explícito
- El frontend envía `tenantId` o `tenantSlug` en el login
- Backend busca directamente en la BD del tenant especificado

#### Opción C: Email Único Global
- Todos los usuarios (SuperAdmin + Tenants) tienen emails únicos
- Backend busca en todas las BD hasta encontrar el usuario

### 🔐 Implementación Recomendada:

**Flujo de Login:**
1. Usuario ingresa email + password
2. Backend intenta identificar el tenant:
   - Si hay `tenantId` en request → usar ese tenant
   - Si hay subdominio → extraer tenant del subdominio
   - Si hay dominio personalizado en email → buscar tenant por dominio
3. Buscar usuario:
   - Primero en SuperAdmin DB (usuarios del sistema)
   - Si no se encuentra y hay tenant identificado → buscar en BD del tenant
   - Si no hay tenant identificado → buscar en todas las BD de tenants activos
4. Validar password y generar JWT con información correcta

### 🛡️ Consideraciones de Seguridad:

1. **Rate Limiting**: Limitar intentos de login por IP/email
2. **Timing Attack**: Usar tiempo constante para búsquedas (evitar revelar si usuario existe)
3. **Logging**: Registrar todos los intentos de login (exitosos y fallidos)
4. **Validación de Tenant**: Verificar que el tenant esté activo antes de buscar usuarios
5. **Password Hashing**: Usar bcrypt con salt adecuado

## 3. Arquitectura de Usuarios

### Tipos de Usuarios:

1. **SuperAdmin Users** (BD SuperAdmin):
   - `systemRole: 'super_admin'`
   - Acceso a todas las funcionalidades del sistema
   - No tienen `tenantId`

2. **Tenant Admin Users** (BD SuperAdmin):
   - `systemRole: 'tenant_admin'`
   - Tienen `tenantId`
   - Usuario inicial creado durante provisioning
   - Acceso administrativo a su tenant

3. **Tenant Internal Users** (BD del Tenant):
   - Creados por el tenant admin
   - Solo existen en la BD del tenant
   - No tienen registro en SuperAdmin DB
   - Roles: `admin`, `manager`, `sales`, `employee`, etc.

### Identificación de Usuario:

```typescript
interface UserIdentity {
  // Usuarios SuperAdmin
  userId: string;        // UUID en SuperAdmin DB
  systemRole: 'super_admin';
  tenantId?: null;
  
  // Usuarios Tenant Admin
  userId: string;        // UUID en SuperAdmin DB
  systemRole: 'tenant_admin';
  tenantId: string;      // UUID del tenant
  
  // Usuarios Tenant Internos
  userId: string;        // UUID en Tenant DB
  systemRole: 'tenant_user';
  tenantId: string;      // UUID del tenant
  role: string;          // Rol dentro del tenant
}
```

## 4. Implementación Propuesta

### Cambios Necesarios:

1. **Modificar `validateUser`** para buscar en múltiples BD
2. **Agregar identificación de tenant** en el login
3. **Actualizar JWT payload** para incluir tipo de usuario
4. **Implementar cache en Redis** (opcional pero recomendado)
5. **Mejorar logging** de autenticación

### Estructura de Login:

```typescript
async login(loginDto: LoginDto & { tenantId?: string, tenantSlug?: string }) {
  // 1. Identificar tenant
  const tenant = await this.identifyTenant(loginDto);
  
  // 2. Buscar usuario
  const user = await this.findUser(loginDto.email, tenant);
  
  // 3. Validar password
  await this.validatePassword(user, loginDto.password);
  
  // 4. Generar JWT
  const payload = this.buildJwtPayload(user, tenant);
  
  // 5. Cachear en Redis (opcional)
  await this.cacheSession(user, tenant, payload);
  
  return { accessToken, refreshToken, user };
}
```

