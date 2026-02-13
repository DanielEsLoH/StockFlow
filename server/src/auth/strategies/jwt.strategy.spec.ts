import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserRole,
  UserStatus,
  TenantStatus,
  SubscriptionPlan,
} from '@prisma/client';
import { JwtPayload } from '../types';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    email: 'tenant@example.com',
    phone: null,
    status: TenantStatus.ACTIVE,
    plan: SubscriptionPlan.EMPRENDEDOR,
    wompiPaymentSourceId: null,
    wompiCustomerEmail: null,
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

  const validAccessPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: UserRole.EMPLOYEE,
    tenantId: 'tenant-123',
    type: 'access',
  };

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
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
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

    it('should throw error if JWT secret is not configured', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const mockPrismaService = {
        user: { findUnique: jest.fn() },
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            { provide: PrismaService, useValue: mockPrismaService },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile(),
      ).rejects.toThrow('JWT secret is not configured');
    });
  });

  describe('validate', () => {
    it('should return RequestUser when token is valid and user is active', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserWithTenant,
      );

      const result = await strategy.validate(validAccessPayload);

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

      await strategy.validate(validAccessPayload);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { tenant: true },
      });
    });

    it('should throw UnauthorizedException when token type is not access', async () => {
      const refreshPayload: JwtPayload = {
        ...validAccessPayload,
        type: 'refresh',
      };

      await expect(strategy.validate(refreshPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with correct message for wrong token type', async () => {
      const refreshPayload: JwtPayload = {
        ...validAccessPayload,
        type: 'refresh',
      };

      await expect(strategy.validate(refreshPayload)).rejects.toThrow(
        'Invalid token type',
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with correct message when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        'User not found',
      );
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

        const result = await strategy.validate(validAccessPayload);

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

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
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

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
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

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException with correct message for suspended user', async () => {
        const suspendedUser = {
          ...mockUserWithTenant,
          status: UserStatus.SUSPENDED,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          suspendedUser,
        );

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          'Tu cuenta no está activa.',
        );
      });

      it('should throw UnauthorizedException for INACTIVE user', async () => {
        const inactiveUser = {
          ...mockUserWithTenant,
          status: UserStatus.INACTIVE,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          inactiveUser,
        );

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException with correct message for inactive user', async () => {
        const inactiveUser = {
          ...mockUserWithTenant,
          status: UserStatus.INACTIVE,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          inactiveUser,
        );

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          'Tu cuenta no está activa.',
        );
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

        const result = await strategy.validate(validAccessPayload);

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

        const result = await strategy.validate(validAccessPayload);

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

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException with correct message for suspended tenant', async () => {
        const userWithSuspendedTenant = {
          ...mockUser,
          tenant: mockSuspendedTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithSuspendedTenant,
        );

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          'Tenant account is not active',
        );
      });

      it('should throw UnauthorizedException for INACTIVE tenant', async () => {
        const userWithInactiveTenant = {
          ...mockUser,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException with correct message for inactive tenant', async () => {
        const userWithInactiveTenant = {
          ...mockUser,
          tenant: mockInactiveTenant,
        };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          userWithInactiveTenant,
        );

        await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
          'Tenant account is not active',
        );
      });
    });

    describe('logging', () => {
      it('should log debug message when validating token', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUserWithTenant,
        );

        await strategy.validate(validAccessPayload);

        expect(debugSpy).toHaveBeenCalledWith(
          'Validating JWT for user: test@example.com',
        );
      });

      it('should log debug message on successful validation', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUserWithTenant,
        );

        await strategy.validate(validAccessPayload);

        expect(debugSpy).toHaveBeenCalledWith(
          'JWT validated successfully for user: test@example.com',
        );
      });

      it('should log warning when token type is invalid', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const refreshPayload: JwtPayload = {
          ...validAccessPayload,
          type: 'refresh',
        };

        try {
          await strategy.validate(refreshPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'Invalid token type: refresh for access',
        );
      });

      it('should log warning when user is not found', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        try {
          await strategy.validate(validAccessPayload);
        } catch {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith('User not found: user-123');
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

        try {
          await strategy.validate(validAccessPayload);
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

        try {
          await strategy.validate(validAccessPayload);
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
          ...validAccessPayload,
          role: UserRole.ADMIN,
        };

        const result = await strategy.validate(payload);

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

        const result = await strategy.validate(validAccessPayload);

        // Result should reflect actual user data from DB, not payload
        expect(result.email).toBe('owner@example.com');
        expect(result.role).toBe(UserRole.SUPER_ADMIN);
        expect(result.tenantId).toBe('different-tenant');
      });
    });
  });
});
