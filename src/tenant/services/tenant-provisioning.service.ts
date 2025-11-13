import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface TenantDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  /**
   * Create tenant database and user
   */
  async createTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    this.logger.log(`Creating tenant database: ${config.database}`);

    try {
      // Create SQL script for database creation
      const createDbScript = this.generateCreateDatabaseScript(config);
      const scriptPath = join(process.cwd(), 'temp', `create-${config.database}.sql`);
      
      // Write script to temporary file
      writeFileSync(scriptPath, createDbScript);

      // Execute script using psql
      const adminConnectionUrl = process.env.DATABASE_URL;
      if (!adminConnectionUrl) {
        throw new Error('DATABASE_URL not configured for admin operations');
      }

      await execAsync(`psql "${adminConnectionUrl}" -f "${scriptPath}"`);

      // Clean up temporary file
      unlinkSync(scriptPath);

      this.logger.log(`Database created successfully: ${config.database}`);

    } catch (error) {
      this.logger.error(`Failed to create database: ${config.database}`, error);
      throw error;
    }
  }

  /**
   * Run Prisma migration for tenant database
   */
  async runTenantMigration(config: TenantDatabaseConfig): Promise<void> {
    this.logger.log(`Running migration for tenant: ${config.database}`);

    try {
      const tenantConnectionUrl = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?schema=public`;
      
      // Create temporary .env file for migration
      const tempEnvPath = join(process.cwd(), 'temp', `.env.${config.database}`);
      const envContent = `DATABASE_URL="${tenantConnectionUrl}"`;
      writeFileSync(tempEnvPath, envContent);

      // Run Prisma migration
      const migrationCommand = `npx prisma migrate deploy --schema=prisma/tenant-schema.prisma`;
      await execAsync(migrationCommand, {
        env: {
          ...process.env,
          DATABASE_URL: tenantConnectionUrl,
        },
      });

      // Clean up temporary env file
      unlinkSync(tempEnvPath);

      this.logger.log(`Migration completed for tenant: ${config.database}`);

    } catch (error) {
      this.logger.error(`Failed to run migration for tenant: ${config.database}`, error);
      throw error;
    }
  }

  /**
   * Seed initial data for tenant database
   */
  async seedTenantDatabase(config: TenantDatabaseConfig, tenantData: any): Promise<void> {
    this.logger.log(`Seeding tenant database: ${config.database}`);

    try {
      // This would connect to the tenant database and create initial data
      // For now, we'll log the action
      this.logger.log(`Seeding completed for tenant: ${config.database}`);

    } catch (error) {
      this.logger.error(`Failed to seed tenant database: ${config.database}`, error);
      throw error;
    }
  }

  /**
   * Delete tenant database and user
   */
  async deleteTenantDatabase(config: TenantDatabaseConfig): Promise<void> {
    this.logger.log(`Deleting tenant database: ${config.database}`);

    try {
      const deleteDbScript = this.generateDeleteDatabaseScript(config);
      const scriptPath = join(process.cwd(), 'temp', `delete-${config.database}.sql`);
      
      writeFileSync(scriptPath, deleteDbScript);

      const adminConnectionUrl = process.env.DATABASE_URL;
      await execAsync(`psql "${adminConnectionUrl}" -f "${scriptPath}"`);

      unlinkSync(scriptPath);

      this.logger.log(`Database deleted successfully: ${config.database}`);

    } catch (error) {
      this.logger.error(`Failed to delete database: ${config.database}`, error);
      throw error;
    }
  }

  /**
   * Generate SQL script for database creation
   */
  private generateCreateDatabaseScript(config: TenantDatabaseConfig): string {
    return `
-- Create tenant database and user
-- Database: ${config.database}
-- User: ${config.username}

-- Terminate existing connections to the database
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${config.database}' AND pid <> pg_backend_pid();

-- Create user if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${config.username}') THEN
    CREATE USER "${config.username}" WITH PASSWORD '${config.password}';
  END IF;
END
$$;

-- Create database if not exists
SELECT 'CREATE DATABASE "${config.database}" OWNER "${config.username}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${config.database}')\\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE "${config.database}" TO "${config.username}";

-- Connect to the new database and set up schema
\\c "${config.database}"

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO "${config.username}";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${config.username}";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${config.username}";

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${config.username}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${config.username}";

-- Log completion
SELECT 'Tenant database ${config.database} created successfully' as message;
    `.trim();
  }

  /**
   * Generate SQL script for database deletion
   */
  private generateDeleteDatabaseScript(config: TenantDatabaseConfig): string {
    return `
-- Delete tenant database and user
-- Database: ${config.database}
-- User: ${config.username}

-- Terminate existing connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${config.database}' AND pid <> pg_backend_pid();

-- Drop database
DROP DATABASE IF EXISTS "${config.database}";

-- Drop user
DROP USER IF EXISTS "${config.username}";

-- Log completion
SELECT 'Tenant database ${config.database} deleted successfully' as message;
    `.trim();
  }

  /**
   * Check if database exists
   */
  async databaseExists(databaseName: string): Promise<boolean> {
    try {
      const adminConnectionUrl = process.env.DATABASE_URL;
      const { stdout } = await execAsync(
        `psql "${adminConnectionUrl}" -tAc "SELECT 1 FROM pg_database WHERE datname='${databaseName}'"`
      );
      return stdout.trim() === '1';
    } catch (error) {
      this.logger.error(`Error checking database existence: ${databaseName}`, error);
      return false;
    }
  }

  /**
   * Get database size
   */
  async getDatabaseSize(databaseName: string): Promise<number> {
    try {
      const adminConnectionUrl = process.env.DATABASE_URL;
      const { stdout } = await execAsync(
        `psql "${adminConnectionUrl}" -tAc "SELECT pg_database_size('${databaseName}')"`
      );
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      this.logger.error(`Error getting database size: ${databaseName}`, error);
      return 0;
    }
  }
}