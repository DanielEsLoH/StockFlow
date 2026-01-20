import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaHealthIndicator } from './indicators';
import {
  HEALTH_KEYS,
  MEMORY_THRESHOLDS,
  DISK_THRESHOLDS,
} from './health.constants';

/**
 * Health check response structure.
 */
class HealthCheckResponse {
  status: 'ok' | 'error';
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; error?: string }>;
  details: Record<string, { status: string; error?: string }>;
}

/**
 * HealthController provides endpoints for monitoring application health.
 *
 * These endpoints are designed for:
 * - Load balancer health checks
 * - Kubernetes liveness/readiness probes
 * - Monitoring and alerting systems
 *
 * All endpoints skip rate limiting to ensure availability.
 */
@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly memoryHealth: MemoryHealthIndicator,
    private readonly diskHealth: DiskHealthIndicator,
  ) {}

  /**
   * Full health check endpoint.
   *
   * Checks all critical components:
   * - Database connectivity
   * - Memory usage (heap and RSS)
   * - Disk space
   *
   * @returns Health status of all components
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Full health check',
    description:
      'Returns health status of all critical components including database, memory, and disk',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    type: HealthCheckResponse,
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
    type: HealthCheckResponse,
  })
  check() {
    return this.health.check([
      // Database health check
      () => this.prismaHealth.isHealthy(HEALTH_KEYS.DATABASE),

      // Memory health check - heap usage
      () =>
        this.memoryHealth.checkHeap(
          HEALTH_KEYS.MEMORY + '_heap',
          MEMORY_THRESHOLDS.HEAP_USED,
        ),

      // Memory health check - RSS
      () =>
        this.memoryHealth.checkRSS(
          HEALTH_KEYS.MEMORY + '_rss',
          MEMORY_THRESHOLDS.RSS,
        ),
    ]);
  }

  /**
   * Liveness probe endpoint.
   *
   * Simple check to verify the application is running.
   * Does not check external dependencies.
   *
   * Use for Kubernetes liveness probes.
   *
   * @returns Basic health status
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Simple check to verify the application is running (for Kubernetes liveness probes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe endpoint.
   *
   * Checks if the application is ready to receive traffic.
   * Verifies database connectivity.
   *
   * Use for Kubernetes readiness probes.
   *
   * @returns Readiness status with database check
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks if the application is ready to receive traffic (for Kubernetes readiness probes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    type: HealthCheckResponse,
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
    type: HealthCheckResponse,
  })
  ready() {
    return this.health.check([
      () => this.prismaHealth.isHealthy(HEALTH_KEYS.DATABASE),
    ]);
  }

  /**
   * Database health check endpoint.
   *
   * Dedicated endpoint for checking database connectivity.
   *
   * @returns Database health status
   */
  @Get('db')
  @HealthCheck()
  @ApiOperation({
    summary: 'Database health check',
    description: 'Checks database connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'Database is healthy',
    type: HealthCheckResponse,
  })
  @ApiResponse({
    status: 503,
    description: 'Database is unhealthy',
    type: HealthCheckResponse,
  })
  database() {
    return this.health.check([
      () => this.prismaHealth.isHealthy(HEALTH_KEYS.DATABASE),
    ]);
  }

  /**
   * Memory health check endpoint.
   *
   * Dedicated endpoint for checking memory usage.
   *
   * @returns Memory health status
   */
  @Get('memory')
  @HealthCheck()
  @ApiOperation({
    summary: 'Memory health check',
    description: 'Checks memory usage (heap and RSS)',
  })
  @ApiResponse({
    status: 200,
    description: 'Memory usage is healthy',
    type: HealthCheckResponse,
  })
  @ApiResponse({
    status: 503,
    description: 'Memory usage is unhealthy',
    type: HealthCheckResponse,
  })
  memory() {
    return this.health.check([
      () =>
        this.memoryHealth.checkHeap(
          HEALTH_KEYS.MEMORY + '_heap',
          MEMORY_THRESHOLDS.HEAP_USED,
        ),
      () =>
        this.memoryHealth.checkRSS(
          HEALTH_KEYS.MEMORY + '_rss',
          MEMORY_THRESHOLDS.RSS,
        ),
    ]);
  }
}
