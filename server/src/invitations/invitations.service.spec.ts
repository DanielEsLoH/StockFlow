import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../prisma';
import { BrevoService } from '../notifications/mail/brevo.service';
import { UserRole, InvitationStatus, UserStatus } from '@prisma/client';

// Mock crypto
jest.mock('crypto');

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let brevoService: jest.Mocked<BrevoService>;
  let configService: jest.Mocked<ConfigService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockToken = 'mock-token-hex-string-64-chars-long-for-testing-purposes-here';

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

  const mockInvitation = {
    id: 'invitation-123',
    email: 'invitee@example.com',
    tenantId: mockTenantId,
    role: UserRole.EMPLOYEE,
    token: mockToken,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    invitedById: mockAdminUser.id,
    invitedBy: {
      id: mockAdminUser.id,
      firstName: mockAdminUser.firstName,
      lastName: mockAdminUser.lastName,
      email: mockAdminUser.email,
    },
    tenant: {
      id: mockTenantId,
      name: 'Test Tenant',
      slug: 'test-tenant',
    },
  };

  const mockExpiredInvitation = {
    ...mockInvitation,
    id: 'expired-invitation-123',
    status: InvitationStatus.EXPIRED,
  };

  const mockCancelledInvitation = {
    ...mockInvitation,
    id: 'cancelled-invitation-123',
    status: InvitationStatus.CANCELLED,
  };

  const mockAcceptedInvitation = {
    ...mockInvitation,
    id: 'accepted-invitation-123',
    status: InvitationStatus.ACCEPTED,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock crypto.randomBytes
    (crypto.randomBytes as jest.Mock).mockReturnValue({
      toString: jest.fn().mockReturnValue(mockToken),
    });

    // Create mock implementations
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      invitation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockBrevoService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'app.frontendUrl') return 'http://localhost:5173';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BrevoService, useValue: mockBrevoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    prismaService = module.get(PrismaService);
    brevoService = module.get(BrevoService);
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

  describe('create', () => {
    const createDto = {
      email: 'invitee@example.com',
      role: UserRole.EMPLOYEE,
    };

    it('should create a new invitation successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      const result = await service.create(createDto, mockAdminUser as any);

      expect(result.id).toBe(mockInvitation.id);
      expect(result.email).toBe(mockInvitation.email);
      expect(result.role).toBe(mockInvitation.role);
      expect(result.status).toBe(InvitationStatus.PENDING);
      expect(prismaService.invitation.create).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUppercase = {
        email: 'INVITEE@EXAMPLE.COM',
        role: UserRole.EMPLOYEE,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        email: 'invitee@example.com',
      });

      await service.create(dtoWithUppercase, mockAdminUser as any);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: mockTenantId,
            email: 'invitee@example.com',
          },
        },
      });
    });

    it('should use EMPLOYEE as default role when not specified', async () => {
      const dtoWithoutRole = { email: 'invitee@example.com' };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await service.create(dtoWithoutRole as any, mockAdminUser as any);

      expect(prismaService.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.EMPLOYEE,
          }),
        }),
      );
    });

    it('should throw BadRequestException for SUPER_ADMIN role', async () => {
      const dtoWithSuperAdmin = {
        email: 'invitee@example.com',
        role: UserRole.SUPER_ADMIN,
      };

      await expect(
        service.create(dtoWithSuperAdmin, mockAdminUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already exists in tenant', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'invitee@example.com',
      });

      await expect(
        service.create(createDto, mockAdminUser as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending invitation exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.PENDING,
      });

      await expect(
        service.create(createDto, mockAdminUser as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should delete expired invitation and create new one', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockExpiredInvitation,
      );
      (prismaService.invitation.delete as jest.Mock).mockResolvedValue(
        mockExpiredInvitation,
      );
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      const result = await service.create(createDto, mockAdminUser as any);

      expect(prismaService.invitation.delete).toHaveBeenCalledWith({
        where: { id: mockExpiredInvitation.id },
      });
      expect(result.status).toBe(InvitationStatus.PENDING);
    });

    it('should delete cancelled invitation and create new one', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockCancelledInvitation,
      );
      (prismaService.invitation.delete as jest.Mock).mockResolvedValue(
        mockCancelledInvitation,
      );
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      const result = await service.create(createDto, mockAdminUser as any);

      expect(prismaService.invitation.delete).toHaveBeenCalledWith({
        where: { id: mockCancelledInvitation.id },
      });
      expect(result.status).toBe(InvitationStatus.PENDING);
    });

    it('should send invitation email after creation', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await service.create(createDto, mockAdminUser as any);

      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(brevoService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee@example.com',
          subject: expect.stringContaining('Admin User'),
        }),
      );
    });

    it('should log error when email sending fails', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);
      (brevoService.sendEmail as jest.Mock).mockRejectedValue(new Error('Email failed'));

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.create(createDto, mockAdminUser as any);

      // Wait for async email sending to complete and error to be logged
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should generate secure token using crypto', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await service.create(createDto, mockAdminUser as any);

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('should set expiration date 7 days from now', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      const now = new Date();
      await service.create(createDto, mockAdminUser as any);

      const createCall = (prismaService.invitation.create as jest.Mock).mock.calls[0][0];
      const expiresAt = new Date(createCall.data.expiresAt);
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      // Allow 1 second tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });

  describe('findAllByTenant', () => {
    it('should return all invitations for a tenant', async () => {
      const invitations = [mockInvitation, { ...mockInvitation, id: 'invitation-456' }];
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue(invitations);

      const result = await service.findAllByTenant(mockTenantId);

      expect(result).toHaveLength(2);
      expect(prismaService.invitation.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        include: {
          invitedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no invitations exist', async () => {
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllByTenant(mockTenantId);

      expect(result).toHaveLength(0);
    });

    it('should map invitations to response format', async () => {
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue([mockInvitation]);

      const result = await service.findAllByTenant(mockTenantId);

      expect(result[0]).toEqual({
        id: mockInvitation.id,
        email: mockInvitation.email,
        role: mockInvitation.role,
        status: mockInvitation.status,
        expiresAt: mockInvitation.expiresAt,
        createdAt: mockInvitation.createdAt,
        invitedBy: mockInvitation.invitedBy,
      });
    });
  });

  describe('findByToken', () => {
    it('should return invitation when valid token is provided', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation);

      const result = await service.findByToken(mockToken);

      expect(result.id).toBe(mockInvitation.id);
      expect(result.tenant.name).toBe('Test Tenant');
      expect(prismaService.invitation.findUnique).toHaveBeenCalledWith({
        where: { token: mockToken },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          invitedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when invitation not found', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for expired invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockExpiredInvitation,
      );

      await expect(service.findByToken(mockToken)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for cancelled invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockCancelledInvitation,
      );

      await expect(service.findByToken(mockToken)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already accepted invitation', async () => {
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        mockAcceptedInvitation,
      );

      await expect(service.findByToken(mockToken)).rejects.toThrow(BadRequestException);
    });

    it('should update status to expired and throw if expiration date has passed', async () => {
      const pastExpiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(
        pastExpiredInvitation,
      );
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({
        ...pastExpiredInvitation,
        status: InvitationStatus.EXPIRED,
      });

      await expect(service.findByToken(mockToken)).rejects.toThrow(BadRequestException);

      expect(prismaService.invitation.update).toHaveBeenCalledWith({
        where: { id: pastExpiredInvitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
    });
  });

  describe('cancel', () => {
    it('should cancel a pending invitation', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(mockInvitation);
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.CANCELLED,
      });

      await service.cancel(mockInvitation.id, mockTenantId);

      expect(prismaService.invitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
        data: { status: InvitationStatus.CANCELLED },
      });
    });

    it('should throw NotFoundException when invitation not found', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('non-existent', mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-pending invitation', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(
        mockExpiredInvitation,
      );

      await expect(
        service.cancel(mockExpiredInvitation.id, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already cancelled invitation', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(
        mockCancelledInvitation,
      );

      await expect(
        service.cancel(mockCancelledInvitation.id, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for accepted invitation', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(
        mockAcceptedInvitation,
      );

      await expect(
        service.cancel(mockAcceptedInvitation.id, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only find invitations within the tenant', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('invitation-id', 'other-tenant')).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaService.invitation.findFirst).toHaveBeenCalledWith({
        where: { id: 'invitation-id', tenantId: 'other-tenant' },
      });
    });
  });

  describe('resend', () => {
    it('should resend invitation with new token and expiration', async () => {
      const newToken = 'new-token-hex-string-64-chars-long-for-testing-purposes-now';
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue(newToken),
      });

      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(mockInvitation);
      (prismaService.invitation.update as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        token: newToken,
      });

      const result = await service.resend(mockInvitation.id, mockTenantId);

      expect(result.id).toBe(mockInvitation.id);
      expect(prismaService.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockInvitation.id },
          data: expect.objectContaining({
            token: newToken,
          }),
        }),
      );
    });

    it('should throw NotFoundException when invitation not found', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.resend('non-existent', mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-pending invitation', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(
        mockExpiredInvitation,
      );

      await expect(
        service.resend(mockExpiredInvitation.id, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send new invitation email', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(mockInvitation);
      (prismaService.invitation.update as jest.Mock).mockResolvedValue(mockInvitation);

      await service.resend(mockInvitation.id, mockTenantId);

      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(brevoService.sendEmail).toHaveBeenCalled();
    });

    it('should log error when resend email fails', async () => {
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(mockInvitation);
      (prismaService.invitation.update as jest.Mock).mockResolvedValue(mockInvitation);
      (brevoService.sendEmail as jest.Mock).mockRejectedValue(new Error('Email failed'));

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.resend(mockInvitation.id, mockTenantId);

      // Wait for async email sending to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should extend expiration by 7 days', async () => {
      const now = new Date();
      (prismaService.invitation.findFirst as jest.Mock).mockResolvedValue(mockInvitation);
      (prismaService.invitation.update as jest.Mock).mockResolvedValue(mockInvitation);

      await service.resend(mockInvitation.id, mockTenantId);

      const updateCall = (prismaService.invitation.update as jest.Mock).mock.calls[0][0];
      const newExpiresAt = new Date(updateCall.data.expiresAt);
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      // Allow 1 second tolerance
      expect(Math.abs(newExpiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });

  describe('expireOldInvitations', () => {
    it('should mark expired invitations', async () => {
      (prismaService.invitation.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      await service.expireOldInvitations();

      expect(prismaService.invitation.updateMany).toHaveBeenCalledWith({
        where: {
          status: InvitationStatus.PENDING,
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: InvitationStatus.EXPIRED,
        },
      });
    });

    it('should log when invitations are expired', async () => {
      (prismaService.invitation.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await service.expireOldInvitations();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('3 invitation(s) as expired'),
      );
    });

    it('should not log when no invitations expired', async () => {
      (prismaService.invitation.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await service.expireOldInvitations();

      // Only the debug log should be called, not the "marked X invitations" log
      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('invitation(s) as expired'),
      );
    });
  });

  describe('email template generation', () => {
    it('should use configured frontend URL in invitation email', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await service.create({ email: 'test@example.com' } as any, mockAdminUser as any);

      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(brevoService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlContent: expect.stringContaining('http://localhost:5173'),
        }),
      );
    });

    it('should use default frontend URL when not configured', async () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await service.create({ email: 'test@example.com' } as any, mockAdminUser as any);

      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(brevoService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlContent: expect.stringContaining('http://localhost:5173'),
        }),
      );
    });

    it('should include tenant name in email', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await service.create({ email: 'test@example.com' } as any, mockAdminUser as any);

      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(brevoService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlContent: expect.stringContaining('Test Tenant'),
          textContent: expect.stringContaining('Test Tenant'),
        }),
      );
    });

    it('should include inviter name in email', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);

      await service.create({ email: 'test@example.com' } as any, mockAdminUser as any);

      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(brevoService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Admin User'),
          htmlContent: expect.stringContaining('Admin User'),
        }),
      );
    });

    it('should log warning when email sending returns failure', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.invitation.create as jest.Mock).mockResolvedValue(mockInvitation);
      (brevoService.sendEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid email address',
      });

      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.create({ email: 'test@example.com' } as any, mockAdminUser as any);

      // Wait for async email sending
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send invitation email'),
      );
    });
  });

  describe('mapToInvitationResponse', () => {
    it('should correctly map invitation entity to response', async () => {
      (prismaService.invitation.findMany as jest.Mock).mockResolvedValue([mockInvitation]);

      const result = await service.findAllByTenant(mockTenantId);

      expect(result[0]).toEqual({
        id: mockInvitation.id,
        email: mockInvitation.email,
        role: mockInvitation.role,
        status: mockInvitation.status,
        expiresAt: mockInvitation.expiresAt,
        createdAt: mockInvitation.createdAt,
        invitedBy: {
          id: mockAdminUser.id,
          firstName: mockAdminUser.firstName,
          lastName: mockAdminUser.lastName,
          email: mockAdminUser.email,
        },
      });
    });
  });
});