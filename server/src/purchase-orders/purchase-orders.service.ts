import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  MovementType,
  Prisma,
  Supplier,
  User,
  Product,
  Warehouse,
  StockMovement,
  TaxCategory,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  FilterPurchaseOrdersDto,
} from './dto';

/**
 * Purchase order item data returned in responses
 */
export interface PurchaseOrderItemResponse {
  id: string;
  purchaseOrderId: string;
  productId: string;
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
    costPrice: number;
  } | null;
}

/**
 * Purchase order data returned in responses
 */
export interface PurchaseOrderResponse {
  id: string;
  tenantId: string;
  supplierId: string;
  userId: string | null;
  warehouseId: string;
  purchaseOrderNumber: string;
  status: PurchaseOrderStatus;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  issueDate: Date;
  expectedDeliveryDate: Date | null;
  receivedDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: PurchaseOrderItemResponse[];
  supplier?: {
    id: string;
    name: string;
    documentNumber: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
  movements?: StockMovement[];
  _count?: {
    items: number;
  };
}

/**
 * Paginated response for purchase order list endpoints
 */
export interface PaginatedPurchaseOrdersResponse {
  data: PurchaseOrderResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Purchase order with relations for internal use
 */
type PurchaseOrderWithRelations = PurchaseOrder & {
  items?: (PurchaseOrderItem & { product?: Product | null })[];
  supplier?: Supplier | null;
  user?: User | null;
  warehouse?: Warehouse | null;
  movements?: StockMovement[];
  _count?: { items: number };
};

/**
 * PurchaseOrdersService handles all purchase order management operations including
 * CRUD operations, status transitions (DRAFT -> SENT -> CONFIRMED -> RECEIVED),
 * and the critical receive flow that creates stock movements and updates product costs,
 * all with multi-tenant isolation.
 *
 * Purchase orders represent inbound goods from suppliers. The receive flow is the
 * most important business operation: it atomically creates stock movements,
 * updates warehouse stock, and updates product cost prices.
 */
@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Creates a new purchase order within the current tenant.
   * Validates supplier, warehouse, and products, calculates totals,
   * and generates a sequential purchase order number inside a transaction.
   *
   * @param dto - Purchase order creation data
   * @param userId - ID of the user creating the purchase order
   * @returns Created purchase order data with relations
   * @throws NotFoundException if supplier, warehouse, or product not found
   */
  async create(
    dto: CreatePurchaseOrderDto,
    userId: string,
  ): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating purchase order for tenant ${tenantId} by user ${userId}`,
    );

    // Validate supplier exists and belongs to tenant
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Validate warehouse exists and belongs to tenant
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException('Bodega no encontrada');
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

    // Calculate purchase order totals
    const poSubtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    const poTax = itemsData.reduce((sum, item) => sum + item.tax, 0);
    const poDiscount = itemsData.reduce(
      (sum, item) => sum + item.discount,
      0,
    );
    const poTotal = poSubtotal + poTax - poDiscount;

    // Create purchase order within a transaction
    const purchaseOrder = await this.prisma.$transaction(async (tx) => {
      const purchaseOrderNumber = await this.generatePurchaseOrderNumber(tx);

      const newPurchaseOrder = await tx.purchaseOrder.create({
        data: {
          tenantId,
          userId,
          supplierId: dto.supplierId,
          warehouseId: dto.warehouseId,
          purchaseOrderNumber,
          subtotal: poSubtotal,
          tax: poTax,
          discount: poDiscount,
          total: poTotal,
          issueDate: new Date(),
          expectedDeliveryDate: dto.expectedDeliveryDate ?? null,
          status: PurchaseOrderStatus.DRAFT,
          notes: dto.notes ?? null,
        },
      });

      // Create purchase order items
      await tx.purchaseOrderItem.createMany({
        data: itemsData.map((item) => ({
          purchaseOrderId: newPurchaseOrder.id,
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

      // Fetch the complete purchase order with relations
      return tx.purchaseOrder.findUnique({
        where: { id: newPurchaseOrder.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
          user: true,
          warehouse: true,
        },
      });
    });

    if (!purchaseOrder) {
      throw new BadRequestException('Error al crear la orden de compra');
    }

    this.logger.log(
      `Purchase order created: ${purchaseOrder.purchaseOrderNumber} (${purchaseOrder.id})`,
    );

    return this.mapToResponse(purchaseOrder);
  }

  /**
   * Lists all purchase orders within the current tenant with filtering and pagination.
   * Supports search by purchase order number and supplier name.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of purchase orders
   */
  async findAll(
    filters: FilterPurchaseOrdersDto = {},
  ): Promise<PaginatedPurchaseOrdersResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      status,
      supplierId,
      warehouseId,
      fromDate,
      toDate,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing purchase orders for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.PurchaseOrderWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
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

    // Search in purchase order number and supplier name
    if (search) {
      where.OR = [
        {
          purchaseOrderNumber: { contains: search, mode: 'insensitive' },
        },
        {
          supplier: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [purchaseOrders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              documentNumber: true,
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
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: purchaseOrders.map((po) =>
        this.mapToResponse(po as PurchaseOrderWithRelations),
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
   * Finds a single purchase order by ID within the current tenant.
   * Includes all items with product relations, supplier, user, warehouse,
   * and stock movements.
   *
   * @param id - Purchase order ID
   * @returns Purchase order data with full relations
   * @throws NotFoundException if purchase order not found
   */
  async findOne(id: string): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding purchase order ${id} in tenant ${tenantId}`);

    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        user: true,
        warehouse: true,
        movements: true,
      },
    });

    if (!purchaseOrder) {
      this.logger.warn(`Purchase order not found: ${id}`);
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return this.mapToResponse(purchaseOrder);
  }

  /**
   * Updates an existing purchase order.
   * Only DRAFT purchase orders can be updated.
   * Supports updating supplier, warehouse, items, dates, and notes.
   *
   * @param id - Purchase order ID to update
   * @param dto - Update data
   * @returns Updated purchase order data
   * @throws NotFoundException if purchase order not found
   * @throws ConflictException if purchase order is not in DRAFT status
   */
  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating purchase order ${id} in tenant ${tenantId}`);

    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!purchaseOrder) {
      this.logger.warn(`Purchase order not found: ${id}`);
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException(
        'Solo se pueden editar ordenes de compra en estado borrador',
      );
    }

    // Build update data
    const updateData: Prisma.PurchaseOrderUpdateInput = {};

    if (dto.supplierId !== undefined) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });

      if (!supplier) {
        throw new NotFoundException('Proveedor no encontrado');
      }

      updateData.supplier = { connect: { id: dto.supplierId } };
    }

    if (dto.warehouseId !== undefined) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
      });

      if (!warehouse) {
        throw new NotFoundException('Bodega no encontrada');
      }

      updateData.warehouse = { connect: { id: dto.warehouseId } };
    }

    if (dto.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = dto.expectedDeliveryDate;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // If items are provided, recalculate totals
    if (dto.items !== undefined) {
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

      const poSubtotal = itemsData.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );
      const poTax = itemsData.reduce((sum, item) => sum + item.tax, 0);
      const poDiscount = itemsData.reduce(
        (sum, item) => sum + item.discount,
        0,
      );
      const poTotal = poSubtotal + poTax - poDiscount;

      updateData.subtotal = poSubtotal;
      updateData.tax = poTax;
      updateData.discount = poDiscount;
      updateData.total = poTotal;

      // Replace items: delete existing, create new
      updateData.items = {
        deleteMany: {},
        createMany: {
          data: itemsData.map((item) => ({
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
      };
    }

    const updatedPurchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        user: true,
        warehouse: true,
      },
    });

    this.logger.log(
      `Purchase order updated: ${updatedPurchaseOrder.purchaseOrderNumber} (${updatedPurchaseOrder.id})`,
    );

    return this.mapToResponse(updatedPurchaseOrder);
  }

  /**
   * Deletes a purchase order from the tenant.
   * Only DRAFT purchase orders can be deleted. Items are cascade-deleted.
   *
   * @param id - Purchase order ID to delete
   * @throws NotFoundException if purchase order not found
   * @throws ConflictException if purchase order is not in DRAFT status
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting purchase order ${id} in tenant ${tenantId}`);

    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!purchaseOrder) {
      this.logger.warn(`Purchase order not found: ${id}`);
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException(
        'Solo se pueden eliminar ordenes de compra en estado borrador',
      );
    }

    await this.prisma.purchaseOrder.delete({ where: { id } });

    this.logger.log(
      `Purchase order deleted: ${purchaseOrder.purchaseOrderNumber} (${purchaseOrder.id})`,
    );
  }

  /**
   * Sends a purchase order (changes status from DRAFT to SENT).
   *
   * @param id - Purchase order ID to send
   * @returns Updated purchase order data
   * @throws NotFoundException if purchase order not found
   * @throws ConflictException if purchase order is not in DRAFT status
   */
  async send(id: string): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Sending purchase order ${id} in tenant ${tenantId}`);

    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!purchaseOrder) {
      this.logger.warn(`Purchase order not found: ${id}`);
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException(
        'Solo se pueden enviar ordenes de compra en estado borrador',
      );
    }

    const updatedPurchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SENT },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        user: true,
        warehouse: true,
      },
    });

    this.logger.log(
      `Purchase order sent: ${updatedPurchaseOrder.purchaseOrderNumber} (${updatedPurchaseOrder.id})`,
    );

    return this.mapToResponse(updatedPurchaseOrder);
  }

  /**
   * Confirms a purchase order (changes status from SENT to CONFIRMED).
   *
   * @param id - Purchase order ID to confirm
   * @returns Updated purchase order data
   * @throws NotFoundException if purchase order not found
   * @throws ConflictException if purchase order is not in SENT status
   */
  async confirm(id: string): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Confirming purchase order ${id} in tenant ${tenantId}`);

    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!purchaseOrder) {
      this.logger.warn(`Purchase order not found: ${id}`);
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (purchaseOrder.status !== PurchaseOrderStatus.SENT) {
      throw new ConflictException(
        'Solo se pueden confirmar ordenes de compra en estado enviada',
      );
    }

    const updatedPurchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CONFIRMED },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        user: true,
        warehouse: true,
      },
    });

    this.logger.log(
      `Purchase order confirmed: ${updatedPurchaseOrder.purchaseOrderNumber} (${updatedPurchaseOrder.id})`,
    );

    return this.mapToResponse(updatedPurchaseOrder);
  }

  /**
   * Receives a purchase order (changes status from CONFIRMED to RECEIVED).
   *
   * This is the most critical business operation in the purchase orders module.
   * Inside a single database transaction, it:
   * 1. Creates StockMovement records for each item (type: PURCHASE)
   * 2. Updates each product's costPrice to the purchase unit price
   * 3. Upserts WarehouseStock to increment warehouse-level quantity
   * 4. Updates each product's global stock count
   * 5. Sets status to RECEIVED with receivedDate
   *
   * @param id - Purchase order ID to receive
   * @param userId - ID of the user receiving the goods
   * @returns Updated purchase order data with movements
   * @throws NotFoundException if purchase order not found
   * @throws ConflictException if purchase order is not in CONFIRMED status
   */
  async receive(
    id: string,
    userId: string,
  ): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Receiving purchase order ${id} in tenant ${tenantId}`);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch PO with items (include product details)
      const purchaseOrder = await tx.purchaseOrder.findFirst({
        where: { id, tenantId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Orden de compra no encontrada');
      }

      // 2. Validate status === CONFIRMED
      if (purchaseOrder.status !== PurchaseOrderStatus.CONFIRMED) {
        throw new ConflictException(
          'Solo se pueden recibir ordenes de compra en estado confirmada',
        );
      }

      // 3. For each PurchaseOrderItem, create movements and update stock
      for (const item of purchaseOrder.items) {
        // a. Create StockMovement
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: purchaseOrder.warehouseId,
            userId,
            type: MovementType.PURCHASE,
            quantity: item.quantity,
            reason: `Recepcion OC ${purchaseOrder.purchaseOrderNumber}`,
            purchaseOrderId: purchaseOrder.id,
          },
        });

        // b. Update Product.costPrice
        await tx.product.update({
          where: { id: item.productId },
          data: { costPrice: item.unitPrice },
        });

        // c. Upsert WarehouseStock (increment quantity)
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: purchaseOrder.warehouseId,
              productId: item.productId,
            },
          },
          create: {
            tenantId,
            warehouseId: purchaseOrder.warehouseId,
            productId: item.productId,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        });

        // d. Update Product.stock (global)
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // 4. Update PO: status = RECEIVED, receivedDate = now
      const updatedPurchaseOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.RECEIVED,
          receivedDate: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
          user: true,
          warehouse: true,
          movements: true,
        },
      });

      return updatedPurchaseOrder;
    });

    this.logger.log(
      `Purchase order received: ${result.purchaseOrderNumber} (${result.id}) - ${result.items.length} items processed`,
    );

    return this.mapToResponse(result);
  }

  /**
   * Cancels a purchase order.
   * Can cancel from DRAFT, SENT, or CONFIRMED status.
   * Cannot cancel a RECEIVED purchase order (stock already affected).
   *
   * @param id - Purchase order ID to cancel
   * @returns Updated purchase order data
   * @throws NotFoundException if purchase order not found
   * @throws ConflictException if purchase order is in RECEIVED or CANCELLED status
   */
  async cancel(id: string): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Cancelling purchase order ${id} in tenant ${tenantId}`);

    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!purchaseOrder) {
      this.logger.warn(`Purchase order not found: ${id}`);
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new ConflictException(
        'No se puede cancelar una orden de compra ya recibida',
      );
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new ConflictException(
        'La orden de compra ya esta cancelada',
      );
    }

    const updatedPurchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        user: true,
        warehouse: true,
      },
    });

    this.logger.log(
      `Purchase order cancelled: ${updatedPurchaseOrder.purchaseOrderNumber} (${updatedPurchaseOrder.id})`,
    );

    return this.mapToResponse(updatedPurchaseOrder);
  }

  /**
   * Gets aggregated statistics for all purchase orders in the current tenant.
   *
   * @returns Purchase order statistics including counts by status and total values
   */
  async getStats(): Promise<{
    totalPurchaseOrders: number;
    totalValue: number;
    totalReceived: number;
    purchaseOrdersByStatus: Record<PurchaseOrderStatus, number>;
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Getting purchase order statistics for tenant ${tenantId}`,
    );

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      select: {
        status: true,
        total: true,
      },
    });

    // Initialize status counts
    const purchaseOrdersByStatus: Record<PurchaseOrderStatus, number> = {
      [PurchaseOrderStatus.DRAFT]: 0,
      [PurchaseOrderStatus.SENT]: 0,
      [PurchaseOrderStatus.CONFIRMED]: 0,
      [PurchaseOrderStatus.RECEIVED]: 0,
      [PurchaseOrderStatus.CANCELLED]: 0,
    };

    let totalValue = 0;
    let totalReceived = 0;

    for (const po of purchaseOrders) {
      purchaseOrdersByStatus[po.status]++;
      totalValue += Number(po.total);

      if (po.status === PurchaseOrderStatus.RECEIVED) {
        totalReceived += Number(po.total);
      }
    }

    return {
      totalPurchaseOrders: purchaseOrders.length,
      totalValue,
      totalReceived,
      purchaseOrdersByStatus,
    };
  }

  /**
   * Generates a consecutive purchase order number unique to the tenant.
   * Format: OC-00001, OC-00002, etc.
   *
   * Must be called inside a transaction to prevent race conditions.
   *
   * @param tx - Prisma transaction client
   * @returns Generated purchase order number
   */
  private async generatePurchaseOrderNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();

    const lastPurchaseOrder = await tx.purchaseOrder.findFirst({
      where: { tenantId, purchaseOrderNumber: { startsWith: 'OC-' } },
      orderBy: { purchaseOrderNumber: 'desc' },
      select: { purchaseOrderNumber: true },
    });

    let nextNumber = 1;

    if (lastPurchaseOrder?.purchaseOrderNumber) {
      const match = lastPurchaseOrder.purchaseOrderNumber.match(/OC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const purchaseOrderNumber = `OC-${nextNumber.toString().padStart(5, '0')}`;

    this.logger.debug(`Generated purchase order number: ${purchaseOrderNumber}`);

    return purchaseOrderNumber;
  }

  /**
   * Maps a PurchaseOrder entity (with Prisma Decimal fields) to a
   * PurchaseOrderResponse object with plain number fields.
   *
   * @param purchaseOrder - The purchase order entity to map (with or without relations)
   * @returns PurchaseOrderResponse object
   */
  private mapToResponse(
    purchaseOrder: PurchaseOrderWithRelations,
  ): PurchaseOrderResponse {
    const response: PurchaseOrderResponse = {
      id: purchaseOrder.id,
      tenantId: purchaseOrder.tenantId,
      supplierId: purchaseOrder.supplierId,
      userId: purchaseOrder.userId,
      warehouseId: purchaseOrder.warehouseId,
      purchaseOrderNumber: purchaseOrder.purchaseOrderNumber,
      status: purchaseOrder.status,
      paymentStatus: purchaseOrder.paymentStatus,
      subtotal: Number(purchaseOrder.subtotal),
      tax: Number(purchaseOrder.tax),
      discount: Number(purchaseOrder.discount),
      total: Number(purchaseOrder.total),
      issueDate: purchaseOrder.issueDate,
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate,
      receivedDate: purchaseOrder.receivedDate,
      notes: purchaseOrder.notes,
      createdAt: purchaseOrder.createdAt,
      updatedAt: purchaseOrder.updatedAt,
    };

    // Map items if included
    if (purchaseOrder.items) {
      response.items = purchaseOrder.items.map((item) => ({
        id: item.id,
        purchaseOrderId: item.purchaseOrderId,
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
              costPrice: Number(item.product.costPrice),
            }
          : undefined,
      }));
    }

    // Map supplier if included
    if (purchaseOrder.supplier) {
      response.supplier = {
        id: purchaseOrder.supplier.id,
        name: purchaseOrder.supplier.name,
        documentNumber: purchaseOrder.supplier.documentNumber,
      };
    }

    // Map user if included
    if (purchaseOrder.user) {
      response.user = {
        id: purchaseOrder.user.id,
        name: `${purchaseOrder.user.firstName} ${purchaseOrder.user.lastName}`,
        email: purchaseOrder.user.email,
      };
    }

    // Map warehouse if included
    if (purchaseOrder.warehouse) {
      response.warehouse = {
        id: purchaseOrder.warehouse.id,
        name: purchaseOrder.warehouse.name,
        code: purchaseOrder.warehouse.code,
      };
    }

    // Map movements if included
    if (purchaseOrder.movements) {
      response.movements = purchaseOrder.movements;
    }

    // Map _count if included
    if (purchaseOrder._count) {
      response._count = purchaseOrder._count;
    }

    return response;
  }
}
