import configuration, {
  appConfig,
  databaseConfig,
  jwtConfig,
} from './configuration';
import type {
  Configuration,
  AppConfig,
  DatabaseConfig,
  JwtConfig,
} from './configuration';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('configuration()', () => {
    it('should return default values when environment variables are not set', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.FRONTEND_URL;
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_EXPIRATION;
      delete process.env.JWT_REFRESH_EXPIRATION;

      const config: Configuration = configuration();

      expect(config.app.nodeEnv).toBe('development');
      expect(config.app.port).toBe(3000);
      expect(config.app.frontendUrl).toBe('http://localhost:5173');
      expect(config.database.url).toBe('');
      expect(config.jwt.secret).toBe('');
      expect(config.jwt.refreshSecret).toBe('');
      expect(config.jwt.expiration).toBe('15m');
      expect(config.jwt.refreshExpiration).toBe('7d');
    });

    it('should return environment variable values when set', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '4000';
      process.env.FRONTEND_URL = 'https://stockflow.com';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.JWT_SECRET = 'my-secret';
      process.env.JWT_REFRESH_SECRET = 'my-refresh-secret';
      process.env.JWT_EXPIRATION = '30m';
      process.env.JWT_REFRESH_EXPIRATION = '14d';

      const config: Configuration = configuration();

      expect(config.app.nodeEnv).toBe('production');
      expect(config.app.port).toBe(4000);
      expect(config.app.frontendUrl).toBe('https://stockflow.com');
      expect(config.database.url).toBe(
        'postgresql://user:pass@localhost:5432/db',
      );
      expect(config.jwt.secret).toBe('my-secret');
      expect(config.jwt.refreshSecret).toBe('my-refresh-secret');
      expect(config.jwt.expiration).toBe('30m');
      expect(config.jwt.refreshExpiration).toBe('14d');
    });

    it('should parse PORT as integer', () => {
      process.env.PORT = '8080';

      const config: Configuration = configuration();

      expect(config.app.port).toBe(8080);
      expect(typeof config.app.port).toBe('number');
    });

    it('should handle invalid PORT by returning NaN', () => {
      process.env.PORT = 'invalid';

      const config: Configuration = configuration();

      expect(Number.isNaN(config.app.port)).toBe(true);
    });
  });

  describe('appConfig()', () => {
    it('should return app configuration with correct namespace', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3001';
      process.env.FRONTEND_URL = 'http://test.local';

      const config: AppConfig = appConfig();

      expect(config.nodeEnv).toBe('test');
      expect(config.port).toBe(3001);
      expect(config.frontendUrl).toBe('http://test.local');
    });
  });

  describe('databaseConfig()', () => {
    it('should return database configuration with correct namespace', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const config: DatabaseConfig = databaseConfig();

      expect(config.url).toBe('postgresql://localhost/test');
    });

    it('should return empty string when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;

      const config: DatabaseConfig = databaseConfig();

      expect(config.url).toBe('');
    });
  });

  describe('jwtConfig()', () => {
    it('should return JWT configuration with correct namespace', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
      process.env.JWT_EXPIRATION = '1h';
      process.env.JWT_REFRESH_EXPIRATION = '30d';

      const config: JwtConfig = jwtConfig();

      expect(config.secret).toBe('test-secret');
      expect(config.refreshSecret).toBe('test-refresh-secret');
      expect(config.expiration).toBe('1h');
      expect(config.refreshExpiration).toBe('30d');
    });

    it('should return default expiration values when not set', () => {
      delete process.env.JWT_EXPIRATION;
      delete process.env.JWT_REFRESH_EXPIRATION;

      const config: JwtConfig = jwtConfig();

      expect(config.expiration).toBe('15m');
      expect(config.refreshExpiration).toBe('7d');
    });
  });
});
