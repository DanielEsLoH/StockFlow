import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  Quotation,
  QuotationItem,
  QuotationStatus,
  Prisma,
  Customer,
  User,
  Product,
  Invoice,
  TaxCategory,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  FilterQuotationsDto,
} from './dto';
import { InvoicesService } from '../invoices';
import { CreateInvoiceDto } from '../invoices/dto/create-invoice.dto';

/**
 * Quotation item data returned in responses
 */
export interface QuotationItemResponse {
  id: string;
  quotationId: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxCategory: string;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

/**
 * Quotation data returned in responses
 */
export interface QuotationResponse {
  id: string;
  tenantId: string;
  customerId: string | null;
  userId: string | null;
  quotationNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  issueDate: Date;
  validUntil: Date | null;
  status: QuotationStatus;
  notes: string | null;
  convertedToInvoiceId: string | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: QuotationItemResponse[];
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    documentType: string | null;
    documentNumber: string | null;
    address: string | null;
    city: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  convertedToInvoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
}

/**
 * Paginated response for quotation list endpoints
 */
export interface PaginatedQuotationsResponse {
  data: QuotationResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Quotation with relations for internal use
 */
type QuotationWithRelations = Quotation & {
  items?: (QuotationItem & { product?: Product | null })[];
  customer?: Customer | null;
  user?: User | null;
  convertedToInvoice?: Invoice | null;
};

/**
 * QuotationsService handles all quotation management operations including
 * CRUD operations, status transitions (DRAFT -> SENT -> ACCEPTED/REJECTED),
 * and conversion to invoices, all with multi-tenant isolation.
 *
 * Quotations are non-binding price proposals. They do NOT affect stock
 * and have no DIAN or payment tracking requirements.
 */
@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    @Inject(forwardRef(() => InvoicesService))
    private readonly invoicesService: InvoicesService,
  ) {}

