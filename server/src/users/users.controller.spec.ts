import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { UserResponse, PaginatedUsersResponse } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto';
import { UserRole, UserStatus } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockUser: UserResponse = {
    id: 'user-123',
    tenantId: mockTenantId,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    avatar: null,
    role: UserRole.EMPLOYEE,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
  };

  const mockAdminUser: UserResponse = {
    ...mockUser,
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockManagerUser: UserResponse = {
    ...mockUser,
    id: 'manager-123',
    email: 'manager@example.com',
    role: UserRole.MANAGER,
  };

  const mockPendingUser: UserResponse = {
    ...mockUser,
    id: 'pending-123',
    email: 'pending@example.com',
    status: UserStatus.PENDING,
  };

  const mockPaginatedResponse: PaginatedUsersResponse = {
    data: [mockUser, mockAdminUser],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  // Current user contexts for authorization tests
  const adminCurrentUser = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    tenantId: mockTenantId,
  };

  const managerCurrentUser = {
    userId: 'manager-123',
    email: 'manager@example.com',
    role: UserRole.MANAGER,
    tenantId: mockTenantId,
  };

  const employeeCurrentUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: UserRole.EMPLOYEE,
    tenantId: mockTenantId,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUsersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      changePassword: jest.fn(),
      approve: jest.fn(),
      suspend: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated users with default pagination', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockPaginatedResponse);
      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should parse page and limit from query params', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('2', '20');

      expect(usersService.findAll).toHaveBeenCalledWith(2, 20);
    });

    it('should enforce minimum page of 1', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('0', '10');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce minimum page of 1 for negative values', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('-5', '10');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce maximum limit of 100', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '200');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 100);
    });

    it('should handle zero limit by using default', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Note: '0' is parsed to 0, which is falsy, so || 10 returns default
      await controller.findAll('1', '0');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should enforce minimum limit of 1 for negative values', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '-5');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 1);
    });

    it('should handle invalid page value gracefully', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('invalid', '10');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle invalid limit value gracefully', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', 'invalid');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle NaN page value gracefully', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('NaN', '10');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle NaN limit value gracefully', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', 'NaN');

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle undefined page and limit', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(undefined, undefined);

      expect(usersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      usersService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(error);
    });
  });

  describe('getProfile', () => {
    it('should return the current user profile', async () => {
      usersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.getProfile(employeeCurrentUser);

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should return admin user profile', async () => {
      usersService.findOne.mockResolvedValue(mockAdminUser);

      const result = await controller.getProfile(adminCurrentUser);

      expect(result).toEqual(mockAdminUser);
      expect(usersService.findOne).toHaveBeenCalledWith('admin-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('User not found');
      usersService.findOne.mockRejectedValue(error);

      await expect(controller.getProfile(employeeCurrentUser)).rejects.toThrow(
        error,
      );
    });
  });

  describe('findOne', () => {
    describe('ADMIN role authorization', () => {
      it('should allow ADMIN to view any user', async () => {
        usersService.findOne.mockResolvedValue(mockUser);

        const result = await controller.findOne('user-123', adminCurrentUser);

        expect(result).toEqual(mockUser);
        expect(usersService.findOne).toHaveBeenCalledWith('user-123');
      });

      it('should allow ADMIN to view their own profile', async () => {
        usersService.findOne.mockResolvedValue(mockAdminUser);

        const result = await controller.findOne('admin-123', adminCurrentUser);

        expect(result).toEqual(mockAdminUser);
        expect(usersService.findOne).toHaveBeenCalledWith('admin-123');
      });
    });

    describe('MANAGER role authorization', () => {
      it('should allow MANAGER to view any user', async () => {
        usersService.findOne.mockResolvedValue(mockUser);

        const result = await controller.findOne('user-123', managerCurrentUser);

        expect(result).toEqual(mockUser);
        expect(usersService.findOne).toHaveBeenCalledWith('user-123');
      });

      it('should allow MANAGER to view their own profile', async () => {
        usersService.findOne.mockResolvedValue(mockManagerUser);

        const result = await controller.findOne(
          'manager-123',
          managerCurrentUser,
        );

        expect(result).toEqual(mockManagerUser);
        expect(usersService.findOne).toHaveBeenCalledWith('manager-123');
      });
    });

    describe('EMPLOYEE role authorization', () => {
      it('should allow EMPLOYEE to view their own profile', async () => {
        usersService.findOne.mockResolvedValue(mockUser);

        const result = await controller.findOne(
          'user-123',
          employeeCurrentUser,
        );

        expect(result).toEqual(mockUser);
        expect(usersService.findOne).toHaveBeenCalledWith('user-123');
      });

      it('should return own profile when EMPLOYEE tries to view other user', async () => {
        usersService.findOne.mockResolvedValue(mockUser);

        const result = await controller.findOne(
          'other-user-456',
          employeeCurrentUser,
        );

        expect(result).toEqual(mockUser);
        // Should call findOne with current user's ID, not the requested ID
        expect(usersService.findOne).toHaveBeenCalledWith('user-123');
        expect(usersService.findOne).not.toHaveBeenCalledWith('other-user-456');
      });

      it('should return own profile when non-ADMIN/MANAGER tries to view admin profile', async () => {
        usersService.findOne.mockResolvedValue(mockUser);

        const result = await controller.findOne(
          'admin-123',
          employeeCurrentUser,
        );

        expect(result).toEqual(mockUser);
        expect(usersService.findOne).toHaveBeenCalledWith('user-123');
      });
    });

    describe('non-privileged EMPLOYEE role authorization', () => {
      const employeeCurrentUser = {
        userId: 'employee-123',
        email: 'employee@example.com',
        role: UserRole.EMPLOYEE,
        tenantId: mockTenantId,
      };

      const mockEmployeeUser: UserResponse = {
        ...mockUser,
        id: 'employee-123',
        email: 'employee@example.com',
        role: UserRole.EMPLOYEE,
      };

      it('should allow EMPLOYEE to view their own profile', async () => {
        usersService.findOne.mockResolvedValue(mockEmployeeUser);

        const result = await controller.findOne(
          'employee-123',
          employeeCurrentUser,
        );

        expect(result).toEqual(mockEmployeeUser);
        expect(usersService.findOne).toHaveBeenCalledWith('employee-123');
      });

      it('should return own profile when EMPLOYEE tries to view other user', async () => {
        usersService.findOne.mockResolvedValue(mockEmployeeUser);

        const result = await controller.findOne(
          'user-123',
          employeeCurrentUser,
        );

        expect(result).toEqual(mockEmployeeUser);
        expect(usersService.findOne).toHaveBeenCalledWith('employee-123');
      });
    });

    it('should propagate not found errors', async () => {
      const error = new Error('User not found');
      usersService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne('invalid-id', adminCurrentUser),
      ).rejects.toThrow(error);
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
    };

    const createdUser: UserResponse = {
      ...mockUser,
      id: 'new-user-id',
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+0987654321',
    };

    it('should create and return a new user', async () => {
      usersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdUser);
      expect(usersService.create).toHaveBeenCalledWith(createDto);
    });

    it('should create user with minimal required fields', async () => {
      const minimalDto: CreateUserDto = {
        email: 'minimal@example.com',
        password: 'password123',
        firstName: 'Min',
        lastName: 'User',
      };

      usersService.create.mockResolvedValue({
        ...createdUser,
        email: 'minimal@example.com',
        firstName: 'Min',
        lastName: 'User',
        phone: null,
      });

      const result = await controller.create(minimalDto);

      expect(result.email).toBe('minimal@example.com');
      expect(usersService.create).toHaveBeenCalledWith(minimalDto);
    });

    it('should propagate conflict errors for duplicate email', async () => {
      const error = new Error('Email already exists');
      usersService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });

    it('should propagate forbidden errors when user limit reached', async () => {
      const error = new Error('User limit reached');
      usersService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update and return the user', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      usersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        'user-123',
        updateDto,
        adminCurrentUser,
      );

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith('user-123', updateDto, {
        userId: 'admin-123',
        role: UserRole.ADMIN,
      });
    });

    it('should pass current user context to service', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      usersService.update.mockResolvedValue(updatedUser);

      await controller.update('user-123', updateDto, employeeCurrentUser);

      expect(usersService.update).toHaveBeenCalledWith('user-123', updateDto, {
        userId: 'user-123',
        role: UserRole.EMPLOYEE,
      });
    });

    it('should propagate not found errors', async () => {
      const error = new Error('User not found');
      usersService.update.mockRejectedValue(error);

      await expect(
        controller.update('invalid-id', updateDto, adminCurrentUser),
      ).rejects.toThrow(error);
    });

    it('should propagate forbidden errors', async () => {
      const error = new Error('You can only update your own profile');
      usersService.update.mockRejectedValue(error);

      await expect(
        controller.update('other-user', updateDto, employeeCurrentUser),
      ).rejects.toThrow(error);
    });

    it('should propagate conflict errors for duplicate email', async () => {
      const emailUpdateDto: UpdateUserDto = { email: 'existing@example.com' };
      const error = new Error('Email already exists');
      usersService.update.mockRejectedValue(error);

      await expect(
        controller.update('user-123', emailUpdateDto, adminCurrentUser),
      ).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      usersService.delete.mockResolvedValue(undefined);

      await controller.delete('user-123', adminCurrentUser);

      expect(usersService.delete).toHaveBeenCalledWith('user-123', 'admin-123');
    });

    it('should pass current user ID to prevent self-deletion', async () => {
      usersService.delete.mockResolvedValue(undefined);

      await controller.delete('some-user', adminCurrentUser);

      expect(usersService.delete).toHaveBeenCalledWith(
        'some-user',
        'admin-123',
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('User not found');
      usersService.delete.mockRejectedValue(error);

      await expect(
        controller.delete('invalid-id', adminCurrentUser),
      ).rejects.toThrow(error);
    });

    it('should propagate forbidden errors for self-deletion', async () => {
      const error = new Error('You cannot delete your own account');
      usersService.delete.mockRejectedValue(error);

      await expect(
        controller.delete('admin-123', adminCurrentUser),
      ).rejects.toThrow(error);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    };

    it('should change password successfully', async () => {
      usersService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(
        'user-123',
        changePasswordDto,
        employeeCurrentUser,
      );

      expect(usersService.changePassword).toHaveBeenCalledWith(
        'user-123',
        changePasswordDto,
        {
          userId: 'user-123',
          role: UserRole.EMPLOYEE,
        },
      );
    });

    it('should pass admin context for admin changing other user password', async () => {
      usersService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(
        'user-123',
        changePasswordDto,
        adminCurrentUser,
      );

      expect(usersService.changePassword).toHaveBeenCalledWith(
        'user-123',
        changePasswordDto,
        {
          userId: 'admin-123',
          role: UserRole.ADMIN,
        },
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('User not found');
      usersService.changePassword.mockRejectedValue(error);

      await expect(
        controller.changePassword(
          'invalid-id',
          changePasswordDto,
          adminCurrentUser,
        ),
      ).rejects.toThrow(error);
    });

    it('should propagate forbidden errors', async () => {
      const error = new Error('You can only change your own password');
      usersService.changePassword.mockRejectedValue(error);

      await expect(
        controller.changePassword(
          'other-user',
          changePasswordDto,
          employeeCurrentUser,
        ),
      ).rejects.toThrow(error);
    });

    it('should propagate bad request errors for incorrect current password', async () => {
      const error = new Error('Current password is incorrect');
      usersService.changePassword.mockRejectedValue(error);

      await expect(
        controller.changePassword(
          'user-123',
          changePasswordDto,
          employeeCurrentUser,
        ),
      ).rejects.toThrow(error);
    });

    it('should propagate bad request errors for same password', async () => {
      const error = new Error(
        'New password must be different from current password',
      );
      usersService.changePassword.mockRejectedValue(error);

      await expect(
        controller.changePassword(
          'user-123',
          changePasswordDto,
          employeeCurrentUser,
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('approve', () => {
    it('should approve a pending user', async () => {
      const approvedUser = { ...mockPendingUser, status: UserStatus.ACTIVE };
      usersService.approve.mockResolvedValue(approvedUser);

      const result = await controller.approve('pending-123');

      expect(result).toEqual(approvedUser);
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(usersService.approve).toHaveBeenCalledWith('pending-123');
    });

    it('should propagate not found errors', async () => {
      const error = new Error('User not found');
      usersService.approve.mockRejectedValue(error);

      await expect(controller.approve('invalid-id')).rejects.toThrow(error);
    });

    it('should propagate bad request errors for non-pending user', async () => {
      const error = new Error(
        'User is not in PENDING status. Current status: ACTIVE',
      );
      usersService.approve.mockRejectedValue(error);

      await expect(controller.approve('user-123')).rejects.toThrow(error);
    });
  });

  describe('suspend', () => {
    it('should suspend a user', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      usersService.suspend.mockResolvedValue(suspendedUser);

      const result = await controller.suspend('user-123', adminCurrentUser);

      expect(result).toEqual(suspendedUser);
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(usersService.suspend).toHaveBeenCalledWith(
        'user-123',
        'admin-123',
      );
    });

    it('should pass current user ID to prevent self-suspension', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      usersService.suspend.mockResolvedValue(suspendedUser);

      await controller.suspend('some-user', adminCurrentUser);

      expect(usersService.suspend).toHaveBeenCalledWith(
        'some-user',
        'admin-123',
      );
    });

    it('should propagate not found errors', async () => {
      const error = new Error('User not found');
      usersService.suspend.mockRejectedValue(error);

      await expect(
        controller.suspend('invalid-id', adminCurrentUser),
      ).rejects.toThrow(error);
    });

    it('should propagate forbidden errors for self-suspension', async () => {
      const error = new Error('You cannot suspend your own account');
      usersService.suspend.mockRejectedValue(error);

      await expect(
        controller.suspend('admin-123', adminCurrentUser),
      ).rejects.toThrow(error);
    });

    it('should propagate bad request errors for already suspended user', async () => {
      const error = new Error('User is already suspended');
      usersService.suspend.mockRejectedValue(error);

      await expect(
        controller.suspend('user-123', adminCurrentUser),
      ).rejects.toThrow(error);
    });
  });

  describe('logging', () => {
    it('should log when listing users', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing users'),
      );
    });

    it('should log when getting profile', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.findOne.mockResolvedValue(mockUser);

      await controller.getProfile(employeeCurrentUser);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting profile for user'),
      );
    });

    it('should log when getting user by id', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.findOne.mockResolvedValue(mockUser);

      await controller.findOne('user-123', adminCurrentUser);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting user'),
      );
    });

    it('should log when creating user', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const createDto: CreateUserDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };
      usersService.create.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      });

      await controller.create(createDto);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating user'),
      );
    });

    it('should log when updating user', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.update.mockResolvedValue(mockUser);

      await controller.update(
        'user-123',
        { firstName: 'Updated' },
        adminCurrentUser,
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating user'),
      );
    });

    it('should log when deleting user', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.delete.mockResolvedValue(undefined);

      await controller.delete('user-123', adminCurrentUser);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deleting user'),
      );
    });

    it('should log when changing password', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(
        'user-123',
        { currentPassword: 'old', newPassword: 'newPassword123' },
        employeeCurrentUser,
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Changing password for user'),
      );
    });

    it('should log when approving user', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.approve.mockResolvedValue({
        ...mockPendingUser,
        status: UserStatus.ACTIVE,
      });

      await controller.approve('pending-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Approving user'),
      );
    });

    it('should log when suspending user', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      usersService.suspend.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await controller.suspend('user-123', adminCurrentUser);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspending user'),
      );
    });
  });
});
