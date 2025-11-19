import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UsersService } from '../users/users.service';
import { TenantService } from '../tenant/tenant.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import prisma from '../lib/prisma';
// import { User } from '@prisma/superadmin';
// Temporarily use any type
type User = any;
import { LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TenantProvisioningData } from '../tenant/types/provisioning.types';

// Helper function to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => TenantService))
    private tenantService: TenantService,
    @InjectQueue('tenant-provisioning')
    private provisioningQueue: Queue,
  ) {}

  /**
   * Identificar tenant desde el request de login
   */
  private async identifyTenant(loginDto: LoginDto): Promise<any | null> {
    // 1. Si se proporciona tenantId, usarlo directamente
    if (loginDto.tenantId) {
      return await this.tenantService.getTenantById(loginDto.tenantId);
    }

    // 2. Si se proporciona tenantSlug, buscarlo
    if (loginDto.tenantSlug) {
      return await this.tenantService.getTenantBySlug(loginDto.tenantSlug);
    }

    // 3. TODO: Extraer de subdominio o dominio del email (futuro)
    // Por ahora, retornar null (buscar en todas las BD)
    return null;
  }

  /**
   * Buscar usuario en SuperAdmin DB
   */
  private async findUserInSuperAdmin(email: string): Promise<any | null> {
    return await this.usersService.findByEmail(email);
  }

  /**
   * Desencriptar password del tenant
   */
  private decryptPassword(encrypted: string): string {
    try {
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      const parts = encrypted.split(':');
      if (parts.length !== 2) {
        // Si no tiene formato de encriptación, asumir que es texto plano (solo para desarrollo)
        return encrypted;
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      const key = crypto.scryptSync(encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      // Si falla la desencriptación, asumir que es texto plano (solo para desarrollo)
      return encrypted;
    }
  }

  /**
   * Buscar usuario en BD del tenant
   */
  private async findUserInTenant(email: string, tenant: any): Promise<any | null> {
    let tenantClient: any = null;
    try {
      // Desencriptar password del tenant
      const dbPassword = this.decryptPassword(tenant.dbPasswordEncrypted);
      const databaseUrl = `postgresql://${tenant.dbUsername}:${encodeURIComponent(dbPassword)}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;

      // Crear cliente Prisma temporal para el tenant
      const { PrismaClient } = await import('@prisma/tenant');
      tenantClient = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });

      await tenantClient.$connect();

      // Buscar usuario en BD del tenant
      const user = await tenantClient.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          firstName: true,
          lastName: true,
          role: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return null;
      }

      // Agregar información del tenant al usuario
      return {
        ...user,
        tenantId: tenant.id,
        systemRole: 'tenant_user', // Usuario interno del tenant
        dbName: tenant.dbName,
      };
    } catch (error: any) {
      // Si hay error al conectar a la BD del tenant, retornar null silenciosamente
      // No loguear para evitar spam en logs cuando hay muchos tenants
      return null;
    } finally {
      // Asegurar que se desconecte el cliente
      if (tenantClient) {
        try {
          await tenantClient.$disconnect();
        } catch (error) {
          // Ignorar errores al desconectar
        }
      }
    }
  }

  /**
   * Validar usuario (busca en SuperAdmin y/o Tenant DB)
   */
  async validateUser(email: string, password: string, tenant?: any): Promise<any> {
    let user: any = null;

    // 1. Buscar primero en SuperAdmin DB (usuarios del sistema)
    user = await this.findUserInSuperAdmin(email);

    // Si encontramos el usuario en SuperAdmin, validar password directamente
    if (user) {
      // Validar estado del usuario
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      if (user.isLocked) {
        throw new UnauthorizedException(`Account is locked: ${user.lockedReason || 'Unknown reason'}`);
      }

      // Validar password
      if (!user.passwordHash) {
        // Si no hay passwordHash, el usuario no puede hacer login
        console.error(`[AUTH] User ${email} found but has no passwordHash`);
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        console.warn(`[AUTH] Invalid password for user ${email}`);
        await this.usersService.incrementLoginAttempts(user.id);
        return null;
      }

      // Resetear intentos y actualizar último login
      await this.usersService.resetLoginAttempts(user.id);
      await this.usersService.updateLastLogin(user.id);

      const { passwordHash: _, ...result } = user;
      return result;
    }

    // Si no se encuentra en SuperAdmin, loguear para debug
    console.log(`[AUTH] User ${email} not found in SuperAdmin DB, searching in tenant DBs...`);

    // 2. Si no se encuentra en SuperAdmin y hay tenant especificado, buscar en BD del tenant
    if (tenant) {
      user = await this.findUserInTenant(email, tenant);
    }

    // 3. Si no se encuentra y no hay tenant, buscar en todas las BD de tenants activos
    // NOTA: Esto puede ser lento si hay muchos tenants. Se recomienda especificar tenantId o tenantSlug
    if (!user && !tenant) {
      try {
        // Obtener todos los tenants activos
        const activeTenants = await prisma.tenant.findMany({
          where: {
            isActive: true,
            isSuspended: false,
          },
          select: {
            id: true,
            slug: true,
            dbName: true,
            dbHost: true,
            dbPort: true,
            dbUsername: true,
            dbPasswordEncrypted: true,
          },
        });

        // Buscar en cada tenant hasta encontrar el usuario
        for (const t of activeTenants) {
          try {
            user = await this.findUserInTenant(email, t);
            if (user) {
              break;
            }
          } catch (error) {
            // Si falla al conectar a un tenant, continuar con el siguiente
            continue;
          }
        }
      } catch (error) {
        // Si falla al obtener tenants, continuar sin buscar en tenant DBs
      }
    }

    if (!user) {
      return null;
    }

    // Validar estado del usuario
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Validar si el usuario está bloqueado (solo para usuarios de SuperAdmin)
    if (user.isLocked && user.systemRole !== 'tenant_user') {
      throw new UnauthorizedException(`Account is locked: ${user.lockedReason || 'Unknown reason'}`);
    }

    // Validar password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      // Incrementar intentos de login (solo para usuarios de SuperAdmin)
      if (user.systemRole !== 'tenant_user') {
        await this.usersService.incrementLoginAttempts(user.id);
      }
      return null;
    }

    // Resetear intentos y actualizar último login
    if (user.systemRole !== 'tenant_user') {
      await this.usersService.resetLoginAttempts(user.id);
      await this.usersService.updateLastLogin(user.id);
    } else {
      // Para usuarios de tenant, actualizar en su BD (se hace en el método findUserInTenant si es necesario)
      // Por ahora, no actualizamos para evitar múltiples conexiones
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    console.log(`[AUTH] Login attempt for email: ${loginDto.email}`);
    
    // 1. Identificar tenant si se proporciona
    const tenant = await this.identifyTenant(loginDto);
    if (tenant) {
      console.log(`[AUTH] Tenant identified: ${tenant.id} (${tenant.slug})`);
    }
    
    // 2. Validar usuario (busca en SuperAdmin y/o Tenant DB)
    const user = await this.validateUser(loginDto.email, loginDto.password, tenant || undefined);
    
    if (!user) {
      console.error(`[AUTH] User validation failed for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log(`[AUTH] User validated successfully: ${user.email} (${user.systemRole})`);

    // 3. Obtener información completa del tenant y usuario
    let dbName: string | undefined;
    let role: string | undefined;
    let permissions: string[] | undefined;
    let finalTenantId: string | undefined;
    let tenantSlug: string | undefined;
    
    // Si es usuario de SuperAdmin (super_admin o tenant_admin inicial)
    if (user.systemRole === 'super_admin') {
      dbName = 'superadmin';
      role = 'super_admin';
      permissions = [];
    } else if (user.systemRole === 'tenant_admin') {
      // Usuario admin del tenant (está en SuperAdmin DB)
      finalTenantId = user.tenantId;
      try {
        const tenantInfo = await this.tenantService.getTenantById(user.tenantId);
        if (tenantInfo) {
          dbName = tenantInfo.dbName || undefined;
          tenantSlug = tenantInfo.slug || undefined;
          role = 'admin';
          permissions = [];
        }
      } catch (error) {
        // Si no se puede obtener el tenant, continuar sin dbName
      }
    } else if (user.systemRole === 'tenant_user') {
      // Usuario interno del tenant (está en BD del tenant)
      finalTenantId = user.tenantId;
      dbName = user.dbName;
      role = user.role || 'user';
      permissions = user.permissions || [];
      // Obtener slug del tenant desde el objeto tenant que se pasó
      if (tenant) {
        tenantSlug = tenant.slug;
      } else if (finalTenantId) {
        // Si no tenemos el tenant, obtenerlo por ID
        try {
          const tenantInfo = await this.tenantService.getTenantById(finalTenantId);
          if (tenantInfo) {
            tenantSlug = tenantInfo.slug || undefined;
          }
        } catch (error) {
          // Si no se puede obtener, continuar sin slug
        }
      }
    }

    // 4. Construir payload JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: finalTenantId,
      tenantSlug: tenantSlug,
      dbName: dbName || (user.systemRole === 'super_admin' ? 'superadmin' : undefined),
      systemRole: user.systemRole,
      role,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: '7d',
    });

    // Store refresh token in database (solo para usuarios de SuperAdmin)
    if (user.systemRole !== 'tenant_user') {
      await this.usersService.createSession({
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        deviceName: this.extractDeviceName(userAgent),
        deviceType: this.extractDeviceType(userAgent),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    }
    // TODO: Para usuarios de tenant, guardar sesión en Redis o BD del tenant

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: nullToUndefined(user.firstName),
        lastName: nullToUndefined(user.lastName),
        systemRole: user.systemRole,
        tenantId: nullToUndefined(user.tenantId),
        avatarUrl: nullToUndefined(user.avatarUrl),
        language: user.language,
        timezone: user.timezone,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // 1. Validar que el email no exista
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // 2. Validar que el slug no exista
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: registerDto.slug },
    });
    if (existingTenant) {
      throw new ConflictException(`El slug "${registerDto.slug}" ya está en uso`);
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // 4. Generar UUID para el tenant (se usará para el nombre de BD)
    const tenantId = crypto.randomUUID();
    
    // 5. Crear tenant en SuperAdmin (INACTIVO)
    // IMPORTANTE: Extraer host y puerto del DATABASE_URL real (no usar localhost por defecto)
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    
    let dbHost: string;
    let dbPort: number;
    
    try {
      const dbUrl = new URL(databaseUrl);
      dbHost = dbUrl.hostname;
      dbPort = parseInt(dbUrl.port || '5432');
    } catch (e) {
      // Fallback si no se puede parsear la URL
      dbHost = process.env.TENANT_DB_HOST || process.env.DATABASE_HOST || 'localhost';
      dbPort = parseInt(process.env.TENANT_DB_PORT || process.env.DATABASE_PORT || '5432');
    }
    
    const env = process.env.NODE_ENV || 'prod';
    const dbName = `tenant_${tenantId.replace(/-/g, '')}_${env}`; // UUID sin guiones para nombre de BD
    // Generar username único para el tenant (máximo 63 caracteres en PostgreSQL)
    // Formato: tenant_{uuid_sin_guiones}_{env} (similar al nombre de BD pero como usuario)
    const tenantIdClean = tenantId.replace(/-/g, '');
    const dbUsername = `tenant_${tenantIdClean.substring(0, 40)}_${env}`.substring(0, 63); // PostgreSQL limita a 63 caracteres
    
    // Generar password seguro para la BD del tenant
    const dbPassword = this.generateSecurePassword();
    const dbPasswordEncrypted = this.encryptPassword(dbPassword);

    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: registerDto.companyName,
        slug: registerDto.slug,
        dbName,
        dbHost,
        dbPort,
        dbUsername,
        dbPasswordEncrypted,
        dbConnectionPoolSize: 10,
        planType: 'free',
        planStatus: 'trial',
        billingEmail: registerDto.email,
        primaryContactEmail: registerDto.email,
        primaryContactName: `${registerDto.firstName} ${registerDto.lastName}`,
        isActive: false, // Se activa cuando termine provisioning
        // provisioningStatus tiene valor por defecto 'pending' en el schema
        maxUsers: 5,
        maxStorageGb: 2,
        maxMonthlyEmails: 1000,
        maxMonthlyWhatsapp: 500,
        maxMonthlyApiCalls: 10000,
        enabledModules: ['crm', 'tasks'],
      },
    });

    // 5. Crear usuario en SuperAdmin (INACTIVO)
    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      systemRole: 'tenant_admin',
      tenantId: tenant.id,
      language: registerDto.language || 'es',
      timezone: registerDto.timezone || 'America/Bogota',
    });

    // Desactivar usuario hasta que termine provisioning
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    // 6. Encolar job de provisioning (ASÍNCRONO)
    console.log(`🚀 [AUTH] Encolando job de provisioning para tenant ${tenant.id}`);
    const job = await this.provisioningQueue.add(
      'provision-tenant',
      {
        tenantId: tenant.id,
        slug: tenant.slug,
        dbName: tenant.dbName,
        adminEmail: registerDto.email,
        adminPassword: hashedPassword,
        adminFirstName: registerDto.firstName,
        adminLastName: registerDto.lastName,
        companyName: registerDto.companyName,
      } as TenantProvisioningData,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
    console.log(`✅ [AUTH] Job de provisioning encolado con ID: ${job.id}`);

    // 7. Retornar respuesta INMEDIATA (sin token)
    return {
      message: 'Registro exitoso. Estamos configurando tu espacio de trabajo...',
      status: 'provisioning',
      tenantId: tenant.id,
      email: user.email,
      estimatedTime: '1-2 minutos',
      // NO retornar accessToken - el usuario recibirá email cuando esté listo
    };
  }

  private generateSecurePassword(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private encryptPassword(password: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      // Find user and validate session
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Validate refresh token exists in database
      const session = await this.usersService.findValidSession(user.id, refreshTokenDto.refreshToken);
      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Obtener información del tenant si el usuario pertenece a uno
      let dbName: string | undefined;
      let role: string | undefined;
      let permissions: string[] | undefined;
      let tenantSlug: string | undefined;
      
      if (user.tenantId) {
        try {
          const tenant = await this.tenantService.getTenantById(user.tenantId);
          if (tenant) {
            dbName = tenant.dbName || undefined;
            tenantSlug = tenant.slug || undefined; // Obtener slug del tenant
            role = payload.role || 'admin'; // Mantener role del payload anterior o usar default
            permissions = payload.permissions || [];
          }
        } catch (error) {
          // Si no se puede obtener el tenant, usar valores del payload anterior
          dbName = payload.dbName;
          tenantSlug = payload.tenantSlug; // Mantener tenantSlug del payload anterior
          role = payload.role;
          permissions = payload.permissions;
        }
      } else if (user.systemRole === 'super_admin') {
        // Super admin no tiene tenant
        dbName = 'superadmin';
        role = 'super_admin';
        permissions = [];
      }

      // Generate new tokens
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        tenantId: nullToUndefined(user.tenantId),
        tenantSlug: tenantSlug, // Incluir tenantSlug en el nuevo payload
        dbName: dbName || (user.systemRole === 'super_admin' ? 'superadmin' : undefined),
        systemRole: user.systemRole,
        role,
        permissions,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: '7d',
      });

      // Update session with new refresh token
      await this.usersService.updateSession(session.id, {
        tokenHash: await bcrypt.hash(newRefreshToken, 10),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: nullToUndefined(user.firstName),
          lastName: nullToUndefined(user.lastName),
          systemRole: user.systemRole,
          tenantId: nullToUndefined(user.tenantId),
          avatarUrl: nullToUndefined(user.avatarUrl),
          language: user.language,
          timezone: user.timezone,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Invalidate specific session
      await this.usersService.invalidateSession(userId, refreshToken);
    } else {
      // Invalidate all sessions
      await this.usersService.invalidateAllSessions(userId);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.usersService.invalidateAllSessions(userId);
  }

  async updateUserActivity(userId: string): Promise<void> {
    // Update lastActivityAt for all active sessions of the user
    // This keeps the session alive while the user is active
    await this.usersService.updateUserActivity(userId);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      { expiresIn: '1h' }
    );

    // Hash the token before storing
    const tokenHash = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setPasswordResetToken(user.id, tokenHash, expiresAt);

    // TODO: Send email with reset link
    // For now, we'll just return the token (in production, this should be sent via email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Verify the token
      const payload = this.jwtService.verify(token);
      
      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Hash the token to compare with stored hash
      const tokenHash = await bcrypt.hash(token, 10);
      
      // Find user by reset token
      const user = await this.usersService.findByPasswordResetToken(tokenHash);
      
      if (!user || user.id !== payload.sub) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await this.usersService.updatePassword(user.id, hashedPassword);

      // Invalidate all existing sessions for security
      await this.usersService.invalidateAllSessions(user.id);

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  private extractDeviceName(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    // Simple device name extraction
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    
    return 'Unknown Device';
  }

  private extractDeviceType(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    
    return 'web';
  }
}