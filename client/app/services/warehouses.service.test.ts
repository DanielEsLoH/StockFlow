import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { warehousesService } from './warehouses.service';
import type { Warehouse } from '~/types/product';

// Note: The warehouses service currently uses mock data internally
// These tests verify the service's CRUD logic

describe('warehousesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe('getWarehouses', () => {
    it('should return an array of active warehouses', async () => {
      const promise = warehousesService.getWarehouses();
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should only return active warehouses', async () => {
      const promise = warehousesService.getWarehouses();
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.forEach((warehouse) => {
        expect(warehouse.isActive).toBe(true);
      });
    });

    it('should return warehouses with required properties', async () => {
      const promise = warehousesService.getWarehouses();
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.forEach((warehouse) => {
        expect(warehouse).toHaveProperty('id');
        expect(warehouse).toHaveProperty('name');
        expect(typeof warehouse.id).toBe('string');
        expect(typeof warehouse.name).toBe('string');
      });
    });

    it('should include warehouses like Bodega Principal', async () => {
      const promise = warehousesService.getWarehouses();
      vi.advanceTimersByTime(300);
      const result = await promise;

      const warehouseNames = result.map((w) => w.name);
      expect(warehouseNames).toContain('Bodega Principal');
    });
  });

  describe('getAllWarehouses', () => {
    it('should return all warehouses including inactive ones', async () => {
      const promise = warehousesService.getAllWarehouses();
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      // Should have more warehouses than getWarehouses (which filters inactive)
      const activePromise = warehousesService.getWarehouses();
      vi.advanceTimersByTime(300);
      const activeResult = await activePromise;

      expect(result.length).toBeGreaterThanOrEqual(activeResult.length);
    });

    it('should include both active and inactive warehouses', async () => {
      const promise = warehousesService.getAllWarehouses();
      vi.advanceTimersByTime(300);
      const result = await promise;

      const hasActive = result.some((w) => w.isActive === true);
      const hasInactive = result.some((w) => w.isActive === false);

      expect(hasActive).toBe(true);
      expect(hasInactive).toBe(true);
    });
  });

  describe('getWarehouse', () => {
    it('should return a warehouse by id', async () => {
      const promise = warehousesService.getWarehouse('1');
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Bodega Principal');
    });

    it('should return warehouse with address and city', async () => {
      const promise = warehousesService.getWarehouse('1');
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result.address).toBeDefined();
      expect(result.city).toBeDefined();
    });

    it('should throw error for non-existent warehouse', async () => {
      const promise = warehousesService.getWarehouse('non-existent-id');
      vi.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow('Bodega no encontrada');
    });
  });

  describe('createWarehouse', () => {
    it('should create a new warehouse and return it', async () => {
      const newWarehouseData = {
        name: 'Test Warehouse',
        address: 'Test Address 123',
        city: 'Test City',
        isActive: true,
      };

      const promise = warehousesService.createWarehouse(newWarehouseData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Warehouse');
      expect(result.address).toBe('Test Address 123');
      expect(result.city).toBe('Test City');
      expect(result.isActive).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should generate a unique id for the new warehouse', async () => {
      const newWarehouseData = {
        name: 'Another Warehouse',
        address: 'Another Address',
        city: 'Another City',
        isActive: true,
      };

      const promise = warehousesService.createWarehouse(newWarehouseData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should default isActive to true when not provided', async () => {
      const newWarehouseData = {
        name: 'Warehouse Without isActive',
        address: 'Test Address',
        city: 'Test City',
      };

      const promise = warehousesService.createWarehouse(newWarehouseData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.isActive).toBe(true);
    });

    it('should respect isActive false when explicitly provided', async () => {
      const newWarehouseData = {
        name: 'Inactive Warehouse',
        address: 'Test Address',
        city: 'Test City',
        isActive: false,
      };

      const promise = warehousesService.createWarehouse(newWarehouseData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.isActive).toBe(false);
    });
  });

  describe('updateWarehouse', () => {
    it('should update an existing warehouse', async () => {
      const updateData = {
        name: 'Updated Bodega',
        address: 'New Address 456',
      };

      const promise = warehousesService.updateWarehouse('1', updateData);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.name).toBe('Updated Bodega');
      expect(result.address).toBe('New Address 456');
      expect(result.id).toBe('1');
    });

    it('should update the updatedAt timestamp', async () => {
      const updateData = {
        city: 'New City',
      };

      const promise = warehousesService.updateWarehouse('2', updateData);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent warehouse', async () => {
      const updateData = {
        name: 'New Name',
      };

      const promise = warehousesService.updateWarehouse('non-existent', updateData);
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Bodega no encontrada');
    });

    it('should allow toggling isActive status', async () => {
      const updateData = {
        isActive: false,
      };

      const promise = warehousesService.updateWarehouse('2', updateData);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.isActive).toBe(false);
    });
  });

  describe('deleteWarehouse', () => {
    it('should delete an existing warehouse', async () => {
      // First, create a warehouse to delete
      const createPromise = warehousesService.createWarehouse({
        name: 'Warehouse to Delete',
        address: 'Delete Address',
        city: 'Delete City',
        isActive: true,
      });
      vi.advanceTimersByTime(400);
      const createdWarehouse = await createPromise;

      // Now delete it
      const deletePromise = warehousesService.deleteWarehouse(createdWarehouse.id);
      vi.advanceTimersByTime(300);

      await expect(deletePromise).resolves.toBeUndefined();
    });

    it('should throw error for non-existent warehouse', async () => {
      const promise = warehousesService.deleteWarehouse('non-existent');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Bodega no encontrada');
    });

    it('should throw error when deleting warehouse with products', async () => {
      // Warehouse '1' (Bodega Principal) has productCount > 0 in mock data
      const promise = warehousesService.deleteWarehouse('1');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('No se puede eliminar una bodega con productos');
    });
  });

  describe('getWarehousesWithFilters', () => {
    it('should return warehouses with pagination metadata', async () => {
      const promise = warehousesService.getWarehousesWithFilters();
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter warehouses by search term in name', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ search: 'bodega' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((warehouse) => {
        const matchesSearch =
          warehouse.name.toLowerCase().includes('bodega') ||
          warehouse.address?.toLowerCase().includes('bodega') ||
          warehouse.city?.toLowerCase().includes('bodega') ||
          warehouse.manager?.toLowerCase().includes('bodega');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter warehouses by search term in address', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ search: 'calle' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter warehouses by search term in city', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ search: 'bogota' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((warehouse) => {
        const matchesSearch =
          warehouse.name.toLowerCase().includes('bogota') ||
          warehouse.address?.toLowerCase().includes('bogota') ||
          warehouse.city?.toLowerCase().includes('bogota') ||
          warehouse.manager?.toLowerCase().includes('bogota');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter warehouses by search term in manager name', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ search: 'carlos' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((warehouse) => {
        expect(warehouse.manager?.toLowerCase()).toContain('carlos');
      });
    });

    it('should filter warehouses by city', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ city: 'Bogota' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.data.forEach((warehouse) => {
        expect(warehouse.city?.toLowerCase()).toBe('bogota');
      });
    });

    it('should filter warehouses by isActive true', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ isActive: true });
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.data.forEach((warehouse) => {
        expect(warehouse.isActive).toBe(true);
      });
    });

    it('should filter warehouses by isActive false', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ isActive: false });
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.data.forEach((warehouse) => {
        expect(warehouse.isActive).toBe(false);
      });
    });

    it('should sort warehouses by name ascending', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ sortBy: 'name', sortOrder: 'asc' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].name.localeCompare(result.data[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort warehouses by name descending', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ sortBy: 'name', sortOrder: 'desc' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].name.localeCompare(result.data[i + 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort warehouses by capacity ascending (numeric sort)', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ sortBy: 'capacity', sortOrder: 'asc' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aCapacity = result.data[i].capacity ?? 0;
        const bCapacity = result.data[i + 1].capacity ?? 0;
        expect(aCapacity).toBeLessThanOrEqual(bCapacity);
      }
    });

    it('should sort warehouses by capacity descending (numeric sort)', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ sortBy: 'capacity', sortOrder: 'desc' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        const aCapacity = result.data[i].capacity ?? 0;
        const bCapacity = result.data[i + 1].capacity ?? 0;
        expect(aCapacity).toBeGreaterThanOrEqual(bCapacity);
      }
    });

    it('should paginate results correctly', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ page: 1, limit: 2 });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it('should return correct page for page 2', async () => {
      const page1Promise = warehousesService.getWarehousesWithFilters({ page: 1, limit: 2 });
      vi.advanceTimersByTime(300);
      const page1 = await page1Promise;

      const page2Promise = warehousesService.getWarehousesWithFilters({ page: 2, limit: 2 });
      vi.advanceTimersByTime(300);
      const page2 = await page2Promise;

      expect(page2.meta.page).toBe(2);
      if (page1.data.length > 0 && page2.data.length > 0) {
        expect(page1.data[0].id).not.toBe(page2.data[0].id);
      }
    });

    it('should combine multiple filters', async () => {
      const promise = warehousesService.getWarehousesWithFilters({
        isActive: true,
        page: 1,
        limit: 5,
      });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeLessThanOrEqual(5);
      result.data.forEach((warehouse) => {
        expect(warehouse.isActive).toBe(true);
      });
    });

    it('should handle empty search results', async () => {
      const promise = warehousesService.getWarehousesWithFilters({ search: 'nonexistentxyz123' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getWarehouseStats', () => {
    it('should return warehouse stats for a valid warehouse', async () => {
      const promise = warehousesService.getWarehouseStats('1');
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result).toHaveProperty('totalProducts');
      expect(result).toHaveProperty('lowStockProducts');
      expect(result).toHaveProperty('totalValue');
      expect(result).toHaveProperty('utilizationPercentage');
    });

    it('should return correct totalProducts based on warehouse productCount', async () => {
      const promise = warehousesService.getWarehouseStats('1');
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result.totalProducts).toBe(156); // Bodega Principal has productCount: 156
    });

    it('should return utilization percentage', async () => {
      const promise = warehousesService.getWarehouseStats('1');
      vi.advanceTimersByTime(200);
      const result = await promise;

      // Bodega Principal: currentOccupancy: 7500, capacity: 10000 => 75%
      expect(result.utilizationPercentage).toBe(75);
    });

    it('should return 0 utilization when capacity is 0 or undefined', async () => {
      // First create a warehouse without capacity
      const createPromise = warehousesService.createWarehouse({
        name: 'No Capacity Warehouse',
        address: 'Test Address',
        city: 'Test City',
        isActive: true,
      });
      vi.advanceTimersByTime(400);
      const warehouse = await createPromise;

      const statsPromise = warehousesService.getWarehouseStats(warehouse.id);
      vi.advanceTimersByTime(200);
      const result = await statsPromise;

      expect(result.utilizationPercentage).toBe(0);
    });

    it('should handle warehouse with capacity but zero currentOccupancy', async () => {
      // Warehouse 4 (Almacen Costa) has capacity: 3000 and currentOccupancy: 0
      const promise = warehousesService.getWarehouseStats('4');
      vi.advanceTimersByTime(200);
      const result = await promise;

      // With capacity 3000 and currentOccupancy 0, utilization should be 0%
      expect(result.utilizationPercentage).toBe(0);
      expect(result.totalProducts).toBe(0);
    });

    it('should throw error for non-existent warehouse', async () => {
      const promise = warehousesService.getWarehouseStats('non-existent-id');
      vi.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow('Bodega no encontrada');
    });
  });

  describe('getCities', () => {
    it('should return an array of unique cities', async () => {
      const promise = warehousesService.getCities();
      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return sorted cities', async () => {
      const promise = warehousesService.getCities();
      vi.advanceTimersByTime(100);
      const result = await promise;

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].localeCompare(result[i + 1])).toBeLessThanOrEqual(0);
      }
    });

    it('should contain known cities from mock data', async () => {
      const promise = warehousesService.getCities();
      vi.advanceTimersByTime(100);
      const result = await promise;

      // Bogota and Medellin are in warehouses that aren't modified by other tests
      // (warehouse 1 and 3 are not deleted or have their city changed)
      expect(result).toContain('Bogota');
      expect(result).toContain('Medellin');
      // At least 2 cities should be present
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should only include unique cities', async () => {
      const promise = warehousesService.getCities();
      vi.advanceTimersByTime(100);
      const result = await promise;

      const uniqueCities = [...new Set(result)];
      expect(result.length).toBe(uniqueCities.length);
    });

    it('should not include undefined or empty city values', async () => {
      const promise = warehousesService.getCities();
      vi.advanceTimersByTime(100);
      const result = await promise;

      result.forEach((city) => {
        expect(city).toBeDefined();
        expect(city.length).toBeGreaterThan(0);
      });
    });
  });
});