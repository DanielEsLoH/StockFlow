import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CACHE_TTL } from './cache.constants';

describe('CacheService', () => {
  let service: CacheService;

  const mockStoreKeys = jest.fn();
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
    stores: [
      {
        keys: mockStoreKeys,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value when it exists', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return undefined when value does not exist', async () => {
      const key = 'test-key';
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeUndefined();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return undefined when null is cached', async () => {
      const key = 'test-key';
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeUndefined();
    });

    it('should return undefined on cache error', async () => {
      const key = 'test-key';
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get(key);

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set(key, value);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        key,
        value,
        CACHE_TTL.MEDIUM * 1000,
      );
    });

    it('should set value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 60;
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl * 1000);
    });

    it('should handle cache set error gracefully', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.set(key, value)).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('should delete cached value', async () => {
      const key = 'test-key';
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.del(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should handle cache delete error gracefully', async () => {
      const key = 'test-key';
      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.del(key)).resolves.toBeUndefined();
    });
  });

  describe('delByPattern', () => {
    it('should delete keys matching pattern', async () => {
      const pattern = 'products:tenant-123:*';
      const keys = ['products:tenant-123:1', 'products:tenant-123:2'];
      mockStoreKeys.mockResolvedValue(keys);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.delByPattern(pattern);

      expect(mockStoreKeys).toHaveBeenCalledWith(pattern);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should handle no matching keys', async () => {
      const pattern = 'products:tenant-123:*';
      mockStoreKeys.mockResolvedValue([]);

      await service.delByPattern(pattern);

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should handle pattern delete error gracefully', async () => {
      const pattern = 'products:tenant-123:*';
      mockStoreKeys.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.delByPattern(pattern)).resolves.toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should clear all cache entries', async () => {
      mockCacheManager.clear.mockResolvedValue(undefined);

      await service.reset();

      expect(mockCacheManager.clear).toHaveBeenCalled();
    });

    it('should handle reset error gracefully', async () => {
      mockCacheManager.clear.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.reset()).resolves.toBeUndefined();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'test-key';
      const cachedValue = { data: 'cached' };
      mockCacheManager.get.mockResolvedValue(cachedValue);

      const factory = jest.fn().mockResolvedValue({ data: 'fresh' });

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not cached', async () => {
      const key = 'test-key';
      const freshValue = { data: 'fresh' };
      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue(freshValue);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(freshValue);
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        key,
        freshValue,
        CACHE_TTL.MEDIUM * 1000,
      );
    });

    it('should use custom TTL when provided', async () => {
      const key = 'test-key';
      const freshValue = { data: 'fresh' };
      const ttl = 120;
      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue(freshValue);

      await service.getOrSet(key, factory, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        key,
        freshValue,
        ttl * 1000,
      );
    });
  });

  describe('generateKey', () => {
    it('should generate key with prefix and tenantId', () => {
      const result = service.generateKey('products', 'tenant-123');

      expect(result).toBe('products:tenant-123');
    });

    it('should generate key with suffix', () => {
      const result = service.generateKey('product', 'tenant-123', 'prod-456');

      expect(result).toBe('product:tenant-123:prod-456');
    });
  });

  describe('hashParams', () => {
    it('should hash query parameters deterministically', () => {
      const params = { page: 1, limit: 10, search: 'test' };

      const result = service.hashParams(params);

      // Should be sorted alphabetically
      expect(result).toBe('limit:10:page:1:search:test');
    });

    it('should exclude undefined and null values', () => {
      const params = { page: 1, limit: undefined, search: null, status: '' };

      const result = service.hashParams(params);

      expect(result).toBe('page:1');
    });

    it('should handle empty params', () => {
      const result = service.hashParams({});

      expect(result).toBe('');
    });
  });

  describe('invalidate', () => {
    it('should invalidate pattern and base key', async () => {
      mockStoreKeys.mockResolvedValue([]);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidate('products', 'tenant-123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('products:tenant-123');
    });
  });

  describe('invalidateMultiple', () => {
    it('should invalidate multiple prefixes', async () => {
      mockStoreKeys.mockResolvedValue([]);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidateMultiple(['products', 'dashboard'], 'tenant-123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('products:tenant-123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('dashboard:tenant-123');
    });
  });
});
