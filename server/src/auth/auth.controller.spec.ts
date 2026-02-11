import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
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
import { UserRole, UserStatus } from '@prisma/client';
import { ArcjetService } from '../arcjet/arcjet.service';

/**
 * Mock authenticated request interface matching the controller's expected type
 */
interface MockAuthenticatedRequest extends Partial<Request> {
  user?: {
    sub?: string;
    email?: string;
    role?: string;
    tenantId?: string;
  };
}

/**
 * Helper to create a mock authenticated request
 */
function createMockRequest(
  user?: MockAuthenticatedRequest['user'],
): MockAuthenticatedRequest {
  return user ? { user } : {};
}

/**
 * Helper to create a mock Response object for OAuth redirects
 */
function createMockOAuthResponse(): Partial<Response> & {
  redirect: jest.Mock;
  cookie: jest.Mock;
} {
  return {
    redirect: jest.fn(),
    cookie: jest.fn(),
  };
}

/**
 * Helper to create a mock Request with OAuth user
 */
function createMockOAuthRequest(
  user?: OAuthUserDto,
): Partial<Request> & { user?: OAuthUserDto } {
  return user ? { user } : {};
}

/**
 * OAuth callback test configuration
 */
interface OAuthCallbackTestConfig {
  providerName: string;
  provider: 'EMAIL' | 'GOOGLE' | 'GITHUB';
  mockOAuthUser: OAuthUserDto;
  callbackMethod: (
    req: Request & { user?: OAuthUserDto },
    res: Response,
  ) => Promise<void>;
  noUserDataErrorMessage: string;
  getAuthService: () => jest.Mocked<AuthService>;
}

/**
 * Shared OAuth callback test suite factory
 * Creates parameterized tests for OAuth callback endpoints to eliminate duplication
 */
