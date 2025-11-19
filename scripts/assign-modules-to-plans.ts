import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function assignModulesToPlans() {
  try {
    console.log('🔗 Asignando módulos a planes...');

    // Obtener todos los planes
    const plans = await prisma.plan.findMany({
      include: {
        moduleAssignments: {
          include: {
            module: true,
          },
        },
      },
    });

    // Obtener todos los módulos
    const modules = await prisma.moduleDefinition.findMany();

    const moduleMap = new Map(modules.map((m: any) => [m.name, m]));

    for (const plan of plans) {
      console.log(`\n📦 Plan: ${plan.displayName} (${plan.name})`);
      
      // Obtener módulos habilitados del plan desde enabledModules
      const enabledModuleNames = ((plan as any).enabledModules as string[]) || [];
      
      console.log(`   Módulos habilitados en plan: ${enabledModuleNames.join(', ') || 'ninguno'}`);

      // Asignar módulos al plan
      for (const moduleName of enabledModuleNames) {
        const module: any = moduleMap.get(moduleName);
        
        if (!module) {
          console.log(`   ⚠️  Módulo "${moduleName}" no encontrado, saltando...`);
          continue;
        }

        // Verificar si ya existe la asignación
        const existingAssignment = await prisma.modulePlanAssignment.findUnique({
          where: {
            moduleId_planId: {
              moduleId: module.id,
              planId: (plan as any).id,
            },
          },
        });

        if (existingAssignment) {
          console.log(`   ✓ Módulo "${moduleName}" ya asignado`);
          continue;
        }

        // Crear asignación
        await prisma.modulePlanAssignment.create({
          data: {
            moduleId: module.id,
            planId: (plan as any).id,
            isEnabled: true,
          },
        });

        console.log(`   ✅ Módulo "${moduleName}" asignado al plan`);
      }

      // Deshabilitar módulos que no están en enabledModules pero tienen asignación
      const assignedModules = (plan.moduleAssignments || []).map((a: any) => a.module?.name).filter(Boolean);
      const modulesToDisable = assignedModules.filter((name: string) => !enabledModuleNames.includes(name));

      for (const moduleName of modulesToDisable) {
        const module: any = moduleMap.get(moduleName);
        if (!module) continue;

        await prisma.modulePlanAssignment.updateMany({
          where: {
            moduleId: module.id,
            planId: (plan as any).id,
          },
          data: {
            isEnabled: false,
          },
        });

        console.log(`   🔒 Módulo "${moduleName}" deshabilitado en el plan`);
      }
    }

    console.log('\n✅ Asignación de módulos completada');
  } catch (error) {
    console.error('❌ Error asignando módulos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

assignModulesToPlans();

