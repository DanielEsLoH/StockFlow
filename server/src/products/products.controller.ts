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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
import { ProductEntity, PaginatedProductsEntity } from './entities';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

/**
 * ProductsController handles all product management endpoints.
 */
@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  /**
   * Lists all products in the current tenant with filtering and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'List all products',
    description: 'Returns a paginated list of all products in the current tenant with optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of products retrieved successfully',
    type: PaginatedProductsEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
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
   */
  @Get('low-stock')
  @ApiOperation({
    summary: 'List low stock products',
    description: 'Returns a paginated list of products where current stock is below the minimum stock level.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock products retrieved successfully',
    type: PaginatedProductsEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
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
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search products',
    description: 'Searches products by name, SKU, or barcode (case-insensitive).',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query string',
    example: 'headphones',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: PaginatedProductsEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
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
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Returns a specific product by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string): Promise<ProductResponse> {
    this.logger.log(`Getting product: ${id}`);

    return this.productsService.findOne(id);
  }

  /**
   * Creates a new product in the tenant.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Creates a new product in the tenant. Only ADMIN and MANAGER users can create products. Respects tenant product limits.',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions or tenant limit reached' })
  @ApiResponse({ status: 409, description: 'Product with this SKU or barcode already exists' })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponse> {
    this.logger.log(`Creating product: ${dto.name} (SKU: ${dto.sku})`);
    return this.productsService.create(dto);
  }

  /**
   * Updates a product.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a product',
    description: 'Updates an existing product. Only ADMIN and MANAGER users can update products.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID to update',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Product with this SKU or barcode already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    this.logger.log(`Updating product: ${id}`);
    return this.productsService.update(id, dto);
  }

  /**
   * Deletes a product.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product',
    description: 'Deletes a product. Only ADMIN users can delete products. Deletion fails if the product has associated invoice items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID to delete',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete - product has associated invoice items' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting product: ${id}`);
    return this.productsService.delete(id);
  }

  /**
   * Manually adjusts the stock of a product.
   */
  @Patch(':id/stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Adjust product stock',
    description: 'Manually adjusts the stock of a product. Creates a stock movement record for audit trail. Only ADMIN and MANAGER users can adjust stock.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock adjusted successfully',
    type: ProductEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ): Promise<ProductResponse> {
    this.logger.log(`Adjusting stock for product: ${id}`);
    return this.productsService.updateStock(id, dto);
  }
}