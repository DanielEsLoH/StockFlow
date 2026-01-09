import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService, AuthResponse, LogoutResponse } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { UserRole, UserStatus } from '@prisma/client';

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
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
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
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
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
      tenantId: 'tenant-123',
    };

    it('should register a new user and return auth response', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
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
});
