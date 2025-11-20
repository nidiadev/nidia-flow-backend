/**
 * Script para limpiar jobs repetitivos duplicados de activity-reminders en Redis
 * 
 * Ejecutar con: npx ts-node scripts/cleanup-duplicate-jobs.ts
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

async function cleanupDuplicateJobs() {
  // Configurar Redis connection
  const redisConnection = process.env.REDIS_URL
    ? process.env.REDIS_URL
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      };

  const queue = new Queue('activity-reminders', {
    connection: redisConnection,
  });

  const redis = new Redis(redisConnection);

  try {
    console.log('🔍 Buscando jobs repetitivos duplicados...');

    // Obtener todos los jobs repetitivos
    const repeatableJobs = await queue.getRepeatableJobs();
    console.log(`📊 Encontrados ${repeatableJobs.length} jobs repetitivos`);

    // Filtrar solo los de activity-reminders
    const activityReminderJobs = repeatableJobs.filter(
      job => job.key.includes('activity-reminder') || job.name === 'check-reminders'
    );

    console.log(`📊 Jobs de activity-reminders: ${activityReminderJobs.length}`);

    if (activityReminderJobs.length === 0) {
      console.log('✅ No hay jobs duplicados para limpiar');
      return;
    }

    // Si hay más de uno, mantener solo el primero y eliminar los demás
    if (activityReminderJobs.length > 1) {
      console.log(`⚠️  Encontrados ${activityReminderJobs.length} jobs duplicados`);
      
      // Ordenar por timestamp (más reciente primero)
      activityReminderJobs.sort((a, b) => {
        const timestampA = parseInt(a.key.split(':').pop() || '0');
        const timestampB = parseInt(b.key.split(':').pop() || '0');
        return timestampB - timestampA;
      });

      // Mantener el más reciente, eliminar los demás
      const toKeep = activityReminderJobs[0];
      const toRemove = activityReminderJobs.slice(1);

      console.log(`✅ Manteniendo job: ${toKeep.key}`);
      console.log(`🗑️  Eliminando ${toRemove.length} jobs duplicados...`);

      for (const job of toRemove) {
        try {
          await queue.removeRepeatableByKey(job.key);
          console.log(`   ✅ Eliminado: ${job.key}`);
        } catch (error: any) {
          console.error(`   ❌ Error eliminando ${job.key}: ${error.message}`);
        }
      }

      console.log(`✅ Limpieza completada. Se mantuvo 1 job y se eliminaron ${toRemove.length} duplicados`);
    } else {
      console.log('✅ Solo hay un job repetitivo, no hay duplicados');
    }

    // También limpiar keys de Redis directamente si existen
    console.log('\n🔍 Limpiando keys de Redis directamente...');
    const keys = await redis.keys('bull:activity-reminders:repeat:*');
    console.log(`📊 Encontradas ${keys.length} keys de repeat en Redis`);

    if (keys.length > 1) {
      // Mantener solo la más reciente
      keys.sort((a, b) => {
        const timestampA = parseInt(a.split(':').pop() || '0');
        const timestampB = parseInt(b.split(':').pop() || '0');
        return timestampB - timestampA;
      });

      const toKeepKey = keys[0];
      const toRemoveKeys = keys.slice(1);

      console.log(`✅ Manteniendo key: ${toKeepKey}`);
      console.log(`🗑️  Eliminando ${toRemoveKeys.length} keys duplicadas...`);

      for (const key of toRemoveKeys) {
        try {
          await redis.del(key);
          console.log(`   ✅ Eliminado: ${key}`);
        } catch (error: any) {
          console.error(`   ❌ Error eliminando ${key}: ${error.message}`);
        }
      }

      console.log(`✅ Limpieza de keys completada`);
    }

  } catch (error: any) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await queue.close();
    await redis.quit();
    console.log('✅ Conexiones cerradas');
  }
}

// Ejecutar
cleanupDuplicateJobs()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });

