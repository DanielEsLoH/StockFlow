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
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import type {
  InvoiceResponse,
  PaginatedInvoicesResponse,
} from './invoices.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  FilterInvoicesDto,
  AddInvoiceItemDto,
  UpdateInvoiceItemDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles, CurrentUser } from '../common/decorators';
import type { RequestUser } from '../auth/types';
import { PaymentsService } from '../payments';
import type { PaymentResponse } from '../payments';
import {
  InvoiceEntity,
  PaginatedInvoicesEntity,
} from './entities/invoice.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { DianService } from '../dian';

/**
 * InvoicesController handles all invoice management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List invoices: All authenticated roles
 * - View invoice: All authenticated roles
 * - Create invoice: ADMIN, MANAGER
 * - Update invoice: ADMIN, MANAGER
 * - Delete invoice: ADMIN only
 * - Send invoice: ADMIN, MANAGER
 * - Cancel invoice: ADMIN only
 */
@ApiTags('invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
    private readonly dianService: DianService,
  ) {}

  /**
   * Lists all invoices in the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of invoices
   *
   * @example
   * GET /invoices?page=1&limit=20&status=SENT&paymentStatus=UNPAID
   */
  @Get()
  @ApiOperation({
    summary: 'List all invoices',
    description:
      'Returns a paginated list of invoices with optional filters for status, payment status, customer, and date range. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices retrieved successfully',
    type: PaginatedInvoicesEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() filters: FilterInvoicesDto,
  ): Promise<PaginatedInvoicesResponse> {
    this.logger.log(
      `Listing invoices - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.invoicesService.findAll(filters);
  }

  /**
   * Gets aggregated statistics for all invoices in the tenant.
   *
   * @returns Invoice statistics
   *
   * @example
   * GET /invoices/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get invoice statistics',
    description:
      'Returns aggregated statistics for all invoices in the tenant including totals, pending amounts, and status breakdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats() {
    this.logger.log('Getting invoice statistics');
    return this.invoicesService.getStats();
  }

  /**
   * Gets an invoice by ID.
   * Includes all items, customer, and user relations.
   *
   * @param id - Invoice ID
   * @returns Invoice data with all relations
   *
   * @example
   * GET /invoices/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get invoice by ID',
    description:
      'Returns a single invoice with all its items, customer, and user relations. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id') id: string): Promise<InvoiceResponse> {
    this.logger.log(`Getting invoice: ${id}`);

    return this.invoicesService.findOne(id);
  }

  /**
   * Creates a new invoice in the tenant.
   * Only ADMIN and MANAGER users can create invoices.
   * Generates invoice number, reduces stock, and creates stock movements.
   * Respects tenant monthly invoice limits.
   *
   * @param dto - Invoice creation data
   * @param user - Current authenticated user
   * @returns Created invoice data
   *
   * @example
   * POST /invoices
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
   *   "dueDate": "2024-12-31",
   *   "notes": "Payment due within 30 days"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new invoice',
    description:
      'Creates a new invoice with items. Automatically generates invoice number, reduces stock, and creates stock movements. Respects tenant monthly invoice limits based on subscription plan. Only ADMIN and MANAGER users can create invoices.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or insufficient stock',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions or monthly invoice limit reached',
  })
  @ApiResponse({ status: 404, description: 'Customer or product not found' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: RequestUser,
  ): Promise<InvoiceResponse> {
    this.logger.log(`Creating invoice by user ${user.userId}`);

    return this.invoicesService.create(dto, user.userId);
  }

  /**
   * Updates an invoice.
   * Only ADMIN and MANAGER users can update invoices.
   * Only DRAFT invoices can be updated.
   * Only notes and dueDate can be modified.
   *
   * @param id - Invoice ID to update
   * @param dto - Update data
   * @returns Updated invoice data
   *
   * @example
   * PATCH /invoices/:id
   * {
   *   "notes": "Updated notes",
   *   "dueDate": "2024-12-31"
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update an invoice',
    description:
      'Updates an existing invoice. Only DRAFT invoices can be updated. Only notes and dueDate can be modified. Only ADMIN and MANAGER users can update invoices.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or invoice is not in DRAFT status',
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
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponse> {
    this.logger.log(`Updating invoice: ${id}`);

    return this.invoicesService.update(id, dto);
  }

  /**
   * Deletes an invoice.
   * Only ADMIN users can delete invoices.
   * Only DRAFT invoices can be deleted.
   * Stock is restored when deleting.
   *
   * @param id - Invoice ID to delete
   *
   * @example
   * DELETE /invoices/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an invoice',
    description:
      'Deletes a DRAFT invoice and restores stock. Only ADMIN users can delete invoices. Only DRAFT invoices can be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Invoice deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invoice is not in DRAFT status',
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
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting invoice: ${id}`);

    return this.invoicesService.delete(id);
  }

  /**
   * Sends an invoice (changes status from DRAFT to SENT).
   * Only ADMIN and MANAGER users can send invoices.
   * Only DRAFT invoices can be sent.
   *
   * @param id - Invoice ID to send
   * @returns Updated invoice data
   *
   * @example
   * PATCH /invoices/:id/send
   */
  @Patch(':id/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Send an invoice',
    description:
      'Changes invoice status from DRAFT to SENT. Only DRAFT invoices can be sent. Only ADMIN and MANAGER users can send invoices.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to send',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice sent successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invoice is not in DRAFT status',
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
  async send(@Param('id') id: string): Promise<InvoiceResponse> {
    this.logger.log(`Sending invoice: ${id}`);

    return this.invoicesService.send(id);
  }

  /**
   * Cancels an invoice.
   * Only ADMIN users can cancel invoices.
   * Restores stock and creates return stock movements.
   * Cannot cancel already cancelled or void invoices.
   *
   * @param id - Invoice ID to cancel
   * @returns Updated invoice data
   *
   * @example
   * PATCH /invoices/:id/cancel
   */
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel an invoice',
    description:
      'Cancels an invoice, restores stock, and creates return stock movements. Cannot cancel already cancelled or void invoices. Only ADMIN users can cancel invoices.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to cancel',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice cancelled successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invoice is already cancelled or void',
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
  async cancel(@Param('id') id: string): Promise<InvoiceResponse> {
    this.logger.log(`Cancelling invoice: ${id}`);

    return this.invoicesService.cancel(id);
  }

  /**
   * Sends an invoice to DIAN for electronic invoicing.
   * Only ADMIN and MANAGER users can send invoices to DIAN.
   * Requires tenant DIAN configuration to be set up.
   *
   * @param id - Invoice ID to send to DIAN
   * @returns DIAN processing result with CUFE and status
   *
   * @example
   * POST /invoices/:id/send-to-dian
   */
  @Post(':id/send-to-dian')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Send invoice to DIAN',
    description:
      'Processes an invoice for DIAN electronic invoicing. Generates XML, signs it, and sends to DIAN. Only ADMIN and MANAGER users can send invoices to DIAN.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to send to DIAN',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice sent to DIAN successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - DIAN configuration missing or invoice not eligible',
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
  async sendToDian(@Param('id') id: string) {
    this.logger.log(`Sending invoice ${id} to DIAN`);

    return this.dianService.processInvoice(id);
  }

  // ============================================================================
  // INVOICE PAYMENTS ENDPOINT
  // ============================================================================

  /**
   * Gets all payments for a specific invoice.
   * Accessible by all authenticated users.
   *
   * @param id - Invoice ID to get payments for
   * @returns Array of payments for the invoice
   *
   * @example
   * GET /invoices/:id/payments
   */
  @Get(':id/payments')
  @ApiOperation({
    summary: 'Get invoice payments',
    description:
      'Returns all payments for a specific invoice. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to get payments for',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    type: [PaymentEntity],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getPayments(@Param('id') id: string): Promise<PaymentResponse[]> {
    this.logger.log(`Getting payments for invoice: ${id}`);

    return this.paymentsService.findByInvoice(id);
  }

  // ============================================================================
  // INVOICE ITEMS ENDPOINTS
  // ============================================================================

  /**
   * Adds a new item to a DRAFT invoice.
   * Only ADMIN and MANAGER users can add items.
   * Validates product exists and has sufficient stock.
   * Decrements product stock and creates stock movement.
   * Recalculates invoice totals.
   *
   * @param id - Invoice ID to add item to
   * @param dto - Item data (productId, quantity, unitPrice, taxRate, discount)
   * @param user - Current authenticated user
   * @returns Updated invoice data with all items
   *
   * @example
   * POST /invoices/:id/items
   * {
   *   "productId": "550e8400-e29b-41d4-a716-446655440001",
   *   "quantity": 3,
   *   "unitPrice": 49.99,
   *   "taxRate": 19,
   *   "discount": 0
   * }
   */
  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add item to invoice',
    description:
      'Adds a new item to a DRAFT invoice. Validates product exists and has sufficient stock. Decrements product stock and creates stock movement. Recalculates invoice totals. Only ADMIN and MANAGER users can add items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to add item to',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiBody({ type: AddInvoiceItemDto })
  @ApiResponse({
    status: 201,
    description: 'Item added successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data, invoice not in DRAFT status, or insufficient stock',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Invoice or product not found' })
  async addItem(
    @Param('id') id: string,
    @Body() dto: AddInvoiceItemDto,
    @CurrentUser() user: RequestUser,
  ): Promise<InvoiceResponse> {
    this.logger.log(`Adding item to invoice ${id} by user ${user.userId}`);

    return this.invoicesService.addItem(id, dto, user.userId);
  }

  /**
   * Updates an existing item on a DRAFT invoice.
   * Only ADMIN and MANAGER users can update items.
   * Adjusts product stock based on quantity difference.
   * Creates stock movement for the adjustment.
   * Recalculates invoice totals.
   *
   * @param id - Invoice ID containing the item
   * @param itemId - Item ID to update
   * @param dto - Update data (quantity, unitPrice, taxRate, discount)
   * @param user - Current authenticated user
   * @returns Updated invoice data with all items
   *
   * @example
   * PATCH /invoices/:id/items/:itemId
   * {
   *   "quantity": 5,
   *   "unitPrice": 44.99
   * }
   */
  @Patch(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update invoice item',
    description:
      'Updates an existing item on a DRAFT invoice. Adjusts product stock based on quantity difference. Creates stock movement for the adjustment. Recalculates invoice totals. Only ADMIN and MANAGER users can update items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID containing the item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Item ID to update',
    example: 'cmkcykam80005reya0hsdx338',
  })
  @ApiBody({ type: UpdateInvoiceItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data, invoice not in DRAFT status, or insufficient stock',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Invoice or item not found' })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInvoiceItemDto,
    @CurrentUser() user: RequestUser,
  ): Promise<InvoiceResponse> {
    this.logger.log(
      `Updating item ${itemId} on invoice ${id} by user ${user.userId}`,
    );

    return this.invoicesService.updateItem(id, itemId, dto, user.userId);
  }

  /**
   * Deletes an item from a DRAFT invoice.
   * Only ADMIN and MANAGER users can delete items.
   * Restores product stock and creates stock movement.
   * Recalculates invoice totals.
   *
   * @param id - Invoice ID containing the item
   * @param itemId - Item ID to delete
   * @param user - Current authenticated user
   * @returns Updated invoice data with remaining items
   *
   * @example
   * DELETE /invoices/:id/items/:itemId
   */
  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Delete invoice item',
    description:
      'Deletes an item from a DRAFT invoice. Restores product stock and creates stock movement. Recalculates invoice totals. Only ADMIN and MANAGER users can delete items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID containing the item',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Item ID to delete',
    example: 'cmkcykam80005reya0hsdx338',
  })
  @ApiResponse({
    status: 200,
    description: 'Item deleted successfully',
    type: InvoiceEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invoice not in DRAFT status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Invoice or item not found' })
  async deleteItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<InvoiceResponse> {
    this.logger.log(
      `Deleting item ${itemId} from invoice ${id} by user ${user.userId}`,
    );

    return this.invoicesService.deleteItem(id, itemId, user.userId);
  }
}
