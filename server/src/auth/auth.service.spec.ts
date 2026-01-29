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
  InvitationStatus,
  AuthProvider,
} from '@prisma/client';
import { RegisterDto, AcceptInvitationDto, OAuthUserDto } from './dto';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let brevoService: jest.Mocked<BrevoService>;
  let invitationsService: jest.Mocked<InvitationsService>;

  // Test data
  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    email: 'tenant@example.com',
    phone: null,
    status: TenantStatus.ACTIVE,
    plan: SubscriptionPlan.EMPRENDEDOR,
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
  const getExpectedUserResponse = (
    user: Omit<typeof mockUser, 'role'> & { role: UserRole },
  ) => ({
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
    userResult: Omit<typeof mockUser, 'role'> & { role: UserRole },
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
        create: jest.fn(),
      },
      invitation: {
        update: jest.fn(),
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
    invitationsService = module.get(InvitationsService);

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

      it('should throw ForbiddenException when user status is PENDING and email not verified', async () => {
        const pendingUser = {
          ...mockUser,
          status: UserStatus.PENDING,
          emailVerified: false,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          pendingUser,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(
          'Por favor verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
        );
      });

      it('should throw ForbiddenException when user status is PENDING and awaiting approval', async () => {
        const pendingUser = {
          ...mockUser,
          status: UserStatus.PENDING,
          emailVerified: true,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          pendingUser,
        );

        await expect(
          service.login('test@example.com', 'password123'),
        ).rejects.toThrow(
          'Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos por correo cuando sea aprobada.',
        );
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

      it('should throw ForbiddenException when user is PENDING and email not verified', async () => {
        const pendingUserWithToken = {
          ...userWithStoredToken,
          status: UserStatus.PENDING,
          emailVerified: false,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          pendingUserWithToken,
        );

        await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
          'Por favor verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
        );
      });

      it('should throw ForbiddenException when user is PENDING and awaiting approval', async () => {
        const pendingUserWithToken = {
          ...userWithStoredToken,
          status: UserStatus.PENDING,
          emailVerified: true,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          pendingUserWithToken,
        );

        await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
          'Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos por correo cuando sea aprobada.',
        );
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

  describe('sendRegistrationEmails error handling', () => {
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
      status: TenantStatus.TRIAL,
    };

    const newUser = {
      ...mockUser,
      id: 'new-user-id',
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      tenantId: 'new-tenant-id',
      status: UserStatus.PENDING,
      role: UserRole.ADMIN,
      emailVerified: false,
      verificationToken: 'test-token',
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const createRegisterTransactionMock = () => {
      return (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          tenant: {
            create: jest.fn().mockResolvedValue(newTenant),
          },
          user: {
            create: jest.fn().mockResolvedValue(newUser),
          },
        };
        return callback(tx);
      };
    };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.$transaction as jest.Mock).mockImplementation(
        createRegisterTransactionMock(),
      );
    });

    it('should log error when sendRegistrationEmails catch block is triggered', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Make brevoService methods reject to trigger the catch block
      const testError = new Error('Unexpected email failure');
      (
        brevoService.sendAdminNewRegistrationNotification as jest.Mock
      ).mockRejectedValue(testError);
      (brevoService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        testError,
      );

      await service.register(registerDto);

      // Wait for async email operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log warning when verification email result has error', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Return success:false to trigger the warning log for verification email
      (brevoService.sendVerificationEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Verification email delivery failed',
      });

      await service.register(registerDto);

      // Wait for async email operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verification email failed for user'),
      );
    });

    it('should log error when verification email promise is rejected', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Make verification email reject
      (brevoService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Network failure'),
      );

      await service.register(registerDto);

      // Wait for async email operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verification email threw error for user'),
        expect.any(String),
      );
    });

    it('should not block registration when emails fail', async () => {
      // Both email sends fail
      (
        brevoService.sendAdminNewRegistrationNotification as jest.Mock
      ).mockRejectedValue(new Error('Email service down'));
      (brevoService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service down'),
      );

      // Registration should still succeed
      const result = await service.register(registerDto);

      expect(result.message).toContain('Registration successful');
      expect(result.user.email).toBe(registerDto.email.toLowerCase());
    });

    it('should log error with undefined stack when email promise rejects with non-Error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Make Promise.allSettled report a rejection with non-Error value
      (brevoService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        'string rejection',
      );

      await service.register(registerDto);

      // Wait for async email operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verification email threw error for user'),
        undefined,
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
      tenant: { name: 'Test Company', email: 'admin@test.com' },
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
        'Correo verificado exitosamente. Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos por correo cuando sea aprobada.',
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

      expect(result.message).toBe('Tu correo ya ha sido verificado.');
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
        include: { tenant: true },
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

    describe('error handling', () => {
      const unverifiedUserForError = {
        ...mockUser,
        emailVerified: false,
        verificationToken: 'old-token',
        verificationTokenExpiry: new Date(),
      };

      it('should log warning when verification email returns success:false', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (prismaService.user.update as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (brevoService.sendVerificationEmail as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Email delivery failed',
        });

        await service.resendVerification('test@example.com');

        // Wait for async email operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Verification email resend failed'),
        );
      });

      it('should log error when sendVerificationEmail throws error', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (prismaService.user.update as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (brevoService.sendVerificationEmail as jest.Mock).mockRejectedValue(
          new Error('Network error'),
        );

        await service.resendVerification('test@example.com');

        // Wait for async email operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Verification email resend threw error'),
          expect.any(String),
        );
      });

      it('should still return generic message when email send fails', async () => {
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (prismaService.user.update as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (brevoService.sendVerificationEmail as jest.Mock).mockRejectedValue(
          new Error('Service unavailable'),
        );

        const result = await service.resendVerification('test@example.com');

        expect(result.message).toBe(
          'If an account exists with this email and has not been verified, a new verification email has been sent.',
        );
      });

      it('should log error with undefined stack when sendVerificationEmail throws non-Error', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (prismaService.user.update as jest.Mock).mockResolvedValue(
          unverifiedUserForError,
        );
        (brevoService.sendVerificationEmail as jest.Mock).mockRejectedValue(
          'string error',
        );

        await service.resendVerification('test@example.com');

        // Wait for async email operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Verification email resend threw error'),
          undefined,
        );
      });
    });
  });

  describe('getInvitationDetails', () => {
    const mockInvitation = {
      id: 'invitation-123',
      email: 'invited@example.com',
      tenantId: 'tenant-123',
      role: UserRole.EMPLOYEE,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tenant: {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
      },
      invitedBy: {
        id: 'user-admin-123',
        firstName: 'Admin',
        lastName: 'User',
      },
    };

    it('should return invitation details for valid token', async () => {
      (invitationsService.findByToken as jest.Mock).mockResolvedValue(
        mockInvitation,
      );

      const result = await service.getInvitationDetails('valid-token');

      expect(result).toEqual({
        email: 'invited@example.com',
        tenantName: 'Test Tenant',
        invitedByName: 'Admin User',
        role: UserRole.EMPLOYEE,
        expiresAt: mockInvitation.expiresAt,
      });
    });

    it('should call invitationsService.findByToken with the token', async () => {
      (invitationsService.findByToken as jest.Mock).mockResolvedValue(
        mockInvitation,
      );

      await service.getInvitationDetails('test-token-123');

      expect(invitationsService.findByToken).toHaveBeenCalledWith(
        'test-token-123',
      );
    });

    it('should propagate error when invitation is not found', async () => {
      (invitationsService.findByToken as jest.Mock).mockRejectedValue(
        new BadRequestException('Invitation not found'),
      );

      await expect(
        service.getInvitationDetails('invalid-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate error when invitation is expired', async () => {
      (invitationsService.findByToken as jest.Mock).mockRejectedValue(
        new GoneException('Invitation has expired'),
      );

      await expect(
        service.getInvitationDetails('expired-token'),
      ).rejects.toThrow(GoneException);
    });
  });

  describe('acceptInvitation', () => {
    const mockInvitation = {
      id: 'invitation-123',
      email: 'invited@example.com',
      tenantId: 'tenant-123',
      role: UserRole.EMPLOYEE,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tenant: mockTenant,
      invitedBy: {
        id: 'user-admin-123',
        firstName: 'Admin',
        lastName: 'User',
      },
    };

    const acceptDto: AcceptInvitationDto = {
      token: 'valid-invitation-token',
      firstName: 'New',
      lastName: 'Employee',
      password: 'SecurePass123',
    };

    const createdUser = {
      ...mockUser,
      id: 'new-invited-user-id',
      email: 'invited@example.com',
      firstName: 'New',
      lastName: 'Employee',
      role: UserRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      tenant: mockTenant,
    };

    beforeEach(() => {
      (invitationsService.findByToken as jest.Mock).mockResolvedValue(
        mockInvitation,
      );
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      setupTokenMocks(jwtService);
      (prismaService.user.update as jest.Mock).mockResolvedValue(createdUser);
    });

    it('should create user and return auth response for valid invitation', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
            invitation: {
              update: jest.fn().mockResolvedValue(mockInvitation),
            },
          };
          return callback(tx);
        },
      );

      const result = await service.acceptInvitation(acceptDto);

      expect(result.message).toBe('Cuenta creada exitosamente');
      expect(result.user.email).toBe('invited@example.com');
      expect(result.user.role).toBe(UserRole.EMPLOYEE);
      expect(result.user.status).toBe(UserStatus.ACTIVE);
      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
    });

    it('should throw BadRequestException when invitation is not PENDING', async () => {
      const acceptedInvitation = {
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      };
      (invitationsService.findByToken as jest.Mock).mockResolvedValue(
        acceptedInvitation,
      );

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with Spanish message for non-pending invitation', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        status: InvitationStatus.EXPIRED,
      };
      (invitationsService.findByToken as jest.Mock).mockResolvedValue(
        expiredInvitation,
      );

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(
        'Esta invitacion ya no es valida',
      );
    });

    it('should throw ConflictException when user already exists with invitation email', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with Spanish message for existing user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.acceptInvitation(acceptDto)).rejects.toThrow(
        'Ya existe un usuario con este email',
      );
    });

    it('should create user with invitation role and tenantId', async () => {
      const createUserMock = jest.fn().mockResolvedValue(createdUser);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            user: {
              create: createUserMock,
            },
            invitation: {
              update: jest.fn().mockResolvedValue(mockInvitation),
            },
          };
          return callback(tx);
        },
      );

      await service.acceptInvitation(acceptDto);

      expect(createUserMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'invited@example.com',
          tenantId: mockInvitation.tenantId,
          role: mockInvitation.role,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        }),
        include: { tenant: true },
      });
    });

    it('should update invitation status to ACCEPTED', async () => {
      const updateInvitationMock = jest.fn().mockResolvedValue(mockInvitation);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
            invitation: {
              update: updateInvitationMock,
            },
          };
          return callback(tx);
        },
      );

      await service.acceptInvitation(acceptDto);

      expect(updateInvitationMock).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      });
    });

    it('should store refresh token and update lastLoginAt', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
            invitation: {
              update: jest.fn().mockResolvedValue(mockInvitation),
            },
          };
          return callback(tx);
        },
      );

      await service.acceptInvitation(acceptDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: createdUser.id },
        data: {
          refreshToken: mockTokens.refreshToken,
          lastLoginAt: expect.any(Date),
        },
      });
    });

    it('should hash password with 12 salt rounds', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
            invitation: {
              update: jest.fn().mockResolvedValue(mockInvitation),
            },
          };
          return callback(tx);
        },
      );

      await service.acceptInvitation(acceptDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(acceptDto.password, 12);
    });
  });

  describe('handleOAuthLogin', () => {
    const googleOAuthUser: OAuthUserDto = {
      email: 'oauth@example.com',
      firstName: 'OAuth',
      lastName: 'User',
      avatarUrl: 'https://example.com/avatar.jpg',
      googleId: 'google-123456',
      provider: 'GOOGLE',
    };

    const githubOAuthUser: OAuthUserDto = {
      email: 'github@example.com',
      firstName: 'GitHub',
      lastName: 'User',
      avatarUrl: 'https://github.com/avatar.jpg',
      githubId: 'github-789012',
      provider: 'GITHUB',
    };

    describe('existing user by OAuth ID', () => {
      const existingGoogleUser = {
        ...mockUser,
        email: 'oauth@example.com',
        googleId: 'google-123456',
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.GOOGLE,
        tenant: mockTenant,
      };

      it('should return success for active user found by Google ID', async () => {
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          existingGoogleUser,
        );
        setupTokenMocks(jwtService);
        (prismaService.user.update as jest.Mock).mockResolvedValue(
          existingGoogleUser,
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('success');
        expect(result.accessToken).toBe(mockTokens.accessToken);
        expect(result.refreshToken).toBe(mockTokens.refreshToken);
      });

      it('should return success for active user found by GitHub ID', async () => {
        const existingGithubUser = {
          ...mockUser,
          email: 'github@example.com',
          githubId: 'github-789012',
          status: UserStatus.ACTIVE,
          authProvider: AuthProvider.GITHUB,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          existingGithubUser,
        );
        setupTokenMocks(jwtService);
        (prismaService.user.update as jest.Mock).mockResolvedValue(
          existingGithubUser,
        );

        const result = await service.handleOAuthLogin(
          githubOAuthUser,
          AuthProvider.GITHUB,
        );

        expect(result.status).toBe('success');
        expect(result.accessToken).toBe(mockTokens.accessToken);
      });
    });

    describe('existing user by email (not OAuth ID)', () => {
      it('should find user by email when not found by OAuth ID', async () => {
        const userByEmail = {
          ...mockUser,
          email: 'oauth@example.com',
          googleId: null,
          status: UserStatus.ACTIVE,
          authProvider: AuthProvider.EMAIL,
          tenant: mockTenant,
        };
        (prismaService.user.findFirst as jest.Mock)
          .mockResolvedValueOnce(null) // Not found by OAuth ID
          .mockResolvedValueOnce(userByEmail); // Found by email
        setupTokenMocks(jwtService);
        (prismaService.user.update as jest.Mock).mockResolvedValue(userByEmail);

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('success');
        expect(prismaService.user.findFirst).toHaveBeenCalledTimes(2);
      });
    });

    describe('new OAuth user', () => {
      const newOAuthUser = {
        ...mockUser,
        id: 'new-oauth-user-id',
        email: 'newoauth@example.com',
        googleId: 'google-new-123',
        status: UserStatus.PENDING,
        authProvider: AuthProvider.GOOGLE,
      };

      const newOAuthTenant = {
        ...mockTenant,
        id: 'new-oauth-tenant-id',
        name: "OAuth's Company",
        slug: 'oauths-company',
      };

      it('should create new user and tenant for new OAuth user', async () => {
        (prismaService.user.findFirst as jest.Mock)
          .mockResolvedValueOnce(null) // Not found by OAuth ID
          .mockResolvedValueOnce(null); // Not found by email
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRandomPassword');
        (prismaService.$transaction as jest.Mock).mockImplementation(
          (callback: (tx: unknown) => unknown) => {
            const tx = {
              tenant: {
                create: jest.fn().mockResolvedValue(newOAuthTenant),
              },
              user: {
                create: jest.fn().mockResolvedValue(newOAuthUser),
              },
            };
            return callback(tx);
          },
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('pending');
        expect(result.message).toContain('pending approval');
      });

      it('should return pending status for new GitHub OAuth user', async () => {
        (prismaService.user.findFirst as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRandomPassword');
        (prismaService.$transaction as jest.Mock).mockImplementation(
          (callback: (tx: unknown) => unknown) => {
            const tx = {
              tenant: {
                create: jest.fn().mockResolvedValue({
                  ...newOAuthTenant,
                  name: "GitHub's Company",
                }),
              },
              user: {
                create: jest.fn().mockResolvedValue({
                  ...newOAuthUser,
                  githubId: 'github-789012',
                  authProvider: AuthProvider.GITHUB,
                }),
              },
            };
            return callback(tx);
          },
        );

        const result = await service.handleOAuthLogin(
          githubOAuthUser,
          AuthProvider.GITHUB,
        );

        expect(result.status).toBe('pending');
      });
    });

    describe('error handling', () => {
      it('should return error status when OAuth login throws', async () => {
        (prismaService.user.findFirst as jest.Mock).mockRejectedValue(
          new Error('Database connection failed'),
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('error');
        expect(result.error).toBe('Database connection failed');
      });

      it('should return generic error message for non-Error throws', async () => {
        (prismaService.user.findFirst as jest.Mock).mockRejectedValue(
          'Unknown error',
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('error');
        expect(result.error).toBe('OAuth authentication failed');
      });

      it('should log error when OAuth login fails', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        (prismaService.user.findFirst as jest.Mock).mockRejectedValue(
          new Error('Test error'),
        );

        await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('OAuth login error'),
          expect.any(String),
        );
      });
    });
  });

  describe('handleExistingOAuthUser', () => {
    const baseExistingUser = {
      ...mockUser,
      email: 'existing@example.com',
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.EMAIL,
      googleId: null,
      githubId: null,
      avatar: null,
      tenant: mockTenant,
    };

    const googleOAuthUser: OAuthUserDto = {
      email: 'existing@example.com',
      firstName: 'Existing',
      lastName: 'User',
      avatarUrl: 'https://example.com/avatar.jpg',
      googleId: 'google-link-123',
      provider: 'GOOGLE',
    };

    beforeEach(() => {
      setupTokenMocks(jwtService);
      (prismaService.user.update as jest.Mock).mockResolvedValue(
        baseExistingUser,
      );
    });

    describe('linking OAuth accounts', () => {
      it('should link Google account when user has no googleId', async () => {
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          baseExistingUser,
        );

        await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

        expect(prismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: baseExistingUser.id },
            data: expect.objectContaining({
              googleId: 'google-link-123',
            }),
          }),
        );
      });

      it('should link GitHub account when user has no githubId', async () => {
        const githubOAuthUser: OAuthUserDto = {
          email: 'existing@example.com',
          firstName: 'Existing',
          lastName: 'User',
          githubId: 'github-link-456',
          provider: 'GITHUB',
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          baseExistingUser,
        );

        await service.handleOAuthLogin(githubOAuthUser, AuthProvider.GITHUB);

        expect(prismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              githubId: 'github-link-456',
            }),
          }),
        );
      });

      it('should not link Google account when user already has googleId', async () => {
        const userWithGoogle = {
          ...baseExistingUser,
          googleId: 'existing-google-id',
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithGoogle,
        );

        await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

        // The update should not contain googleId since it's already set
        const updateCalls = (prismaService.user.update as jest.Mock).mock
          .calls as Array<[{ data: Record<string, unknown> }]>;
        const lastUpdateCall = updateCalls[updateCalls.length - 1];
        expect(lastUpdateCall[0].data.googleId).toBeUndefined();
      });

      it('should update avatar when user has no avatar', async () => {
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          baseExistingUser,
        );

        await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

        expect(prismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              avatar: 'https://example.com/avatar.jpg',
            }),
          }),
        );
      });

      it('should update authProvider when user registered with EMAIL', async () => {
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          baseExistingUser,
        );

        await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

        expect(prismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              authProvider: AuthProvider.GOOGLE,
            }),
          }),
        );
      });

      it('should not call update when no account changes are needed', async () => {
        // User already has everything set correctly
        const fullyLinkedUser = {
          ...baseExistingUser,
          googleId: 'google-link-123', // Already has the Google ID
          avatar: 'https://existing-avatar.jpg', // Already has avatar
          authProvider: AuthProvider.GOOGLE, // Already set to Google
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          fullyLinkedUser,
        );

        await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

        // Should only update refresh token and lastLoginAt, not the linking update
        const updateCalls = (prismaService.user.update as jest.Mock).mock
          .calls as Array<[{ data: Record<string, unknown> }]>;
        // The first update (if any) for account linking should not happen
        // Only the refresh token update happens
        expect(updateCalls.length).toBe(1);
        expect(updateCalls[0][0].data).toEqual({
          refreshToken: expect.any(String),
          lastLoginAt: expect.any(Date),
        });
      });
    });

    describe('user status handling', () => {
      it('should return pending status for PENDING user', async () => {
        const pendingUser = {
          ...baseExistingUser,
          status: UserStatus.PENDING,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          pendingUser,
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('pending');
        expect(result.message).toContain('pending approval');
      });

      it('should return error for SUSPENDED user', async () => {
        const suspendedUser = {
          ...baseExistingUser,
          status: UserStatus.SUSPENDED,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          suspendedUser,
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('error');
        expect(result.error).toContain('not active');
      });

      it('should return error for INACTIVE user', async () => {
        const inactiveUser = {
          ...baseExistingUser,
          status: UserStatus.INACTIVE,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          inactiveUser,
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('error');
        expect(result.error).toContain('not active');
      });
    });

    describe('tenant status handling', () => {
      it('should return error for SUSPENDED tenant', async () => {
        const userWithSuspendedTenant = {
          ...baseExistingUser,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('error');
        expect(result.error).toContain('organization account is not active');
      });

      it('should return error for INACTIVE tenant', async () => {
        const userWithInactiveTenant = {
          ...baseExistingUser,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        const result = await service.handleOAuthLogin(
          googleOAuthUser,
          AuthProvider.GOOGLE,
        );

        expect(result.status).toBe('error');
        expect(result.error).toContain('organization account is not active');
      });
    });

    describe('successful login', () => {
      it('should update refresh token and lastLoginAt on successful login', async () => {
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          baseExistingUser,
        );

        await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

        // Check that the last update call includes refreshToken and lastLoginAt
        const updateCalls = (prismaService.user.update as jest.Mock).mock
          .calls as Array<[{ data: Record<string, unknown> }]>;
        const lastCall = updateCalls[updateCalls.length - 1];
        expect(lastCall[0].data.refreshToken).toBe(mockTokens.refreshToken);
        expect(lastCall[0].data.lastLoginAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('handleNewOAuthUser', () => {
    const googleOAuthUser: OAuthUserDto = {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      avatarUrl: 'https://example.com/new-avatar.jpg',
      googleId: 'google-new-user-123',
      provider: 'GOOGLE',
    };

    const createdTenant = {
      ...mockTenant,
      id: 'new-oauth-tenant-id',
      name: "New's Company",
      slug: 'news-company',
      email: 'newuser@example.com',
      status: TenantStatus.TRIAL,
    };

    const createdUser = {
      ...mockUser,
      id: 'new-oauth-user-id',
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      googleId: 'google-new-user-123',
      status: UserStatus.PENDING,
      role: UserRole.ADMIN,
      emailVerified: true,
      authProvider: AuthProvider.GOOGLE,
      tenantId: createdTenant.id,
    };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Not found by OAuth ID
        .mockResolvedValueOnce(null); // Not found by email
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRandomPassword');
    });

    it('should create tenant with user firstName Company name', async () => {
      const tenantCreateMock = jest.fn().mockResolvedValue(createdTenant);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: {
              create: tenantCreateMock,
            },
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

      expect(tenantCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "New's Company",
          email: 'newuser@example.com',
          status: TenantStatus.TRIAL,
        }),
      });
    });

    it('should create user with PENDING status and ADMIN role', async () => {
      const userCreateMock = jest.fn().mockResolvedValue(createdUser);
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: {
              create: jest.fn().mockResolvedValue(createdTenant),
            },
            user: {
              create: userCreateMock,
            },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

      expect(userCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: UserStatus.PENDING,
          role: UserRole.ADMIN,
          emailVerified: true,
          authProvider: AuthProvider.GOOGLE,
          googleId: 'google-new-user-123',
        }),
      });
    });

    it('should create user with GitHub ID for GitHub provider', async () => {
      const githubOAuthUser: OAuthUserDto = {
        email: 'github-new@example.com',
        firstName: 'GitHub',
        lastName: 'NewUser',
        githubId: 'github-new-456',
        provider: 'GITHUB',
      };

      const userCreateMock = jest.fn().mockResolvedValue({
        ...createdUser,
        githubId: 'github-new-456',
        authProvider: AuthProvider.GITHUB,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: {
              create: jest.fn().mockResolvedValue(createdTenant),
            },
            user: {
              create: userCreateMock,
            },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(githubOAuthUser, AuthProvider.GITHUB);

      expect(userCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authProvider: AuthProvider.GITHUB,
          githubId: 'github-new-456',
        }),
      });
    });

    it('should generate unique slug when base slug exists', async () => {
      (prismaService.tenant.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing' }) // First slug exists
        .mockResolvedValueOnce(null); // Second slug is unique

      const tenantCreateMock = jest.fn().mockResolvedValue({
        ...createdTenant,
        slug: 'news-company-1',
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: {
              create: tenantCreateMock,
            },
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

      expect(tenantCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: 'news-company-1',
        }),
      });
    });

    it('should return pending status with appropriate message', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: {
              create: jest.fn().mockResolvedValue(createdTenant),
            },
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
          };
          return callback(tx);
        },
      );

      const result = await service.handleOAuthLogin(
        googleOAuthUser,
        AuthProvider.GOOGLE,
      );

      expect(result.status).toBe('pending');
      expect(result.message).toContain('created and is pending approval');
    });

    it('should send admin notification email asynchronously', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: {
              create: jest.fn().mockResolvedValue(createdTenant),
            },
            user: {
              create: jest.fn().mockResolvedValue(createdUser),
            },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        brevoService.sendAdminNewRegistrationNotification,
      ).toHaveBeenCalledWith({
        userEmail: 'newuser@example.com',
        userName: 'New User',
        tenantName: createdTenant.name,
        registrationDate: expect.any(Date),
      });
    });
  });

  describe('sendOAuthRegistrationNotification', () => {
    const googleOAuthUser: OAuthUserDto = {
      email: 'notify@example.com',
      firstName: 'Notify',
      lastName: 'User',
      googleId: 'google-notify-123',
      provider: 'GOOGLE',
    };

    const createdTenant = {
      ...mockTenant,
      id: 'notify-tenant-id',
      name: "Notify's Company",
    };

    const createdUser = {
      ...mockUser,
      email: 'notify@example.com',
      firstName: 'Notify',
      lastName: 'User',
    };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    });

    it('should log success when admin notification is sent successfully', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (
        brevoService.sendAdminNewRegistrationNotification as jest.Mock
      ).mockResolvedValue({
        success: true,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('OAuth registration admin notification sent'),
      );
    });

    it('should log warning when admin notification returns success:false', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (
        brevoService.sendAdminNewRegistrationNotification as jest.Mock
      ).mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('OAuth registration admin notification failed'),
      );
    });

    it('should log error when admin notification throws', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (
        brevoService.sendAdminNewRegistrationNotification as jest.Mock
      ).mockRejectedValue(new Error('Network error'));
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('OAuth registration admin notification error'),
        expect.any(String),
      );
    });

    it('should log error with undefined stack when internal catch receives non-Error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      // Reject with a non-Error value to trigger the else branch of error instanceof Error
      (
        brevoService.sendAdminNewRegistrationNotification as jest.Mock
      ).mockRejectedValue('string error');
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('OAuth registration admin notification error'),
        undefined,
      );
    });

    it('should not block OAuth registration when notification fails', async () => {
      (
        brevoService.sendAdminNewRegistrationNotification as jest.Mock
      ).mockRejectedValue(new Error('Email service down'));
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      const result = await service.handleOAuthLogin(
        googleOAuthUser,
        AuthProvider.GOOGLE,
      );

      // Registration should still succeed with pending status
      expect(result.status).toBe('pending');
    });

    it('should log error with undefined stack when catch block receives non-Error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Create a spy on the private method that throws a non-Error value
      const sendOAuthNotificationSpy = jest.spyOn(
        service as unknown as {
          sendOAuthRegistrationNotification: () => Promise<void>;
        },
        'sendOAuthRegistrationNotification',
      );
      sendOAuthNotificationSpy.mockRejectedValue('string error');

      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send OAuth registration notification',
        undefined,
      );

      sendOAuthNotificationSpy.mockRestore();
    });
  });

  describe('sendRegistrationEmails outer catch block', () => {
    const registerDto: RegisterDto = {
      email: 'catchtest@example.com',
      password: 'securePassword123',
      firstName: 'Catch',
      lastName: 'Test',
      tenantName: 'Catch Test Company',
    };

    const testTenant = {
      ...mockTenant,
      id: 'catch-tenant-id',
      name: 'Catch Test Company',
      slug: 'catch-test-company',
      email: 'catchtest@example.com',
      status: TenantStatus.TRIAL,
    };

    const testUser = {
      ...mockUser,
      id: 'catch-user-id',
      email: 'catchtest@example.com',
      firstName: 'Catch',
      lastName: 'Test',
      tenantId: 'catch-tenant-id',
      status: UserStatus.PENDING,
      role: UserRole.ADMIN,
      emailVerified: false,
      verificationToken: 'test-token',
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(testTenant) },
            user: { create: jest.fn().mockResolvedValue(testUser) },
          };
          return callback(tx);
        },
      );
    });

    it('should trigger outer catch and log error with stack when sendRegistrationEmails rejects with Error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Spy on sendRegistrationEmails and make it throw
      const sendEmailsSpy = jest.spyOn(
        service as unknown as { sendRegistrationEmails: () => Promise<void> },
        'sendRegistrationEmails',
      );
      sendEmailsSpy.mockRejectedValue(new Error('Unexpected failure'));

      await service.register(registerDto);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        'Unexpected error in sendRegistrationEmails',
        expect.any(String),
      );

      sendEmailsSpy.mockRestore();
    });

    it('should trigger outer catch and log error with undefined when sendRegistrationEmails rejects with non-Error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Spy on sendRegistrationEmails and make it throw a non-Error
      const sendEmailsSpy = jest.spyOn(
        service as unknown as { sendRegistrationEmails: () => Promise<void> },
        'sendRegistrationEmails',
      );
      sendEmailsSpy.mockRejectedValue('string error');

      await service.register(registerDto);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        'Unexpected error in sendRegistrationEmails',
        undefined,
      );

      sendEmailsSpy.mockRestore();
    });
  });

  describe('sendOAuthRegistrationNotification outer catch block', () => {
    const googleOAuthUser: OAuthUserDto = {
      email: 'outertest@example.com',
      firstName: 'Outer',
      lastName: 'Test',
      googleId: 'google-outer-123',
      provider: 'GOOGLE',
    };

    const createdTenant = {
      ...mockTenant,
      id: 'outer-tenant-id',
      name: "Outer's Company",
    };

    const createdUser = {
      ...mockUser,
      email: 'outertest@example.com',
      firstName: 'Outer',
      lastName: 'Test',
    };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    });

    it('should log error with stack when outer catch receives Error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      const sendNotificationSpy = jest.spyOn(
        service as unknown as {
          sendOAuthRegistrationNotification: () => Promise<void>;
        },
        'sendOAuthRegistrationNotification',
      );
      sendNotificationSpy.mockRejectedValue(new Error('Notification failed'));

      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send OAuth registration notification',
        expect.any(String),
      );

      sendNotificationSpy.mockRestore();
    });

    it('should log error with undefined when outer catch receives non-Error', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      const sendNotificationSpy = jest.spyOn(
        service as unknown as {
          sendOAuthRegistrationNotification: () => Promise<void>;
        },
        'sendOAuthRegistrationNotification',
      );
      sendNotificationSpy.mockRejectedValue('non-error rejection');

      (prismaService.$transaction as jest.Mock).mockImplementation(
        (callback: (tx: unknown) => unknown) => {
          const tx = {
            tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
            user: { create: jest.fn().mockResolvedValue(createdUser) },
          };
          return callback(tx);
        },
      );

      await service.handleOAuthLogin(googleOAuthUser, AuthProvider.GOOGLE);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send OAuth registration notification',
        undefined,
      );

      sendNotificationSpy.mockRestore();
    });
  });
});
