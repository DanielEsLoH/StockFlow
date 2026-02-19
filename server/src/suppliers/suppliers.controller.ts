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
import { CustomerStatus } from '@prisma/client';
import { SuppliersService } from './suppliers.service';
import type {
  SupplierResponse,
  PaginatedSuppliersResponse,
  SupplierStatsResponse,
} from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

/**
 * SuppliersController handles all supplier management endpoints.
 *
 * All endpoints require JWT authentication.
 * Permission-based access is enforced per endpoint:
 * - List/view/search/stats: SUPPLIERS_VIEW
 * - Create: SUPPLIERS_CREATE
 * - Update: SUPPLIERS_EDIT
 * - Delete: SUPPLIERS_DELETE
 */
@ApiTags('suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  private readonly logger = new Logger(SuppliersController.name);

  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Lists all suppliers in the current tenant with pagination, search, and status filter.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @param search - Optional search query
   * @param status - Optional status filter
   * @returns Paginated list of suppliers
   *
   * @example
   * GET /suppliers?page=1&limit=20&search=abc&status=ACTIVE
   */
  @Get()
  @RequirePermissions(Permission.SUPPLIERS_VIEW)
  @ApiOperation({
    summary: 'List all suppliers',
    description:
      'Returns a paginated list of all suppliers in the current tenant. Supports search by name/document and status filtering.',
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
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search query (searches name and document number)',
    example: 'Distribuidora',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CustomerStatus,
    description: 'Filter by status (ACTIVE or INACTIVE)',
    example: 'ACTIVE',
  })
  @ApiResponse({
    status: 200,
    description: 'List of suppliers retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: CustomerStatus,
  ): Promise<PaginatedSuppliersResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );
    const searchQuery = search?.trim() || undefined;

    this.logger.log(
      `Listing suppliers - page: ${pageNum}, limit: ${limitNum}, search: "${searchQuery ?? ''}", status: ${status ?? 'all'}`,
    );

    return this.suppliersService.findAll(pageNum, limitNum, searchQuery, status);
  }

  /**
   * Gets supplier statistics for the current tenant.
   *
   * @returns Total, active, and inactive supplier counts
   *
   * @example
   * GET /suppliers/stats
   */
  @Get('stats')
  @RequirePermissions(Permission.SUPPLIERS_VIEW)
  @ApiOperation({
    summary: 'Get supplier statistics',
    description:
      'Returns total, active, and inactive supplier counts for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getStats(): Promise<SupplierStatsResponse> {
    this.logger.log('Getting supplier stats');
    return this.suppliersService.getStats();
  }

  /**
   * Searches suppliers by name or document number for autocomplete.
   *
   * @param q - Search query string
   * @returns List of matching suppliers (max 10)
   *
   * @example
   * GET /suppliers/search?q=abc
   */
  @Get('search')
  @RequirePermissions(Permission.SUPPLIERS_VIEW)
  @ApiOperation({
    summary: 'Search suppliers',
    description:
      'Searches active suppliers by name or document number for autocomplete. Returns max 10 results.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query (searches name and document number)',
    example: 'Distribuidora',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async search(@Query('q') q?: string): Promise<SupplierResponse[]> {
    const query = q?.trim() ?? '';

    this.logger.log(`Searching suppliers - query: "${query}"`);

    return this.suppliersService.search(query);
  }

  /**
   * Gets a supplier by ID.
   *
   * @param id - Supplier ID
   * @returns Supplier data with purchase orders summary
   *
   * @example
   * GET /suppliers/:id
   */
  @Get(':id')
  @RequirePermissions(Permission.SUPPLIERS_VIEW)
  @ApiOperation({
    summary: 'Get supplier by ID',
    description:
      'Returns a single supplier by its ID, including purchase orders summary.',
  })
  @ApiParam({
    name: 'id',
    description: 'Supplier ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(@Param('id') id: string): Promise<SupplierResponse> {
    this.logger.log(`Getting supplier: ${id}`);

    return this.suppliersService.findOne(id);
  }

  /**
   * Creates a new supplier in the tenant.
   *
   * @param dto - Supplier creation data
   * @returns Created supplier data
   *
   * @example
   * POST /suppliers
   * {
   *   "name": "Distribuidora ABC S.A.S.",
   *   "documentType": "NIT",
   *   "documentNumber": "900123456-7",
   *   "paymentTerms": "NET_30"
   * }
   */
  @Post()
  @RequirePermissions(Permission.SUPPLIERS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new supplier',
    description:
      'Creates a new supplier in the current tenant. Requires SUPPLIERS_CREATE permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Supplier created successfully',
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
  @ApiResponse({
    status: 409,
    description: 'Conflict - Supplier with same document already exists',
  })
  async create(@Body() dto: CreateSupplierDto): Promise<SupplierResponse> {
    this.logger.log(
      `Creating supplier: ${dto.name} (Document: ${dto.documentNumber})`,
    );
    return this.suppliersService.create(dto);
  }

  /**
   * Updates a supplier.
   *
   * @param id - Supplier ID to update
   * @param dto - Update data
   * @returns Updated supplier data
   *
   * @example
   * PATCH /suppliers/:id
   * {
   *   "paymentTerms": "NET_60",
   *   "contactName": "Carlos Rodriguez"
   * }
   */
  @Patch(':id')
  @RequirePermissions(Permission.SUPPLIERS_EDIT)
  @ApiOperation({
    summary: 'Update a supplier',
    description:
      'Updates an existing supplier. Requires SUPPLIERS_EDIT permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Supplier ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier updated successfully',
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
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Document number already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierResponse> {
    this.logger.log(`Updating supplier: ${id}`);
    return this.suppliersService.update(id, dto);
  }

  /**
   * Deletes a supplier.
   * Deletion fails if the supplier has associated purchase orders.
   *
   * @param id - Supplier ID to delete
   *
   * @example
   * DELETE /suppliers/:id
   */
  @Delete(':id')
  @RequirePermissions(Permission.SUPPLIERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a supplier',
    description:
      'Deletes a supplier. Requires SUPPLIERS_DELETE permission. Deletion fails if the supplier has associated purchase orders.',
  })
  @ApiParam({
    name: 'id',
    description: 'Supplier ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Supplier deleted successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Supplier has associated purchase orders',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting supplier: ${id}`);
    return this.suppliersService.delete(id);
  }
}
