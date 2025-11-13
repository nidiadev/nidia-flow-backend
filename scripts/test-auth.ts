#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

async function testAuth() {
  try {
    console.log('🧪 Testing authentication system...');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const authService = app.get(AuthService);

    // Test user validation
    console.log('Testing user validation...');
    const user = await authService.validateUser('admin@nidiaflow.com', 'SuperAdmin123!');
    
    if (user) {
      console.log('✅ User validation successful:', {
        id: user.id,
        email: user.email,
        role: user.systemRole,
      });
    } else {
      console.log('❌ User validation failed');
    }

    await app.close();
    console.log('🎉 Authentication test completed!');
    
  } catch (error) {
    console.error('❌ Error testing authentication:', error);
    process.exit(1);
  }
}

testAuth();