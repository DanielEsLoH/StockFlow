import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  Customer,
  User,
  Product,
  Warehouse,
  WarehouseStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  CreateInvoiceDto,
  CheckoutInvoiceDto,
  UpdateInvoiceDto,
  FilterInvoicesDto,
  AddInvoiceItemDto,
  UpdateInvoiceItemDto,
} from './dto';

/**
 * Invoice item data returned in responses
 */
export interface InvoiceItemResponse {
  id: string;
  invoiceId: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
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
 * Invoice data returned in responses
 */
export interface InvoiceResponse {
  id: string;
  tenantId: string;
  customerId: string | null;
  userId: string | null;
  warehouseId: string | null;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  issueDate: Date;
  dueDate: Date | null;
  status: InvoiceStatus;
  source: 'MANUAL' | 'POS';
  paymentStatus: PaymentStatus;
  notes: string | null;
  dianCufe: string | null;
  dianXml: string | null;
  dianPdf: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: InvoiceItemResponse[];
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

/**
 * Paginated response for invoice list endpoints
 */
export interface PaginatedInvoicesResponse {
  data: InvoiceResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Invoice with relations for internal use
 * Note: Prisma returns null for optional relations, hence the null unions
 */
type InvoiceWithRelations = Invoice & {
  items?: (InvoiceItem & { product?: Product | null })[];
  customer?: Customer | null;
  user?: User | null;
  warehouse?: Warehouse | null;
};

/**
 * InvoicesService handles all invoice management operations including
 * CRUD operations, invoice status transitions, stock management, and
 * monthly limit enforcement with multi-tenant isolation.
 *
 * Invoices are the core billing documents within a tenant.
 * Each invoice number is unique within its tenant and auto-generated.
 */
@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Gets aggregated statistics for all invoices in the current tenant.
   *
   * @returns Invoice statistics including totals, amounts by status, and averages
   */
  async getStats(): Promise<{
    totalInvoices: number;
    totalRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    averageInvoiceValue: number;
    invoicesByStatus: Record<InvoiceStatus, number>;
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting invoice statistics for tenant ${tenantId}`);

    // Get all invoices for the tenant to calculate statistics
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      select: {
        status: true,
        paymentStatus: true,
        total: true,
      },
    });

    // Initialize status counts
    const invoicesByStatus: Record<InvoiceStatus, number> = {
      [InvoiceStatus.DRAFT]: 0,
      [InvoiceStatus.PENDING]: 0,
      [InvoiceStatus.SENT]: 0,
      [InvoiceStatus.OVERDUE]: 0,
      [InvoiceStatus.CANCELLED]: 0,
      [InvoiceStatus.VOID]: 0,
    };

    let totalRevenue = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    // Calculate statistics in a single pass
    for (const invoice of invoices) {
      // Count by status
      invoicesByStatus[invoice.status]++;

      const total = Number(invoice.total);

      // Total revenue from SENT invoices that are fully PAID (paymentStatus)
      if (invoice.paymentStatus === PaymentStatus.PAID) {
        totalRevenue += total;
      }

      // Pending amount (SENT invoices that are not yet paid)
      if (
        invoice.status === InvoiceStatus.SENT &&
        invoice.paymentStatus !== PaymentStatus.PAID
      ) {
        pendingAmount += total;
      }

      // Overdue amount
      if (invoice.status === InvoiceStatus.OVERDUE) {
        overdueAmount += total;
      }
    }

    const totalInvoices = invoices.length;
    const averageInvoiceValue =
      totalInvoices > 0
        ? invoices.reduce((sum, inv) => sum + Number(inv.total), 0) /
          totalInvoices
        : 0;

    return {
      totalInvoices,
      totalRevenue,
      pendingAmount,
      overdueAmount,
      averageInvoiceValue,
      invoicesByStatus,
    };
  }

  /**
   * Lists all invoices within the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of invoices
   */
  async findAll(
    filters: FilterInvoicesDto = {},
  ): Promise<PaginatedInvoicesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      customerId,
      fromDate,
      toDate,
      source,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing invoices for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.InvoiceWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
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

    if (source) {
      where.source = source;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          user: true,
          warehouse: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return this.buildPaginatedResponse(invoices, total, page, limit);
  }

  /**
   * Finds a single invoice by ID within the current tenant.
   * Includes all items, customer, and user relations.
   *
   * @param id - Invoice ID
   * @returns Invoice data with relations
   * @throws NotFoundException if invoice not found
   */
  async findOne(id: string): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding invoice ${id} in tenant ${tenantId}`);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
        warehouse: true,
      },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${id}`);
      throw new NotFoundException('Factura no encontrada');
    }

    return this.mapToInvoiceResponse(invoice);
  }

  /**
   * Creates a new invoice within the current tenant.
   * Generates invoice number, reduces stock, and creates stock movements.
   *
   * @param dto - Invoice creation data
   * @param userId - ID of the user creating the invoice
   * @returns Created invoice data
   * @throws ForbiddenException if monthly invoice limit is reached
   * @throws NotFoundException if product not found
   * @throws BadRequestException if insufficient stock
   */
  async create(
    dto: CreateInvoiceDto,
    userId: string,
  ): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating invoice for tenant ${tenantId} by user ${userId}`,
    );

