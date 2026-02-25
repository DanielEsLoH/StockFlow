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
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  PurchasePaymentsService,
  type PurchasePaymentResponse,
} from './purchase-payments.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  FilterPurchaseOrdersDto,
  CreatePurchasePaymentDto,
} from './dto';
import {
  PurchaseOrderEntity,
  PaginatedPurchaseOrdersEntity,
} from './entities/purchase-order.entity';
import { JwtAuthGuard } from '../auth';
import { CurrentUser } from '../common/decorators';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions/permission.enum';
import type { RequestUser } from '../auth/types';

/**
 * PurchaseOrdersController handles all purchase order management endpoints.
 *
 * All endpoints require JWT authentication and permission-based access control.
 * Permission-based access is enforced per endpoint:
 * - List purchase orders: PURCHASE_ORDERS_VIEW
 * - View purchase order: PURCHASE_ORDERS_VIEW
 * - Get stats: PURCHASE_ORDERS_VIEW
 * - Create purchase order: PURCHASE_ORDERS_CREATE
 * - Update purchase order: PURCHASE_ORDERS_EDIT
 * - Delete purchase order: PURCHASE_ORDERS_DELETE
 * - Send purchase order: PURCHASE_ORDERS_SEND
 * - Confirm purchase order: PURCHASE_ORDERS_CONFIRM
 * - Receive purchase order: PURCHASE_ORDERS_RECEIVE
 * - Cancel purchase order: PURCHASE_ORDERS_CANCEL
 */
