import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemAdminAuthGuard } from './system-admin-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators';

describe('SystemAdminAuthGuard', () => {
  let guard: SystemAdminAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (
    handler: () => void = () => {},
    classRef: new () => object = class TestClass {},
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => classRef,
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
        getNext: () => {},
      }),
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({
        getData: () => ({}),
        getContext: () => ({}),
      }),
      switchToWs: () => ({
        getData: () => ({}),
        getClient: () => ({}),
        getPattern: () => '',
      }),
      getType: () => 'http',
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new SystemAdminAuthGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should check both handler and class for public decorator', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const mockUser = { adminId: 'admin-1', email: 'admin@test.com' };

      const result = guard.handleRequest(null, mockUser, undefined);

      expect(result).toEqual(mockUser);
    });

    it('should throw error when err is provided', () => {
      const mockError = new Error('Auth error');

      expect(() => guard.handleRequest(mockError, null, undefined)).toThrow(
        mockError,
      );
    });

    it('should throw UnauthorizedException for TokenExpiredError', () => {
      const info = { name: 'TokenExpiredError' } as Error;

      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        'System admin token has expired',
      );
    });

    it('should throw UnauthorizedException for JsonWebTokenError', () => {
      const info = { name: 'JsonWebTokenError' } as Error;

      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        'Invalid system admin token',
      );
    });

    it('should throw UnauthorizedException when no auth token provided', () => {
      const info = { name: 'Error', message: 'No auth token' } as Error;

      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        'System admin authentication token is required',
      );
    });

    it('should throw generic UnauthorizedException when user is null without specific error', () => {
      expect(() => guard.handleRequest(null, null, undefined)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, undefined)).toThrow(
        'Invalid or expired system admin token',
      );
    });

    it('should throw generic UnauthorizedException when user is falsy with unknown error', () => {
      const info = {
        name: 'UnknownError',
        message: 'Something went wrong',
      } as Error;

      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        'Invalid or expired system admin token',
      );
    });

    it('should return user even when info contains error but user exists', () => {
      const mockUser = { adminId: 'admin-1', email: 'admin@test.com' };
      const info = { name: 'SomeWarning' } as Error;

      const result = guard.handleRequest(null, mockUser, info);

      expect(result).toEqual(mockUser);
    });
  });
});
