/**
 * Script para sincronizar el índice de usuarios de tenant
 * 
 * Este script sincroniza todos los usuarios de todas las BDs de tenant
 * al índice en SuperAdmin DB.
 * 
 * Uso:
 *   npm run sync:tenant-index
 *   npm run sync:tenant-index -- --tenant-id <tenantId>
 */

import { PrismaClient } from '../generated/prisma';
import { TenantUserIndexService } from '../src/tenant/services/tenant-user-index.service';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function decryptPassword(encryptedPassword: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const parts = encryptedPassword.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted password format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function syncAllTenants() {
  const indexService = new TenantUserIndexService();
  
  console.log('🔄 Sincronizando índice de usuarios de tenant...\n');
  
  // Obtener todos los tenants activos
  const tenants = await prisma.tenant.findMany({
    where: {
      isActive: true,
      isSuspended: false,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      dbName: true,
    },
  });
  
  console.log(`📊 Encontrados ${tenants.length} tenants activos\n`);
  
  let totalSynced = 0;
  
  for (const tenant of tenants) {
    try {
      console.log(`🔄 Sincronizando tenant: ${tenant.name} (${tenant.slug})...`);
      const synced = await indexService.syncTenantUsers(tenant.id);
      totalSynced += synced;
      console.log(`✅ Sincronizados ${synced} usuarios de ${tenant.name}\n`);
    } catch (error: any) {
      console.error(`❌ Error sincronizando tenant ${tenant.name}: ${error.message}\n`);
    }
  }
  
  console.log(`\n✅ Sincronización completada: ${totalSynced} usuarios totales`);
}

async function syncSingleTenant(tenantId: string) {
  const indexService = new TenantUserIndexService();
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
  
  if (!tenant) {
    console.error(`❌ Tenant ${tenantId} no encontrado`);
    process.exit(1);
  }
  
  console.log(`🔄 Sincronizando tenant: ${tenant.name} (${tenant.slug})...`);
  const synced = await indexService.syncTenantUsers(tenantId);
  console.log(`✅ Sincronizados ${synced} usuarios`);
}

async function main() {
  const args = process.argv.slice(2);
  const tenantIdIndex = args.indexOf('--tenant-id');
  
  try {
    if (tenantIdIndex !== -1 && args[tenantIdIndex + 1]) {
      const tenantId = args[tenantIdIndex + 1];
      await syncSingleTenant(tenantId);
    } else {
      await syncAllTenants();
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