  /**
   * Creates a new quotation within the current tenant.
   * Validates customer and products, calculates totals, and generates
   * a sequential quotation number inside a transaction.
   *
   * @param dto - Quotation creation data
   * @param userId - ID of the user creating the quotation
   * @returns Created quotation data with relations
   * @throws NotFoundException if customer or product not found
   */
  async create(
    dto: CreateQuotationDto,
    userId: string,
  ): Promise<QuotationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating quotation for tenant ${tenantId} by user ${userId}`,
    );

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }
    }

    // Validate all products exist (batch query to avoid N+1)
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      if (!productMap.has(item.productId)) {
        throw new NotFoundException(
          `Producto no encontrado: ${item.productId}`,
        );
      }
    }

    // Calculate item totals
    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const subtotal = item.quantity * item.unitPrice;
      const taxRate = item.taxRate ?? 19;
      const taxCategory =
        item.taxCategory ?? product.taxCategory ?? TaxCategory.GRAVADO_19;
      const discount = item.discount ?? 0;
      const tax = subtotal * (taxRate / 100);
      const total = subtotal + tax - discount;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        taxCategory,
        discount,
        subtotal,
        tax,
        total,
      };
    });

    // Calculate quotation totals
    const quotationSubtotal = itemsData.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const quotationTax = itemsData.reduce((sum, item) => sum + item.tax, 0);
    const quotationDiscount = itemsData.reduce(
      (sum, item) => sum + item.discount,
      0,
    );
    const quotationTotal = quotationSubtotal + quotationTax - quotationDiscount;

    // Create quotation within a transaction
    const quotation = await this.prisma.$transaction(async (tx) => {
      const quotationNumber = await this.generateQuotationNumber(tx);

      const newQuotation = await tx.quotation.create({
        data: {
          tenantId,
          userId,
          customerId: dto.customerId ?? null,
          quotationNumber,
          subtotal: quotationSubtotal,
          tax: quotationTax,
          discount: quotationDiscount,
          total: quotationTotal,
          issueDate: new Date(),
          validUntil: dto.validUntil ?? null,
          status: QuotationStatus.DRAFT,
          notes: dto.notes ?? null,
        },
      });

      // Create quotation items
      await tx.quotationItem.createMany({
        data: itemsData.map((item) => ({
          quotationId: newQuotation.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxCategory: item.taxCategory,
          discount: item.discount,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      });

      // Fetch the complete quotation with relations
      return tx.quotation.findUnique({
        where: { id: newQuotation.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
        },
      });
    });

    if (!quotation) {
      throw new BadRequestException('Error al crear la cotizacion');
    }

    this.logger.log(
      `Quotation created: ${quotation.quotationNumber} (${quotation.id})`,
    );

    return this.mapToQuotationResponse(quotation);
  }

  /**
   * Lists all quotations within the current tenant with filtering and pagination.
   * Supports search by quotation number and customer name.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of quotations
   */
  async findAll(
    filters: FilterQuotationsDto = {},
  ): Promise<PaginatedQuotationsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      status,
      customerId,
      fromDate,
      toDate,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing quotations for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.QuotationWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (fromDate || toDate) {
      where.issueDate = {};
      if (fromDate) {
        where.issueDate.gte = fromDate;
      }
      if (toDate) {
        where.issueDate.lte = toDate;
      }
    }

    // Search in quotation number and customer name
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [quotations, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              documentType: true,
              documentNumber: true,
              address: true,
              city: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data: quotations.map((quotation) =>
        this.mapToQuotationResponse(quotation as QuotationWithRelations),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Finds a single quotation by ID within the current tenant.
   * Includes all items with product relations, customer, user,
   * and the converted invoice if applicable.
   *
   * @param id - Quotation ID
   * @returns Quotation data with full relations
   * @throws NotFoundException if quotation not found
   */
  async findOne(id: string): Promise<QuotationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding quotation ${id} in tenant ${tenantId}`);

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
        convertedToInvoice: true,
      },
    });

    if (!quotation) {
      this.logger.warn(`Quotation not found: ${id}`);
      throw new NotFoundException('Cotizacion no encontrada');
    }

    return this.mapToQuotationResponse(quotation);
  }

  /**
   * Updates an existing quotation.
   * Only DRAFT quotations can be updated.
   *
   * @param id - Quotation ID to update
   * @param dto - Update data (customerId, validUntil, notes)
   * @returns Updated quotation data
   * @throws NotFoundException if quotation not found
   * @throws BadRequestException if quotation is not in DRAFT status
   */
  async update(
    id: string,
    dto: UpdateQuotationDto,
  ): Promise<QuotationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating quotation ${id} in tenant ${tenantId}`);

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
    });

    if (!quotation) {
      this.logger.warn(`Quotation not found: ${id}`);
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar cotizaciones en estado borrador',
      );
    }

    // Build update data
    const updateData: Prisma.QuotationUpdateInput = {};

    if (dto.customerId !== undefined) {
      // Validate customer exists
      if (dto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: dto.customerId, tenantId },
        });

        if (!customer) {
          throw new NotFoundException('Cliente no encontrado');
        }
      }

      updateData.customer = dto.customerId
        ? { connect: { id: dto.customerId } }
        : { disconnect: true };
    }

    if (dto.validUntil !== undefined) {
      updateData.validUntil = dto.validUntil;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    const updatedQuotation = await this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
      },
    });

    this.logger.log(
      `Quotation updated: ${updatedQuotation.quotationNumber} (${updatedQuotation.id})`,
    );

    return this.mapToQuotationResponse(updatedQuotation);
  }

  /**
   * Deletes a quotation from the tenant.
   * Only DRAFT quotations can be deleted. Items are cascade-deleted.
   *
   * @param id - Quotation ID to delete
   * @throws NotFoundException if quotation not found
   * @throws BadRequestException if quotation is not in DRAFT status
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting quotation ${id} in tenant ${tenantId}`);

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
    });

    if (!quotation) {
      this.logger.warn(`Quotation not found: ${id}`);
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar cotizaciones en estado borrador',
      );
    }

    await this.prisma.quotation.delete({ where: { id } });

    this.logger.log(
      `Quotation deleted: ${quotation.quotationNumber} (${quotation.id})`,
    );
  }

  /**
   * Sends a quotation (changes status from DRAFT to SENT).
   *
   * @param id - Quotation ID to send
   * @returns Updated quotation data
   * @throws NotFoundException if quotation not found
   * @throws BadRequestException if quotation is not in DRAFT status
   */
  async send(id: string): Promise<QuotationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Sending quotation ${id} in tenant ${tenantId}`);

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
    });

    if (!quotation) {
      this.logger.warn(`Quotation not found: ${id}`);
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden enviar cotizaciones en estado borrador',
      );
    }

    const updatedQuotation = await this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.SENT },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
      },
    });

    this.logger.log(
      `Quotation sent: ${updatedQuotation.quotationNumber} (${updatedQuotation.id})`,
    );

    return this.mapToQuotationResponse(updatedQuotation);
  }

  /**
   * Accepts a quotation (changes status from SENT to ACCEPTED).
   *
   * @param id - Quotation ID to accept
   * @returns Updated quotation data
   * @throws NotFoundException if quotation not found
   * @throws BadRequestException if quotation is not in SENT status
   */
  async accept(id: string): Promise<QuotationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Accepting quotation ${id} in tenant ${tenantId}`);

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
    });

    if (!quotation) {
      this.logger.warn(`Quotation not found: ${id}`);
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        'Solo se pueden aceptar cotizaciones en estado enviada',
      );
    }

    const updatedQuotation = await this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.ACCEPTED },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
      },
    });

    this.logger.log(
      `Quotation accepted: ${updatedQuotation.quotationNumber} (${updatedQuotation.id})`,
    );

    return this.mapToQuotationResponse(updatedQuotation);
  }

  /**
   * Rejects a quotation (changes status from SENT to REJECTED).
   *
   * @param id - Quotation ID to reject
   * @returns Updated quotation data
   * @throws NotFoundException if quotation not found
   * @throws BadRequestException if quotation is not in SENT status
   */
  async reject(id: string): Promise<QuotationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Rejecting quotation ${id} in tenant ${tenantId}`);

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
    });

    if (!quotation) {
      this.logger.warn(`Quotation not found: ${id}`);
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        'Solo se pueden rechazar cotizaciones en estado enviada',
      );
    }

    const updatedQuotation = await this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.REJECTED },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
      },
    });

    this.logger.log(
      `Quotation rejected: ${updatedQuotation.quotationNumber} (${updatedQuotation.id})`,
    );

    return this.mapToQuotationResponse(updatedQuotation);
  }

  /**
   * Converts an accepted quotation into a draft invoice.
   * Maps quotation items to invoice items and delegates creation
   * to InvoicesService which handles stock deduction, number generation, etc.
   *
   * @param id - Quotation ID to convert
   * @param userId - ID of the user performing the conversion
   * @returns Updated quotation data with converted invoice reference
   * @throws NotFoundException if quotation not found
   * @throws BadRequestException if quotation is not in ACCEPTED status
   */
  async convert(id: string, userId: string): Promise<QuotationResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Converting quotation ${id} in tenant ${tenantId}`);

    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      this.logger.warn(`Quotation not found: ${id}`);
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.status !== QuotationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Solo se pueden convertir cotizaciones en estado aceptada',
      );
    }

    // Map quotation data to CreateInvoiceDto
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const createInvoiceDto: CreateInvoiceDto = {
      customerId: quotation.customerId ?? undefined,
      notes: quotation.notes ?? undefined,
      dueDate,
      source: 'MANUAL' as const,
      items: quotation.items.map((item) => ({
        productId: item.productId!,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        discount: Number(item.discount),
        taxCategory: item.taxCategory,
      })),
    };

    // Create the invoice via InvoicesService (handles stock, numbering, etc.)
    const invoice = await this.invoicesService.create(createInvoiceDto, userId);

    // Update quotation status to CONVERTED with invoice reference
    const updatedQuotation = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.CONVERTED,
        convertedToInvoiceId: invoice.id,
        convertedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
        convertedToInvoice: true,
      },
    });

    this.logger.log(
      `Quotation converted: ${updatedQuotation.quotationNumber} -> Invoice ${invoice.invoiceNumber}`,
    );

    return this.mapToQuotationResponse(updatedQuotation);
  }

  /**
   * Gets aggregated statistics for all quotations in the current tenant.
   *
   * @returns Quotation statistics including counts by status and total values
   */
  async getStats(): Promise<{
    totalQuotations: number;
    totalValue: number;
    quotationsByStatus: Record<QuotationStatus, number>;
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting quotation statistics for tenant ${tenantId}`);

    const quotations = await this.prisma.quotation.findMany({
      where: { tenantId },
      select: {
        status: true,
        total: true,
      },
    });

    // Initialize status counts
    const quotationsByStatus: Record<QuotationStatus, number> = {
      [QuotationStatus.DRAFT]: 0,
      [QuotationStatus.SENT]: 0,
      [QuotationStatus.ACCEPTED]: 0,
      [QuotationStatus.REJECTED]: 0,
      [QuotationStatus.EXPIRED]: 0,
      [QuotationStatus.CONVERTED]: 0,
    };

    let totalValue = 0;

    for (const quotation of quotations) {
      quotationsByStatus[quotation.status]++;
      totalValue += Number(quotation.total);
    }

    return {
      totalQuotations: quotations.length,
      totalValue,
      quotationsByStatus,
    };
  }

  /**
   * Generates a consecutive quotation number unique to the tenant.
   * Format: COT-00001, COT-00002, etc.
   *
   * Must be called inside a transaction to prevent race conditions.
   *
   * @param tx - Prisma transaction client
   * @returns Generated quotation number
   */
  private async generateQuotationNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();

    const lastQuotation = await tx.quotation.findFirst({
      where: { tenantId, quotationNumber: { startsWith: 'COT-' } },
      orderBy: { quotationNumber: 'desc' },
      select: { quotationNumber: true },
    });

    let nextNumber = 1;

    if (lastQuotation?.quotationNumber) {
      const match = lastQuotation.quotationNumber.match(/COT-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const quotationNumber = `COT-${nextNumber.toString().padStart(5, '0')}`;

    this.logger.debug(`Generated quotation number: ${quotationNumber}`);

    return quotationNumber;
  }

  /**
   * Maps a Quotation entity (with Prisma Decimal fields) to a
   * QuotationResponse object with plain number fields.
   *
   * @param quotation - The quotation entity to map (with or without relations)
   * @returns QuotationResponse object
   */
  private mapToQuotationResponse(
    quotation: QuotationWithRelations,
  ): QuotationResponse {
    const response: QuotationResponse = {
      id: quotation.id,
      tenantId: quotation.tenantId,
      customerId: quotation.customerId,
      userId: quotation.userId,
      quotationNumber: quotation.quotationNumber,
      subtotal: Number(quotation.subtotal),
      tax: Number(quotation.tax),
      discount: Number(quotation.discount),
      total: Number(quotation.total),
      issueDate: quotation.issueDate,
      validUntil: quotation.validUntil,
      status: quotation.status,
      notes: quotation.notes,
      convertedToInvoiceId: quotation.convertedToInvoiceId,
      convertedAt: quotation.convertedAt,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    };

    // Map items if included
    if (quotation.items) {
      response.items = quotation.items.map((item) => ({
        id: item.id,
        quotationId: item.quotationId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        taxCategory: item.taxCategory,
        discount: Number(item.discount),
        subtotal: Number(item.subtotal),
        tax: Number(item.tax),
        total: Number(item.total),
        createdAt: item.createdAt,
        product: item.product
          ? {
              id: item.product.id,
              sku: item.product.sku,
              name: item.product.name,
            }
          : undefined,
      }));
    }

    // Map customer if included
    if (quotation.customer) {
      response.customer = {
        id: quotation.customer.id,
        name: quotation.customer.name,
        email: quotation.customer.email,
        phone: quotation.customer.phone,
        documentType: quotation.customer.documentType,
        documentNumber: quotation.customer.documentNumber,
        address: quotation.customer.address,
        city: quotation.customer.city,
      };
    }

    // Map user if included
    if (quotation.user) {
      response.user = {
        id: quotation.user.id,
        name: `${quotation.user.firstName} ${quotation.user.lastName}`,
        email: quotation.user.email,
      };
    }

    // Map converted invoice if included
    if (quotation.convertedToInvoice) {
      response.convertedToInvoice = {
        id: quotation.convertedToInvoice.id,
        invoiceNumber: quotation.convertedToInvoice.invoiceNumber,
        status: quotation.convertedToInvoice.status,
      };
    }

    return response;
  }
}
