import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Product, ProductStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  FilterProductsDto,
  StockAdjustmentType,
} from './dto';

/**
 * Product data returned in responses
 */
export interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  costPrice: number;
  salePrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  maxStock: number | null;
  barcode: string | null;
  brand: string | null;
  unit: string;
  imageUrl: string | null;
  status: ProductStatus;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedProductsResponse {
  data: ProductResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * ProductsService handles all product management operations including
 * CRUD operations, stock control, and search functionality with multi-tenant isolation.
 *
 * Products are the core inventory items within a tenant.
 * Each product SKU and barcode must be unique within its tenant.
 */
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Lists all products within the current tenant with filtering and pagination.
   * When warehouseId is provided, returns warehouse-specific stock instead of global stock.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of products
   */
  async findAll(
    filters: FilterProductsDto = {},
  ): Promise<PaginatedProductsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      status,
      lowStock,
      warehouseId,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing products for tenant ${tenantId}, page ${page}, limit ${limit}${warehouseId ? `, warehouse ${warehouseId}` : ''}`,
    );

    // If warehouseId is provided, verify it exists and belongs to the tenant
    if (warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId },
      });
      if (!warehouse) {
        this.logger.warn(`Warehouse not found: ${warehouseId}`);
        throw new NotFoundException('Bodega no encontrada');
      }
    }

    // Build where clause
    const where: Prisma.ProductWhereInput = { tenantId };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // For low stock filter, we need to filter in memory since Prisma
    // doesn't support comparing two columns directly
    if (lowStock) {
      const allProducts = await this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true, color: true } },
        },
      });

      return this.filterAndPaginateLowStock(allProducts, page, limit);
    }

    // Include warehouseStock when warehouseId is provided
    const includeWarehouseStock = warehouseId
      ? {
          warehouseStock: {
            where: { warehouseId },
            select: { quantity: true },
          },
        }
      : undefined;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true, color: true } },
          ...includeWarehouseStock,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // If warehouseId is provided, use warehouse-specific stock
    if (warehouseId) {
      return this.buildPaginatedResponseWithWarehouseStock(
        products as (Product & { warehouseStock: { quantity: number }[] })[],
        total,
        page,
        limit,
      );
    }

    return this.buildPaginatedResponse(products, total, page, limit);
  }

  /**
   * Lists products with low stock (stock < minStock).
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of products per page
   * @returns Paginated list of low stock products
   */
  async findLowStock(page = 1, limit = 10): Promise<PaginatedProductsResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Listing low stock products for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Get all products and filter in memory for stock < minStock comparison
    const allProducts = await this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    return this.filterAndPaginateLowStock(allProducts, page, limit);
  }

  /**
   * Searches products by name, SKU, or barcode (case-insensitive).
   *
   * @param query - Search query string
   * @param page - Page number (1-indexed)
   * @param limit - Number of products per page
   * @returns Paginated list of matching products
   */
  async search(
    query: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedProductsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Searching products for tenant ${tenantId}, query "${query}", page ${page}`,
    );

    const where: Prisma.ProductWhereInput = {
      tenantId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.buildPaginatedResponse(products, total, page, limit);
  }

  /**
   * Finds a single product by ID within the current tenant.
   * Results are cached for improved performance.
   *
   * @param id - Product ID
   * @returns Product data
   * @throws NotFoundException if product not found
   */
  async findOne(id: string): Promise<ProductResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const cacheKey = this.cache.generateKey(CACHE_KEYS.PRODUCT, tenantId, id);

    this.logger.debug(`Finding product ${id} in tenant ${tenantId}`);

    // Try to get from cache first
    const cached = await this.cache.get<ProductResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${id}`);
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const response = this.mapToProductResponse(product);

    // Cache the result
    await this.cache.set(cacheKey, response, CACHE_TTL.PRODUCT);

    return response;
  }

  /**
   * Creates a new product within the current tenant.
   * Enforces tenant product limits before creation.
   *
   * @param dto - Product creation data
   * @returns Created product data
   * @throws ConflictException if SKU or barcode already exists in tenant
   * @throws ForbiddenException if product limit is reached
   */
  async create(dto: CreateProductDto): Promise<ProductResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    // Enforce tenant product limit
    await this.tenantContext.enforceLimit('products');

    const normalizedSku = dto.sku.trim();
    const normalizedBarcode = dto.barcode?.trim() || null;

    this.logger.debug(
      `Creating product "${dto.name}" (SKU: ${normalizedSku}) in tenant ${tenantId}`,
    );

    // Check for existing product with same SKU in tenant
    const existingSku = await this.prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku: normalizedSku,
        },
      },
    });

    if (existingSku) {
      this.logger.warn(`SKU already exists: ${normalizedSku}`);
      throw new ConflictException(
        `A product with the SKU "${normalizedSku}" already exists`,
      );
    }

    // Check for existing product with same barcode in tenant (if barcode provided)
    if (normalizedBarcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: {
          tenantId,
          barcode: normalizedBarcode,
        },
      });

      if (existingBarcode) {
        this.logger.warn(`Barcode already exists: ${normalizedBarcode}`);
        throw new ConflictException(
          `A product with the barcode "${normalizedBarcode}" already exists`,
        );
      }
    }

    // Validate categoryId if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });

      if (!category) {
        throw new BadRequestException(
          `Category with ID ${dto.categoryId} not found`,
        );
      }
    }

    // Create product
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        sku: normalizedSku,
        name: dto.name.trim(),
        description: dto.description,
        categoryId: dto.categoryId,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice,
        taxRate: dto.taxRate ?? 19,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        maxStock: dto.maxStock,
        barcode: normalizedBarcode,
        brand: dto.brand,
        unit: dto.unit ?? 'UND',
        imageUrl: dto.imageUrl,
        status: ProductStatus.ACTIVE,
      },
    });

    this.logger.log(`Product created: ${product.name} (${product.id})`);

    // Invalidate product list cache and dashboard cache
    await this.invalidateProductCaches(tenantId);

    return this.mapToProductResponse(product);
  }

  /**
   * Updates an existing product.
   *
   * @param id - Product ID to update
   * @param dto - Update data
   * @returns Updated product data
   * @throws NotFoundException if product not found
   * @throws ConflictException if new SKU or barcode already exists in tenant
   */
  async update(id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating product ${id} in tenant ${tenantId}`);

    // Find the product to update
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${id}`);
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Build update data
    const updateData: Prisma.ProductUpdateInput = {};

    // SKU requires uniqueness check
    if (dto.sku !== undefined) {
      const normalizedSku = dto.sku.trim();
      if (normalizedSku !== product.sku) {
        const existingSku = await this.prisma.product.findUnique({
          where: {
            tenantId_sku: {
              tenantId,
              sku: normalizedSku,
            },
          },
        });

        if (existingSku) {
          throw new ConflictException(
            `A product with the SKU "${normalizedSku}" already exists`,
          );
        }

        updateData.sku = normalizedSku;
      }
    }

    // Barcode requires uniqueness check
    if (dto.barcode !== undefined) {
      const normalizedBarcode = dto.barcode?.trim() || null;
      if (normalizedBarcode !== product.barcode) {
        if (normalizedBarcode) {
          const existingBarcode = await this.prisma.product.findFirst({
            where: {
              tenantId,
              barcode: normalizedBarcode,
              NOT: { id },
            },
          });

          if (existingBarcode) {
            throw new ConflictException(
              `A product with the barcode "${normalizedBarcode}" already exists`,
            );
          }
        }

        updateData.barcode = normalizedBarcode;
      }
    }

    // Validate categoryId if provided
    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        updateData.category = { disconnect: true };
      } else {
        const category = await this.prisma.category.findFirst({
          where: { id: dto.categoryId, tenantId },
        });

        if (!category) {
          throw new BadRequestException(
            `Category with ID ${dto.categoryId} not found`,
          );
        }

        updateData.category = { connect: { id: dto.categoryId } };
      }
    }

    // Update simple fields
    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.costPrice !== undefined) {
      updateData.costPrice = dto.costPrice;
    }

    if (dto.salePrice !== undefined) {
      updateData.salePrice = dto.salePrice;
    }

    if (dto.taxRate !== undefined) {
      updateData.taxRate = dto.taxRate;
    }

    if (dto.minStock !== undefined) {
      updateData.minStock = dto.minStock;
    }

    if (dto.maxStock !== undefined) {
      updateData.maxStock = dto.maxStock;
    }

    if (dto.imageUrl !== undefined) {
      updateData.imageUrl = dto.imageUrl;
    }

    if (dto.brand !== undefined) {
      updateData.brand = dto.brand;
    }

    if (dto.unit !== undefined) {
      updateData.unit = dto.unit;
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    // Update the product
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Product updated: ${updatedProduct.name} (${updatedProduct.id})`,
    );

    // Invalidate caches for this product and related lists
    await this.invalidateProductCaches(tenantId, id);

    return this.mapToProductResponse(updatedProduct);
  }

  /**
   * Deletes a product from the tenant.
   * Deletion fails if the product has associated invoice items.
   *
   * @param id - Product ID to delete
   * @throws NotFoundException if product not found
   * @throws BadRequestException if product has associated invoice items
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting product ${id} in tenant ${tenantId}`);

    // Find the product to delete
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${id}`);
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check if any invoice items are associated with this product
    const invoiceItemCount = await this.prisma.invoiceItem.count({
      where: { productId: id },
    });

    if (invoiceItemCount > 0) {
      this.logger.warn(
        `Cannot delete product ${id}: ${invoiceItemCount} invoice items associated`,
      );
      throw new BadRequestException(
        `Cannot delete product "${product.name}". ${invoiceItemCount} invoice item(s) are associated with this product.`,
      );
    }

    await this.prisma.product.delete({ where: { id } });

    this.logger.log(`Product deleted: ${product.name} (${product.id})`);

    // Invalidate caches for this product and related lists
    await this.invalidateProductCaches(tenantId, id);
  }

  /**
   * Manually adjusts the stock of a product.
   *
   * @param id - Product ID
   * @param dto - Stock adjustment data
   * @returns Updated product data
   * @throws NotFoundException if product not found
   * @throws BadRequestException if adjustment would result in negative stock
   */
  async updateStock(id: string, dto: UpdateStockDto): Promise<ProductResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Adjusting stock for product ${id} in tenant ${tenantId}`,
    );

    // Find the product
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${id}`);
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Calculate new stock based on adjustment type
    let newStock: number;
    const adjustmentType = dto.adjustmentType ?? StockAdjustmentType.SET;

    switch (adjustmentType) {
      case StockAdjustmentType.SET:
        newStock = dto.quantity;
        break;
      case StockAdjustmentType.ADD:
        newStock = product.stock + dto.quantity;
        break;
      case StockAdjustmentType.SUBTRACT:
        newStock = product.stock - dto.quantity;
        break;
      default:
        newStock = dto.quantity;
    }

    // Validate new stock is not negative
    if (newStock < 0) {
      throw new BadRequestException(
        `Stock adjustment would result in negative stock (${newStock}). Current stock: ${product.stock}`,
      );
    }

    // Update stock and determine new status
    const newStatus =
      newStock === 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE;

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        stock: newStock,
        status:
          product.status === ProductStatus.INACTIVE
            ? ProductStatus.INACTIVE
            : newStatus,
      },
    });

    this.logger.log(
      `Stock adjusted for ${product.name}: ${product.stock} -> ${newStock} (${adjustmentType})`,
    );

    // Create stock movement record for audit trail
    await this.prisma.stockMovement.create({
      data: {
        tenantId,
        productId: id,
        type: 'ADJUSTMENT',
        quantity:
          adjustmentType === StockAdjustmentType.SET
            ? newStock - product.stock
            : adjustmentType === StockAdjustmentType.ADD
              ? dto.quantity
              : -dto.quantity,
        reason: dto.reason,
        notes: dto.notes,
      },
    });

    // Invalidate caches for this product and related lists
    await this.invalidateProductCaches(tenantId, id);

    return this.mapToProductResponse(updatedProduct);
  }

  /**
   * Maps a Product entity to a ProductResponse object
   *
   * @param product - The product entity to map
   * @returns ProductResponse object
   */
  private mapToProductResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      taxRate: Number(product.taxRate),
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      barcode: product.barcode,
      brand: product.brand,
      unit: product.unit,
      imageUrl: product.imageUrl,
      status: product.status,
      tenantId: product.tenantId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Builds a paginated response from products and pagination params
   */
  private buildPaginatedResponse(
    products: Product[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedProductsResponse {
    return {
      data: products.map((product) => this.mapToProductResponse(product)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Builds a paginated response with warehouse-specific stock.
   * Uses the warehouseStock quantity instead of the global product stock.
   */
  private buildPaginatedResponseWithWarehouseStock(
    products: (Product & { warehouseStock: { quantity: number }[] })[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedProductsResponse {
    return {
      data: products.map((product) => ({
        ...this.mapToProductResponse(product),
        // Override stock with warehouse-specific quantity (0 if not in warehouse)
        stock: product.warehouseStock[0]?.quantity ?? 0,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Filters and paginates low stock products from a list
   */
  private filterAndPaginateLowStock(
    products: Product[],
    page: number,
    limit: number,
  ): PaginatedProductsResponse {
    const lowStockProducts = products.filter((p) => p.stock < p.minStock);
    const total = lowStockProducts.length;
    const skip = (page - 1) * limit;
    const paginatedProducts = lowStockProducts.slice(skip, skip + limit);

    return this.buildPaginatedResponse(paginatedProducts, total, page, limit);
  }

  /**
   * Invalidates product-related caches after a mutation.
   * Clears both individual product cache and list caches.
   *
   * @param tenantId - Tenant identifier
   * @param productId - Optional specific product ID to invalidate
   */
  private async invalidateProductCaches(
    tenantId: string,
    productId?: string,
  ): Promise<void> {
    // Invalidate product list caches (includes all query variations)
    await this.cache.invalidate(CACHE_KEYS.PRODUCTS, tenantId);

    // Invalidate individual product cache if provided
    if (productId) {
      const productKey = this.cache.generateKey(
        CACHE_KEYS.PRODUCT,
        tenantId,
        productId,
      );
      await this.cache.del(productKey);
    }

    // Invalidate dashboard cache as it depends on product data
    await this.cache.invalidate(CACHE_KEYS.DASHBOARD, tenantId);
  }
}
