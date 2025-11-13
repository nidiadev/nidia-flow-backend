#!/usr/bin/env ts-node

import { UsersService } from '../src/users/users.service';
import { TenantPrismaService } from '../src/tenant/services/tenant-prisma.service';

async function cleanupExpiredSessions() {
  const tenantPrismaService = new TenantPrismaService();
  const usersService = new UsersService(tenantPrismaService);
  
  try {
    console.log('🧹 Cleaning up expired sessions...');
    await usersService.cleanupExpiredSessions();
    console.log('✅ Expired sessions cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error);
    process.exit(1);
  }
}

cleanupExpiredSessions();