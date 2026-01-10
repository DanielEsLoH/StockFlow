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
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoicesService: InvoicesService) {}

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
  async findAll(
    @Query() filters: FilterInvoicesDto,
  ): Promise<PaginatedInvoicesResponse> {
    this.logger.log(
      `Listing invoices - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.invoicesService.findAll(filters);
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
  async cancel(@Param('id') id: string): Promise<InvoiceResponse> {
    this.logger.log(`Cancelling invoice: ${id}`);

    return this.invoicesService.cancel(id);
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
