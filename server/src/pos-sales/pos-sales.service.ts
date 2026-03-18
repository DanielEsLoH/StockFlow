import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  POSSale,
  POSSessionStatus,
  InvoiceStatus,
  InvoiceSource,
  PaymentStatus,
  PaymentMethod,
  CashMovementType,
  MovementType,
  TaxCategory,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting/accounting-bridge.service';
import { DianService } from '../dian/dian.service';
import { CreateSaleDto, SaleItemDto, SalePaymentDto, CreatePartialReturnDto } from './dto';

/**
 * Sale payment response
 */
export interface SalePaymentResponse {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  cardLastFour: string | null;
  createdAt: Date;
}

/**
 * Sale response with basic info
 */
export interface POSSaleResponse {
  id: string;
  tenantId: string;
  sessionId: string;
  invoiceId: string;
  saleNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: Date;
}

/**
 * Sale with full details
 */
export interface POSSaleWithDetails extends POSSaleResponse {
  invoice: {
    id: string;
    invoiceNumber: string;
    customer: {
      id: string;
      name: string;
      documentNumber: string;
    } | null;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
      subtotal: number;
      tax: number;
      total: number;
    }>;
  };
  payments: SalePaymentResponse[];
  session: {
    id: string;
    cashRegister: {
      id: string;
      name: string;
      code: string;
    };
  };
}

/**
 * Paginated sales response
 */
export interface PaginatedSalesResponse {
  data: POSSaleWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * POSSalesService handles all POS sale operations including:
 * - Creating sales with split payments
 * - Voiding sales
 * - Listing sales
 */
@Injectable()
export class POSSalesService {
  private readonly logger = new Logger(POSSalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly accountingBridge: AccountingBridgeService,
    private readonly dianService: DianService,
  ) {}

  /**
   * Creates a new POS sale with split payment support.
   * This creates an invoice, processes payments, and updates inventory.
   */
  async createSale(
    dto: CreateSaleDto,
    userId: string,
  ): Promise<POSSaleWithDetails> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Creating POS sale by user ${userId}`);

    // Get user's active session
    const session = await this.prisma.pOSSession.findFirst({
      where: {
        tenantId,
        userId,
        status: POSSessionStatus.ACTIVE,
      },
      include: {
        cashRegister: {
          select: { id: true, name: true, code: true, warehouseId: true },
        },
      },
    });

    if (!session) {
      throw new BadRequestException(
        'No active POS session found. Please open a session first.',
      );
    }

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }
    }

    // Validate and get products with prices
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Products not found: ${missingIds.join(', ')}`,
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate totals
    const { subtotal, tax, discount, total, calculatedItems } =
      this.calculateTotals(dto.items, productMap, dto.discountPercent);

