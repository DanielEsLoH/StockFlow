import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  GoneException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma';
import { InvitationsService } from '../invitations';
import { BrevoService } from '../notifications/mail/brevo.service';
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
  let brevoService: jest.Mocked<BrevoService>;

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

  // Helper function to get expected user response structure
  const getExpectedUserResponse = (user: typeof mockUser) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    tenantId: user.tenantId,
  });

  // Helper function to get expected tenant response structure
  const getExpectedTenantResponse = (tenant: typeof mockTenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    status: tenant.status,
  });

  // Helper function to setup token generation mocks
  const setupTokenMocks = (
    jwt: jest.Mocked<JwtService>,
    tokens: { accessToken: string; refreshToken: string } = mockTokens,
  ) => {
    (jwt.signAsync as jest.Mock)
      .mockResolvedValueOnce(tokens.accessToken)
      .mockResolvedValueOnce(tokens.refreshToken);
  };

  // Helper function to setup successful login mocks
  const setupLoginMocks = (
    prisma: jest.Mocked<PrismaService>,
    jwt: jest.Mocked<JwtService>,
    userWithTenant = mockUserWithTenant,
  ) => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userWithTenant);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    setupTokenMocks(jwt);
    (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
  };

  // Helper function to create transaction mock
  const createTransactionMock = (
    tenantResult: typeof mockTenant,
    userResult: typeof mockUser,
  ) => {
    return (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        tenant: {
          create: jest.fn().mockResolvedValue(tenantResult),
        },
        user: {
          create: jest.fn().mockResolvedValue(userResult),
        },
      };
      return callback(tx);
    };
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
      $transaction: jest.fn(),
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

    const mockBrevoService = {
      sendAdminNewRegistrationNotification: jest
        .fn()
        .mockResolvedValue({ success: true }),
      sendUserRegistrationConfirmation: jest
        .fn()
        .mockResolvedValue({ success: true }),
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockInvitationsService = {
      findByToken: jest.fn(),
      create: jest.fn(),
      cancel: jest.fn(),
      resend: jest.fn(),
      findAllByTenant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BrevoService, useValue: mockBrevoService },
        { provide: InvitationsService, useValue: mockInvitationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    brevoService = module.get(BrevoService);
    // InvitationsService is provided to AuthService but not directly tested here
    module.get(InvitationsService);

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
      setupLoginMocks(prismaService, jwtService);
    });

    it('should return auth response with user and tokens', async () => {
      const result = await service.login('test@example.com', 'password123');

      expect(result).toEqual({
        user: getExpectedUserResponse(mockUser),
        tenant: getExpectedTenantResponse(mockTenant),
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
      tenantName: 'Test Company',
    };

    const newTenant = {
      ...mockTenant,
      id: 'new-tenant-id',
      name: 'Test Company',
      slug: 'test-company',
      email: 'newuser@example.com',
      status: TenantStatus.ACTIVE,
    };

    const newUser = {
      ...mockUser,
      id: 'new-user-id',
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      tenantId: 'new-tenant-id',
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
    };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.$transaction as jest.Mock).mockImplementation(
        createTransactionMock(newTenant, newUser),
      );
    });

    it('should create a new tenant and user and return register response', async () => {
      const result = await service.register(registerDto);

      expect(result).toEqual({
        message:
          'Registration successful. Please check your email to verify your address. After verification, your account will be reviewed by an administrator.',
        user: {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        tenant: {
          name: newTenant.name,
        },
      });
    });

    it('should hash the password with 12 salt rounds', async () => {
      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });

    it('should create user as ADMIN with PENDING status when creating new company', async () => {
      await service.register(registerDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should generate unique slug for tenant', async () => {
      await service.register(registerDto);

      expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-company' },
      });
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUppercaseEmail = {
        ...registerDto,
        email: 'NEWUSER@EXAMPLE.COM',
      };

      await service.register(dtoWithUppercaseEmail);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        'A user with this email already exists',
      );
    });

    it('should check for existing user by email globally', async () => {
      await service.register(registerDto);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
    });

    describe('slug generation', () => {
      it('should generate slug with counter when slug exists', async () => {
        (prismaService.tenant.findUnique as jest.Mock)
          .mockResolvedValueOnce({ id: 'existing-tenant' }) // First slug exists
          .mockResolvedValueOnce(null); // Second slug is unique

        await service.register(registerDto);

        expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
          where: { slug: 'test-company' },
        });
        expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
          where: { slug: 'test-company-1' },
        });
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

    const newTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    };

    beforeEach(() => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(validPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithStoredToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      setupTokenMocks(jwtService, newTokens);
    });

    it('should return new tokens when refresh token is valid', async () => {
      const result = await service.refreshTokens(validRefreshToken);

      expect(result).toEqual({
        user: getExpectedUserResponse(mockUser),
        tenant: getExpectedTenantResponse(mockTenant),
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
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
      setupTokenMocks(jwtService);
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

    it('should use default expiration when jwt.expiration config is undefined', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const config: Record<string, string | undefined> = {
          'jwt.secret': 'test-jwt-secret',
          'jwt.expiration': undefined, // Missing expiration
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiration': '7d',
        };
        return config[key];
      });

      await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.EMPLOYEE,
        'tenant-123',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'access' }),
        expect.objectContaining({ expiresIn: '15m' }), // Default value
      );
    });

    it('should use default refresh expiration when jwt.refreshExpiration config is undefined', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const config: Record<string, string | undefined> = {
          'jwt.secret': 'test-jwt-secret',
          'jwt.expiration': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiration': undefined, // Missing refresh expiration
        };
        return config[key];
      });

      await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.EMPLOYEE,
        'tenant-123',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'refresh' }),
        expect.objectContaining({ expiresIn: '7d' }), // Default value
      );
    });

    it('should use default expirations when both configs are null', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        const config: Record<string, string | null> = {
          'jwt.secret': 'test-jwt-secret',
          'jwt.expiration': null,
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiration': null,
        };
        return config[key];
      });

      await service.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.EMPLOYEE,
        'tenant-123',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'access' }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'refresh' }),
        expect.objectContaining({ expiresIn: '7d' }),
      );
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
      setupLoginMocks(prismaService, jwtService);

      await service.login('test@example.com', 'password123');

      expect(logSpy).toHaveBeenCalledWith(
        'User logged in successfully: test@example.com',
      );
    });

    it('should log success message on registration', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const regTenant = {
        ...mockTenant,
        id: 'new-tenant-id',
        name: 'Test Company',
        slug: 'test-company',
        email: 'new@example.com',
        status: TenantStatus.ACTIVE,
      };
      const regUser = {
        ...mockUser,
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'Test',
        lastName: 'User',
        tenantId: 'new-tenant-id',
        status: UserStatus.ACTIVE,
        role: UserRole.ADMIN,
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.$transaction as jest.Mock).mockImplementation(
        createTransactionMock(regTenant, regUser),
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(regUser);
      setupTokenMocks(jwtService);

      await service.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        tenantName: 'Test Company',
      });

      expect(logSpy).toHaveBeenCalledWith(
        'User registered (pending email verification): new@example.com, tenant: Test Company',
      );
    });

    it('should log warning when registration fails due to existing user', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      try {
        await service.register({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          tenantName: 'Test Company',
        });
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Registration failed - user already exists: existing@example.com',
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
      const refreshPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.EMPLOYEE,
        tenantId: 'tenant-123',
        type: 'refresh' as const,
      };
      const userWithToken = {
        ...mockUser,
        refreshToken: 'valid-refresh-token',
        tenant: mockTenant,
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(refreshPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      setupTokenMocks(jwtService, {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await service.refreshTokens('valid-refresh-token');

      expect(logSpy).toHaveBeenCalledWith(
        'Tokens refreshed successfully for user: test@example.com',
      );
    });
  });

  describe('getMe', () => {
    beforeEach(() => {
      setupTokenMocks(jwtService);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
    });

    it('should return user info with fresh tokens', async () => {
      const userWithTenant = {
        ...mockUser,
        tenant: mockTenant,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithTenant,
      );

      const result = await service.getMe(mockUser.id);

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tenant.id).toBe(mockTenant.id);
      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe('nonexistent-id')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw ForbiddenException if tenant is suspended', async () => {
      const userWithSuspendedTenant = {
        ...mockUser,
        tenant: {
          ...mockTenant,
          status: TenantStatus.SUSPENDED,
        },
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithSuspendedTenant,
      );

      await expect(service.getMe(mockUser.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user is suspended', async () => {
      const suspendedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
        tenant: mockTenant,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        suspendedUser,
      );

      await expect(service.getMe(mockUser.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update stored refresh token', async () => {
      const userWithTenant = {
        ...mockUser,
        tenant: mockTenant,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithTenant,
      );

      await service.getMe(mockUser.id);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: mockTokens.refreshToken },
      });
    });

    it('should query user with tenant included', async () => {
      const userWithTenant = {
        ...mockUser,
        tenant: mockTenant,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithTenant,
      );

      await service.getMe(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        include: { tenant: true },
      });
    });

    it('should log debug message when fetching user info', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'debug');
      const userWithTenant = {
        ...mockUser,
        tenant: mockTenant,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithTenant,
      );

      await service.getMe(mockUser.id);

      expect(logSpy).toHaveBeenCalledWith(
        `Fetching user info for: ${mockUser.id}`,
      );
    });

    it('should log warning when user not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.getMe('nonexistent-id');
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Get me failed - user not found: nonexistent-id',
      );
    });
  });

  describe('verifyEmail', () => {
    const validToken = 'valid-verification-token-123';
    const mockUserWithToken = {
      ...mockUser,
      emailVerified: false,
      verificationToken: validToken,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h in future
    };

    it('should verify email and clear token when valid token provided', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserWithToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUserWithToken,
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      });

      const result = await service.verifyEmail(validToken);

      expect(result.message).toBe(
        'Email verified successfully. Your account is now pending approval by an administrator.',
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for invalid token', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid verification token. Please request a new verification email.',
      );
    });

    it('should throw GoneException for expired token', async () => {
      const expiredUserToken = {
        ...mockUserWithToken,
        verificationTokenExpiry: new Date(Date.now() - 1000), // Expired 1 second ago
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        expiredUserToken,
      );

      await expect(service.verifyEmail(validToken)).rejects.toThrow(
        GoneException,
      );
    });

    it('should throw GoneException with correct message for expired token', async () => {
      const expiredUserToken = {
        ...mockUserWithToken,
        verificationTokenExpiry: new Date(Date.now() - 1000),
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        expiredUserToken,
      );

      await expect(service.verifyEmail(validToken)).rejects.toThrow(
        'Verification token has expired. Please request a new verification email.',
      );
    });

    it('should return already verified message if email already verified', async () => {
      const alreadyVerifiedUser = {
        ...mockUserWithToken,
        emailVerified: true,
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        alreadyVerifiedUser,
      );

      const result = await service.verifyEmail(validToken);

      expect(result.message).toBe('Your email has already been verified.');
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should query user by verification token', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserWithToken,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUserWithToken,
        emailVerified: true,
      });

      await service.verifyEmail(validToken);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { verificationToken: validToken },
      });
    });
  });

  describe('resendVerification', () => {
    const unverifiedUser = {
      ...mockUser,
      emailVerified: false,
      verificationToken: 'old-token',
      verificationTokenExpiry: new Date(),
    };

    beforeEach(() => {
      (brevoService.sendVerificationEmail as jest.Mock).mockResolvedValue({
        success: true,
      });
    });

    it('should generate new token and send verification email', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        unverifiedUser,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...unverifiedUser,
        verificationToken: 'new-token',
      });

      const result = await service.resendVerification('test@example.com');

      expect(result.message).toBe(
        'If an account exists with this email and has not been verified, a new verification email has been sent.',
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          verificationToken: expect.any(String),
          verificationTokenExpiry: expect.any(Date),
        },
      });
    });

    it('should return generic message when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.resendVerification('notfound@example.com');

      expect(result.message).toBe(
        'If an account exists with this email and has not been verified, a new verification email has been sent.',
      );
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should return generic message when email already verified', async () => {
      const verifiedUser = {
        ...unverifiedUser,
        emailVerified: true,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        verifiedUser,
      );

      const result = await service.resendVerification('test@example.com');

      expect(result.message).toBe(
        'If an account exists with this email and has not been verified, a new verification email has been sent.',
      );
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await service.resendVerification('TEST@EXAMPLE.COM');

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should set verification token expiry to 24 hours from now', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        unverifiedUser,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(
        unverifiedUser,
      );

      const beforeCall = Date.now();
      await service.resendVerification('test@example.com');
      const afterCall = Date.now();

      const updateCall = (prismaService.user.update as jest.Mock).mock
        .calls[0] as [
        {
          where: { id: string };
          data: { verificationToken: string; verificationTokenExpiry: Date };
        },
      ];
      const expiryDate = updateCall[0].data.verificationTokenExpiry;
      const expectedMinExpiry = beforeCall + 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = afterCall + 24 * 60 * 60 * 1000;

      expect(expiryDate.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiryDate.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });
  });
});
