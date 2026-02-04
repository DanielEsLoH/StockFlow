import { api } from "~/lib/api";
import type {
  Category,
  CategoryFilters,
  CategoriesResponse,
  CreateCategoryData,
  UpdateCategoryData,
} from "~/types/category";

// Service - Real API calls
export const categoriesService = {
  // Get paginated categories with filters
  async getCategoriesWithFilters(
    filters: CategoryFilters = {},
  ): Promise<CategoriesResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<CategoriesResponse>(
      `/categories?${params.toString()}`,
    );
    return data;
  },

  // Get all categories (for dropdowns)
  // Backend returns paginated response, extract the data array
  async getCategories(): Promise<Category[]> {
    const { data } = await api.get<CategoriesResponse>(
      "/categories?limit=1000",
    );
    return data.data;
  },

  async getCategory(id: string): Promise<Category> {
    const { data } = await api.get<Category>(`/categories/${id}`);
    return data;
  },

  async createCategory(categoryData: CreateCategoryData): Promise<Category> {
    const { data } = await api.post<Category>("/categories", categoryData);
    return data;
  },

  async updateCategory(
    id: string,
    categoryData: UpdateCategoryData,
  ): Promise<Category> {
    const { data } = await api.patch<Category>(
      `/categories/${id}`,
      categoryData,
    );
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