    // Validate payments total matches sale total
    const paymentsTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentsTotal - total) > 0.01) {
      throw new BadRequestException(
        `Payment total (${paymentsTotal}) does not match sale total (${total})`,
      );
    }

    // Check stock availability (warehouse-specific if available)
    const warehouseId = session.cashRegister.warehouseId;
    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      if (warehouseId) {
        const warehouseStockRecord = await this.prisma.warehouseStock.findUnique({
          where: {
            warehouseId_productId: { warehouseId, productId: item.productId },
          },
        });
        const available = warehouseStockRecord?.quantity ?? 0;
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}" in warehouse. Available: ${available}, Requested: ${item.quantity}`,
          );
        }
      } else if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // Create everything in a transaction (retry on unique constraint conflicts)
    const MAX_RETRIES = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
    const sale = await this.prisma.$transaction(async (tx) => {
      // Generate sale number
      const saleNumber = await this.generateSaleNumber(tx, tenantId);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tx, tenantId);

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          customerId: dto.customerId || null,
          userId,
          invoiceNumber,
          source: InvoiceSource.POS, // Mark as POS sale
          subtotal,
          tax,
          discount,
          total,
          status: InvoiceStatus.SENT, // POS sales are immediately sent
          paymentStatus: PaymentStatus.PAID, // POS sales are paid immediately
          notes: dto.notes,
          issueDate: new Date(),
          items: {
            create: calculatedItems.map((item) => ({
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
          },
        },
        include: {
          customer: {
            select: { id: true, name: true, documentNumber: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      });

      // Create POS sale
      const posSale = await tx.pOSSale.create({
        data: {
          tenantId,
          sessionId: session.id,
          invoiceId: invoice.id,
          saleNumber,
          subtotal,
          tax,
          discount,
          total,
        },
      });

      // Create sale payments
      const salePayments = await Promise.all(
        dto.payments.map((payment) =>
          tx.salePayment.create({
            data: {
              saleId: posSale.id,
              method: payment.method,
              amount: payment.amount,
              reference: payment.reference,
              cardLastFour: payment.cardLastFour,
            },
          }),
        ),
      );

      // Execute all payment and stock operations in parallel for better performance
      const warehouseId = session.cashRegister.warehouseId;

      await Promise.all([
        // Create invoice payments (for compatibility with existing payment tracking)
        ...dto.payments.map((payment) =>
          tx.payment.create({
            data: {
              tenantId,
              invoiceId: invoice.id,
              amount: payment.amount,
              method: payment.method,
              reference: payment.reference,
              paymentDate: new Date(),
            },
          }),
        ),

        // Create cash register movements only for CASH payments (card payments don't affect cash drawer)
        ...dto.payments
          .filter((payment) => payment.method === 'CASH')
          .map((payment) =>
            tx.cashRegisterMovement.create({
              data: {
                tenantId,
                sessionId: session.id,
                saleId: posSale.id,
                type: CashMovementType.SALE,
                amount: payment.amount,
                method: payment.method,
                reference: payment.reference,
              },
            }),
          ),

        // Decrement product stock for all items
        ...dto.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          }),
        ),

        // Update warehouse stock for all items (if applicable)
        ...(warehouseId
          ? dto.items.map((item) =>
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
            )
          : []),

        // Create stock movements for all items
        ...dto.items.map((item) =>
          tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId,
              userId,
              type: MovementType.SALE,
              quantity: -item.quantity,
              reason: `POS Sale ${saleNumber}`,
              invoiceId: invoice.id,
            },
          }),
        ),
      ]);

      return {
        ...posSale,
        invoice,
        payments: salePayments,
        session: {
          id: session.id,
          cashRegister: session.cashRegister,
        },
      };
    });

    this.logger.log(`POS sale created: ${sale.saleNumber} - Total: ${total}`);

    // Generate accounting journal entries for the POS sale (fire-and-forget)
    try {
      await this.accountingBridge.onInvoiceCreated({
        tenantId,
        invoiceId: sale.invoice.id,
        invoiceNumber: sale.invoice.invoiceNumber,
        subtotal,
        tax,
        total,
        items: dto.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          product: { costPrice: productMap.get(item.productId)?.costPrice ?? 0 },
        })),
        isPosImmediate: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create accounting entries for POS sale ${sale.saleNumber}: ${error}`,
      );
    }

    // Transmit documento equivalente to DIAN (fire-and-forget)
    this.dianService
      .processPOSSale({ invoiceId: sale.invoice.id })
      .then((result) => {
        if (result.success) {
          this.logger.log(
            `DIAN: POS sale ${sale.saleNumber} transmitted successfully (trackId: ${result.trackId})`,
          );
        } else {
          this.logger.warn(
            `DIAN: POS sale ${sale.saleNumber} transmission failed: ${result.message}`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(
          `DIAN: Failed to transmit POS sale ${sale.saleNumber}: ${error}`,
        );
      });

    return this.buildSaleWithDetails(sale);
      } catch (error) {
        lastError = error;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < MAX_RETRIES - 1
        ) {
          this.logger.warn(
            `Sale creation unique conflict (attempt ${attempt + 1}), retrying...`,
          );
          continue;
        }
        throw error;
      }
    }

    // This should never be reached, but satisfies TypeScript
    throw lastError;
  }

  /**
   * Voids a POS sale (reverses all operations).
   */
  async voidSale(
    saleId: string,
    userId: string,
    reason: string,
  ): Promise<POSSaleWithDetails> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Voiding sale ${saleId}`);

    // Find the sale
    const sale = await this.prisma.pOSSale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        invoice: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customer: {
              select: { id: true, name: true, documentNumber: true },
            },
          },
        },
        payments: true,
        session: {
          include: {
            cashRegister: {
              select: { id: true, name: true, code: true, warehouseId: true },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    // Check if invoice is already voided/cancelled
    if (
      sale.invoice.status === InvoiceStatus.VOID ||
      sale.invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new BadRequestException('This sale has already been voided');
    }

    // Check if the session is still active (can only void in active sessions)
    if (sale.session.status !== POSSessionStatus.ACTIVE) {
      // Check if user is admin/manager
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { role: true },
      });

      if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
        throw new ForbiddenException(
          'Only managers and admins can void sales from closed sessions',
        );
      }
    }

    // Void in a transaction - optimized to use Promise.all for parallel operations
    const voidedSale = await this.prisma.$transaction(async (tx) => {
      // Prepare items that need stock restoration (filter once)
      const itemsWithProductId = sale.invoice.items.filter(
        (item: any) => item.productId,
      );
      const warehouseId = sale.session.cashRegister.warehouseId;

      // Execute all independent operations in parallel
      await Promise.all([
        // Update invoice status
        tx.invoice.update({
          where: { id: sale.invoiceId },
          data: {
            status: InvoiceStatus.VOID,
            paymentStatus: PaymentStatus.UNPAID,
            notes: `${sale.invoice.notes || ''}\nVOIDED: ${reason}`.trim(),
          },
        }),

        // Create refund movements for all payments in parallel
        ...sale.payments.map((payment: any) =>
          tx.cashRegisterMovement.create({
            data: {
              tenantId,
              sessionId: sale.sessionId,
              saleId: sale.id,
              type: CashMovementType.REFUND,
              amount: payment.amount,
              method: payment.method,
              notes: `Refund for voided sale: ${reason}`,
            },
          }),
        ),

        // Restore product stock for all items in parallel
        ...itemsWithProductId.map((item: any) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        ),

        // Update warehouse stock for all items in parallel (if applicable)
        ...(warehouseId
          ? itemsWithProductId.map((item: any) =>
              tx.warehouseStock.update({
                where: {
                  warehouseId_productId: {
                    warehouseId,
                    productId: item.productId,
                  },
                },
                data: { quantity: { increment: item.quantity } },
              }),
            )
          : []),

        // Create return movements for all items in parallel
        ...itemsWithProductId.map((item: any) =>
          tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId,
              userId,
              type: MovementType.RETURN,
              quantity: item.quantity,
              reason: `Voided POS Sale ${sale.saleNumber}: ${reason}`,
              invoiceId: sale.invoiceId,
            },
          }),
        ),
      ]);

      // Return updated sale
      return tx.pOSSale.findFirst({
        where: { id: saleId },
        include: {
          invoice: {
            include: {
              items: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true },
                  },
                },
              },
              customer: {
                select: { id: true, name: true, documentNumber: true },
              },
            },
          },
          payments: true,
          session: {
            include: {
              cashRegister: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      });
    });

    this.logger.log(`Sale voided: ${sale.saleNumber}`);

    return this.buildSaleWithDetails(voidedSale!);
  }

  /**
   * Processes a partial return for a POS sale.
   * Returns selected items (full or partial quantity), restores stock,
   * creates refund cash movements, and generates accounting reversal entries.
   */
  async partialReturn(
    saleId: string,
    dto: CreatePartialReturnDto,
    userId: string,
  ): Promise<POSSaleWithDetails> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Processing partial return for sale ${saleId}`);

    // Find the sale with all details
    const sale = await this.prisma.pOSSale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        invoice: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customer: {
              select: { id: true, name: true, documentNumber: true },
            },
          },
        },
        payments: true,
        session: {
          include: {
            cashRegister: {
              select: { id: true, name: true, code: true, warehouseId: true },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    // Validate sale is not already voided
    if (
      sale.invoice.status === InvoiceStatus.VOID ||
      sale.invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot return items from a voided or cancelled sale');
    }

    // Build a map of invoice items for quick lookup
    const invoiceItemMap = new Map(
      sale.invoice.items.map((item: any) => [item.id, item]),
    );

    // Validate all return items exist in the sale
    for (const returnItem of dto.items) {
      const invoiceItem = invoiceItemMap.get(returnItem.invoiceItemId);
      if (!invoiceItem) {
        throw new BadRequestException(
          `Invoice item ${returnItem.invoiceItemId} not found in sale ${sale.saleNumber}`,
        );
      }
    }

    // Query already-returned quantities for this invoice (via RETURN stock movements)
    const existingReturns = await this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        invoiceId: sale.invoiceId,
        type: MovementType.RETURN,
      },
      select: { productId: true, quantity: true },
    });

    // Aggregate returned quantities per product
    const returnedByProduct = new Map<string, number>();
    for (const ret of existingReturns) {
      if (ret.productId) {
        const current = returnedByProduct.get(ret.productId) ?? 0;
        returnedByProduct.set(ret.productId, current + ret.quantity);
      }
    }

    // Validate quantities and calculate refund totals
    let refundSubtotal = 0;
    let refundTax = 0;
    let refundTotal = 0;

    const validatedItems: Array<{
      invoiceItem: any;
      returnQuantity: number;
      reason: string | undefined;
      itemRefundSubtotal: number;
      itemRefundTax: number;
      itemRefundTotal: number;
    }> = [];

    for (const returnItem of dto.items) {
      const invoiceItem = invoiceItemMap.get(returnItem.invoiceItemId)!;
      const alreadyReturned = invoiceItem.productId
        ? (returnedByProduct.get(invoiceItem.productId) ?? 0)
        : 0;
      const availableToReturn = invoiceItem.quantity - alreadyReturned;

      if (returnItem.quantity > availableToReturn) {
        const productName = invoiceItem.product?.name ?? 'Unknown';
        throw new BadRequestException(
          `Cannot return ${returnItem.quantity} units of "${productName}". ` +
          `Original: ${invoiceItem.quantity}, already returned: ${alreadyReturned}, available: ${availableToReturn}`,
        );
      }

      // Calculate proportional refund for this item
      const pricePerUnit = Number(invoiceItem.subtotal) / invoiceItem.quantity;
      const taxPerUnit = Number(invoiceItem.tax) / invoiceItem.quantity;
      const totalPerUnit = Number(invoiceItem.total) / invoiceItem.quantity;

      const itemRefundSubtotal = Math.round(pricePerUnit * returnItem.quantity * 100) / 100;
      const itemRefundTax = Math.round(taxPerUnit * returnItem.quantity * 100) / 100;
      const itemRefundTotal = Math.round(totalPerUnit * returnItem.quantity * 100) / 100;

      refundSubtotal += itemRefundSubtotal;
      refundTax += itemRefundTax;
      refundTotal += itemRefundTotal;

      validatedItems.push({
        invoiceItem,
        returnQuantity: returnItem.quantity,
        reason: returnItem.reason,
        itemRefundSubtotal,
        itemRefundTax,
        itemRefundTotal,
      });
    }

    // Validate refund payments total matches the calculated refund total
    const paymentsTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentsTotal - refundTotal) > 0.01) {
      throw new BadRequestException(
        `Refund payments total (${paymentsTotal}) does not match calculated refund (${refundTotal})`,
      );
    }

    // Process the return in a transaction
    const warehouseId = sale.session.cashRegister.warehouseId;

    await this.prisma.$transaction(async (tx) => {
      await Promise.all([
        // Create refund cash register movements (only CASH refunds affect the drawer)
        ...dto.payments
          .filter((p) => p.method === 'CASH')
          .map((payment) =>
            tx.cashRegisterMovement.create({
              data: {
                tenantId,
                sessionId: sale.sessionId,
                saleId: sale.id,
                type: CashMovementType.REFUND,
                amount: payment.amount,
                method: payment.method,
                reference: payment.reference,
                notes: `Devolución parcial: ${dto.reason ?? 'Sin motivo'}`,
              },
            }),
          ),

        // Restore product stock for returned items
        ...validatedItems
          .filter((v) => v.invoiceItem.productId)
          .map((v) =>
            tx.product.update({
              where: { id: v.invoiceItem.productId },
              data: { stock: { increment: v.returnQuantity } },
            }),
          ),

        // Restore warehouse stock (if applicable)
        ...(warehouseId
          ? validatedItems
              .filter((v) => v.invoiceItem.productId)
              .map((v) =>
                tx.warehouseStock.update({
                  where: {
                    warehouseId_productId: {
                      warehouseId,
                      productId: v.invoiceItem.productId,
                    },
                  },
                  data: { quantity: { increment: v.returnQuantity } },
                }),
              )
          : []),

        // Create return stock movements
        ...validatedItems
          .filter((v) => v.invoiceItem.productId)
          .map((v) =>
            tx.stockMovement.create({
              data: {
                tenantId,
                productId: v.invoiceItem.productId,
                warehouseId,
                userId,
                type: MovementType.RETURN,
                quantity: v.returnQuantity,
                reason: `Devolución parcial POS ${sale.saleNumber}: ${v.reason ?? dto.reason ?? 'Sin motivo'}`,
                invoiceId: sale.invoiceId,
              },
            }),
          ),
      ]);
    });

    this.logger.log(
      `Partial return processed for sale ${sale.saleNumber}: ${validatedItems.length} items, refund $${refundTotal}`,
    );

    // Generate accounting reversal entry (fire-and-forget)
    try {
      await this.accountingBridge.onInvoiceCancelled({
        tenantId,
        invoiceId: sale.invoiceId,
        invoiceNumber: sale.invoice.invoiceNumber,
        subtotal: refundSubtotal,
        tax: refundTax,
        total: refundTotal,
        items: validatedItems.map((v) => ({
          productId: v.invoiceItem.productId,
          quantity: v.returnQuantity,
          product: v.invoiceItem.product,
        })),
        isPosImmediate: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create accounting entries for partial return on sale ${sale.saleNumber}: ${error}`,
      );
    }

    // Return updated sale details
    return this.findOne(saleId);
  }

  /**
   * Gets a sale by ID with full details.
   */
  async findOne(saleId: string): Promise<POSSaleWithDetails> {
    const tenantId = this.tenantContext.requireTenantId();

    const sale = await this.prisma.pOSSale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        invoice: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
            customer: {
              select: { id: true, name: true, documentNumber: true },
            },
          },
        },
        payments: true,
        session: {
          include: {
            cashRegister: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    return this.buildSaleWithDetails(sale);
  }

  /**
   * Lists sales with pagination and filters.
   */
  async findAll(
    page = 1,
    limit = 10,
    sessionId?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<PaginatedSalesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    const where: Prisma.POSSaleWhereInput = {
      tenantId,
      ...(sessionId && { sessionId }),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [sales, total] = await Promise.all([
      this.prisma.pOSSale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            include: {
              items: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true },
                  },
                },
              },
              customer: {
                select: { id: true, name: true, documentNumber: true },
              },
            },
          },
          payments: true,
          session: {
            include: {
              cashRegister: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      }),
      this.prisma.pOSSale.count({ where }),
    ]);

    return {
      data: sales.map((s) => this.buildSaleWithDetails(s)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Calculates totals for a sale.
   */
  private calculateTotals(
    items: SaleItemDto[],
    productMap: Map<string, any>,
    globalDiscountPercent?: number,
  ): {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    calculatedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      taxCategory: TaxCategory;
      discount: number;
      subtotal: number;
      tax: number;
      total: number;
    }>;
  } {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const calculatedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      taxCategory: TaxCategory;
      discount: number;
      subtotal: number;
      tax: number;
      total: number;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      const unitPrice = item.unitPrice ?? Number(product.salePrice);
      const taxRate = item.taxRate ?? Number(product.taxRate);
      const itemSubtotal = unitPrice * item.quantity;

      // Calculate item discount
      const discountPercent = item.discountPercent ?? 0;
      const itemDiscount = itemSubtotal * (discountPercent / 100);
      const subtotalAfterDiscount = itemSubtotal - itemDiscount;

      // Calculate tax on discounted amount
      const itemTax = subtotalAfterDiscount * (taxRate / 100);
      const itemTotal = subtotalAfterDiscount + itemTax;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;

      calculatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        taxRate,
        taxCategory: product.taxCategory ?? TaxCategory.GRAVADO_19,
        discount: itemDiscount,
        subtotal: subtotalAfterDiscount,
        tax: itemTax,
        total: itemTotal,
      });
    }

    // Apply global discount
    if (globalDiscountPercent && globalDiscountPercent > 0) {
      const globalDiscount =
        (subtotal - totalDiscount) * (globalDiscountPercent / 100);
      totalDiscount += globalDiscount;

      // Recalculate tax proportionally after global discount
      const subtotalAfterAllDiscounts = subtotal - totalDiscount;
      const proportionRemaining =
        subtotal > 0 ? subtotalAfterAllDiscounts / subtotal : 0;
      totalTax = totalTax * proportionRemaining;
    }

    const total = subtotal - totalDiscount + totalTax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(totalTax * 100) / 100,
      discount: Math.round(totalDiscount * 100) / 100,
      total: Math.round(total * 100) / 100,
      calculatedItems,
    };
  }

  /**
   * Generates a unique sale number.
   */
  private async generateSaleNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    // Use raw SQL to find the max sale number in POS-NNNNN format only.
    // Seed data uses POS-TD-XXXX, POS-NN-XXXX etc. which must be excluded.
    const result: Array<{ max_num: bigint | null }> = await tx.$queryRaw`
      SELECT MAX(CAST(SUBSTRING("sale_number" FROM 'POS-([0-9]+)') AS INTEGER)) as max_num
      FROM "pos_sales"
      WHERE "tenant_id" = ${tenantId}
      AND "sale_number" ~ '^POS-[0-9]+$'
    `;

    const nextNumber = Number(result[0]?.max_num ?? 0) + 1;
    return `POS-${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Generates a unique invoice number.
   */
  private async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const lastInvoice = await tx.invoice.findFirst({
      where: { tenantId, invoiceNumber: { startsWith: 'INV-' } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextNumber = 1;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `INV-${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Builds a sale response with full details.
   */
  private buildSaleWithDetails(
    sale: POSSale & {
      invoice: any;
      payments: any[];
      session: any;
    },
  ): POSSaleWithDetails {
    return {
      id: sale.id,
      tenantId: sale.tenantId,
      sessionId: sale.sessionId,
      invoiceId: sale.invoiceId,
      saleNumber: sale.saleNumber,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      discount: Number(sale.discount),
      total: Number(sale.total),
      createdAt: sale.createdAt,
      invoice: {
        id: sale.invoice.id,
        invoiceNumber: sale.invoice.invoiceNumber,
        customer: sale.invoice.customer,
        items: sale.invoice.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Unknown',
          productSku: item.product?.sku || 'N/A',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          discount: Number(item.discount),
          subtotal: Number(item.subtotal),
          tax: Number(item.tax),
          total: Number(item.total),
        })),
      },
      payments: sale.payments.map((p: any) => ({
        id: p.id,
        method: p.method,
        amount: Number(p.amount),
        reference: p.reference,
        cardLastFour: p.cardLastFour,
        createdAt: p.createdAt,
      })),
      session: {
        id: sale.session.id,
        cashRegister: sale.session.cashRegister,
      },
    };
  }
}
