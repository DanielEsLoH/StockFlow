/**
 * Global Interceptors
 *
 * This module exports all interceptors for request/response handling.
 *
 * Available interceptors:
 *
 * 1. LoggingInterceptor - Logs HTTP method, URL, and response duration
 *    - Development-only by default (respects NODE_ENV)
 *    - Colored output for visual distinction
 *    - Excludes health check routes by default
 *
 * 2. TransformInterceptor - Wraps responses in consistent API format
 *    - Provides { success, data, timestamp } structure
 *    - Optional (use when consistent response format is desired)
 *
 * @example
 * ```typescript
 * // In main.ts
 * import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';
 *
 * // Apply logging interceptor globally
 * app.useGlobalInterceptors(new LoggingInterceptor());
 *
 * // Optionally apply transform interceptor for consistent response format
 * app.useGlobalInterceptors(
 *   new LoggingInterceptor(),
 *   new TransformInterceptor(),
 * );
 * ```
 */

export {
  LoggingInterceptor,
  type LoggingInterceptorOptions,
} from './logging.interceptor';

export {
  TransformInterceptor,
  type TransformInterceptorOptions,
  type ApiResponse,
} from './transform.interceptor';

export { LimitCheckInterceptor } from './limit-check.interceptor';
