import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestUser } from '../../auth/types';
import { tenantStorage, TenantContext } from '../context';

/**
 * Express Request extended with user information from JWT authentication.
 * This interface represents the request object after Passport has processed
 * the JWT token and attached user information.
 */
export interface AuthenticatedRequest extends Request {
  /**
   * User information extracted from JWT token by Passport.
   * Will be undefined for unauthenticated requests.
   */
  user?: RequestUser;

  /**
   * Tenant ID extracted from the authenticated user.
   * Stored directly on the request for easy access in controllers.
   */
  tenantId?: string;
}

/**
 * TenantMiddleware
 *
 * NestJS middleware that extracts tenant information from authenticated requests
 * and makes it available throughout the request lifecycle via:
 *
 * 1. Direct request property (`req.tenantId`) for controller access
 * 2. AsyncLocalStorage context for access anywhere in the call stack
 *
 * This middleware should run AFTER authentication middleware/guards have
 * processed the request and attached the user object. For routes that use
 * JwtAuthGuard, the user object will be available on the request.
 *
 * For public routes (without authentication), this middleware will simply
 * pass through without setting tenant context.
 *
 * @example
 * ```typescript
 * // In AppModule
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(TenantMiddleware)
 *       .forRoutes('*');
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a controller - access via request
 * @Get('products')
 * async getProducts(@Req() req: AuthenticatedRequest) {
 *   return this.productService.findAll(req.tenantId);
 * }
 *
 * // Or use the @CurrentTenant() decorator
 * @Get('products')
 * async getProducts(@CurrentTenant() tenantId: string) {
 *   return this.productService.findAll(tenantId);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a service - access via AsyncLocalStorage
 * import { getTenantId } from '../common/context';
 *
 * @Injectable()
 * export class ProductService {
 *   findAll() {
 *     const tenantId = getTenantId();
 *     // Queries are automatically scoped to this tenant
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  /**
   * Middleware handler that extracts tenant context from authenticated requests.
   *
   * @param req - Express request object (potentially with user from JWT)
   * @param _res - Express response object (unused)
   * @param next - Express next function to pass control to the next middleware
   */
  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const user = req.user;

    // If user is authenticated and has tenant information
    if (user?.tenantId) {
      // Store tenantId directly on request for easy controller access
      req.tenantId = user.tenantId;

      // Create tenant context for AsyncLocalStorage
      const context: TenantContext = {
        tenantId: user.tenantId,
        userId: user.userId,
      };

      this.logger.debug(
        `Tenant context set: tenantId=${user.tenantId}, userId=${user.userId}`,
      );

      // Run the rest of the request chain within the tenant context
      // This makes the context available anywhere via getTenantId(), getCurrentContext(), etc.
      tenantStorage.run(context, () => {
        next();
      });
    } else {
      // For unauthenticated requests (public routes), proceed without tenant context
      this.logger.debug(
        'No tenant context - unauthenticated request or missing tenantId',
      );
      next();
    }
  }
}
