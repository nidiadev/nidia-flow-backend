#!/usr/bin/env node

console.log('🔍 Probando correcciones de advertencias...');

const { spawn } = require('child_process');

const server = spawn('npm', ['start'], {
  stdio: 'pipe',
  env: { ...process.env }
});

let hasMemoryLeakWarning = false;
let hasLegacyRouteWarning = false;
let hasStarted = false;

// Timeout de 15 segundos
const timeout = setTimeout(() => {
  if (hasStarted) {
    console.log('\n✅ Servidor iniciado correctamente');
    console.log(`❌ Memory leak warning: ${hasMemoryLeakWarning ? 'SÍ' : 'NO'}`);
    console.log(`❌ Legacy route warning: ${hasLegacyRouteWarning ? 'SÍ' : 'NO'}`);
    
    if (!hasMemoryLeakWarning && !hasLegacyRouteWarning) {
      console.log('\n🎉 ¡Todas las advertencias han sido solucionadas!');
    } else {
      console.log('\n⚠️  Aún hay advertencias por solucionar');
    }
  }
  server.kill();
  process.exit(0);
}, 15000);

server.stdout.on('data', (data) => {
  const text = data.toString();
  console.log(text.trim());
  
  if (text.includes('Nest application successfully started')) {
    hasStarted = true;
  }
});

server.stderr.on('data', (data) => {
  const text = data.toString();
  console.log('⚠️ ', text.trim());
  
  if (text.includes('MaxListenersExceededWarning')) {
    hasMemoryLeakWarning = true;
  }
  
  if (text.includes('LegacyRouteConverter')) {
    hasLegacyRouteWarning = true;
  }
});

server.on('error', (err) => {
  clearTimeout(timeout);
  console.error('❌ Error:', err.message);
  process.exit(1);
});