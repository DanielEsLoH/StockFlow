import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { SystemAdminJwtRefreshStrategy } from './system-admin-jwt-refresh.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SystemAdminJwtPayload,
  SystemAdminRole,
  SystemAdminStatus,
} from '../types';

describe('SystemAdminJwtRefreshStrategy', () => {
  let strategy: SystemAdminJwtRefreshStrategy;
  let prismaService: jest.Mocked<PrismaService>;

  const mockSystemAdmin = {
    id: 'admin-1',
    email: 'admin@stockflow.com',
    password: 'hashedPassword',
    firstName: 'System',
    lastName: 'Admin',
    role: SystemAdminRole.SUPER_ADMIN,
    status: SystemAdminStatus.ACTIVE,
    refreshToken: 'refresh-token',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockValidPayload: SystemAdminJwtPayload = {
    sub: 'admin-1',
    email: 'admin@stockflow.com',
    role: SystemAdminRole.SUPER_ADMIN,
    type: 'refresh',
    isSystemAdmin: true,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      systemAdmin: {
        findUnique: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'SYSTEM_ADMIN_JWT_REFRESH_SECRET') {
          return 'test-system-admin-jwt-refresh-secret';
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAdminJwtRefreshStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<SystemAdminJwtRefreshStrategy>(SystemAdminJwtRefreshStrategy);
    prismaService = module.get(PrismaService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should throw error when SYSTEM_ADMIN_JWT_REFRESH_SECRET is not configured', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            SystemAdminJwtRefreshStrategy,
            { provide: PrismaService, useValue: { systemAdmin: { findUnique: jest.fn() } } },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile(),
      ).rejects.toThrow(
        'SYSTEM_ADMIN_JWT_REFRESH_SECRET is not configured. This is required for system admin token refresh.',
      );
    });
  });

  describe('validate', () => {
    it('should return admin request user when validation succeeds', async () => {
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(mockSystemAdmin);

      const result = await strategy.validate(mockValidPayload);

      expect(result).toEqual({
        adminId: mockSystemAdmin.id,
        email: mockSystemAdmin.email,
        role: mockSystemAdmin.role,
      });
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      const invalidPayload: SystemAdminJwtPayload = {
        ...mockValidPayload,
        type: 'access',
      };

      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        'Invalid refresh token type',
      );
    });

    it('should throw UnauthorizedException when token is not a system admin token', async () => {
      const invalidPayload = {
        ...mockValidPayload,
        isSystemAdmin: false,
      } as unknown as SystemAdminJwtPayload;

      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        'Invalid system admin token',
      );
    });

    it('should throw UnauthorizedException when system admin is not found', async () => {
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(null);

      await expect(strategy.validate(mockValidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockValidPayload)).rejects.toThrow(
        'System admin not found',
      );
    });

    it('should throw UnauthorizedException when system admin is suspended', async () => {
      const suspendedAdmin = {
        ...mockSystemAdmin,
        status: SystemAdminStatus.SUSPENDED,
      };
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(suspendedAdmin);

      await expect(strategy.validate(mockValidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockValidPayload)).rejects.toThrow(
        'System admin account is not active',
      );
    });

    it('should throw UnauthorizedException when system admin is inactive', async () => {
      const inactiveAdmin = {
        ...mockSystemAdmin,
        status: SystemAdminStatus.INACTIVE,
      };
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(inactiveAdmin);

      await expect(strategy.validate(mockValidPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockValidPayload)).rejects.toThrow(
        'System admin account is not active',
      );
    });

    it('should log debug message when validating', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(mockSystemAdmin);

      await strategy.validate(mockValidPayload);

      expect(debugSpy).toHaveBeenCalledWith(
        `Validating system admin refresh JWT for: ${mockValidPayload.email}`,
      );
    });

    it('should log success message after validation', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(mockSystemAdmin);

      await strategy.validate(mockValidPayload);

      expect(debugSpy).toHaveBeenCalledWith(
        `System admin refresh JWT validated successfully for: ${mockSystemAdmin.email}`,
      );
    });

    it('should log warning when token type is invalid', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const invalidPayload: SystemAdminJwtPayload = {
        ...mockValidPayload,
        type: 'access',
      };

      try {
        await strategy.validate(invalidPayload);
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Invalid token type: access for system admin refresh',
      );
    });

    it('should log warning when isSystemAdmin is false', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const invalidPayload = {
        ...mockValidPayload,
        isSystemAdmin: false,
      } as unknown as SystemAdminJwtPayload;

      try {
        await strategy.validate(invalidPayload);
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith('Token is not a system admin token');
    });

    it('should log warning when admin not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(null);

      try {
        await strategy.validate(mockValidPayload);
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        `System admin not found: ${mockValidPayload.sub}`,
      );
    });

    it('should log warning when admin is not active', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const suspendedAdmin = {
        ...mockSystemAdmin,
        status: SystemAdminStatus.SUSPENDED,
      };
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(suspendedAdmin);

      try {
        await strategy.validate(mockValidPayload);
      } catch {
        // Expected to throw
      }

      expect(warnSpy).toHaveBeenCalledWith(
        `System admin is not active: ${suspendedAdmin.email}, status: ${suspendedAdmin.status}`,
      );
    });

    it('should query prisma with correct admin id', async () => {
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(mockSystemAdmin);

      await strategy.validate(mockValidPayload);

      expect(prismaService.systemAdmin.findUnique).toHaveBeenCalledWith({
        where: { id: mockValidPayload.sub },
      });
    });

    it('should handle BILLING admin role correctly', async () => {
      const billingAdmin = {
        ...mockSystemAdmin,
        id: 'admin-3',
        email: 'billing@stockflow.com',
        role: SystemAdminRole.BILLING,
      };
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(billingAdmin);

      const billingPayload: SystemAdminJwtPayload = {
        ...mockValidPayload,
        sub: 'admin-3',
        email: 'billing@stockflow.com',
        role: SystemAdminRole.BILLING,
      };

      const result = await strategy.validate(billingPayload);

      expect(result).toEqual({
        adminId: billingAdmin.id,
        email: billingAdmin.email,
        role: billingAdmin.role,
      });
    });

    it('should handle SUPPORT admin role correctly', async () => {
      const supportAdmin = {
        ...mockSystemAdmin,
        id: 'admin-2',
        email: 'support@stockflow.com',
        role: SystemAdminRole.SUPPORT,
      };
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(supportAdmin);

      const supportPayload: SystemAdminJwtPayload = {
        ...mockValidPayload,
        sub: 'admin-2',
        email: 'support@stockflow.com',
        role: SystemAdminRole.SUPPORT,
      };

      const result = await strategy.validate(supportPayload);

      expect(result).toEqual({
        adminId: supportAdmin.id,
        email: supportAdmin.email,
        role: supportAdmin.role,
      });
    });
  });
});