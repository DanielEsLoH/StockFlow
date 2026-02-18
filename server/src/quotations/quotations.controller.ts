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
import { QuotationsService } from './quotations.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  FilterQuotationsDto,
} from './dto';
import {
  QuotationEntity,
  PaginatedQuotationsEntity,
} from './entities/quotation.entity';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../auth/types';

/**
 * QuotationsController handles all quotation management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List quotations: All authenticated roles
 * - View quotation: All authenticated roles
 * - Get stats: All authenticated roles
 * - Create quotation: ADMIN, MANAGER, EMPLOYEE
 * - Update quotation: ADMIN, MANAGER
 * - Delete quotation: ADMIN only
 * - Send quotation: ADMIN, MANAGER
 * - Accept quotation: ADMIN, MANAGER
 * - Reject quotation: ADMIN, MANAGER
 * - Convert to invoice: ADMIN, MANAGER
 */
@ApiTags('quotations')
@ApiBearerAuth('JWT-auth')
@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  private readonly logger = new Logger(QuotationsController.name);

  constructor(private readonly quotationsService: QuotationsService) {}

  /**
   * Lists all quotations in the current tenant with filtering and pagination.
   *
   * @param query - Filter and pagination parameters
   * @returns Paginated list of quotations
   *
   * @example
   * GET /quotations?page=1&limit=20&status=SENT
   */
  @Get()
  @ApiOperation({
    summary: 'List all quotations',
    description:
      'Returns a paginated list of quotations with optional filters for status, customer, and date range. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of quotations retrieved successfully',
    type: PaginatedQuotationsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() query: FilterQuotationsDto,
  ): Promise<PaginatedQuotationsEntity> {
    this.logger.log(
      `Listing quotations - page: ${query.page ?? 1}, limit: ${query.limit ?? 10}`,
    );

    return this.quotationsService.findAll(query);
  }

  /**
   * Gets aggregated statistics for all quotations in the tenant.
   *
   * @returns Quotation statistics including totals and status breakdown
   *
   * @example
   * GET /quotations/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get quotation statistics',
    description:
      'Returns aggregated statistics for all quotations in the tenant including totals, conversion rates, and status breakdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Quotation statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats() {
    this.logger.log('Getting quotation statistics');

    return this.quotationsService.getStats();
  }

  /**
   * Gets a quotation by ID.
   * Includes all items, customer, and user relations.
   *
   * @param id - Quotation ID
   * @returns Quotation data with all relations
   *
   * @example
   * GET /quotations/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get quotation by ID',
    description:
      'Returns a single quotation with all its items, customer, and user relations. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quotation ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Quotation retrieved successfully',
    type: QuotationEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async findOne(@Param('id') id: string): Promise<QuotationEntity> {
    this.logger.log(`Getting quotation: ${id}`);

    return this.quotationsService.findOne(id);
  }

  /**
   * Creates a new quotation in the tenant.
   * ADMIN, MANAGER, and EMPLOYEE users can create quotations.
   * Generates quotation number automatically.
   *
   * @param dto - Quotation creation data
   * @param user - Current authenticated user
   * @returns Created quotation data
   *
   * @example
   * POST /quotations
   * {
   *   "customerId": "550e8400-e29b-41d4-a716-446655440000",
   *   "items": [
   *     {
   *       "productId": "550e8400-e29b-41d4-a716-446655440001",
   *       "quantity": 2,
   *       "unitPrice": 99.99,
   *       "taxRate": 19
   *     }
   *   ],
   *   "validUntil": "2024-12-31",
   *   "notes": "Valid for 30 days"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new quotation',
    description:
      'Creates a new quotation with items. Automatically generates quotation number. ADMIN, MANAGER, and EMPLOYEE users can create quotations.',
  })
  @ApiResponse({
    status: 201,
    description: 'Quotation created successfully',
    type: QuotationEntity,
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
  @ApiResponse({ status: 404, description: 'Customer or product not found' })
  async create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<QuotationEntity> {
    this.logger.log(`Creating quotation for user: ${user.userId}`);

    return this.quotationsService.create(dto, user.userId);
  }

  /**
   * Updates a quotation.
   * Only ADMIN and MANAGER users can update quotations.
   * Only DRAFT quotations can be updated.
   *
   * @param id - Quotation ID to update
   * @param dto - Update data
   * @returns Updated quotation data
   *
   * @example
   * PATCH /quotations/:id
   * {
   *   "notes": "Updated terms",
   *   "validUntil": "2025-01-31"
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a quotation',
    description:
      'Updates an existing quotation. Only DRAFT quotations can be updated. Only ADMIN and MANAGER users can update quotations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quotation ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Quotation updated successfully',
    type: QuotationEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or quotation is not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ): Promise<QuotationEntity> {
    this.logger.log(`Updating quotation: ${id}`);

    return this.quotationsService.update(id, dto);
  }

  /**
   * Deletes a quotation.
   * Only ADMIN users can delete quotations.
   *
   * @param id - Quotation ID to delete
   *
   * @example
   * DELETE /quotations/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a quotation',
    description:
      'Deletes a quotation. Only ADMIN users can delete quotations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quotation ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Quotation deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting quotation: ${id}`);

    return this.quotationsService.remove(id);
  }

  /**
   * Sends a quotation (changes status from DRAFT to SENT).
   * Only ADMIN and MANAGER users can send quotations.
   *
   * @param id - Quotation ID to send
   * @returns Updated quotation data
   *
   * @example
   * PATCH /quotations/:id/send
   */
  @Patch(':id/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Send a quotation',
    description:
      'Changes quotation status from DRAFT to SENT. Only DRAFT quotations can be sent. Only ADMIN and MANAGER users can send quotations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quotation ID to send',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Quotation sent successfully',
    type: QuotationEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Quotation is not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async send(@Param('id') id: string): Promise<QuotationEntity> {
    this.logger.log(`Sending quotation: ${id}`);

    return this.quotationsService.send(id);
  }

  /**
   * Accepts a quotation (changes status to ACCEPTED).
   * Only ADMIN and MANAGER users can accept quotations.
   *
   * @param id - Quotation ID to accept
   * @returns Updated quotation data
   *
   * @example
   * PATCH /quotations/:id/accept
   */
  @Patch(':id/accept')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Accept a quotation',
    description:
      'Changes quotation status to ACCEPTED. Only SENT quotations can be accepted. Only ADMIN and MANAGER users can accept quotations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quotation ID to accept',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Quotation accepted successfully',
    type: QuotationEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Quotation is not in a valid status for acceptance',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async accept(@Param('id') id: string): Promise<QuotationEntity> {
    this.logger.log(`Accepting quotation: ${id}`);

    return this.quotationsService.accept(id);
  }

  /**
   * Rejects a quotation (changes status to REJECTED).
   * Only ADMIN and MANAGER users can reject quotations.
   *
   * @param id - Quotation ID to reject
   * @returns Updated quotation data
   *
   * @example
   * PATCH /quotations/:id/reject
   */
  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Reject a quotation',
    description:
      'Changes quotation status to REJECTED. Only SENT quotations can be rejected. Only ADMIN and MANAGER users can reject quotations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quotation ID to reject',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Quotation rejected successfully',
    type: QuotationEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Quotation is not in a valid status for rejection',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async reject(@Param('id') id: string): Promise<QuotationEntity> {
    this.logger.log(`Rejecting quotation: ${id}`);

    return this.quotationsService.reject(id);
  }

  /**
   * Converts an accepted quotation into an invoice.
   * Creates a new invoice from the quotation data and links them.
   * Only ADMIN and MANAGER users can convert quotations.
   *
   * @param id - Quotation ID to convert
   * @param user - Current authenticated user
   * @returns Updated quotation with convertedToInvoiceId set
   *
   * @example
   * POST /quotations/:id/convert
   */
  @Post(':id/convert')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Convert quotation to invoice',
    description:
      'Converts an accepted quotation into an invoice. Creates a new invoice from the quotation data and links the quotation to the created invoice. Only ACCEPTED quotations can be converted. Only ADMIN and MANAGER users can convert quotations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Quotation ID to convert to invoice',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 201,
    description: 'Quotation converted to invoice successfully',
    type: QuotationEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Quotation is not in ACCEPTED status or has already been converted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Quotation not found' })
  async convert(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<QuotationEntity> {
    this.logger.log(`Converting quotation ${id} to invoice by user: ${user.userId}`);

    return this.quotationsService.convert(id, user.userId);
  }
}
