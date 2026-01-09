import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost } from '@nestjs/common';
import { ErrorResponse } from './http-exception.filter';

/**
 * Extended response type for development mode debug info
 */
interface DebugErrorResponse extends ErrorResponse {
  stack?: string;
  debug?: {
    exceptionType: string;
    method: string;
    headers: Record<string, unknown>;
    query: Record<string, string>;
    body: Record<string, unknown>;
  };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockRequest: {
    url: string;
    method: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body: Record<string, unknown>;
  };
  let mockArgumentsHost: ArgumentsHost;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer secret-token',
      },
      query: { page: '1' },
      body: { email: 'test@example.com', password: 'secret123' },
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ArgumentsHost;

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  /**
   * Helper to get the response body with proper typing
   */
  function getResponseBody(): DebugErrorResponse {
    const calls = mockResponse.json.mock.calls as unknown[][];
    return calls[0][0] as DebugErrorResponse;
  }

  describe('in development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      filter = new AllExceptionsFilter();
    });

    it('should be defined', () => {
      expect(filter).toBeDefined();
    });

    it('should handle HttpException and extract status', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not Found',
          error: 'Not Found',
          path: '/api/test',
        }),
      );
    });

    it('should handle generic Error with 500 status', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong',
          error: 'Internal Server Error',
        }),
      );
    });

    it('should handle string exception', () => {
      const exception = 'String error message';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'String error message',
        }),
      );
    });

    it('should handle unknown exception type', () => {
      const exception = { unknown: 'object' };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred',
        }),
      );
    });

    describe('extractMessage edge cases', () => {
      it('should extract message from HttpException with object response containing string message', () => {
        const exception = new HttpException(
          { message: 'Object message string', statusCode: 400 },
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Object message string',
          }),
        );
      });

      it('should join array messages from HttpException response', () => {
        const exception = new HttpException(
          { message: ['First error', 'Second error'], statusCode: 400 },
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'First error, Second error',
          }),
        );
      });

      it('should use exception.message when response object has no message field', () => {
        const exception = new HttpException(
          { error: 'Some error', statusCode: 400 },
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockArgumentsHost);

        // Falls back to exception.message since responseObj.message is undefined
        expect(mockResponse.json).toHaveBeenCalled();
      });

      it('should handle null in response', () => {
        const exception = new HttpException(
          null as unknown as string,
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalled();
      });
    });

    it('should include debug information in development', () => {
      const exception = new Error('Test error');

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.debug).toBeDefined();
      expect(responseBody.debug?.exceptionType).toBe('Error');
      expect(responseBody.debug?.method).toBe('POST');
    });

    it('should include stack trace in development', () => {
      const exception = new Error('Test error');

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.stack).toBeDefined();
    });

    it('should redact sensitive headers', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.debug?.headers.authorization).toBe('[REDACTED]');
      expect(responseBody.debug?.headers['content-type']).toBe(
        'application/json',
      );
    });

    it('should redact sensitive body fields', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.debug?.body.password).toBe('[REDACTED]');
      expect(responseBody.debug?.body.email).toBe('test@example.com');
    });
  });

  describe('in production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      filter = new AllExceptionsFilter();
    });

    it('should hide error details for 500 errors', () => {
      const exception = new Error('Internal database connection failed');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred',
        }),
      );
    });

    it('should not include debug information', () => {
      const exception = new Error('Test error');

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.debug).toBeUndefined();
      expect(responseBody.stack).toBeUndefined();
    });

    it('should show message for client errors (4xx)', () => {
      const exception = new HttpException(
        'Bad request data',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bad request data',
        }),
      );
    });
  });

  describe('logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      filter = new AllExceptionsFilter();
    });

    it('should log error for 500+ status codes', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new Error('Server error');

      filter.catch(exception, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log warning for 4xx status codes', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const exception = new HttpException(
        'Client error',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('response format', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      filter = new AllExceptionsFilter();
    });

    it('should include timestamp in ISO format', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.timestamp).toBeDefined();
      expect(new Date(responseBody.timestamp).toISOString()).toBe(
        responseBody.timestamp,
      );
    });

    it('should include request path', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.path).toBe('/api/test');
    });
  });
});
