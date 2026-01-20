import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GitHubStrategy } from './github.strategy';
import type { Profile } from 'passport-github2';

describe('GitHubStrategy', () => {
  let strategy: GitHubStrategy;

  const mockConfig: Record<string, string> = {
    'github.clientId': 'test-client-id',
    'github.clientSecret': 'test-client-secret',
    'github.callbackUrl': 'http://localhost:3000/auth/github/callback',
  };

  const createMockProfile = (overrides: Partial<Profile> = {}): Profile =>
    ({
      id: 'github-user-123',
      displayName: 'John Doe',
      username: 'testuser',
      profileUrl: 'https://github.com/testuser',
      emails: [{ value: 'john@example.com' }],
      photos: [{ value: 'https://avatars.githubusercontent.com/u/123' }],
      provider: 'github',
      ...overrides,
    }) as Profile;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string): string | undefined => mockConfig[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GitHubStrategy>(GitHubStrategy);

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
        get: jest.fn().mockImplementation((key: string): string | undefined => {
          if (key === 'github.clientId') return undefined;
          return mockConfig[key];
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            GitHubStrategy,
            {
              provide: ConfigService,
              useValue: mockConfigServiceWithoutClientId,
            },
          ],
        }).compile(),
      ).rejects.toThrow('GitHub OAuth credentials not configured');
    });

    it('should throw error when clientSecret is not configured', async () => {
      const mockConfigServiceWithoutSecret = {
        get: jest.fn().mockImplementation((key: string): string | undefined => {
          if (key === 'github.clientSecret') return undefined;
          return mockConfig[key];
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            GitHubStrategy,
            {
              provide: ConfigService,
              useValue: mockConfigServiceWithoutSecret,
            },
          ],
        }).compile(),
      ).rejects.toThrow('GitHub OAuth credentials not configured');
    });

    it('should use default callback URL when not configured', async () => {
      const mockConfigServiceWithoutCallback = {
        get: jest.fn().mockImplementation((key: string): string | undefined => {
          if (key === 'github.callbackUrl') return undefined;
          return mockConfig[key];
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          GitHubStrategy,
          {
            provide: ConfigService,
            useValue: mockConfigServiceWithoutCallback,
          },
        ],
      }).compile();

      const strategyWithDefault = module.get<GitHubStrategy>(GitHubStrategy);
      expect(strategyWithDefault).toBeDefined();
    });

    it('should log initialization', async () => {
      // Create a fresh module to capture initialization logs
      const freshLoggerSpy = jest.spyOn(Logger.prototype, 'log');
      freshLoggerSpy.mockClear();

      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string): string | undefined => mockConfig[key]),
      };

      await Test.createTestingModule({
        providers: [
          GitHubStrategy,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      expect(freshLoggerSpy).toHaveBeenCalledWith(
        'GitHub OAuth strategy initialized',
      );
    });
  });

  describe('validate', () => {
    it('should extract user data from valid profile', () => {
      const profile = createMockProfile();
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://avatars.githubusercontent.com/u/123',
        githubId: 'github-user-123',
        provider: 'GITHUB',
      });
    });

    it('should normalize email to lowercase', () => {
      const profile = createMockProfile({
        emails: [{ value: 'JOHN@EXAMPLE.COM' }],
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'john@example.com',
        }),
      );
    });

    it('should prefer primary email over others', () => {
      const profile = createMockProfile({
        emails: [
          { value: 'secondary@example.com' },
          { value: 'primary@example.com', primary: true } as any,
          { value: 'verified@example.com', verified: true } as any,
        ],
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'primary@example.com',
        }),
      );
    });

    it('should prefer verified email when no primary', () => {
      const profile = createMockProfile({
        emails: [
          { value: 'unverified@example.com' },
          { value: 'verified@example.com', verified: true } as any,
        ],
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'verified@example.com',
        }),
      );
    });

    it('should use first email when no primary or verified', () => {
      const profile = createMockProfile({
        emails: [
          { value: 'first@example.com' },
          { value: 'second@example.com' },
        ],
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'first@example.com',
        }),
      );
    });

    it('should call done with error when no email in profile', () => {
      const profile = createMockProfile({
        emails: undefined,
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No email found in GitHub profile'),
        }),
        undefined,
      );
    });

    it('should call done with error when emails array is empty', () => {
      const profile = createMockProfile({
        emails: [],
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No email found in GitHub profile'),
        }),
        undefined,
      );
    });

    it('should log warning when no email found', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      const profile = createMockProfile({
        emails: undefined,
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No email found in profile'),
      );
    });

    it('should handle profile without photos', () => {
      const profile = createMockProfile({
        photos: undefined,
      });
      const done = jest.fn();

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
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          avatarUrl: undefined,
        }),
      );
    });

    it('should log debug message on validation', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      const profile = createMockProfile();
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub OAuth validation for user'),
      );
    });

    it('should log debug message on successful profile extraction', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      const profile = createMockProfile();
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('User profile extracted'),
      );
    });

    it('should handle errors during validation', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const profile = createMockProfile();
      const done = jest.fn();

      // Make emails throw an error when accessed
      Object.defineProperty(profile, 'emails', {
        get: () => {
          throw new Error('Test error');
        },
      });

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub OAuth validation error'),
        expect.any(String),
      );
    });

    it('should handle non-Error exceptions', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      const profile = createMockProfile();
      const done = jest.fn();

      // Make emails throw a non-Error
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
  });

  describe('parseDisplayName', () => {
    it('should parse full name into first and last name', () => {
      const profile = createMockProfile({
        displayName: 'John Doe',
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
    });

    it('should handle single name', () => {
      const profile = createMockProfile({
        displayName: 'John',
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'John',
          lastName: '',
        }),
      );
    });

    it('should handle multiple names', () => {
      const profile = createMockProfile({
        displayName: 'John Paul Doe',
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Paul Doe',
        }),
      );
    });

    it('should use username as firstName when no displayName', () => {
      const profile = createMockProfile({
        displayName: undefined,
        username: 'testuser',
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'testuser',
          lastName: 'User',
        }),
      );
    });

    it('should use GitHub as firstName and User as lastName when no displayName or username', () => {
      const profile = createMockProfile({
        displayName: undefined,
        username: undefined,
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'GitHub',
          lastName: 'User',
        }),
      );
    });

    it('should handle empty displayName', () => {
      const profile = createMockProfile({
        displayName: '',
        username: 'testuser',
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'testuser',
          lastName: 'User',
        }),
      );
    });

    it('should trim whitespace from names', () => {
      const profile = createMockProfile({
        displayName: '  John   Doe  ',
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
    });

    it('should handle displayName with multiple spaces between words', () => {
      const profile = createMockProfile({
        displayName: 'John    Doe',
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
    });
  });

  describe('error message content', () => {
    it('should include suggestion to make email public in error message', () => {
      const profile = createMockProfile({
        emails: undefined,
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('make your email public'),
        }),
        undefined,
      );
    });

    it('should include suggestion for alternative login method in error message', () => {
      const profile = createMockProfile({
        emails: undefined,
      });
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('different login method'),
        }),
        undefined,
      );
    });
  });
});