function describeOAuthCallbackTests(config: OAuthCallbackTestConfig): void {
  const {
    providerName,
    provider,
    mockOAuthUser,
    callbackMethod,
    noUserDataErrorMessage,
    getAuthService,
  } = config;

  it('should redirect to frontend with tokens on successful OAuth', async () => {
    const mockReq = createMockOAuthRequest(mockOAuthUser);
    const mockRes = createMockOAuthResponse();
    const authService = getAuthService();

    authService.handleOAuthLogin.mockResolvedValue({
      status: 'success',
      accessToken: 'oauth-access-token',
      refreshToken: 'oauth-refresh-token',
    });

    await callbackMethod(
      mockReq as Request & { user?: OAuthUserDto },
      mockRes as unknown as Response,
    );

    expect(authService.handleOAuthLogin).toHaveBeenCalledWith(
      mockOAuthUser,
      provider,
    );
    expect(mockRes.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/oauth/callback?token=oauth-access-token&refresh=oauth-refresh-token',
    );
  });

  it('should redirect to pending page when user is pending approval', async () => {
    const mockReq = createMockOAuthRequest(mockOAuthUser);
    const mockRes = createMockOAuthResponse();
    const authService = getAuthService();

    authService.handleOAuthLogin.mockResolvedValue({
      status: 'pending',
      message: 'Account pending approval',
    });

    await callbackMethod(
      mockReq as Request & { user?: OAuthUserDto },
      mockRes as unknown as Response,
    );

    expect(mockRes.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/oauth/callback?pending=true',
    );
  });

  it('should redirect with error when OAuth returns error status', async () => {
    const mockReq = createMockOAuthRequest(mockOAuthUser);
    const mockRes = createMockOAuthResponse();
    const authService = getAuthService();

    authService.handleOAuthLogin.mockResolvedValue({
      status: 'error',
      error: 'Account suspended',
    });

    await callbackMethod(
      mockReq as Request & { user?: OAuthUserDto },
      mockRes as unknown as Response,
    );

    expect(mockRes.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/oauth/callback?error=Account%20suspended',
    );
  });

  it(`should redirect with error when no user data from ${providerName}`, async () => {
    const mockReq = createMockOAuthRequest();
    const mockRes = createMockOAuthResponse();
    const authService = getAuthService();

    await callbackMethod(
      mockReq as Request & { user?: OAuthUserDto },
      mockRes as unknown as Response,
    );

    expect(authService.handleOAuthLogin).not.toHaveBeenCalled();
    expect(mockRes.redirect).toHaveBeenCalledWith(
      `http://localhost:5173/oauth/callback?error=${encodeURIComponent(noUserDataErrorMessage)}`,
    );
  });

  it('should redirect with error when service throws Error', async () => {
    const mockReq = createMockOAuthRequest(mockOAuthUser);
    const mockRes = createMockOAuthResponse();
    const authService = getAuthService();

    authService.handleOAuthLogin.mockRejectedValue(
      new Error('OAuth processing failed'),
    );

    await callbackMethod(
      mockReq as Request & { user?: OAuthUserDto },
      mockRes as unknown as Response,
    );

    expect(mockRes.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/oauth/callback?error=OAuth%20processing%20failed',
    );
  });

  it('should redirect with generic error when service throws non-Error', async () => {
    const mockReq = createMockOAuthRequest(mockOAuthUser);
    const mockRes = createMockOAuthResponse();
    const authService = getAuthService();

    authService.handleOAuthLogin.mockRejectedValue('Unknown error');

    await callbackMethod(
      mockReq as Request & { user?: OAuthUserDto },
      mockRes as unknown as Response,
    );

    expect(mockRes.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/oauth/callback?error=Authentication%20failed',
    );
  });
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  // Test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-123',
    avatar: null as string | null,
  };

  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Company',
    slug: 'test-company',
    plan: 'PYME',
    status: 'ACTIVE',
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    tenant: mockTenant,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockLogoutResponse: LogoutResponse = {
    message: 'Successfully logged out',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      getInvitationDetails: jest.fn(),
      acceptInvitation: jest.fn(),
      handleOAuthLogin: jest.fn(),
    };

    const mockArcjetService = {
      isProtectionEnabled: jest.fn().mockReturnValue(false),
      checkRateLimit: jest
        .fn()
        .mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
      checkBot: jest
        .fn()
        .mockResolvedValue({ allowed: true, reason: 'DISABLED' }),
      getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'app.frontendUrl': 'http://localhost:5173',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ArcjetService, useValue: mockArcjetService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'securePassword123',
      firstName: 'Jane',
      lastName: 'Doe',
      tenantName: 'Test Company',
    };

    const mockRegisterResponse: RegisterResponse = {
      message: 'Registration successful. Your account is pending approval.',
      user: {
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      },
      tenant: {
        name: 'Test Company',
      },
    };

    it('should register a new user and return pending approval response', async () => {
      authService.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockRegisterResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from auth service', async () => {
      const error = new Error('Email already exists');
      authService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(error);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should authenticate user and return auth response', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should propagate authentication errors', async () => {
      const error = new Error('Invalid credentials');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh tokens and return new auth response', async () => {
      const newAuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      authService.refreshTokens.mockResolvedValue(newAuthResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(newAuthResponse);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
      expect(authService.refreshTokens).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors for invalid refresh token', async () => {
      const error = new Error('Invalid refresh token');
      authService.refreshTokens.mockRejectedValue(error);

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(error);
    });
  });

  describe('logout', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    /**
     * Helper to test logout via refresh token fallback
     */
    async function testLogoutViaRefreshTokenFallback(
      req: MockAuthenticatedRequest,
    ): Promise<void> {
      authService.refreshTokens.mockResolvedValue(mockAuthResponse);
      authService.logout.mockResolvedValue(mockLogoutResponse);

      const result = await controller.logout(
        refreshTokenDto,
        req as Parameters<typeof controller.logout>[1],
      );

      expect(result).toEqual(mockLogoutResponse);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
      expect(authService.logout).toHaveBeenCalledWith(mockUser.id);
    }

    describe('when user is in request (from JWT guard)', () => {
      it('should logout using user ID from request', async () => {
        const req = createMockRequest({
          sub: 'user-123',
          email: 'test@example.com',
          role: 'ADMIN',
          tenantId: 'tenant-123',
        });

        authService.logout.mockResolvedValue(mockLogoutResponse);

        const result = await controller.logout(
          refreshTokenDto,
          req as Parameters<typeof controller.logout>[1],
        );

        expect(result).toEqual(mockLogoutResponse);
        expect(authService.logout).toHaveBeenCalledWith('user-123');
        expect(authService.refreshTokens).not.toHaveBeenCalled();
      });
    });

    describe('when user is not in request', () => {
      it('should decode refresh token and logout', async () => {
        await testLogoutViaRefreshTokenFallback(createMockRequest());
      });

      it('should propagate errors for invalid refresh token during logout', async () => {
        const req = createMockRequest();
        const error = new Error('Invalid refresh token');
        authService.refreshTokens.mockRejectedValue(error);

        await expect(
          controller.logout(
            refreshTokenDto,
            req as Parameters<typeof controller.logout>[1],
          ),
        ).rejects.toThrow(error);
      });
    });

    describe('when request user has no sub', () => {
      it('should fall back to refresh token decoding', async () => {
        await testLogoutViaRefreshTokenFallback(
          createMockRequest({ email: 'test@example.com' }),
        );
      });
    });
  });

  describe('getMe', () => {
    const mockCurrentUser = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.ADMIN,
      tenantId: 'tenant-123',
    };

    it('should return current user information', async () => {
      authService.getMe.mockResolvedValue(mockAuthResponse);

      const result = await controller.getMe(mockCurrentUser);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.getMe).toHaveBeenCalledWith('user-123');
      expect(authService.getMe).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from auth service', async () => {
      const error = new UnauthorizedException('User not found');
      authService.getMe.mockRejectedValue(error);

      await expect(controller.getMe(mockCurrentUser)).rejects.toThrow(error);
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = {
      token: 'valid-verification-token',
    };

    const mockVerifyEmailResponse: VerifyEmailResponse = {
      message: 'Email verified successfully',
    };

    it('should verify email and return success message', async () => {
      authService.verifyEmail.mockResolvedValue(mockVerifyEmailResponse);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result).toEqual(mockVerifyEmailResponse);
      expect(authService.verifyEmail).toHaveBeenCalledWith(
        verifyEmailDto.token,
      );
      expect(authService.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors for invalid verification token', async () => {
      const error = new Error('Invalid verification token');
      authService.verifyEmail.mockRejectedValue(error);

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('resendVerification', () => {
    const resendVerificationDto: ResendVerificationDto = {
      email: 'test@example.com',
    };

    const mockResendVerificationResponse: ResendVerificationResponse = {
      message:
        'If an account exists with this email, a verification email has been sent',
    };

    it('should resend verification email and return success message', async () => {
      authService.resendVerification.mockResolvedValue(
        mockResendVerificationResponse,
      );

      const result = await controller.resendVerification(resendVerificationDto);

      expect(result).toEqual(mockResendVerificationResponse);
      expect(authService.resendVerification).toHaveBeenCalledWith(
        resendVerificationDto.email,
      );
      expect(authService.resendVerification).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from auth service', async () => {
      const error = new Error('Service error');
      authService.resendVerification.mockRejectedValue(error);

      await expect(
        controller.resendVerification(resendVerificationDto),
      ).rejects.toThrow(error);
    });
  });

  describe('getInvitation', () => {
    const invitationToken = 'valid-invitation-token';

    const mockInvitationDetailsResponse: InvitationDetailsResponse = {
      email: 'invited@example.com',
      tenantName: 'Test Company',
      invitedByName: 'John Doe',
      role: UserRole.EMPLOYEE,
      expiresAt: new Date('2025-12-31'),
    };

    it('should return invitation details', async () => {
      authService.getInvitationDetails.mockResolvedValue(
        mockInvitationDetailsResponse,
      );

      const result = await controller.getInvitation(invitationToken);

      expect(result).toEqual(mockInvitationDetailsResponse);
      expect(authService.getInvitationDetails).toHaveBeenCalledWith(
        invitationToken,
      );
      expect(authService.getInvitationDetails).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors for invalid invitation token', async () => {
      const error = new Error('Invitation not found');
      authService.getInvitationDetails.mockRejectedValue(error);

      await expect(controller.getInvitation(invitationToken)).rejects.toThrow(
        error,
      );
    });

    it('should propagate errors for expired invitation', async () => {
      const error = new Error('Invitation has expired');
      authService.getInvitationDetails.mockRejectedValue(error);

      await expect(controller.getInvitation(invitationToken)).rejects.toThrow(
        error,
      );
    });
  });

  describe('acceptInvitation', () => {
    const acceptInvitationDto: AcceptInvitationDto = {
      token: 'valid-invitation-token',
      firstName: 'Juan',
      lastName: 'Perez',
      password: 'SecurePassword123',
    };

    const mockAcceptInvitationResponse: AcceptInvitationResponse = {
      message: 'Invitation accepted successfully',
      user: mockUser,
      tenant: mockTenant,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    it('should accept invitation, set cookie, and return auth response', async () => {
      const mockRes = createMockOAuthResponse();
      authService.acceptInvitation.mockResolvedValue(
        mockAcceptInvitationResponse,
      );

      const result = await controller.acceptInvitation(
        acceptInvitationDto,
        mockRes as unknown as Response,
      );

      expect(result).toEqual(mockAcceptInvitationResponse);
      expect(authService.acceptInvitation).toHaveBeenCalledWith(
        acceptInvitationDto,
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAcceptInvitationResponse.refreshToken,
        {
          httpOnly: true,
          secure: false, // NODE_ENV is not 'production' in tests
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );
    });

    it('should set secure cookie in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockRes = createMockOAuthResponse();
      authService.acceptInvitation.mockResolvedValue(
        mockAcceptInvitationResponse,
      );

      await controller.acceptInvitation(
        acceptInvitationDto,
        mockRes as unknown as Response,
      );

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAcceptInvitationResponse.refreshToken,
        expect.objectContaining({
          secure: true,
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should propagate errors for invalid invitation', async () => {
      const mockRes = createMockOAuthResponse();
      const error = new Error('Invalid invitation token');
      authService.acceptInvitation.mockRejectedValue(error);

      await expect(
        controller.acceptInvitation(
          acceptInvitationDto,
          mockRes as unknown as Response,
        ),
      ).rejects.toThrow(error);

      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should propagate errors for already used invitation', async () => {
      const mockRes = createMockOAuthResponse();
      const error = new Error('Invitation has already been used');
      authService.acceptInvitation.mockRejectedValue(error);

      await expect(
        controller.acceptInvitation(
          acceptInvitationDto,
          mockRes as unknown as Response,
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('googleAuth', () => {
    it('should log Google OAuth initiation', () => {
      // The method is void and just logs, guard handles redirect
      expect(() => controller.googleAuth()).not.toThrow();
    });
  });

  describe('googleAuthCallback', () => {
    const mockGoogleOAuthUser: OAuthUserDto = {
      email: 'google-user@example.com',
      firstName: 'Google',
      lastName: 'User',
      provider: 'GOOGLE',
      googleId: 'google-123456',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    describeOAuthCallbackTests({
      providerName: 'Google',
      provider: 'GOOGLE',
      mockOAuthUser: mockGoogleOAuthUser,
      callbackMethod: (req, res) => controller.googleAuthCallback(req, res),
      noUserDataErrorMessage: 'No user data from Google OAuth',
      getAuthService: () => authService,
    });
  });

  describe('githubAuth', () => {
    it('should log GitHub OAuth initiation', () => {
      // The method is void and just logs, guard handles redirect
      expect(() => controller.githubAuth()).not.toThrow();
    });
  });

  describe('githubAuthCallback', () => {
    const mockGitHubOAuthUser: OAuthUserDto = {
      email: 'github-user@example.com',
      firstName: 'GitHub',
      lastName: 'User',
      provider: 'GITHUB',
      githubId: 'github-789012',
      avatarUrl: 'https://github.com/avatar.jpg',
    };

    describeOAuthCallbackTests({
      providerName: 'GitHub',
      provider: 'GITHUB',
      mockOAuthUser: mockGitHubOAuthUser,
      callbackMethod: (req, res) => controller.githubAuthCallback(req, res),
      noUserDataErrorMessage: 'No user data from GitHub OAuth',
      getAuthService: () => authService,
    });

    // GitHub-specific test that was only in the GitHub callback
    it('should redirect with default error message when error status has no error field', async () => {
      const mockReq = createMockOAuthRequest(mockGitHubOAuthUser);
      const mockRes = createMockOAuthResponse();

      authService.handleOAuthLogin.mockResolvedValue({
        status: 'error',
      });

      await controller.githubAuthCallback(
        mockReq as Request & { user?: OAuthUserDto },
        mockRes as unknown as Response,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/oauth/callback?error=Authentication%20failed',
      );
    });
  });
});
