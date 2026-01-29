import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ArcjetService } from './arcjet.service';
import { SubscriptionPlan } from '@prisma/client';
import { Request } from 'express';

// Mock the @arcjet/node module
jest.mock('@arcjet/node', () => ({
  __esModule: true,
  default: jest.fn(),
  detectBot: jest.fn(),
  fixedWindow: jest.fn(),
  shield: jest.fn(),
  slidingWindow: jest.fn(),
  tokenBucket: jest.fn(),
}));

import arcjet, {
  detectBot,
  fixedWindow,
  shield,
  slidingWindow,
  tokenBucket,
} from '@arcjet/node';

describe('ArcjetService', () => {
  let service: ArcjetService;
  let configService: jest.Mocked<ConfigService>;
  let mockArcjetClient: {
    protect: jest.Mock;
  };

  const createMockRequest = (overrides: Partial<Request> = {}): Request => {
    return {
      ip: '192.168.1.1',
      path: '/api/test',
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '192.168.1.1' },
      ...overrides,
    } as unknown as Request;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Arcjet client
    mockArcjetClient = {
      protect: jest.fn(),
    };

    (arcjet as jest.Mock).mockReturnValue(mockArcjetClient);
    (shield as jest.Mock).mockReturnValue({});
    (fixedWindow as jest.Mock).mockReturnValue({});
    (slidingWindow as jest.Mock).mockReturnValue({});
    (tokenBucket as jest.Mock).mockReturnValue({});
    (detectBot as jest.Mock).mockReturnValue({});

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArcjetService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<ArcjetService>(ArcjetService);

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
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should not initialize when arcjet is disabled', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return false;
        return undefined;
      });

      service.onModuleInit();

      expect(service.isProtectionEnabled()).toBe(false);
    });

    it('should not initialize when API key is missing', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return undefined;
        return undefined;
      });

      service.onModuleInit();

      expect(service.isProtectionEnabled()).toBe(false);
    });

    it('should initialize Arcjet client when API key is present', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isProtectionEnabled()).toBe(true);
      expect(arcjet).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-api-key',
        }),
      );
    });

    it('should use LIVE mode for shield in production', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'production';
        return undefined;
      });

      service.onModuleInit();

      expect(shield).toHaveBeenCalledWith({ mode: 'LIVE' });
    });

    it('should use DRY_RUN mode for shield in development', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();

      expect(shield).toHaveBeenCalledWith({ mode: 'DRY_RUN' });
    });

    it('should log warning when API key is missing', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return undefined;
        return undefined;
      });

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Arcjet API key not configured'),
      );
    });

    it('should handle initialization errors gracefully', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (arcjet as jest.Mock).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isProtectionEnabled()).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to initialize Arcjet:',
        expect.any(Error),
      );
    });
  });

  describe('isProtectionEnabled', () => {
    it('should return false when not initialized', () => {
      expect(service.isProtectionEnabled()).toBe(false);
    });

    it('should return true when properly initialized', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();

      expect(service.isProtectionEnabled()).toBe(true);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
      });

      const ip = service.getClientIp(req);

      expect(ip).toBe('10.0.0.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const req = createMockRequest({
        headers: { 'x-real-ip': '10.0.0.3' },
      });

      const ip = service.getClientIp(req);

      expect(ip).toBe('10.0.0.3');
    });

    it('should fallback to req.ip', () => {
      const req = createMockRequest({ ip: '10.0.0.4', headers: {} });

      const ip = service.getClientIp(req);

      expect(ip).toBe('10.0.0.4');
    });

    it('should fallback to socket.remoteAddress', () => {
      const req = createMockRequest({
        ip: undefined,
        headers: {},
        socket: { remoteAddress: '10.0.0.5' } as unknown as Request['socket'],
      });

      const ip = service.getClientIp(req);

      expect(ip).toBe('10.0.0.5');
    });

    it('should return 0.0.0.0 as default', () => {
      const req = createMockRequest({
        ip: undefined,
        headers: {},
        socket: undefined,
      });

      const ip = service.getClientIp(req);

      expect(ip).toBe('0.0.0.0');
    });
  });

  describe('parseWindow', () => {
    it('should parse seconds correctly', () => {
      expect(service.parseWindow('30s')).toBe(30);
      expect(service.parseWindow('1s')).toBe(1);
      expect(service.parseWindow('120s')).toBe(120);
    });

    it('should parse minutes correctly', () => {
      expect(service.parseWindow('1m')).toBe(60);
      expect(service.parseWindow('15m')).toBe(900);
      expect(service.parseWindow('60m')).toBe(3600);
    });

    it('should parse hours correctly', () => {
      expect(service.parseWindow('1h')).toBe(3600);
      expect(service.parseWindow('24h')).toBe(86400);
    });

    it('should parse days correctly', () => {
      expect(service.parseWindow('1d')).toBe(86400);
      expect(service.parseWindow('7d')).toBe(604800);
    });

    it('should return default value for invalid format', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      expect(service.parseWindow('invalid')).toBe(60);
      expect(service.parseWindow('100')).toBe(60);
      expect(service.parseWindow('')).toBe(60);

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();
    });

    it('should return DISABLED when protection is not enabled', async () => {
      // Reset to disabled state
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return false;
        return undefined;
      });

      const newService = new ArcjetService(configService);
      const req = createMockRequest();

      const result = await newService.checkRateLimit(req, {
        requests: 100,
        window: '1m',
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('DISABLED');
    });

    it('should allow request when under rate limit', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      const result = await service.checkRateLimit(req, {
        requests: 100,
        window: '1m',
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ALLOWED');
    });

    it('should deny request when rate limit exceeded', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => false,
        isDenied: () => true,
        reason: {
          type: 'RATE_LIMIT',
          isRateLimit: () => true,
          isBot: () => false,
          isShield: () => false,
          isError: () => false,
          remaining: 0,
          reset: 60,
        },
      });

      const req = createMockRequest();
      const result = await service.checkRateLimit(req, {
        requests: 1,
        window: '1m',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('RATE_LIMITED');
    });

    it('should handle errors gracefully', async () => {
      mockArcjetClient.protect.mockRejectedValue(new Error('Network error'));

      const req = createMockRequest();
      const result = await service.checkRateLimit(req, {
        requests: 100,
        window: '1m',
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ERROR');
    });

    it('should create rate limit client with byUser characteristics', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkRateLimit(
        req,
        { requests: 100, window: '1h', byUser: true },
        'user-123',
      );

      expect(arcjet).toHaveBeenCalledWith(
        expect.objectContaining({
          characteristics: expect.arrayContaining(['ip.src', 'userId']),
        }),
      );
    });

    it('should create rate limit client with byTenant characteristics', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkRateLimit(
        req,
        { requests: 100, window: '1h', byTenant: true },
        undefined,
        'tenant-123',
      );

      expect(arcjet).toHaveBeenCalledWith(
        expect.objectContaining({
          characteristics: expect.arrayContaining(['ip.src', 'tenantId']),
        }),
      );
    });
  });

  describe('checkSubscriptionRateLimit', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();
    });

    it('should return DISABLED when protection is not enabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return false;
        return undefined;
      });

      const newService = new ArcjetService(configService);
      const req = createMockRequest();

      const result = await newService.checkSubscriptionRateLimit(
        req,
        SubscriptionPlan.EMPRENDEDOR,
        'user-123',
        'tenant-123',
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('DISABLED');
    });

    it('should always allow ENTERPRISE tier', async () => {
      const req = createMockRequest();
      const result = await service.checkSubscriptionRateLimit(
        req,
        SubscriptionPlan.PLUS,
        'user-123',
        'tenant-123',
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ALLOWED');
      expect(result.details).toBe('ENTERPRISE_TIER');
    });

    it('should check rate limit for FREE tier', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      const result = await service.checkSubscriptionRateLimit(
        req,
        SubscriptionPlan.EMPRENDEDOR,
        'user-123',
        'tenant-123',
      );

      expect(result.allowed).toBe(true);
      expect(slidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 500,
          interval: '1h',
        }),
      );
    });

    it('should check rate limit for BASIC tier', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkSubscriptionRateLimit(
        req,
        SubscriptionPlan.PYME,
        'user-123',
        'tenant-123',
      );

      expect(slidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 2000,
        }),
      );
    });

    it('should check rate limit for PRO tier', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkSubscriptionRateLimit(
        req,
        SubscriptionPlan.PRO,
        'user-123',
        'tenant-123',
      );

      expect(slidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 10000,
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockArcjetClient.protect.mockRejectedValue(new Error('Network error'));

      const req = createMockRequest();
      const result = await service.checkSubscriptionRateLimit(
        req,
        SubscriptionPlan.EMPRENDEDOR,
        'user-123',
        'tenant-123',
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ERROR');
    });
  });

  describe('checkHeavyOperationLimit', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();
    });

    it('should apply upload limit', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkHeavyOperationLimit(req, 'upload', 'user-123');

      expect(slidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 20,
          interval: '1h',
        }),
      );
    });

    it('should apply report limit', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkHeavyOperationLimit(req, 'report', 'user-123');

      expect(slidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 50,
        }),
      );
    });

    it('should apply bulk operation limit', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkHeavyOperationLimit(req, 'bulk', 'user-123');

      expect(slidingWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 10,
        }),
      );
    });

    it('should return DISABLED when not enabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return false;
        return undefined;
      });

      const newService = new ArcjetService(configService);
      const req = createMockRequest();

      const result = await newService.checkHeavyOperationLimit(
        req,
        'upload',
        'user-123',
      );

      expect(result.reason).toBe('DISABLED');
    });
  });

  describe('checkBot', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();
    });

    it('should return DISABLED when protection is not enabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return false;
        return undefined;
      });

      const newService = new ArcjetService(configService);
      const req = createMockRequest();

      const result = await newService.checkBot(req, { mode: 'LIVE' });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('DISABLED');
    });

    it('should allow legitimate traffic', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      const result = await service.checkBot(req, { mode: 'LIVE' });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ALLOWED');
    });

    it('should block detected bots in LIVE mode', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => false,
        isDenied: () => true,
        reason: {
          type: 'BOT',
          isRateLimit: () => false,
          isBot: () => true,
          isShield: () => false,
          isError: () => false,
          denied: ['AUTOMATED'],
          allowed: [],
          verified: false,
          spoofed: false,
        },
      });

      const req = createMockRequest({
        headers: { 'user-agent': 'bot-agent' },
      });
      const result = await service.checkBot(req, { mode: 'LIVE' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BOT_DETECTED');
    });

    it('should allow detected bots in DRY_RUN mode', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => false,
        isDenied: () => true,
        reason: {
          type: 'BOT',
          isRateLimit: () => false,
          isBot: () => true,
          isShield: () => false,
          isError: () => false,
          denied: ['AUTOMATED'],
          allowed: [],
          verified: false,
          spoofed: false,
        },
      });

      const req = createMockRequest({
        headers: { 'user-agent': 'bot-agent' },
      });
      const result = await service.checkBot(req, { mode: 'DRY_RUN' });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('BOT_DETECTED');
    });

    it('should configure allowed bots', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkBot(req, {
        mode: 'LIVE',
        allowedBots: ['GOOGLE_CRAWLER', 'BING_CRAWLER'] as const,
      });

      expect(detectBot).toHaveBeenCalledWith(
        expect.objectContaining({
          allow: ['GOOGLE_CRAWLER', 'BING_CRAWLER'],
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockArcjetClient.protect.mockRejectedValue(new Error('Network error'));

      const req = createMockRequest();
      const result = await service.checkBot(req, { mode: 'LIVE' });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ERROR');
    });

    it('should log security event on bot detection', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => false,
        isDenied: () => true,
        reason: {
          type: 'BOT',
          isRateLimit: () => false,
          isBot: () => true,
          isShield: () => false,
          isError: () => false,
          denied: ['MALICIOUS'],
          allowed: [],
          verified: false,
          spoofed: false,
        },
      });

      const req = createMockRequest({
        headers: { 'user-agent': 'malicious-bot' },
      });
      await service.checkBot(req, { mode: 'LIVE' });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bot detected'),
      );
    });
  });

  describe('checkTokenBucket', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return true;
        if (key === 'arcjet.key') return 'test-api-key';
        if (key === 'arcjet.environment') return 'development';
        return undefined;
      });

      service.onModuleInit();
    });

    it('should return DISABLED when protection is not enabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'arcjet.enabled') return false;
        return undefined;
      });

      const newService = new ArcjetService(configService);
      const req = createMockRequest();

      const result = await newService.checkTokenBucket(
        req,
        10,
        '1m',
        100,
        'user-123',
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('DISABLED');
    });

    it('should configure token bucket correctly', async () => {
      mockArcjetClient.protect.mockResolvedValue({
        isAllowed: () => true,
        isDenied: () => false,
      });

      const req = createMockRequest();
      await service.checkTokenBucket(req, 10, '1m', 100, 'user-123');

      expect(tokenBucket).toHaveBeenCalledWith(
        expect.objectContaining({
          refillRate: 10,
          interval: '1m',
          capacity: 100,
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      mockArcjetClient.protect.mockRejectedValue(new Error('Network error'));

      const req = createMockRequest();
      const result = await service.checkTokenBucket(
        req,
        10,
        '1m',
        100,
        'user-123',
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ERROR');
    });
  });

  describe('logSecurityEvent', () => {
    it('should log rate limit events as warnings', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      service.logSecurityEvent({
        type: 'RATE_LIMIT',
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'GET',
        timestamp: new Date(),
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit violation'),
      );
    });

    it('should log bot detection events as warnings', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      service.logSecurityEvent({
        type: 'BOT_DETECTION',
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'POST',
        timestamp: new Date(),
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bot detected'),
      );
    });

    it('should log blocked request events as warnings', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      service.logSecurityEvent({
        type: 'BLOCKED_REQUEST',
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'DELETE',
        timestamp: new Date(),
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request blocked'),
      );
    });

    it('should include user info when provided', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      service.logSecurityEvent({
        type: 'RATE_LIMIT',
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'GET',
        userId: 'user-123',
        tenantId: 'tenant-456',
        timestamp: new Date(),
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('user-123'));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('tenant-456'),
      );
    });

    it('should include additional details when provided', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      service.logSecurityEvent({
        type: 'BOT_DETECTION',
        ip: '192.168.1.1',
        path: '/api/test',
        method: 'GET',
        timestamp: new Date(),
        details: { userAgent: 'suspicious-bot', score: 0.9 },
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('suspicious-bot'),
      );
    });
  });
});
