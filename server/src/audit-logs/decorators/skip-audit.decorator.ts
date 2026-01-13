import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for the skip audit decorator.
 */
export const SKIP_AUDIT_KEY = 'audit:skip';

/**
 * Decorator to skip audit logging for a specific endpoint.
 *
 * Use this when you have a controller decorated with @Audit()
 * but want to exclude specific methods from being logged.
 *
 * Common use cases:
 * - Bulk operations that would generate too many logs
 * - Read-only endpoints on a write-audited controller
 * - System operations that shouldn't be user-attributed
 *
 * @example
 * ```typescript
 * @Controller('products')
 * @Audit('Product')
 * export class ProductsController {
 *   // This endpoint will be logged
 *   @Post()
 *   async create(@Body() dto: CreateProductDto) {
 *     return this.productsService.create(dto);
 *   }
 *
 *   // This endpoint will NOT be logged
 *   @Get()
 *   @SkipAudit()
 *   async findAll() {
 *     return this.productsService.findAll();
 *   }
 * }
 * ```
 */
export const SkipAudit = (): MethodDecorator => {
  return SetMetadata(SKIP_AUDIT_KEY, true);
};