    // Check monthly invoice limit
    await this.checkMonthlyLimit();

    // Resolve warehouse: use dto.warehouseId, fallback to user's assigned warehouse
    const invoiceWarehouseId = await this.resolveWarehouseForInvoice(
      dto.warehouseId,
      userId,
      tenantId,
    );

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(`Cliente no encontrado: ${dto.customerId}`);
      }
    }

    // Validate all products and check stock
    const productValidations = await this.validateProductsAndStock(
      dto.items,
      tenantId,
    );

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate item totals and invoice totals
    const itemsData = dto.items.map((item, index) => {
      const subtotal = item.quantity * item.unitPrice;
      const taxRate = item.taxRate ?? 19;
      const discount = item.discount ?? 0;
      const tax = subtotal * (taxRate / 100);
      const total = subtotal + tax - discount;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        discount,
        subtotal,
        tax,
        total,
        productName: productValidations[index].name,
      };
    });

    const invoiceSubtotal = itemsData.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const invoiceTax = itemsData.reduce((sum, item) => sum + item.tax, 0);
    const invoiceDiscount = itemsData.reduce(
      (sum, item) => sum + item.discount,
      0,
    );
    const invoiceTotal = invoiceSubtotal + invoiceTax - invoiceDiscount;

    // Create invoice within a transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Create the invoice
      const newInvoice = await tx.invoice.create({
        data: {
          tenantId,
          userId,
          customerId: dto.customerId ?? null,
          warehouseId: invoiceWarehouseId,
          invoiceNumber,
          subtotal: invoiceSubtotal,
          tax: invoiceTax,
          discount: invoiceDiscount,
          total: invoiceTotal,
          issueDate: new Date(),
          dueDate: dto.dueDate ?? null,
          status: InvoiceStatus.DRAFT,
          source: dto.source ?? 'MANUAL',
          paymentStatus: PaymentStatus.UNPAID,
          notes: dto.notes ?? null,
        },
        include: {
          customer: true,
          user: true,
          warehouse: true,
        },
      });

      // Create invoice items
      await tx.invoiceItem.createMany({
        data: itemsData.map((item) => ({
          invoiceId: newInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      });

      // Use the resolved warehouse for stock operations
      const warehouseId =
        invoiceWarehouseId ??
        (await this.getDefaultWarehouseId(tx, tenantId));

      // Reduce stock and create stock movements in parallel
      await Promise.all([
        // Update product stock for all items (global)
        ...itemsData.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          }),
        ),
        // Update warehouse stock for all items (per-warehouse)
        ...itemsData.map((item) =>
          tx.warehouseStock.upsert({
            where: {
              warehouseId_productId: {
                warehouseId,
                productId: item.productId,
              },
            },
            update: { quantity: { decrement: item.quantity } },
            create: {
              tenantId,
              warehouseId,
              productId: item.productId,
              quantity: -item.quantity,
            },
          }),
        ),
        // Create stock movement records for all items
        ...itemsData.map((item) =>
          tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId,
              userId,
              type: 'SALE',
              quantity: -item.quantity,
              reason: `Venta - Factura ${invoiceNumber}`,
              notes: `Item de factura: ${item.productName}`,
              invoiceId: newInvoice.id,
            },
          }),
        ),
      ]);

      // Fetch the complete invoice with items
      return tx.invoice.findUnique({
        where: { id: newInvoice.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
          warehouse: true,
        },
      });
    });

    if (!invoice) {
      throw new BadRequestException('Error al crear la factura');
    }

    this.logger.log(
      `Invoice created: ${invoice.invoiceNumber} (${invoice.id})`,
    );

    return this.mapToInvoiceResponse(invoice);
  }

  /**
   * Creates an invoice and immediately marks it as SENT.
   * Optionally records an immediate full payment (for POS cash sales).
   *
   * @param dto - Checkout data (extends CreateInvoiceDto with payment options)
   * @param userId - ID of the user creating the invoice
   * @returns Created invoice data
   */
  async checkout(
    dto: CheckoutInvoiceDto,
    userId: string,
  ): Promise<InvoiceResponse> {
    // First, create the invoice using the existing create method
    const createdInvoice = await this.create(dto, userId);

    const tenantId = this.tenantContext.requireTenantId();

    // Now update status to SENT and optionally record payment in a transaction
    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      // Mark as SENT
      await tx.invoice.update({
        where: { id: createdInvoice.id },
        data: { status: InvoiceStatus.SENT },
      });

      // Record immediate payment if requested
      if (dto.immediatePayment) {
        await tx.payment.create({
          data: {
            tenantId,
            invoiceId: createdInvoice.id,
            amount: createdInvoice.total,
            method: dto.paymentMethod ?? 'CASH',
            paymentDate: new Date(),
            notes: 'Pago inmediato - POS',
          },
        });

        // Update payment status to PAID
        await tx.invoice.update({
          where: { id: createdInvoice.id },
          data: { paymentStatus: PaymentStatus.PAID },
        });
      }

      // Fetch the complete updated invoice
      return tx.invoice.findUnique({
        where: { id: createdInvoice.id },
        include: {
          items: { include: { product: true } },
          customer: true,
          user: true,
          warehouse: true,
        },
      });
    });

    if (!updatedInvoice) {
      throw new BadRequestException('Error al procesar el checkout');
    }

    this.logger.log(
      `Checkout completed: ${updatedInvoice.invoiceNumber} (${updatedInvoice.id}), paid: ${dto.immediatePayment ?? false}`,
    );

    return this.mapToInvoiceResponse(updatedInvoice);
  }

  /**
   * Marks an invoice as paid by recording a payment for the remaining balance.
   * If the invoice is in DRAFT status, it is first moved to SENT.
   *
   * @param id - Invoice ID
   * @param paymentMethod - Payment method (default: CASH)
   * @returns Updated invoice data
   */
  async markAsPaid(
    id: string,
    paymentMethod: string = 'CASH',
  ): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Marking invoice ${id} as paid in tenant ${tenantId}`);

    // Find the invoice with existing payments
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.VOID
    ) {
      throw new BadRequestException(
        'No se puede marcar como pagada una factura cancelada o anulada',
      );
    }

    if (invoice.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('La factura ya esta pagada');
    }

    // Calculate remaining balance
    const totalPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remaining = Number(invoice.total) - totalPaid;

    if (remaining <= 0) {
      throw new BadRequestException('No hay saldo pendiente en esta factura');
    }

    // Update in a transaction
    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      // If DRAFT, move to SENT first
      if (invoice.status === InvoiceStatus.DRAFT) {
        await tx.invoice.update({
          where: { id },
          data: { status: InvoiceStatus.SENT },
        });
      }

      // Record the payment for the remaining balance
      await tx.payment.create({
        data: {
          tenantId,
          invoiceId: id,
          amount: remaining,
          method: paymentMethod as never,
          paymentDate: new Date(),
          notes: 'Pago completo registrado manualmente',
        },
      });

      // Update payment status
      return tx.invoice.update({
        where: { id },
        data: { paymentStatus: PaymentStatus.PAID },
        include: {
          items: { include: { product: true } },
          customer: true,
          user: true,
          warehouse: true,
        },
      });
    });

    this.logger.log(
      `Invoice marked as paid: ${updatedInvoice.invoiceNumber} (${updatedInvoice.id})`,
    );

    return this.mapToInvoiceResponse(updatedInvoice);
  }

  /**
   * Updates an existing invoice.
   * Only DRAFT invoices can be updated.
   *
   * @param id - Invoice ID to update
   * @param dto - Update data (only notes and dueDate)
   * @returns Updated invoice data
   * @throws NotFoundException if invoice not found
   * @throws BadRequestException if invoice is not in DRAFT status
   */
  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating invoice ${id} in tenant ${tenantId}`);

    // Find the invoice to update
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${id}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Only DRAFT invoices can be updated
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden modificar facturas en borrador',
      );
    }

    // Build update data
    const updateData: Prisma.InvoiceUpdateInput = {};

    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Update the invoice
    const updatedInvoice = await this.prisma.invoice.update({
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
        warehouse: true,
      },
    });

    this.logger.log(
      `Invoice updated: ${updatedInvoice.invoiceNumber} (${updatedInvoice.id})`,
    );

    return this.mapToInvoiceResponse(updatedInvoice);
  }

  /**
   * Deletes an invoice from the tenant.
   * Only DRAFT invoices can be deleted.
   * Stock is NOT restored when deleting a draft (stock was already reduced on creation).
   *
   * @param id - Invoice ID to delete
   * @throws NotFoundException if invoice not found
   * @throws BadRequestException if invoice is not in DRAFT status
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting invoice ${id} in tenant ${tenantId}`);

    // Find the invoice to delete
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${id}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Only DRAFT invoices can be deleted
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar facturas en borrador',
      );
    }

    // Delete within a transaction to restore stock - optimized for parallel operations
    await this.prisma.$transaction(async (tx) => {
      // Filter items that have productId
      const itemsWithProduct = invoice.items.filter((item) => item.productId);

      // Get default warehouse for stock operations
      const warehouseId = await this.getDefaultWarehouseId(tx, tenantId);

      // Restore stock and create movements in parallel
      await Promise.all([
        // Restore product stock for all items (global)
        ...itemsWithProduct.map((item) =>
          tx.product.update({
            where: { id: item.productId! },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          }),
        ),
        // Restore warehouse stock for all items (per-warehouse)
        ...itemsWithProduct.map((item) =>
          tx.warehouseStock.upsert({
            where: {
              warehouseId_productId: {
                warehouseId,
                productId: item.productId!,
              },
            },
            update: { quantity: { increment: item.quantity } },
            create: {
              tenantId,
              warehouseId,
              productId: item.productId!,
              quantity: item.quantity,
            },
          }),
        ),
        // Create return stock movements for all items
        ...itemsWithProduct.map((item) =>
          tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId!,
              warehouseId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: `Eliminación de factura borrador ${invoice.invoiceNumber}`,
              invoiceId: invoice.id,
            },
          }),
        ),
      ]);

      // Delete related records and invoice in parallel
      await Promise.all([
        tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        }),
        tx.stockMovement.deleteMany({
          where: { invoiceId: id },
        }),
      ]);

      // Delete the invoice
      await tx.invoice.delete({ where: { id } });
    });

    this.logger.log(
      `Invoice deleted: ${invoice.invoiceNumber} (${invoice.id})`,
    );
  }

  /**
   * Sends an invoice (changes status from DRAFT to SENT).
   *
   * @param id - Invoice ID to send
   * @returns Updated invoice data
   * @throws NotFoundException if invoice not found
   * @throws BadRequestException if invoice is not in DRAFT status
   */
  async send(id: string): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Sending invoice ${id} in tenant ${tenantId}`);

    // Find the invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${id}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Only DRAFT invoices can be sent
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden enviar facturas en borrador',
      );
    }

    // Update status to SENT
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.SENT,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
        warehouse: true,
      },
    });

    this.logger.log(
      `Invoice sent: ${updatedInvoice.invoiceNumber} (${updatedInvoice.id})`,
    );

    return this.mapToInvoiceResponse(updatedInvoice);
  }

  /**
   * Cancels an invoice, restoring stock and creating return stock movements.
   *
   * @param id - Invoice ID to cancel
   * @returns Updated invoice data
   * @throws NotFoundException if invoice not found
   * @throws BadRequestException if invoice is already cancelled or void
   */
  async cancel(id: string): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const userId = this.getUserIdFromContext();

    this.logger.debug(`Cancelling invoice ${id} in tenant ${tenantId}`);

    // Find the invoice with items
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${id}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Cannot cancel already cancelled or void invoices
    if (
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.VOID
    ) {
      throw new BadRequestException('La factura ya está cancelada o anulada');
    }

    // Cancel within a transaction to restore stock - optimized for parallel operations
    const cancelledInvoice = await this.prisma.$transaction(async (tx) => {
      // Filter items that have productId
      const itemsWithProduct = invoice.items.filter((item) => item.productId);

      // Get default warehouse for stock operations
      const warehouseId = await this.getDefaultWarehouseId(tx, tenantId);

      // Restore stock and create movements in parallel
      await Promise.all([
        // Restore product stock for all items (global)
        ...itemsWithProduct.map((item) =>
          tx.product.update({
            where: { id: item.productId! },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          }),
        ),
        // Restore warehouse stock for all items (per-warehouse)
        ...itemsWithProduct.map((item) =>
          tx.warehouseStock.upsert({
            where: {
              warehouseId_productId: {
                warehouseId,
                productId: item.productId!,
              },
            },
            update: { quantity: { increment: item.quantity } },
            create: {
              tenantId,
              warehouseId,
              productId: item.productId!,
              quantity: item.quantity,
            },
          }),
        ),
        // Create return stock movements for all items
        ...itemsWithProduct.map((item) =>
          tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId!,
              warehouseId,
              userId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: `Cancelación de factura ${invoice.invoiceNumber}`,
              notes: `Devolución por cancelación: ${item.product?.name ?? item.productId}`,
              invoiceId: invoice.id,
            },
          }),
        ),
      ]);

      // Update invoice status to CANCELLED
      return tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
          warehouse: true,
        },
      });
    });

    this.logger.log(
      `Invoice cancelled: ${cancelledInvoice.invoiceNumber} (${cancelledInvoice.id})`,
    );

    return this.mapToInvoiceResponse(cancelledInvoice);
  }

  /**
   * Adds a new item to an existing DRAFT invoice.
   * Validates product exists and has sufficient stock, decrements stock,
   * creates stock movement, and recalculates invoice totals.
   *
   * @param invoiceId - Invoice ID to add item to
   * @param dto - Item data (productId, quantity, unitPrice, taxRate, discount)
   * @param userId - ID of the user performing the action
   * @returns Updated invoice data with all items
   * @throws NotFoundException if invoice or product not found
   * @throws BadRequestException if invoice is not DRAFT or insufficient stock
   */
  async addItem(
    invoiceId: string,
    dto: AddInvoiceItemDto,
    userId: string,
  ): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Adding item to invoice ${invoiceId} in tenant ${tenantId}`,
    );

    // Find the invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${invoiceId}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Only DRAFT invoices can have items added
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden agregar items a facturas en borrador',
      );
    }

    // Validate product exists and has sufficient stock
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Producto no encontrado: ${dto.productId}`);
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente para el producto: ${product.name}`,
      );
    }

    // Calculate item totals
    const subtotal = dto.quantity * dto.unitPrice;
    const taxRate = dto.taxRate ?? 19;
    const discount = dto.discount ?? 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax - discount;

    // Execute within a transaction
    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      // Get default warehouse for stock operations
      const warehouseId = await this.getDefaultWarehouseId(tx, tenantId);

      // Create the invoice item
      await tx.invoiceItem.create({
        data: {
          invoiceId,
          productId: dto.productId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          taxRate,
          discount,
          subtotal,
          tax,
          total,
        },
      });

      await Promise.all([
        // Decrement product stock (global)
        tx.product.update({
          where: { id: dto.productId },
          data: {
            stock: {
              decrement: dto.quantity,
            },
          },
        }),

        // Decrement warehouse stock (per-warehouse)
        tx.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId: dto.productId,
            },
          },
          update: { quantity: { decrement: dto.quantity } },
          create: {
            tenantId,
            warehouseId,
            productId: dto.productId,
            quantity: -dto.quantity,
          },
        }),

        // Create stock movement
        tx.stockMovement.create({
          data: {
            tenantId,
            productId: dto.productId,
            warehouseId,
            userId,
            type: 'SALE',
            quantity: -dto.quantity,
            reason: `Venta - Item agregado a factura ${invoice.invoiceNumber}`,
            notes: `Producto: ${product.name}`,
            invoiceId,
          },
        }),
      ]);

      // Recalculate invoice totals
      const allItems = await tx.invoiceItem.findMany({
        where: { invoiceId },
      });

      const invoiceSubtotal = allItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0,
      );
      const invoiceTax = allItems.reduce(
        (sum, item) => sum + Number(item.tax),
        0,
      );
      const invoiceDiscount = allItems.reduce(
        (sum, item) => sum + Number(item.discount),
        0,
      );
      const invoiceTotal = invoiceSubtotal + invoiceTax - invoiceDiscount;

      // Update invoice totals
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: invoiceSubtotal,
          tax: invoiceTax,
          discount: invoiceDiscount,
          total: invoiceTotal,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
          warehouse: true,
        },
      });
    });

    this.logger.log(
      `Item added to invoice ${invoice.invoiceNumber}: product ${product.name}, qty ${dto.quantity}`,
    );

    return this.mapToInvoiceResponse(updatedInvoice);
  }

  /**
   * Updates an existing item on a DRAFT invoice.
   * Adjusts stock based on quantity difference, creates stock movement,
   * and recalculates invoice totals.
   *
   * @param invoiceId - Invoice ID containing the item
   * @param itemId - Item ID to update
   * @param dto - Update data (quantity, unitPrice, taxRate, discount)
   * @param userId - ID of the user performing the action
   * @returns Updated invoice data with all items
   * @throws NotFoundException if invoice or item not found
   * @throws BadRequestException if invoice is not DRAFT or insufficient stock
   */
  async updateItem(
    invoiceId: string,
    itemId: string,
    dto: UpdateInvoiceItemDto,
    userId: string,
  ): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Updating item ${itemId} on invoice ${invoiceId} in tenant ${tenantId}`,
    );

    // Find the invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${invoiceId}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Only DRAFT invoices can have items updated
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden modificar items de facturas en borrador',
      );
    }

    // Find the item
    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
      include: { product: true },
    });

    if (!item) {
      this.logger.warn(`Invoice item not found: ${itemId}`);
      throw new NotFoundException('Item de factura no encontrado');
    }

    // Get the current quantity and calculate the difference if quantity is being updated
    const oldQuantity = item.quantity;
    const newQuantity = dto.quantity ?? oldQuantity;
    const quantityDiff = newQuantity - oldQuantity;

    // If quantity is increasing, validate sufficient stock
    if (quantityDiff > 0 && item.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (product && product.stock < quantityDiff) {
        throw new BadRequestException(
          `Stock insuficiente para el producto: ${product.name}`,
        );
      }
    }

    // Calculate new item totals
    const unitPrice = dto.unitPrice ?? Number(item.unitPrice);
    const taxRate = dto.taxRate ?? Number(item.taxRate);
    const discount = dto.discount ?? Number(item.discount);
    const subtotal = newQuantity * unitPrice;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax - discount;

    // Execute within a transaction
    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      // Get default warehouse for stock operations
      const warehouseId = await this.getDefaultWarehouseId(tx, tenantId);

      // Update the invoice item
      await tx.invoiceItem.update({
        where: { id: itemId },
        data: {
          quantity: newQuantity,
          unitPrice,
          taxRate,
          discount,
          subtotal,
          tax,
          total,
        },
      });

      // Adjust stock if quantity changed and product exists
      if (quantityDiff !== 0 && item.productId) {
        // If quantity increased, decrement stock by the difference
        // If quantity decreased, increment stock by the absolute difference
        if (quantityDiff > 0) {
          await Promise.all([
            tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: quantityDiff,
                },
              },
            }),
            tx.warehouseStock.upsert({
              where: {
                warehouseId_productId: {
                  warehouseId,
                  productId: item.productId,
                },
              },
              update: { quantity: { decrement: quantityDiff } },
              create: {
                tenantId,
                warehouseId,
                productId: item.productId,
                quantity: -quantityDiff,
              },
            }),
          ]);
        } else {
          await Promise.all([
            tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: Math.abs(quantityDiff),
                },
              },
            }),
            tx.warehouseStock.upsert({
              where: {
                warehouseId_productId: {
                  warehouseId,
                  productId: item.productId,
                },
              },
              update: { quantity: { increment: Math.abs(quantityDiff) } },
              create: {
                tenantId,
                warehouseId,
                productId: item.productId,
                quantity: Math.abs(quantityDiff),
              },
            }),
          ]);
        }

        // Create stock movement for the adjustment
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId,
            userId,
            type: 'ADJUSTMENT',
            quantity: -quantityDiff, // Negative if increased, positive if decreased
            reason: `Ajuste - Modificación de item en factura ${invoice.invoiceNumber}`,
            notes: `Cantidad anterior: ${oldQuantity}, Nueva cantidad: ${newQuantity}`,
            invoiceId,
          },
        });
      }

      // Recalculate invoice totals
      const allItems = await tx.invoiceItem.findMany({
        where: { invoiceId },
      });

      const invoiceSubtotal = allItems.reduce(
        (sum, i) => sum + Number(i.subtotal),
        0,
      );
      const invoiceTax = allItems.reduce((sum, i) => sum + Number(i.tax), 0);
      const invoiceDiscount = allItems.reduce(
        (sum, i) => sum + Number(i.discount),
        0,
      );
      const invoiceTotal = invoiceSubtotal + invoiceTax - invoiceDiscount;

      // Update invoice totals
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: invoiceSubtotal,
          tax: invoiceTax,
          discount: invoiceDiscount,
          total: invoiceTotal,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
          warehouse: true,
        },
      });
    });

    this.logger.log(
      `Item ${itemId} updated on invoice ${invoice.invoiceNumber}`,
    );

    return this.mapToInvoiceResponse(updatedInvoice);
  }

  /**
   * Deletes an item from a DRAFT invoice.
   * Restores product stock, creates stock movement, and recalculates invoice totals.
   *
   * @param invoiceId - Invoice ID containing the item
   * @param itemId - Item ID to delete
   * @param userId - ID of the user performing the action
   * @returns Updated invoice data with remaining items
   * @throws NotFoundException if invoice or item not found
   * @throws BadRequestException if invoice is not DRAFT
   */
  async deleteItem(
    invoiceId: string,
    itemId: string,
    userId: string,
  ): Promise<InvoiceResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Deleting item ${itemId} from invoice ${invoiceId} in tenant ${tenantId}`,
    );

    // Find the invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${invoiceId}`);
      throw new NotFoundException('Factura no encontrada');
    }

    // Only DRAFT invoices can have items deleted
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar items de facturas en borrador',
      );
    }

    // Find the item
    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
      include: { product: true },
    });

    if (!item) {
      this.logger.warn(`Invoice item not found: ${itemId}`);
      throw new NotFoundException('Item de factura no encontrado');
    }

    // Execute within a transaction
    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      // Get default warehouse for stock operations
      const warehouseId = await this.getDefaultWarehouseId(tx, tenantId);

      // Restore product stock if product exists
      if (item.productId) {
        await Promise.all([
          // Restore product stock (global)
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          }),

          // Restore warehouse stock (per-warehouse)
          tx.warehouseStock.upsert({
            where: {
              warehouseId_productId: {
                warehouseId,
                productId: item.productId,
              },
            },
            update: { quantity: { increment: item.quantity } },
            create: {
              tenantId,
              warehouseId,
              productId: item.productId,
              quantity: item.quantity,
            },
          }),

          // Create stock movement for the restoration
          tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId,
              userId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: `Devolución - Item eliminado de factura ${invoice.invoiceNumber}`,
              notes: `Producto: ${item.product?.name ?? item.productId}`,
              invoiceId,
            },
          }),
        ]);
      }

      // Delete the item
      await tx.invoiceItem.delete({
        where: { id: itemId },
      });

      // Recalculate invoice totals
      const remainingItems = await tx.invoiceItem.findMany({
        where: { invoiceId },
      });

      const invoiceSubtotal = remainingItems.reduce(
        (sum, i) => sum + Number(i.subtotal),
        0,
      );
      const invoiceTax = remainingItems.reduce(
        (sum, i) => sum + Number(i.tax),
        0,
      );
      const invoiceDiscount = remainingItems.reduce(
        (sum, i) => sum + Number(i.discount),
        0,
      );
      const invoiceTotal = invoiceSubtotal + invoiceTax - invoiceDiscount;

      // Update invoice totals
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: invoiceSubtotal,
          tax: invoiceTax,
          discount: invoiceDiscount,
          total: invoiceTotal,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
          warehouse: true,
        },
      });
    });

    this.logger.log(
      `Item ${itemId} deleted from invoice ${invoice.invoiceNumber}`,
    );

    return this.mapToInvoiceResponse(updatedInvoice);
  }

  /**
   * Generates a consecutive invoice number unique to the tenant.
   * Format: INV-00001, INV-00002, etc.
   *
   * @returns Generated invoice number
   */
  async generateInvoiceNumber(): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();

    // Get the last invoice number for this tenant
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { tenantId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextNumber = 1;

    if (lastInvoice?.invoiceNumber) {
      // Extract the number from the invoice number (INV-00001 -> 1)
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (5 digits)
    const invoiceNumber = `INV-${nextNumber.toString().padStart(5, '0')}`;

    this.logger.debug(`Generated invoice number: ${invoiceNumber}`);

    return invoiceNumber;
  }

  /**
   * Checks if the tenant has reached their monthly invoice limit.
   *
   * @throws ForbiddenException if monthly limit is reached
   */
  async checkMonthlyLimit(): Promise<void> {
    const tenant = await this.tenantContext.getTenant();

    // -1 means unlimited
    if (tenant.maxInvoices === -1) {
      return;
    }

    // Get count of invoices created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const currentMonthCount = await this.prisma.invoice.count({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: startOfMonth },
      },
    });

    if (currentMonthCount >= tenant.maxInvoices) {
      this.logger.warn(
        `Monthly invoice limit reached for tenant ${tenant.id}: ${currentMonthCount}/${tenant.maxInvoices}`,
      );
      throw new ForbiddenException('Límite mensual de facturas alcanzado');
    }

    this.logger.debug(
      `Invoice limit check passed: ${currentMonthCount}/${tenant.maxInvoices}`,
    );
  }

  /**
   * Validates all products exist and have sufficient stock.
   * Uses a single batched query to avoid N+1 query problem.
   *
   * @param items - Invoice items to validate
   * @param tenantId - Tenant ID
   * @returns Array of validated products in the same order as input items
   * @throws NotFoundException if product not found
   * @throws BadRequestException if insufficient stock
   */
  private async validateProductsAndStock(
    items: { productId: string; quantity: number }[],
    tenantId: string,
  ): Promise<Product[]> {
    // Batch fetch all products in a single query
    const productIds = items.map((i) => i.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
      },
    });

    // Create a map for O(1) lookup
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate each item and build the result array in order
    const validatedProducts: Product[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(
          `Producto no encontrado: ${item.productId}`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto: ${product.name}`,
        );
      }

      validatedProducts.push(product);
    }

    return validatedProducts;
  }

  /**
   * Gets the user ID from the tenant context request.
   * Returns undefined if not available.
   */
  private getUserIdFromContext(): string | undefined {
    try {
      // The user ID should be available from the request context
      // This is a fallback in case it's not passed directly
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Resolves which warehouse should be assigned to an invoice.
   *
   * Priority:
   * 1. If dto.warehouseId is provided (only ADMIN can specify a different warehouse)
   * 2. If the user has an assigned warehouse, use that
   * 3. Fall back to the default warehouse (for ADMIN users without assigned warehouse)
   *
   * @param dtoWarehouseId - Warehouse ID from the request (optional)
   * @param userId - User creating the invoice
   * @param tenantId - Tenant ID
   * @returns Resolved warehouse ID, or null if none can be resolved
   */
  private async resolveWarehouseForInvoice(
    dtoWarehouseId: string | undefined,
    userId: string,
    tenantId: string,
  ): Promise<string | null> {
    // Fetch the user with their assigned warehouse
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { warehouseId: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Non-admin users: MUST use their assigned warehouse
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      if (!user.warehouseId) {
        throw new BadRequestException(
          'No tiene una bodega asignada. Contacte al administrador.',
        );
      }

      // If a warehouseId was provided in the DTO, it must match the user's warehouse
      if (dtoWarehouseId && dtoWarehouseId !== user.warehouseId) {
        throw new ForbiddenException(
          'Solo puede facturar desde su bodega asignada',
        );
      }

      return user.warehouseId;
    }

    // ADMIN users: use dto.warehouseId if provided, else user.warehouseId, else default
    if (dtoWarehouseId) {
      // Validate the warehouse exists and belongs to the tenant
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dtoWarehouseId, tenantId, status: WarehouseStatus.ACTIVE },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Bodega no encontrada o inactiva: ${dtoWarehouseId}`,
        );
      }

      return dtoWarehouseId;
    }

    // Admin with assigned warehouse
    if (user.warehouseId) {
      return user.warehouseId;
    }

    // Admin without warehouse — will use default in transaction
    return null;
  }

  /**
   * Gets the default warehouse ID for a tenant.
   * Returns the main warehouse or the first active warehouse.
   *
   * @param tx - Prisma transaction client
   * @param tenantId - Tenant ID
   * @returns Default warehouse ID
   * @throws BadRequestException if no active warehouses found
   */
  private async getDefaultWarehouseId(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const warehouse =
      (await tx.warehouse.findFirst({
        where: { tenantId, isMain: true, status: WarehouseStatus.ACTIVE },
      })) ??
      (await tx.warehouse.findFirst({
        where: { tenantId, status: WarehouseStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
      }));

    if (!warehouse) {
      throw new BadRequestException(
        'No hay bodegas activas. Cree una bodega primero.',
      );
    }

    return warehouse.id;
  }

  /**
   * Maps an Invoice entity to an InvoiceResponse object.
   *
   * @param invoice - The invoice entity to map (with or without relations)
   * @returns InvoiceResponse object
   */
  private mapToInvoiceResponse(invoice: InvoiceWithRelations): InvoiceResponse {
    const response: InvoiceResponse = {
      id: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      userId: invoice.userId,
      warehouseId: invoice.warehouseId,
      invoiceNumber: invoice.invoiceNumber,
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      discount: Number(invoice.discount),
      total: Number(invoice.total),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      source: invoice.source,
      paymentStatus: invoice.paymentStatus,
      notes: invoice.notes,
      dianCufe: invoice.dianCufe,
      dianXml: invoice.dianXml,
      dianPdf: invoice.dianPdf,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };

    // Map items if included
    if (invoice.items) {
      response.items = invoice.items.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
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
    if (invoice.customer) {
      response.customer = {
        id: invoice.customer.id,
        name: invoice.customer.name,
        email: invoice.customer.email,
        phone: invoice.customer.phone,
      };
    }

    // Map user if included
    if (invoice.user) {
      response.user = {
        id: invoice.user.id,
        name: `${invoice.user.firstName} ${invoice.user.lastName}`,
        email: invoice.user.email,
      };
    }

    // Map warehouse if included
    if (invoice.warehouse) {
      response.warehouse = {
        id: invoice.warehouse.id,
        name: invoice.warehouse.name,
        code: invoice.warehouse.code,
      };
    }

    return response;
  }

  /**
   * Builds a paginated response from invoices and pagination params.
   */
  private buildPaginatedResponse(
    invoices: InvoiceWithRelations[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedInvoicesResponse {
    return {
      data: invoices.map((invoice) => this.mapToInvoiceResponse(invoice)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
