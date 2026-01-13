import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, AuthResponse, LogoutResponse } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { RateLimitGuard, BotProtectionGuard, RateLimit, BotProtect } from '../arcjet';

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
 * AuthController handles authentication endpoints for user registration, login,
 * token refresh, and logout.
 * These endpoints are public, and they do not require authentication guards,
 * except logout which requires a valid user context.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

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
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
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
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponse> {
    this.logger.log('Token refresh request received');
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
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
