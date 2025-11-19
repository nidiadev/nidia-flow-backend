import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import prisma from '../../lib/prisma';

const execAsync = promisify(exec);

interface TenantDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * TenantProvisioningService - Provisioning de bases de datos de tenants
 * 
 * CONTEXTO: SUPERADMIN ONLY
 * Este servicio crea y gestiona las bases de datos físicas de los tenants
 * Se ejecuta en el contexto de SuperAdmin para crear nuevas bases de datos
 * 
 * OPERACIONES:
 * - Crear base de datos física del tenant
 * - Ejecutar migraciones en la nueva base de datos
 * - Crear usuario administrador inicial
 * - Verificar integridad de la base de datos
 */
@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  private ensureTempDirectory(): void {
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  }

  /**
   * Extract host and port from DATABASE_URL
   * This ensures we always use the correct server, not the config values which may be wrong
   */
  private getDatabaseServerInfo(): { host: string; port: string } {
    const adminConnectionUrl = process.env.DATABASE_URL;
    if (!adminConnectionUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    try {
      const adminUrl = new URL(adminConnectionUrl);
      const host = adminUrl.hostname;
      // Handle port: if not in URL, use default 5432, otherwise use what's in URL
      const port = adminUrl.port || '5432';
      return { host, port };
    } catch (e) {
      this.logger.error(`Could not parse DATABASE_URL: ${adminConnectionUrl}`);
      throw new Error(`Invalid DATABASE_URL format: ${e}`);
    }
  }

  async createTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    this.logger.log(`Creating tenant database: ${config.database}`);
    
    // Get actual server info from DATABASE_URL (not from config, which may be wrong)
    const { host: actualHost, port: actualPort } = this.getDatabaseServerInfo();
    this.logger.log(`📡 Using PostgreSQL server from DATABASE_URL: ${actualHost}:${actualPort}`);
    this.logger.log(`📡 Config provided host:port was ${config.host}:${config.port} (may differ from actual server)`);
    
    const adminConnectionUrl = process.env.DATABASE_URL;
    if (!adminConnectionUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Log connection info (without password) for debugging
    try {
      const adminUrl = new URL(adminConnectionUrl);
      const maskedUrl = `postgresql://${adminUrl.username}:***@${adminUrl.hostname}:${adminUrl.port || '5432'}/${adminUrl.pathname.split('/')[1] || ''}`;
      this.logger.log(`🔗 Connection URL (masked): ${maskedUrl}`);
      this.logger.log(`🔗 Full hostname from URL: ${adminUrl.hostname}`);
      this.logger.log(`🔗 Port from URL: ${adminUrl.port || '5432'}`);
    } catch (e) {
      this.logger.warn(`Could not parse DATABASE_URL for logging: ${e}`);
    }

    try {
      // Escape identifiers to prevent SQL injection
      const escapeIdentifier = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;
      const dbNameEscaped = escapeIdentifier(config.database);
      const usernameEscaped = escapeIdentifier(config.username);
      const passwordEscaped = config.password.replace(/'/g, "''");

      // Terminate existing connections to the database (optional, may fail without superuser)
      try {
        await prisma.$executeRawUnsafe(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '${config.database.replace(/'/g, "''")}' AND pid <> pg_backend_pid();
        `);
      } catch (error) {
        this.logger.warn(`Could not terminate existing connections (may require superuser): ${error}`);
      }

      // Create user if not exists, or update password if exists
      this.logger.log(`🔐 Creating/updating PostgreSQL user: ${config.username} (password length: ${config.password.length})`);
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${config.username.replace(/'/g, "''")}') THEN
            EXECUTE format('CREATE USER %I WITH PASSWORD %L', '${config.username.replace(/'/g, "''")}', '${passwordEscaped}');
            RAISE NOTICE 'User % created successfully', '${config.username.replace(/'/g, "''")}';
          ELSE
            EXECUTE format('ALTER USER %I WITH PASSWORD %L', '${config.username.replace(/'/g, "''")}', '${passwordEscaped}');
            RAISE NOTICE 'User % already exists, password updated', '${config.username.replace(/'/g, "''")}';
          END IF;
        END
        $$;
      `);
      this.logger.log(`✅ PostgreSQL user ${config.username} created/updated with tenant password`);
      
      // Verify user was created
      const userExistsResult = await prisma.$queryRawUnsafe(`
        SELECT EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname = '${config.username.replace(/'/g, "''")}') as exists;
      `) as Array<{exists: boolean}>;
      
      if (!userExistsResult[0]?.exists) {
        const errorMsg = `❌ CRITICAL: PostgreSQL user ${config.username} was NOT created. Cannot proceed.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      this.logger.log(`✅ Verified: PostgreSQL user ${config.username} exists`);

      // Check if database exists
      const dbExistsResult = await prisma.$queryRawUnsafe(`
        SELECT EXISTS(SELECT FROM pg_database WHERE datname = '${config.database.replace(/'/g, "''")}') as exists;
      `) as Array<{exists: boolean}>;

      const dbExists = dbExistsResult[0]?.exists || false;
      this.logger.log(`Database ${config.database} exists check: ${dbExists}`);

      // Check current user permissions before attempting to create database
      try {
        const currentUserResult = await prisma.$queryRawUnsafe(`
          SELECT current_user, session_user, current_database();
        `) as Array<{current_user: string; session_user: string; current_database: string}>;
        
        if (currentUserResult[0]) {
          this.logger.log(`Current PostgreSQL user: ${currentUserResult[0].current_user}`);
          this.logger.log(`Session user: ${currentUserResult[0].session_user}`);
          this.logger.log(`Current database: ${currentUserResult[0].current_database}`);
        }
      } catch (permError) {
        this.logger.warn(`Could not check user permissions: ${permError}`);
      }

      if (!dbExists) {
        // Create database with explicit tablespace (some PostgreSQL configurations require this)
        this.logger.log(`Creating database: ${config.database} on server ${actualHost}:${actualPort}`);
        try {
          // Try to create with default tablespace first
          await prisma.$executeRawUnsafe(`
            CREATE DATABASE ${dbNameEscaped} WITH TABLESPACE pg_default;
          `);
          this.logger.log(`✅ CREATE DATABASE command executed successfully for: ${config.database}`);
        } catch (createError: any) {
          // If that fails, try without tablespace (for some PostgreSQL versions/configurations)
          if (createError.message?.includes('tablespace') || createError.code === '42P17') {
            this.logger.warn(`Failed with tablespace, trying without: ${createError.message}`);
            try {
              await prisma.$executeRawUnsafe(`
                CREATE DATABASE ${dbNameEscaped};
              `);
              this.logger.log(`✅ CREATE DATABASE command executed successfully (without tablespace) for: ${config.database}`);
            } catch (retryError: any) {
              this.logger.error(`❌ CREATE DATABASE failed on retry: ${retryError.message}`);
              this.logger.error(`❌ Error code: ${retryError.code}`);
              this.logger.error(`❌ Full error: ${JSON.stringify(retryError, null, 2)}`);
              throw retryError;
            }
          } else {
            this.logger.error(`❌ CREATE DATABASE failed: ${createError.message}`);
            this.logger.error(`❌ Error code: ${createError.code}`);
            this.logger.error(`❌ Full error: ${JSON.stringify(createError, null, 2)}`);
            throw createError;
          }
        }
        
        // Wait a moment for database to be fully created
        this.logger.log(`Waiting 1 second for database ${config.database} to be fully created...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // CRITICAL VERIFICATION: Use databaseExists method which has better logging
        this.logger.log(`🔍 Verifying database ${config.database} was created...`);
        const dbWasCreated = await this.databaseExists(config.database);
        
        if (!dbWasCreated) {
          // List all databases to help debug
          const allDbs = await prisma.$queryRawUnsafe(`
            SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;
          `) as Array<{datname: string}>;
          const dbList = allDbs.map(db => db.datname).join(', ');
          const errorMsg = `❌ CRITICAL ERROR: Database ${config.database} was NOT created on server ${actualHost}:${actualPort}. CREATE DATABASE command may have failed silently. Available databases: ${dbList}`;
          this.logger.error(errorMsg);
          this.logger.error(`❌ Cannot continue provisioning without database. Process will be STOPPED immediately.`);
          throw new Error(errorMsg);
        }
        this.logger.log(`✅ Database ${config.database} verified as created on server ${actualHost}:${actualPort}`);
      } else {
        this.logger.log(`Database ${config.database} already exists, skipping creation`);
      }

      // CRITICAL VERIFICATION: Ensure database exists before continuing
      // This is a final check to prevent continuing if database doesn't exist
      this.logger.log(`🔍 Final verification: Checking if database ${config.database} exists before continuing...`);
      const finalCheck = await this.databaseExists(config.database);
      
      if (!finalCheck) {
        const errorMsg = `❌ CRITICAL ERROR: Database ${config.database} does NOT exist on server ${actualHost}:${actualPort} after creation attempt. Cannot proceed with provisioning. Process STOPPED.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      this.logger.log(`✅ Final verification: Database ${config.database} exists on server ${actualHost}:${actualPort} and is ready`);

      // Grant privileges on database
      this.logger.log(`Granting privileges on database ${config.database} to user ${config.username}`);
      await prisma.$executeRawUnsafe(`
        GRANT ALL PRIVILEGES ON DATABASE ${dbNameEscaped} TO ${usernameEscaped};
      `);
      this.logger.log(`Privileges granted successfully`);

      // Connect to the new database using admin credentials to set up schema
      // Use the already parsed host and port from DATABASE_URL
      const adminUrl = new URL(adminConnectionUrl);
      const adminUser = adminUrl.username;
      const adminPassword = adminUrl.password;
      // Use actualHost and actualPort we parsed earlier (from DATABASE_URL)
      const adminHost = actualHost;
      const adminPort = actualPort;

      // Connect to new database using admin credentials
      const adminTenantConnectionUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPassword)}@${adminHost}:${adminPort}/${config.database}?schema=public`;
      const tenantPrismaPath = resolve(process.cwd(), 'generated', 'tenant-prisma');
      const { PrismaClient } = require(tenantPrismaPath);
      const tenantClient = new PrismaClient({
        datasources: {
          db: {
            url: adminTenantConnectionUrl,
          },
        },
      });

      await tenantClient.$connect();

      // Enable UUID extension
      await tenantClient.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

      // Grant schema privileges (execute each command separately)
      await tenantClient.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO ${usernameEscaped};`);
      await tenantClient.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${usernameEscaped};`);
      await tenantClient.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${usernameEscaped};`);
      await tenantClient.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${usernameEscaped};`);
      await tenantClient.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${usernameEscaped};`);

      await tenantClient.$disconnect();

      // Final verification: List all databases to confirm creation
      const allDatabases = await prisma.$queryRawUnsafe(`
        SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;
      `) as Array<{datname: string}>;
      
      const dbNames = allDatabases.map(db => db.datname);
      this.logger.log(`📊 All databases on server ${actualHost}:${actualPort}: ${dbNames.join(', ')}`);
      this.logger.log(`📊 Total databases found: ${dbNames.length}`);
      
      // Check specifically for tenant databases
      const tenantDbs = dbNames.filter(db => db.startsWith('tenant_'));
      this.logger.log(`📊 Tenant databases found: ${tenantDbs.length} - ${tenantDbs.join(', ')}`);
      
      // Verify the specific database we just created
      const targetDbExists = dbNames.includes(config.database);
      this.logger.log(`🔍 Target database '${config.database}' exists: ${targetDbExists}`);
      
      if (!targetDbExists) {
        const errorMsg = `❌ Database ${config.database} was not found in the list of databases after creation. Available databases: ${dbNames.join(', ')}`;
        this.logger.error(errorMsg);
        this.logger.error(`❌ To verify manually, connect to ${actualHost}:${actualPort} and run: SELECT datname FROM pg_database WHERE datname = '${config.database}';`);
        throw new Error(errorMsg);
      }

      // Get more details about the created database
      try {
        const dbDetails = await prisma.$queryRawUnsafe(`
          SELECT 
            datname,
            pg_size_pretty(pg_database_size(datname)) as size,
            datcollate,
            datctype
          FROM pg_database 
          WHERE datname = '${config.database.replace(/'/g, "''")}';
        `) as Array<{datname: string; size: string; datcollate: string; datctype: string}>;
        
        if (dbDetails[0]) {
          this.logger.log(`📋 Database details: ${JSON.stringify(dbDetails[0])}`);
        }
      } catch (detailError) {
        this.logger.warn(`Could not get database details: ${detailError}`);
      }

      this.logger.log(`✅ Database created successfully and verified: ${config.database} on server ${actualHost}:${actualPort}`);
      this.logger.log(`✅ You can verify by connecting to: ${actualHost}:${actualPort} and running: \\l or SELECT datname FROM pg_database WHERE datname = '${config.database}';`);

    } catch (error) {
      this.logger.error(`Failed to create database: ${config.database}`, error);
      throw error;
    }
  }

  async runTenantMigration(config: TenantDatabaseConfig): Promise<void> {
    this.logger.log(`Running migration for tenant: ${config.database}`);

    try {
      // CRITICAL VERIFICATION: Ensure database exists before running migrations
      const dbExistsCheck = await prisma.$queryRawUnsafe(`
        SELECT EXISTS(SELECT FROM pg_database WHERE datname = '${config.database.replace(/'/g, "''")}') as exists;
      `) as Array<{exists: boolean}>;
      
      if (!dbExistsCheck[0]?.exists) {
        const errorMsg = `❌ CRITICAL ERROR: Cannot run migrations. Database ${config.database} does NOT exist. Provisioning must stop.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      this.logger.log(`✅ Database ${config.database} verified before running migrations`);

      // Ensure temp directory exists
      this.ensureTempDirectory();

      // Use admin credentials for migration (same as in createTenantDatabase)
      const adminConnectionUrl = process.env.DATABASE_URL;
      if (!adminConnectionUrl) {
        throw new Error('DATABASE_URL not configured for admin operations');
      }

      // Get actual server info from DATABASE_URL
      const { host: adminHost, port: adminPort } = this.getDatabaseServerInfo();
      
      // Parse admin connection URL to extract credentials
      const adminUrl = new URL(adminConnectionUrl);
      const adminUser = adminUrl.username;
      const adminPassword = adminUrl.password;

      // Use admin credentials to connect to tenant database for migration
      const adminTenantConnectionUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPassword)}@${adminHost}:${adminPort}/${config.database}?schema=public`;

      // Use db push to create tables directly from schema (no migrations needed)
      // This is better for initial tenant provisioning
      const migrationCommand = `npx prisma db push --schema=prisma/tenant-schema.prisma --accept-data-loss`;
      await execAsync(migrationCommand, {
        env: {
          ...process.env,
          DATABASE_URL: adminTenantConnectionUrl,
        },
        cwd: process.cwd(),
      });

      this.logger.log(`Migration completed for tenant: ${config.database}`);

    } catch (error) {
      this.logger.error(`Failed to run migration for tenant: ${config.database}`, error);
      throw error;
    }
  }

  async createInitialUser(
    config: TenantDatabaseConfig,
    userData: {
      email: string;
      passwordHash: string;
      firstName?: string;
      lastName?: string;
    },
  ): Promise<void> {
    this.logger.log(`🔐 [createInitialUser] Starting - Database: ${config.database}, Email: ${userData.email}`);
    this.logger.log(`🔐 [createInitialUser] Config: host=${config.host}, port=${config.port}, username=${config.username}`);

    try {
      // CRITICAL VERIFICATION: Ensure database exists before creating user
      const dbExistsCheck = await prisma.$queryRawUnsafe(`
        SELECT EXISTS(SELECT FROM pg_database WHERE datname = '${config.database.replace(/'/g, "''")}') as exists;
      `) as Array<{exists: boolean}>;
      
      if (!dbExistsCheck[0]?.exists) {
        const errorMsg = `❌ CRITICAL ERROR: Cannot create initial user. Database ${config.database} does NOT exist. Provisioning must stop.`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      this.logger.log(`✅ Database ${config.database} verified before creating initial user`);
      // Use admin credentials for creating initial user (same as in createTenantDatabase and runTenantMigration)
      const adminConnectionUrl = process.env.DATABASE_URL;
      if (!adminConnectionUrl) {
        throw new Error('DATABASE_URL not configured for admin operations');
      }

      // Get actual server info from DATABASE_URL
      const { host: adminHost, port: adminPort } = this.getDatabaseServerInfo();
      
      // Parse admin connection URL to extract credentials
      const adminUrl = new URL(adminConnectionUrl);
      const adminUser = adminUrl.username;
      const adminPassword = adminUrl.password;

      // Use admin credentials to connect to tenant database
      const adminTenantConnectionUrl = `postgresql://${adminUser}:${encodeURIComponent(adminPassword)}@${adminHost}:${adminPort}/${config.database}?schema=public`;

      const tenantPrismaPath = resolve(process.cwd(), 'generated', 'tenant-prisma');
      const { PrismaClient } = require(tenantPrismaPath);
      
      this.logger.log(`🔐 [createInitialUser] Creating Prisma client for tenant database...`);
      const tenantClient = new PrismaClient({
        datasources: {
          db: {
            url: adminTenantConnectionUrl,
          },
        },
      });

      this.logger.log(`🔐 [createInitialUser] Connecting to tenant database...`);
      try {
        await tenantClient.$connect();
        this.logger.log(`✅ [createInitialUser] Connected to tenant database successfully`);
      } catch (connectError: any) {
        this.logger.error(`❌ [createInitialUser] Failed to connect to tenant database:`, connectError);
        this.logger.error(`❌ [createInitialUser] Connection URL (masked): ${adminTenantConnectionUrl.replace(/:[^:@]+@/, ':***@')}`);
        throw connectError;
      }

      // Verificar si el usuario ya existe
      this.logger.log(`🔐 [createInitialUser] Checking if user ${userData.email} already exists...`);
      const existingUser = await tenantClient.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        this.logger.warn(`⚠️ [createInitialUser] User ${userData.email} already exists in tenant database ${config.database}, skipping creation`);
        await tenantClient.$disconnect();
        return;
      }

      // Crear usuario inicial
      this.logger.log(`🔐 [createInitialUser] Creating user ${userData.email}...`);
      try {
        const createdUser = await tenantClient.user.create({
          data: {
            email: userData.email,
            passwordHash: userData.passwordHash,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            role: 'admin',
            permissions: [],
            isActive: true,
          },
        });

        this.logger.log(`✅ [createInitialUser] Initial admin user created in ${config.database}: ${createdUser.email} (ID: ${createdUser.id})`);
      } catch (createError: any) {
        this.logger.error(`❌ [createInitialUser] Failed to create user:`, createError);
        this.logger.error(`❌ [createInitialUser] Error message: ${createError.message}`);
        this.logger.error(`❌ [createInitialUser] Error code: ${createError.code}`);
        this.logger.error(`❌ [createInitialUser] Error meta: ${JSON.stringify(createError.meta || {})}`);
        await tenantClient.$disconnect();
        throw createError;
      }

      // VERIFICACIÓN CRÍTICA: Verificar que el usuario fue creado
      const verifyUser = await tenantClient.user.findUnique({
        where: { email: userData.email },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!verifyUser) {
        const errorMsg = `❌ CRITICAL: User ${userData.email} was NOT created in tenant database ${config.database} despite create() call succeeding.`;
        this.logger.error(errorMsg);
        await tenantClient.$disconnect();
        throw new Error(errorMsg);
      }

      this.logger.log(`✅ Verification: User ${verifyUser.email} confirmed to exist in ${config.database} with role: ${verifyUser.role}`);

      // Contar total de usuarios en la BD del tenant
      const userCount = await tenantClient.user.count();
      this.logger.log(`📊 Total users in tenant database ${config.database}: ${userCount}`);

      await tenantClient.$disconnect();
      this.logger.log(`Initial admin user created and verified successfully in ${config.database}`);
    } catch (error) {
      this.logger.error(`Failed to create initial user in tenant database: ${config.database}`, error);
      throw error;
    }
  }

  async deleteTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    this.logger.log(`Deleting tenant database: ${config.database}`);

    try {
      // Escape identifiers
      const escapeIdentifier = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;
      const dbNameEscaped = escapeIdentifier(config.database);
      const usernameEscaped = escapeIdentifier(config.username);

      // Terminate existing connections
      await prisma.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${config.database.replace(/'/g, "''")}' AND pid <> pg_backend_pid();
      `);

      // Drop database
      await prisma.$executeRawUnsafe(`
        DROP DATABASE IF EXISTS ${dbNameEscaped};
      `);

      // Drop user
      await prisma.$executeRawUnsafe(`
        DROP USER IF EXISTS ${usernameEscaped};
      `);

      this.logger.log(`Database deleted successfully: ${config.database}`);

    } catch (error) {
      this.logger.error(`Failed to delete database: ${config.database}`, error);
      throw error;
    }
  }

  async databaseExists(databaseName: string): Promise<boolean> {
    try {
      const { host, port } = this.getDatabaseServerInfo();
      this.logger.log(`Checking if database ${databaseName} exists on server ${host}:${port}`);
      
      const result = await prisma.$queryRawUnsafe(`
        SELECT EXISTS(SELECT FROM pg_database WHERE datname = '${databaseName.replace(/'/g, "''")}') as exists;
      `) as Array<{exists: boolean}>;
      
      const exists = result[0]?.exists || false;
      this.logger.log(`Database ${databaseName} existence check result: ${exists}`);
      
      if (!exists) {
        // List all databases for debugging
        const allDbs = await prisma.$queryRawUnsafe(`
          SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;
        `) as Array<{datname: string}>;
        const dbList = allDbs.map(db => db.datname).join(', ');
        this.logger.warn(`Database ${databaseName} NOT found. Available databases on ${host}:${port}: ${dbList}`);
      }
      
      return exists;
    } catch (error) {
      const errorMsg = `❌ CRITICAL: Error checking database existence: ${databaseName}. Cannot verify if database exists.`;
      this.logger.error(errorMsg, error);
      // Don't return false silently - this is a critical error
      throw new Error(`${errorMsg} Original error: ${error}`);
    }
  }

  async getDatabaseSize(databaseName: string): Promise<number> {
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT pg_database_size('${databaseName.replace(/'/g, "''")}') as size;
      `) as Array<{size: bigint}>;
      return Number(result[0]?.size || 0);
    } catch (error) {
      this.logger.error(`Error getting database size: ${databaseName}`, error);
      return 0;
    }
  }
}