import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService, InvitationResponse } from './invitations.service';
import { PrismaService } from '../prisma';
import { UserRole, InvitationStatus, UserStatus } from '@prisma/client';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let invitationsService: jest.Mocked<InvitationsService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockCurrentUser = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    tenantId: mockTenantId,
  };

  const mockAdminUser = {
    id: 'admin-123',
    tenantId: mockTenantId,
    email: 'admin@example.com',
    password: 'hashedPassword',
    firstName: 'Admin',
    lastName: 'User',
    phone: null,
    avatar: null,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    refreshToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    googleId: null,
    githubId: null,
    authProvider: 'EMAIL',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
  };

  const mockInvitationResponse: InvitationResponse = {
    id: 'invitation-123',
    email: 'invitee@example.com',
    role: UserRole.EMPLOYEE,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    invitedBy: {
      id: mockAdminUser.id,
      firstName: mockAdminUser.firstName,
      lastName: mockAdminUser.lastName,
      email: mockAdminUser.email,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockInvitationsService = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      cancel: jest.fn(),
      resend: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        { provide: InvitationsService, useValue: mockInvitationsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
    invitationsService = module.get(InvitationsService);
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
      expect(controller).toBeDefined();
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'invitee@example.com',
      role: UserRole.EMPLOYEE,
    };

    it('should create a new invitation', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockAdminUser,
      );
      (invitationsService.create as jest.Mock).mockResolvedValue(
        mockInvitationResponse,
      );

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockInvitationResponse);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockCurrentUser.userId },
      });
      expect(invitationsService.create).toHaveBeenCalledWith(
        createDto,
        mockAdminUser,
      );
    });

    it('should throw error if admin user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.create(createDto, mockCurrentUser),
      ).rejects.toThrow('Admin user not found');
    });

    it('should log the create request', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockAdminUser,
      );
      (invitationsService.create as jest.Mock).mockResolvedValue(
        mockInvitationResponse,
      );

      await controller.create(createDto, mockCurrentUser);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockCurrentUser.email),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(createDto.email),
      );
    });

    it('should pass the correct user to the service', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockAdminUser,
      );
      (invitationsService.create as jest.Mock).mockResolvedValue(
        mockInvitationResponse,
      );

      await controller.create(createDto, mockCurrentUser);

      expect(invitationsService.create).toHaveBeenCalledWith(
        createDto,
        expect.objectContaining({
          id: mockAdminUser.id,
          email: mockAdminUser.email,
          tenantId: mockTenantId,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all invitations for the tenant', async () => {
      const invitations = [mockInvitationResponse];
      (invitationsService.findAllByTenant as jest.Mock).mockResolvedValue(
        invitations,
      );

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual(invitations);
      expect(invitationsService.findAllByTenant).toHaveBeenCalledWith(
        mockCurrentUser.tenantId,
      );
    });

    it('should return empty array when no invitations exist', async () => {
      (invitationsService.findAllByTenant as jest.Mock).mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
    });

    it('should log the list request', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (invitationsService.findAllByTenant as jest.Mock).mockResolvedValue([]);

      await controller.findAll(mockCurrentUser);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockCurrentUser.email),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockCurrentUser.tenantId),
      );
    });

    it('should use the tenant ID from current user', async () => {
      const differentTenantUser = {
        ...mockCurrentUser,
        tenantId: 'different-tenant',
      };
      (invitationsService.findAllByTenant as jest.Mock).mockResolvedValue([]);

      await controller.findAll(differentTenantUser);

      expect(invitationsService.findAllByTenant).toHaveBeenCalledWith(
        'different-tenant',
      );
    });
  });

  describe('cancel', () => {
    const invitationId = 'invitation-123';

    it('should cancel a pending invitation', async () => {
      (invitationsService.cancel as jest.Mock).mockResolvedValue(undefined);

      await controller.cancel(invitationId, mockCurrentUser);

      expect(invitationsService.cancel).toHaveBeenCalledWith(
        invitationId,
        mockCurrentUser.tenantId,
      );
    });

    it('should log the cancel request', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (invitationsService.cancel as jest.Mock).mockResolvedValue(undefined);

      await controller.cancel(invitationId, mockCurrentUser);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(invitationId),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockCurrentUser.email),
      );
    });

    it('should pass tenant ID for authorization', async () => {
      (invitationsService.cancel as jest.Mock).mockResolvedValue(undefined);

      await controller.cancel(invitationId, mockCurrentUser);

      expect(invitationsService.cancel).toHaveBeenCalledWith(
        invitationId,
        mockTenantId,
      );
    });

    it('should return void on successful cancellation', async () => {
      (invitationsService.cancel as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.cancel(invitationId, mockCurrentUser);

      expect(result).toBeUndefined();
    });
  });

  describe('resend', () => {
    const invitationId = 'invitation-123';

    it('should resend an invitation', async () => {
      (invitationsService.resend as jest.Mock).mockResolvedValue(
        mockInvitationResponse,
      );

      const result = await controller.resend(invitationId, mockCurrentUser);

      expect(result).toEqual(mockInvitationResponse);
      expect(invitationsService.resend).toHaveBeenCalledWith(
        invitationId,
        mockCurrentUser.tenantId,
      );
    });

    it('should log the resend request', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      (invitationsService.resend as jest.Mock).mockResolvedValue(
        mockInvitationResponse,
      );

      await controller.resend(invitationId, mockCurrentUser);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(invitationId),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockCurrentUser.email),
      );
    });

    it('should return the updated invitation', async () => {
      const updatedInvitation = {
        ...mockInvitationResponse,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };
      (invitationsService.resend as jest.Mock).mockResolvedValue(
        updatedInvitation,
      );

      const result = await controller.resend(invitationId, mockCurrentUser);

      expect(result.expiresAt).toEqual(updatedInvitation.expiresAt);
    });

    it('should pass tenant ID for authorization', async () => {
      (invitationsService.resend as jest.Mock).mockResolvedValue(
        mockInvitationResponse,
      );

      await controller.resend(invitationId, mockCurrentUser);

      expect(invitationsService.resend).toHaveBeenCalledWith(
        invitationId,
        mockTenantId,
      );
    });
  });

  describe('authorization', () => {
    it('should be decorated with JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        InvitationsController,
      ) as unknown[];
      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });

    it('should require ADMIN or SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', InvitationsController);
      expect(roles).toContain(UserRole.ADMIN);
      expect(roles).toContain(UserRole.SUPER_ADMIN);
    });
  });

  describe('error propagation', () => {
    it('should propagate service errors for create', async () => {
      const error = new Error('Service error');
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockAdminUser,
      );
      (invitationsService.create as jest.Mock).mockRejectedValue(error);

      await expect(
        controller.create({ email: 'test@example.com' }, mockCurrentUser),
      ).rejects.toThrow('Service error');
    });

    it('should propagate service errors for findAll', async () => {
      const error = new Error('Service error');
      (invitationsService.findAllByTenant as jest.Mock).mockRejectedValue(
        error,
      );

      await expect(controller.findAll(mockCurrentUser)).rejects.toThrow(
        'Service error',
      );
    });

    it('should propagate service errors for cancel', async () => {
      const error = new Error('Service error');
      (invitationsService.cancel as jest.Mock).mockRejectedValue(error);

      await expect(
        controller.cancel('invitation-id', mockCurrentUser),
      ).rejects.toThrow('Service error');
    });

    it('should propagate service errors for resend', async () => {
      const error = new Error('Service error');
      (invitationsService.resend as jest.Mock).mockRejectedValue(error);

      await expect(
        controller.resend('invitation-id', mockCurrentUser),
      ).rejects.toThrow('Service error');
    });
  });
});
