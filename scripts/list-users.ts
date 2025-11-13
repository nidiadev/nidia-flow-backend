#!/usr/bin/env ts-node

import { PrismaClient } from '../generated/prisma';

interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  systemRole: string;
  tenantId: string | null;
  tenantName?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

async function listUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Buscando usuarios en la base de datos...\n');
    console.log('='.repeat(80));

    // List SuperAdmin users
    console.log('\n📋 USUARIOS SUPERADMIN (Base de datos principal)\n');
    const superAdminUsers = await prisma.user.findMany({
      where: {
        tenantId: null,
      },
      include: {
        tenant: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (superAdminUsers.length === 0) {
      console.log('  ⚠️  No se encontraron usuarios SuperAdmin');
    } else {
      superAdminUsers.forEach((user, index) => {
        console.log(`\n  ${index + 1}. Usuario SuperAdmin:`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Nombre: ${user.firstName || 'N/A'} ${user.lastName || ''}`);
        console.log(`     Rol: ${user.systemRole}`);
        console.log(`     Activo: ${user.isActive ? '✅' : '❌'}`);
        console.log(`     Email Verificado: ${user.emailVerified ? '✅' : '❌'}`);
        console.log(`     Último Login: ${user.lastLoginAt ? user.lastLoginAt.toLocaleString('es-CO') : 'Nunca'}`);
        console.log(`     Creado: ${user.createdAt.toLocaleString('es-CO')}`);
      });
    }

    // List Tenants and their users
    console.log('\n\n📋 TENANTS Y SUS USUARIOS\n');
    const tenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (tenants.length === 0) {
      console.log('  ⚠️  No se encontraron tenants activos');
    } else {
      for (const tenant of tenants) {
        console.log(`\n  🏢 Tenant: ${tenant.name} (${tenant.slug})`);
        console.log(`     ID: ${tenant.id}`);
        console.log(`     Estado: ${tenant.isActive ? '✅ Activo' : '❌ Inactivo'}`);
        console.log(`     Plan: ${tenant.planType}`);
        console.log(`     DB Name: ${tenant.dbName || 'N/A'}`);

        // Get users for this tenant
        const tenantUsers = await prisma.user.findMany({
          where: {
            tenantId: tenant.id,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        if (tenantUsers.length === 0) {
          console.log(`     ⚠️  No se encontraron usuarios para este tenant`);
        } else {
          console.log(`     👥 Usuarios (${tenantUsers.length}):`);
          tenantUsers.forEach((user, index) => {
            console.log(`        ${index + 1}. ${user.email}`);
            console.log(`           Nombre: ${user.firstName || 'N/A'} ${user.lastName || ''}`);
            console.log(`           Rol: ${user.systemRole}`);
            console.log(`           Activo: ${user.isActive ? '✅' : '❌'}`);
            console.log(`           Email Verificado: ${user.emailVerified ? '✅' : '❌'}`);
            console.log(`           Último Login: ${user.lastLoginAt ? user.lastLoginAt.toLocaleString('es-CO') : 'Nunca'}`);
          });
        }
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RESUMEN\n');
    const totalSuperAdmin = superAdminUsers.length;
    const totalTenantUsers = tenants.reduce((sum, tenant) => {
      return sum + (prisma.user.count({ where: { tenantId: tenant.id } }) as any);
    }, 0);
    
    console.log(`  • Usuarios SuperAdmin: ${totalSuperAdmin}`);
    console.log(`  • Tenants activos: ${tenants.length}`);
    
    // Get total tenant users
    let totalTenantUsersCount = 0;
    for (const tenant of tenants) {
      const count = await prisma.user.count({ where: { tenantId: tenant.id } });
      totalTenantUsersCount += count;
    }
    console.log(`  • Usuarios de Tenants: ${totalTenantUsersCount}`);
    console.log(`  • Total de usuarios: ${totalSuperAdmin + totalTenantUsersCount}`);

    // Credentials info
    console.log('\n\n🔑 CREDENCIALES DE PRUEBA\n');
    console.log('  Basado en los scripts de seed, estas son las credenciales esperadas:\n');
    
    if (superAdminUsers.some(u => u.email === 'admin@nidiaflow.com')) {
      console.log('  SuperAdmin:');
      console.log('    Email: admin@nidiaflow.com');
      console.log('    Password: SuperAdmin123!');
    }
    
    if (superAdminUsers.some(u => u.email === 'admin@nidia.com')) {
      console.log('\n  SuperAdmin (alternativo):');
      console.log('    Email: admin@nidia.com');
      console.log('    Password: (verificar en seed-superadmin.sql)');
    }

    const demoTenant = tenants.find(t => t.slug === 'demo-empresa');
    if (demoTenant) {
      const demoUser = await prisma.user.findFirst({
        where: {
          tenantId: demoTenant.id,
          email: 'admin@demoempresa.com',
        },
      });
      
      if (demoUser) {
        console.log('\n  Tenant Demo:');
        console.log('    Email: admin@demoempresa.com');
        console.log('    Password: (verificar en seed-tenant.sql)');
        console.log('    Tenant Slug: demo-empresa');
      }
    }

    console.log('\n  ⚠️  NOTA: Los passwords en los scripts SQL pueden ser placeholders.');
    console.log('     Ejecuta el script seed.ts para crear usuarios con passwords válidos.\n');

  } catch (error) {
    console.error('❌ Error al listar usuarios:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();

