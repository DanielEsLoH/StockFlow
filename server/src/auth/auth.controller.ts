import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  AuthService,
  AuthResponse,
  RegisterResponse,
  LogoutResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
} from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto';
import { AuthResponseEntity, LogoutResponseEntity } from './entities';
import {
  RateLimitGuard,
  BotProtectionGuard,
  RateLimit,
  BotProtect,
} from '../arcjet';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from '../common/decorators';
import { UserRole } from '@prisma/client';

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

  constructor(private readonly authService: AuthService) {}

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
    description: 'Creates a new user account with the provided credentials. Account will be pending approval by a system administrator. Rate limited to 3 requests per hour per IP.',
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
    description: 'Authenticates a user with email and password, returning JWT access and refresh tokens. Rate limited to 5 requests per 15 minutes per IP.',
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
    description: 'Exchanges a valid refresh token for new access and refresh tokens. Rate limited to 10 requests per 15 minutes per IP.',
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
    description: 'Verification email sent (if account exists and is unverified)',
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
    description: 'Invalidates the user refresh token and logs the user out of the system.',
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
}