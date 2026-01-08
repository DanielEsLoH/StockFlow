import { Logger, ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: { method: string; url: string };
  let logSpy: jest.SpyInstance<
    void,
    [message: unknown, ...optionalParams: unknown[]]
  >;
  let warnSpy: jest.SpyInstance<
    void,
    [message: unknown, ...optionalParams: unknown[]]
  >;

  // Store original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  /**
   * Helper to safely get the first log message from a spy
   */
  function getFirstLogMessage(
    spy: jest.SpyInstance<
      void,
      [message: unknown, ...optionalParams: unknown[]]
    >,
  ): string {
    const calls = spy.mock.calls;
    if (calls.length > 0 && calls[0].length > 0) {
      return String(calls[0][0]);
    }
    return '';
  }

  beforeEach(() => {
    // Reset NODE_ENV to development for most tests
    process.env.NODE_ENV = 'development';

    mockRequest = {
      method: 'GET',
      url: '/api/products',
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: jest.fn(),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };

    interceptor = new LoggingInterceptor();

    // Suppress logger output and capture calls
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('constructor', () => {
    it('should use default options in development', () => {
      process.env.NODE_ENV = 'development';
      const devInterceptor = new LoggingInterceptor();
      expect(devInterceptor).toBeDefined();
    });

    it('should accept custom options', () => {
      const customInterceptor = new LoggingInterceptor({
        excludeRoutes: ['/custom-health'],
        coloredOutput: false,
        enabled: true,
      });
      expect(customInterceptor).toBeDefined();
    });

    it('should default to disabled in production', () => {
      process.env.NODE_ENV = 'production';
      const prodInterceptor = new LoggingInterceptor();

      prodInterceptor.intercept(mockExecutionContext, mockCallHandler);

      // In production, logging should be disabled by default
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('intercept', () => {
    it('should log HTTP request with method, URL, and duration', (done) => {
      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('GET');
          expect(logMessage).toContain('/api/products');
          expect(logMessage).toMatch(/\d+ms/);
          done();
        },
      });
    });

    it('should log POST requests', (done) => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/users';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('POST');
          expect(logMessage).toContain('/api/users');
          done();
        },
      });
    });

    it('should log PUT requests', (done) => {
      mockRequest.method = 'PUT';
      mockRequest.url = '/api/products/1';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('PUT');
          expect(logMessage).toContain('/api/products/1');
          done();
        },
      });
    });

    it('should log PATCH requests', (done) => {
      mockRequest.method = 'PATCH';
      mockRequest.url = '/api/products/1';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('PATCH');
          done();
        },
      });
    });

    it('should log DELETE requests', (done) => {
      mockRequest.method = 'DELETE';
      mockRequest.url = '/api/products/1';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('DELETE');
          done();
        },
      });
    });

    it('should log even when request errors occur', (done) => {
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => new Error('Test error')));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        error: () => {
          expect(warnSpy).toHaveBeenCalled();
          const warnMessage = getFirstLogMessage(warnSpy);
          expect(warnMessage).toContain('GET');
          expect(warnMessage).toContain('/api/products');
          done();
        },
      });
    });

    it('should call next.handle()', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('route exclusion', () => {
    it('should exclude /health route from logging', (done) => {
      mockRequest.url = '/health';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should exclude /healthz route from logging', (done) => {
      mockRequest.url = '/healthz';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should exclude /health-check route from logging', (done) => {
      mockRequest.url = '/health-check';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should exclude /ready route from logging', (done) => {
      mockRequest.url = '/ready';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should exclude /live route from logging', (done) => {
      mockRequest.url = '/live';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should exclude routes with subpaths (e.g., /health/db)', (done) => {
      mockRequest.url = '/health/db';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should exclude routes with query parameters', (done) => {
      mockRequest.url = '/health?verbose=true';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should use custom exclude routes when provided', (done) => {
      const customInterceptor = new LoggingInterceptor({
        excludeRoutes: ['/metrics', '/internal'],
        enabled: true,
      });

      mockRequest.url = '/metrics';

      const result = customInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log non-excluded routes when custom excludes are set', (done) => {
      const customInterceptor = new LoggingInterceptor({
        excludeRoutes: ['/metrics'],
        enabled: true,
      });

      mockRequest.url = '/health'; // /health is no longer excluded

      const result = customInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('production mode', () => {
    it('should not log in production when enabled is not explicitly set', () => {
      process.env.NODE_ENV = 'production';
      const prodInterceptor = new LoggingInterceptor();

      prodInterceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log in production when enabled is explicitly true', (done) => {
      process.env.NODE_ENV = 'production';
      const prodInterceptor = new LoggingInterceptor({ enabled: true });

      const result = prodInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should not log when enabled is explicitly false', () => {
      const disabledInterceptor = new LoggingInterceptor({ enabled: false });

      disabledInterceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('non-HTTP contexts', () => {
    it('should pass through for non-HTTP contexts (e.g., WebSocket)', () => {
      (mockExecutionContext.getType as jest.Mock).mockReturnValue('ws');

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBeDefined();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should pass through for RPC contexts', () => {
      (mockExecutionContext.getType as jest.Mock).mockReturnValue('rpc');

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBeDefined();
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('colored output', () => {
    it('should use colored output in development by default', (done) => {
      process.env.NODE_ENV = 'development';
      const coloredInterceptor = new LoggingInterceptor();

      const result = coloredInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          const logMessage = getFirstLogMessage(logSpy);
          // ANSI escape codes start with \x1b[
          expect(logMessage).toContain('\x1b[');
          done();
        },
      });
    });

    it('should not use colors when coloredOutput is false', (done) => {
      const plainInterceptor = new LoggingInterceptor({
        coloredOutput: false,
        enabled: true,
      });

      const result = plainInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          const logMessage = getFirstLogMessage(logSpy);
          // Should not contain ANSI escape codes
          expect(logMessage).not.toContain('\x1b[');
          expect(logMessage).toBe('GET /api/products - 0ms');
          done();
        },
      });
    });

    it('should not use colors in production by default', (done) => {
      process.env.NODE_ENV = 'production';
      const prodInterceptor = new LoggingInterceptor({ enabled: true });

      const result = prodInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          const logMessage = getFirstLogMessage(logSpy);
          // Should not contain ANSI escape codes in production
          expect(logMessage).not.toContain('\x1b[');
          done();
        },
      });
    });
  });

  describe('request with query parameters', () => {
    it('should log URL with query parameters', (done) => {
      mockRequest.url = '/api/products?page=1&limit=10';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('/api/products?page=1&limit=10');
          done();
        },
      });
    });
  });

  describe('different URL patterns', () => {
    it('should log root path', (done) => {
      mockRequest.url = '/';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('/');
          done();
        },
      });
    });

    it('should log nested paths', (done) => {
      mockRequest.url = '/api/v1/products/categories/1/items';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result.subscribe({
        complete: () => {
          const logMessage = getFirstLogMessage(logSpy);
          expect(logMessage).toContain('/api/v1/products/categories/1/items');
          done();
        },
      });
    });
  });
});
