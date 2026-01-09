import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './services';

/**
 * CommonModule
 *
 * A global module that provides shared services used across the application.
 * Being marked as @Global(), this module only needs to be imported once in
 * AppModule and its exports will be available everywhere.
 *
 * Provides:
 * - TenantContextService: Request-scoped service for accessing tenant context
 *   and checking plan limits. Useful for enforcing multi-tenant resource limits.
 *
 * Note: TenantContextService is request-scoped, meaning a new instance is created
 * for each incoming request. This allows it to safely cache tenant data per request.
 *
 * @example
 * ```typescript
 * // In any service across the application:
 * @Injectable()
 * export class ProductsService {
 *   constructor(private readonly tenantContext: TenantContextService) {}
 *
 *   async create(dto: CreateProductDto) {
 *     await this.tenantContext.enforceLimit('products');
 *     // ... create product
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class CommonModule {}