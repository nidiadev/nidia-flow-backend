import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';

/**
 * Parse allowed CORS origins from environment variables
 * Supports multiple origins separated by commas
 * Falls back to localhost in development if not configured
 */
function getAllowedOrigins(): string[] | string | boolean {
  const corsOrigins = process.env.CORS_ORIGINS;
  const frontendUrl = process.env.FRONTEND_URL;
  
  // If CORS_ORIGINS is explicitly set, use it (supports comma-separated list)
  if (corsOrigins) {
    const origins = corsOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    
    if (origins.length > 0) {
      return origins;
    }
  }
  
  // Fallback to FRONTEND_URL if set
  if (frontendUrl) {
    return frontendUrl;
  }
  
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    return ['http://localhost:4002', 'http://localhost:3000'];
  }
  
  // In production, if no origins configured, deny all (security)
  return false;
}

async function bootstrap() {
  // Increase EventEmitter listeners limit to prevent memory leak warnings
  process.setMaxListeners(20);
  
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  
  // CORS - Professional, scalable configuration
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Request-ID',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Per-Page',
      'X-Request-ID',
    ],
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NIDIA Flow SuperAdmin API')
    .setDescription('API for NIDIA Flow SuperAdmin system - Multi-tenant management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and session management')
    .addTag('Users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4001;
  await app.listen(port);
  
  console.log(`🚀 NIDIA Flow SuperAdmin API running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();