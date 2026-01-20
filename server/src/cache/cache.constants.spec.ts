import {
  CACHE_KEYS,
  CACHE_TTL,
  getCacheKey,
  hashQueryParams,
} from './cache.constants';

describe('Cache Constants', () => {
  describe('CACHE_KEYS', () => {
    it('should have all required cache key prefixes', () => {
      expect(CACHE_KEYS.PRODUCTS).toBe('products');
      expect(CACHE_KEYS.PRODUCT).toBe('product');
      expect(CACHE_KEYS.CATEGORIES).toBe('categories');
      expect(CACHE_KEYS.CATEGORY).toBe('category');
      expect(CACHE_KEYS.DASHBOARD).toBe('dashboard');
      expect(CACHE_KEYS.CUSTOMERS).toBe('customers');
      expect(CACHE_KEYS.CUSTOMER).toBe('customer');
      expect(CACHE_KEYS.WAREHOUSES).toBe('warehouses');
      expect(CACHE_KEYS.WAREHOUSE).toBe('warehouse');
      expect(CACHE_KEYS.USER).toBe('user');
    });
  });

  describe('CACHE_TTL', () => {
    it('should have TTL values in seconds', () => {
      expect(CACHE_TTL.SHORT).toBe(60);
      expect(CACHE_TTL.MEDIUM).toBe(300);
      expect(CACHE_TTL.LONG).toBe(900);
      expect(CACHE_TTL.EXTENDED).toBe(3600);
      expect(CACHE_TTL.DASHBOARD).toBe(120);
      expect(CACHE_TTL.PRODUCTS).toBe(300);
      expect(CACHE_TTL.PRODUCT).toBe(300);
      expect(CACHE_TTL.CATEGORIES).toBe(900);
      expect(CACHE_TTL.WAREHOUSES).toBe(900);
      expect(CACHE_TTL.CUSTOMERS).toBe(300);
    });
  });

  describe('getCacheKey', () => {
    it('should generate key with prefix and tenantId', () => {
      const result = getCacheKey('products', 'tenant-123');
      expect(result).toBe('products:tenant-123');
    });

    it('should generate key with suffix', () => {
      const result = getCacheKey('product', 'tenant-123', 'prod-456');
      expect(result).toBe('product:tenant-123:prod-456');
    });

    it('should handle empty suffix', () => {
      const result = getCacheKey('products', 'tenant-123', '');
      expect(result).toBe('products:tenant-123');
    });

    it('should handle complex suffix', () => {
      const result = getCacheKey('products', 'tenant-123', 'page:1:limit:10');
      expect(result).toBe('products:tenant-123:page:1:limit:10');
    });
  });

  describe('hashQueryParams', () => {
    it('should hash parameters in alphabetical order', () => {
      const params = { page: 1, limit: 10, search: 'test' };
      const result = hashQueryParams(params);
      expect(result).toBe('limit:10:page:1:search:test');
    });

    it('should exclude undefined values', () => {
      const params = { page: 1, limit: undefined };
      const result = hashQueryParams(params);
      expect(result).toBe('page:1');
    });

    it('should exclude null values', () => {
      const params = { page: 1, search: null };
      const result = hashQueryParams(params);
      expect(result).toBe('page:1');
    });

    it('should exclude empty string values', () => {
      const params = { page: 1, search: '' };
      const result = hashQueryParams(params);
      expect(result).toBe('page:1');
    });

    it('should handle empty object', () => {
      const result = hashQueryParams({});
      expect(result).toBe('');
    });

    it('should convert non-string values to strings', () => {
      const params = { page: 1, active: true, count: 0 };
      const result = hashQueryParams(params);
      expect(result).toBe('active:true:count:0:page:1');
    });

    it('should handle zero as valid value', () => {
      const params = { page: 0 };
      const result = hashQueryParams(params);
      expect(result).toBe('page:0');
    });

    it('should handle boolean false as valid value', () => {
      const params = { active: false };
      const result = hashQueryParams(params);
      expect(result).toBe('active:false');
    });
  });
});
