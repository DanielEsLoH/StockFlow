import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  // Helper to create mock execution context
  const createMockContext = (): ExecutionContext => {
    return {
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class {}),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      const context = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should check isPublic metadata from handler and class', () => {
      const context = createMockContext();
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(true);

      void guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should allow access when route has @Public() decorator', () => {
      const context = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('handleRequest', () => {
    describe('successful authentication', () => {
      it('should return the user when authentication succeeds', () => {
        const mockUser = {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'ADMIN',
          tenantId: 'tenant-123',
        };

        const result = guard.handleRequest(null, mockUser, undefined);

        expect(result).toBe(mockUser);
      });

      it('should return the user with all provided properties', () => {
        const mockUser = {
          userId: 'user-456',
          email: 'admin@example.com',
          role: 'SUPER_ADMIN',
          tenantId: 'tenant-789',
          extra: 'data',
        };

        const result = guard.handleRequest(null, mockUser, undefined);

        expect(result).toEqual(mockUser);
      });
    });

    describe('authentication failures', () => {
      it('should throw the original error when err is provided', () => {
        const originalError = new Error('Custom authentication error');

        expect(() => {
          guard.handleRequest(originalError, null, undefined);
        }).toThrow(originalError);
      });

      it('should throw UnauthorizedException when user is null', () => {
        expect(() => {
          guard.handleRequest(null, null, undefined);
        }).toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when user is undefined', () => {
        expect(() => {
          guard.handleRequest(null, undefined, undefined);
        }).toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException when user is false', () => {
        expect(() => {
          guard.handleRequest(null, false, undefined);
        }).toThrow(UnauthorizedException);
      });
    });

    describe('specific error messages based on info', () => {
      it('should throw "Token has expired" for TokenExpiredError', () => {
        const info = { name: 'TokenExpiredError', message: 'jwt expired' };

        expect(() => {
          guard.handleRequest(null, null, info as Error);
        }).toThrow('Token has expired');
      });

      it('should throw "Invalid token" for JsonWebTokenError', () => {
        const info = { name: 'JsonWebTokenError', message: 'jwt malformed' };

        expect(() => {
          guard.handleRequest(null, null, info as Error);
        }).toThrow('Invalid token');
      });

      it('should throw "Authentication token is required" for No auth token', () => {
        const info = { name: 'Error', message: 'No auth token' };

        expect(() => {
          guard.handleRequest(null, null, info as Error);
        }).toThrow('Authentication token is required');
      });

      it('should throw default message for other errors', () => {
        const info = { name: 'UnknownError', message: 'Something went wrong' };

        expect(() => {
          guard.handleRequest(null, null, info as Error);
        }).toThrow('Invalid or expired token');
      });

      it('should throw default message when info is undefined', () => {
        expect(() => {
          guard.handleRequest(null, null, undefined);
        }).toThrow('Invalid or expired token');
      });
    });

    describe('error priority', () => {
      it('should prioritize err over missing user', () => {
        const customError = new Error('Auth failed');
        const info = { name: 'TokenExpiredError', message: 'jwt expired' };

        expect(() => {
          guard.handleRequest(customError, null, info as Error);
        }).toThrow('Auth failed');
      });

      it('should return user even if info contains error', () => {
        const mockUser = { userId: 'user-123' };
        const info = { name: 'TokenExpiredError', message: 'jwt expired' };

        const result = guard.handleRequest(null, mockUser, info as Error);

        expect(result).toBe(mockUser);
      });
    });
  });
});