@ApiTags('purchase-orders')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  private readonly logger = new Logger(PurchaseOrdersController.name);

  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly purchasePaymentsService: PurchasePaymentsService,
  ) {}

  /**
   * Lists all purchase orders in the current tenant with filtering and pagination.
   *
   * @param query - Filter and pagination parameters
   * @returns Paginated list of purchase orders
   *
   * @example
   * GET /purchase-orders?page=1&limit=20&status=DRAFT
   */
  @Get()
  @RequirePermissions(Permission.PURCHASE_ORDERS_VIEW)
  @ApiOperation({
    summary: 'List all purchase orders',
    description:
      'Returns a paginated list of purchase orders with optional filters for status, supplier, warehouse, and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of purchase orders retrieved successfully',
    type: PaginatedPurchaseOrdersEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() query: FilterPurchaseOrdersDto,
  ): Promise<PaginatedPurchaseOrdersEntity> {
    this.logger.log(
      `Listing purchase orders - page: ${query.page ?? 1}, limit: ${query.limit ?? 10}`,
    );

    return this.purchaseOrdersService.findAll(query);
  }

  /**
   * Gets aggregated statistics for all purchase orders in the tenant.
   *
   * @returns Purchase order statistics including totals and status breakdown
   *
   * @example
   * GET /purchase-orders/stats
   */
  @Get('stats')
  @RequirePermissions(Permission.PURCHASE_ORDERS_VIEW)
  @ApiOperation({
    summary: 'Get purchase order statistics',
    description:
      'Returns aggregated statistics for all purchase orders in the tenant including totals, received value, and status breakdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats() {
    this.logger.log('Getting purchase order statistics');

    return this.purchaseOrdersService.getStats();
  }

  /**
   * Gets a purchase order by ID.
   * Includes all items, supplier, user, warehouse, and stock movements.
   *
   * @param id - Purchase order ID
   * @returns Purchase order data with all relations
   *
   * @example
   * GET /purchase-orders/:id
   */
  @Get(':id')
  @RequirePermissions(Permission.PURCHASE_ORDERS_VIEW)
  @ApiOperation({
    summary: 'Get purchase order by ID',
    description:
      'Returns a single purchase order with all its items, supplier, user, warehouse, and stock movements.',
  })
  @ApiParam({
    name: 'id',
    description: 'Purchase order ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order retrieved successfully',
    type: PurchaseOrderEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<PurchaseOrderEntity> {
    this.logger.log(`Getting purchase order: ${id}`);

    return this.purchaseOrdersService.findOne(id);
  }

  /**
   * Creates a new purchase order in the tenant.
   * Requires PURCHASE_ORDERS_CREATE permission.
   * Generates purchase order number automatically.
   *
   * @param dto - Purchase order creation data
   * @param user - Current authenticated user
   * @returns Created purchase order data
   *
   * @example
   * POST /purchase-orders
   * {
   *   "supplierId": "cmkcykam80004reya0hsdx337",
   *   "warehouseId": "cmkcykam80004reya0hsdx338",
   *   "items": [
   *     {
   *       "productId": "cmkcykam80004reya0hsdx339",
   *       "quantity": 10,
   *       "unitPrice": 50.00,
   *       "taxRate": 19
   *     }
   *   ],
   *   "expectedDeliveryDate": "2024-12-31",
   *   "notes": "Entrega en horario de oficina"
   * }
   */
  @Post()
  @RequirePermissions(Permission.PURCHASE_ORDERS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new purchase order',
    description:
      'Creates a new purchase order with items. Automatically generates purchase order number. Requires PURCHASE_ORDERS_CREATE permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Purchase order created successfully',
    type: PurchaseOrderEntity,
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
    description: 'Supplier, warehouse, or product not found',
  })
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PurchaseOrderEntity> {
    this.logger.log(`Creating purchase order for user: ${user.userId}`);

    return this.purchaseOrdersService.create(dto, user.userId);
  }

  /**
   * Updates a purchase order.
   * Only DRAFT purchase orders can be updated.
   * Requires PURCHASE_ORDERS_EDIT permission.
   *
   * @param id - Purchase order ID to update
   * @param dto - Update data
   * @returns Updated purchase order data
   *
   * @example
   * PATCH /purchase-orders/:id
   * {
   *   "notes": "Updated delivery instructions",
   *   "expectedDeliveryDate": "2025-01-15"
   * }
   */
  @Patch(':id')
  @RequirePermissions(Permission.PURCHASE_ORDERS_EDIT)
  @ApiOperation({
    summary: 'Update a purchase order',
    description:
      'Updates an existing purchase order. Only DRAFT purchase orders can be updated. Requires PURCHASE_ORDERS_EDIT permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Purchase order ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order updated successfully',
    type: PurchaseOrderEntity,
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
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Purchase order is not in DRAFT status',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderEntity> {
    this.logger.log(`Updating purchase order: ${id}`);

    return this.purchaseOrdersService.update(id, dto);
  }

  /**
   * Deletes a purchase order.
   * Only DRAFT purchase orders can be deleted.
   * Requires PURCHASE_ORDERS_DELETE permission.
   *
   * @param id - Purchase order ID to delete
   *
   * @example
   * DELETE /purchase-orders/:id
   */
  @Delete(':id')
  @RequirePermissions(Permission.PURCHASE_ORDERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a purchase order',
    description:
      'Deletes a purchase order. Only DRAFT purchase orders can be deleted. Requires PURCHASE_ORDERS_DELETE permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Purchase order ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 204,
    description: 'Purchase order deleted successfully',
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
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Purchase order is not in DRAFT status',
  })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting purchase order: ${id}`);

    return this.purchaseOrdersService.remove(id);
  }

  /**
   * Sends a purchase order (changes status from DRAFT to SENT).
   * Requires PURCHASE_ORDERS_SEND permission.
   *
   * @param id - Purchase order ID to send
   * @returns Updated purchase order data
   *
   * @example
   * PATCH /purchase-orders/:id/send
   */
  @Patch(':id/send')
  @RequirePermissions(Permission.PURCHASE_ORDERS_SEND)
  @ApiOperation({
    summary: 'Send a purchase order',
    description:
      'Changes purchase order status from DRAFT to SENT. Only DRAFT purchase orders can be sent. Requires PURCHASE_ORDERS_SEND permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Purchase order ID to send',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order sent successfully',
    type: PurchaseOrderEntity,
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
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Purchase order is not in DRAFT status',
  })
  async send(
    @Param('id') id: string,
  ): Promise<PurchaseOrderEntity> {
    this.logger.log(`Sending purchase order: ${id}`);

    return this.purchaseOrdersService.send(id);
  }

  /**
   * Confirms a purchase order (changes status from SENT to CONFIRMED).
   * Requires PURCHASE_ORDERS_CONFIRM permission.
   *
   * @param id - Purchase order ID to confirm
   * @returns Updated purchase order data
   *
   * @example
   * PATCH /purchase-orders/:id/confirm
   */
  @Patch(':id/confirm')
  @RequirePermissions(Permission.PURCHASE_ORDERS_CONFIRM)
  @ApiOperation({
    summary: 'Confirm a purchase order',
    description:
      'Changes purchase order status from SENT to CONFIRMED. Only SENT purchase orders can be confirmed. Requires PURCHASE_ORDERS_CONFIRM permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Purchase order ID to confirm',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order confirmed successfully',
    type: PurchaseOrderEntity,
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
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Purchase order is not in SENT status',
  })
  async confirm(
    @Param('id') id: string,
  ): Promise<PurchaseOrderEntity> {
    this.logger.log(`Confirming purchase order: ${id}`);

    return this.purchaseOrdersService.confirm(id);
  }

  /**
   * Receives a purchase order (changes status from CONFIRMED to RECEIVED).
   * This is the critical operation that creates stock movements, updates
   * product costs, and increments warehouse and global stock.
   * Uses POST because it causes significant side effects.
   * Requires PURCHASE_ORDERS_RECEIVE permission.
   *
   * @param id - Purchase order ID to receive
   * @param user - Current authenticated user
   * @returns Updated purchase order data with stock movements
   *
   * @example
   * POST /purchase-orders/:id/receive
   */
  @Post(':id/receive')
  @RequirePermissions(Permission.PURCHASE_ORDERS_RECEIVE)
  @ApiOperation({
    summary: 'Receive a purchase order',
    description:
      'Receives goods for a confirmed purchase order. Creates stock movements for each item, updates product cost prices, and increments warehouse and global stock levels. Only CONFIRMED purchase orders can be received. Requires PURCHASE_ORDERS_RECEIVE permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Purchase order ID to receive',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order received successfully',
    type: PurchaseOrderEntity,
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
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Purchase order is not in CONFIRMED status',
  })
  async receive(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PurchaseOrderEntity> {
    this.logger.log(
      `Receiving purchase order ${id} by user: ${user.userId}`,
    );

    return this.purchaseOrdersService.receive(id, user.userId);
  }

  /**
   * Cancels a purchase order.
   * Can cancel from DRAFT, SENT, or CONFIRMED status.
   * Cannot cancel a RECEIVED purchase order.
   * Requires PURCHASE_ORDERS_CANCEL permission.
   *
   * @param id - Purchase order ID to cancel
   * @returns Updated purchase order data
   *
   * @example
   * PATCH /purchase-orders/:id/cancel
   */
  @Patch(':id/cancel')
  @RequirePermissions(Permission.PURCHASE_ORDERS_CANCEL)
  @ApiOperation({
    summary: 'Cancel a purchase order',
    description:
      'Cancels a purchase order. Can cancel from DRAFT, SENT, or CONFIRMED status. Cannot cancel a RECEIVED purchase order. Requires PURCHASE_ORDERS_CANCEL permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Purchase order ID to cancel',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order cancelled successfully',
    type: PurchaseOrderEntity,
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
    description: 'Purchase order not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - Purchase order is already received or cancelled',
  })
  async cancel(
    @Param('id') id: string,
  ): Promise<PurchaseOrderEntity> {
    this.logger.log(`Cancelling purchase order: ${id}`);

    return this.purchaseOrdersService.cancel(id);
  }

  // ============================
  // PURCHASE PAYMENTS
  // ============================

  @Get(':id/payments')
  @RequirePermissions(Permission.PURCHASE_ORDERS_VIEW)
  @ApiOperation({ summary: 'List payments for a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  async getPayments(
    @Param('id') id: string,
  ): Promise<PurchasePaymentResponse[]> {
    return this.purchasePaymentsService.findByPurchaseOrder(id);
  }

  @Post(':id/payments')
  @RequirePermissions(Permission.PURCHASE_ORDERS_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a payment for a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  async createPayment(
    @Param('id') id: string,
    @Body() dto: CreatePurchasePaymentDto,
  ): Promise<PurchasePaymentResponse> {
    return this.purchasePaymentsService.create(id, dto);
  }

  @Delete(':id/payments/:paymentId')
  @RequirePermissions(Permission.PURCHASE_ORDERS_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a purchase payment' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  async deletePayment(
    @Param('paymentId') paymentId: string,
  ): Promise<void> {
    return this.purchasePaymentsService.delete(paymentId);
  }
}
