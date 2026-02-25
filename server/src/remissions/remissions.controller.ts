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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RemissionsService } from './remissions.service';
import type {
  RemissionResponse,
  PaginatedRemissionsResponse,
} from './remissions.service';
import {
  CreateRemissionDto,
  UpdateRemissionDto,
  FilterRemissionsDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles, CurrentUser } from '../common/decorators';
import type { RequestUser } from '../auth/types';

/**
 * RemissionsController handles all remission (guia de despacho) management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List remissions: All authenticated roles
 * - View remission: All authenticated roles
 * - Get stats: All authenticated roles
 * - Create remission: ADMIN, MANAGER, EMPLOYEE
 * - Create from invoice: ADMIN, MANAGER, EMPLOYEE
 * - Update remission: ADMIN, MANAGER
 * - Delete remission: ADMIN
 * - Dispatch remission: ADMIN, MANAGER
 * - Deliver remission: ADMIN, MANAGER
 * - Cancel remission: ADMIN
 */
@ApiTags('remissions')
@ApiBearerAuth('JWT-auth')
@Controller('remissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemissionsController {
  private readonly logger = new Logger(RemissionsController.name);

  constructor(private readonly remissionsService: RemissionsService) {}

  /**
   * Lists all remissions in the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of remissions
   *
   * @example
   * GET /remissions?page=1&limit=20&status=DRAFT
   */
  @Get()
  @ApiOperation({
    summary: 'List all remissions',
    description:
      'Returns a paginated list of remissions with optional filters for status, customer, warehouse, search, and date range. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of remissions retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() filters: FilterRemissionsDto,
  ): Promise<PaginatedRemissionsResponse> {
    this.logger.log(
      `Listing remissions - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.remissionsService.findAll(filters);
  }

  /**
   * Gets aggregated statistics for all remissions in the tenant.
   *
   * @returns Remission statistics including counts by status
   *
   * @example
   * GET /remissions/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get remission statistics',
    description:
      'Returns aggregated statistics for all remissions in the tenant including total count and status breakdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Remission statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats() {
    this.logger.log('Getting remission statistics');

    return this.remissionsService.getStats();
  }

  /**
   * Gets a remission by ID.
   * Includes all items, customer, user, warehouse, and invoice relations.
   *
   * @param id - Remission ID
   * @returns Remission data with all relations
   *
   * @example
   * GET /remissions/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get remission by ID',
    description:
      'Returns a single remission with all its items, customer, user, warehouse, and invoice relations. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Remission ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Remission retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Remission not found' })
  async findOne(@Param('id') id: string): Promise<RemissionResponse> {
    this.logger.log(`Getting remission: ${id}`);

    return this.remissionsService.findOne(id);
  }

  /**
   * Creates a new remission in the tenant.
   * ADMIN, MANAGER, and EMPLOYEE users can create remissions.
   * Generates remission number automatically (REM-00001).
   *
   * @param dto - Remission creation data
   * @param user - Current authenticated user
   * @returns Created remission data
   *
   * @example
   * POST /remissions
   * {
   *   "customerId": "cmkcykam80004reya0hsdx337",
   *   "deliveryAddress": "Calle 100 #15-20, Bogota",
   *   "items": [
   *     {
   *       "description": "Producto XYZ",
   *       "quantity": 10,
   *       "unit": "kg"
   *     }
   *   ]
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new remission',
    description:
      'Creates a new remission with items. Automatically generates remission number. ADMIN, MANAGER, and EMPLOYEE users can create remissions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Remission created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
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
    description: 'Customer, warehouse, invoice, or product not found',
  })
  async create(
    @Body() dto: CreateRemissionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<RemissionResponse> {
    this.logger.log(`Creating remission by user ${user.userId}`);

    return this.remissionsService.create(dto, user.userId);
  }

  /**
   * Creates a remission pre-filled from an existing invoice.
   * Copies customer, warehouse, and item details from the invoice.
   * ADMIN, MANAGER, and EMPLOYEE users can use this endpoint.
   *
   * @param invoiceId - Invoice ID to create remission from
   * @param user - Current authenticated user
   * @returns Created remission data
   *
   * @example
   * POST /remissions/from-invoice/:invoiceId
   */
  @Post('from-invoice/:invoiceId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create remission from invoice',
    description:
      'Creates a new remission pre-filled with items from an existing invoice. Copies customer, warehouse, and item details. ADMIN, MANAGER, and EMPLOYEE users can use this endpoint.',
  })
  @ApiParam({
    name: 'invoiceId',
    description: 'Invoice ID to create remission from (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 201,
    description: 'Remission created from invoice successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async createFromInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<RemissionResponse> {
    this.logger.log(
      `Creating remission from invoice ${invoiceId} by user ${user.userId}`,
    );

    return this.remissionsService.createFromInvoice(invoiceId, user.userId);
  }

  /**
   * Updates a remission.
   * Only DRAFT remissions can be updated.
   * ADMIN and MANAGER users can update remissions.
   *
   * @param id - Remission ID to update
   * @param dto - Update data
   * @returns Updated remission data
   *
   * @example
   * PATCH /remissions/:id
   * {
   *   "deliveryAddress": "Nueva direccion",
   *   "notes": "Notas actualizadas"
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a remission',
    description:
      'Updates an existing remission. Only DRAFT remissions can be updated. ADMIN and MANAGER users can update remissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Remission ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Remission updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or remission is not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Remission not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRemissionDto,
  ): Promise<RemissionResponse> {
    this.logger.log(`Updating remission: ${id}`);

    return this.remissionsService.update(id, dto);
  }

  /**
   * Deletes a remission.
   * Only ADMIN users can delete remissions.
   * Only DRAFT remissions can be deleted.
   *
   * @param id - Remission ID to delete
   *
   * @example
   * DELETE /remissions/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a remission',
    description:
      'Deletes a DRAFT remission. Only ADMIN users can delete remissions. Only DRAFT remissions can be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Remission ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Remission deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Remission is not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Remission not found' })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting remission: ${id}`);

    return this.remissionsService.remove(id);
  }

  /**
   * Dispatches a remission (changes status from DRAFT to DISPATCHED).
   * Sets deliveryDate to now if not already set.
   * ADMIN and MANAGER users can dispatch remissions.
   *
   * @param id - Remission ID to dispatch
   * @returns Updated remission data
   *
   * @example
   * PATCH /remissions/:id/dispatch
   */
  @Patch(':id/dispatch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Dispatch a remission',
    description:
      'Changes remission status from DRAFT to DISPATCHED. Sets delivery date if not already set. ADMIN and MANAGER users can dispatch remissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Remission ID to dispatch',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Remission dispatched successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Remission is not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Remission not found' })
  async dispatch(@Param('id') id: string): Promise<RemissionResponse> {
    this.logger.log(`Dispatching remission: ${id}`);

    return this.remissionsService.dispatch(id);
  }

  /**
   * Marks a remission as delivered (changes status from DISPATCHED to DELIVERED).
   * ADMIN and MANAGER users can deliver remissions.
   *
   * @param id - Remission ID to deliver
   * @returns Updated remission data
   *
   * @example
   * PATCH /remissions/:id/deliver
   */
  @Patch(':id/deliver')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Deliver a remission',
    description:
      'Changes remission status from DISPATCHED to DELIVERED. ADMIN and MANAGER users can deliver remissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Remission ID to deliver',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Remission delivered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Remission is not in DISPATCHED status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Remission not found' })
  async deliver(@Param('id') id: string): Promise<RemissionResponse> {
    this.logger.log(`Delivering remission: ${id}`);

    return this.remissionsService.deliver(id);
  }

  /**
   * Cancels a remission.
   * Can cancel from any status except DELIVERED.
   * Only ADMIN users can cancel remissions.
   *
   * @param id - Remission ID to cancel
   * @returns Updated remission data
   *
   * @example
   * PATCH /remissions/:id/cancel
   */
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel a remission',
    description:
      'Cancels a remission. Can cancel from any status except DELIVERED. Only ADMIN users can cancel remissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Remission ID to cancel',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Remission cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Remission is already delivered or cancelled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Remission not found' })
  async cancel(@Param('id') id: string): Promise<RemissionResponse> {
    this.logger.log(`Cancelling remission: ${id}`);

    return this.remissionsService.cancel(id);
  }
}
