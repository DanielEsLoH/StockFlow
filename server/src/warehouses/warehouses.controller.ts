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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { WarehousesService } from './warehouses.service';
import type {
  WarehouseResponse,
  WarehouseWithStockSummary,
  PaginatedWarehousesResponse,
  PaginatedWarehouseStockResponse,
} from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';
import {
  WarehouseEntity,
  WarehouseWithStockSummaryEntity,
  PaginatedWarehousesEntity,
  PaginatedWarehouseStockEntity,
} from './entities/warehouse.entity';

/**
 * WarehousesController handles all warehouse management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List warehouses: All authenticated roles
 * - View warehouse: All authenticated roles
 * - View warehouse stock: All authenticated roles
 * - Create warehouse: ADMIN only
 * - Update warehouse: ADMIN, MANAGER
 * - Delete warehouse: ADMIN only
 */
@ApiTags('warehouses')
@ApiBearerAuth('JWT-auth')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehousesController {
  private readonly logger = new Logger(WarehousesController.name);

  constructor(private readonly warehousesService: WarehousesService) {}

  /**
   * Lists all warehouses in the current tenant with pagination.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of warehouses
   *
   * @example
   * GET /warehouses?page=1&limit=20
   */
  @Get()
  @ApiOperation({
    summary: 'List all warehouses',
    description:
      'Returns a paginated list of all warehouses in the current tenant. All authenticated users can access this endpoint.',
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
    description: 'List of warehouses retrieved successfully',
    type: PaginatedWarehousesEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedWarehousesResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(
      `Listing warehouses - page: ${pageNum}, limit: ${limitNum}`,
    );

    return this.warehousesService.findAll(pageNum, limitNum);
  }

  /**
   * Returns all unique cities from warehouses within the current tenant.
   * Static route - must be declared before dynamic :id route.
   *
   * @returns Array of unique city names, sorted alphabetically
   *
   * @example
   * GET /warehouses/cities
   * Response: ["Bogota", "Cali", "Medellin"]
   */
  @Get('cities')
  @ApiOperation({
    summary: 'Get unique warehouse cities',
    description:
      'Returns a list of unique cities from all warehouses in the current tenant. Useful for filtering and dropdowns.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of unique cities retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['Bogota', 'Cali', 'Medellin'],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getCities(): Promise<string[]> {
    this.logger.log('Getting unique warehouse cities');

    return this.warehousesService.getCities();
  }

  /**
   * Gets a warehouse by ID with stock summary.
   *
   * @param id - Warehouse ID
   * @returns Warehouse data with stock summary
   *
   * @example
   * GET /warehouses/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get warehouse by ID',
    description:
      'Returns a single warehouse with stock summary by its ID. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Warehouse ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Warehouse retrieved successfully',
    type: WarehouseWithStockSummaryEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(@Param('id') id: string): Promise<WarehouseWithStockSummary> {
    this.logger.log(`Getting warehouse: ${id}`);

    return this.warehousesService.findOne(id);
  }

  /**
   * Lists products and their quantities in a specific warehouse.
   *
   * @param id - Warehouse ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of products with quantities
   *
   * @example
   * GET /warehouses/:id/stock?page=1&limit=20
   */
  @Get(':id/stock')
  @ApiOperation({
    summary: 'Get warehouse stock',
    description:
      'Returns a paginated list of products and their quantities in a specific warehouse. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Warehouse ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
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
    description: 'Warehouse stock retrieved successfully',
    type: PaginatedWarehouseStockEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async getStock(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedWarehouseStockResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(
      `Getting stock for warehouse: ${id} - page: ${pageNum}, limit: ${limitNum}`,
    );

    return this.warehousesService.getStock(id, pageNum, limitNum);
  }

  /**
   * Creates a new warehouse in the tenant.
   * Only ADMIN users can create warehouses.
   * Respects tenant warehouse limits.
   *
   * @param dto - Warehouse creation data
   * @returns Created warehouse data
   *
   * @example
   * POST /warehouses
   * {
   *   "name": "Main Warehouse",
   *   "code": "WH-001",
   *   "address": "123 Industrial Ave",
   *   "isDefault": true
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new warehouse',
    description:
      'Creates a new warehouse in the current tenant. Only ADMIN users can create warehouses. Respects tenant warehouse limits based on subscription plan.',
  })
  @ApiResponse({
    status: 201,
    description: 'Warehouse created successfully',
    type: WarehouseEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions or warehouse limit reached',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Warehouse code already exists',
  })
  async create(@Body() dto: CreateWarehouseDto): Promise<WarehouseResponse> {
    this.logger.log(`Creating warehouse: ${dto.name}`);
    return this.warehousesService.create(dto);
  }

  /**
   * Updates a warehouse.
   * Only ADMIN and MANAGER users can update warehouses.
   *
   * @param id - Warehouse ID to update
   * @param dto - Update data
   * @returns Updated warehouse data
   *
   * @example
   * PATCH /warehouses/:id
   * {
   *   "name": "Updated Warehouse Name",
   *   "isDefault": true
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a warehouse',
    description:
      'Updates an existing warehouse. Only ADMIN and MANAGER users can update warehouses.',
  })
  @ApiParam({
    name: 'id',
    description: 'Warehouse ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Warehouse updated successfully',
    type: WarehouseEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Warehouse code already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponse> {
    this.logger.log(`Updating warehouse: ${id}`);
    return this.warehousesService.update(id, dto);
  }

  /**
   * Deletes a warehouse.
   * Only ADMIN users can delete warehouses.
   * Deletion fails if the warehouse has any stock.
   *
   * @param id - Warehouse ID to delete
   *
   * @example
   * DELETE /warehouses/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a warehouse',
    description:
      'Deletes a warehouse. Only ADMIN users can delete warehouses. Deletion fails if the warehouse has any stock.',
  })
  @ApiParam({
    name: 'id',
    description: 'Warehouse ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Warehouse deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Warehouse has stock' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting warehouse: ${id}`);
    return this.warehousesService.delete(id);
  }
}
