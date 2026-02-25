import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Remission,
  RemissionItem,
  RemissionStatus,
  Prisma,
  Customer,
  User,
  Product,
  Warehouse,
  Invoice,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  CreateRemissionDto,
  UpdateRemissionDto,
  FilterRemissionsDto,
} from './dto';

/**
 * Remission item data returned in responses
 */
export interface RemissionItemResponse {
  id: string;
  remissionId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unit: string;
  notes: string | null;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

/**
 * Remission data returned in responses
 */
export interface RemissionResponse {
  id: string;
  tenantId: string;
  customerId: string | null;
  userId: string | null;
  warehouseId: string | null;
  invoiceId: string | null;
  remissionNumber: string;
  status: RemissionStatus;
  issueDate: Date;
  deliveryDate: Date | null;
  deliveryAddress: string | null;
  transportInfo: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: RemissionItemResponse[];
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
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
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
}

/**
 * Paginated response for remission list endpoints
 */
export interface PaginatedRemissionsResponse {
  data: RemissionResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Remission with relations for internal use
 */
type RemissionWithRelations = Remission & {
  items?: (RemissionItem & { product?: Product | null })[];
  customer?: Customer | null;
  user?: User | null;
  warehouse?: Warehouse | null;
  invoice?: (Invoice & Record<string, unknown>) | null;
};

/**
 * RemissionsService handles all remission (guia de despacho) management operations
 * including CRUD, status transitions (DRAFT -> DISPATCHED -> DELIVERED),
 * cancellation, and creation from existing invoices, all with multi-tenant isolation.
 *
 * Remissions represent delivery/dispatch notes that track goods being sent
 * to customers. They can optionally be linked to invoices.
 */
@Injectable()
export class RemissionsService {
  private readonly logger = new Logger(RemissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Creates a new remission within the current tenant.
   * Generates remission number, validates relations, and creates with items in a transaction.
   *
   * @param dto - Remission creation data
   * @param userId - ID of the user creating the remission
   * @returns Created remission data with relations
   * @throws NotFoundException if customer, warehouse, or invoice not found
   */
  async create(
    dto: CreateRemissionDto,
    userId: string,
  ): Promise<RemissionResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating remission for tenant ${tenantId} by user ${userId}`,
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

    // Validate warehouse if provided
    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
      });

      if (!warehouse) {
        throw new NotFoundException(`Bodega no encontrada: ${dto.warehouseId}`);
      }
    }

    // Validate invoice if provided
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, tenantId },
      });

      if (!invoice) {
        throw new NotFoundException(
          `Factura no encontrada: ${dto.invoiceId}`,
        );
      }
    }

    // Validate products if provided in items
    const productIds = dto.items
      .filter((item) => item.productId)
      .map((item) => item.productId!);

    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, tenantId },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of dto.items) {
        if (item.productId && !productMap.has(item.productId)) {
          throw new NotFoundException(
            `Producto no encontrado: ${item.productId}`,
          );
        }
      }
    }

    // Create remission within a transaction
    const remission = await this.prisma.$transaction(async (tx) => {
      const remissionNumber = await this.generateRemissionNumber(tx);

      const newRemission = await tx.remission.create({
        data: {
          tenantId,
          userId,
          customerId: dto.customerId ?? null,
          warehouseId: dto.warehouseId ?? null,
          invoiceId: dto.invoiceId ?? null,
          remissionNumber,
          status: RemissionStatus.DRAFT,
          issueDate: new Date(),
          deliveryDate: dto.deliveryDate ?? null,
          deliveryAddress: dto.deliveryAddress ?? null,
          transportInfo: dto.transportInfo ?? null,
          notes: dto.notes ?? null,
        },
      });

      // Create remission items
      await tx.remissionItem.createMany({
        data: dto.items.map((item) => ({
          remissionId: newRemission.id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit ?? 'unit',
          notes: item.notes ?? null,
        })),
      });

      // Fetch the complete remission with relations
      return tx.remission.findUnique({
        where: { id: newRemission.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
          warehouse: true,
          invoice: true,
        },
      });
    });

    if (!remission) {
      throw new BadRequestException('Error al crear la remision');
    }

    this.logger.log(
      `Remission created: ${remission.remissionNumber} (${remission.id})`,
    );

    return this.mapToResponse(remission);
  }

  /**
   * Lists all remissions within the current tenant with filtering and pagination.
   * Supports search by remission number, customer name, and delivery address.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of remissions
   */
  async findAll(
    filters: FilterRemissionsDto = {},
  ): Promise<PaginatedRemissionsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      status,
      customerId,
      warehouseId,
      fromDate,
      toDate,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing remissions for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.RemissionWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
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

    // Search in remission number, customer name, and delivery address
    if (search) {
      where.OR = [
        {
          remissionNumber: { contains: search, mode: 'insensitive' },
        },
        {
          customer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          deliveryAddress: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    const [remissions, total] = await Promise.all([
      this.prisma.remission.findMany({
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
              address: true,
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
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
        },
      }),
      this.prisma.remission.count({ where }),
    ]);

    return {
      data: remissions.map((remission) =>
        this.mapToResponse(remission as RemissionWithRelations),
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
   * Finds a single remission by ID within the current tenant.
   * Includes all items with product relations, customer, user, warehouse, and invoice.
   *
   * @param id - Remission ID
   * @returns Remission data with full relations
   * @throws NotFoundException if remission not found
   */
  async findOne(id: string): Promise<RemissionResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding remission ${id} in tenant ${tenantId}`);

