import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import type { UserResponse, PaginatedUsersResponse } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../common/decorators';

/**
 * Current user context from JWT authentication.
 * This interface matches the CurrentUserContext type from auth/types but is declared
 * locally to avoid issues with isolatedModules and emitDecoratorMetadata.
 */
interface CurrentUserContext {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

/**
 * UsersController handles all user management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List users: ADMIN, MANAGER
 * - View user: ADMIN, MANAGER (or own profile)
 * - Create user: ADMIN only
 * - Update user: ADMIN (any user), or user updating own profile
 * - Delete user: ADMIN only
 * - Change password: ADMIN (any user), or user changing own password
 * - Approve/Suspend: ADMIN only
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Lists all users in the current tenant with pagination.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of users
   *
   * @example
   * GET /users?page=1&limit=20
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedUsersResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '10', 10) || 10));

    this.logger.log(`Listing users - page: ${pageNum}, limit: ${limitNum}`);

    return this.usersService.findAll(pageNum, limitNum);
  }

  /**
   * Gets the current authenticated user's profile.
   *
   * @param currentUser - Current authenticated user from JWT
   * @returns User profile data
   *
   * @example
   * GET /users/me
   */
  @Get('me')
  async getProfile(@CurrentUser() currentUser: CurrentUserContext): Promise<UserResponse> {
    this.logger.log(`Getting profile for user: ${currentUser.userId}`);
    return this.usersService.findOne(currentUser.userId);
  }

  /**
   * Gets a user by ID.
   * ADMIN and MANAGER can view any user.
   * Other roles can only view their own profile.
   *
   * @param id - User ID
   * @param currentUser - Current authenticated user from JWT
   * @returns User data
   *
   * @example
   * GET /users/:id
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<UserResponse> {
    this.logger.log(`Getting user: ${id}`);

    // Check if user is authorized to view this profile
    const canViewAnyUser =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.MANAGER;
    const isOwnProfile = currentUser.userId === id;

    if (!canViewAnyUser && !isOwnProfile) {
      // Return own profile instead of throwing error for better UX
      return this.usersService.findOne(currentUser.userId);
    }

    return this.usersService.findOne(id);
  }

  /**
   * Creates a new user in the tenant.
   * Only ADMIN users can create users.
   * Checks tenant user limit before creation.
   *
   * @param dto - User creation data
   * @returns Created user data
   *
   * @example
   * POST /users
   * {
   *   "email": "john@example.com",
   *   "password": "securePassword123",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "role": "EMPLOYEE"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    this.logger.log(`Creating user: ${dto.email}`);
    return this.usersService.create(dto);
  }

  /**
   * Updates a user.
   * ADMIN can update any user.
   * Other users can only update their own profile with limited fields.
   *
   * @param id - User ID to update
   * @param dto - Update data
   * @param currentUser - Current authenticated user from JWT
   * @returns Updated user data
   *
   * @example
   * PATCH /users/:id
   * {
   *   "firstName": "John",
   *   "lastName": "Smith"
   * }
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<UserResponse> {
    this.logger.log(`Updating user: ${id}`);
    return this.usersService.update(id, dto, {
      userId: currentUser.userId,
      role: currentUser.role,
    });
  }

  /**
   * Deletes a user.
   * Only ADMIN users can delete users.
   * Users cannot delete themselves.
   *
   * @param id - User ID to delete
   * @param currentUser - Current authenticated user from JWT
   *
   * @example
   * DELETE /users/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);
    return this.usersService.delete(id, currentUser.userId);
  }

  /**
   * Changes a user's password.
   * Users can change their own password.
   * ADMIN can change any user's password.
   * Requires current password for verification.
   *
   * @param id - User ID
   * @param dto - Password change data
   * @param currentUser - Current authenticated user from JWT
   *
   * @example
   * PATCH /users/:id/change-password
   * {
   *   "currentPassword": "oldPassword123",
   *   "newPassword": "newSecurePassword456"
   * }
   */
  @Patch(':id/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<void> {
    this.logger.log(`Changing password for user: ${id}`);
    return this.usersService.changePassword(id, dto, {
      userId: currentUser.userId,
      role: currentUser.role,
    });
  }

  /**
   * Approves a pending user.
   * Changes user status from PENDING to ACTIVE.
   * Only ADMIN users can approve users.
   *
   * @param id - User ID to approve
   * @returns Updated user data
   *
   * @example
   * PATCH /users/:id/approve
   */
  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  async approve(@Param('id') id: string): Promise<UserResponse> {
    this.logger.log(`Approving user: ${id}`);
    return this.usersService.approve(id);
  }

  /**
   * Suspends a user.
   * Changes user status to SUSPENDED.
   * Only ADMIN users can suspend users.
   * Users cannot suspend themselves.
   *
   * @param id - User ID to suspend
   * @param currentUser - Current authenticated user from JWT
   * @returns Updated user data
   *
   * @example
   * PATCH /users/:id/suspend
   */
  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN)
  async suspend(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<UserResponse> {
    this.logger.log(`Suspending user: ${id}`);
    return this.usersService.suspend(id, currentUser.userId);
  }
}