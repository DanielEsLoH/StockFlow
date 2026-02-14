import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { UserRole, UserStatus } from '@prisma/client';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const warehouseInclude = {
    warehouse: { select: { id: true, name: true, code: true } },
  };

  const mockWarehouse = {
    id: 'warehouse-123',
    name: 'Test Warehouse',
    code: 'WH-001',
    tenantId: mockTenantId,
    status: 'ACTIVE',
  };

  const mockUser = {
    id: 'user-123',
    tenantId: mockTenantId,
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    avatar: null,
    role: UserRole.EMPLOYEE,
    status: UserStatus.ACTIVE,
    warehouseId: 'warehouse-123',
    warehouse: { id: 'warehouse-123', name: 'Test Warehouse', code: 'WH-001' },
    refreshToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
  };

  const mockAdminUser = {
    ...mockUser,
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  // Kept for potential future test cases
  const _mockManagerUser = {
    ...mockUser,
    id: 'manager-123',
    email: 'manager@example.com',
    role: UserRole.MANAGER,
  };
  void _mockManagerUser;

  const mockPendingUser = {
    ...mockUser,
    id: 'pending-123',
    email: 'pending@example.com',
    status: UserStatus.PENDING,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
      warehouse: {
        findFirst: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
      checkLimit: jest.fn().mockResolvedValue(true),
      getTenant: jest.fn().mockResolvedValue({
        id: mockTenantId,
        name: 'Test Tenant',
        maxUsers: 10,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

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

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser, mockAdminUser];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(users);
      (prismaService.user.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: warehouseInclude,
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(15);

      const result = await service.findAll(2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should require tenant context', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should not include sensitive fields in response', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll();

      const user = result.data[0];
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('refreshToken');
      expect(user).not.toHaveProperty('resetToken');
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-123', tenantId: mockTenantId },
        include: warehouseInclude,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'User with ID nonexistent not found',
      );
    });

    it('should not include sensitive fields in response', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
    });
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'securePassword123',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+0987654321',
      role: UserRole.EMPLOYEE,
      warehouseId: 'warehouse-123',
    };

    const newUser = {
      ...mockUser,
      id: 'new-user-id',
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+0987654321',
    };

    beforeEach(() => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.user.create as jest.Mock).mockResolvedValue(newUser);
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);
    });

    it('should create a new user', async () => {
      const result = await service.create(createDto);

      expect(result.email).toBe('newuser@example.com');
      expect(result.firstName).toBe('Jane');
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should hash the password with 12 salt rounds', async () => {
      await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('securePassword123', 12);
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUppercase = {
        ...createDto,
        email: 'NEWUSER@EXAMPLE.COM',
      };

      await service.create(dtoWithUppercase);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newuser@example.com',
          }),
        }),
      );
    });

    it('should create user with ACTIVE status', async () => {
      await service.create(createDto);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UserStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should use provided role', async () => {
      const dtoWithRole = {
        ...createDto,
        role: UserRole.MANAGER,
        warehouseId: 'warehouse-123',
      };
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...newUser,
        role: UserRole.MANAGER,
      });

      await service.create(dtoWithRole);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.MANAGER,
          }),
        }),
      );
    });

    it('should default to EMPLOYEE role', async () => {
      const dtoWithoutRole = {
        ...createDto,
        role: undefined,
        warehouseId: 'warehouse-123',
      };

      await service.create(dtoWithoutRole);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.EMPLOYEE,
          }),
        }),
      );
    });

    it('should enforce user limit before creation', async () => {
      await service.create(createDto);

      expect(tenantContextService.enforceLimit).toHaveBeenCalledWith('users');
    });

    it('should throw ForbiddenException when user limit reached', async () => {
      (tenantContextService.enforceLimit as jest.Mock).mockRejectedValue(
        new ForbiddenException(
          'Users limit reached (5). Upgrade your plan to create more.',
        ),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        'A user with this email already exists in the platform',
      );
    });

    it('should check for existing user with globally unique email', async () => {
      await service.create({ ...createDto, warehouseId: 'warehouse-123' });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'newuser@example.com',
        },
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    const currentAdmin = { userId: 'admin-123', role: UserRole.ADMIN };
    const currentUser = { userId: 'user-123', role: UserRole.EMPLOYEE };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });
    });

    it('should update user as admin', async () => {
      const result = await service.update('user-123', updateDto, currentAdmin);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should allow users to update their own profile', async () => {
      const result = await service.update('user-123', updateDto, currentUser);

      expect(result.firstName).toBe('Updated');
    });

    it('should throw ForbiddenException when non-admin updates other user', async () => {
      await expect(
        service.update('other-user', updateDto, currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with correct message', async () => {
      await expect(
        service.update('other-user', updateDto, currentUser),
      ).rejects.toThrow('You can only update your own profile');
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateDto, currentAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    describe('email update', () => {
      it('should check uniqueness when changing email', async () => {
        const emailUpdate = { email: 'newemail@example.com' };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        await service.update('user-123', emailUpdate, currentAdmin);

        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: {
            email: 'newemail@example.com',
          },
        });
      });

      it('should throw ConflictException when new email already exists', async () => {
        const emailUpdate = { email: 'existing@example.com' };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockAdminUser,
        );

        await expect(
          service.update('user-123', emailUpdate, currentAdmin),
        ).rejects.toThrow(ConflictException);
      });

      it('should normalize email to lowercase', async () => {
        const emailUpdate = { email: 'NEWEMAIL@EXAMPLE.COM' };
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        await service.update('user-123', emailUpdate, currentAdmin);

        expect(prismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              email: 'newemail@example.com',
            }),
          }),
        );
      });

      it('should not check uniqueness if email unchanged', async () => {
        const emailUpdate = { email: 'test@example.com' }; // Same as mockUser

        await service.update('user-123', emailUpdate, currentAdmin);

        expect(prismaService.user.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('role changes', () => {
      it('should allow admin to change user role', async () => {
        const roleUpdate = { role: UserRole.MANAGER };
        (prismaService.user.update as jest.Mock).mockResolvedValue({
          ...mockUser,
          role: UserRole.MANAGER,
        });
        // mockUser already has warehouseId, so MANAGER is valid

        const result = await service.update(
          'user-123',
          roleUpdate,
          currentAdmin,
        );

        expect(result.role).toBe(UserRole.MANAGER);
      });

      it('should throw ForbiddenException when non-admin tries to change role', async () => {
        const roleUpdate = { role: UserRole.MANAGER };

        await expect(
          service.update('user-123', roleUpdate, currentUser),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException with correct message for role change', async () => {
        const roleUpdate = { role: UserRole.MANAGER };

        await expect(
          service.update('user-123', roleUpdate, currentUser),
        ).rejects.toThrow('Only administrators can change user roles');
      });

      it('should prevent admin from elevating own role to ADMIN', async () => {
        const managerUser = {
          ...mockUser,
          id: 'manager-user',
          role: UserRole.MANAGER,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          managerUser,
        );
        const currentManager = { userId: 'manager-user', role: UserRole.ADMIN };
        const roleUpdate = { role: UserRole.ADMIN };

        await expect(
          service.update('manager-user', roleUpdate, currentManager),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw correct message for self-elevation attempt', async () => {
        const managerUser = {
          ...mockUser,
          id: 'manager-user',
          role: UserRole.MANAGER,
        };
        (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
          managerUser,
        );
        const currentManager = { userId: 'manager-user', role: UserRole.ADMIN };
        const roleUpdate = { role: UserRole.ADMIN };

        await expect(
          service.update('manager-user', roleUpdate, currentManager),
        ).rejects.toThrow('You cannot elevate your own role to ADMIN');
      });
    });

    describe('status changes', () => {
      it('should allow admin to change user status', async () => {
        const statusUpdate = { status: UserStatus.SUSPENDED };
        (prismaService.user.update as jest.Mock).mockResolvedValue({
          ...mockUser,
          status: UserStatus.SUSPENDED,
        });

        const result = await service.update(
          'user-123',
          statusUpdate,
          currentAdmin,
        );

        expect(result.status).toBe(UserStatus.SUSPENDED);
      });

      it('should throw ForbiddenException when non-admin tries to change status', async () => {
        const statusUpdate = { status: UserStatus.INACTIVE };

        await expect(
          service.update('user-123', statusUpdate, currentUser),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw correct message for status change attempt', async () => {
        const statusUpdate = { status: UserStatus.INACTIVE };

        await expect(
          service.update('user-123', statusUpdate, currentUser),
        ).rejects.toThrow('Only administrators can change user status');
      });
    });

    describe('phone update', () => {
      it('should update phone when provided', async () => {
        const phoneUpdate = { phone: '+9876543210' };
        (prismaService.user.update as jest.Mock).mockResolvedValue({
          ...mockUser,
          phone: '+9876543210',
        });

        await service.update('user-123', phoneUpdate, currentAdmin);

        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { phone: '+9876543210' },
          include: warehouseInclude,
        });
      });

      it('should allow setting phone to null', async () => {
        const phoneUpdate = { phone: null };
        (prismaService.user.update as jest.Mock).mockResolvedValue({
          ...mockUser,
          phone: null,
        });

        await service.update('user-123', phoneUpdate, currentAdmin);

        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { phone: null },
          include: warehouseInclude,
        });
      });
    });

    describe('avatar update', () => {
      it('should update avatar when provided', async () => {
        const avatarUpdate = { avatar: 'https://example.com/avatar.png' };
        (prismaService.user.update as jest.Mock).mockResolvedValue({
          ...mockUser,
          avatar: 'https://example.com/avatar.png',
        });

        await service.update('user-123', avatarUpdate, currentAdmin);

        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { avatar: 'https://example.com/avatar.png' },
          include: warehouseInclude,
        });
      });

      it('should allow setting avatar to null', async () => {
        const avatarUpdate = { avatar: null };
        (prismaService.user.update as jest.Mock).mockResolvedValue({
          ...mockUser,
          avatar: null,
        });

        await service.update('user-123', avatarUpdate, currentAdmin);

        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { avatar: null },
          include: warehouseInclude,
        });
      });
    });

    describe('multiple field updates', () => {
      it('should update firstName, lastName, phone, and avatar together', async () => {
        const multiUpdate = {
          firstName: 'New First',
          lastName: 'New Last',
          phone: '+9876543210',
          avatar: 'https://example.com/new-avatar.png',
        };
        (prismaService.user.update as jest.Mock).mockResolvedValue({
          ...mockUser,
          ...multiUpdate,
        });

        await service.update('user-123', multiUpdate, currentAdmin);

        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: {
            firstName: 'New First',
            lastName: 'New Last',
            phone: '+9876543210',
            avatar: 'https://example.com/new-avatar.png',
          },
          include: warehouseInclude,
        });
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.delete as jest.Mock).mockResolvedValue(mockUser);
    });

    it('should delete a user', async () => {
      await service.delete('user-123', 'admin-123');

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw ForbiddenException when trying to delete self', async () => {
      await expect(service.delete('admin-123', 'admin-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw correct message for self-deletion attempt', async () => {
      await expect(service.delete('admin-123', 'admin-123')).rejects.toThrow(
        'You cannot delete your own account',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should require tenant context', async () => {
      await service.delete('user-123', 'admin-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    };

    const currentAdmin = { userId: 'admin-123', role: UserRole.ADMIN };
    const currentUser = { userId: 'user-123', role: UserRole.EMPLOYEE };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // Current password matches
        .mockResolvedValueOnce(false); // New password is different
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
    });

    it('should change password when current password is correct', async () => {
      await service.changePassword('user-123', changePasswordDto, currentUser);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'newHashedPassword' },
      });
    });

    it('should verify current password', async () => {
      await service.changePassword('user-123', changePasswordDto, currentUser);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldPassword123',
        'hashedPassword123',
      );
    });

    it('should hash new password with 12 salt rounds', async () => {
      await service.changePassword('user-123', changePasswordDto, currentUser);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 12);
    });

    it('should allow admin to change any user password', async () => {
      await service.changePassword('user-123', changePasswordDto, currentAdmin);

      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-admin changes other user password', async () => {
      await expect(
        service.changePassword('other-user', changePasswordDto, currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw correct message for unauthorized password change', async () => {
      await expect(
        service.changePassword('other-user', changePasswordDto, currentUser),
      ).rejects.toThrow('You can only change your own password');
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', changePasswordDto, currentAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockReset().mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', changePasswordDto, currentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw correct message for incorrect current password', async () => {
      (bcrypt.compare as jest.Mock).mockReset().mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', changePasswordDto, currentUser),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw BadRequestException when new password is same as current', async () => {
      (bcrypt.compare as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(true) // Current password matches
        .mockResolvedValueOnce(true); // New password is same

      await expect(
        service.changePassword('user-123', changePasswordDto, currentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw correct message for same password', async () => {
      (bcrypt.compare as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await expect(
        service.changePassword('user-123', changePasswordDto, currentUser),
      ).rejects.toThrow('New password must be different from current password');
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        mockPendingUser,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockPendingUser,
        status: UserStatus.ACTIVE,
      });
    });

    it('should approve a pending user', async () => {
      const result = await service.approve('pending-123');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'pending-123' },
        data: { status: UserStatus.ACTIVE },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.approve('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user is not pending', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser); // ACTIVE status

      await expect(service.approve('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw correct message for non-pending user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.approve('user-123')).rejects.toThrow(
        'User is not in PENDING status. Current status: ACTIVE',
      );
    });
  });

  describe('suspend', () => {
    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
    });

    it('should suspend a user', async () => {
      const result = await service.suspend('user-123', 'admin-123');

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { status: UserStatus.SUSPENDED },
      });
    });

    it('should throw ForbiddenException when trying to suspend self', async () => {
      await expect(service.suspend('admin-123', 'admin-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw correct message for self-suspension attempt', async () => {
      await expect(service.suspend('admin-123', 'admin-123')).rejects.toThrow(
        'You cannot suspend your own account',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.suspend('nonexistent', 'admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user is already suspended', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        suspendedUser,
      );

      await expect(service.suspend('user-123', 'admin-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw correct message for already suspended user', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        suspendedUser,
      );

      await expect(service.suspend('user-123', 'admin-123')).rejects.toThrow(
        'User is already suspended',
      );
    });
  });

  describe('mapToUserResponse', () => {
    it('should exclude password from response', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result).not.toHaveProperty('password');
    });

    it('should exclude refreshToken from response', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should exclude resetToken from response', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result).not.toHaveProperty('resetToken');
    });

    it('should exclude resetTokenExpiry from response', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result).not.toHaveProperty('resetTokenExpiry');
    });

    it('should include all expected fields', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('avatar');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('lastLoginAt');
    });
  });

  describe('logging', () => {
    it('should log debug when listing users', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing users for tenant'),
      );
    });

    it('should log when user is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'new-id',
      });
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(mockWarehouse);

      await service.create({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        warehouseId: 'warehouse-123',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('User created'),
      );
    });

    it('should log when user is deleted', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.delete as jest.Mock).mockResolvedValue(mockUser);

      await service.delete('user-123', 'admin-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('User deleted'),
      );
    });

    it('should log warning when user not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('User not found: nonexistent');
    });
  });

  describe('update - warehouse assignment changes', () => {
    const currentAdmin = { userId: 'admin-123', role: UserRole.ADMIN };
    const currentEmployee = { userId: 'user-123', role: UserRole.EMPLOYEE };

    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        warehouseId: 'warehouse-456',
      });
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue({
        ...mockWarehouse,
        id: 'warehouse-456',
      });
    });

    it('should throw ForbiddenException when non-admin tries to change warehouse assignment', async () => {
      const warehouseUpdate = { warehouseId: 'warehouse-456' };

      await expect(
        service.update('user-123', warehouseUpdate, currentEmployee),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw correct message for non-admin warehouse change', async () => {
      const warehouseUpdate = { warehouseId: 'warehouse-456' };

      await expect(
        service.update('user-123', warehouseUpdate, currentEmployee),
      ).rejects.toThrow(
        'Only administrators can change warehouse assignments',
      );
    });

    it('should allow admin to change warehouse assignment', async () => {
      const warehouseUpdate = { warehouseId: 'warehouse-456' };

      const result = await service.update(
        'user-123',
        warehouseUpdate,
        currentAdmin,
      );

      expect(result.warehouseId).toBe('warehouse-456');
      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-456', tenantId: mockTenantId },
      });
    });

    it('should validate warehouse assignment when changing role and warehouse simultaneously', async () => {
      const combinedUpdate = {
        role: UserRole.MANAGER,
        warehouseId: 'warehouse-456',
      };
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: UserRole.MANAGER,
        warehouseId: 'warehouse-456',
      });

      await service.update('user-123', combinedUpdate, currentAdmin);

      expect(prismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'warehouse-456', tenantId: mockTenantId },
      });
    });

    it('should use effective role (dto.role) when validating warehouse during combined update', async () => {
      // Changing to ADMIN role and setting warehouseId should fail
      const combinedUpdate = {
        role: UserRole.ADMIN,
        warehouseId: 'warehouse-456',
      };

      await expect(
        service.update('user-123', combinedUpdate, currentAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update - role change without warehouseId', () => {
    const currentAdmin = { userId: 'admin-123', role: UserRole.ADMIN };

    it('should throw BadRequestException when changing to MANAGER without warehouseId and user has none', async () => {
      const userWithoutWarehouse = {
        ...mockUser,
        warehouseId: null,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        userWithoutWarehouse,
      );

      const roleUpdate = { role: UserRole.MANAGER };

      await expect(
        service.update('user-123', roleUpdate, currentAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw correct message for role change without warehouse', async () => {
      const userWithoutWarehouse = {
        ...mockUser,
        warehouseId: null,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        userWithoutWarehouse,
      );

      const roleUpdate = { role: UserRole.EMPLOYEE };

      await expect(
        service.update('user-123', roleUpdate, currentAdmin),
      ).rejects.toThrow(
        'Los usuarios con rol MANAGER o EMPLOYEE deben tener una bodega asignada. Incluya warehouseId.',
      );
    });

    it('should allow role change to MANAGER when user already has a warehouseId', async () => {
      // mockUser already has warehouseId: 'warehouse-123'
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: UserRole.MANAGER,
      });

      const roleUpdate = { role: UserRole.MANAGER };

      const result = await service.update('user-123', roleUpdate, currentAdmin);

      expect(result.role).toBe(UserRole.MANAGER);
    });
  });

  describe('updateAvatar', () => {
    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        avatar: 'https://example.com/new-avatar.png',
      });
    });

    it('should update the user avatar', async () => {
      const result = await service.updateAvatar(
        'user-123',
        'https://example.com/new-avatar.png',
      );

      expect(result.avatar).toBe('https://example.com/new-avatar.png');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatar: 'https://example.com/new-avatar.png' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateAvatar('nonexistent', 'https://example.com/avatar.png'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateAvatar('nonexistent', 'https://example.com/avatar.png'),
      ).rejects.toThrow('User with ID nonexistent not found');
    });

    it('should require tenant context', async () => {
      await service.updateAvatar(
        'user-123',
        'https://example.com/avatar.png',
      );

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should find user scoped to tenant', async () => {
      await service.updateAvatar(
        'user-123',
        'https://example.com/avatar.png',
      );

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-123', tenantId: mockTenantId },
      });
    });
  });

  describe('removeAvatar', () => {
    beforeEach(() => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        avatar: 'https://example.com/old-avatar.png',
      });
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        avatar: null,
      });
    });

    it('should remove the user avatar and return previous URL', async () => {
      const result = await service.removeAvatar('user-123');

      expect(result).toEqual({
        previousUrl: 'https://example.com/old-avatar.png',
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatar: null },
      });
    });

    it('should return null previousUrl when user had no avatar', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        avatar: null,
      });

      const result = await service.removeAvatar('user-123');

      expect(result).toEqual({ previousUrl: null });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.removeAvatar('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.removeAvatar('nonexistent')).rejects.toThrow(
        'User with ID nonexistent not found',
      );
    });

    it('should require tenant context', async () => {
      await service.removeAvatar('user-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('validateWarehouseAssignment (via create)', () => {
    const baseCreateDto: CreateUserDto = {
      email: 'warehouse-test@example.com',
      password: 'securePassword123',
      firstName: 'Test',
      lastName: 'User',
    };

    beforeEach(() => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    });

    it('should throw BadRequestException when EMPLOYEE has no warehouseId', async () => {
      const dto = { ...baseCreateDto, role: UserRole.EMPLOYEE };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw correct message for EMPLOYEE without warehouse', async () => {
      const dto = { ...baseCreateDto, role: UserRole.EMPLOYEE };

      await expect(service.create(dto)).rejects.toThrow(
        'Los usuarios con rol MANAGER o EMPLOYEE deben tener una bodega asignada',
      );
    });

    it('should throw BadRequestException when MANAGER has no warehouseId', async () => {
      const dto = { ...baseCreateDto, role: UserRole.MANAGER };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when ADMIN has a warehouseId', async () => {
      const dto = {
        ...baseCreateDto,
        role: UserRole.ADMIN,
        warehouseId: 'warehouse-123',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw correct message for ADMIN with warehouse', async () => {
      const dto = {
        ...baseCreateDto,
        role: UserRole.ADMIN,
        warehouseId: 'warehouse-123',
      };

      await expect(service.create(dto)).rejects.toThrow(
        'Los usuarios con rol ADMIN o SUPER_ADMIN no deben tener bodega asignada',
      );
    });

    it('should throw BadRequestException when SUPER_ADMIN has a warehouseId', async () => {
      const dto = {
        ...baseCreateDto,
        role: UserRole.SUPER_ADMIN,
        warehouseId: 'warehouse-123',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when warehouse does not exist', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      const dto = {
        ...baseCreateDto,
        role: UserRole.EMPLOYEE,
        warehouseId: 'nonexistent-warehouse',
      };

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw correct message for non-existent warehouse', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

      const dto = {
        ...baseCreateDto,
        role: UserRole.EMPLOYEE,
        warehouseId: 'nonexistent-warehouse',
      };

      await expect(service.create(dto)).rejects.toThrow(
        'Bodega no encontrada: nonexistent-warehouse',
      );
    });

    it('should throw BadRequestException when warehouse is not ACTIVE', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue({
        ...mockWarehouse,
        status: 'INACTIVE',
      });

      const dto = {
        ...baseCreateDto,
        role: UserRole.EMPLOYEE,
        warehouseId: 'warehouse-123',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw correct message for inactive warehouse', async () => {
      (prismaService.warehouse.findFirst as jest.Mock).mockResolvedValue({
        ...mockWarehouse,
        status: 'INACTIVE',
      });

      const dto = {
        ...baseCreateDto,
        role: UserRole.EMPLOYEE,
        warehouseId: 'warehouse-123',
      };

      await expect(service.create(dto)).rejects.toThrow(
        'La bodega asignada debe estar activa',
      );
    });
  });
});
