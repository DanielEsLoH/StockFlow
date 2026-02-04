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
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { POSSalesService } from './pos-sales.service';
import type {
  POSSaleWithDetails,
  PaginatedSalesResponse,
} from './pos-sales.service';
import { CreateSaleDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { CurrentUser, Roles } from '../common/decorators';
import {
  POSSaleWithDetailsEntity,
  PaginatedSalesEntity,
} from './entities/pos-sale.entity';

interface JwtUser {
  id: string;
  tenantId: string;
  role: UserRole;
}

/**
 * POSSalesController handles all POS sale operations.
 *
 * All endpoints require JWT authentication.
 * Sales can only be created in an active session.
 */
@ApiTags('pos-sales')
@ApiBearerAuth('JWT-auth')
@Controller('pos-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class POSSalesController {
  private readonly logger = new Logger(POSSalesController.name);

  constructor(private readonly posSalesService: POSSalesService) {}

  /**
   * Creates a new POS sale with split payment support.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new POS sale',
    description:
      'Creates a new POS sale with items and payments. Supports split payments (multiple payment methods). Requires an active session.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sale created successfully',
    type: POSSaleWithDetailsEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - No active session, insufficient stock, or payment mismatch',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product or customer not found' })
  async createSale(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: JwtUser,
  ): Promise<POSSaleWithDetails> {
    this.logger.log(`Creating POS sale with ${dto.items.length} items`);
    return this.posSalesService.createSale(dto, user.id);
  }

  /**
   * Voids a POS sale.
   */
  @Post(':id/void')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Void a POS sale',
    description:
      'Voids a POS sale, reverses stock changes, and creates refund movements. Only managers and admins can void sales.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID to void' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for voiding the sale',
          example: 'Customer returned all items',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sale voided successfully',
    type: POSSaleWithDetailsEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Sale already voided',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  async voidSale(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: JwtUser,
  ): Promise<POSSaleWithDetails> {
    this.logger.log(`Voiding sale: ${id}`);
    return this.posSalesService.voidSale(id, user.id, reason);
  }

  /**
   * Gets a sale by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get sale by ID',
    description: 'Returns a single sale with full details including items and payments.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiResponse({
    status: 200,
    description: 'Sale details',
    type: POSSaleWithDetailsEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  async findOne(@Param('id') id: string): Promise<POSSaleWithDetails> {
    this.logger.log(`Getting sale: ${id}`);
    return this.posSalesService.findOne(id);
  }

  /**
   * Lists sales with pagination and filters.
   */
  @Get()
  @ApiOperation({
    summary: 'List POS sales',
    description: 'Returns a paginated list of POS sales with optional filters.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: Date })
  @ApiQuery({ name: 'toDate', required: false, type: Date })
  @ApiResponse({
    status: 200,
    description: 'List of sales',
    type: PaginatedSalesEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sessionId') sessionId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<PaginatedSalesResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '10', 10) || 10));

    this.logger.log(`Listing sales - page: ${pageNum}, limit: ${limitNum}`);

    return this.posSalesService.findAll(
      pageNum,
      limitNum,
      sessionId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }
}
