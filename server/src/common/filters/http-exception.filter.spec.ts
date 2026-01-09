import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpExceptionFilter, ErrorResponse } from './http-exception.filter';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockRequest: {
    url: string;
    method: string;
  };
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
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
    jest.restoreAllMocks();
  });

  /**
   * Helper to get the response body with proper typing
   */
  function getResponseBody(): ErrorResponse {
    const calls = mockResponse.json.mock.calls as unknown[][];
    return calls[0][0] as ErrorResponse;
  }

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should return proper error response for BadRequestException', () => {
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad Request',
          error: 'Bad Request',
          path: '/api/test',
        }),
      );
    });

    it('should return proper error response for NotFoundException', () => {
      const exception = new HttpException(
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'Not Found',
          path: '/api/test',
        }),
      );
    });

    it('should return proper error response for InternalServerError', () => {
      const exception = new HttpException(
        'Internal error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal error',
          error: 'Internal Server Error',
          path: '/api/test',
        }),
      );
    });

    it('should handle exception with object response containing message', () => {
      const exception = new HttpException(
        { message: 'Validation failed', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          error: 'Bad Request',
        }),
      );
    });

    it('should handle exception with array of messages (validation errors)', () => {
      const exception = new HttpException(
        {
          message: ['email must be an email', 'password is too short'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['email must be an email', 'password is too short'],
          error: 'Bad Request',
        }),
      );
    });

    it('should include timestamp in response', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      const responseBody = getResponseBody();
      expect(responseBody.timestamp).toBeDefined();
      expect(new Date(responseBody.timestamp).toISOString()).toBe(
        responseBody.timestamp,
      );
    });

    it('should log error for server errors', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new HttpException(
        'Server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log warning for client errors', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const exception = new HttpException(
        'Client error',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(warnSpy).toHaveBeenCalled();
    });

    describe('extractErrorDetails edge cases', () => {
      it('should handle response with missing message and error', () => {
        const exception = new HttpException({}, HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'An error occurred',
            error: 'Bad Request',
          }),
        );
      });

      it('should handle string response directly', () => {
        const exception = new HttpException(
          'Simple string error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Simple string error',
          }),
        );
      });
    });

    describe('getHttpStatusText', () => {
      it('should return correct text for Unauthorized', () => {
        const exception = new HttpException({}, HttpStatus.UNAUTHORIZED);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Unauthorized',
          }),
        );
      });

      it('should return correct text for Forbidden', () => {
        const exception = new HttpException({}, HttpStatus.FORBIDDEN);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Forbidden',
          }),
        );
      });

      it('should return correct text for Method Not Allowed', () => {
        const exception = new HttpException({}, HttpStatus.METHOD_NOT_ALLOWED);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Method Not Allowed',
          }),
        );
      });

      it('should return correct text for Not Acceptable', () => {
        const exception = new HttpException({}, HttpStatus.NOT_ACCEPTABLE);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Not Acceptable',
          }),
        );
      });

      it('should return correct text for Request Timeout', () => {
        const exception = new HttpException({}, HttpStatus.REQUEST_TIMEOUT);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Request Timeout',
          }),
        );
      });

      it('should return correct text for Conflict', () => {
        const exception = new HttpException({}, HttpStatus.CONFLICT);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Conflict',
          }),
        );
      });

      it('should return correct text for Gone', () => {
        const exception = new HttpException({}, HttpStatus.GONE);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Gone',
          }),
        );
      });

      it('should return correct text for Unprocessable Entity', () => {
        const exception = new HttpException(
          {},
          HttpStatus.UNPROCESSABLE_ENTITY,
        );

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Unprocessable Entity',
          }),
        );
      });

      it('should return correct text for Too Many Requests', () => {
        const exception = new HttpException({}, HttpStatus.TOO_MANY_REQUESTS);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Too Many Requests',
          }),
        );
      });

      it('should return correct text for Not Implemented', () => {
        const exception = new HttpException({}, HttpStatus.NOT_IMPLEMENTED);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Not Implemented',
          }),
        );
      });

      it('should return correct text for Bad Gateway', () => {
        const exception = new HttpException({}, HttpStatus.BAD_GATEWAY);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Bad Gateway',
          }),
        );
      });

      it('should return correct text for Service Unavailable', () => {
        const exception = new HttpException({}, HttpStatus.SERVICE_UNAVAILABLE);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Service Unavailable',
          }),
        );
      });

      it('should return correct text for Gateway Timeout', () => {
        const exception = new HttpException({}, HttpStatus.GATEWAY_TIMEOUT);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Gateway Timeout',
          }),
        );
      });

      it('should return generic Error for unknown status codes', () => {
        const exception = new HttpException({}, 418); // I'm a teapot

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Error',
          }),
        );
      });
    });
  });
});
