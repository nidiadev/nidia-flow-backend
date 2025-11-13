#!/usr/bin/env node

console.log('🚀 Probando inicio del servidor NIDIA Flow...');

const { spawn } = require('child_process');
const path = require('path');

// Cambiar al directorio del proyecto
process.chdir(__dirname);

const server = spawn('npm', ['start'], {
  stdio: 'pipe',
  env: { ...process.env }
});

let output = '';
let hasStarted = false;
let hasError = false;

// Timeout de 30 segundos
const timeout = setTimeout(() => {
  if (!hasStarted && !hasError) {
    console.log('⏰ Timeout: El servidor no inició en 30 segundos');
    server.kill();
    process.exit(1);
  }
}, 30000);

server.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log(text.trim());
  
  // Buscar indicadores de que el servidor inició correctamente
  if (text.includes('Nest application successfully started') || 
      text.includes('Application is running on') ||
      text.includes('listening on port') ||
      text.includes('started on')) {
    hasStarted = true;
    clearTimeout(timeout);
    console.log('\n✅ ¡Servidor iniciado exitosamente!');
    server.kill();
    process.exit(0);
  }
});

server.stderr.on('data', (data) => {
  const text = data.toString();
  console.error('❌ Error:', text.trim());
  
  // Buscar errores críticos
  if (text.includes('Error:') || 
      text.includes('MODULE_NOT_FOUND') ||
      text.includes('Cannot find module')) {
    hasError = true;
    clearTimeout(timeout);
    console.log('\n❌ Error crítico detectado - El servidor no pudo iniciar');
    server.kill();
    process.exit(1);
  }
});

server.on('close', (code) => {
  clearTimeout(timeout);
  if (!hasStarted && !hasError) {
    console.log(`\n❌ El servidor se cerró con código ${code}`);
    process.exit(1);
  }
});

server.on('error', (err) => {
  clearTimeout(timeout);
  console.error('❌ Error al iniciar el proceso:', err.message);
  process.exit(1);
});