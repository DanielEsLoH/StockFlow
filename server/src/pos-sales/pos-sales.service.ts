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
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateSaleDto, SaleItemDto, SalePaymentDto } from './dto';

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
  ) {}

  /**
   * Creates a new POS sale with split payment support.
   * This creates an invoice, processes payments, and updates inventory.
   */
  async createSale(dto: CreateSaleDto, userId: string): Promise<POSSaleWithDetails> {
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
        throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
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
    const { subtotal, tax, discount, total, calculatedItems } = this.calculateTotals(
      dto.items,
      productMap,
      dto.discountPercent,
    );

    // Validate payments total matches sale total
    const paymentsTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentsTotal - total) > 0.01) {
      throw new BadRequestException(
        `Payment total (${paymentsTotal}) does not match sale total (${total})`,
      );
    }

    // Check stock availability
    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // Create everything in a transaction
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

      // Create invoice payments (for compatibility with existing payment tracking)
      await Promise.all(
        dto.payments.map((payment) =>
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
      );

      // Create cash register movements for each payment
      for (const payment of dto.payments) {
        await tx.cashRegisterMovement.create({
          data: {
            tenantId,
            sessionId: session.id,
            saleId: posSale.id,
            type: CashMovementType.SALE,
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
          },
        });
      }

      // Update product stock and create stock movements
      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;

        // Decrement stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Update warehouse stock if applicable
        if (session.cashRegister.warehouseId) {
          await tx.warehouseStock.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: session.cashRegister.warehouseId,
                productId: item.productId,
              },
            },
            update: { quantity: { decrement: item.quantity } },
            create: {
              tenantId,
              warehouseId: session.cashRegister.warehouseId,
              productId: item.productId,
              quantity: -item.quantity, // Will be negative if not exists
            },
          });
        }

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: session.cashRegister.warehouseId,
            userId,
            type: MovementType.SALE,
            quantity: -item.quantity,
            reason: `POS Sale ${saleNumber}`,
            invoiceId: invoice.id,
          },
        });
      }

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

    return this.buildSaleWithDetails(sale);
  }

  /**
   * Voids a POS sale (reverses all operations).
   */
  async voidSale(saleId: string, userId: string, reason: string): Promise<POSSaleWithDetails> {
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

    // Void in a transaction
    const voidedSale = await this.prisma.$transaction(async (tx) => {
      // Update invoice status
      await tx.invoice.update({
        where: { id: sale.invoiceId },
        data: {
          status: InvoiceStatus.VOID,
          paymentStatus: PaymentStatus.UNPAID,
          notes: `${sale.invoice.notes || ''}\nVOIDED: ${reason}`.trim(),
        },
      });

      // Create refund movements
      for (const payment of sale.payments) {
        await tx.cashRegisterMovement.create({
          data: {
            tenantId,
            sessionId: sale.sessionId,
            saleId: sale.id,
            type: CashMovementType.REFUND,
            amount: payment.amount,
            method: payment.method,
            notes: `Refund for voided sale: ${reason}`,
          },
        });
      }

      // Restore product stock
      for (const item of sale.invoice.items) {
        if (!item.productId) continue;

        // Increment stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        // Update warehouse stock
        if (sale.session.cashRegister.warehouseId) {
          await tx.warehouseStock.update({
            where: {
              warehouseId_productId: {
                warehouseId: sale.session.cashRegister.warehouseId,
                productId: item.productId,
              },
            },
            data: { quantity: { increment: item.quantity } },
          });
        }

        // Create return movement
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: sale.session.cashRegister.warehouseId,
            userId,
            type: MovementType.RETURN,
            quantity: item.quantity,
            reason: `Voided POS Sale ${sale.saleNumber}: ${reason}`,
            invoiceId: sale.invoiceId,
          },
        });
      }

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
      discount: number;
      subtotal: number;
      tax: number;
      total: number;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      const unitPrice = item.unitPrice ?? Number(product.salePrice);
      const taxRate = Number(product.taxRate);
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
        discount: itemDiscount,
        subtotal: subtotalAfterDiscount,
        tax: itemTax,
        total: itemTotal,
      });
    }

    // Apply global discount
    if (globalDiscountPercent && globalDiscountPercent > 0) {
      const globalDiscount = (subtotal - totalDiscount) * (globalDiscountPercent / 100);
      totalDiscount += globalDiscount;

      // Recalculate tax after global discount
      const subtotalAfterAllDiscounts = subtotal - totalDiscount;
      // Note: This is simplified. In practice, you might want to recalculate per item.
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
    const lastSale = await tx.pOSSale.findFirst({
      where: { tenantId },
      orderBy: { saleNumber: 'desc' },
      select: { saleNumber: true },
    });

    let nextNumber = 1;
    if (lastSale?.saleNumber) {
      const match = lastSale.saleNumber.match(/POS-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

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
      where: { tenantId },
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
