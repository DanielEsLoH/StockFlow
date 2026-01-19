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
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SystemAdminService } from './system-admin.service';
import {
  SystemAdminLoginDto,
  UserIdParamDto,
  TenantIdParamDto,
  ChangePlanDto,
  SuspendUserDto,
  DeleteUserDto,
  UsersQueryDto,
  PendingUsersQueryDto,
  TenantsQueryDto,
} from './dto';
import {
  SystemAdminAuthResponseEntity,
  SystemAdminLogoutResponseEntity,
  SystemAdminUserEntity,
  UserListResponseEntity,
  TenantListResponseEntity,
  UserActionResultEntity,
  TenantActionResultEntity,
} from './entities';
import {
  SystemAdminAuthGuard,
  SystemAdminRoleGuard,
  SystemAdminRoles,
} from './guards';
import { CurrentAdmin } from './decorators';
import { SystemAdminRole } from './types';
import type {
  SystemAdminRequestUser,
  SystemAdminAuthResponse,
  SystemAdminLogoutResponse,
  SystemAdminAuthUser,
  PaginatedResponse,
  UserListItem,
  TenantListItem,
  UserActionResult,
  TenantActionResult,
} from './types';
import { Public } from '../common/decorators';

/**
 * SystemAdminController handles all system administration endpoints.
 *
 * These endpoints are completely separate from tenant user endpoints and use
 * a different JWT secret for security isolation.
 *
 * All endpoints (except login) require system admin authentication.
 * Some endpoints require specific system admin roles.
 */
@ApiTags('system-admin')
@Controller('system-admin')
export class SystemAdminController {
  private readonly logger = new Logger(SystemAdminController.name);

  constructor(private readonly systemAdminService: SystemAdminService) {}

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  /**
   * Authenticates a system admin and returns access tokens
   *
   * @param loginDto - System admin login credentials
   * @returns Authentication response with admin data and tokens
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'System admin login',
    description:
      'Authenticates a system admin with email and password, returning JWT access and refresh tokens.',
  })
  @ApiBody({ type: SystemAdminLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: SystemAdminAuthResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account not active',
  })
  async login(
    @Body() loginDto: SystemAdminLoginDto,
  ): Promise<SystemAdminAuthResponse> {
    this.logger.log(`System admin login request: ${loginDto.email}`);
    return this.systemAdminService.login(loginDto.email, loginDto.password);
  }

  /**
   * Logs out a system admin by invalidating their refresh token
   *
   * @param admin - Current admin context from JWT
   * @returns Logout confirmation message
   */
  @Post('logout')
  @UseGuards(SystemAdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'System admin logout',
    description:
      'Invalidates the system admin refresh token and logs them out of the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    type: SystemAdminLogoutResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  async logout(
    @CurrentAdmin() admin: SystemAdminRequestUser,
  ): Promise<SystemAdminLogoutResponse> {
    this.logger.log(`System admin logout request: ${admin.email}`);
    return this.systemAdminService.logout(admin.adminId);
  }

  /**
   * Gets the current authenticated system admin's information
   *
   * @param admin - Current admin context from JWT
   * @returns System admin data
   */
  @Get('me')
  @UseGuards(SystemAdminAuthGuard)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'Get current system admin',
    description: 'Returns the currently authenticated system admin information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current system admin information',
    type: SystemAdminUserEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  async getMe(
    @CurrentAdmin() admin: SystemAdminRequestUser,
  ): Promise<SystemAdminAuthUser> {
    this.logger.log(`Get me request for system admin: ${admin.email}`);
    return this.systemAdminService.getMe(admin.adminId);
  }

