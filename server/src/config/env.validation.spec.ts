import 'reflect-metadata';
import {
  validateEnv,
  EnvironmentVariables,
  Environment,
} from './env.validation';

describe('Environment Validation', () => {
  describe('validateEnv()', () => {
    const validEnv: Record<string, unknown> = {
      NODE_ENV: 'development',
      PORT: '3000',
      DATABASE_URL: 'postgresql://localhost:5432/test',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      FRONTEND_URL: 'http://localhost:5173',
    };

    it('should validate a complete valid configuration', () => {
      const result = validateEnv(validEnv);

      expect(result).toBeInstanceOf(EnvironmentVariables);
      expect(result.NODE_ENV).toBe(Environment.Development);
      expect(result.PORT).toBe(3000);
      expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/test');
      expect(result.JWT_SECRET).toBe('test-secret');
      expect(result.JWT_REFRESH_SECRET).toBe('test-refresh-secret');
      expect(result.JWT_EXPIRATION).toBe('15m');
      expect(result.JWT_REFRESH_EXPIRATION).toBe('7d');
      expect(result.FRONTEND_URL).toBe('http://localhost:5173');
    });

    it('should use default values for optional fields', () => {
      const minimalEnv = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };

      const result = validateEnv(minimalEnv);

      expect(result.NODE_ENV).toBe(Environment.Development);
      expect(result.PORT).toBe(3000);
      expect(result.JWT_EXPIRATION).toBe('15m');
      expect(result.JWT_REFRESH_EXPIRATION).toBe('7d');
      expect(result.FRONTEND_URL).toBe('http://localhost:5173');
    });

    it('should convert PORT string to number', () => {
      const result = validateEnv({ ...validEnv, PORT: '8080' });

      expect(result.PORT).toBe(8080);
      expect(typeof result.PORT).toBe('number');
    });

    describe('NODE_ENV validation', () => {
      it('should accept development environment', () => {
        const result = validateEnv({ ...validEnv, NODE_ENV: 'development' });
        expect(result.NODE_ENV).toBe(Environment.Development);
      });

      it('should accept production environment', () => {
        const result = validateEnv({ ...validEnv, NODE_ENV: 'production' });
        expect(result.NODE_ENV).toBe(Environment.Production);
      });

      it('should accept test environment', () => {
        const result = validateEnv({ ...validEnv, NODE_ENV: 'test' });
        expect(result.NODE_ENV).toBe(Environment.Test);
      });

      it('should throw for invalid NODE_ENV', () => {
        expect(() => validateEnv({ ...validEnv, NODE_ENV: 'invalid' })).toThrow(
          'Environment validation failed',
        );
      });
    });

    describe('PORT validation', () => {
      it('should accept valid port numbers', () => {
        const result = validateEnv({ ...validEnv, PORT: '65535' });
        expect(result.PORT).toBe(65535);
      });

      it('should throw for port below 1', () => {
        expect(() => validateEnv({ ...validEnv, PORT: '0' })).toThrow(
          'Environment validation failed',
        );
      });

      it('should throw for port above 65535', () => {
        expect(() => validateEnv({ ...validEnv, PORT: '65536' })).toThrow(
          'Environment validation failed',
        );
      });
    });

    describe('Required field validation', () => {
      it('should throw when DATABASE_URL is missing', () => {
        const envWithoutDb = { ...validEnv };
        delete envWithoutDb.DATABASE_URL;

        expect(() => validateEnv(envWithoutDb)).toThrow(
          'DATABASE_URL is required',
        );
      });

      it('should throw when DATABASE_URL is empty', () => {
        expect(() => validateEnv({ ...validEnv, DATABASE_URL: '' })).toThrow(
          'DATABASE_URL is required',
        );
      });

      it('should throw when JWT_SECRET is missing', () => {
        const envWithoutJwt = { ...validEnv };
        delete envWithoutJwt.JWT_SECRET;

        expect(() => validateEnv(envWithoutJwt)).toThrow(
          'JWT_SECRET is required',
        );
      });

      it('should throw when JWT_SECRET is empty', () => {
        expect(() => validateEnv({ ...validEnv, JWT_SECRET: '' })).toThrow(
          'JWT_SECRET is required',
        );
      });

      it('should throw when JWT_REFRESH_SECRET is missing', () => {
        const envWithoutRefresh = { ...validEnv };
        delete envWithoutRefresh.JWT_REFRESH_SECRET;

        expect(() => validateEnv(envWithoutRefresh)).toThrow(
          'JWT_REFRESH_SECRET is required',
        );
      });

      it('should throw when JWT_REFRESH_SECRET is empty', () => {
        expect(() =>
          validateEnv({ ...validEnv, JWT_REFRESH_SECRET: '' }),
        ).toThrow('JWT_REFRESH_SECRET is required');
      });
    });

    describe('FRONTEND_URL validation', () => {
      it('should accept valid HTTP URLs', () => {
        const result = validateEnv({
          ...validEnv,
          FRONTEND_URL: 'http://example.com',
        });
        expect(result.FRONTEND_URL).toBe('http://example.com');
      });

      it('should accept valid HTTPS URLs', () => {
        const result = validateEnv({
          ...validEnv,
          FRONTEND_URL: 'https://example.com',
        });
        expect(result.FRONTEND_URL).toBe('https://example.com');
      });

      it('should accept localhost URLs', () => {
        const result = validateEnv({
          ...validEnv,
          FRONTEND_URL: 'http://localhost:3000',
        });
        expect(result.FRONTEND_URL).toBe('http://localhost:3000');
      });

      it('should throw for invalid URLs', () => {
        expect(() =>
          validateEnv({ ...validEnv, FRONTEND_URL: 'not-a-url' }),
        ).toThrow('FRONTEND_URL must be a valid URL');
      });
    });

    describe('Multiple validation errors', () => {
      it('should report multiple missing required fields', () => {
        const invalidEnv = {
          NODE_ENV: 'development',
          PORT: '3000',
        };

        expect(() => validateEnv(invalidEnv)).toThrow(
          'Environment validation failed',
        );
      });
    });
  });

  describe('Environment enum', () => {
    it('should have correct values', () => {
      expect(Environment.Development).toBe('development');
      expect(Environment.Production).toBe('production');
      expect(Environment.Test).toBe('test');
    });
  });
});
