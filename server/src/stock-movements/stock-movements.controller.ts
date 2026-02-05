import {
  Controller,
  Get,
  Post,
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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { StockMovementsService } from './stock-movements.service';
import type {
  StockMovementResponse,
  PaginatedMovementsResponse,
  TransferResponse,
} from './stock-movements.service';
import { CreateMovementDto, CreateTransferDto, FilterMovementsDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles, CurrentUser } from '../common/decorators';
import {
  StockMovementEntity,
  PaginatedStockMovementsEntity,
  TransferResponseEntity,
} from './entities/stock-movement.entity';

/**
 * StockMovementsController handles all stock movement management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List movements: All authenticated roles
 * - View movement: All authenticated roles
 * - Create adjustment: ADMIN, MANAGER
 * - Product movements: All authenticated roles
 * - Warehouse movements: All authenticated roles
 */
@ApiTags('stock-movements')
@ApiBearerAuth('JWT-auth')
@Controller('stock-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockMovementsController {
  private readonly logger = new Logger(StockMovementsController.name);

  constructor(private readonly stockMovementsService: StockMovementsService) {}

  /**
   * Lists all stock movements in the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of stock movements
   *
   * @example
   * GET /stock-movements?page=1&limit=20&type=ADJUSTMENT&productId=uuid
   */
  @Get()
  @ApiOperation({
    summary: 'List all stock movements',
    description:
      'Returns a paginated list of stock movements with optional filters for type, product, warehouse, and date range. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of stock movements retrieved successfully',
    type: PaginatedStockMovementsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() filters: FilterMovementsDto,
  ): Promise<PaginatedMovementsResponse> {
    this.logger.log(
      `Listing stock movements - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.stockMovementsService.findAll(filters);
  }

  /**
   * Gets a stock movement by ID.
   * Includes product, warehouse, and user relations.
   *
   * @param id - Stock movement ID
   * @returns Stock movement data with all relations
   *
   * @example
   * GET /stock-movements/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get stock movement by ID',
    description:
      'Returns a single stock movement with product, warehouse, and user relations. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Stock movement ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock movement retrieved successfully',
    type: StockMovementEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Stock movement not found' })
  async findOne(@Param('id') id: string): Promise<StockMovementResponse> {
    this.logger.log(`Getting stock movement: ${id}`);

    return this.stockMovementsService.findOne(id);
  }

  /**
   * Creates a manual stock adjustment movement.
   * Only ADMIN and MANAGER users can create adjustments.
   *
   * Business logic:
   * - Only allows ADJUSTMENT type for manual creation
   * - Validates product exists and belongs to tenant
   * - Validates warehouse (if provided) exists and belongs to tenant
   * - Updates product stock based on quantity
   * - Creates movement record with the requesting user
   *
   * @param dto - Movement creation data
   * @param userId - ID of the authenticated user (from JWT)
   * @returns Created stock movement data
   *
   * @example
   * POST /stock-movements
   * {
   *   "productId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
   *   "warehouseId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
   *   "quantity": 10,
   *   "reason": "Inventory count correction",
   *   "notes": "Found extra units during audit"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create stock adjustment',
    description:
      'Creates a manual stock adjustment movement. Updates product stock based on quantity (positive for additions, negative for subtractions). Only ADMIN and MANAGER users can create adjustments.',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock adjustment created successfully',
    type: StockMovementEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or insufficient stock for negative adjustment',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Product or warehouse not found' })
  async create(
    @Body() dto: CreateMovementDto,
    @CurrentUser('userId') userId: string,
  ): Promise<StockMovementResponse> {
    this.logger.log(
      `Creating stock adjustment for product ${dto.productId}, quantity: ${dto.quantity}`,
    );

    return this.stockMovementsService.create(dto, userId);
  }

  /**
   * Creates a stock transfer between two warehouses.
   * Only ADMIN and MANAGER users can create transfers.
   *
   * Business logic:
   * - Validates both warehouses exist and belong to tenant
   * - Validates source warehouse has sufficient stock
   * - Decrements source warehouse stock
   * - Increments destination warehouse stock
   * - Creates two movement records (out and in)
   * - Product global stock remains unchanged
   *
   * @param dto - Transfer data
   * @param userId - ID of the authenticated user (from JWT)
   * @returns Both movement records (out and in)
   *
   * @example
   * POST /stock-movements/transfers
   * {
   *   "productId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
   *   "sourceWarehouseId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
   *   "destinationWarehouseId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
   *   "quantity": 10,
   *   "reason": "Reposicion de sucursal",
   *   "notes": "Solicitado por gerente"
   * }
   */
  @Post('transfers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create stock transfer between warehouses',
    description:
      'Creates a stock transfer between two warehouses. Decrements stock in source and increments in destination. Global product stock remains unchanged. Only ADMIN and MANAGER users can create transfers.',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock transfer created successfully',
    type: TransferResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data, insufficient stock, or same source/destination',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Product or warehouse not found',
  })
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser('userId') userId: string,
  ): Promise<TransferResponse> {
    this.logger.log(
      `Creating transfer for product ${dto.productId}: ${dto.quantity} units from ${dto.sourceWarehouseId} to ${dto.destinationWarehouseId}`,
    );

    return this.stockMovementsService.createTransfer(dto, userId);
  }
}

/**
 * ProductMovementsController handles stock movement endpoints scoped to a product.
 *
 * All endpoints require JWT authentication.
 * All authenticated roles can access these endpoints.
 */
@ApiTags('stock-movements')
@ApiBearerAuth('JWT-auth')
@Controller('products/:productId/movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductMovementsController {
  private readonly logger = new Logger(ProductMovementsController.name);

  constructor(private readonly stockMovementsService: StockMovementsService) {}

  /**
   * Gets all stock movements for a specific product.
   * Useful for viewing product inventory history.
   *
   * @param productId - Product ID
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of movements for the product
   *
   * @example
   * GET /products/:productId/movements?page=1&limit=20&type=SALE
   */
  @Get()
  @ApiOperation({
    summary: 'Get product stock movements',
    description:
      'Returns a paginated list of stock movements for a specific product. Useful for viewing product inventory history. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Product stock movements retrieved successfully',
    type: PaginatedStockMovementsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByProduct(
    @Param('productId') productId: string,
    @Query() filters: FilterMovementsDto,
  ): Promise<PaginatedMovementsResponse> {
    this.logger.log(
      `Listing stock movements for product ${productId} - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.stockMovementsService.findByProduct(productId, filters);
  }
}

/**
 * WarehouseMovementsController handles stock movement endpoints scoped to a warehouse.
 *
 * All endpoints require JWT authentication.
 * All authenticated roles can access these endpoints.
 */
@ApiTags('stock-movements')
@ApiBearerAuth('JWT-auth')
@Controller('warehouses/:warehouseId/movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseMovementsController {
  private readonly logger = new Logger(WarehouseMovementsController.name);

  constructor(private readonly stockMovementsService: StockMovementsService) {}

  /**
   * Gets all stock movements for a specific warehouse.
   * Useful for viewing warehouse inventory activity.
   *
   * @param warehouseId - Warehouse ID
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of movements for the warehouse
   *
   * @example
   * GET /warehouses/:warehouseId/movements?page=1&limit=20&type=TRANSFER
   */
  @Get()
  @ApiOperation({
    summary: 'Get warehouse stock movements',
    description:
      'Returns a paginated list of stock movements for a specific warehouse. Useful for viewing warehouse inventory activity. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'warehouseId',
    description: 'Warehouse ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Warehouse stock movements retrieved successfully',
    type: PaginatedStockMovementsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findByWarehouse(
    @Param('warehouseId') warehouseId: string,
    @Query() filters: FilterMovementsDto,
  ): Promise<PaginatedMovementsResponse> {
    this.logger.log(
      `Listing stock movements for warehouse ${warehouseId} - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.stockMovementsService.findByWarehouse(warehouseId, filters);
  }
}
