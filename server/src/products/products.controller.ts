import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import type {
  ProductResponse,
  PaginatedProductsResponse,
} from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  FilterProductsDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

/**
 * ProductsController handles all product management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List products: All authenticated roles
 * - View product: All authenticated roles
 * - Search products: All authenticated roles
 * - Low stock products: All authenticated roles
 * - Create product: ADMIN, MANAGER
 * - Update product: ADMIN, MANAGER
 * - Update stock: ADMIN, MANAGER
 * - Delete product: ADMIN only
 */
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  /**
   * Lists all products in the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of products
   *
   * @example
   * GET /products?page=1&limit=20&status=ACTIVE&categoryId=xxx
   */
  @Get()
  async findAll(
    @Query() filters: FilterProductsDto,
  ): Promise<PaginatedProductsResponse> {
    this.logger.log(
      `Listing products - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.productsService.findAll(filters);
  }

  /**
   * Lists products with low stock (stock < minStock).
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of low stock products
   *
   * @example
   * GET /products/low-stock?page=1&limit=20
   */
  @Get('low-stock')
  async findLowStock(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedProductsResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(
      `Listing low stock products - page: ${pageNum}, limit: ${limitNum}`,
    );

    return this.productsService.findLowStock(pageNum, limitNum);
  }

  /**
   * Searches products by name, SKU, or barcode.
   *
   * @param q - Search query string
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of matching products
   *
   * @example
   * GET /products/search?q=headphones&page=1&limit=20
   */
  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedProductsResponse> {
    const query = q?.trim() ?? '';
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(
      `Searching products - query: "${query}", page: ${pageNum}, limit: ${limitNum}`,
    );

    return this.productsService.search(query, pageNum, limitNum);
  }

  /**
   * Gets a product by ID.
   *
   * @param id - Product ID
   * @returns Product data
   *
   * @example
   * GET /products/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductResponse> {
    this.logger.log(`Getting product: ${id}`);

    return this.productsService.findOne(id);
  }

  /**
   * Creates a new product in the tenant.
   * Only ADMIN and MANAGER users can create products.
   * Respects tenant product limits.
   *
   * @param dto - Product creation data
   * @returns Created product data
   *
   * @example
   * POST /products
   * {
   *   "sku": "SKU-001",
   *   "name": "Wireless Headphones",
   *   "costPrice": 50,
   *   "salePrice": 79.99,
   *   "stock": 100,
   *   "minStock": 10
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto): Promise<ProductResponse> {
    this.logger.log(`Creating product: ${dto.name} (SKU: ${dto.sku})`);
    return this.productsService.create(dto);
  }

  /**
   * Updates a product.
   * Only ADMIN and MANAGER users can update products.
   *
   * @param id - Product ID to update
   * @param dto - Update data
   * @returns Updated product data
   *
   * @example
   * PATCH /products/:id
   * {
   *   "name": "Updated Name",
   *   "salePrice": 89.99
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    this.logger.log(`Updating product: ${id}`);
    return this.productsService.update(id, dto);
  }

  /**
   * Deletes a product.
   * Only ADMIN users can delete products.
   * Deletion fails if the product has associated invoice items.
   *
   * @param id - Product ID to delete
   *
   * @example
   * DELETE /products/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting product: ${id}`);
    return this.productsService.delete(id);
  }

  /**
   * Manually adjusts the stock of a product.
   * Only ADMIN and MANAGER users can adjust stock.
   * Creates a stock movement record for audit trail.
   *
   * @param id - Product ID
   * @param dto - Stock adjustment data
   * @returns Updated product data
   *
   * @example
   * PATCH /products/:id/stock
   * {
   *   "quantity": 50,
   *   "adjustmentType": "ADD",
   *   "reason": "Received new shipment"
   * }
   */
  @Patch(':id/stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ): Promise<ProductResponse> {
    this.logger.log(`Adjusting stock for product: ${id}`);
    return this.productsService.updateStock(id, dto);
  }
}
