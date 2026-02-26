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
import {
  ExpensesService,
  type ExpenseResponse,
  type PaginatedExpensesResponse,
  type ExpenseStatsResponse,
} from './expenses.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  FilterExpensesDto,
  PayExpenseDto,
} from './dto';
import { JwtAuthGuard } from '../auth';
import { CurrentUser } from '../common/decorators';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions/permission.enum';
import type { RequestUser } from '../auth/types';

/**
 * ExpensesController handles all expense management endpoints.
 *
 * All endpoints require JWT authentication and permission-based access control.
 * Permission-based access is enforced per endpoint:
 * - List expenses: EXPENSES_VIEW
 * - View expense: EXPENSES_VIEW
 * - Get stats: EXPENSES_VIEW
 * - Create expense: EXPENSES_CREATE
 * - Update expense: EXPENSES_EDIT
 * - Approve expense: EXPENSES_APPROVE
 * - Pay expense: EXPENSES_EDIT
 * - Cancel expense: EXPENSES_EDIT
 * - Delete expense: EXPENSES_DELETE
 */
@ApiTags('expenses')
@ApiBearerAuth('JWT-auth')
@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name);

  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * Lists all expenses in the current tenant with filtering and pagination.
   *
   * @param query - Filter and pagination parameters
   * @returns Paginated list of expenses
   *
   * @example
   * GET /expenses?page=1&limit=20&status=DRAFT
   */
  @Get()
  @RequirePermissions(Permission.EXPENSES_VIEW)
  @ApiOperation({
    summary: 'List all expenses',
    description:
      'Returns a paginated list of expenses with optional filters for status, category, supplier, and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of expenses retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query() query: FilterExpensesDto,
  ): Promise<PaginatedExpensesResponse> {
    this.logger.log(
      `Listing expenses - page: ${query.page ?? 1}, limit: ${query.limit ?? 10}`,
    );

    return this.expensesService.findAll(query);
  }

  /**
   * Gets aggregated statistics for all expenses in the tenant.
   *
   * @returns Expense statistics including counts by status, totals by category, and grand total
   *
   * @example
   * GET /expenses/stats
   */
  @Get('stats')
  @RequirePermissions(Permission.EXPENSES_VIEW)
  @ApiOperation({
    summary: 'Get expense statistics',
    description:
      'Returns aggregated statistics for all expenses in the tenant including counts by status, totals by category for the current month, and grand total.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats(): Promise<ExpenseStatsResponse> {
    this.logger.log('Getting expense statistics');

    return this.expensesService.getStats();
  }

  /**
   * Gets an expense by ID.
   * Includes supplier, account, and cost center relations.
   *
   * @param id - Expense ID
   * @returns Expense data with all relations
   *
   * @example
   * GET /expenses/:id
   */
  @Get(':id')
  @RequirePermissions(Permission.EXPENSES_VIEW)
  @ApiOperation({
    summary: 'Get expense by ID',
    description:
      'Returns a single expense with its supplier, account, and cost center relations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async findOne(@Param('id') id: string): Promise<ExpenseResponse> {
    this.logger.log(`Getting expense: ${id}`);

    return this.expensesService.findOne(id);
  }

  /**
   * Creates a new expense in the tenant.
   * Requires EXPENSES_CREATE permission.
   * Generates expense number automatically (GTO-XXXXX).
   *
   * @param dto - Expense creation data
   * @param user - Current authenticated user
   * @returns Created expense data
   *
   * @example
   * POST /expenses
   * {
   *   "category": "SERVICIOS_PUBLICOS",
   *   "description": "Pago servicio de energia",
   *   "subtotal": 150000,
   *   "taxRate": 19
   * }
   */
  @Post()
  @RequirePermissions(Permission.EXPENSES_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new expense',
    description:
      'Creates a new expense. Automatically generates expense number and calculates tax/ReteFuente. Requires EXPENSES_CREATE permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Expense created successfully',
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
    description: 'Supplier, account, or cost center not found',
  })
  async create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ExpenseResponse> {
    this.logger.log(`Creating expense for user: ${user.userId}`);

    return this.expensesService.create(dto, user.userId);
  }

  /**
   * Updates an expense.
   * Only DRAFT expenses can be updated.
   * Requires EXPENSES_EDIT permission.
   *
   * @param id - Expense ID to update
   * @param dto - Update data
   * @returns Updated expense data
   *
   * @example
   * PATCH /expenses/:id
   * {
   *   "description": "Updated description",
   *   "subtotal": 200000
   * }
   */
  @Patch(':id')
  @RequirePermissions(Permission.EXPENSES_EDIT)
  @ApiOperation({
    summary: 'Update an expense',
    description:
      'Updates an existing expense. Only DRAFT expenses can be updated. Recalculates amounts if subtotal/taxRate/category changed. Requires EXPENSES_EDIT permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense updated successfully',
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
    description: 'Expense not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Expense is not in DRAFT status',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponse> {
    this.logger.log(`Updating expense: ${id}`);

    return this.expensesService.update(id, dto);
  }

  /**
   * Approves an expense (changes status from DRAFT to APPROVED).
   * Requires EXPENSES_APPROVE permission.
   *
   * @param id - Expense ID to approve
   * @param user - Current authenticated user
   * @returns Updated expense data
   *
   * @example
   * PATCH /expenses/:id/approve
   */
  @Patch(':id/approve')
  @RequirePermissions(Permission.EXPENSES_APPROVE)
  @ApiOperation({
    summary: 'Approve an expense',
    description:
      'Changes expense status from DRAFT to APPROVED. Sets approvedAt and approvedById. Requires EXPENSES_APPROVE permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID to approve',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense approved successfully',
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
    description: 'Expense not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Expense is not in DRAFT status',
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ExpenseResponse> {
    this.logger.log(`Approving expense: ${id}`);

    return this.expensesService.approve(id, user.userId);
  }

  /**
   * Pays an expense (changes status from APPROVED to PAID).
   * Uses POST because it causes significant side effects (accounting entry).
   * Requires EXPENSES_EDIT permission.
   *
   * @param id - Expense ID to pay
   * @param dto - Payment data (method, reference, date)
   * @returns Updated expense data
   *
   * @example
   * POST /expenses/:id/pay
   * {
   *   "paymentMethod": "BANK_TRANSFER",
   *   "paymentReference": "TRF-987654"
   * }
   */
  @Post(':id/pay')
  @RequirePermissions(Permission.EXPENSES_EDIT)
  @ApiOperation({
    summary: 'Pay an expense',
    description:
      'Changes expense status from APPROVED to PAID. Sets payment fields and generates accounting entry. Requires EXPENSES_EDIT permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID to pay',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense paid successfully',
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
    description: 'Expense not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Expense is not in APPROVED status',
  })
  async pay(
    @Param('id') id: string,
    @Body() dto: PayExpenseDto,
  ): Promise<ExpenseResponse> {
    this.logger.log(`Paying expense: ${id}`);

    return this.expensesService.pay(id, dto);
  }

  /**
   * Cancels an expense.
   * Can cancel from DRAFT or APPROVED status.
   * Cannot cancel a PAID expense.
   * Requires EXPENSES_EDIT permission.
   *
   * @param id - Expense ID to cancel
   * @returns Updated expense data
   *
   * @example
   * PATCH /expenses/:id/cancel
   */
  @Patch(':id/cancel')
  @RequirePermissions(Permission.EXPENSES_EDIT)
  @ApiOperation({
    summary: 'Cancel an expense',
    description:
      'Cancels an expense. Can cancel from DRAFT or APPROVED status. Cannot cancel a PAID expense. Requires EXPENSES_EDIT permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID to cancel',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense cancelled successfully',
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
    description: 'Expense not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Expense is already paid or cancelled',
  })
  async cancel(@Param('id') id: string): Promise<ExpenseResponse> {
    this.logger.log(`Cancelling expense: ${id}`);

    return this.expensesService.cancel(id);
  }

  /**
   * Deletes an expense.
   * Only DRAFT expenses can be deleted.
   * Requires EXPENSES_DELETE permission.
   *
   * @param id - Expense ID to delete
   *
   * @example
   * DELETE /expenses/:id
   */
  @Delete(':id')
  @RequirePermissions(Permission.EXPENSES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an expense',
    description:
      'Deletes an expense. Only DRAFT expenses can be deleted. Requires EXPENSES_DELETE permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 204,
    description: 'Expense deleted successfully',
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
    description: 'Expense not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Expense is not in DRAFT status',
  })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting expense: ${id}`);

    return this.expensesService.remove(id);
  }
}
