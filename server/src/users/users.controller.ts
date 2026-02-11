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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import type { UserResponse, PaginatedUsersResponse } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto';
import { UserEntity, PaginatedUsersEntity } from './entities';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles, CurrentUser } from '../common/decorators';
import { PermissionsService, Permission } from '../common/permissions';
import { UploadService } from '../upload/upload.service';

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
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Lists all users in the current tenant with pagination.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns a paginated list of all users in the current tenant. Requires ADMIN or MANAGER role.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: PaginatedUsersEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedUsersResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(`Listing users - page: ${pageNum}, limit: ${limitNum}`);

    return this.usersService.findAll(pageNum, limitNum);
  }

  /**
   * Gets the current authenticated user's profile.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getProfile(
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<UserResponse> {
    this.logger.log(`Getting profile for user: ${currentUser.userId}`);
    return this.usersService.findOne(currentUser.userId);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload current user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, type: UserEntity })
  @ApiResponse({ status: 400 })
  async uploadMyAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<UserResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`Uploading avatar for user: ${currentUser.userId}`);

    // Delete old avatar if exists
    const existingUser = await this.usersService.findOne(currentUser.userId);
    if (existingUser.avatar) {
      await this.uploadService.deleteByUrl(existingUser.avatar);
    }

    // Upload new avatar
    const { url } = await this.uploadService.uploadAvatar(
      file,
      currentUser.tenantId,
      currentUser.userId,
    );

    // Update user record
    return this.usersService.updateAvatar(currentUser.userId, url);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete current user avatar' })
  @ApiResponse({ status: 204 })
  async deleteMyAvatar(
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<void> {
    this.logger.log(`Deleting avatar for user: ${currentUser.userId}`);

    const { previousUrl } = await this.usersService.removeAvatar(
      currentUser.userId,
    );

    if (previousUrl) {
      await this.uploadService.deleteByUrl(previousUrl);
    }
  }

  /**
   * Gets a user by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Returns a specific user by their ID. ADMIN and MANAGER can view any user; others can only view their own profile.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Creates a new user in the tenant. Only ADMIN users can create users. Checks tenant user limit before creation.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or tenant limit reached',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    this.logger.log(`Creating user: ${dto.email}`);
    return this.usersService.create(dto);
  }

  /**
   * Updates a user.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a user',
    description:
      'Updates a user. ADMIN can update any user; other users can only update their own profile with limited fields.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to update',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot update this user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Deletes a user. Only ADMIN users can delete users. Users cannot delete themselves.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to delete',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Cannot delete yourself or insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);
    return this.usersService.delete(id, currentUser.userId);
  }

  /**
   * Changes a user's password.
   */
  @Patch(':id/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Change user password',
    description:
      'Changes a user password. Users can change their own password; ADMIN can change any user password. Requires current password for verification.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or current password incorrect',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot change this user password',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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
   */
  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve a pending user',
    description:
      'Changes user status from PENDING to ACTIVE. Only ADMIN users can approve users.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to approve',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'User approved successfully',
    type: UserEntity,
  })
  @ApiResponse({ status: 400, description: 'User is not in PENDING status' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approve(@Param('id') id: string): Promise<UserResponse> {
    this.logger.log(`Approving user: ${id}`);
    return this.usersService.approve(id);
  }

  /**
   * Suspends a user.
   */
  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Suspend a user',
    description:
      'Changes user status to SUSPENDED. Only ADMIN users can suspend users. Users cannot suspend themselves.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to suspend',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'User suspended successfully',
    type: UserEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Cannot suspend yourself or insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspend(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<UserResponse> {
    this.logger.log(`Suspending user: ${id}`);
    return this.usersService.suspend(id, currentUser.userId);
  }

  // ============================================================================
  // PERMISSIONS ENDPOINTS
  // ============================================================================

  /**
   * Gets the current user's effective permissions.
   */
  @Get('me/permissions')
  @ApiOperation({
    summary: 'Get current user permissions',
    description:
      'Returns the effective permissions for the currently authenticated user, combining role defaults with any custom overrides.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['pos:sell', 'inventory:view', 'invoices:create'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getMyPermissions(
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<{ permissions: string[] }> {
    this.logger.log(`Getting permissions for user: ${currentUser.userId}`);
    const permissions = await this.permissionsService.getUserPermissions(
      currentUser.userId,
      currentUser.role,
      currentUser.tenantId,
    );
    return { permissions };
  }

  /**
   * Gets a user's permissions (admin only).
   */
  @Get(':id/permissions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user permissions',
    description:
      'Returns the effective permissions for a specific user, including role defaults and any custom overrides. Only ADMIN can view other users permissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', example: 'EMPLOYEE' },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['pos:sell', 'inventory:view', 'invoices:create'],
        },
        overrides: {
          type: 'object',
          properties: {
            granted: {
              type: 'array',
              items: { type: 'string' },
              example: ['pos:refund'],
            },
            revoked: {
              type: 'array',
              items: { type: 'string' },
              example: [],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserPermissions(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<{
    role: UserRole;
    permissions: string[];
    overrides: { granted: string[]; revoked: string[] };
  }> {
    this.logger.log(`Getting permissions for user: ${id}`);

    // First verify the user exists and is in the same tenant
    const user = await this.usersService.findOne(id);

    const permissionsDetail =
      await this.permissionsService.getUserPermissionsDetail(
        id,
        user.role,
        currentUser.tenantId,
      );

    return {
      role: permissionsDetail.role,
      permissions: permissionsDetail.permissions,
      overrides: permissionsDetail.overrides,
    };
  }

  /**
   * Grants a permission to a user.
   */
  @Post(':id/permissions/grant')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant permission to user',
    description:
      'Grants a specific permission to a user, overriding their role default if the role does not include it. Only ADMIN can modify permissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission granted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Permission granted successfully' },
        permission: { type: 'string', example: 'pos:refund' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid permission' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async grantPermission(
    @Param('id') id: string,
    @Body() body: { permission: string; reason?: string },
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<{ message: string; permission: string }> {
    this.logger.log(`Granting permission ${body.permission} to user: ${id}`);

    // Verify the user exists and is in the same tenant
    await this.usersService.findOne(id);

    // Validate permission is valid
    if (!Object.values(Permission).includes(body.permission as Permission)) {
      throw new Error(`Invalid permission: ${body.permission}`);
    }

    await this.permissionsService.grantPermission(
      id,
      currentUser.tenantId,
      body.permission as Permission,
      currentUser.userId,
      body.reason,
    );

    return {
      message: 'Permission granted successfully',
      permission: body.permission,
    };
  }

  /**
   * Revokes a permission from a user.
   */
  @Post(':id/permissions/revoke')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke permission from user',
    description:
      'Revokes a specific permission from a user, even if their role normally grants it. Only ADMIN can modify permissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Permission revoked successfully',
        },
        permission: { type: 'string', example: 'pos:discount' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid permission' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async revokePermission(
    @Param('id') id: string,
    @Body() body: { permission: string; reason?: string },
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<{ message: string; permission: string }> {
    this.logger.log(`Revoking permission ${body.permission} from user: ${id}`);

    // Verify the user exists and is in the same tenant
    await this.usersService.findOne(id);

    // Validate permission is valid
    if (!Object.values(Permission).includes(body.permission as Permission)) {
      throw new Error(`Invalid permission: ${body.permission}`);
    }

    await this.permissionsService.revokePermission(
      id,
      currentUser.tenantId,
      body.permission as Permission,
      currentUser.userId,
      body.reason,
    );

    return {
      message: 'Permission revoked successfully',
      permission: body.permission,
    };
  }

  /**
   * Removes a permission override from a user.
   */
  @Delete(':id/permissions/:permission')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove permission override',
    description:
      'Removes a custom permission override from a user, reverting to the default behavior based on their role. Only ADMIN can modify permissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  @ApiParam({
    name: 'permission',
    description: 'Permission to remove override for',
    example: 'pos:refund',
  })
  @ApiResponse({
    status: 204,
    description: 'Permission override removed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid permission' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removePermissionOverride(
    @Param('id') id: string,
    @Param('permission') permission: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<void> {
    this.logger.log(`Removing permission override ${permission} from user: ${id}`);

    // Verify the user exists and is in the same tenant
    await this.usersService.findOne(id);

    // Validate permission is valid
    if (!Object.values(Permission).includes(permission as Permission)) {
      throw new Error(`Invalid permission: ${permission}`);
    }

    await this.permissionsService.removeOverride(
      id,
      currentUser.tenantId,
      permission as Permission,
    );
  }

  /**
   * Resets all permission overrides for a user.
   */
  @Delete(':id/permissions')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reset all permission overrides',
    description:
      'Removes all custom permission overrides from a user, reverting entirely to their role defaults. Only ADMIN can modify permissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: 'All permission overrides removed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPermissions(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserContext,
  ): Promise<void> {
    this.logger.log(`Resetting all permission overrides for user: ${id}`);

    // Verify the user exists and is in the same tenant
    await this.usersService.findOne(id);

    await this.permissionsService.removeAllOverrides(id, currentUser.tenantId);
  }
}
