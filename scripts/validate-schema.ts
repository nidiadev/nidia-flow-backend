#!/usr/bin/env tsx

import { PrismaClient } from '../generated/prisma';

async function validateSchema() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Validando conexión a la base de datos...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Test a simple query to validate schema
    console.log('🔍 Validando schema de SuperAdmin...');
    
    // Count tables (this will fail if schema is not applied)
    const tenantCount = await prisma.tenant.count();
    console.log(`✅ Schema válido - Tenants encontrados: ${tenantCount}`);
    
    // Test some key relationships
    console.log('🔍 Validando relaciones principales...');
    
    const userCount = await prisma.user.count();
    const planCount = await prisma.plan.count();
    
    console.log(`✅ Usuarios: ${userCount}`);
    console.log(`✅ Planes: ${planCount}`);
    
    console.log('🎉 Schema de SuperAdmin validado correctamente!');
    
  } catch (error) {
    console.error('❌ Error validando schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateSchema();