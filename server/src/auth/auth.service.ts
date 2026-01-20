import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  GoneException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma';
import { RegisterDto, AcceptInvitationDto } from './dto';
import { JwtPayload } from './types';
import { InvitationsService } from '../invitations/invitations.service';
import {
  User,
  UserRole,
  UserStatus,
  TenantStatus,
  Tenant,
  InvitationStatus,
} from '@prisma/client';
import { BrevoService } from '../notifications/mail/brevo.service';

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
 * Tenant data returned after successful authentication
 */
export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
}

/**
 * Response structure for login
 */
export interface AuthResponse {
  user: AuthUser;
  tenant: AuthTenant;
  accessToken: string;
  refreshToken: string;
}

/**
 * Response structure for registration (pending approval)
 */
export interface RegisterResponse {
  message: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
  tenant: {
    name: string;
  };
}

/**
 * Response structure for logout
 */
export interface LogoutResponse {
  message: string;
}

/**
 * Response structure for email verification
 */
export interface VerifyEmailResponse {
  message: string;
}

/**
 * Response structure for resend verification
 */
export interface ResendVerificationResponse {
  message: string;
}

/**
 * Response structure for getting invitation details
 */
export interface InvitationDetailsResponse {
  email: string;
  tenantName: string;
  invitedByName: string;
  role: UserRole;
  expiresAt: Date;
}

/**
 * Response structure for accepting invitation
 */
export interface AcceptInvitationResponse {
  message: string;
  user: AuthUser;
  tenant: AuthTenant;
  accessToken: string;
  refreshToken: string;
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
    private readonly brevoService: BrevoService,
    @Inject(forwardRef(() => InvitationsService))
    private readonly invitationsService: InvitationsService,
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
      tenant: this.mapToAuthTenant(user.tenant),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Generates a URL-safe slug from a tenant name
   *
   * @param name - The tenant name to convert to a slug
   * @returns A lowercase, hyphenated slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Generates a secure verification token
   *
   * @returns A 64-character hex string (32 bytes)
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Registers a new user and creates a new tenant (company)
   * User is created with PENDING status and requires super admin approval
   * A verification email is sent to confirm the user's email address
   *
   * @param dto - Registration data transfer object
   * @returns Registration confirmation message (no tokens - pending approval)
   * @throws ConflictException if email already exists globally
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const { email, password, firstName, lastName, tenantName } = dto;
    const normalizedEmail = email.toLowerCase();

    this.logger.debug(`Registering new user: ${normalizedEmail}`);

