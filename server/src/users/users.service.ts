import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto';

/**
 * User data returned in responses (excludes sensitive fields)
 */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedUsersResponse {
  data: UserResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * UsersService handles all user management operations including
 * CRUD operations, password management, and status changes.
 *
 * This service enforces multi-tenancy and RBAC through proper
 * checks on all operations.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Lists all users within the current tenant with pagination.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of users per page
   * @returns Paginated list of users
   */
  async findAll(page = 1, limit = 10): Promise<PaginatedUsersResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing users for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    return {
      data: users.map((user) => this.mapToUserResponse(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Finds a single user by ID within the current tenant.
   *
   * @param id - User ID
   * @returns User data
   * @throws NotFoundException if user not found
   */
  async findOne(id: string): Promise<UserResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding user ${id} in tenant ${tenantId}`);

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToUserResponse(user);
  }

  /**
   * Creates a new user within the current tenant.
   * Checks tenant user limit before creation.
   *
   * @param dto - User creation data
   * @returns Created user data
   * @throws ForbiddenException if user limit reached
   * @throws ConflictException if email already exists
   */
  async create(dto: CreateUserDto): Promise<UserResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const normalizedEmail = dto.email.toLowerCase();

    this.logger.debug(`Creating user ${normalizedEmail} in tenant ${tenantId}`);

    // Check user limit
    await this.tenantContext.enforceLimit('users');

    // Check for existing user with same email in tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: normalizedEmail,
        },
      },
    });

    if (existingUser) {
      this.logger.warn(`User already exists: ${normalizedEmail}`);
      throw new ConflictException(
        'A user with this email already exists in your organization',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    // Create user with ACTIVE status (created by admin, no need for approval)
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role ?? UserRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
        tenantId,
      },
    });

    this.logger.log(`User created: ${user.email} (${user.id})`);

    return this.mapToUserResponse(user);
  }

  /**
   * Updates an existing user.
   * Non-admin users can only update their own profile with limited fields.
   *
   * @param id - User ID to update
   * @param dto - Update data
   * @param currentUser - Current authenticated user info
   * @returns Updated user data
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if not authorized
   * @throws ConflictException if email already exists
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: { userId: string; role: UserRole },
  ): Promise<UserResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating user ${id} in tenant ${tenantId}`);

    // Find the user to update
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isOwnProfile = currentUser.userId === id;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    // Non-admin users can only update their own profile
    if (!isAdmin && !isOwnProfile) {
      throw new ForbiddenException(
        'You can only update your own profile',
      );
    }

    // Build update data based on permissions
    const updateData: Partial<User> = {};

    // Fields that anyone can update on their own profile
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;

    // Email requires uniqueness check
    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.toLowerCase();
      if (normalizedEmail !== user.email) {
        const existingUser = await this.prisma.user.findUnique({
          where: {
            tenantId_email: {
              tenantId,
              email: normalizedEmail,
            },
          },
        });

        if (existingUser) {
          throw new ConflictException(
            'A user with this email already exists in your organization',
          );
        }

        updateData.email = normalizedEmail;
      }
    }

    // Role and status changes require ADMIN privileges
    if (dto.role !== undefined) {
      if (!isAdmin) {
        throw new ForbiddenException('Only administrators can change user roles');
      }
      // Prevent users from changing their own role to ADMIN (potential privilege escalation)
      if (isOwnProfile && dto.role === UserRole.ADMIN) {
        throw new ForbiddenException('You cannot elevate your own role to ADMIN');
      }
      updateData.role = dto.role;
    }

    if (dto.status !== undefined) {
      if (!isAdmin) {
        throw new ForbiddenException('Only administrators can change user status');
      }
      updateData.status = dto.status;
    }

    // Update the user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`User updated: ${updatedUser.email} (${updatedUser.id})`);

    return this.mapToUserResponse(updatedUser);
  }

  /**
   * Deletes a user from the tenant.
   *
   * @param id - User ID to delete
   * @param currentUserId - Current authenticated user's ID
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if trying to delete self
   */
  async delete(id: string, currentUserId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting user ${id} in tenant ${tenantId}`);

    // Prevent self-deletion
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Find the user to delete
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({ where: { id } });

    this.logger.log(`User deleted: ${user.email} (${user.id})`);
  }

  /**
   * Changes a user's password.
   * Requires current password for verification.
   *
   * @param id - User ID
   * @param dto - Password change data
   * @param currentUser - Current authenticated user info
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if not authorized
   * @throws BadRequestException if current password is incorrect
   */
  async changePassword(
    id: string,
    dto: ChangePasswordDto,
    currentUser: { userId: string; role: UserRole },
  ): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Changing password for user ${id}`);

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isOwnProfile = currentUser.userId === id;

    // Only admin or the user themselves can change password
    if (!isAdmin && !isOwnProfile) {
      throw new ForbiddenException(
        'You can only change your own password',
      );
    }

    // Find the user
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Prevent setting the same password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  /**
   * Approves a pending user (changes status from PENDING to ACTIVE).
   *
   * @param id - User ID to approve
   * @returns Updated user data
   * @throws NotFoundException if user not found
   * @throws BadRequestException if user is not in PENDING status
   */
  async approve(id: string): Promise<UserResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Approving user ${id}`);

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        `User is not in PENDING status. Current status: ${user.status}`,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    this.logger.log(`User approved: ${updatedUser.email} (${updatedUser.id})`);

    return this.mapToUserResponse(updatedUser);
  }

  /**
   * Suspends a user (changes status to SUSPENDED).
   *
   * @param id - User ID to suspend
   * @param currentUserId - Current authenticated user's ID
   * @returns Updated user data
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if trying to suspend self
   */
  async suspend(id: string, currentUserId: string): Promise<UserResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Suspending user ${id}`);

    // Prevent self-suspension
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot suspend your own account');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('User is already suspended');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });

    this.logger.log(`User suspended: ${updatedUser.email} (${updatedUser.id})`);

    return this.mapToUserResponse(updatedUser);
  }

  /**
   * Maps a User entity to a UserResponse object (excludes sensitive fields)
   *
   * @param user - The user entity to map
   * @returns UserResponse object
   */
  private mapToUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}