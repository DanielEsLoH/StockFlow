import { Test, TestingModule } from '@nestjs/testing';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditAction, UserRole } from '@prisma/client';
import { AuditInterceptor } from './audit-logs.interceptor';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../prisma';
import { AUDIT_ENTITY_TYPE_KEY, SKIP_AUDIT_KEY } from './decorators';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockEntityId = 'product-789';

  const mockUser = {
    userId: mockUserId,
    email: 'test@example.com',
    role: UserRole.ADMIN,
    tenantId: mockTenantId,
  };

  const mockRequest = {
    method: 'POST',
    params: { id: mockEntityId },
    path: '/products',
    user: mockUser,
    tenantId: mockTenantId,
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-forwarded-for': '192.168.1.1',
    },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  };

  const mockResponse = {
    id: 'new-product-123',
    name: 'Test Product',
    sku: 'SKU-001',
  };

  const mockOldValues = {
    id: mockEntityId,
    tenantId: mockTenantId,
    name: 'Old Product Name',
    sku: 'SKU-001',
  };

  const createMockExecutionContext = (
    request: Partial<typeof mockRequest> = mockRequest,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ...mockRequest, ...request }),
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      getType: () => 'http' as const,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({}) as ReturnType<ExecutionContext['switchToRpc']>,
      switchToWs: () => ({}) as ReturnType<ExecutionContext['switchToWs']>,
    } as ExecutionContext;
  };

  const createMockCallHandler = (
    response: unknown = mockResponse,
  ): CallHandler => {
    return {
      handle: () => of(response),
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockAuditLogsService = {
      create: jest.fn().mockResolvedValue({ id: 'audit-log-123' }),
    };

    const mockPrismaService = {
      product: {
        findFirst: jest.fn().mockResolvedValue(mockOldValues),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    reflector = module.get(Reflector);
    auditLogsService = module.get(AuditLogsService);
    prismaService = module.get(PrismaService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  describe('intercept', () => {
    describe('skip conditions', () => {
      it('should skip when @SkipAudit is applied', async () => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return true;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });

        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        result.subscribe();
        expect(auditLogsService.create).not.toHaveBeenCalled();
      });

      it('should skip when no @Audit decorator is present', async () => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return undefined;
          return undefined;
        });

        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        result.subscribe();
        expect(auditLogsService.create).not.toHaveBeenCalled();
      });

      it('should skip for GET requests', async () => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });

        const context = createMockExecutionContext({ method: 'GET' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        result.subscribe();
        expect(auditLogsService.create).not.toHaveBeenCalled();
      });

      it('should skip when no tenant context', async () => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });

        const context = createMockExecutionContext({
          user: undefined,
          tenantId: undefined,
        });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        result.subscribe();
        expect(auditLogsService.create).not.toHaveBeenCalled();
      });
    });

    describe('CREATE operations (POST)', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });
      });

      it('should log CREATE action for POST requests', async () => {
        const context = createMockExecutionContext({ method: 'POST' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.CREATE,
            entityType: 'Product',
          }),
        );
      });

      it('should extract entity ID from response', async () => {
        const context = createMockExecutionContext({
          method: 'POST',
          params: { id: undefined as unknown as string },
        });
        const handler = createMockCallHandler({
          id: 'created-product-id',
          name: 'New Product',
        });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            entityId: 'created-product-id',
          }),
        );
      });

      it('should include newValues from response', async () => {
        const context = createMockExecutionContext({ method: 'POST' });
        const handler = createMockCallHandler({
          id: 'new-id',
          name: 'Product Name',
          sku: 'SKU-001',
        });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            newValues: expect.objectContaining({
              id: 'new-id',
              name: 'Product Name',
              sku: 'SKU-001',
            }),
          }),
        );
      });

      it('should not include oldValues for CREATE', async () => {
        const context = createMockExecutionContext({ method: 'POST' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            oldValues: null,
          }),
        );
      });
    });

    describe('UPDATE operations (PUT/PATCH)', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });
      });

      it('should log UPDATE action for PATCH requests', async () => {
        const context = createMockExecutionContext({ method: 'PATCH' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.UPDATE,
          }),
        );
      });

      it('should log UPDATE action for PUT requests', async () => {
        const context = createMockExecutionContext({ method: 'PUT' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.UPDATE,
          }),
        );
      });

      it('should fetch and include oldValues', async () => {
        const context = createMockExecutionContext({ method: 'PATCH' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            oldValues: expect.objectContaining({
              name: 'Old Product Name',
            }),
          }),
        );
      });

      it('should include both oldValues and newValues', async () => {
        const context = createMockExecutionContext({ method: 'PATCH' });
        const handler = createMockCallHandler({
          id: mockEntityId,
          name: 'Updated Product Name',
        });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            oldValues: expect.objectContaining({
              name: 'Old Product Name',
            }),
            newValues: expect.objectContaining({
              name: 'Updated Product Name',
            }),
          }),
        );
      });

      it('should handle missing old values gracefully', async () => {
        (prismaService.product.findFirst as jest.Mock).mockResolvedValue(null);

        const context = createMockExecutionContext({ method: 'PATCH' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            oldValues: null,
          }),
        );
      });
    });

    describe('DELETE operations', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });
      });

      it('should log DELETE action', async () => {
        const context = createMockExecutionContext({ method: 'DELETE' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.DELETE,
          }),
        );
      });

      it('should include oldValues for DELETE', async () => {
        const context = createMockExecutionContext({ method: 'DELETE' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            oldValues: expect.objectContaining({
              name: 'Old Product Name',
            }),
          }),
        );
      });

      it('should not include newValues for DELETE', async () => {
        const context = createMockExecutionContext({ method: 'DELETE' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            newValues: null,
          }),
        );
      });
    });

    describe('request metadata capture', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });
      });

      it('should capture IP address from x-forwarded-for header', async () => {
        const context = createMockExecutionContext({
          headers: {
            'x-forwarded-for': '10.0.0.1, 192.168.1.1',
            'user-agent': 'Mozilla/5.0',
          },
        });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ipAddress: '10.0.0.1',
          }),
        );
      });

      it('should capture user agent', async () => {
        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userAgent: 'Mozilla/5.0',
          }),
        );
      });

      it('should include metadata with method and path', async () => {
        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              method: 'POST',
              path: '/products',
            }),
          }),
        );
      });

      it('should capture tenantId from user', async () => {
        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId,
          }),
        );
      });

      it('should capture userId from user', async () => {
        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUserId,
          }),
        );
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });
      });

      it('should not audit when handler throws error', async () => {
        const context = createMockExecutionContext();
        const handler: CallHandler = {
          handle: () => throwError(() => new Error('Handler error')),
        };

        const result = await interceptor.intercept(context, handler);

        await expect(result.toPromise()).rejects.toThrow('Handler error');
        expect(auditLogsService.create).not.toHaveBeenCalled();
      });

      it('should not break response when audit logging fails', async () => {
        (auditLogsService.create as jest.Mock).mockRejectedValue(
          new Error('Audit failed'),
        );

        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        const response = await new Promise((resolve) => {
          result.subscribe({
            next: resolve,
          });
        });

        expect(response).toEqual(mockResponse);
      });

      it('should log error when audit logging fails', async () => {
        (auditLogsService.create as jest.Mock).mockRejectedValue(
          new Error('Audit failed'),
        );

        const context = createMockExecutionContext();
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(Logger.prototype.error).toHaveBeenCalled();
      });

      it('should warn when entity ID cannot be determined', async () => {
        const context = createMockExecutionContext({
          method: 'POST',
          params: { id: '' },
        });
        const handler = createMockCallHandler({ name: 'No ID in response' });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('Could not determine entity ID'),
        );
      });
    });

    describe('sensitive data handling', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'User';
          return undefined;
        });

        (
          prismaService as unknown as Record<string, { findFirst: jest.Mock }>
        ).user = {
          findFirst: jest.fn().mockResolvedValue({
            id: 'user-123',
            email: 'user@example.com',
            password: 'hashedpassword123',
            refreshToken: 'token123',
          }),
        };
      });

      it('should redact password field', async () => {
        const context = createMockExecutionContext({
          method: 'PATCH',
          params: { id: 'user-123' },
        });
        const handler = createMockCallHandler({
          id: 'user-123',
          email: 'user@example.com',
          password: 'newpassword',
        });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        const calls = (auditLogsService.create as jest.Mock).mock
          .calls as unknown[][];
        const createCall = calls[0][0] as {
          oldValues: Record<string, unknown>;
          newValues: Record<string, unknown>;
        };
        expect(createCall.oldValues.password).toBe('[REDACTED]');
        expect(createCall.newValues.password).toBe('[REDACTED]');
      });

      it('should redact refreshToken field', async () => {
        const context = createMockExecutionContext({
          method: 'PATCH',
          params: { id: 'user-123' },
        });
        const handler = createMockCallHandler({
          id: 'user-123',
          refreshToken: 'newtoken',
        });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        const calls = (auditLogsService.create as jest.Mock).mock
          .calls as unknown[][];
        const createCall = calls[0][0] as {
          oldValues: Record<string, unknown>;
        };
        expect(createCall.oldValues.refreshToken).toBe('[REDACTED]');
      });
    });

    describe('entity type mapping', () => {
      it('should handle Product entity type', async () => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });

        const context = createMockExecutionContext({ method: 'PATCH' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(prismaService.product.findFirst).toHaveBeenCalled();
      });

      it('should handle unmapped entity types gracefully', async () => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'UnknownEntity';
          return undefined;
        });

        const context = createMockExecutionContext({ method: 'PATCH' });
        const handler = createMockCallHandler();

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            oldValues: null,
          }),
        );
      });
    });

    describe('wrapped response handling', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === SKIP_AUDIT_KEY) return false;
          if (key === AUDIT_ENTITY_TYPE_KEY) return 'Product';
          return undefined;
        });
      });

      it('should extract ID from wrapped data response', async () => {
        const context = createMockExecutionContext({
          method: 'POST',
          params: { id: undefined as unknown as string },
        });
        const handler = createMockCallHandler({
          data: {
            id: 'wrapped-product-id',
            name: 'Wrapped Product',
          },
        });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            entityId: 'wrapped-product-id',
          }),
        );
      });

      it('should extract values from wrapped data response', async () => {
        const context = createMockExecutionContext({ method: 'POST' });
        const handler = createMockCallHandler({
          data: {
            id: 'product-id',
            name: 'Wrapped Name',
          },
        });

        const result = await interceptor.intercept(context, handler);

        await new Promise<void>((resolve) => {
          result.subscribe({
            complete: () => {
              setTimeout(resolve, 10);
            },
          });
        });

        expect(auditLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            newValues: expect.objectContaining({
              name: 'Wrapped Name',
            }),
          }),
        );
      });
    });
  });
});
