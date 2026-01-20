import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';
import type { Profile, VerifyCallback } from 'passport-google-oauth20';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  const mockConfig: Record<string, string> = {
    'google.clientId': 'test-client-id',
    'google.clientSecret': 'test-client-secret',
    'google.callbackUrl': 'http://localhost:3000/auth/google/callback',
  };

  const createMockProfile = (overrides: Partial<Profile> = {}): Profile =>
    ({
      id: 'google-user-123',
      displayName: 'John Doe',
      name: {
        familyName: 'Doe',
        givenName: 'John',
      },
      emails: [{ value: 'john@example.com', verified: true }],
      photos: [{ value: 'https://example.com/avatar.jpg' }],
      profileUrl: 'https://plus.google.com/google-user-123',
      provider: 'google',
      _raw: '',
      _json: {
        iss: 'https://accounts.google.com',
        aud: 'test-client-id',
        sub: 'google-user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://example.com/avatar.jpg',
        email: 'john@example.com',
        email_verified: true,
      },
      ...overrides,
    }) as Profile;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => mockConfig[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined when credentials are configured', () => {
      expect(strategy).toBeDefined();
    });

    it('should throw error when clientId is not configured', async () => {
      const mockConfigServiceWithoutClientId = {
        get: jest
          .fn()
          .mockImplementation((key: string) =>
            key === 'google.clientId' ? undefined : mockConfig[key],
          ),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            GoogleStrategy,
            {
              provide: ConfigService,
              useValue: mockConfigServiceWithoutClientId,
            },
          ],
        }).compile(),
      ).rejects.toThrow('Google OAuth credentials not configured');
    });

    it('should throw error when clientSecret is not configured', async () => {
      const mockConfigServiceWithoutSecret = {
        get: jest
          .fn()
          .mockImplementation((key: string) =>
            key === 'google.clientSecret' ? undefined : mockConfig[key],
          ),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            GoogleStrategy,
            {
              provide: ConfigService,
              useValue: mockConfigServiceWithoutSecret,
            },
          ],
        }).compile(),
      ).rejects.toThrow('Google OAuth credentials not configured');
    });

    it('should use default callback URL when not configured', async () => {
      const mockConfigServiceWithoutCallback = {
        get: jest
          .fn()
          .mockImplementation((key: string) =>
            key === 'google.callbackUrl' ? undefined : mockConfig[key],
          ),
      };

      const module = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          {
            provide: ConfigService,
            useValue: mockConfigServiceWithoutCallback,
          },
        ],
      }).compile();

      const strategyWithDefault = module.get<GoogleStrategy>(GoogleStrategy);
      expect(strategyWithDefault).toBeDefined();
    });

    it('should log initialization', async () => {
      // Create a fresh module to capture initialization logs
      const freshLoggerSpy = jest.spyOn(Logger.prototype, 'log');
      freshLoggerSpy.mockClear();

      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => mockConfig[key]),
      };

      await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      expect(freshLoggerSpy).toHaveBeenCalledWith(
        'Google OAuth strategy initialized',
      );
    });
  });

  describe('validate', () => {
    it('should extract user data from valid profile', () => {
      const profile = createMockProfile();
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        googleId: 'google-user-123',
        provider: 'GOOGLE',
      });
    });

    it('should normalize email to lowercase', () => {
      const profile = createMockProfile({
        emails: [{ value: 'JOHN@EXAMPLE.COM', verified: true }],
      });
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'john@example.com',
        }),
      );
    });

    it('should use displayName as firstName when givenName is not available', () => {
      const profile = createMockProfile();
      // Override name to have undefined givenName
      profile.name = {
        familyName: 'Doe',
        givenName: undefined as unknown as string,
      };
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'John Doe',
        }),
      );
    });

    it('should use empty string as firstName when no name is available', () => {
      const profile = createMockProfile({ displayName: '' });
      // Override name to have undefined givenName
      profile.name = {
        familyName: 'Doe',
        givenName: undefined as unknown as string,
      };
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: '',
        }),
      );
    });

    it('should use empty string as lastName when not available', () => {
      const profile = createMockProfile();
      // Override name to have undefined familyName
      profile.name = {
        givenName: 'John',
        familyName: undefined as unknown as string,
      };
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          lastName: '',
        }),
      );
    });

    it('should handle profile without photos', () => {
      const profile = createMockProfile({
        photos: undefined,
      });
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          avatarUrl: undefined,
        }),
      );
    });

    it('should handle profile with empty photos array', () => {
      const profile = createMockProfile({
        photos: [],
      });
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          avatarUrl: undefined,
        }),
      );
    });

    it('should call done with error when no email in profile', () => {
      const profile = createMockProfile({
        emails: undefined,
      });
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No email found in Google profile',
        }),
        undefined,
      );
    });

    it('should call done with error when emails array is empty', () => {
      const profile = createMockProfile({
        emails: [],
      });
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No email found in Google profile',
        }),
        undefined,
      );
    });

    it('should log warning when no email found', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      const profile = createMockProfile({
        emails: undefined,
      });
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No email found in profile'),
      );
    });

    it('should log debug message on validation', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      const profile = createMockProfile();
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Google OAuth validation for user'),
      );
    });

    it('should log debug message on successful profile extraction', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      const profile = createMockProfile();
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('User profile extracted'),
      );
    });

    it('should handle errors during validation', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const profile = createMockProfile();
      const done: VerifyCallback = jest.fn();

      // Make emails throw an error when accessed
      Object.defineProperty(profile, 'emails', {
        get: () => {
          throw new Error('Test error');
        },
      });

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Google OAuth validation error'),
        expect.any(String),
      );
    });

    it('should handle non-Error exceptions', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const profile = createMockProfile();
      const done: VerifyCallback = jest.fn();

      // Make emails throw a non-Error (simulating edge case)
      Object.defineProperty(profile, 'emails', {
        get: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'string error';
        },
      });

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error'),
        undefined,
      );
    });

    it('should use first email when available', () => {
      const profile = createMockProfile({
        emails: [
          { value: 'first@example.com', verified: true },
          { value: 'second@example.com', verified: true },
        ],
      });
      const done: VerifyCallback = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'first@example.com',
        }),
      );
    });
  });
});
