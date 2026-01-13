import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for the audit entity type decorator.
 */
export const AUDIT_ENTITY_TYPE_KEY = 'audit:entityType';

/**
 * Decorator to mark an endpoint for audit logging.
 *
 * When applied to a controller method, the AuditInterceptor will
 * automatically log CREATE, UPDATE, and DELETE operations for
 * the specified entity type.
 *
 * @param entityType - The type of entity being audited (e.g., 'Product', 'User', 'Invoice')
 *
 * @example
 * ```typescript
 * @Post()
 * @Audit('Product')
 * async create(@Body() dto: CreateProductDto) {
 *   return this.productsService.create(dto);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Applied at controller level - all methods will use this entity type
 * @Controller('products')
 * @Audit('Product')
 * export class ProductsController {
 *   // ...
 * }
 * ```
 */
export const Audit = (entityType: string): MethodDecorator & ClassDecorator => {
  return SetMetadata(AUDIT_ENTITY_TYPE_KEY, entityType);
};
