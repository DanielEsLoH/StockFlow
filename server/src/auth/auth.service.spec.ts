import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma';
import {
  UserRole,
  UserStatus,
  TenantStatus,
  SubscriptionPlan,
} from '@prisma/client';
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
    status: TenantStatus.ACTIVE,
    plan: SubscriptionPlan.FREE,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    maxUsers: 5,
    maxProducts: -1,
    maxInvoices: -1,
    maxWarehouses: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSuspendedTenant = {
    ...mockTenant,
    id: 'tenant-suspended',
    status: TenantStatus.SUSPENDED,
  };

  const mockInactiveTenant = {
    ...mockTenant,
    id: 'tenant-inactive',
    status: TenantStatus.INACTIVE,
  };

  const mockTrialTenant = {
    ...mockTenant,
    id: 'tenant-trial',
    status: TenantStatus.TRIAL,
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

  const mockUserWithTenant = {
    ...mockUser,
    tenant: mockTenant,
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
      verifyAsync: jest.fn(),
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
    it('should return user with tenant when credentials are valid', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        mockUserWithTenant,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUserWithTenant);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { tenant: true },
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
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        mockUserWithTenant,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await service.validateUser('TEST@EXAMPLE.COM', 'password123');

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { tenant: true },
      });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        mockUserWithTenant,
      );
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
          status: mockUser.status,
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

    describe('tenant status validation', () => {
      it('should throw ForbiddenException when tenant is SUSPENDED', async () => {
        const userWithSuspendedTenant = {
          ...mockUser,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException with correct message for suspended tenant', async () => {
        const userWithSuspendedTenant = {
          ...mockUser,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(
          'Your organization has been suspended. Please contact support.',
        );
      });

      it('should throw ForbiddenException when tenant is INACTIVE', async () => {
        const userWithInactiveTenant = {
          ...mockUser,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException with correct message for inactive tenant', async () => {
        const userWithInactiveTenant = {
          ...mockUser,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(
          'Your organization account is inactive. Please contact support.',
        );
      });

      it('should allow login when tenant is TRIAL', async () => {
        const userWithTrialTenant = {
          ...mockUser,
          tenant: mockTrialTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithTrialTenant,
        );

        const result = await service.login('test@example.com', 'password123');

        expect(result.accessToken).toBe(mockTokens.accessToken);
      });
    });

    describe('user status validation', () => {
      it('should throw ForbiddenException when user status is SUSPENDED', async () => {
        const suspendedUser = {
          ...mockUser,
          status: UserStatus.SUSPENDED,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          suspendedUser,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException with correct message for suspended user', async () => {
        const suspendedUser = {
          ...mockUser,
          status: UserStatus.SUSPENDED,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          suspendedUser,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(
          'Your account has been suspended. Please contact your administrator.',
        );
      });

      it('should throw ForbiddenException when user status is INACTIVE', async () => {
        const inactiveUser = {
          ...mockUser,
          status: UserStatus.INACTIVE,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          inactiveUser,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException with correct message for inactive user', async () => {
        const inactiveUser = {
          ...mockUser,
          status: UserStatus.INACTIVE,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          inactiveUser,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(
          'Your account is inactive. Please contact your administrator.',
        );
      });

      it('should allow login when user status is PENDING', async () => {
        const pendingUser = {
          ...mockUser,
          status: UserStatus.PENDING,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          pendingUser,
        );

        const result = await service.login('test@example.com', 'password123');

        expect(result.accessToken).toBe(mockTokens.accessToken);
        expect(result.user.status).toBe(UserStatus.PENDING);
      });
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
          status: UserStatus.PENDING,
          tenantId: newUser.tenantId,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should hash the password with 12 salt rounds', async () => {
      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
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

    describe('tenant status validation', () => {
      it('should throw ForbiddenException when tenant is SUSPENDED', async () => {
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          mockSuspendedTenant,
        );

        await expect(service.register(registerDto)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException with correct message for suspended tenant', async () => {
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          mockSuspendedTenant,
        );

        await expect(service.register(registerDto)).rejects.toThrow(
          'Your organization has been suspended. Please contact support.',
        );
      });

      it('should throw ForbiddenException when tenant is INACTIVE', async () => {
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          mockInactiveTenant,
        );

        await expect(service.register(registerDto)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should allow registration when tenant is TRIAL', async () => {
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          mockTrialTenant,
        );

        const result = await service.register(registerDto);

        expect(result.accessToken).toBe(mockTokens.accessToken);
      });
    });
  });

  describe('refreshTokens', () => {
    const validRefreshToken = 'valid-refresh-token';
    const validPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: UserRole.EMPLOYEE,
      tenantId: 'tenant-123',
      type: 'refresh' as const,
    };

    const userWithStoredToken = {
      ...mockUser,
      refreshToken: validRefreshToken,
      tenant: mockTenant,
    };

    beforeEach(() => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(validPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithStoredToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
    });

    it('should return new tokens when refresh token is valid', async () => {
      const result = await service.refreshTokens(validRefreshToken);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          status: mockUser.status,
          tenantId: mockUser.tenantId,
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should verify the refresh token with correct secret', async () => {
      await service.refreshTokens(validRefreshToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validRefreshToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('should update stored refresh token (token rotation)', async () => {
      await service.refreshTokens(validRefreshToken);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: 'new-refresh-token' },
      });
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        ...validPayload,
        type: 'access',
      });

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with correct message for wrong token type', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        ...validPayload,
        type: 'access',
      });

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when stored token does not match', async () => {
      const userWithDifferentToken = {
        ...userWithStoredToken,
        refreshToken: 'different-token',
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithDifferentToken,
      );

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
        new Error('jwt expired'),
      );

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with correct message for expired token', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
        new Error('jwt expired'),
      );

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    describe('tenant status validation during refresh', () => {
      it('should throw ForbiddenException when tenant is SUSPENDED', async () => {
        const userWithSuspendedTenant = {
          ...userWithStoredToken,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException when tenant is INACTIVE', async () => {
        const userWithInactiveTenant = {
          ...userWithStoredToken,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('user status validation during refresh', () => {
      it('should throw ForbiddenException when user is SUSPENDED', async () => {
        const suspendedUserWithToken = {
          ...userWithStoredToken,
          status: UserStatus.SUSPENDED,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          suspendedUserWithToken,
        );

        await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException when user is INACTIVE', async () => {
        const inactiveUserWithToken = {
          ...userWithStoredToken,
          status: UserStatus.INACTIVE,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          inactiveUserWithToken,
        );

        await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should allow refresh when user is PENDING', async () => {
        const pendingUserWithToken = {
          ...userWithStoredToken,
          status: UserStatus.PENDING,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          pendingUserWithToken,
        );

        const result = await service.refreshTokens(validRefreshToken);

        expect(result.accessToken).toBe('new-access-token');
      });
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });
    });

    it('should return success message on logout', async () => {
      const result = await service.logout('user-123');

      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should invalidate refresh token', async () => {
      await service.logout('user-123');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshToken: null },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.logout('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.logout('nonexistent-user')).rejects.toThrow(
        'User not found',
      );
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
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        mockUserWithTenant,
      );
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

    it('should log warning when tenant is suspended during login', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const userWithSuspendedTenant = {
        ...mockUser,
        tenant: mockSuspendedTenant,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        userWithSuspendedTenant,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      try {
        await service.login('test@example.com', 'password123');
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Access denied - tenant suspended: tenant-suspended',
      );
    });

    it('should log warning when user is suspended during login', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const suspendedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        tenant: mockTenant,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        suspendedUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      try {
        await service.login('test@example.com', 'password123');
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Access denied - user suspended: test@example.com',
      );
    });

    it('should log success message on logout', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await service.logout('user-123');

      expect(logSpy).toHaveBeenCalledWith(
        'User logged out successfully: test@example.com',
      );
    });

    it('should log success message on token refresh', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const validPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.EMPLOYEE,
        tenantId: 'tenant-123',
        type: 'refresh' as const,
      };
      const userWithStoredToken = {
        ...mockUser,
        refreshToken: 'valid-refresh-token',
        tenant: mockTenant,
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(validPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithStoredToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      await service.refreshTokens('valid-refresh-token');

      expect(logSpy).toHaveBeenCalledWith(
        'Tokens refreshed successfully for user: test@example.com',
      );
    });
  });
});
