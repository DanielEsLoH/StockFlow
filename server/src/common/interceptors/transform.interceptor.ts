import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard API response wrapper format
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Configuration options for the TransformInterceptor
 */
export interface TransformInterceptorOptions {
  /**
   * Whether to enable response transformation
   * @default true
   */
  enabled?: boolean;
}

/**
 * TransformInterceptor
 *
 * A global interceptor that wraps all successful responses in a consistent
 * API response format. This provides a uniform response structure across
 * all endpoints.
 *
 * Features:
 * - Wraps responses in a consistent { success, data, timestamp } format
 * - Only transforms successful responses (errors are handled by exception filters)
 * - Configurable enable/disable flag
 *
 * @example
 * // Global registration in main.ts
 * app.useGlobalInterceptors(new TransformInterceptor());
 *
 * // Input (original controller response):
 * { "id": 1, "name": "Product A" }
 *
 * // Output (transformed response):
 * {
 *   "success": true,
 *   "data": { "id": 1, "name": "Product A" },
 *   "timestamp": "2025-01-08T10:30:00.000Z"
 * }
 *
 * @example
 * // Disable transformation for specific scenarios
 * app.useGlobalInterceptors(new TransformInterceptor({ enabled: false }));
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  private readonly enabled: boolean;

  constructor(options: TransformInterceptorOptions = {}) {
    this.enabled = options.enabled ?? true;
  }

  /**
   * Intercepts outgoing responses and wraps them in the standard API format
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // Skip transformation if disabled
    if (!this.enabled) {
      return next.handle() as Observable<ApiResponse<T>>;
    }

    // Only transform HTTP responses
    if (context.getType() !== 'http') {
      return next.handle() as Observable<ApiResponse<T>>;
    }

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
