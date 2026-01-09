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
import { CustomersService } from './customers.service';
import type {
  CustomerResponse,
  PaginatedCustomersResponse,
} from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

/**
 * CustomersController handles all customer management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List customers: All authenticated roles
 * - View customer: All authenticated roles
 * - Search customers: All authenticated roles
 * - Create customer: ADMIN, MANAGER
 * - Update customer: ADMIN, MANAGER
 * - Delete customer: ADMIN only
 */
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

  /**
   * Lists all customers in the current tenant with pagination.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of customers
   *
   * @example
   * GET /customers?page=1&limit=20
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedCustomersResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(`Listing customers - page: ${pageNum}, limit: ${limitNum}`);

    return this.customersService.findAll(pageNum, limitNum);
  }

  /**
   * Searches customers by name or document number.
   *
   * @param q - Search query string
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of matching customers
   *
   * @example
   * GET /customers/search?q=Juan&page=1&limit=20
   */
  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedCustomersResponse> {
    const query = q?.trim() ?? '';
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(
      `Searching customers - query: "${query}", page: ${pageNum}, limit: ${limitNum}`,
    );

    return this.customersService.search(query, pageNum, limitNum);
  }

  /**
   * Gets a customer by ID.
   *
   * @param id - Customer ID
   * @returns Customer data
   *
   * @example
   * GET /customers/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CustomerResponse> {
    this.logger.log(`Getting customer: ${id}`);

    return this.customersService.findOne(id);
  }

  /**
   * Creates a new customer in the tenant.
   * Only ADMIN and MANAGER users can create customers.
   *
   * @param dto - Customer creation data
   * @returns Created customer data
   *
   * @example
   * POST /customers
   * {
   *   "name": "Juan Carlos Perez",
   *   "email": "juan@example.com",
   *   "documentType": "CC",
   *   "documentNumber": "1234567890"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCustomerDto): Promise<CustomerResponse> {
    this.logger.log(
      `Creating customer: ${dto.name} (Document: ${dto.documentNumber})`,
    );
    return this.customersService.create(dto);
  }

  /**
   * Updates a customer.
   * Only ADMIN and MANAGER users can update customers.
   *
   * @param id - Customer ID to update
   * @param dto - Update data
   * @returns Updated customer data
   *
   * @example
   * PATCH /customers/:id
   * {
   *   "name": "Juan Carlos Perez Rodriguez",
   *   "phone": "+57 300 123 4567"
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerResponse> {
    this.logger.log(`Updating customer: ${id}`);
    return this.customersService.update(id, dto);
  }

  /**
   * Deletes a customer.
   * Only ADMIN users can delete customers.
   * Deletion fails if the customer has associated invoices.
   *
   * @param id - Customer ID to delete
   *
   * @example
   * DELETE /customers/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting customer: ${id}`);
    return this.customersService.delete(id);
  }
}
