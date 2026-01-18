import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { categoriesService } from './categories.service';
import type { Category } from '~/types/product';

// Note: The categories service currently uses mock data internally
// These tests verify the service's CRUD logic

describe('categoriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe('getCategories', () => {
    it('should return an array of categories', async () => {
      const promise = categoriesService.getCategories();
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return categories with required properties', async () => {
      const promise = categoriesService.getCategories();
      vi.advanceTimersByTime(300);
      const result = await promise;

      result.forEach((category) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(typeof category.id).toBe('string');
        expect(typeof category.name).toBe('string');
      });
    });

    it('should include categories like Electronica and Accesorios', async () => {
      const promise = categoriesService.getCategories();
      vi.advanceTimersByTime(300);
      const result = await promise;

      const categoryNames = result.map((c) => c.name);
      expect(categoryNames).toContain('Electronica');
      expect(categoryNames).toContain('Accesorios');
    });
  });

  describe('getCategory', () => {
    it('should return a category by id', async () => {
      const promise = categoriesService.getCategory('1');
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Electronica');
    });

    it('should throw error for non-existent category', async () => {
      const promise = categoriesService.getCategory('non-existent-id');
      vi.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow('Categoria no encontrada');
    });
  });

  describe('createCategory', () => {
    it('should create a new category and return it', async () => {
      const newCategoryData = {
        name: 'Test Category',
        description: 'A test category for testing purposes',
      };

      const promise = categoriesService.createCategory(newCategoryData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Category');
      expect(result.description).toBe('A test category for testing purposes');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should generate a unique id for the new category', async () => {
      const newCategoryData = {
        name: 'Another Category',
      };

      const promise = categoriesService.createCategory(newCategoryData);
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });
  });

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      const updateData = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };

      const promise = categoriesService.updateCategory('1', updateData);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.name).toBe('Updated Electronics');
      expect(result.description).toBe('Updated description');
      expect(result.id).toBe('1');
    });

    it('should update the updatedAt timestamp', async () => {
      const updateData = {
        description: 'New description',
      };

      const promise = categoriesService.updateCategory('2', updateData);
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent category', async () => {
      const updateData = {
        name: 'New Name',
      };

      const promise = categoriesService.updateCategory('non-existent', updateData);
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Categoria no encontrada');
    });

    it('should only update provided fields', async () => {
      // First get the original category
      const getPromise = categoriesService.getCategory('3');
      vi.advanceTimersByTime(200);
      const original = await getPromise;

      const updateData = {
        name: 'Updated Ropa',
      };

      const updatePromise = categoriesService.updateCategory('3', updateData);
      vi.advanceTimersByTime(300);
      const result = await updatePromise;

      expect(result.name).toBe('Updated Ropa');
      // Original description should be preserved
      expect(result.description).toBe(original.description);
    });
  });

  describe('deleteCategory', () => {
    it('should delete an existing category', async () => {
      // First, create a category to delete
      const createPromise = categoriesService.createCategory({
        name: 'Category to Delete',
        description: 'This will be deleted',
      });
      vi.advanceTimersByTime(400);
      const createdCategory = await createPromise;

      // Now delete it
      const deletePromise = categoriesService.deleteCategory(createdCategory.id);
      vi.advanceTimersByTime(300);

      await expect(deletePromise).resolves.toBeUndefined();
    });

    it('should throw error for non-existent category', async () => {
      const promise = categoriesService.deleteCategory('non-existent');
      vi.advanceTimersByTime(300);

      await expect(promise).rejects.toThrow('Categoria no encontrada');
    });
  });

  describe('getCategoriesWithFilters', () => {
    it('should return categories with pagination metadata', async () => {
      const promise = categoriesService.getCategoriesWithFilters();
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

    it('should filter categories by search term in name', async () => {
      // Use 'accesorios' which is not modified by other tests (category '2')
      const promise = categoriesService.getCategoriesWithFilters({ search: 'accesorios' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((category) => {
        const matchesSearch =
          category.name.toLowerCase().includes('accesorios') ||
          category.description?.toLowerCase().includes('accesorios');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter categories by search term in description', async () => {
      // Use 'decoracion' which appears in category '4' (Hogar) description and is not modified
      const promise = categoriesService.getCategoriesWithFilters({ search: 'decoracion' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((category) => {
        const matchesSearch =
          category.name.toLowerCase().includes('decoracion') ||
          category.description?.toLowerCase().includes('decoracion');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter categories by parentId', async () => {
      // First create a parent category
      const createPromise = categoriesService.createCategory({
        name: 'Parent Category',
        description: 'This is a parent',
      });
      vi.advanceTimersByTime(400);
      const parent = await createPromise;

      // Create a child category with parentId
      const childPromise = categoriesService.createCategory({
        name: 'Child Category',
        description: 'This is a child',
        parentId: parent.id,
      });
      vi.advanceTimersByTime(400);
      await childPromise;

      // Filter by parentId
      const filterPromise = categoriesService.getCategoriesWithFilters({ parentId: parent.id });
      vi.advanceTimersByTime(300);
      const result = await filterPromise;

      result.data.forEach((category) => {
        expect(category.parentId).toBe(parent.id);
      });
    });

    it('should sort categories by name ascending by default', async () => {
      const promise = categoriesService.getCategoriesWithFilters({ sortBy: 'name', sortOrder: 'asc' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].name.localeCompare(result.data[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort categories by name descending', async () => {
      const promise = categoriesService.getCategoriesWithFilters({ sortBy: 'name', sortOrder: 'desc' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].name.localeCompare(result.data[i + 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should paginate results correctly', async () => {
      const promise = categoriesService.getCategoriesWithFilters({ page: 1, limit: 3 });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeLessThanOrEqual(3);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(3);
    });

    it('should return correct page for page 2', async () => {
      const page1Promise = categoriesService.getCategoriesWithFilters({ page: 1, limit: 2 });
      vi.advanceTimersByTime(300);
      const page1 = await page1Promise;

      const page2Promise = categoriesService.getCategoriesWithFilters({ page: 2, limit: 2 });
      vi.advanceTimersByTime(300);
      const page2 = await page2Promise;

      expect(page2.meta.page).toBe(2);
      // Categories from page 1 and page 2 should be different
      if (page1.data.length > 0 && page2.data.length > 0) {
        expect(page1.data[0].id).not.toBe(page2.data[0].id);
      }
    });

    it('should combine search and pagination filters', async () => {
      const promise = categoriesService.getCategoriesWithFilters({
        search: 'a',
        page: 1,
        limit: 5,
      });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.meta.page).toBe(1);
    });

    it('should handle empty search results', async () => {
      const promise = categoriesService.getCategoriesWithFilters({ search: 'nonexistentxyz123' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(0);
    });

    it('should handle sorting by a field with undefined values (parentId)', async () => {
      // Sorting by parentId triggers the ?? '' fallback since most categories have undefined parentId
      const promise = categoriesService.getCategoriesWithFilters({ sortBy: 'parentId', sortOrder: 'asc' });
      vi.advanceTimersByTime(300);
      const result = await promise;

      // Should still return results without errors
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.meta.total).toBeGreaterThan(0);
    });
  });
});