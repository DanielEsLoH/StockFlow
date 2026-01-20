import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma';
import { HEALTH_KEYS, HEALTH_TIMEOUTS } from '../health.constants';

/**
 * Prisma database health indicator.
 *
 * Checks database connectivity by executing a simple query.
 * Times out if the query takes too long.
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Check if the database is healthy by executing a ping query.
   *
   * @param key - The key to use in the health check result
   * @returns Health indicator result
   * @throws HealthCheckError if the database is not reachable
   */
  async isHealthy(
    key: string = HEALTH_KEYS.DATABASE,
  ): Promise<HealthIndicatorResult> {
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database health check timed out'));
        }, HEALTH_TIMEOUTS.DATABASE);
      });

      // Execute a simple query to check connectivity
      const queryPromise = this.prisma.$queryRaw`SELECT 1 as health_check`;

      // Race between query and timeout
      await Promise.race([queryPromise, timeoutPromise]);

      return this.getStatus(key, true, {
        status: 'up',
        responseTime: 'ok',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HealthCheckError(
        `${key} health check failed`,
        this.getStatus(key, false, {
          status: 'down',
          error: errorMessage,
        }),
      );
    }
  }
}
