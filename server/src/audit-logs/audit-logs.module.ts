import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditInterceptor } from './audit-logs.interceptor';
import { PrismaModule } from '../prisma';

/**
 * AuditLogsModule provides comprehensive audit logging functionality
 * for tracking user actions and entity changes in the application.
 *
 * Features:
 * - Automatic audit logging via AuditInterceptor
 * - Manual audit log creation via AuditLogsService
 * - Query and filter audit logs with pagination
 * - Entity history tracking
 * - User activity tracking
 * - Audit statistics and analytics
 * - Log retention/cleanup
 *
 * Usage:
 * 1. Import AuditLogsModule in AppModule
 * 2. Use @Audit('EntityType') decorator on controllers/methods
 * 3. Apply AuditInterceptor to routes needing automatic logging
 *
 * @example
 * ```typescript
 * // In AppModule
 * @Module({
 *   imports: [AuditLogsModule, ...],
 * })
 * export class AppModule {}
 *
 * // In a controller
 * @Controller('products')
 * @UseInterceptors(AuditInterceptor)
 * export class ProductsController {
 *   @Post()
 *   @Audit('Product')
 *   async create(@Body() dto: CreateProductDto) {
 *     return this.productsService.create(dto);
 *   }
 * }
 * ```
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditInterceptor],
  exports: [AuditLogsService, AuditInterceptor],
})
export class AuditLogsModule {}
