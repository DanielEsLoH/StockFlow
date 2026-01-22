import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import compression from 'compression';
import helmet from 'helmet';
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
  const isProduction = process.env.NODE_ENV === 'production';

  // Enable rawBody for Stripe webhook signature verification
  // This preserves the raw Buffer on req.rawBody for specific routes
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Trust proxy when running behind nginx/load balancer in production
  // This ensures correct client IP detection and secure cookie handling
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // CORS configuration
  // Allow requests from the frontend origin
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    // Production domains
    'https://www.stockflow.com.co',
    'https://stockflow.com.co',
    // Development domains
    'http://localhost:3001',
    'http://localhost:5173', // Vite dev server
    'http://localhost',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Compression middleware for gzip response compression
  // - level 6: balanced compression ratio vs CPU usage
  // - threshold 1024: only compress responses >= 1KB
  app.use(
    compression({
      level: 6,
      threshold: 1024,
    }),
  );

  // Helmet for security headers
  // Configured to be permissive enough for a React SaaS application
  app.use(
    helmet({
      // Content Security Policy - allow inline scripts/styles for React
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      // HTTP Strict Transport Security - enforce HTTPS in production
      strictTransportSecurity: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
      // X-Frame-Options - allow framing from same origin only
      frameguard: {
        action: 'sameorigin',
      },
      // X-Content-Type-Options - prevent MIME type sniffing
      noSniff: true,
      // Referrer-Policy - control referrer information
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // X-XSS-Protection - legacy XSS protection (modern browsers use CSP)
      xssFilter: true,
      // Hide X-Powered-By header
      hidePoweredBy: true,
      // X-DNS-Prefetch-Control - control DNS prefetching
      dnsPrefetchControl: {
        allow: true,
      },
      // Cross-Origin-Embedder-Policy - disabled for compatibility with external resources
      crossOriginEmbedderPolicy: false,
      // Cross-Origin-Opener-Policy - same-origin for security
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },
      // Cross-Origin-Resource-Policy - same-origin for security
      crossOriginResourcePolicy: {
        policy: 'same-origin',
      },
    }),
  );

  // Enable graceful shutdown hooks for clean resource cleanup
  // Handles SIGTERM/SIGINT signals for proper container orchestration
  app.enableShutdownHooks();

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
  // Only enabled in non-production OR when ENABLE_SWAGGER is explicitly set
  const enableSwagger = !isProduction || process.env.ENABLE_SWAGGER === 'true';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('StockFlow API')
      .setDescription(
        'API documentation for StockFlow SaaS - Inventory Management System',
      )
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
      .addTag(
        'auth',
        'Authentication endpoints for login, register, and token management',
      )
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

    logger.log('Swagger documentation enabled at /api/docs');
  } else {
    logger.log('Swagger documentation disabled in production');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  logger.log(`Trust proxy: ${isProduction ? 'enabled' : 'disabled'}`);
  logger.log('Compression: enabled (gzip, level 6, threshold 1KB)');
  logger.log('Security headers: enabled (helmet)');
  logger.log('Graceful shutdown: enabled');
}
void bootstrap();
