#!/usr/bin/env node

console.log('🔍 Verificando la compilación de NIDIA Flow...');

// Verificar que los archivos principales existan
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'dist/src/main.js',
  'dist/src/app.module.js',
  'dist/src/lib/prisma.js',
  'generated/prisma/index.js',
  'generated/tenant-prisma/index.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} - OK`);
  } else {
    console.log(`❌ ${file} - FALTA`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n🎉 ¡Todos los archivos necesarios están presentes!');
  console.log('✅ La compilación de NIDIA Flow está completa y lista para ejecutar.');
  
  console.log('\n📋 Para iniciar el servidor:');
  console.log('   npm start');
  
  console.log('\n🌐 URLs importantes:');
  console.log('   - API: http://localhost:3001');
  console.log('   - Swagger: http://localhost:3001/docs');
  console.log('   - pgAdmin: http://localhost:8080');
  
  process.exit(0);
} else {
  console.log('\n❌ Faltan archivos necesarios. Ejecuta:');
  console.log('   npm run build');
  process.exit(1);
}