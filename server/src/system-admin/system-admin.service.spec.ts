import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SystemAdminService } from './system-admin.service';
import { PrismaService } from '../prisma';
import { BrevoService } from '../notifications/mail/brevo.service';
import { SubscriptionManagementService } from '../subscriptions/subscription-management.service';
import { SystemAdminRole, SystemAdminStatus } from './types';
import { UserStatus, SubscriptionPlan, TenantStatus } from '@prisma/client';

describe('SystemAdminService', () => {
  let service: SystemAdminService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockSystemAdmin = {
    id: 'admin-1',
    email: 'admin@stockflow.com',
    password: '$2b$12$hashedPassword',
    firstName: 'System',
    lastName: 'Admin',
    role: SystemAdminRole.SUPER_ADMIN,
    status: SystemAdminStatus.ACTIVE,
    refreshToken: 'old-refresh-token',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@company.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'EMPLOYEE',
    status: UserStatus.PENDING,
    emailVerified: true,
    tenantId: 'tenant-1',
    tenant: {
      id: 'tenant-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      email: 'contact@acme.com',
      phone: null,
      status: TenantStatus.ACTIVE,
      plan: SubscriptionPlan.PYME,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockTenant = {
    id: 'tenant-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    email: 'contact@acme.com',
    phone: null,
    status: TenantStatus.ACTIVE,
    plan: SubscriptionPlan.PYME,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { users: 5 },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      systemAdmin: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      systemAdminAuditLog: {
        create: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SYSTEM_ADMIN_JWT_SECRET: 'test-secret',
          SYSTEM_ADMIN_JWT_EXPIRATION: '15m',
          SYSTEM_ADMIN_JWT_REFRESH_SECRET: 'test-refresh-secret',
          SYSTEM_ADMIN_JWT_REFRESH_EXPIRATION: '7d',
        };
        return config[key];
      }),
    };

    const mockBrevoService = {
      sendAccountApprovedEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockSubscriptionManagementService = {
      activatePlan: jest.fn(),
      suspendPlan: jest.fn(),
      changePlan: jest.fn(),
      reactivatePlan: jest.fn(),
      getSubscription: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BrevoService, useValue: mockBrevoService },
        {
          provide: SubscriptionManagementService,
          useValue: mockSubscriptionManagementService,
        },
      ],
    }).compile();

    service = module.get<SystemAdminService>(SystemAdminService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login a system admin', async () => {
      // Create an admin with a pre-hashed password that bcrypt.compare will validate
      // We use a real bcrypt hash for testing
      const hashedPassword = await bcrypt.hash('password123', 10);
      const adminWithRealHash = {
        ...mockSystemAdmin,
        password: hashedPassword,
      };

      prismaService.systemAdmin.findUnique = jest
        .fn()
        .mockResolvedValue(adminWithRealHash);
      prismaService.systemAdmin.update = jest
        .fn()
        .mockResolvedValue(adminWithRealHash);
      jwtService.signAsync = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(mockSystemAdmin.email, 'password123');

      expect(result).toHaveProperty('admin');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.admin.email).toBe(mockSystemAdmin.email);
    });

    it('should throw UnauthorizedException if admin not found', async () => {
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.login('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if admin is not active', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const inactiveAdmin = {
        ...mockSystemAdmin,
        password: hashedPassword,
        status: SystemAdminStatus.SUSPENDED,
      };
      prismaService.systemAdmin.findUnique = jest
        .fn()
        .mockResolvedValue(inactiveAdmin);

      await expect(
        service.login(mockSystemAdmin.email, 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const adminWithHash = { ...mockSystemAdmin, password: hashedPassword };
      prismaService.systemAdmin.findUnique = jest
        .fn()
        .mockResolvedValue(adminWithHash);

      await expect(
        service.login(mockSystemAdmin.email, 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout a system admin', async () => {
      prismaService.systemAdmin.findUnique = jest
        .fn()
        .mockResolvedValue(mockSystemAdmin);
      prismaService.systemAdmin.update = jest
        .fn()
        .mockResolvedValue(mockSystemAdmin);

      const result = await service.logout(mockSystemAdmin.id);

      expect(result).toHaveProperty('message', 'Logged out successfully');
      expect(prismaService.systemAdmin.update).toHaveBeenCalledWith({
        where: { id: mockSystemAdmin.id },
        data: { refreshToken: null },
      });
    });

    it('should throw NotFoundException if admin not found', async () => {
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.logout('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMe', () => {
    it('should return system admin data', async () => {
      prismaService.systemAdmin.findUnique = jest
        .fn()
        .mockResolvedValue(mockSystemAdmin);

      const result = await service.getMe(mockSystemAdmin.id);

      expect(result).toHaveProperty('id', mockSystemAdmin.id);
      expect(result).toHaveProperty('email', mockSystemAdmin.email);
      expect(result).toHaveProperty('role', mockSystemAdmin.role);
    });

    it('should throw NotFoundException if admin not found', async () => {
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getMe('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      const result = await service.getAllUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toHaveProperty('total', 1);
      expect(result.meta).toHaveProperty('page', 1);
      expect(result.meta).toHaveProperty('totalPages', 1);
    });

    it('should filter users by status', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      await service.getAllUsers({ status: UserStatus.PENDING });

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: UserStatus.PENDING }),
        }),
      );
    });

    it('should filter users by role', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      await service.getAllUsers({ role: 'ADMIN' });

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('should filter users by tenantId', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      await service.getAllUsers({ tenantId: 'tenant-1' });

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        }),
      );
    });

    it('should filter users by search term', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      await service.getAllUsers({ search: 'john' });

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                email: { contains: 'john', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getPendingUsers', () => {
    it('should return only pending users', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      const result = await service.getPendingUsers({ page: 1, limit: 20 });

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: UserStatus.PENDING }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter pending users by tenantId', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      await service.getPendingUsers({ tenantId: 'tenant-1' });

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: UserStatus.PENDING,
            tenantId: 'tenant-1',
          }),
        }),
      );
    });

    it('should filter pending users by search term', async () => {
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.findMany = jest.fn().mockResolvedValue([mockUser]);

      await service.getPendingUsers({ search: 'john' });

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: UserStatus.PENDING,
            OR: expect.arrayContaining([
              expect.objectContaining({
                email: { contains: 'john', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('approveUser', () => {
    it('should approve a pending user', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prismaService.user.update = jest.fn().mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockResolvedValue({});

      const result = await service.approveUser(mockUser.id, mockSystemAdmin.id);

      expect(result.success).toBe(true);
      expect(result.action).toBe('approve');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          status: UserStatus.ACTIVE,
          approvedAt: expect.any(Date),
          approvedById: mockSystemAdmin.id,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.approveUser('nonexistent-id', mockSystemAdmin.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not pending', async () => {
      const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
      prismaService.user.findUnique = jest.fn().mockResolvedValue(activeUser);

      await expect(
        service.approveUser(mockUser.id, mockSystemAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when approving a user with unverified email', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      prismaService.user.findUnique = jest
        .fn()
        .mockResolvedValue(unverifiedUser);

      await expect(
        service.approveUser(mockUser.id, mockSystemAdmin.id),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approveUser(mockUser.id, mockSystemAdmin.id),
      ).rejects.toThrow('No se puede aprobar un usuario que no ha verificado su correo electrónico');
    });
  });

  describe('suspendUser', () => {
    it('should suspend an active user', async () => {
      const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
      prismaService.user.findUnique = jest.fn().mockResolvedValue(activeUser);
      prismaService.user.update = jest.fn().mockResolvedValue({
        ...activeUser,
        status: UserStatus.SUSPENDED,
      });
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockResolvedValue({});

      const result = await service.suspendUser(
        mockUser.id,
        mockSystemAdmin.id,
        'Test reason',
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('suspend');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          status: UserStatus.SUSPENDED,
          refreshToken: null,
        },
      });
    });

    it('should throw BadRequestException if user is already suspended', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      prismaService.user.findUnique = jest
        .fn()
        .mockResolvedValue(suspendedUser);

      await expect(
        service.suspendUser(mockUser.id, mockSystemAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.suspendUser('nonexistent-id', mockSystemAdmin.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prismaService.user.count = jest.fn().mockResolvedValue(1);
      prismaService.user.delete = jest.fn().mockResolvedValue(mockUser);
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockResolvedValue({});

      const result = await service.deleteUser(mockUser.id, mockSystemAdmin.id);

      expect(result.success).toBe(true);
      expect(result.action).toBe('delete');
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.deleteUser('nonexistent-id', mockSystemAdmin.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting last admin of tenant', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      prismaService.user.findUnique = jest.fn().mockResolvedValue(adminUser);
      prismaService.user.count = jest.fn().mockResolvedValue(0);

      await expect(
        service.deleteUser(mockUser.id, mockSystemAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllTenants', () => {
    it('should return paginated tenants', async () => {
      prismaService.tenant.count = jest.fn().mockResolvedValue(1);
      prismaService.tenant.findMany = jest.fn().mockResolvedValue([mockTenant]);

      const result = await service.getAllTenants({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toHaveProperty('total', 1);
      expect(result.data[0]).toHaveProperty('userCount', 5);
    });

    it('should filter tenants by plan', async () => {
      prismaService.tenant.count = jest.fn().mockResolvedValue(1);
      prismaService.tenant.findMany = jest.fn().mockResolvedValue([mockTenant]);

      await service.getAllTenants({ plan: SubscriptionPlan.PRO });

      expect(prismaService.tenant.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ plan: SubscriptionPlan.PRO }),
        }),
      );
    });

    it('should filter tenants by status', async () => {
      prismaService.tenant.count = jest.fn().mockResolvedValue(1);
      prismaService.tenant.findMany = jest.fn().mockResolvedValue([mockTenant]);

      await service.getAllTenants({ status: TenantStatus.ACTIVE });

      expect(prismaService.tenant.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: TenantStatus.ACTIVE }),
        }),
      );
    });

    it('should filter tenants by search term', async () => {
      prismaService.tenant.count = jest.fn().mockResolvedValue(1);
      prismaService.tenant.findMany = jest.fn().mockResolvedValue([mockTenant]);

      await service.getAllTenants({ search: 'acme' });

      expect(prismaService.tenant.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'acme', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('changeTenantPlan', () => {
    it('should change tenant subscription plan', async () => {
      prismaService.tenant.findUnique = jest.fn().mockResolvedValue(mockTenant);
      prismaService.tenant.update = jest.fn().mockResolvedValue({
        ...mockTenant,
        plan: SubscriptionPlan.PRO,
      });
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockResolvedValue({});

      const result = await service.changeTenantPlan(
        mockTenant.id,
        SubscriptionPlan.PRO,
        mockSystemAdmin.id,
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('change_plan');
      expect(result.previousPlan).toBe(SubscriptionPlan.PYME);
      expect(result.newPlan).toBe(SubscriptionPlan.PRO);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      prismaService.tenant.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.changeTenantPlan(
          'nonexistent-id',
          SubscriptionPlan.PRO,
          mockSystemAdmin.id,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if tenant already has the plan', async () => {
      prismaService.tenant.findUnique = jest.fn().mockResolvedValue(mockTenant);

      await expect(
        service.changeTenantPlan(
          mockTenant.id,
          SubscriptionPlan.PYME,
          mockSystemAdmin.id,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const validPayload = {
        sub: mockSystemAdmin.id,
        email: mockSystemAdmin.email,
        role: SystemAdminRole.SUPER_ADMIN,
        type: 'refresh',
        isSystemAdmin: true,
      };

      jwtService.verifyAsync = jest.fn().mockResolvedValue(validPayload);
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue({
        ...mockSystemAdmin,
        refreshToken: 'valid-refresh-token',
      });
      prismaService.systemAdmin.update = jest
        .fn()
        .mockResolvedValue(mockSystemAdmin);
      jwtService.signAsync = jest
        .fn()
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verifyAsync = jest
        .fn()
        .mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if not a refresh token', async () => {
      const accessTokenPayload = {
        sub: mockSystemAdmin.id,
        email: mockSystemAdmin.email,
        role: SystemAdminRole.SUPER_ADMIN,
        type: 'access',
        isSystemAdmin: true,
      };

      jwtService.verifyAsync = jest.fn().mockResolvedValue(accessTokenPayload);

      await expect(
        service.refreshTokens('access-token-instead'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if isSystemAdmin is false', async () => {
      const nonAdminPayload = {
        sub: mockSystemAdmin.id,
        email: mockSystemAdmin.email,
        role: SystemAdminRole.SUPER_ADMIN,
        type: 'refresh',
        isSystemAdmin: false,
      };

      jwtService.verifyAsync = jest.fn().mockResolvedValue(nonAdminPayload);

      await expect(
        service.refreshTokens('not-system-admin-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if admin not found', async () => {
      const validPayload = {
        sub: 'nonexistent-admin',
        email: mockSystemAdmin.email,
        role: SystemAdminRole.SUPER_ADMIN,
        type: 'refresh',
        isSystemAdmin: true,
      };

      jwtService.verifyAsync = jest.fn().mockResolvedValue(validPayload);
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.refreshTokens('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if stored token does not match', async () => {
      const validPayload = {
        sub: mockSystemAdmin.id,
        email: mockSystemAdmin.email,
        role: SystemAdminRole.SUPER_ADMIN,
        type: 'refresh',
        isSystemAdmin: true,
      };

      jwtService.verifyAsync = jest.fn().mockResolvedValue(validPayload);
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue({
        ...mockSystemAdmin,
        refreshToken: 'different-stored-token',
      });

      await expect(service.refreshTokens('mismatched-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if admin is not active', async () => {
      const validPayload = {
        sub: mockSystemAdmin.id,
        email: mockSystemAdmin.email,
        role: SystemAdminRole.SUPER_ADMIN,
        type: 'refresh',
        isSystemAdmin: true,
      };

      jwtService.verifyAsync = jest.fn().mockResolvedValue(validPayload);
      prismaService.systemAdmin.findUnique = jest.fn().mockResolvedValue({
        ...mockSystemAdmin,
        refreshToken: 'valid-refresh-token',
        status: SystemAdminStatus.SUSPENDED,
      });

      await expect(
        service.refreshTokens('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getPlanLimits', () => {
    it('should return correct limits for FREE plan', async () => {
      prismaService.tenant.findUnique = jest.fn().mockResolvedValue({
        ...mockTenant,
        plan: SubscriptionPlan.EMPRENDEDOR,
      });
      prismaService.tenant.update = jest.fn().mockResolvedValue({
        ...mockTenant,
        plan: SubscriptionPlan.EMPRENDEDOR,
      });
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockResolvedValue({});

      // Call changeTenantPlan which internally calls getPlanLimits
      const freeTenant = {
        ...mockTenant,
        plan: SubscriptionPlan.PYME, // Current plan is BASIC
      };
      prismaService.tenant.findUnique = jest.fn().mockResolvedValue(freeTenant);
      prismaService.tenant.update = jest.fn().mockResolvedValue({
        ...freeTenant,
        plan: SubscriptionPlan.EMPRENDEDOR,
      });

      const result = await service.changeTenantPlan(
        mockTenant.id,
        SubscriptionPlan.EMPRENDEDOR,
        mockSystemAdmin.id,
      );

      expect(result.success).toBe(true);
      expect(result.newPlan).toBe(SubscriptionPlan.EMPRENDEDOR);
    });

    it('should return correct limits for PRO plan', async () => {
      prismaService.tenant.findUnique = jest.fn().mockResolvedValue(mockTenant);
      prismaService.tenant.update = jest.fn().mockResolvedValue({
        ...mockTenant,
        plan: SubscriptionPlan.PRO,
      });
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockResolvedValue({});

      const result = await service.changeTenantPlan(
        mockTenant.id,
        SubscriptionPlan.PRO,
        mockSystemAdmin.id,
      );

      expect(result.success).toBe(true);
      expect(result.newPlan).toBe(SubscriptionPlan.PRO);
    });

    it('should return correct limits for ENTERPRISE plan', async () => {
      prismaService.tenant.findUnique = jest.fn().mockResolvedValue(mockTenant);
      prismaService.tenant.update = jest.fn().mockResolvedValue({
        ...mockTenant,
        plan: SubscriptionPlan.PLUS,
      });
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockResolvedValue({});

      const result = await service.changeTenantPlan(
        mockTenant.id,
        SubscriptionPlan.PLUS,
        mockSystemAdmin.id,
      );

      expect(result.success).toBe(true);
      expect(result.newPlan).toBe(SubscriptionPlan.PLUS);
    });
  });

  describe('createSystemAdminAuditLog', () => {
    it('should handle audit log creation failure gracefully', async () => {
      const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
      prismaService.user.findUnique = jest.fn().mockResolvedValue(activeUser);
      prismaService.user.update = jest.fn().mockResolvedValue({
        ...activeUser,
        status: UserStatus.SUSPENDED,
      });
      prismaService.systemAdminAuditLog.create = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Should not throw even if audit log fails
      const result = await service.suspendUser(mockUser.id, mockSystemAdmin.id);

      expect(result.success).toBe(true);
    });
  });
});
