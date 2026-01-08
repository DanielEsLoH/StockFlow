import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * ANSI color codes for terminal output
 * Used for colorful logging in development mode
 */
const Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
} as const;

/**
 * HTTP method color mapping for visual distinction in logs
 */
const METHOD_COLORS: Record<string, string> = {
  GET: Colors.green,
  POST: Colors.yellow,
  PUT: Colors.blue,
  PATCH: Colors.cyan,
  DELETE: Colors.magenta,
};

/**
 * Configuration options for the LoggingInterceptor
 */
export interface LoggingInterceptorOptions {
  /**
   * Routes to exclude from logging (supports exact match and prefix match)
   * @default ['/health', '/healthz', '/health-check', '/ready', '/live']
   */
  excludeRoutes?: string[];

  /**
   * Whether to enable colored output
   * @default true in development, false in production
   */
  coloredOutput?: boolean;

  /**
   * Whether logging is enabled
   * @default true in development, false in production
   */
  enabled?: boolean;
}

/**
 * LoggingInterceptor
 *
 * A global interceptor that logs HTTP request details including method, URL,
 * and response duration. Designed for development use with colored terminal output.
 *
 * Features:
 * - Logs HTTP method, URL, and response time in milliseconds
 * - Colored output for easy visual distinction between HTTP methods
 * - Configurable route exclusions (health checks excluded by default)
 * - Development-only logging (respects NODE_ENV)
 * - High-precision timing using performance.now()
 *
 * @example
 * // Global registration in main.ts
 * app.useGlobalInterceptors(new LoggingInterceptor());
 *
 * // With custom options
 * app.useGlobalInterceptors(new LoggingInterceptor({
 *   excludeRoutes: ['/health', '/metrics'],
 *   coloredOutput: true,
 * }));
 *
 * @example
 * // Example log output:
 * [HTTP] GET /api/products - 45ms
 * [HTTP] POST /api/users - 120ms
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly excludeRoutes: string[];
  private readonly coloredOutput: boolean;
  private readonly enabled: boolean;

  constructor(options: LoggingInterceptorOptions = {}) {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    this.excludeRoutes = options.excludeRoutes ?? [
      '/health',
      '/healthz',
      '/health-check',
      '/ready',
      '/live',
    ];
    this.coloredOutput = options.coloredOutput ?? isDevelopment;
    this.enabled = options.enabled ?? isDevelopment;
  }

  /**
   * Intercepts incoming HTTP requests and logs method, URL, and duration
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Skip logging if disabled (production mode)
    if (!this.enabled) {
      return next.handle();
    }

    // Only log HTTP requests
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    // Skip excluded routes
    if (this.shouldExcludeRoute(url)) {
      return next.handle();
    }

    const startTime = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = this.calculateDuration(startTime);
          this.logRequest(method, url, duration);
        },
        error: () => {
          // Log even on error, so we can see failed requests
          const duration = this.calculateDuration(startTime);
          this.logRequest(method, url, duration, true);
        },
      }),
    );
  }

  /**
   * Checks if a route should be excluded from logging
   */
  private shouldExcludeRoute(url: string): boolean {
    // Remove query parameters for comparison
    const path = url.split('?')[0];

    return this.excludeRoutes.some(
      (excludedRoute) =>
        path === excludedRoute || path.startsWith(`${excludedRoute}/`),
    );
  }

  /**
   * Calculates the duration since the start time
   */
  private calculateDuration(startTime: number): number {
    return Math.round(performance.now() - startTime);
  }

  /**
   * Logs the request details with optional coloring
   */
  private logRequest(
    method: string,
    url: string,
    duration: number,
    isError = false,
  ): void {
    if (this.coloredOutput) {
      this.logWithColors(method, url, duration, isError);
    } else {
      this.logPlain(method, url, duration);
    }
  }

  /**
   * Logs request with ANSI colors for terminal output
   */
  private logWithColors(
    method: string,
    url: string,
    duration: number,
    isError: boolean,
  ): void {
    const methodColor = METHOD_COLORS[method] ?? Colors.white;
    const durationColor = this.getDurationColor(duration);
    const resetColor = Colors.reset;

    const coloredMethod = `${methodColor}${method}${resetColor}`;
    const coloredDuration = `${durationColor}${duration}ms${resetColor}`;

    const message = `${coloredMethod} ${url} - ${coloredDuration}`;

    if (isError) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }

  /**
   * Logs request without colors (for production or non-TTY environments)
   */
  private logPlain(method: string, url: string, duration: number): void {
    this.logger.log(`${method} ${url} - ${duration}ms`);
  }

  /**
   * Returns appropriate color based on response duration
   * - Green: < 100ms (fast)
   * - Yellow: 100-500ms (moderate)
   * - Magenta: > 500ms (slow)
   */
  private getDurationColor(duration: number): string {
    if (duration < 100) {
      return Colors.green;
    } else if (duration < 500) {
      return Colors.yellow;
    } else {
      return Colors.magenta;
    }
  }
}
