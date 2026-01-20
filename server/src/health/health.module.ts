import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators';

/**
 * HealthModule provides health check endpoints for monitoring.
 *
 * Features:
 * - Full health check (/health)
 * - Liveness probe (/health/live) - for Kubernetes liveness probes
 * - Readiness probe (/health/ready) - for Kubernetes readiness probes
 * - Database health (/health/db)
 * - Memory health (/health/memory)
 *
 * All health endpoints skip rate limiting and authentication
 * to ensure availability for monitoring systems.
 *
 * @example
 * ```bash
 * # Full health check
 * curl http://localhost:3000/health
 *
 * # Liveness probe
 * curl http://localhost:3000/health/live
 *
 * # Readiness probe
 * curl http://localhost:3000/health/ready
 * ```
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
  exports: [PrismaHealthIndicator],
})
export class HealthModule {}
