import {
  Controller,
  Get,
  Post,
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
import { PaymentsService } from './payments.service';
import type {
  PaymentResponse,
  PaginatedPaymentsResponse,
} from './payments.service';
import { CreatePaymentDto, FilterPaymentsDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';
import {
  PaymentEntity,
  PaginatedPaymentsEntity,
} from './entities/payment.entity';

/**
 * PaymentsController handles all payment management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List payments: All authenticated roles
 * - View payment: All authenticated roles
 * - Record payment: ADMIN, MANAGER
 * - Delete payment: ADMIN only
 */
@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Lists all payments in the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination parameters
   * @returns Paginated list of payments
   *
   * @example
   * GET /payments?page=1&limit=20&method=CASH&invoiceId=uuid
   */
  @Get()
  @ApiOperation({
    summary: 'List all payments',
    description:
      'Returns a paginated list of payments with optional filters for method, invoice, and date range. All authenticated users can access this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payments retrieved successfully',
    type: PaginatedPaymentsEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() filters: FilterPaymentsDto,
  ): Promise<PaginatedPaymentsResponse> {
    this.logger.log(
      `Listing payments - page: ${filters.page ?? 1}, limit: ${filters.limit ?? 10}`,
    );

    return this.paymentsService.findAll(filters);
  }

  /**
   * Gets aggregated statistics for all payments in the tenant.
   *
   * @returns Payment statistics
   *
   * @example
   * GET /payments/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get payment statistics',
    description:
      'Returns aggregated statistics for all payments in the tenant including totals, method breakdown, and period summaries.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats() {
    this.logger.log('Getting payment statistics');
    return this.paymentsService.getStats();
  }

  /**
   * Gets a payment by ID.
   * Includes invoice and customer relations.
   *
   * @param id - Payment ID
   * @returns Payment data with all relations
   *
   * @example
   * GET /payments/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get payment by ID',
    description:
      'Returns a single payment with invoice and customer relations. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string): Promise<PaymentResponse> {
    this.logger.log(`Getting payment: ${id}`);

    return this.paymentsService.findOne(id);
  }

  /**
   * Records a new payment against an invoice.
   * Only ADMIN and MANAGER users can record payments.
   *
   * Business logic:
   * - Validates invoice exists and belongs to tenant
   * - Verifies payment doesn't exceed remaining balance
   * - Creates payment record
   * - Updates invoice paymentStatus automatically
   *
   * @param dto - Payment creation data
   * @returns Created payment data
   *
   * @example
   * POST /payments
   * {
   *   "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
   *   "amount": 150.50,
   *   "method": "CASH",
   *   "reference": "REC-001",
   *   "notes": "Partial payment"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a payment',
    description:
      'Records a new payment against an invoice. Validates invoice exists, verifies payment does not exceed remaining balance, and automatically updates invoice payment status. Only ADMIN and MANAGER users can record payments.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment recorded successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or payment exceeds remaining balance',
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
  async create(@Body() dto: CreatePaymentDto): Promise<PaymentResponse> {
    this.logger.log(
      `Recording payment for invoice ${dto.invoiceId}, amount: ${dto.amount}`,
    );

    return this.paymentsService.create(dto);
  }

  /**
   * Deletes a payment.
   * Only ADMIN users can delete payments.
   * Recalculates and updates invoice payment status after deletion.
   *
   * @param id - Payment ID to delete
   *
   * @example
   * DELETE /payments/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a payment',
    description:
      'Deletes a payment and recalculates invoice payment status. Only ADMIN users can delete payments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Payment deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting payment: ${id}`);

    return this.paymentsService.delete(id);
  }
}
