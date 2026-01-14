import { THROTTLE_CONFIG, THROTTLE_NAMES } from './throttler.constants';

describe('Throttler Constants', () => {
  describe('THROTTLE_CONFIG', () => {
    describe('DEFAULT', () => {
      it('should have TTL of 60 seconds', () => {
        expect(THROTTLE_CONFIG.DEFAULT.ttl).toBe(60);
      });

      it('should allow 100 requests per minute', () => {
        expect(THROTTLE_CONFIG.DEFAULT.limit).toBe(100);
      });
    });

    describe('AUTH', () => {
      it('should have strict login limits (5 per 15 minutes)', () => {
        expect(THROTTLE_CONFIG.AUTH.LOGIN.ttl).toBe(900);
        expect(THROTTLE_CONFIG.AUTH.LOGIN.limit).toBe(5);
      });

      it('should have strict register limits (3 per hour)', () => {
        expect(THROTTLE_CONFIG.AUTH.REGISTER.ttl).toBe(3600);
        expect(THROTTLE_CONFIG.AUTH.REGISTER.limit).toBe(3);
      });

      it('should have refresh token limits (10 per 15 minutes)', () => {
        expect(THROTTLE_CONFIG.AUTH.REFRESH.ttl).toBe(900);
        expect(THROTTLE_CONFIG.AUTH.REFRESH.limit).toBe(10);
      });

      it('should have password reset limits (3 per hour)', () => {
        expect(THROTTLE_CONFIG.AUTH.PASSWORD_RESET.ttl).toBe(3600);
        expect(THROTTLE_CONFIG.AUTH.PASSWORD_RESET.limit).toBe(3);
      });
    });

    describe('HEAVY', () => {
      it('should limit uploads (20 per hour)', () => {
        expect(THROTTLE_CONFIG.HEAVY.UPLOAD.ttl).toBe(3600);
        expect(THROTTLE_CONFIG.HEAVY.UPLOAD.limit).toBe(20);
      });

      it('should limit reports (30 per hour)', () => {
        expect(THROTTLE_CONFIG.HEAVY.REPORT.ttl).toBe(3600);
        expect(THROTTLE_CONFIG.HEAVY.REPORT.limit).toBe(30);
      });

      it('should limit bulk operations (10 per hour)', () => {
        expect(THROTTLE_CONFIG.HEAVY.BULK.ttl).toBe(3600);
        expect(THROTTLE_CONFIG.HEAVY.BULK.limit).toBe(10);
      });
    });

    describe('SUBSCRIPTION', () => {
      it('should have FREE tier limits (30 per minute)', () => {
        expect(THROTTLE_CONFIG.SUBSCRIPTION.FREE.ttl).toBe(60);
        expect(THROTTLE_CONFIG.SUBSCRIPTION.FREE.limit).toBe(30);
      });

      it('should have BASIC tier limits (60 per minute)', () => {
        expect(THROTTLE_CONFIG.SUBSCRIPTION.BASIC.ttl).toBe(60);
        expect(THROTTLE_CONFIG.SUBSCRIPTION.BASIC.limit).toBe(60);
      });

      it('should have PRO tier limits (200 per minute)', () => {
        expect(THROTTLE_CONFIG.SUBSCRIPTION.PRO.ttl).toBe(60);
        expect(THROTTLE_CONFIG.SUBSCRIPTION.PRO.limit).toBe(200);
      });

      it('should have ENTERPRISE tier limits (1000 per minute)', () => {
        expect(THROTTLE_CONFIG.SUBSCRIPTION.ENTERPRISE.ttl).toBe(60);
        expect(THROTTLE_CONFIG.SUBSCRIPTION.ENTERPRISE.limit).toBe(1000);
      });

      it('should have increasing limits for higher tiers', () => {
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
  });

  describe('THROTTLE_NAMES', () => {
    it('should have default name', () => {
      expect(THROTTLE_NAMES.DEFAULT).toBe('default');
    });

    it('should have auth name', () => {
      expect(THROTTLE_NAMES.AUTH).toBe('auth');
    });

    it('should have heavy name', () => {
      expect(THROTTLE_NAMES.HEAVY).toBe('heavy');
    });
  });
});