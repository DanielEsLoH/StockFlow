import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { RegisterDto } from './dto';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // Test data
  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    email: 'tenant@example.com',
    phone: null,
    status: 'ACTIVE' as const,
    plan: 'FREE' as const,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    maxUsers: 5,
    maxProducts: -1,
    maxInvoices: -1,
    maxWarehouses: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    avatar: null,
    role: UserRole.EMPLOYEE,
    status: UserStatus.ACTIVE,
    refreshToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-jwt-secret',
          'jwt.expiration': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiration': '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

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

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
    });

    it('should return null when user is not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(
        'notfound@example.com',
        'password123',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });

    it('should return null when user status is SUSPENDED', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        suspendedUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return null when user status is INACTIVE', async () => {
      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        inactiveUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return user when status is PENDING', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        pendingUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(pendingUser);
    });

    it('should normalize email to lowercase', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await service.validateUser('TEST@EXAMPLE.COM', 'password123');

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
    });

    it('should return auth response with user and tokens', async () => {
      const result = await service.login('test@example.com', 'password123');

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should update user with refresh token and last login time', async () => {
      await service.login('test@example.com', 'password123');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          refreshToken: mockTokens.refreshToken,
          lastLoginAt: expect.any(Date),
        },
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('invalid@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with correct message', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'securePassword123',
      firstName: 'Jane',
      lastName: 'Smith',
      tenantId: 'tenant-123',
    };

    const newUser = {
      ...mockUser,
      id: 'new-user-id',
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      status: UserStatus.PENDING,
    };

    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.user.create as jest.Mock).mockResolvedValue(newUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(newUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
    });

    it('should create a new user and return auth response', async () => {
      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          tenantId: newUser.tenantId,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should hash the password before storing', async () => {
      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        registerDto.password,
        12, // saltRounds
      );
    });

    it('should create user with PENDING status', async () => {
      await service.register(registerDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          password: 'hashedPassword',
          firstName: 'Jane',
          lastName: 'Smith',
          tenantId: 'tenant-123',
          status: UserStatus.PENDING,
          role: UserRole.EMPLOYEE,
        },
      });
    });

    it('should create user with EMPLOYEE role by default', async () => {
      await service.register(registerDto);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.EMPLOYEE,
          }),
        }),
      );
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUppercaseEmail = {
        ...registerDto,
        email: 'NEWUSER@EXAMPLE.COM',
      };

      await service.register(dtoWithUppercaseEmail);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newuser@example.com',
          }),
        }),
      );
    });

    it('should store refresh token after creation', async () => {
      await service.register(registerDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: newUser.id },
        data: { refreshToken: mockTokens.refreshToken },
      });
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        'Tenant not found',
      );
    });

    it('should throw ConflictException when user already exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        'A user with this email already exists',
      );
    });

    it('should check for existing user with tenantId_email compound key', async () => {
      await service.register(registerDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: 'tenant-123',
            email: 'newuser@example.com',
          },
        },
      });
    });
  });

  describe('generateTokens', () => {
    beforeEach(() => {
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
    });

    it('should generate access and refresh tokens', async () => {
      const result = await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.EMPLOYEE,
        'tenant-123',
      );

      expect(result).toEqual({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should sign access token with correct payload and options', async () => {
      await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.ADMIN,
        'tenant-123',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 'user-123',
          email: 'test@example.com',
          role: UserRole.ADMIN,
          tenantId: 'tenant-123',
          type: 'access',
        },
        {
          secret: 'test-jwt-secret',
          expiresIn: '15m',
        },
      );
    });

    it('should sign refresh token with correct payload and options', async () => {
      await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.EMPLOYEE,
        'tenant-123',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 'user-123',
          email: 'test@example.com',
          role: UserRole.EMPLOYEE,
          tenantId: 'tenant-123',
          type: 'refresh',
        },
        {
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        },
      );
    });

    it('should get JWT configuration from ConfigService', async () => {
      await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.EMPLOYEE,
        'tenant-123',
      );

      expect(configService.get).toHaveBeenCalledWith('jwt.secret');
      expect(configService.get).toHaveBeenCalledWith('jwt.expiration');
      expect(configService.get).toHaveBeenCalledWith('jwt.refreshSecret');
      expect(configService.get).toHaveBeenCalledWith('jwt.refreshExpiration');
    });

    it('should generate tokens in parallel', async () => {
      const signAsyncSpy = jwtService.signAsync as jest.Mock;

      await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.EMPLOYEE,
        'tenant-123',
      );

      // Both calls should happen before either resolves
      expect(signAsyncSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('logging', () => {
    it('should log debug message when validating user', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await service.validateUser('test@example.com', 'password');

      expect(debugSpy).toHaveBeenCalledWith(
        'Validating user: test@example.com',
      );
    });

    it('should log success message on login', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      await service.login('test@example.com', 'password123');

      expect(logSpy).toHaveBeenCalledWith(
        'User logged in successfully: test@example.com',
      );
    });

    it('should log success message on registration', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const newUser = { ...mockUser, status: UserStatus.PENDING };

      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
        mockTenant,
      );
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.user.create as jest.Mock).mockResolvedValue(newUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(newUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);

      await service.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        tenantId: 'tenant-123',
      });

      expect(logSpy).toHaveBeenCalledWith(
        'User registered successfully: test@example.com',
      );
    });

    it('should log warning when registration fails due to missing tenant', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.register({
          email: 'new@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          tenantId: 'invalid-tenant',
        });
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Registration failed - tenant not found: invalid-tenant',
      );
    });
  });
});
