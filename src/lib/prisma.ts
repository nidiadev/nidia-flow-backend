const { PrismaClient } = require('../../../generated/prisma');

/**
 * Prisma Client para base de datos SuperAdmin
 * 
 * CONTEXTO: SUPERADMIN ONLY
 * Este cliente se conecta a la base de datos nidia_superadmin
 * Contiene: tenants, users, plans, subscriptions, invoices, etc.
 */
declare global {
  var __prisma: typeof PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;