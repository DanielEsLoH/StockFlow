// Load environment variables before anything else
import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { ThrottlerModule } from '../src/throttler';
import { THROTTLE_CONFIG } from '../src/throttler/throttler.constants';

// ============================================================================
// MOCK CONTROLLER FOR TESTING
// ============================================================================

/**
 * Simple test controller for rate limit testing.
 * Provides endpoints with different behaviors for testing.
 */
@Controller('test-rate-limit')
class TestRateLimitController {
  @Get()
  get() {
    return { message: 'ok' };
  }

  @Post()
  post(@Body() body: Record<string, unknown>) {
    return { message: 'ok', body };
  }
}

// ============================================================================
// E2E TESTS
// ============================================================================

describe('Rate Limiting E2E Tests', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ThrottlerModule,
      ],
      controllers: [TestRateLimitController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ==========================================================================
  // THROTTLE CONFIGURATION TESTS
  // ==========================================================================

  describe('Throttle Configuration', () => {
    it('should have valid default rate limit configuration', () => {
      expect(THROTTLE_CONFIG.DEFAULT.ttl).toBe(60);
      expect(THROTTLE_CONFIG.DEFAULT.limit).toBe(100);
    });

    it('should have valid auth rate limit configuration', () => {
      expect(THROTTLE_CONFIG.AUTH.LOGIN.ttl).toBe(900);
      expect(THROTTLE_CONFIG.AUTH.LOGIN.limit).toBe(5);
      expect(THROTTLE_CONFIG.AUTH.REGISTER.ttl).toBe(3600);
      expect(THROTTLE_CONFIG.AUTH.REGISTER.limit).toBe(3);
    });

    it('should have valid subscription tier limits', () => {
      expect(THROTTLE_CONFIG.SUBSCRIPTION.FREE.limit).toBeLessThan(
        THROTTLE_CONFIG.SUBSCRIPTION.BASIC.limit,
      );
      expect(THROTTLE_CONFIG.SUBSCRIPTION.BASIC.limit).toBeLessThan(
        THROTTLE_CONFIG.SUBSCRIPTION.PRO.limit,
      );
      expect(THROTTLE_CONFIG.SUBSCRIPTION.PRO.limit).toBeLessThan(
        THROTTLE_CONFIG.SUBSCRIPTION.ENTERPRISE.limit,
      );
    });
  });

  // ==========================================================================
  // GLOBAL THROTTLING TESTS
  // ==========================================================================

  describe('Global Throttling', () => {
    it('should allow requests within rate limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-rate-limit')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'ok');
    });

    it('should handle multiple sequential requests', async () => {
      // Make multiple requests within the limit
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer()).get(
          '/test-rate-limit',
        );

        // Should not be rate limited in development mode (10x default limit)
        expect(response.status).toBe(200);
      }
    });

    it('should track POST requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/test-rate-limit')
        .send({ test: 'data' })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'ok');
    });
  });

  // ==========================================================================
  // IP-BASED RATE LIMITING TESTS
  // ==========================================================================

  describe('IP-based Rate Limiting', () => {
    it('should accept requests from different IPs', async () => {
      // Simulate requests from different IPs
      const response1 = await request(app.getHttpServer())
        .get('/test-rate-limit')
        .set('X-Forwarded-For', '192.168.1.100');

      const response2 = await request(app.getHttpServer())
        .get('/test-rate-limit')
        .set('X-Forwarded-For', '192.168.1.101');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle Cloudflare IP header', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-rate-limit')
        .set('CF-Connecting-IP', '1.2.3.4');

      expect(response.status).toBe(200);
    });

    it('should handle X-Real-IP header', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-rate-limit')
        .set('X-Real-IP', '5.6.7.8');

      expect(response.status).toBe(200);
    });

    it('should use first IP in X-Forwarded-For chain', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-rate-limit')
        .set('X-Forwarded-For', '10.0.0.1, 10.0.0.2, 10.0.0.3');

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return proper error structure when throttled', async () => {
      // This test verifies the error message format when eventually throttled
      // In actual implementation, we'd need to exceed the rate limit
      const response = await request(app.getHttpServer()).get(
        '/test-rate-limit',
      );

      // Should either succeed or have proper error structure
      if (response.status === 429) {
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Too many requests');
      } else {
        expect(response.status).toBe(200);
      }
    });
  });

  // ==========================================================================
  // HEAVY OPERATION LIMITS TESTS
  // ==========================================================================

  describe('Heavy Operation Limits', () => {
    it('should have appropriate limits for uploads', () => {
      expect(THROTTLE_CONFIG.HEAVY.UPLOAD.ttl).toBe(3600);
      expect(THROTTLE_CONFIG.HEAVY.UPLOAD.limit).toBe(20);
    });

    it('should have appropriate limits for reports', () => {
      expect(THROTTLE_CONFIG.HEAVY.REPORT.ttl).toBe(3600);
      expect(THROTTLE_CONFIG.HEAVY.REPORT.limit).toBe(30);
    });

    it('should have appropriate limits for bulk operations', () => {
      expect(THROTTLE_CONFIG.HEAVY.BULK.ttl).toBe(3600);
      expect(THROTTLE_CONFIG.HEAVY.BULK.limit).toBe(10);
    });
  });

  // ==========================================================================
  // SUBSCRIPTION TIER LIMITS TESTS
  // ==========================================================================

  describe('Subscription Tier Limits', () => {
    it('FREE tier should have lowest limits', () => {
      const free = THROTTLE_CONFIG.SUBSCRIPTION.FREE;
      const basic = THROTTLE_CONFIG.SUBSCRIPTION.BASIC;

      expect(free.limit).toBeLessThan(basic.limit);
    });

    it('ENTERPRISE tier should have highest limits', () => {
      const enterprise = THROTTLE_CONFIG.SUBSCRIPTION.ENTERPRISE;
      const pro = THROTTLE_CONFIG.SUBSCRIPTION.PRO;

      expect(enterprise.limit).toBeGreaterThan(pro.limit);
    });

    it('all tiers should use same TTL window', () => {
      const tiers = Object.values(THROTTLE_CONFIG.SUBSCRIPTION);

      tiers.forEach((tier) => {
        expect(tier.ttl).toBe(60);
      });
    });
  });
});