  // ============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * Gets all users with optional filters and pagination
   *
   * Accessible by: SUPER_ADMIN, SUPPORT
   *
   * @param query - Query filters and pagination options
   * @returns Paginated list of users
   */
  @Get('users')
  @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
  @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN, SystemAdminRole.SUPPORT)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns a paginated list of all users across all tenants with optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    type: UserListResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getAllUsers(
    @Query() query: UsersQueryDto,
  ): Promise<PaginatedResponse<UserListItem>> {
    this.logger.log('Get all users request');
    return this.systemAdminService.getAllUsers(query);
  }

  /**
   * Gets all pending users awaiting approval
   *
   * Accessible by: SUPER_ADMIN, SUPPORT
   *
   * @param query - Query filters and pagination options
   * @returns Paginated list of pending users
   */
  @Get('users/pending')
  @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
  @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN, SystemAdminRole.SUPPORT)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'List pending users',
    description:
      'Returns a paginated list of users with PENDING status awaiting approval.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pending users',
    type: UserListResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getPendingUsers(
    @Query() query: PendingUsersQueryDto,
  ): Promise<PaginatedResponse<UserListItem>> {
    this.logger.log('Get pending users request');
    return this.systemAdminService.getPendingUsers(query);
  }

  /**
   * Approves a pending user, changing their status to ACTIVE
   *
   * Accessible by: SUPER_ADMIN, SUPPORT
   *
   * @param params - URL parameters containing user ID
   * @param admin - Current admin context from JWT
   * @returns Action result
   */
  @Post('users/:id/approve')
  @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
  @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN, SystemAdminRole.SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'Approve a user',
    description:
      'Approves a pending user, changing their status from PENDING to ACTIVE.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to approve',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'User approved successfully',
    type: UserActionResultEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'User is not in PENDING status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async approveUser(
    @Param() params: UserIdParamDto,
    @CurrentAdmin() admin: SystemAdminRequestUser,
  ): Promise<UserActionResult> {
    this.logger.log(`Approve user request: ${params.id} by admin: ${admin.email}`);
    return this.systemAdminService.approveUser(params.id, admin.adminId);
  }

  /**
   * Suspends an active user
   *
   * Accessible by: SUPER_ADMIN, SUPPORT
   *
   * @param params - URL parameters containing user ID
   * @param body - Optional suspension reason
   * @param admin - Current admin context from JWT
   * @returns Action result
   */
  @Post('users/:id/suspend')
  @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
  @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN, SystemAdminRole.SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'Suspend a user',
    description: 'Suspends an active user, preventing them from logging in.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to suspend',
    example: 'clx1234567890abcdef',
  })
  @ApiBody({ type: SuspendUserDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'User suspended successfully',
    type: UserActionResultEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'User is already suspended',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async suspendUser(
    @Param() params: UserIdParamDto,
    @Body() body: SuspendUserDto,
    @CurrentAdmin() admin: SystemAdminRequestUser,
  ): Promise<UserActionResult> {
    this.logger.log(`Suspend user request: ${params.id} by admin: ${admin.email}`);
    return this.systemAdminService.suspendUser(params.id, admin.adminId, body.reason);
  }

  /**
   * Deletes a user
   *
   * Accessible by: SUPER_ADMIN only
   *
   * @param params - URL parameters containing user ID
   * @param body - Optional deletion reason
   * @param admin - Current admin context from JWT
   * @returns Action result
   */
  @Delete('users/:id')
  @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
  @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Permanently deletes a user. This action cannot be undone. Only SUPER_ADMIN can perform this action.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to delete',
    example: 'clx1234567890abcdef',
  })
  @ApiBody({ type: DeleteUserDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: UserActionResultEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete the last admin of a tenant',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only SUPER_ADMIN can delete users',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteUser(
    @Param() params: UserIdParamDto,
    @Body() body: DeleteUserDto,
    @CurrentAdmin() admin: SystemAdminRequestUser,
  ): Promise<UserActionResult> {
    this.logger.log(`Delete user request: ${params.id} by admin: ${admin.email}`);
    return this.systemAdminService.deleteUser(params.id, admin.adminId, body.reason);
  }

  // ============================================================================
  // TENANT MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * Gets all tenants with optional filters and pagination
   *
   * Accessible by: SUPER_ADMIN, BILLING
   *
   * @param query - Query filters and pagination options
   * @returns Paginated list of tenants
   */
  @Get('tenants')
  @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
  @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN, SystemAdminRole.BILLING)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'List all tenants',
    description:
      'Returns a paginated list of all tenants with optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of tenants',
    type: TenantListResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getAllTenants(
    @Query() query: TenantsQueryDto,
  ): Promise<PaginatedResponse<TenantListItem>> {
    this.logger.log('Get all tenants request');
    return this.systemAdminService.getAllTenants(query);
  }

  /**
   * Changes a tenant's subscription plan
   *
   * Accessible by: SUPER_ADMIN, BILLING
   *
   * @param params - URL parameters containing tenant ID
   * @param body - New plan details
   * @param admin - Current admin context from JWT
   * @returns Action result with previous and new plan
   */
  @Patch('tenants/:id/plan')
  @UseGuards(SystemAdminAuthGuard, SystemAdminRoleGuard)
  @SystemAdminRoles(SystemAdminRole.SUPER_ADMIN, SystemAdminRole.BILLING)
  @ApiBearerAuth('SystemAdmin-JWT')
  @ApiOperation({
    summary: 'Change tenant subscription plan',
    description:
      "Changes a tenant's subscription plan and updates their resource limits accordingly.",
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'clx1234567890tenant',
  })
  @ApiBody({ type: ChangePlanDto })
  @ApiResponse({
    status: 200,
    description: 'Plan changed successfully',
    type: TenantActionResultEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid plan',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant already has the specified plan',
  })
  async changeTenantPlan(
    @Param() params: TenantIdParamDto,
    @Body() body: ChangePlanDto,
    @CurrentAdmin() admin: SystemAdminRequestUser,
  ): Promise<TenantActionResult> {
    this.logger.log(
      `Change tenant plan request: ${params.id} to ${body.plan} by admin: ${admin.email}`,
    );
    return this.systemAdminService.changeTenantPlan(
      params.id,
      body.plan,
      admin.adminId,
    );
  }
}
