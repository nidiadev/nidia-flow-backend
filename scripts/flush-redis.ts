/**
 * Script para limpiar Redis completamente o por patrones
 * 
 * Ejecutar con: npm run flush:redis
 * 
 * OPCIONES:
 * - Sin argumentos: Lista todas las keys
 * - --all: Elimina TODAS las keys (FLUSHDB)
 * - --pattern <pattern>: Elimina keys que coincidan con el patrón (ej: bull:*)
 */

import { Redis } from 'ioredis';

async function flushRedis() {
  // Configurar Redis connection
  const redis = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      });

  try {
    const args = process.argv.slice(2);
    const command = args[0];

    // Obtener información de la base de datos
    const dbSize = await redis.dbsize();
    console.log(`📊 Total de keys en Redis: ${dbSize}`);

    if (dbSize === 0) {
      console.log('✅ Redis ya está vacío');
      await redis.quit();
      return;
    }

    if (command === '--all') {
      // Confirmación
      console.log('⚠️  ADVERTENCIA: Esto eliminará TODAS las keys de Redis');
      console.log('⚠️  Presiona Ctrl+C para cancelar o espera 5 segundos...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🗑️  Eliminando todas las keys...');
      await redis.flushdb();
      console.log('✅ Todas las keys han sido eliminadas');
      
    } else if (command === '--pattern') {
      const pattern = args[1] || 'bull:*';
      console.log(`🔍 Buscando keys con patrón: ${pattern}`);
      
      const keys = await redis.keys(pattern);
      console.log(`📊 Encontradas ${keys.length} keys`);
      
      if (keys.length === 0) {
        console.log('✅ No hay keys que coincidan con el patrón');
        await redis.quit();
        return;
      }
      
      // Mostrar algunas keys como ejemplo
      console.log('\n📋 Primeras 10 keys encontradas:');
      keys.slice(0, 10).forEach((key, i) => {
        console.log(`   ${i + 1}. ${key}`);
      });
      if (keys.length > 10) {
        console.log(`   ... y ${keys.length - 10} más`);
      }
      
      console.log(`\n⚠️  Se eliminarán ${keys.length} keys`);
      console.log('⚠️  Presiona Ctrl+C para cancelar o espera 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Eliminar en lotes para evitar problemas con muchas keys
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await redis.del(...batch);
        console.log(`   ✅ Eliminadas ${Math.min(i + batchSize, keys.length)}/${keys.length} keys`);
      }
      
      console.log(`\n✅ ${keys.length} keys eliminadas exitosamente`);
      
    } else {
      // Solo listar keys
      console.log('\n📋 Listando todas las keys (primeras 50):');
      const allKeys = await redis.keys('*');
      allKeys.slice(0, 50).forEach((key, i) => {
        console.log(`   ${i + 1}. ${key}`);
      });
      if (allKeys.length > 50) {
        console.log(`   ... y ${allKeys.length - 50} más`);
      }
      
      console.log('\n💡 Para eliminar todas las keys, ejecuta: npm run flush:redis -- --all');
      console.log('💡 Para eliminar por patrón, ejecuta: npm run flush:redis -- --pattern "bull:*"');
    }

  } catch (error: any) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await redis.quit();
    console.log('✅ Conexión cerrada');
  }
}

// Ejecutar
flushRedis()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });

