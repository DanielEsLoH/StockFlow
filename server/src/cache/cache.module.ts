import { Global, Module, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';
import { getErrorMessage } from '../common/utils/error.utils';

/**
 * CacheModule provides application-wide caching functionality.
 *
 * Features:
 * - Redis-based caching when REDIS_HOST is configured
 * - Falls back to in-memory caching for development
 * - Global module - available throughout the application
 * - Tenant-aware caching through CacheService
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (optional)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis authentication password (optional)
 * - REDIS_DB: Redis database index (default: 0)
 * - CACHE_TTL: Default cache TTL in seconds (default: 300)
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly cache: CacheService) {}
 *
 *   async getData() {
 *     return this.cache.getOrSet('key', () => fetchData(), 300);
 *   }
 * }
 * ```
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');
        const redisHost = configService.get<string>('REDIS_HOST');

        // Use Redis if configured, otherwise fall back to in-memory
        if (redisHost) {
          const redisPort = configService.get<number>('REDIS_PORT', 6379);
          const redisPassword = configService.get<string>('REDIS_PASSWORD');
          const redisDb = configService.get<number>('REDIS_DB', 0);
          const ttl = configService.get<number>('CACHE_TTL', 300);

          logger.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

          try {
            const store = await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              password: redisPassword || undefined,
              database: redisDb,
              ttl: ttl * 1000, // Convert to milliseconds
            });

            logger.log('Redis cache connected successfully');

            return {
              store,
              ttl: ttl * 1000,
            };
          } catch (error: unknown) {
            logger.warn(
              `Failed to connect to Redis: ${getErrorMessage(error)}. Falling back to in-memory cache.`,
            );
            return {
              ttl: 300 * 1000, // 5 minutes in milliseconds
            };
          }
        }

        // In-memory cache for development or when Redis is not configured
        logger.log('Using in-memory cache (Redis not configured)');
        const ttl = configService.get<number>('CACHE_TTL', 300);

        return {
          ttl: ttl * 1000, // Convert to milliseconds
          max: 1000, // Maximum number of items in cache
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