    // Check if email already exists globally (email should be unique across all tenants for self-registration)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      this.logger.warn(
        `Registration failed - user already exists: ${normalizedEmail}`,
      );
      throw new ConflictException('A user with this email already exists');
    }

    // Generate a unique slug for the tenant
    const baseSlug = this.generateSlug(tenantName);
    let slug = baseSlug;
    let slugCounter = 1;

    // Ensure slug is unique
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Hash password with bcrypt (salt rounds 12)
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Generate verification token and set expiry to 24 hours from now
    const verificationToken = this.generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create tenant and user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the tenant with TRIAL status (pending approval)
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
          email: normalizedEmail,
          status: TenantStatus.TRIAL, // Trial until approved
        },
      });

      // Create user as ADMIN of the new tenant with PENDING status
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          tenantId: tenant.id,
          status: UserStatus.PENDING, // Requires super admin approval
          role: UserRole.ADMIN, // Admin since they created the company
          emailVerified: false,
          verificationToken,
          verificationTokenExpiry,
        },
      });

      return { user, tenant };
    });

    this.logger.log(
      `User registered (pending email verification): ${result.user.email}, tenant: ${result.tenant.name}`,
    );

    // Send notification emails asynchronously - don't block registration on email delivery
    this.sendRegistrationEmails(
      result.user,
      result.tenant,
      verificationToken,
    ).catch((error) => {
      // This catch is a safety net - errors should already be handled inside sendRegistrationEmails
      this.logger.error(
        'Unexpected error in sendRegistrationEmails',
        error instanceof Error ? error.stack : undefined,
      );
    });

    return {
      message:
        'Registration successful. Please check your email to verify your address. After verification, your account will be reviewed by an administrator.',
      user: {
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      tenant: {
        name: result.tenant.name,
      },
    };
  }

  /**
   * Sends registration notification emails: verification email to user and notification to admin
   * Uses Promise.allSettled to ensure both emails are attempted independently
   * Logs errors but does not throw - registration should succeed even if emails fail
   *
   * @param user - The newly registered user
   * @param tenant - The newly created tenant
   * @param verificationToken - The email verification token
   */
  private async sendRegistrationEmails(
    user: { email: string; firstName: string; lastName: string },
    tenant: { name: string },
    verificationToken: string,
  ): Promise<void> {
    const userName = `${user.firstName} ${user.lastName}`;
    const registrationDate = new Date();
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const emailPromises = [
      // Admin notification email
      this.brevoService.sendAdminNewRegistrationNotification({
        userEmail: user.email,
        userName,
        tenantName: tenant.name,
        registrationDate,
      }),
      // User verification email (NOT confirmation - they need to verify first)
      this.brevoService.sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        verificationUrl,
      }),
    ];

    const results = await Promise.allSettled(emailPromises);

    // Log results for monitoring
    results.forEach((result, index) => {
      const emailType = index === 0 ? 'admin notification' : 'verification';
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          this.logger.log(
            `Registration ${emailType} email sent successfully for user: ${user.email}`,
          );
        } else {
          this.logger.warn(
            `Registration ${emailType} email failed for user: ${user.email} - ${result.value.error}`,
          );
        }
      } else {
        this.logger.error(
          `Registration ${emailType} email threw error for user: ${user.email}`,
          result.reason instanceof Error ? result.reason.stack : undefined,
        );
      }
    });
  }

  /**
   * Verifies a user's email address using the verification token
   *
   * @param token - The verification token sent to the user's email
   * @returns Success message
   * @throws BadRequestException if token is invalid
   * @throws Gone if token has expired (24h)
   */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    this.logger.debug(
      `Verifying email with token: ${token.substring(0, 8)}...`,
    );

    // Find user by verification token
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      this.logger.warn('Email verification failed - invalid token');
      throw new BadRequestException(
        'Invalid verification token. Please request a new verification email.',
      );
    }

    // Check if token has expired (24 hours)
    if (
      user.verificationTokenExpiry &&
      user.verificationTokenExpiry < new Date()
    ) {
      this.logger.warn(
        `Email verification failed - token expired for user: ${user.email}`,
      );
      throw new GoneException(
        'Verification token has expired. Please request a new verification email.',
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      this.logger.debug(`Email already verified for user: ${user.email}`);
      return {
        message: 'Your email has already been verified.',
      };
    }

    // Update user: set emailVerified = true and clear the token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    this.logger.log(`Email verified successfully for user: ${user.email}`);

    return {
      message:
        'Email verified successfully. Your account is now pending approval by an administrator.',
    };
  }

  /**
   * Resends the verification email to a user
   * For security, always returns a generic success message regardless of whether the email exists
   *
   * @param email - The email address to resend verification to
   * @returns Generic success message
   */
  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    const normalizedEmail = email.toLowerCase();
    this.logger.debug(`Resend verification requested for: ${normalizedEmail}`);

    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    // Generic message for security - don't reveal if email exists
    const genericMessage =
      'If an account exists with this email and has not been verified, a new verification email has been sent.';

    if (!user) {
      this.logger.debug(
        `Resend verification - user not found: ${normalizedEmail}`,
      );
      return { message: genericMessage };
    }

    // Check if already verified
    if (user.emailVerified) {
      this.logger.debug(
        `Resend verification - email already verified: ${normalizedEmail}`,
      );
      return { message: genericMessage };
    }

    // Generate new verification token
    const verificationToken = this.generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send verification email asynchronously
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    this.brevoService
      .sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        verificationUrl,
      })
      .then((result) => {
        if (result.success) {
          this.logger.log(
            `Verification email resent successfully for user: ${user.email}`,
          );
        } else {
          this.logger.warn(
            `Verification email resend failed for user: ${user.email} - ${result.error}`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(
          `Verification email resend threw error for user: ${user.email}`,
          error instanceof Error ? error.stack : undefined,
        );
      });

    return { message: genericMessage };
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
      tenant: this.mapToAuthTenant(user.tenant),
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
   * Gets the current authenticated user's information
   *
   * @param userId - The ID of the user to fetch
   * @returns Authentication response with user data and tokens
   * @throws NotFoundException if user is not found
   * @throws ForbiddenException if tenant or user is suspended/inactive
   */
  async getMe(userId: string): Promise<AuthResponse> {
    this.logger.debug(`Fetching user info for: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`Get me failed - user not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Validate tenant status
    this.validateTenantStatus(user.tenant);

    // Validate user status
    this.validateUserStatus(user);

    // Generate fresh tokens
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

    return {
      user: this.mapToAuthUser(user),
      tenant: this.mapToAuthTenant(user.tenant),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
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

  /**
   * Maps a Tenant entity to an AuthTenant response object
   *
   * @param tenant - The tenant entity to map
   * @returns AuthTenant object with safe tenant data
   */
  private mapToAuthTenant(tenant: Tenant): AuthTenant {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
    };
  }

  /**
   * Gets invitation details for the accept invitation page.
   * This is a public endpoint that does not require authentication.
   *
   * @param token - The invitation token
   * @returns Invitation details (email, tenant name, inviter name, role, expiration)
   * @throws BadRequestException if invitation is invalid, expired, or already used
   */
  async getInvitationDetails(token: string): Promise<InvitationDetailsResponse> {
    this.logger.debug(`Getting invitation details for token`);

    // Use invitationsService.findByToken which handles all validation
    const invitation = await this.invitationsService.findByToken(token);

    return {
      email: invitation.email,
      tenantName: invitation.tenant.name,
      invitedByName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Accepts an invitation and creates a new user account.
   * The user is created with ACTIVE status and emailVerified=true.
   * Generates tokens for auto-login after account creation.
   *
   * @param dto - Accept invitation data (token, firstName, lastName, password)
   * @returns Authentication response with user data and tokens for auto-login
   * @throws BadRequestException if invitation is invalid, expired, or already used
   * @throws ConflictException if user already exists with this email
   */
  async acceptInvitation(
    dto: AcceptInvitationDto,
  ): Promise<AcceptInvitationResponse> {
    const { token, firstName, lastName, password } = dto;
    this.logger.debug(`Processing invitation acceptance`);

    // Find and validate invitation
    const invitation = await this.invitationsService.findByToken(token);

    // Additional check: ensure status is PENDING
    if (invitation.status !== InvitationStatus.PENDING) {
      this.logger.warn(`Invitation not pending: ${invitation.status}`);
      throw new BadRequestException(
        'Esta invitacion ya no es valida',
      );
    }

    // Check if user already exists globally with this email
    const existingUser = await this.prisma.user.findFirst({
      where: { email: invitation.email.toLowerCase() },
    });

    if (existingUser) {
      this.logger.warn(
        `User already exists with email: ${invitation.email}`,
      );
      throw new ConflictException(
        'Ya existe un usuario con este email',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create user and update invitation in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user with invitation's tenantId and role
      const user = await tx.user.create({
        data: {
          email: invitation.email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          tenantId: invitation.tenantId,
          role: invitation.role,
          status: UserStatus.ACTIVE, // Invited users are active immediately
          emailVerified: true, // Email is verified since they received the invitation
        },
        include: { tenant: true },
      });

      // Update invitation status to ACCEPTED
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      return user;
    });

    this.logger.log(
      `Invitation accepted. User created: ${result.email}, tenant: ${result.tenant.name}`,
    );

    // Generate tokens for auto-login
    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.role,
      result.tenantId,
    );

    // Store refresh token
    await this.prisma.user.update({
      where: { id: result.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    return {
      message: 'Cuenta creada exitosamente',
      user: this.mapToAuthUser(result),
      tenant: this.mapToAuthTenant(result.tenant),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
