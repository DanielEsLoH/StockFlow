import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma';
import { UserStatus, SubscriptionPlan, TenantStatus } from '@prisma/client';
import {
  SystemAdminRole,
  SystemAdminStatus,
  SystemAdminJwtPayload,
  SystemAdminAuthResponse,
  SystemAdminAuthUser,
  SystemAdminLogoutResponse,
  UserListItem,
  TenantListItem,
  PaginatedResponse,
  UserActionResult,
  TenantActionResult,
} from './types';
import {
  UsersQueryDto,
  PendingUsersQueryDto,
  TenantsQueryDto,
} from './dto';

/**
 * SystemAdminService handles all system admin operations including:
 * - Authentication (login, logout, token refresh)
 * - User management (approve, suspend, delete, list)
 * - Tenant management (change plans, list)
 *
 * This service operates independently of tenant-specific data and has
 * access to all users and tenants in the system.
 */
@Injectable()
export class SystemAdminService {
  private readonly logger = new Logger(SystemAdminService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Authenticates a system admin and generates access and refresh tokens
   *
   * @param email - System admin's email address
   * @param password - Plain text password
   * @returns Authentication response with admin data and tokens
   * @throws UnauthorizedException if credentials are invalid or admin is not active
   */
  async login(email: string, password: string): Promise<SystemAdminAuthResponse> {
    this.logger.debug(`System admin login attempt: ${email}`);

    const admin = await this.prisma.systemAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      this.logger.warn(`System admin login failed - not found: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      this.logger.warn(`System admin login failed - invalid password: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify admin is active
    if (admin.status !== SystemAdminStatus.ACTIVE) {
      this.logger.warn(
        `System admin login failed - not active: ${email}, status: ${admin.status}`,
      );
      throw new UnauthorizedException('System admin account is not active');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      admin.id,
      admin.email,
      admin.role as SystemAdminRole,
    );

    // Update refresh token and lastLoginAt in database
    await this.prisma.systemAdmin.update({
      where: { id: admin.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(`System admin logged in successfully: ${admin.email}`);

    return {
      admin: this.mapToAuthUser(admin),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logs out a system admin by invalidating their refresh token
   *
   * @param adminId - The ID of the admin to log out
   * @returns Logout confirmation message
   * @throws NotFoundException if admin is not found
   */
  async logout(adminId: string): Promise<SystemAdminLogoutResponse> {
    this.logger.debug(`System admin logout request: ${adminId}`);

    const admin = await this.prisma.systemAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      this.logger.warn(`System admin logout failed - not found: ${adminId}`);
      throw new NotFoundException('System admin not found');
    }

    // Invalidate the refresh token
    await this.prisma.systemAdmin.update({
      where: { id: adminId },
      data: { refreshToken: null },
    });

    this.logger.log(`System admin logged out successfully: ${admin.email}`);

    return { message: 'Logged out successfully' };
  }

  /**
   * Refreshes access token using a valid refresh token
   *
   * @param refreshToken - The refresh token to validate
   * @returns New authentication response with fresh tokens
   * @throws UnauthorizedException if refresh token is invalid or expired
   */
  async refreshTokens(refreshToken: string): Promise<SystemAdminAuthResponse> {
    this.logger.debug('System admin token refresh request');

    // Verify the refresh token
    let payload: SystemAdminJwtPayload;
    try {
      const jwtRefreshSecret = this.configService.get<string>(
        'SYSTEM_ADMIN_JWT_REFRESH_SECRET',
      );

      payload = await this.jwtService.verifyAsync<SystemAdminJwtPayload>(
        refreshToken,
        { secret: jwtRefreshSecret },
      );
    } catch {
      this.logger.warn('System admin token refresh failed - invalid or expired token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify token type
    if (payload.type !== 'refresh') {
      this.logger.warn('Invalid token type for system admin refresh');
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify it's a system admin token
    if (!payload.isSystemAdmin) {
      this.logger.warn('Token is not a system admin token');
      throw new UnauthorizedException('Invalid system admin token');
    }

    // Find the admin and verify stored token matches
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin) {
      this.logger.warn(`System admin refresh failed - not found: ${payload.sub}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (admin.refreshToken !== refreshToken) {
      this.logger.warn(`System admin refresh failed - token mismatch: ${admin.email}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify admin is active
    if (admin.status !== SystemAdminStatus.ACTIVE) {
      this.logger.warn(
        `System admin refresh failed - not active: ${admin.email}, status: ${admin.status}`,
      );
      throw new UnauthorizedException('System admin account is not active');
    }

    // Generate new tokens (token rotation)
    const tokens = await this.generateTokens(
      admin.id,
      admin.email,
      admin.role as SystemAdminRole,
    );

    // Update stored refresh token
    await this.prisma.systemAdmin.update({
      where: { id: admin.id },
      data: { refreshToken: tokens.refreshToken },
    });

    this.logger.log(`System admin tokens refreshed successfully: ${admin.email}`);

    return {
      admin: this.mapToAuthUser(admin),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Gets the current authenticated system admin's information
   *
   * @param adminId - The ID of the admin to fetch
   * @returns System admin data
   * @throws NotFoundException if admin is not found
   */
  async getMe(adminId: string): Promise<SystemAdminAuthUser> {
    this.logger.debug(`Get system admin info: ${adminId}`);

    const admin = await this.prisma.systemAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      this.logger.warn(`System admin not found: ${adminId}`);
      throw new NotFoundException('System admin not found');
    }

    return this.mapToAuthUser(admin);
  }

  // ============================================================================
  // USER MANAGEMENT METHODS
  // ============================================================================

  /**
   * Gets all users with optional filters and pagination
   *
   * @param query - Query filters and pagination options
   * @returns Paginated list of users
   */
  async getAllUsers(query: UsersQueryDto): Promise<PaginatedResponse<UserListItem>> {
    const { page = 1, limit = 20, status, role, tenantId, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and users in parallel
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { tenant: { select: { name: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    this.logger.debug(`Retrieved ${users.length} users (total: ${total})`);

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Gets all pending users awaiting approval
   *
   * @param query - Query filters and pagination options
   * @returns Paginated list of pending users
   */
  async getPendingUsers(
    query: PendingUsersQueryDto,
  ): Promise<PaginatedResponse<UserListItem>> {
    const { page = 1, limit = 20, tenantId, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause - always filter by PENDING status
    const where: Record<string, unknown> = {
      status: UserStatus.PENDING,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and users in parallel
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { tenant: { select: { name: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // Oldest first (FIFO)
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    this.logger.debug(`Retrieved ${users.length} pending users (total: ${total})`);

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Approves a pending user, changing their status from PENDING to ACTIVE
   *
   * @param userId - The ID of the user to approve
   * @param adminId - The ID of the admin performing the action
   * @returns Action result
   * @throws NotFoundException if user is not found
   * @throws BadRequestException if user is not in PENDING status or email is not verified
   */
  async approveUser(userId: string, adminId: string): Promise<UserActionResult> {
    this.logger.debug(`Approving user: ${userId} by admin: ${adminId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        `User is not in PENDING status. Current status: ${user.status}`,
      );
    }

    // Check if email is verified before allowing approval
    if (!user.emailVerified) {
      throw new BadRequestException(
        'Cannot approve user: email address has not been verified. The user must verify their email before approval.',
      );
    }

    // Update user status to ACTIVE
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    // Create audit log for this action
    await this.createSystemAdminAuditLog(adminId, 'APPROVE_USER', 'User', userId, {
      previousStatus: user.status,
      newStatus: UserStatus.ACTIVE,
      userEmail: user.email,
      tenantName: user.tenant.name,
    });

    this.logger.log(`User approved successfully: ${user.email} by admin: ${adminId}`);

    return {
      success: true,
      message: `User ${user.email} has been approved successfully`,
      userId,
      action: 'approve',
    };
  }

  /**
   * Suspends an active user
   *
   * @param userId - The ID of the user to suspend
   * @param adminId - The ID of the admin performing the action
   * @param reason - Optional reason for suspension
   * @returns Action result
   * @throws NotFoundException if user is not found
   * @throws BadRequestException if user is already suspended
   */
  async suspendUser(
    userId: string,
    adminId: string,
    reason?: string,
  ): Promise<UserActionResult> {
    this.logger.debug(`Suspending user: ${userId} by admin: ${adminId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('User is already suspended');
    }

    // Update user status to SUSPENDED
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        refreshToken: null, // Invalidate any existing sessions
      },
    });

    // Create audit log
    await this.createSystemAdminAuditLog(adminId, 'SUSPEND_USER', 'User', userId, {
      previousStatus: user.status,
      newStatus: UserStatus.SUSPENDED,
      userEmail: user.email,
      tenantName: user.tenant.name,
      reason,
    });

    this.logger.log(`User suspended successfully: ${user.email} by admin: ${adminId}`);

    return {
      success: true,
      message: `User ${user.email} has been suspended${reason ? `. Reason: ${reason}` : ''}`,
      userId,
      action: 'suspend',
    };
  }

  /**
   * Deletes a user and creates an audit log entry
   *
   * @param userId - The ID of the user to delete
   * @param adminId - The ID of the admin performing the action
   * @param reason - Optional reason for deletion
   * @returns Action result
   * @throws NotFoundException if user is not found
   * @throws BadRequestException if trying to delete the last admin of a tenant
   */
  async deleteUser(
    userId: string,
    adminId: string,
    reason?: string,
  ): Promise<UserActionResult> {
    this.logger.debug(`Deleting user: ${userId} by admin: ${adminId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if this is the last admin of the tenant
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: {
          tenantId: user.tenantId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          id: { not: userId },
        },
      });

      if (adminCount === 0) {
        throw new BadRequestException(
          'Cannot delete the last admin of a tenant. Please assign another admin first or delete the entire tenant.',
        );
      }
    }

    // Store user data for audit log before deletion
    const userData = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
    };

    // Delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });

    // Create audit log
    await this.createSystemAdminAuditLog(adminId, 'DELETE_USER', 'User', userId, {
      ...userData,
      reason,
    });

    this.logger.log(`User deleted successfully: ${userData.email} by admin: ${adminId}`);

    return {
      success: true,
      message: `User ${userData.email} has been deleted${reason ? `. Reason: ${reason}` : ''}`,
      userId,
      action: 'delete',
    };
  }

  // ============================================================================
  // TENANT MANAGEMENT METHODS
  // ============================================================================

  /**
   * Gets all tenants with optional filters and pagination
   *
   * @param query - Query filters and pagination options
   * @returns Paginated list of tenants
   */
  async getAllTenants(
    query: TenantsQueryDto,
  ): Promise<PaginatedResponse<TenantListItem>> {
    const { page = 1, limit = 20, status, plan, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (plan) {
      where.plan = plan;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and tenants with user count in parallel
    const [total, tenants] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: { users: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    this.logger.debug(`Retrieved ${tenants.length} tenants (total: ${total})`);

    return {
      data: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        status: tenant.status,
        plan: tenant.plan,
        userCount: tenant._count.users,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Changes a tenant's subscription plan
   *
   * @param tenantId - The ID of the tenant
   * @param plan - The new subscription plan
   * @param adminId - The ID of the admin performing the action
   * @returns Action result with previous and new plan
   * @throws NotFoundException if tenant is not found
   * @throws ConflictException if tenant already has the specified plan
   */
  async changeTenantPlan(
    tenantId: string,
    plan: SubscriptionPlan,
    adminId: string,
  ): Promise<TenantActionResult> {
    this.logger.debug(
      `Changing tenant plan: ${tenantId} to ${plan} by admin: ${adminId}`,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    if (tenant.plan === plan) {
      throw new ConflictException(`Tenant already has the ${plan} plan`);
    }

    const previousPlan = tenant.plan;

    // Determine new limits based on plan
    const planLimits = this.getPlanLimits(plan);

    // Update tenant plan and limits
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        ...planLimits,
        // If upgrading from TRIAL or setting to paid plan, ensure tenant is ACTIVE
        status:
          tenant.status === TenantStatus.TRIAL && plan !== SubscriptionPlan.FREE
            ? TenantStatus.ACTIVE
            : tenant.status,
      },
    });

    // Create audit log
    await this.createSystemAdminAuditLog(
      adminId,
      'CHANGE_TENANT_PLAN',
      'Tenant',
      tenantId,
      {
        tenantName: tenant.name,
        previousPlan,
        newPlan: plan,
        newLimits: planLimits,
      },
    );

    this.logger.log(
      `Tenant plan changed successfully: ${tenant.name} from ${previousPlan} to ${plan} by admin: ${adminId}`,
    );

    return {
      success: true,
      message: `Tenant ${tenant.name} plan changed from ${previousPlan} to ${plan}`,
      tenantId,
      action: 'change_plan',
      previousPlan,
      newPlan: plan,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generates access and refresh tokens for a system admin
   */
  private async generateTokens(
    adminId: string,
    email: string,
    role: SystemAdminRole,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtSecret = this.configService.get<string>('SYSTEM_ADMIN_JWT_SECRET');
    const jwtExpiration =
      this.configService.get<string>('SYSTEM_ADMIN_JWT_EXPIRATION') ?? '15m';
    const jwtRefreshSecret = this.configService.get<string>(
      'SYSTEM_ADMIN_JWT_REFRESH_SECRET',
    );
    const jwtRefreshExpiration =
      this.configService.get<string>('SYSTEM_ADMIN_JWT_REFRESH_EXPIRATION') ?? '7d';

    const accessTokenPayload: SystemAdminJwtPayload = {
      sub: adminId,
      email,
      role,
      type: 'access',
      isSystemAdmin: true,
    };

    const refreshTokenPayload: SystemAdminJwtPayload = {
      sub: adminId,
      email,
      role,
      type: 'refresh',
      isSystemAdmin: true,
    };

    const accessTokenOptions: JwtSignOptions = {
      secret: jwtSecret,
      expiresIn: jwtExpiration as JwtSignOptions['expiresIn'],
    };

    const refreshTokenOptions: JwtSignOptions = {
      secret: jwtRefreshSecret,
      expiresIn: jwtRefreshExpiration as JwtSignOptions['expiresIn'],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, accessTokenOptions),
      this.jwtService.signAsync(refreshTokenPayload, refreshTokenOptions),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Maps a SystemAdmin entity to an AuthUser response object
   */
  private mapToAuthUser(admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  }): SystemAdminAuthUser {
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role as SystemAdminRole,
      status: admin.status as SystemAdminStatus,
    };
  }

  /**
   * Gets plan-specific resource limits
   */
  private getPlanLimits(plan: SubscriptionPlan): {
    maxUsers: number;
    maxProducts: number;
    maxInvoices: number;
    maxWarehouses: number;
  } {
    switch (plan) {
      case SubscriptionPlan.FREE:
        return {
          maxUsers: 2,
          maxProducts: 50,
          maxInvoices: 100,
          maxWarehouses: 1,
        };
      case SubscriptionPlan.BASIC:
        return {
          maxUsers: 5,
          maxProducts: 500,
          maxInvoices: 1000,
          maxWarehouses: 2,
        };
      case SubscriptionPlan.PRO:
        return {
          maxUsers: 20,
          maxProducts: 5000,
          maxInvoices: 10000,
          maxWarehouses: 5,
        };
      case SubscriptionPlan.ENTERPRISE:
        return {
          maxUsers: -1, // Unlimited
          maxProducts: -1,
          maxInvoices: -1,
          maxWarehouses: -1,
        };
      default:
        return {
          maxUsers: 5,
          maxProducts: -1,
          maxInvoices: -1,
          maxWarehouses: 1,
        };
    }
  }

  /**
   * Creates an audit log entry for system admin actions
   */
  private async createSystemAdminAuditLog(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.systemAdminAuditLog.create({
        data: {
          adminId,
          action,
          entityType,
          entityId,
          details: details as object,
        },
      });
    } catch (error) {
      // Log but don't fail the main operation if audit log fails
      this.logger.error(
        `Failed to create system admin audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