    const remission = await this.prisma.remission.findFirst({
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
        invoice: true,
      },
    });

    if (!remission) {
      this.logger.warn(`Remission not found: ${id}`);
      throw new NotFoundException('Remision no encontrada');
    }

    return this.mapToResponse(remission);
  }

  /**
   * Updates an existing remission.
   * Only DRAFT remissions can be updated.
   * When items are provided, existing items are deleted and replaced.
   *
   * @param id - Remission ID to update
   * @param dto - Update data
   * @returns Updated remission data
   * @throws NotFoundException if remission not found
   * @throws BadRequestException if remission is not in DRAFT status
   */
  async update(
    id: string,
    dto: UpdateRemissionDto,
  ): Promise<RemissionResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating remission ${id} in tenant ${tenantId}`);

    const remission = await this.prisma.remission.findFirst({
      where: { id, tenantId },
    });

    if (!remission) {
      this.logger.warn(`Remission not found: ${id}`);
      throw new NotFoundException('Remision no encontrada');
    }

    if (remission.status !== RemissionStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden modificar remisiones en estado borrador',
      );
    }

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }
    }

    // Validate warehouse if provided
    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
      });

      if (!warehouse) {
        throw new NotFoundException('Bodega no encontrada');
      }
    }

    // Validate invoice if provided
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, tenantId },
      });

      if (!invoice) {
        throw new NotFoundException('Factura no encontrada');
      }
    }

    // Build update data
    const updateData: Prisma.RemissionUpdateInput = {};

    if (dto.customerId !== undefined) {
      updateData.customer = dto.customerId
        ? { connect: { id: dto.customerId } }
        : { disconnect: true };
    }

    if (dto.warehouseId !== undefined) {
      updateData.warehouse = dto.warehouseId
        ? { connect: { id: dto.warehouseId } }
        : { disconnect: true };
    }

    if (dto.invoiceId !== undefined) {
      updateData.invoice = dto.invoiceId
        ? { connect: { id: dto.invoiceId } }
        : { disconnect: true };
    }

    if (dto.deliveryAddress !== undefined) {
      updateData.deliveryAddress = dto.deliveryAddress;
    }

    if (dto.deliveryDate !== undefined) {
      updateData.deliveryDate = dto.deliveryDate;
    }

    if (dto.transportInfo !== undefined) {
      updateData.transportInfo = dto.transportInfo;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // If items are provided, replace all existing items
    if (dto.items !== undefined) {
      // Validate products in new items
      const productIds = dto.items
        .filter((item) => item.productId)
        .map((item) => item.productId!);

      if (productIds.length > 0) {
        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds }, tenantId },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        for (const item of dto.items) {
          if (item.productId && !productMap.has(item.productId)) {
            throw new NotFoundException(
              `Producto no encontrado: ${item.productId}`,
            );
          }
        }
      }

      updateData.items = {
        deleteMany: {},
        createMany: {
          data: dto.items.map((item) => ({
            productId: item.productId ?? null,
            description: item.description!,
            quantity: item.quantity!,
            unit: item.unit ?? 'unit',
            notes: item.notes ?? null,
          })),
        },
      };
    }

    const updatedRemission = await this.prisma.remission.update({
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
        invoice: true,
      },
    });

    this.logger.log(
      `Remission updated: ${updatedRemission.remissionNumber} (${updatedRemission.id})`,
    );

    return this.mapToResponse(updatedRemission);
  }

  /**
   * Deletes a remission from the tenant.
   * Only DRAFT remissions can be deleted. Items are cascade-deleted.
   *
   * @param id - Remission ID to delete
   * @throws NotFoundException if remission not found
   * @throws BadRequestException if remission is not in DRAFT status
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting remission ${id} in tenant ${tenantId}`);

    const remission = await this.prisma.remission.findFirst({
      where: { id, tenantId },
    });

    if (!remission) {
      this.logger.warn(`Remission not found: ${id}`);
      throw new NotFoundException('Remision no encontrada');
    }

    if (remission.status !== RemissionStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar remisiones en estado borrador',
      );
    }

    await this.prisma.remission.delete({ where: { id } });

    this.logger.log(
      `Remission deleted: ${remission.remissionNumber} (${remission.id})`,
    );
  }

  /**
   * Dispatches a remission (changes status from DRAFT to DISPATCHED).
   * Sets deliveryDate to now if not already set.
   *
   * @param id - Remission ID to dispatch
   * @returns Updated remission data
   * @throws NotFoundException if remission not found
   * @throws BadRequestException if remission is not in DRAFT status
   */
  async dispatch(id: string): Promise<RemissionResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Dispatching remission ${id} in tenant ${tenantId}`);

    const remission = await this.prisma.remission.findFirst({
      where: { id, tenantId },
    });

    if (!remission) {
      this.logger.warn(`Remission not found: ${id}`);
      throw new NotFoundException('Remision no encontrada');
    }

    if (remission.status !== RemissionStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden despachar remisiones en estado borrador',
      );
    }

    const updateData: Prisma.RemissionUpdateInput = {
      status: RemissionStatus.DISPATCHED,
    };

    // Set delivery date to now if not already set
    if (!remission.deliveryDate) {
      updateData.deliveryDate = new Date();
    }

    const updatedRemission = await this.prisma.remission.update({
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
        invoice: true,
      },
    });

    this.logger.log(
      `Remission dispatched: ${updatedRemission.remissionNumber} (${updatedRemission.id})`,
    );

    return this.mapToResponse(updatedRemission);
  }

  /**
   * Marks a remission as delivered (changes status from DISPATCHED to DELIVERED).
   *
   * @param id - Remission ID to deliver
   * @returns Updated remission data
   * @throws NotFoundException if remission not found
   * @throws BadRequestException if remission is not in DISPATCHED status
   */
  async deliver(id: string): Promise<RemissionResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Delivering remission ${id} in tenant ${tenantId}`);

    const remission = await this.prisma.remission.findFirst({
      where: { id, tenantId },
    });

    if (!remission) {
      this.logger.warn(`Remission not found: ${id}`);
      throw new NotFoundException('Remision no encontrada');
    }

    if (remission.status !== RemissionStatus.DISPATCHED) {
      throw new BadRequestException(
        'Solo se pueden entregar remisiones en estado despachado',
      );
    }

    const updatedRemission = await this.prisma.remission.update({
      where: { id },
      data: {
        status: RemissionStatus.DELIVERED,
        deliveryDate: new Date(),
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
        invoice: true,
      },
    });

    this.logger.log(
      `Remission delivered: ${updatedRemission.remissionNumber} (${updatedRemission.id})`,
    );

    return this.mapToResponse(updatedRemission);
  }

  /**
   * Cancels a remission.
   * Can cancel from any status except DELIVERED.
   *
   * @param id - Remission ID to cancel
   * @returns Updated remission data
   * @throws NotFoundException if remission not found
   * @throws BadRequestException if remission is already delivered or cancelled
   */
  async cancel(id: string): Promise<RemissionResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Cancelling remission ${id} in tenant ${tenantId}`);

    const remission = await this.prisma.remission.findFirst({
      where: { id, tenantId },
    });

    if (!remission) {
      this.logger.warn(`Remission not found: ${id}`);
      throw new NotFoundException('Remision no encontrada');
    }

    if (remission.status === RemissionStatus.DELIVERED) {
      throw new BadRequestException(
        'No se puede cancelar una remision ya entregada',
      );
    }

    if (remission.status === RemissionStatus.CANCELLED) {
      throw new BadRequestException('La remision ya esta cancelada');
    }

    const updatedRemission = await this.prisma.remission.update({
      where: { id },
      data: { status: RemissionStatus.CANCELLED },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: true,
        warehouse: true,
        invoice: true,
      },
    });

    this.logger.log(
      `Remission cancelled: ${updatedRemission.remissionNumber} (${updatedRemission.id})`,
    );

    return this.mapToResponse(updatedRemission);
  }

  /**
   * Gets aggregated statistics for all remissions in the current tenant.
   *
   * @returns Remission statistics including counts by status
   */
  async getStats(): Promise<{
    totalRemissions: number;
    remissionsByStatus: Record<RemissionStatus, number>;
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Getting remission statistics for tenant ${tenantId}`,
    );

    const remissions = await this.prisma.remission.findMany({
      where: { tenantId },
      select: {
        status: true,
      },
    });

    // Initialize status counts
    const remissionsByStatus: Record<RemissionStatus, number> = {
      [RemissionStatus.DRAFT]: 0,
      [RemissionStatus.DISPATCHED]: 0,
      [RemissionStatus.DELIVERED]: 0,
      [RemissionStatus.CANCELLED]: 0,
    };

    for (const remission of remissions) {
      remissionsByStatus[remission.status]++;
    }

    return {
      totalRemissions: remissions.length,
      remissionsByStatus,
    };
  }

  /**
   * Creates a remission pre-filled from an existing invoice's items.
   * Copies customer, warehouse, and item details from the invoice.
   *
   * @param invoiceId - Invoice ID to create remission from
   * @param userId - ID of the user creating the remission
   * @returns Created remission data
   * @throws NotFoundException if invoice not found
   */
  async createFromInvoice(
    invoiceId: string,
    userId: string,
  ): Promise<RemissionResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating remission from invoice ${invoiceId} in tenant ${tenantId}`,
    );

    // Find the invoice with items and product details
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Create remission within a transaction
    const remission = await this.prisma.$transaction(async (tx) => {
      const remissionNumber = await this.generateRemissionNumber(tx);

      const newRemission = await tx.remission.create({
        data: {
          tenantId,
          userId,
          customerId: invoice.customerId,
          warehouseId: invoice.warehouseId,
          invoiceId: invoice.id,
          remissionNumber,
          status: RemissionStatus.DRAFT,
          issueDate: new Date(),
          deliveryAddress: invoice.customer?.address ?? null,
          notes: `Remision generada desde factura ${invoice.invoiceNumber}`,
        },
      });

      // Create remission items from invoice items
      if (invoice.items.length > 0) {
        await tx.remissionItem.createMany({
          data: invoice.items.map((item) => ({
            remissionId: newRemission.id,
            productId: item.productId,
            description: item.product?.name ?? `Producto ${item.productId}`,
            quantity: item.quantity,
            unit: 'unit',
            notes: null,
          })),
        });
      }

      // Fetch the complete remission with relations
      return tx.remission.findUnique({
        where: { id: newRemission.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: true,
          warehouse: true,
          invoice: true,
        },
      });
    });

    if (!remission) {
      throw new BadRequestException(
        'Error al crear la remision desde la factura',
      );
    }

    this.logger.log(
      `Remission created from invoice ${invoice.invoiceNumber}: ${remission.remissionNumber} (${remission.id})`,
    );

    return this.mapToResponse(remission);
  }

  /**
   * Generates a consecutive remission number unique to the tenant.
   * Format: REM-00001, REM-00002, etc.
   *
   * Must be called inside a transaction to prevent race conditions.
   *
   * @param tx - Prisma transaction client
   * @returns Generated remission number
   */
  private async generateRemissionNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();

    const lastRemission = await tx.remission.findFirst({
      where: { tenantId, remissionNumber: { startsWith: 'REM-' } },
      orderBy: { remissionNumber: 'desc' },
      select: { remissionNumber: true },
    });

    let nextNumber = 1;

    if (lastRemission?.remissionNumber) {
      const match = lastRemission.remissionNumber.match(/REM-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const remissionNumber = `REM-${nextNumber.toString().padStart(5, '0')}`;

    this.logger.debug(`Generated remission number: ${remissionNumber}`);

    return remissionNumber;
  }

  /**
   * Maps a Remission entity to a RemissionResponse object.
   *
   * @param remission - The remission entity to map (with or without relations)
   * @returns RemissionResponse object
   */
  private mapToResponse(
    remission: RemissionWithRelations,
  ): RemissionResponse {
    const response: RemissionResponse = {
      id: remission.id,
      tenantId: remission.tenantId,
      customerId: remission.customerId,
      userId: remission.userId,
      warehouseId: remission.warehouseId,
      invoiceId: remission.invoiceId,
      remissionNumber: remission.remissionNumber,
      status: remission.status,
      issueDate: remission.issueDate,
      deliveryDate: remission.deliveryDate,
      deliveryAddress: remission.deliveryAddress,
      transportInfo: remission.transportInfo,
      notes: remission.notes,
      createdAt: remission.createdAt,
      updatedAt: remission.updatedAt,
    };

    // Map items if included
    if (remission.items) {
      response.items = remission.items.map((item) => ({
        id: item.id,
        remissionId: item.remissionId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
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
    if (remission.customer) {
      response.customer = {
        id: remission.customer.id,
        name: remission.customer.name,
        email: remission.customer.email,
        phone: remission.customer.phone,
        address: remission.customer.address,
      };
    }

    // Map user if included
    if (remission.user) {
      response.user = {
        id: remission.user.id,
        name: `${remission.user.firstName} ${remission.user.lastName}`,
        email: remission.user.email,
      };
    }

    // Map warehouse if included
    if (remission.warehouse) {
      response.warehouse = {
        id: remission.warehouse.id,
        name: remission.warehouse.name,
        code: remission.warehouse.code,
      };
    }

    // Map invoice if included
    if (remission.invoice) {
      response.invoice = {
        id: remission.invoice.id,
        invoiceNumber: remission.invoice.invoiceNumber,
      };
    }

    return response;
  }
}
