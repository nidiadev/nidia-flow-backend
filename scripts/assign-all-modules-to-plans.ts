#!/usr/bin/env ts-node

/**
 * Script para asignar todos los módulos y submódulos activos a todos los planes activos
 * Esto asegura que todos los planes tengan acceso completo a todas las funcionalidades
 */

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function assignAllModulesToPlans() {
  try {
    console.log('🌱 Iniciando asignación de módulos y submódulos a planes...\n');

    // 1. Obtener todos los planes activos
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
      },
    });

    if (plans.length === 0) {
      console.log('⚠️  No se encontraron planes activos. Creando planes primero...');
      return;
    }

    console.log(`📦 Planes encontrados: ${plans.length}`);
    plans.forEach(plan => {
      console.log(`   - ${plan.displayName} (${plan.name})`);
    });

    // 2. Obtener todos los módulos activos
    const modules = await prisma.moduleDefinition.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
      },
    });

    console.log(`\n📦 Módulos encontrados: ${modules.length}`);
    modules.forEach(module => {
      console.log(`   - ${module.displayName} (${module.name})`);
    });

    // 3. Obtener todos los submódulos activos
    const subModules = await prisma.subModuleDefinition.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        moduleId: true,
        module: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
    });

    console.log(`\n📦 Submódulos encontrados: ${subModules.length}`);
    subModules.forEach(subModule => {
      console.log(`   - ${subModule.displayName} (${subModule.name}) - Módulo: ${subModule.module.displayName}`);
    });

    // 4. Asignar todos los módulos a todos los planes
    console.log('\n🔗 Asignando módulos a planes...');
    let modulesAssigned = 0;
    let modulesUpdated = 0;

    for (const plan of plans) {
      for (const module of modules) {
        const existing = await prisma.modulePlanAssignment.findUnique({
          where: {
            moduleId_planId: {
              moduleId: module.id,
              planId: plan.id,
            },
          },
        });

        if (existing) {
          // Actualizar si ya existe (asegurar que esté habilitado)
          await prisma.modulePlanAssignment.update({
            where: { id: existing.id },
            data: { isEnabled: true },
          });
          modulesUpdated++;
        } else {
          // Crear nueva asignación
          await prisma.modulePlanAssignment.create({
            data: {
              moduleId: module.id,
              planId: plan.id,
              isEnabled: true,
            },
          });
          modulesAssigned++;
        }
      }
    }

    console.log(`   ✅ Módulos asignados: ${modulesAssigned}`);
    console.log(`   ✓ Módulos actualizados: ${modulesUpdated}`);

    // 5. Asignar todos los submódulos a todos los planes
    console.log('\n🔗 Asignando submódulos a planes...');
    let subModulesAssigned = 0;
    let subModulesUpdated = 0;

    for (const plan of plans) {
      for (const subModule of subModules) {
        const existing = await prisma.subModulePlanAssignment.findUnique({
          where: {
            subModuleId_planId: {
              subModuleId: subModule.id,
              planId: plan.id,
            },
          },
        });

        if (existing) {
          // Actualizar si ya existe (asegurar que esté habilitado)
          await prisma.subModulePlanAssignment.update({
            where: { id: existing.id },
            data: { isEnabled: true },
          });
          subModulesUpdated++;
        } else {
          // Crear nueva asignación
          await prisma.subModulePlanAssignment.create({
            data: {
              subModuleId: subModule.id,
              planId: plan.id,
              isEnabled: true,
            },
          });
          subModulesAssigned++;
        }
      }
    }

    console.log(`   ✅ Submódulos asignados: ${subModulesAssigned}`);
    console.log(`   ✓ Submódulos actualizados: ${subModulesUpdated}`);

    // 6. Resumen final
    console.log('\n\n✨ Asignación completada:');
    console.log(`   - Planes procesados: ${plans.length}`);
    console.log(`   - Módulos asignados: ${modulesAssigned} nuevos, ${modulesUpdated} actualizados`);
    console.log(`   - Submódulos asignados: ${subModulesAssigned} nuevos, ${subModulesUpdated} actualizados`);
    console.log(`   - Total de asignaciones de módulos: ${plans.length * modules.length}`);
    console.log(`   - Total de asignaciones de submódulos: ${plans.length * subModules.length}`);

  } catch (error) {
    console.error('❌ Error en asignación de módulos a planes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

assignAllModulesToPlans();

