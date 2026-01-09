import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Customer, DocumentType, CustomerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

/**
 * Customer data returned in responses
 */
export interface CustomerResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentType: DocumentType;
  documentNumber: string;
  address: string | null;
  city: string | null;
  state: string | null;
  businessName: string | null;
  taxId: string | null;
  notes: string | null;
  status: CustomerStatus;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedCustomersResponse {
  data: CustomerResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * CustomersService handles all customer management operations including
 * CRUD operations and search functionality with multi-tenant isolation.
 *
 * Customers represent the clients of a tenant's business.
 * Each customer document number must be unique within its tenant.
 */
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Lists all customers within the current tenant with pagination.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of customers per page
   * @returns Paginated list of customers ordered by name ASC
   */
  async findAll(page = 1, limit = 10): Promise<PaginatedCustomersResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing customers for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    const where: Prisma.CustomerWhereInput = { tenantId };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return this.buildPaginatedResponse(customers, total, page, limit);
  }

  /**
   * Searches customers by name or document number (case-insensitive).
   *
   * @param query - Search query string
   * @param page - Page number (1-indexed)
   * @param limit - Number of customers per page
   * @returns Paginated list of matching customers
   */
  async search(
    query: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedCustomersResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Searching customers for tenant ${tenantId}, query "${query}", page ${page}`,
    );

    const where: Prisma.CustomerWhereInput = {
      tenantId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { documentNumber: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return this.buildPaginatedResponse(customers, total, page, limit);
  }

  /**
   * Finds a single customer by ID within the current tenant.
   *
   * @param id - Customer ID
   * @returns Customer data
   * @throws NotFoundException if customer not found
   */
  async findOne(id: string): Promise<CustomerResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding customer ${id} in tenant ${tenantId}`);

    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      this.logger.warn(`Customer not found: ${id}`);
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.mapToCustomerResponse(customer);
  }

  /**
   * Creates a new customer within the current tenant.
   *
   * @param dto - Customer creation data
   * @returns Created customer data
   * @throws ConflictException if document number already exists in tenant
   */
  async create(dto: CreateCustomerDto): Promise<CustomerResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const normalizedDocumentNumber = dto.documentNumber.trim();

    this.logger.debug(
      `Creating customer "${dto.name}" (Document: ${normalizedDocumentNumber}) in tenant ${tenantId}`,
    );

    // Check for existing customer with same document number in tenant
    const existingCustomer = await this.prisma.customer.findUnique({
      where: {
        tenantId_documentNumber: {
          tenantId,
          documentNumber: normalizedDocumentNumber,
        },
      },
    });

    if (existingCustomer) {
      this.logger.warn(
        `Document number already exists: ${normalizedDocumentNumber}`,
      );
      throw new ConflictException('El número de documento ya existe');
    }

    // Create customer
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        email: dto.email,
        phone: dto.phone,
        documentType: dto.documentType,
        documentNumber: normalizedDocumentNumber,
        address: dto.address,
        city: dto.city,
        notes: dto.notes,
        status: CustomerStatus.ACTIVE,
      },
    });

    this.logger.log(`Customer created: ${customer.name} (${customer.id})`);

    return this.mapToCustomerResponse(customer);
  }

  /**
   * Updates an existing customer.
   *
   * @param id - Customer ID to update
   * @param dto - Update data
   * @returns Updated customer data
   * @throws NotFoundException if customer not found
   * @throws ConflictException if new document number already exists in tenant
   */
  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating customer ${id} in tenant ${tenantId}`);

    // Find the customer to update
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      this.logger.warn(`Customer not found: ${id}`);
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Build update data
    const updateData: Prisma.CustomerUpdateInput = {};

    // Document number requires uniqueness check
    if (dto.documentNumber !== undefined) {
      const normalizedDocumentNumber = dto.documentNumber.trim();
      if (normalizedDocumentNumber !== customer.documentNumber) {
        const existingCustomer = await this.prisma.customer.findUnique({
          where: {
            tenantId_documentNumber: {
              tenantId,
              documentNumber: normalizedDocumentNumber,
            },
          },
        });

        if (existingCustomer) {
          this.logger.warn(
            `Document number already exists: ${normalizedDocumentNumber}`,
          );
          throw new ConflictException('El número de documento ya existe');
        }

        updateData.documentNumber = normalizedDocumentNumber;
      }
    }

    // Update simple fields
    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      updateData.email = dto.email;
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }

    if (dto.documentType !== undefined) {
      updateData.documentType = dto.documentType;
    }

    if (dto.address !== undefined) {
      updateData.address = dto.address;
    }

    if (dto.city !== undefined) {
      updateData.city = dto.city;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Update the customer
    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Customer updated: ${updatedCustomer.name} (${updatedCustomer.id})`,
    );

    return this.mapToCustomerResponse(updatedCustomer);
  }

  /**
   * Deletes a customer from the tenant.
   * Deletion fails if the customer has associated invoices.
   *
   * @param id - Customer ID to delete
   * @throws NotFoundException if customer not found
   * @throws BadRequestException if customer has associated invoices
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting customer ${id} in tenant ${tenantId}`);

    // Find the customer to delete
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      this.logger.warn(`Customer not found: ${id}`);
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Check if any invoices are associated with this customer
    const invoiceCount = await this.prisma.invoice.count({
      where: { customerId: id },
    });

    if (invoiceCount > 0) {
      this.logger.warn(
        `Cannot delete customer ${id}: ${invoiceCount} invoices associated`,
      );
      throw new BadRequestException(
        `No se puede eliminar un cliente con facturas asociadas. El cliente tiene ${invoiceCount} factura(s) asociada(s)`,
      );
    }

    await this.prisma.customer.delete({ where: { id } });

    this.logger.log(`Customer deleted: ${customer.name} (${customer.id})`);
  }

  /**
   * Maps a Customer entity to a CustomerResponse object
   *
   * @param customer - The customer entity to map
   * @returns CustomerResponse object
   */
  private mapToCustomerResponse(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      documentType: customer.documentType,
      documentNumber: customer.documentNumber,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      businessName: customer.businessName,
      taxId: customer.taxId,
      notes: customer.notes,
      status: customer.status,
      tenantId: customer.tenantId,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  /**
   * Builds a paginated response from customers and pagination params
   */
  private buildPaginatedResponse(
    customers: Customer[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedCustomersResponse {
    return {
      data: customers.map((customer) => this.mapToCustomerResponse(customer)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
