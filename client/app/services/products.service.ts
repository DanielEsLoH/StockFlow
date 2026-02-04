import { api } from "~/lib/api";
import type {
  Product,
  ProductFilters,
  ProductsResponse,
  CreateProductData,
  UpdateProductData,
  LowStockProduct,
} from "~/types/product";

// Service - Real API calls
export const productsService = {
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<ProductsResponse>(
      `/products?${params.toString()}`,
    );
    return data;
  },

  async getProduct(id: string): Promise<Product> {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },

  async createProduct(productData: CreateProductData): Promise<Product> {
    const { data } = await api.post<Product>("/products", productData);
    return data;
  },

  async updateProduct(
    id: string,
    productData: UpdateProductData,
  ): Promise<Product> {
    const { data } = await api.patch<Product>(`/products/${id}`, productData);
    return data;
  },

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  async getLowStockProducts(): Promise<LowStockProduct[]> {
    const { data } = await api.get<LowStockProduct[]>("/products/low-stock");
    return data;
  },

  async searchProducts(query: string): Promise<Product[]> {
    const { data } = await api.get<Product[]>(
      `/products/search?q=${encodeURIComponent(query)}`,
    );
    return data;
  },

  async updateStock(
    id: string,
    quantity: number,
    warehouseId?: string,
  ): Promise<Product> {
    const { data } = await api.patch<Product>(`/products/${id}/stock`, {
      quantity,
      warehouseId,
    });
    return data;
  },
};
