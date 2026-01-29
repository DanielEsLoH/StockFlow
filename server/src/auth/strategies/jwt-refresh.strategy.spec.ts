import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserRole,
  UserStatus,
  TenantStatus,
  SubscriptionPlan,
} from '@prisma/client';
import { JwtPayload } from '../types';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const validRefreshToken = 'valid-refresh-token';

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

  const mockTrialTenant = {
    ...mockTenant,
    id: 'tenant-trial',
    status: TenantStatus.TRIAL,
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
    refreshToken: validRefreshToken,
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

  const validRefreshPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: UserRole.EMPLOYEE,
    tenantId: 'tenant-123',
    type: 'refresh',
  };

  const createMockRequest = (refreshToken?: string): Partial<Request> => ({
    body: refreshToken ? { refreshToken } : {},
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'jwt.secret': 'test-jwt-secret',
          'jwt.refreshSecret': 'test-refresh-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
    prismaService = module.get(PrismaService);

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
      expect(strategy).toBeDefined();
    });

    it('should throw error if JWT refresh secret is not configured', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const mockPrismaService = {
        user: { findUnique: jest.fn() },
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtRefreshStrategy,
            { provide: PrismaService, useValue: mockPrismaService },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile(),
      ).rejects.toThrow('JWT refresh secret is not configured');
    });
  });

  describe('validate', () => {
    it('should return RequestUser when refresh token is valid', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserWithTenant,
      );

      const mockRequest = createMockRequest(validRefreshToken);

      const result = await strategy.validate(
        mockRequest as Request,
        validRefreshPayload,
      );

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
      });
    });

    it('should query user by ID from payload', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserWithTenant,
      );

      const mockRequest = createMockRequest(validRefreshToken);

      await strategy.validate(mockRequest as Request, validRefreshPayload);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { tenant: true },
      });
    });

    describe('token type validation', () => {
      it('should throw UnauthorizedException when token type is not refresh', async () => {
        const accessPayload: JwtPayload = {
          ...validRefreshPayload,
          type: 'access',
        };

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, accessPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message for wrong token type', async () => {
        const accessPayload: JwtPayload = {
          ...validRefreshPayload,
          type: 'access',
        };

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, accessPayload),
        ).rejects.toThrow('Invalid token type');
      });
    });

    describe('refresh token extraction', () => {
      it('should throw UnauthorizedException when refresh token is not in request body', async () => {
        const mockRequest = createMockRequest();

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message when token not provided', async () => {
        const mockRequest = createMockRequest();

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow('Refresh token not provided');
      });

      it('should throw UnauthorizedException when body is undefined', async () => {
        const mockRequest: Partial<Request> = {
          body: undefined,
        };

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when refreshToken is not a string', async () => {
        const mockRequest: Partial<Request> = {
          body: { refreshToken: 12345 },
        };

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when refreshToken is null', async () => {
        const mockRequest: Partial<Request> = {
          body: { refreshToken: null },
        };

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('user validation', () => {
      it('should throw UnauthorizedException when user is not found', async () => {
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message when user not found', async () => {
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow('User not found');
      });
    });

    describe('refresh token matching', () => {
      it('should throw UnauthorizedException when stored token does not match', async () => {
        const userWithDifferentToken = {
          ...mockUserWithTenant,
          refreshToken: 'different-stored-token',
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithDifferentToken,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message for token mismatch', async () => {
        const userWithDifferentToken = {
          ...mockUserWithTenant,
          refreshToken: 'different-stored-token',
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithDifferentToken,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow('Invalid refresh token');
      });

      it('should throw UnauthorizedException when stored token is null', async () => {
        const userWithNullToken = {
          ...mockUserWithTenant,
          refreshToken: null,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithNullToken,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('user status validation', () => {
      it('should allow ACTIVE user status', async () => {
        const activeUser = {
          ...mockUserWithTenant,
          status: UserStatus.ACTIVE,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          activeUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        const result = await strategy.validate(
          mockRequest as Request,
          validRefreshPayload,
        );

        expect(result.userId).toBe(mockUser.id);
      });

      it('should throw UnauthorizedException for PENDING user without email verification', async () => {
        const pendingUser = {
          ...mockUserWithTenant,
          status: UserStatus.PENDING,
          emailVerified: false,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          pendingUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(
          'Por favor verifica tu correo electrónico antes de acceder a la aplicación.',
        );
      });

      it('should throw UnauthorizedException for PENDING user with email verified but not approved', async () => {
        const pendingUser = {
          ...mockUserWithTenant,
          status: UserStatus.PENDING,
          emailVerified: true,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          pendingUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(
          'Tu cuenta está pendiente de aprobación. Por favor espera la confirmación del administrador.',
        );
      });

      it('should throw UnauthorizedException for SUSPENDED user', async () => {
        const suspendedUser = {
          ...mockUserWithTenant,
          status: UserStatus.SUSPENDED,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          suspendedUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message for suspended user', async () => {
        const suspendedUser = {
          ...mockUserWithTenant,
          status: UserStatus.SUSPENDED,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          suspendedUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow('Tu cuenta no está activa.');
      });

      it('should throw UnauthorizedException for INACTIVE user', async () => {
        const inactiveUser = {
          ...mockUserWithTenant,
          status: UserStatus.INACTIVE,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          inactiveUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message for inactive user', async () => {
        const inactiveUser = {
          ...mockUserWithTenant,
          status: UserStatus.INACTIVE,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          inactiveUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow('Tu cuenta no está activa.');
      });
    });

    describe('tenant status validation', () => {
      it('should allow ACTIVE tenant status', async () => {
        const userWithActiveTenant = {
          ...mockUser,
          tenant: mockTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithActiveTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        const result = await strategy.validate(
          mockRequest as Request,
          validRefreshPayload,
        );

        expect(result.userId).toBe(mockUser.id);
      });

      it('should allow TRIAL tenant status', async () => {
        const userWithTrialTenant = {
          ...mockUser,
          tenant: mockTrialTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithTrialTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        const result = await strategy.validate(
          mockRequest as Request,
          validRefreshPayload,
        );

        expect(result.userId).toBe(mockUser.id);
      });

      it('should throw UnauthorizedException for SUSPENDED tenant', async () => {
        const userWithSuspendedTenant = {
          ...mockUser,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message for suspended tenant', async () => {
        const userWithSuspendedTenant = {
          ...mockUser,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow('Tenant account is not active');
      });

      it('should throw UnauthorizedException for INACTIVE tenant', async () => {
        const userWithInactiveTenant = {
          ...mockUser,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException with correct message for inactive tenant', async () => {
        const userWithInactiveTenant = {
          ...mockUser,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await expect(
          strategy.validate(mockRequest as Request, validRefreshPayload),
        ).rejects.toThrow('Tenant account is not active');
      });
    });

    describe('logging', () => {
      it('should log debug message when validating refresh token', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUserWithTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await strategy.validate(mockRequest as Request, validRefreshPayload);

        expect(debugSpy).toHaveBeenCalledWith(
          'Validating refresh token for user: test@example.com',
        );
      });

      it('should log debug message on successful validation', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUserWithTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        await strategy.validate(mockRequest as Request, validRefreshPayload);

        expect(debugSpy).toHaveBeenCalledWith(
          'Refresh token validated successfully for user: test@example.com',
        );
      });

      it('should log warning when token type is invalid', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const accessPayload: JwtPayload = {
          ...validRefreshPayload,
          type: 'access',
        };

        const mockRequest = createMockRequest(validRefreshToken);

        try {
          await strategy.validate(mockRequest as Request, accessPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'Invalid token type: access for refresh',
        );
      });

      it('should log warning when refresh token not provided', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const mockRequest = createMockRequest();

        try {
          await strategy.validate(mockRequest as Request, validRefreshPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'Refresh token not provided in request body',
        );
      });

      it('should log warning when user is not found', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        const mockRequest = createMockRequest(validRefreshToken);

        try {
          await strategy.validate(mockRequest as Request, validRefreshPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith('User not found: user-123');
      });

      it('should log warning when token mismatch', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const userWithDifferentToken = {
          ...mockUserWithTenant,
          refreshToken: 'different-token',
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithDifferentToken,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        try {
          await strategy.validate(mockRequest as Request, validRefreshPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'Refresh token mismatch for user: test@example.com',
        );
      });

      it('should log warning when user is not active', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const suspendedUser = {
          ...mockUserWithTenant,
          status: UserStatus.SUSPENDED,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          suspendedUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        try {
          await strategy.validate(mockRequest as Request, validRefreshPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'User is not active: test@example.com, status: SUSPENDED',
        );
      });

      it('should log warning when tenant is not active', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const userWithSuspendedTenant = {
          ...mockUser,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        try {
          await strategy.validate(mockRequest as Request, validRefreshPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'Tenant is not active: tenant-suspended, status: SUSPENDED',
        );
      });
    });

    describe('return value structure', () => {
      it('should return RequestUser with all required fields', async () => {
        const adminUser = {
          ...mockUser,
          role: UserRole.ADMIN,
          tenant: mockTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          adminUser,
        );

        const payload: JwtPayload = {
          ...validRefreshPayload,
          role: UserRole.ADMIN,
        };

        const mockRequest = createMockRequest(validRefreshToken);

        const result = await strategy.validate(mockRequest as Request, payload);

        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('role');
        expect(result).toHaveProperty('tenantId');
        expect(result.role).toBe(UserRole.ADMIN);
      });

      it('should return user data from database, not from payload', async () => {
        const ownerUser = {
          ...mockUser,
          role: UserRole.SUPER_ADMIN,
          email: 'owner@example.com',
          tenantId: 'different-tenant',
          tenant: mockTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          ownerUser,
        );

        const mockRequest = createMockRequest(validRefreshToken);

        const result = await strategy.validate(
          mockRequest as Request,
          validRefreshPayload,
        );

        // Result should reflect actual user data from DB, not payload
        expect(result.email).toBe('owner@example.com');
        expect(result.role).toBe(UserRole.SUPER_ADMIN);
        expect(result.tenantId).toBe('different-tenant');
      });
    });
  });
});
