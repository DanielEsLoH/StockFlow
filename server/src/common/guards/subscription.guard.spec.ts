import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { SubscriptionGuard } from './subscription.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../auth/types';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let reflector: jest.Mocked<Reflector>;
  let prismaService: jest.Mocked<PrismaService>;

  // Helper to create mock execution context with a user
  const createMockContext = (user?: RequestUser): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  };

  // Test user
  const testUser: RequestUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    tenantId: 'tenant-123',
  };

  // Mock tenants with different plans
  const createMockTenant = (plan: SubscriptionPlan) => ({
    id: 'tenant-123',
    plan,
    name: 'Test Tenant',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as jest.Mocked<Reflector>;

    prismaService = {
      tenant: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    guard = new SubscriptionGuard(reflector, prismaService);

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
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    describe('when no subscription requirement is set', () => {
      it('should return true when requiredPlan is undefined', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(undefined);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should return true when requiredPlan is null', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(null);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should not query the database when no plan is required', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(undefined);

        await guard.canActivate(context);

        expect(prismaService.tenant.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('when subscription requirement is set', () => {
      describe('plan hierarchy - exact match', () => {
        it('should allow FREE plan when FREE is required', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.EMPRENDEDOR);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.EMPRENDEDOR),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow BASIC plan when BASIC is required', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PYME);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PYME),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow PRO plan when PRO is required', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PRO);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PRO),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow ENTERPRISE plan when ENTERPRISE is required', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PLUS);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PLUS),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });
      });

      describe('plan hierarchy - higher plans can access lower requirements', () => {
        it('should allow ENTERPRISE to access PRO features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PRO);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PLUS),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow PRO to access BASIC features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PYME);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PRO),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow BASIC to access FREE features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.EMPRENDEDOR);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PYME),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow ENTERPRISE to access FREE features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.EMPRENDEDOR);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PLUS),
          );

          const result = await guard.canActivate(context);

          expect(result).toBe(true);
        });
      });

      describe('plan hierarchy - lower plans cannot access higher requirements', () => {
        it('should deny FREE access to BASIC features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PYME);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.EMPRENDEDOR),
          );

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });

        it('should deny FREE access to PRO features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PRO);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.EMPRENDEDOR),
          );

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });

        it('should deny BASIC access to ENTERPRISE features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PLUS);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PYME),
          );

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });

        it('should deny PRO access to ENTERPRISE features', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PLUS);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PRO),
          );

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });
      });

      describe('null plan - no active subscription', () => {
        it('should throw ForbiddenException when tenant has no active plan', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PYME);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
            id: 'tenant-123',
            plan: null,
            name: 'Test Tenant',
          });

          await expect(guard.canActivate(context)).rejects.toThrow(
            ForbiddenException,
          );
        });

        it('should include "no active subscription" in error message when plan is null', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PRO);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
            id: 'tenant-123',
            plan: null,
            name: 'Test Tenant',
          });

          await expect(guard.canActivate(context)).rejects.toThrow(
            "This feature requires a PRO plan or higher. You don't have an active subscription.",
          );
        });

        it('should log debug message when tenant has no active plan', async () => {
          const debugSpy = jest.spyOn(Logger.prototype, 'debug');
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PYME);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue({
            id: 'tenant-123',
            plan: null,
            name: 'Test Tenant',
          });

          try {
            await guard.canActivate(context);
          } catch {
            // Expected to throw
          }

          expect(debugSpy).toHaveBeenCalledWith(
            'Access denied for tenant Test Tenant: no active subscription plan',
          );
        });
      });

      describe('error messages', () => {
        it('should include current and required plan in error message', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PRO);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.EMPRENDEDOR),
          );

          await expect(guard.canActivate(context)).rejects.toThrow(
            'This feature requires a PRO plan or higher. Your current plan is EMPRENDEDOR.',
          );
        });

        it('should throw ForbiddenException with correct message for PLUS requirement', async () => {
          const context = createMockContext(testUser);
          reflector.get.mockReturnValue(SubscriptionPlan.PLUS);
          (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
            createMockTenant(SubscriptionPlan.PYME),
          );

          await expect(guard.canActivate(context)).rejects.toThrow(
            'This feature requires a PLUS plan or higher. Your current plan is PYME.',
          );
        });
      });
    });

    describe('error handling', () => {
      it('should return false when user is undefined', async () => {
        const context = createMockContext(undefined);
        reflector.get.mockReturnValue(SubscriptionPlan.PYME);

        const result = await guard.canActivate(context);

        expect(result).toBe(false);
      });

      it('should throw ForbiddenException when tenant is not found', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.PYME);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException with "Tenant not found" message', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.PYME);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(guard.canActivate(context)).rejects.toThrow(
          'Tenant not found',
        );
      });
    });

    describe('database queries', () => {
      it('should query tenant with correct where clause', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.PYME);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          createMockTenant(SubscriptionPlan.PYME),
        );

        await guard.canActivate(context);

        expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
          where: { id: testUser.tenantId },
          select: { id: true, plan: true, name: true },
        });
      });

      it('should only select necessary fields from tenant', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.EMPRENDEDOR);
        const findUniqueMock = prismaService.tenant
          .findUnique as jest.MockedFunction<
          typeof prismaService.tenant.findUnique
        >;
        findUniqueMock.mockResolvedValue(
          createMockTenant(SubscriptionPlan.EMPRENDEDOR) as Awaited<
            ReturnType<typeof prismaService.tenant.findUnique>
          >,
        );

        await guard.canActivate(context);

        expect(findUniqueMock).toHaveBeenCalledWith(
          expect.objectContaining({
            select: { id: true, plan: true, name: true },
          }),
        );
      });
    });

    describe('reflector usage', () => {
      it('should get subscription metadata from handler', async () => {
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.PRO);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          createMockTenant(SubscriptionPlan.PRO),
        );

        await guard.canActivate(context);

        expect(reflector.get).toHaveBeenCalledWith(
          'subscription',
          context.getHandler(),
        );
      });
    });

    describe('logging', () => {
      it('should log warning when called without authenticated user', async () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const context = createMockContext(undefined);
        reflector.get.mockReturnValue(SubscriptionPlan.PYME);

        await guard.canActivate(context);

        expect(warnSpy).toHaveBeenCalledWith(
          'SubscriptionGuard called without authenticated user',
        );
      });

      it('should log error when tenant is not found', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.PYME);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

        try {
          await guard.canActivate(context);
        } catch {
          // Expected to throw
        }

        expect(errorSpy).toHaveBeenCalledWith(
          `Tenant not found: ${testUser.tenantId}`,
        );
      });

      it('should log debug message on access denial', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.PRO);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          createMockTenant(SubscriptionPlan.EMPRENDEDOR),
        );

        try {
          await guard.canActivate(context);
        } catch {
          // Expected to throw
        }

        expect(debugSpy).toHaveBeenCalledWith(
          'Access denied for tenant Test Tenant: has EMPRENDEDOR (level 0), requires PRO (level 2)',
        );
      });

      it('should log debug message on access granted', async () => {
        const debugSpy = jest.spyOn(Logger.prototype, 'debug');
        const context = createMockContext(testUser);
        reflector.get.mockReturnValue(SubscriptionPlan.PYME);
        (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(
          createMockTenant(SubscriptionPlan.PRO),
        );

        await guard.canActivate(context);

        expect(debugSpy).toHaveBeenCalledWith(
          'Access granted for tenant Test Tenant: has PRO, requires PYME',
        );
      });
    });
  });
});
