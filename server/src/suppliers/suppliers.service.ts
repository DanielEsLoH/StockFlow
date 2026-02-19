import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  Supplier,
  DocumentType,
  CustomerStatus,
  PaymentTerms,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

/**
 * Supplier data returned in responses
 */
export interface SupplierResponse {
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
  isActive: boolean;
  paymentTerms: PaymentTerms;
  contactName: string | null;
  contactPhone: string | null;
  totalOrders: number;
  totalPurchased: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedSuppliersResponse {
  data: SupplierResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Supplier stats response
 */
export interface SupplierStatsResponse {
  total: number;
  active: number;
  inactive: number;
}

/**
 * SuppliersService handles all supplier management operations including
 * CRUD operations and search functionality with multi-tenant isolation.
 *
 * Suppliers represent the vendors/providers of a tenant's business.
 * Each supplier document number must be unique within its tenant.
 */
@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Lists all suppliers within the current tenant with pagination, search, and status filter.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of suppliers per page
   * @param search - Optional search query for name or document number
   * @param status - Optional status filter (ACTIVE or INACTIVE)
   * @returns Paginated list of suppliers ordered by name ASC
   */
  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: CustomerStatus,
  ): Promise<PaginatedSuppliersResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing suppliers for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    const where: Prisma.SupplierWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { purchaseOrders: true } },
          purchaseOrders: {
            select: { total: true },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return this.buildPaginatedResponse(suppliers, total, page, limit);
  }

  /**
   * Gets supplier statistics for the current tenant.
   *
   * @returns Total, active, and inactive supplier counts
   */
  async getStats(): Promise<SupplierStatsResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting supplier stats for tenant ${tenantId}`);

    const [total, active, inactive] = await Promise.all([
      this.prisma.supplier.count({ where: { tenantId } }),
      this.prisma.supplier.count({
        where: { tenantId, status: CustomerStatus.ACTIVE },
      }),
      this.prisma.supplier.count({
        where: { tenantId, status: CustomerStatus.INACTIVE },
      }),
    ]);

    return { total, active, inactive };
  }

  /**
   * Searches suppliers by name or document number for autocomplete.
   *
   * @param query - Search query string
   * @returns List of matching suppliers (max 10)
   */
  async search(query: string): Promise<SupplierResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Searching suppliers for tenant ${tenantId}, query "${query}"`,
    );

    if (!query.trim()) {
      return [];
    }

    const suppliers = await this.prisma.supplier.findMany({
      where: {
        tenantId,
        status: CustomerStatus.ACTIVE,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { documentNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
        purchaseOrders: {
          select: { total: true },
        },
      },
    });

    return suppliers.map((supplier) => this.mapToSupplierResponse(supplier));
  }

  /**
   * Finds a single supplier by ID within the current tenant.
   *
   * @param id - Supplier ID
   * @returns Supplier data with purchase orders summary
   * @throws NotFoundException if supplier not found
   */
  async findOne(id: string): Promise<SupplierResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding supplier ${id} in tenant ${tenantId}`);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { purchaseOrders: true } },
        purchaseOrders: {
          select: { total: true },
        },
      },
    });

    if (!supplier) {
      this.logger.warn(`Supplier not found: ${id}`);
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.mapToSupplierResponse(supplier);
  }

  /**
   * Creates a new supplier within the current tenant.
   *
   * @param dto - Supplier creation data
   * @returns Created supplier data
   * @throws ConflictException if document number already exists in tenant
   */
  async create(dto: CreateSupplierDto): Promise<SupplierResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const normalizedDocumentNumber = dto.documentNumber.trim();

    this.logger.debug(
      `Creating supplier "${dto.name}" (Document: ${normalizedDocumentNumber}) in tenant ${tenantId}`,
    );

    // Check for existing supplier with same document number in tenant
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: {
        tenantId_documentNumber: {
          tenantId,
          documentNumber: normalizedDocumentNumber,
        },
      },
    });

    if (existingSupplier) {
      this.logger.warn(
        `Document number already exists: ${normalizedDocumentNumber}`,
      );
      throw new ConflictException('El numero de documento ya existe');
    }

    // Create supplier
    const supplier = await this.prisma.supplier.create({
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
        paymentTerms: dto.paymentTerms,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
      },
    });

    this.logger.log(`Supplier created: ${supplier.name} (${supplier.id})`);

    return this.mapToSupplierResponse(supplier);
  }

  /**
   * Updates an existing supplier.
   *
   * @param id - Supplier ID to update
   * @param dto - Update data
   * @returns Updated supplier data
   * @throws NotFoundException if supplier not found
   * @throws ConflictException if new document number already exists in tenant
   */
  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating supplier ${id} in tenant ${tenantId}`);

    // Find the supplier to update
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      this.logger.warn(`Supplier not found: ${id}`);
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Build update data
    const updateData: Prisma.SupplierUpdateInput = {};

    // Document number requires uniqueness check
    if (dto.documentNumber !== undefined) {
      const normalizedDocumentNumber = dto.documentNumber.trim();
      if (normalizedDocumentNumber !== supplier.documentNumber) {
        const existingSupplier = await this.prisma.supplier.findUnique({
          where: {
            tenantId_documentNumber: {
              tenantId,
              documentNumber: normalizedDocumentNumber,
            },
          },
        });

        if (existingSupplier) {
          this.logger.warn(
            `Document number already exists: ${normalizedDocumentNumber}`,
          );
          throw new ConflictException('El numero de documento ya existe');
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

    if (dto.paymentTerms !== undefined) {
      updateData.paymentTerms = dto.paymentTerms;
    }

    if (dto.contactName !== undefined) {
      updateData.contactName = dto.contactName;
    }

    if (dto.contactPhone !== undefined) {
      updateData.contactPhone = dto.contactPhone;
    }

    // Update the supplier
    const updatedSupplier = await this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Supplier updated: ${updatedSupplier.name} (${updatedSupplier.id})`,
    );

    return this.mapToSupplierResponse(updatedSupplier);
  }

  /**
   * Deletes a supplier from the tenant.
   * Deletion fails if the supplier has associated purchase orders.
   *
   * @param id - Supplier ID to delete
   * @throws NotFoundException if supplier not found
   * @throws BadRequestException if supplier has associated purchase orders
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting supplier ${id} in tenant ${tenantId}`);

    // Find the supplier to delete
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      this.logger.warn(`Supplier not found: ${id}`);
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Check if any purchase orders are associated with this supplier
    const purchaseOrderCount = await this.prisma.purchaseOrder.count({
      where: { supplierId: id },
    });

    if (purchaseOrderCount > 0) {
      this.logger.warn(
        `Cannot delete supplier ${id}: ${purchaseOrderCount} purchase orders associated`,
      );
      throw new BadRequestException(
        `No se puede eliminar un proveedor con ordenes de compra asociadas. El proveedor tiene ${purchaseOrderCount} orden(es) de compra asociada(s)`,
      );
    }

    await this.prisma.supplier.delete({ where: { id } });

    this.logger.log(`Supplier deleted: ${supplier.name} (${supplier.id})`);
  }

  /**
   * Maps a Supplier entity to a SupplierResponse object
   *
   * @param supplier - The supplier entity to map
   * @returns SupplierResponse object
   */
  private mapToSupplierResponse(
    supplier: Supplier & {
      _count?: { purchaseOrders: number };
      purchaseOrders?: { total: any }[];
    },
  ): SupplierResponse {
    return {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      documentType: supplier.documentType,
      documentNumber: supplier.documentNumber,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      businessName: supplier.businessName,
      taxId: supplier.taxId,
      notes: supplier.notes,
      status: supplier.status,
      isActive: supplier.status === CustomerStatus.ACTIVE,
      paymentTerms: supplier.paymentTerms,
      contactName: supplier.contactName,
      contactPhone: supplier.contactPhone,
      totalOrders: supplier._count?.purchaseOrders ?? 0,
      totalPurchased:
        supplier.purchaseOrders?.reduce(
          (sum, po) => sum + Number(po.total),
          0,
        ) ?? 0,
      tenantId: supplier.tenantId,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  /**
   * Builds a paginated response from suppliers and pagination params
   */
  private buildPaginatedResponse(
    suppliers: (Supplier & {
      _count?: { purchaseOrders: number };
      purchaseOrders?: { total: any }[];
    })[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedSuppliersResponse {
    return {
      data: suppliers.map((supplier) => this.mapToSupplierResponse(supplier)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
