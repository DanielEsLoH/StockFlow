import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  PrismaExceptionFilter,
  PrismaValidationExceptionFilter,
} from './common/filters';
import { LoggingInterceptor } from './common/interceptors';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Enable rawBody for Stripe webhook signature verification
  // This preserves the raw Buffer on req.rawBody for specific routes
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Serve static files from the uploads directory
  // Files will be accessible at /uploads/* URL paths
  const uploadsPath = join(__dirname, '..', 'uploads');
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

  // Global exception filters
  // Order matters: filters are applied in reverse order (last registered catches first)
  // So we register: AllExceptions -> Prisma -> PrismaValidation -> HttpException
  // This means HttpException catches first, then PrismaValidation, then Prisma, then AllExceptions as fallback
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new PrismaExceptionFilter(),
    new PrismaValidationExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Global interceptors
  // LoggingInterceptor: logs HTTP method, URL, and response duration
  // - Only active in development (NODE_ENV !== 'production')
  // - Excludes health check routes by default
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global validation pipe
  // - whitelist: strips properties not in DTO
  // - forbidNonWhitelisted: throws error if unknown properties are sent
  // - transform: auto-transforms payloads to DTO instances
  // - enableImplicitConversion: converts query params to their declared types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API documentation configuration
  const config = new DocumentBuilder()
    .setTitle('StockFlow API')
    .setDescription('API documentation for StockFlow SaaS - Inventory Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('health', 'Health check and system status endpoints')
    .addTag('auth', 'Authentication endpoints for login, register, and token management')
    .addTag('users', 'User management endpoints')
    .addTag('products', 'Product management endpoints')
    .addTag('categories', 'Product category management endpoints')
    .addTag('warehouses', 'Warehouse management endpoints')
    .addTag('customers', 'Customer management endpoints')
    .addTag('invoices', 'Invoice management endpoints')
    .addTag('payments', 'Payment management endpoints')
    .addTag('stock-movements', 'Stock movement tracking endpoints')
    .addTag('dashboard', 'Dashboard analytics and metrics endpoints')
    .addTag('reports', 'Report generation endpoints')
    .addTag('notifications', 'Notification management endpoints')
    .addTag('subscriptions', 'Subscription and billing management endpoints')
    .addTag('audit', 'Audit log endpoints for activity tracking')
    .addTag('upload', 'File upload endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'StockFlow API Documentation',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}
void bootstrap();
