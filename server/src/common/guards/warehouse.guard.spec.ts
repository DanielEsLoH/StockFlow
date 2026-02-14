import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WarehouseGuard, WAREHOUSE_SCOPED_KEY } from './warehouse.guard';
import { PrismaService } from '../../prisma';
import { UserRole } from '@prisma/client';

describe('WarehouseGuard', () => {
  let guard: WarehouseGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: { user: { findUnique: jest.Mock } };

  const mockAdmin = {
    userId: 'admin-123',
    tenantId: 'tenant-123',
    role: UserRole.ADMIN,
  };

  const mockSuperAdmin = {
    userId: 'super-admin-123',
    tenantId: 'tenant-123',
    role: UserRole.SUPER_ADMIN,
  };

  const mockEmployee = {
    userId: 'employee-123',
    tenantId: 'tenant-123',
    role: UserRole.EMPLOYEE,
  };

  const mockManager = {
    userId: 'manager-123',
    tenantId: 'tenant-123',
    role: UserRole.MANAGER,
  };

  interface MockUser {
    userId: string;
    tenantId: string;
    role: UserRole;
  }

  const createMockExecutionContext = (
    user: MockUser | null,
    body?: Record<string, unknown>,
    query?: Record<string, unknown>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          body: body || {},
          query: query || {},
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<WarehouseGuard>(WarehouseGuard);
    reflector = module.get(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('non-warehouse-scoped endpoints', () => {
    it('should allow access when endpoint is not warehouse-scoped', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext(mockEmployee);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        WAREHOUSE_SCOPED_KEY,
        [context.getHandler(), context.getClass()],
      );
    });

    it('should allow access when metadata is not set (undefined)', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(mockEmployee);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('warehouse-scoped endpoints - admin users', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    it('should allow ADMIN access to any warehouse', async () => {
      const context = createMockExecutionContext(mockAdmin);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN access to any warehouse', async () => {
      const context = createMockExecutionContext(mockSuperAdmin);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('warehouse-scoped endpoints - no user', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    it('should throw ForbiddenException when no user in request', async () => {
      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Usuario no autenticado',
      );
    });
  });

  describe('warehouse-scoped endpoints - non-admin users', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    it('should allow EMPLOYEE with assigned warehouse', async () => {
      prisma.user.findUnique.mockResolvedValue({
        warehouseId: 'warehouse-1',
      });
      const context = createMockExecutionContext(mockEmployee);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockEmployee.userId },
        select: { warehouseId: true },
      });
    });

    it('should allow MANAGER with assigned warehouse', async () => {
      prisma.user.findUnique.mockResolvedValue({
        warehouseId: 'warehouse-1',
      });
      const context = createMockExecutionContext(mockManager);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when EMPLOYEE has no warehouse assigned', async () => {
      prisma.user.findUnique.mockResolvedValue({ warehouseId: null });
      const context = createMockExecutionContext(mockEmployee);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No tiene una bodega asignada',
      );
    });

    it('should throw ForbiddenException when user not found in DB', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const context = createMockExecutionContext(mockEmployee);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access when request warehouseId matches assigned warehouse', async () => {
      prisma.user.findUnique.mockResolvedValue({
        warehouseId: 'warehouse-1',
      });
      const context = createMockExecutionContext(
        mockEmployee,
        { warehouseId: 'warehouse-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw when request body warehouseId does not match assigned', async () => {
      prisma.user.findUnique.mockResolvedValue({
        warehouseId: 'warehouse-1',
      });
      const context = createMockExecutionContext(
        mockEmployee,
        { warehouseId: 'warehouse-2' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Solo puede operar en su bodega asignada',
      );
    });

    it('should throw when request query warehouseId does not match assigned', async () => {
      prisma.user.findUnique.mockResolvedValue({
        warehouseId: 'warehouse-1',
      });
      const context = createMockExecutionContext(
        mockEmployee,
        {},
        { warehouseId: 'warehouse-3' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Solo puede operar en su bodega asignada',
      );
    });

    it('should use body warehouseId over query warehouseId', async () => {
      prisma.user.findUnique.mockResolvedValue({
        warehouseId: 'warehouse-1',
      });
      // Body has matching ID, query has different — body wins via ??
      const context = createMockExecutionContext(
        mockEmployee,
        { warehouseId: 'warehouse-1' },
        { warehouseId: 'warehouse-2' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when no warehouseId in request but user has warehouse', async () => {
      prisma.user.findUnique.mockResolvedValue({
        warehouseId: 'warehouse-1',
      });
      const context = createMockExecutionContext(mockEmployee, {}, {});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('WAREHOUSE_SCOPED_KEY export', () => {
    it('should export the correct metadata key', () => {
      expect(WAREHOUSE_SCOPED_KEY).toBe('warehouse_scoped');
    });
  });
});
