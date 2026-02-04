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
import { CashRegistersService } from './cash-registers.service';
import type {
  CashRegisterResponse,
  CashRegisterWithWarehouse,
  PaginatedCashRegistersResponse,
} from './cash-registers.service';
import { CreateCashRegisterDto, UpdateCashRegisterDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';
import {
  CashRegisterEntity,
  CashRegisterWithWarehouseEntity,
  PaginatedCashRegistersEntity,
} from './entities/cash-register.entity';

/**
 * CashRegistersController handles all cash register management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List cash registers: All authenticated roles
 * - View cash register: All authenticated roles
 * - Create cash register: ADMIN only
 * - Update cash register: ADMIN, MANAGER
 * - Delete cash register: ADMIN only
 */
@ApiTags('cash-registers')
@ApiBearerAuth('JWT-auth')
@Controller('cash-registers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashRegistersController {
  private readonly logger = new Logger(CashRegistersController.name);

  constructor(private readonly cashRegistersService: CashRegistersService) {}

  /**
   * Lists all cash registers in the current tenant with pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'List all cash registers',
    description:
      'Returns a paginated list of all cash registers in the current tenant. All authenticated users can access this endpoint.',
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
    name: 'warehouseId',
    required: false,
    type: String,
    description: 'Filter by warehouse ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of cash registers retrieved successfully',
    type: PaginatedCashRegistersEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouseId') warehouseId?: string,
  ): Promise<PaginatedCashRegistersResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(
      `Listing cash registers - page: ${pageNum}, limit: ${limitNum}`,
    );

    return this.cashRegistersService.findAll(pageNum, limitNum, warehouseId);
  }

  /**
   * Gets a cash register by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get cash register by ID',
    description:
      'Returns a single cash register by its ID with warehouse info and active session status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cash register ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Cash register retrieved successfully',
    type: CashRegisterWithWarehouseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  async findOne(@Param('id') id: string): Promise<CashRegisterWithWarehouse> {
    this.logger.log(`Getting cash register: ${id}`);

    return this.cashRegistersService.findOne(id);
  }

  /**
   * Creates a new cash register in the tenant.
   * Only ADMIN users can create cash registers.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new cash register',
    description:
      'Creates a new cash register in the current tenant. Only ADMIN users can create cash registers.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cash register created successfully',
    type: CashRegisterEntity,
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
    status: 404,
    description: 'Not Found - Warehouse not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cash register code already exists',
  })
  async create(
    @Body() dto: CreateCashRegisterDto,
  ): Promise<CashRegisterResponse> {
    this.logger.log(`Creating cash register: ${dto.name}`);
    return this.cashRegistersService.create(dto);
  }

  /**
   * Updates a cash register.
   * Only ADMIN and MANAGER users can update cash registers.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a cash register',
    description:
      'Updates an existing cash register. Only ADMIN and MANAGER users can update cash registers.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cash register ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Cash register updated successfully',
    type: CashRegisterEntity,
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
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cash register code already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCashRegisterDto,
  ): Promise<CashRegisterResponse> {
    this.logger.log(`Updating cash register: ${id}`);
    return this.cashRegistersService.update(id, dto);
  }

  /**
   * Deletes a cash register.
   * Only ADMIN users can delete cash registers.
   * Deletion fails if the cash register has any recorded sessions.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a cash register',
    description:
      'Deletes a cash register. Only ADMIN users can delete cash registers. Deletion fails if the cash register has any recorded sessions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cash register ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Cash register deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Cash register not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cash register has recorded sessions',
  })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting cash register: ${id}`);
    return this.cashRegistersService.delete(id);
  }
}
