import {
  MEMORY_THRESHOLDS,
  DISK_THRESHOLDS,
  HEALTH_TIMEOUTS,
  HEALTH_KEYS,
} from './health.constants';

describe('Health Constants', () => {
  describe('MEMORY_THRESHOLDS', () => {
    it('should have heap threshold of 512MB', () => {
      expect(MEMORY_THRESHOLDS.HEAP_USED).toBe(512 * 1024 * 1024);
    });

    it('should have RSS threshold of 1GB', () => {
      expect(MEMORY_THRESHOLDS.RSS).toBe(1024 * 1024 * 1024);
    });
  });

  describe('DISK_THRESHOLDS', () => {
    it('should have minimum free percentage of 10%', () => {
      expect(DISK_THRESHOLDS.MIN_FREE_PERCENT).toBe(0.1);
    });

    it('should have minimum free bytes of 1GB', () => {
      expect(DISK_THRESHOLDS.MIN_FREE_BYTES).toBe(1024 * 1024 * 1024);
    });
  });

  describe('HEALTH_TIMEOUTS', () => {
    it('should have database timeout of 5 seconds', () => {
      expect(HEALTH_TIMEOUTS.DATABASE).toBe(5000);
    });

    it('should have Redis timeout of 3 seconds', () => {
      expect(HEALTH_TIMEOUTS.REDIS).toBe(3000);
    });
  });

  describe('HEALTH_KEYS', () => {
    it('should have database key', () => {
      expect(HEALTH_KEYS.DATABASE).toBe('database');
    });

    it('should have redis key', () => {
      expect(HEALTH_KEYS.REDIS).toBe('redis');
    });

    it('should have memory key', () => {
      expect(HEALTH_KEYS.MEMORY).toBe('memory');
    });

    it('should have disk key', () => {
      expect(HEALTH_KEYS.DISK).toBe('disk');
    });
  });
});