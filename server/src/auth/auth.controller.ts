import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AuthService,
  AuthResponse,
  RegisterResponse,
  LogoutResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
  InvitationDetailsResponse,
  AcceptInvitationResponse,
} from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
  AcceptInvitationDto,
  OAuthUserDto,
} from './dto';
import { AuthResponseEntity, LogoutResponseEntity } from './entities';
import {
  RateLimitGuard,
  BotProtectionGuard,
  RateLimit,
  BotProtect,
} from '../arcjet';
import { JwtAuthGuard } from './guards';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators';
import { UserRole, AuthProvider } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

/**
 * Extended Request interface that includes user info from JWT
 */
interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

/**
 * Current user context from JWT authentication
 */
interface CurrentUserContext {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

/**
 * AuthController handles authentication endpoints for user registration, login,
 * token refresh, and logout.
 * These endpoints are public, and they do not require authentication guards,
 * except logout which requires a valid user context.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
  }

  /**
   * Gets the current authenticated user's information
   *
   * @param user - Current user context from JWT
   * @returns Authentication response with user data and tokens
   *
   * @example
   * GET /auth/me
   * Authorization: Bearer <access-token>
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the currently authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: AuthResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  async getMe(@CurrentUser() user: CurrentUserContext): Promise<AuthResponse> {
    this.logger.log(`Get me request for user: ${user.email}`);
    return this.authService.getMe(user.userId);
  }

  /**
   * Registers a new user in the system
   *
   * Rate limit: 3 requests per hour per IP (strict for registration)
   * Bot protection: LIVE mode to block automated registrations
   *
   * @param registerDto - User registration data
   * @returns Authentication response with user data and tokens
   *
   * @example
   * POST /auth/register
   * {
   *   "email": "user@example.com",
   *   "password": "securePassword123",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "tenantId": "tenant-uuid-1234-5678"
   * }
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard, BotProtectionGuard)
  @RateLimit({ requests: 3, window: '1h' })
  @BotProtect({ mode: 'LIVE' })
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with the provided credentials. Account will be pending approval by a system administrator. Rate limited to 3 requests per hour per IP.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Registration successful - pending admin approval',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    this.logger.log(`Registration request for email: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  /**
   * Authenticates a user and returns access tokens
   *
   * Rate limit: 5 requests per 15 minutes per IP (prevents brute force)
   * Bot protection: LIVE mode to block credential stuffing attacks
   *
   * @param loginDto - User login credentials
   * @returns Authentication response with user data and tokens
   *
   * @example
   * POST /auth/login
   * {
   *   "email": "user@example.com",
   *   "password": "securePassword123"
   * }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard, BotProtectionGuard)
  @RateLimit({ requests: 5, window: '15m' })
  @BotProtect({ mode: 'LIVE' })
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates a user with email and password, returning JWT access and refresh tokens. Rate limited to 5 requests per 15 minutes per IP.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: AuthResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 403,
    description: 'Account suspended or inactive',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`Login request for email: ${loginDto.email}`);
    return this.authService.login(loginDto.email, loginDto.password);
  }

  /**
   * Refreshes access token using a valid refresh token
   *
   * Rate limit: 10 requests per 15 minutes per IP
   *
   * @param refreshTokenDto - Refresh token data
   * @returns Authentication response with new tokens
   *
   * @example
   * POST /auth/refresh
   * {
   *   "refreshToken": "<jwt-refresh-token>"
   * }
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ requests: 10, window: '15m' })
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for new access and refresh tokens. Rate limited to 10 requests per 15 minutes per IP.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed',
    type: AuthResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponse> {
    this.logger.log('Token refresh request received');
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  /**
   * Verifies a user's email address using the verification token
   *
   * @param verifyEmailDto - Contains the verification token
   * @returns Success message
   *
   * @example
   * POST /auth/verify-email
   * {
   *   "token": "a1b2c3d4e5f6..."
   * }
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verifies the user email address using the token sent via email. Token expires after 24 hours.',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification token',
  })
  @ApiResponse({
    status: 410,
    description: 'Verification token has expired',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<VerifyEmailResponse> {
    this.logger.log('Email verification request received');
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  /**
   * Resends the verification email to a user
   *
   * Rate limit: 3 requests per 15 minutes per IP (prevents spam)
   *
   * @param resendVerificationDto - Contains the email address
   * @returns Generic success message (does not reveal if email exists)
   *
   * @example
   * POST /auth/resend-verification
   * {
   *   "email": "user@example.com"
   * }
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ requests: 3, window: '15m' })
  @ApiOperation({
    summary: 'Resend verification email',
    description:
      'Resends the email verification link. Rate limited to 3 requests per 15 minutes per IP. For security, always returns success regardless of whether email exists.',
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description:
      'Verification email sent (if account exists and is unverified)',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<ResendVerificationResponse> {
    this.logger.log(
      `Resend verification request for email: ${resendVerificationDto.email}`,
    );
    return this.authService.resendVerification(resendVerificationDto.email);
  }

  /**
   * Gets invitation details for the accept invitation page.
   * This is a public endpoint that does not require authentication.
   *
   * @param token - The invitation token from the URL
   * @returns Invitation details (email, tenant name, inviter name, role, expiration)
   *
   * @example
   * GET /auth/invitation/abc123def456...
   */
  @Get('invitation/:token')
  @ApiOperation({
    summary: 'Get invitation details',
    description:
      'Returns invitation details for the accept invitation page. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation details returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired, or already used invitation',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async getInvitation(
    @Param('token') token: string,
  ): Promise<InvitationDetailsResponse> {
    this.logger.log('Get invitation details request received');
    return this.authService.getInvitationDetails(token);
  }

  /**
   * Accepts an invitation and creates a new user account.
   * Sets refresh token cookie for auto-login after account creation.
   *
   * @param dto - Accept invitation data (token, firstName, lastName, password)
   * @param res - Response object for setting cookies
   * @returns Authentication response with user data and tokens
   *
   * @example
   * POST /auth/accept-invitation
   * {
   *   "token": "abc123def456...",
   *   "firstName": "Juan",
   *   "lastName": "Perez",
   *   "password": "SecurePassword123"
   * }
   */
  @Post('accept-invitation')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard, BotProtectionGuard)
  @RateLimit({ requests: 5, window: '1h' })
  @BotProtect({ mode: 'LIVE' })
  @ApiOperation({
    summary: 'Accept invitation and create account',
    description:
      'Accepts an invitation and creates a new user account. Returns tokens for auto-login. Rate limited to 5 requests per hour per IP.',
  })
  @ApiBody({ type: AcceptInvitationDto })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: AuthResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired, or already used invitation',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AcceptInvitationResponse> {
    this.logger.log('Accept invitation request received');
    const result = await this.authService.acceptInvitation(dto);

    // Set refresh token as HTTP-only cookie for security
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  /**
   * Logs out a user by invalidating their refresh token
   *
   * Note: This endpoint extracts the user ID from the refresh token provided.
   * In a production application, you would typically use the JWT auth guard
   * to get the user from the access token. For now, we extract from the
   * refresh token body for simplicity.
   *
   * @param refreshTokenDto - Contains the refresh token to identify the user
   * @param req - The request object (for future JWT guard integration)
   * @returns Logout confirmation message
   *
   * @example
   * POST /auth/logout
   * {
   *   "refreshToken": "<jwt-refresh-token>"
   * }
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description:
      'Invalidates the user refresh token and logs the user out of the system.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    type: LogoutResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<LogoutResponse> {
    this.logger.log('Logout request received');

    // If we have a user from JWT guard (future implementation), use that
    if (req.user?.sub) {
      return this.authService.logout(req.user.sub);
    }

    // Otherwise, we need to decode the refresh token to get the user ID
    // The refreshTokens method validates the token, and we can use the same approach
    // For logout, we'll validate the token first via refresh, then logout
    // This is a simplified approach - in production, you'd use a proper guard
    const authResponse = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
    );
    return this.authService.logout(authResponse.user.id);
  }

  // ============================================================================
  // OAuth/SSO Endpoints
  // ============================================================================

  /**
   * Initiates Google OAuth authentication flow.
   * Redirects the user to Google's consent screen.
   *
   * @example
   * GET /auth/google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Initiate Google OAuth',
    description:
      'Redirects to Google consent screen for OAuth authentication. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be configured.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  googleAuth(): void {
    // Guard handles the redirect to Google
    this.logger.log('Google OAuth initiation');
  }

  /**
   * Handles the callback from Google OAuth.
   * Processes the OAuth response and redirects to the frontend with tokens or status.
   *
   * @param req - The request containing the OAuth user from the Google strategy
   * @param res - The response object for redirecting
   *
   * @example
   * GET /auth/google/callback
   * Redirects to:
   * - Success: ${frontendUrl}/oauth/callback?token=xxx&refresh=xxx
   * - Pending: ${frontendUrl}/oauth/callback?pending=true
   * - Error: ${frontendUrl}/oauth/callback?error=message
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles the OAuth callback from Google and redirects to frontend with authentication result.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with tokens or error',
  })
  async googleAuthCallback(
    @Req() req: Request & { user?: OAuthUserDto },
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('Google OAuth callback received');

    try {
      if (!req.user) {
        throw new UnauthorizedException('No user data from Google OAuth');
      }

      const result = await this.authService.handleOAuthLogin(
        req.user,
        AuthProvider.GOOGLE,
      );

      this.redirectOAuthResult(res, result);
    } catch (error) {
      this.logger.error(
        `Google OAuth callback error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      res.redirect(
        `${this.frontendUrl}/oauth/callback?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  /**
   * Initiates GitHub OAuth authentication flow.
   * Redirects the user to GitHub's authorization screen.
   *
   * @example
   * GET /auth/github
   */
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({
    summary: 'Initiate GitHub OAuth',
    description:
      'Redirects to GitHub authorization screen for OAuth authentication. Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to be configured.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to GitHub OAuth authorization screen',
  })
  githubAuth(): void {
    // Guard handles the redirect to GitHub
    this.logger.log('GitHub OAuth initiation');
  }

  /**
   * Handles the callback from GitHub OAuth.
   * Processes the OAuth response and redirects to the frontend with tokens or status.
   *
   * @param req - The request containing the OAuth user from the GitHub strategy
   * @param res - The response object for redirecting
   *
   * @example
   * GET /auth/github/callback
   * Redirects to:
   * - Success: ${frontendUrl}/oauth/callback?token=xxx&refresh=xxx
   * - Pending: ${frontendUrl}/oauth/callback?pending=true
   * - Error: ${frontendUrl}/oauth/callback?error=message
   */
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({
    summary: 'GitHub OAuth callback',
    description:
      'Handles the OAuth callback from GitHub and redirects to frontend with authentication result.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with tokens or error',
  })
  async githubAuthCallback(
    @Req() req: Request & { user?: OAuthUserDto },
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('GitHub OAuth callback received');

    try {
      if (!req.user) {
        throw new UnauthorizedException('No user data from GitHub OAuth');
      }

      const result = await this.authService.handleOAuthLogin(
        req.user,
        AuthProvider.GITHUB,
      );

      this.redirectOAuthResult(res, result);
    } catch (error) {
      this.logger.error(
        `GitHub OAuth callback error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      res.redirect(
        `${this.frontendUrl}/oauth/callback?error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  /**
   * Redirects to the frontend based on the OAuth login result.
   *
   * @param res - The response object for redirecting
   * @param result - The OAuth login result
   */
  private redirectOAuthResult(
    res: Response,
    result: {
      status: 'success' | 'pending' | 'error';
      accessToken?: string;
      refreshToken?: string;
      message?: string;
      error?: string;
    },
  ): void {
    switch (result.status) {
      case 'success':
        // Redirect with tokens
        res.redirect(
          `${this.frontendUrl}/oauth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`,
        );
        break;

      case 'pending':
        // Redirect to pending approval page
        res.redirect(`${this.frontendUrl}/oauth/callback?pending=true`);
        break;

      case 'error':
        // Redirect with error message
        res.redirect(
          `${this.frontendUrl}/oauth/callback?error=${encodeURIComponent(result.error || 'Authentication failed')}`,
        );
        break;
    }
  }
}
