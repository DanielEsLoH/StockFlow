import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import {
  TransformInterceptor,
  TransformInterceptorOptions,
} from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockExecutionContext = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ id: 1, name: 'test' })),
    };
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should enable transformation by default', () => {
      const interceptorDefault = new TransformInterceptor();
      expect(interceptorDefault).toBeDefined();
    });

    it('should accept enabled option as true', () => {
      const options: TransformInterceptorOptions = { enabled: true };
      const interceptorEnabled = new TransformInterceptor(options);
      expect(interceptorEnabled).toBeDefined();
    });

    it('should accept enabled option as false', () => {
      const options: TransformInterceptorOptions = { enabled: false };
      const interceptorDisabled = new TransformInterceptor(options);
      expect(interceptorDisabled).toBeDefined();
    });

    it('should accept empty options object', () => {
      const options: TransformInterceptorOptions = {};
      const interceptorEmpty = new TransformInterceptor(options);
      expect(interceptorEmpty).toBeDefined();
    });
  });

  describe('intercept', () => {
    describe('when enabled (default)', () => {
      it('should wrap response in ApiResponse format', async () => {
        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('data', { id: 1, name: 'test' });
        expect(result).toHaveProperty('timestamp');
      });

      it('should include valid ISO timestamp', async () => {
        const beforeTime = new Date().toISOString();

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        const afterTime = new Date().toISOString();
        expect(result.timestamp).toBeDefined();
        expect(result.timestamp >= beforeTime).toBe(true);
        expect(result.timestamp <= afterTime).toBe(true);
      });

      it('should wrap null response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: null,
          timestamp: expect.any(String),
        });
      });

      it('should wrap undefined response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: undefined,
          timestamp: expect.any(String),
        });
      });

      it('should wrap array response', async () => {
        const arrayData = [
          { id: 1, name: 'test1' },
          { id: 2, name: 'test2' },
        ];
        mockCallHandler.handle = jest.fn().mockReturnValue(of(arrayData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: arrayData,
          timestamp: expect.any(String),
        });
      });

      it('should wrap primitive string response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of('simple string'));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: 'simple string',
          timestamp: expect.any(String),
        });
      });

      it('should wrap primitive number response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(42));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: 42,
          timestamp: expect.any(String),
        });
      });

      it('should wrap boolean response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(true));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: true,
          timestamp: expect.any(String),
        });
      });

      it('should wrap empty object response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: {},
          timestamp: expect.any(String),
        });
      });

      it('should wrap empty array response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of([]));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: [],
          timestamp: expect.any(String),
        });
      });

      it('should wrap nested object response', async () => {
        const nestedData = {
          user: {
            id: 1,
            profile: {
              name: 'Test',
              settings: { theme: 'dark' },
            },
          },
        };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(nestedData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect((result as { data: typeof nestedData }).data).toEqual(
          nestedData,
        );
      });
    });

    describe('when disabled', () => {
      beforeEach(() => {
        interceptor = new TransformInterceptor({ enabled: false });
      });

      it('should pass through response without transformation', async () => {
        const originalData = { id: 1, name: 'test' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(originalData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual(originalData);
        expect(result).not.toHaveProperty('success');
        expect(result).not.toHaveProperty('timestamp');
      });

      it('should pass through null response', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toBeNull();
      });

      it('should pass through array response', async () => {
        const arrayData = [1, 2, 3];
        mockCallHandler.handle = jest.fn().mockReturnValue(of(arrayData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual(arrayData);
      });
    });

    describe('non-HTTP contexts', () => {
      it('should skip transformation for RPC context', async () => {
        (mockExecutionContext.getType as jest.Mock).mockReturnValue('rpc');
        const originalData = { message: 'rpc response' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(originalData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual(originalData);
        expect(result).not.toHaveProperty('success');
      });

      it('should skip transformation for WebSocket context', async () => {
        (mockExecutionContext.getType as jest.Mock).mockReturnValue('ws');
        const originalData = { event: 'message', data: 'hello' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(originalData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual(originalData);
        expect(result).not.toHaveProperty('success');
      });

      it('should skip transformation for graphql context', async () => {
        (mockExecutionContext.getType as jest.Mock).mockReturnValue('graphql');
        const originalData = { data: { user: { id: 1 } } };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(originalData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual(originalData);
        expect(result).not.toHaveProperty('success');
      });
    });

    describe('edge cases', () => {
      it('should handle Date objects in response', async () => {
        const dateData = { createdAt: new Date('2024-01-01') };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(dateData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        const resultData = (result as { data: typeof dateData }).data;
        expect(resultData).toEqual(dateData);
        expect(resultData.createdAt instanceof Date).toBe(true);
      });

      it('should handle response with special characters', async () => {
        const specialData = { message: 'Hello <script>alert("xss")</script>' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(specialData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect((result as { data: typeof specialData }).data.message).toBe(
          'Hello <script>alert("xss")</script>',
        );
      });

      it('should handle response with unicode characters', async () => {
        const unicodeData = { name: 'Test with special chars' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(unicodeData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect((result as { data: typeof unicodeData }).data.name).toBe(
          'Test with special chars',
        );
      });

      it('should handle large numeric values', async () => {
        const largeNumber = Number.MAX_SAFE_INTEGER;
        const numericData = { value: largeNumber };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(numericData));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect((result as { data: typeof numericData }).data.value).toBe(
          largeNumber,
        );
      });

      it('should handle zero', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(0));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: 0,
          timestamp: expect.any(String),
        });
      });

      it('should handle empty string', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(''));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: '',
          timestamp: expect.any(String),
        });
      });

      it('should handle false boolean', async () => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(false));

        const result = await lastValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );

        expect(result).toEqual({
          success: true,
          data: false,
          timestamp: expect.any(String),
        });
      });
    });
  });

  describe('ApiResponse structure', () => {
    it('should always set success to true for intercepted responses', async () => {
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      expect(result.success).toBe(true);
    });

    it('should generate timestamp in ISO 8601 format', async () => {
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      expect(result.timestamp).toMatch(isoDateRegex);
    });

    it('should preserve original data structure in data field', async () => {
      const complexData = {
        id: 'uuid-123',
        items: [{ name: 'item1' }, { name: 'item2' }],
        metadata: { count: 2, page: 1 },
      };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(complexData));

      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      expect((result as { data: typeof complexData }).data).toEqual(
        complexData,
      );
    });
  });
});
