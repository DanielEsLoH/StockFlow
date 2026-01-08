import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma';
import { RegisterDto } from './dto';
import { JwtPayload } from './types';
import {
  User,
  UserRole,
  UserStatus,
  TenantStatus,
  Tenant,
} from '@prisma/client';

// Re-export JwtPayload for backwards compatibility
export type { JwtPayload } from './types';

/**
 * User data returned after successful authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
}

/**
 * Response structure for login and registration
 */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Response structure for logout
 */
export interface LogoutResponse {
  message: string;
}

/**
 * AuthService handles all authentication-related operations including
 * user validation, token generation, registration, login, refresh, and logout.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates tenant status and throws appropriate error if inactive
   *
   * @param tenant - The tenant to validate
   * @throws ForbiddenException if tenant is SUSPENDED or INACTIVE
   */
  private validateTenantStatus(tenant: Tenant): void {
    if (tenant.status === TenantStatus.SUSPENDED) {
      this.logger.warn(`Access denied - tenant suspended: ${tenant.id}`);
      throw new ForbiddenException(
        'Your organization has been suspended. Please contact support.',
      );
    }

    if (tenant.status === TenantStatus.INACTIVE) {
      this.logger.warn(`Access denied - tenant inactive: ${tenant.id}`);
      throw new ForbiddenException(
        'Your organization account is inactive. Please contact support.',
      );
    }
  }

  /**
   * Validates user status and throws appropriate error if not allowed
   *
   * @param user - The user to validate
   * @throws ForbiddenException if user is SUSPENDED or INACTIVE
   */
  private validateUserStatus(user: User): void {
    if (user.status === UserStatus.SUSPENDED) {
      this.logger.warn(`Access denied - user suspended: ${user.email}`);
      throw new ForbiddenException(
        'Your account has been suspended. Please contact your administrator.',
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      this.logger.warn(`Access denied - user inactive: ${user.email}`);
      throw new ForbiddenException(
        'Your account is inactive. Please contact your administrator.',
      );
    }
    // PENDING status is allowed for login - user can access limited features
  }

  /**
   * Validates a user by email and password (basic credential check only)
   *
   * @param email - User's email address
   * @param password - Plain text password to verify
   * @returns The user with tenant if validation succeeds, null otherwise
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<(User & { tenant: Tenant }) | null> {
    this.logger.debug(`Validating user: ${email}`);

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.debug(`User not found: ${email}`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.debug(`Invalid password for user: ${email}`);
      return null;
    }

    this.logger.debug(`User credentials validated: ${email}`);
    return user;
  }

  /**
   * Authenticates a user and generates access and refresh tokens
   *
   * @param email - User's email address
   * @param password - Plain text password
   * @returns Authentication response with user data and tokens
   * @throws UnauthorizedException if credentials are invalid
   * @throws ForbiddenException if tenant or user is suspended/inactive
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Validate tenant status first
    this.validateTenantStatus(user.tenant);

    // Validate user status (PENDING is allowed)
    this.validateUserStatus(user);

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.tenantId,
    );

    // Update refresh token and lastLoginAt in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      user: this.mapToAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Registers a new user with the provided details
   *
   * @param dto - Registration data transfer object
   * @returns Authentication response with user data and tokens
   * @throws ConflictException if email already exists for the tenant
   * @throws NotFoundException if tenant doesn't exist
   * @throws ForbiddenException if tenant is suspended/inactive
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, tenantId } = dto;
    const normalizedEmail = email.toLowerCase();

    this.logger.debug(`Registering new user: ${normalizedEmail}`);

    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      this.logger.warn(`Registration failed - tenant not found: ${tenantId}`);
      throw new NotFoundException('Tenant not found');
    }

    // Validate tenant status
    this.validateTenantStatus(tenant);

    // Check if user already exists for this tenant (compound key)
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: normalizedEmail,
        },
      },
    });

    if (existingUser) {
      this.logger.warn(
        `Registration failed - user already exists: ${normalizedEmail}`,
      );
      throw new ConflictException('A user with this email already exists');
    }

    // Hash password with bcrypt (salt rounds 12)
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create user with PENDING status and EMPLOYEE role
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        tenantId,
        status: UserStatus.PENDING,
        role: UserRole.EMPLOYEE,
      },
    });

    // Generate tokens so user can access limited features while pending
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.tenantId,
    );

    // Store refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    this.logger.log(`User registered successfully: ${user.email}`);

    return {
      user: this.mapToAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Refreshes access token using a valid refresh token
   *
   * @param refreshToken - The refresh token to validate
   * @returns New authentication response with fresh tokens
   * @throws UnauthorizedException if refresh token is invalid or expired
   * @throws ForbiddenException if tenant or user is suspended/inactive
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    this.logger.debug('Processing token refresh request');

    // Verify the refresh token - wrap only JWT verification in try-catch
    let payload: JwtPayload;
    try {
      const jwtRefreshSecret =
        this.configService.get<string>('jwt.refreshSecret');

      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtRefreshSecret,
      });
    } catch {
      this.logger.warn('Token refresh failed - invalid or expired token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Ensure it's a refresh token, not an access token
    if (payload.type !== 'refresh') {
      this.logger.warn('Invalid token type for refresh');
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find the user and verify the stored refresh token matches
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`Refresh failed - user not found: ${payload.sub}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify the refresh token matches what's stored in the database
    if (user.refreshToken !== refreshToken) {
      this.logger.warn(
        `Refresh failed - token mismatch for user: ${user.email}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Validate tenant status
    this.validateTenantStatus(user.tenant);

    // Validate user status
    this.validateUserStatus(user);

    // Generate new tokens (token rotation for security)
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.tenantId,
    );

    // Update the stored refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    this.logger.log(`Tokens refreshed successfully for user: ${user.email}`);

    return {
      user: this.mapToAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logs out a user by invalidating their refresh token
   *
   * @param userId - The ID of the user to log out
   * @returns Logout confirmation message
   * @throws NotFoundException if user is not found
   */
  async logout(userId: string): Promise<LogoutResponse> {
    this.logger.debug(`Processing logout for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`Logout failed - user not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Invalidate the refresh token
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    this.logger.log(`User logged out successfully: ${user.email}`);

    return { message: 'Logged out successfully' };
  }

  /**
   * Generates access and refresh tokens for a user
   *
   * @param userId - User's unique identifier
   * @param email - User's email address
   * @param role - User's role
   * @param tenantId - User's tenant identifier
   * @returns Object containing access and refresh tokens
   */
  async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    tenantId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtSecret = this.configService.get<string>('jwt.secret');
    const jwtExpiration =
      this.configService.get<string>('jwt.expiration') ?? '15m';
    const jwtRefreshSecret =
      this.configService.get<string>('jwt.refreshSecret');
    const jwtRefreshExpiration =
      this.configService.get<string>('jwt.refreshExpiration') ?? '7d';

    const accessTokenPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      tenantId,
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      tenantId,
      type: 'refresh',
    };

    // Cast expiresIn to satisfy the JwtSignOptions type
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
   * Maps a User entity to an AuthUser response object
   *
   * @param user - The user entity to map
   * @returns AuthUser object with safe user data
   */
  private mapToAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
    };
  }
}
