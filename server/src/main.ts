import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
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
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
