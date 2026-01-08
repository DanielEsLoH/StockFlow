import {
  tenantStorage,
  getTenantId,
  getUserId,
  getCurrentContext,
  runWithTenantContext,
  TenantContext,
} from './tenant.context';

describe('TenantContext', () => {
  describe('tenantStorage', () => {
    it('should be an AsyncLocalStorage instance', () => {
      expect(tenantStorage).toBeDefined();
      expect(tenantStorage.getStore).toBeDefined();
      expect(tenantStorage.run).toBeDefined();
    });

    it('should return undefined when no context is set', () => {
      expect(tenantStorage.getStore()).toBeUndefined();
    });

    it('should store and retrieve context', (done) => {
      const context: TenantContext = {
        tenantId: 'tenant-123',
        userId: 'user-456',
      };

      tenantStorage.run(context, () => {
        expect(tenantStorage.getStore()).toEqual(context);
        done();
      });
    });

    it('should isolate context between different runs', (done) => {
      const context1: TenantContext = {
        tenantId: 'tenant-1',
        userId: 'user-1',
      };
      const context2: TenantContext = {
        tenantId: 'tenant-2',
        userId: 'user-2',
      };

      let context1Result: TenantContext | undefined;
      let context2Result: TenantContext | undefined;

      tenantStorage.run(context1, () => {
        context1Result = tenantStorage.getStore();
      });

      tenantStorage.run(context2, () => {
        context2Result = tenantStorage.getStore();
      });

      expect(context1Result).toEqual(context1);
      expect(context2Result).toEqual(context2);
      done();
    });

    it('should handle nested async operations', async () => {
      const context: TenantContext = {
        tenantId: 'tenant-nested',
        userId: 'user-nested',
      };

      await new Promise<void>((resolve) => {
        void tenantStorage.run(context, async () => {
          // Simulate async operation
          await Promise.resolve();
          expect(tenantStorage.getStore()).toEqual(context);

          // Nested async
          await new Promise<void>((innerResolve) => {
            setTimeout(() => {
              expect(tenantStorage.getStore()).toEqual(context);
              innerResolve();
            }, 10);
          });

          resolve();
        });
      });
    });
  });

  describe('getTenantId', () => {
    it('should return undefined when no context is set', () => {
      expect(getTenantId()).toBeUndefined();
    });

    it('should return tenantId when context is set', (done) => {
      const context: TenantContext = {
        tenantId: 'tenant-get-test',
        userId: 'user-get-test',
      };

      tenantStorage.run(context, () => {
        expect(getTenantId()).toBe('tenant-get-test');
        done();
      });
    });

    it('should return tenantId even without userId', (done) => {
      const context: TenantContext = {
        tenantId: 'tenant-only',
      };

      tenantStorage.run(context, () => {
        expect(getTenantId()).toBe('tenant-only');
        done();
      });
    });
  });

  describe('getUserId', () => {
    it('should return undefined when no context is set', () => {
      expect(getUserId()).toBeUndefined();
    });

    it('should return userId when context is set', (done) => {
      const context: TenantContext = {
        tenantId: 'tenant-user-test',
        userId: 'user-get-test',
      };

      tenantStorage.run(context, () => {
        expect(getUserId()).toBe('user-get-test');
        done();
      });
    });

    it('should return undefined when userId is not set in context', (done) => {
      const context: TenantContext = {
        tenantId: 'tenant-no-user',
      };

      tenantStorage.run(context, () => {
        expect(getUserId()).toBeUndefined();
        done();
      });
    });
  });

  describe('getCurrentContext', () => {
    it('should return undefined when no context is set', () => {
      expect(getCurrentContext()).toBeUndefined();
    });

    it('should return full context when set', (done) => {
      const context: TenantContext = {
        tenantId: 'tenant-full',
        userId: 'user-full',
      };

      tenantStorage.run(context, () => {
        const result = getCurrentContext();
        expect(result).toEqual(context);
        expect(result?.tenantId).toBe('tenant-full');
        expect(result?.userId).toBe('user-full');
        done();
      });
    });

    it('should return context with only required fields', (done) => {
      const context: TenantContext = {
        tenantId: 'tenant-minimal',
      };

      tenantStorage.run(context, () => {
        const result = getCurrentContext();
        expect(result).toEqual(context);
        expect(result?.tenantId).toBe('tenant-minimal');
        expect(result?.userId).toBeUndefined();
        done();
      });
    });
  });

  describe('runWithTenantContext', () => {
    it('should execute callback with context available', () => {
      const context: TenantContext = {
        tenantId: 'tenant-run',
        userId: 'user-run',
      };

      const result = runWithTenantContext(context, () => {
        return getTenantId();
      });

      expect(result).toBe('tenant-run');
    });

    it('should return callback result', () => {
      const context: TenantContext = {
        tenantId: 'tenant-return',
      };

      const result = runWithTenantContext(context, () => {
        return { data: 'test', tenantId: getTenantId() };
      });

      expect(result).toEqual({ data: 'test', tenantId: 'tenant-return' });
    });

    it('should handle async callbacks', async () => {
      const context: TenantContext = {
        tenantId: 'tenant-async',
        userId: 'user-async',
      };

      const result = await runWithTenantContext(context, async () => {
        await Promise.resolve();
        return {
          tenantId: getTenantId(),
          userId: getUserId(),
        };
      });

      expect(result).toEqual({
        tenantId: 'tenant-async',
        userId: 'user-async',
      });
    });

    it('should propagate errors from callback', () => {
      const context: TenantContext = {
        tenantId: 'tenant-error',
      };

      expect(() =>
        runWithTenantContext(context, () => {
          throw new Error('Test error');
        }),
      ).toThrow('Test error');
    });

    it('should not leak context after callback completes', () => {
      const context: TenantContext = {
        tenantId: 'tenant-leak-test',
      };

      runWithTenantContext(context, () => {
        expect(getTenantId()).toBe('tenant-leak-test');
      });

      // After the run completes, context should not be available
      expect(getTenantId()).toBeUndefined();
    });

    it('should handle nested contexts correctly', () => {
      const outerContext: TenantContext = {
        tenantId: 'tenant-outer',
        userId: 'user-outer',
      };

      const innerContext: TenantContext = {
        tenantId: 'tenant-inner',
        userId: 'user-inner',
      };

      runWithTenantContext(outerContext, () => {
        expect(getTenantId()).toBe('tenant-outer');

        runWithTenantContext(innerContext, () => {
          expect(getTenantId()).toBe('tenant-inner');
          expect(getUserId()).toBe('user-inner');
        });

        // After inner context completes, outer context should be restored
        expect(getTenantId()).toBe('tenant-outer');
        expect(getUserId()).toBe('user-outer');
      });
    });
  });

  describe('TenantContext interface', () => {
    it('should require tenantId', () => {
      const context: TenantContext = {
        tenantId: 'required-tenant',
      };

      expect(context.tenantId).toBe('required-tenant');
    });

    it('should allow optional userId', () => {
      const contextWithUser: TenantContext = {
        tenantId: 'tenant-with-user',
        userId: 'optional-user',
      };

      const contextWithoutUser: TenantContext = {
        tenantId: 'tenant-without-user',
      };

      expect(contextWithUser.userId).toBe('optional-user');
      expect(contextWithoutUser.userId).toBeUndefined();
    });
  });
});
