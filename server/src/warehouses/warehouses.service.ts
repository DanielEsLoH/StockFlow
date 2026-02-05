import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Warehouse, WarehouseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';

/**
 * Warehouse data returned in responses
 */
export interface WarehouseResponse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  isDefault: boolean;
  status: WarehouseStatus;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Warehouse with stock summary
 */
export interface WarehouseWithStockSummary extends WarehouseResponse {
  stockSummary: {
    totalProducts: number;
    totalQuantity: number;
  };
}

/**
 * Stock item in a warehouse
 */
export interface WarehouseStockItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedWarehousesResponse {
  data: WarehouseResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Paginated response for stock list
 */
export interface PaginatedWarehouseStockResponse {
  data: WarehouseStockItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * WarehousesService handles all warehouse management operations including
 * CRUD operations and stock queries with multi-tenant isolation.
 *
 * Warehouses are storage locations within a tenant where products are kept.
 * Each warehouse code must be unique within its tenant.
 */
@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Returns all unique cities from warehouses within the current tenant.
   *
   * @returns Array of unique city names, sorted alphabetically
   */
  async getCities(): Promise<string[]> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Getting unique cities for tenant ${tenantId}`);

    const warehouses = await this.prisma.warehouse.findMany({
      where: { tenantId },
      select: { city: true },
      distinct: ['city'],
    });

    return warehouses
      .map((w) => w.city)
      .filter((city): city is string => city !== null)
      .sort();
  }

  /**
   * Lists all warehouses within the current tenant with pagination.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of warehouses per page
   * @returns Paginated list of warehouses
   */
  async findAll(page = 1, limit = 10): Promise<PaginatedWarehousesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing warehouses for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    const where: Prisma.WarehouseWhereInput = { tenantId };

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return this.buildPaginatedResponse(warehouses, total, page, limit);
  }

  /**
   * Finds a single warehouse by ID within the current tenant.
   * Includes stock summary (total products and total quantity).
   *
   * @param id - Warehouse ID
   * @returns Warehouse data with stock summary
   * @throws NotFoundException if warehouse not found
   */
  async findOne(id: string): Promise<WarehouseWithStockSummary> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding warehouse ${id} in tenant ${tenantId}`);

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      this.logger.warn(`Warehouse not found: ${id}`);
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Get stock summary
    const stockAggregation = await this.prisma.warehouseStock.aggregate({
      where: { warehouseId: id },
      _count: { productId: true },
      _sum: { quantity: true },
    });

    return {
      ...this.mapToWarehouseResponse(warehouse),
      stockSummary: {
        totalProducts: stockAggregation._count.productId,
        totalQuantity: stockAggregation._sum.quantity ?? 0,
      },
    };
  }

  /**
   * Creates a new warehouse within the current tenant.
   * Enforces tenant warehouse limits before creation.
   * Auto-generates code from name if not provided.
   * If setting as default, unsets previous default warehouse.
   *
   * @param dto - Warehouse creation data
   * @returns Created warehouse data
   * @throws ConflictException if code already exists in tenant
   * @throws ForbiddenException if warehouse limit is reached
   */
  async create(dto: CreateWarehouseDto): Promise<WarehouseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    // Enforce tenant warehouse limit
    await this.tenantContext.enforceLimit('warehouses');

    const normalizedName = dto.name.trim();
    const normalizedCode =
      dto.code?.trim() || this.generateCode(normalizedName);

    this.logger.debug(
      `Creating warehouse "${normalizedName}" (code: ${normalizedCode}) in tenant ${tenantId}`,
    );

    // Check for existing warehouse with same code in tenant
    const existingCode = await this.prisma.warehouse.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: normalizedCode,
        },
      },
    });

    if (existingCode) {
      this.logger.warn(`Code already exists: ${normalizedCode}`);
      throw new ConflictException(
        `A warehouse with the code "${normalizedCode}" already exists`,
      );
    }

    // If setting as default, unset previous default
    if (dto.isDefault) {
      await this.unsetDefaultWarehouse(tenantId);
    }

    // Create warehouse
    const warehouse = await this.prisma.warehouse.create({
      data: {
        tenantId,
        name: normalizedName,
        code: normalizedCode,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        isMain: dto.isDefault ?? false,
        status: WarehouseStatus.ACTIVE,
      },
    });

    this.logger.log(`Warehouse created: ${warehouse.name} (${warehouse.id})`);

    return this.mapToWarehouseResponse(warehouse);
  }

  /**
   * Updates an existing warehouse.
   * If setting as default, unsets previous default warehouse.
   *
   * @param id - Warehouse ID to update
   * @param dto - Update data
   * @returns Updated warehouse data
   * @throws NotFoundException if warehouse not found
   * @throws ConflictException if new code already exists in tenant
   */
  async update(
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating warehouse ${id} in tenant ${tenantId}`);

    // Find the warehouse to update
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      this.logger.warn(`Warehouse not found: ${id}`);
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Build update data
    const updateData: Prisma.WarehouseUpdateInput = {};

    // Code requires uniqueness check
    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim();
      if (normalizedCode !== warehouse.code) {
        const existingCode = await this.prisma.warehouse.findUnique({
          where: {
            tenantId_code: {
              tenantId,
              code: normalizedCode,
            },
          },
        });

        if (existingCode) {
          throw new ConflictException(
            `A warehouse with the code "${normalizedCode}" already exists`,
          );
        }

        updateData.code = normalizedCode;
      }
    }

    // Update simple fields
    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.address !== undefined) {
      updateData.address = dto.address;
    }

    if (dto.city !== undefined) {
      updateData.city = dto.city;
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    // Handle isActive (convert to status)
    if (dto.isActive !== undefined && dto.status === undefined) {
      updateData.status = dto.isActive
        ? WarehouseStatus.ACTIVE
        : WarehouseStatus.INACTIVE;
    }

    // Handle default warehouse change
    if (dto.isDefault !== undefined) {
      if (dto.isDefault && !warehouse.isMain) {
        // Setting as new default - unset previous default
        await this.unsetDefaultWarehouse(tenantId);
      }
      updateData.isMain = dto.isDefault;
    }

    // Update the warehouse
    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Warehouse updated: ${updatedWarehouse.name} (${updatedWarehouse.id})`,
    );

    return this.mapToWarehouseResponse(updatedWarehouse);
  }

  /**
   * Deletes a warehouse from the tenant.
   * Deletion fails if the warehouse has any stock.
   *
   * @param id - Warehouse ID to delete
   * @throws NotFoundException if warehouse not found
   * @throws BadRequestException if warehouse has stock
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting warehouse ${id} in tenant ${tenantId}`);

    // Find the warehouse to delete
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      this.logger.warn(`Warehouse not found: ${id}`);
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Check if any stock exists in this warehouse
    const stockCount = await this.prisma.warehouseStock.count({
      where: {
        warehouseId: id,
        quantity: { gt: 0 },
      },
    });

    if (stockCount > 0) {
      this.logger.warn(
        `Cannot delete warehouse ${id}: ${stockCount} product(s) with stock`,
      );
      throw new BadRequestException(
        `Cannot delete warehouse "${warehouse.name}". ${stockCount} product(s) still have stock in this warehouse. Transfer or remove all stock first.`,
      );
    }

    // Delete all warehouse stock records (even with 0 quantity)
    await this.prisma.warehouseStock.deleteMany({
      where: { warehouseId: id },
    });

    // Delete the warehouse
    await this.prisma.warehouse.delete({ where: { id } });

    this.logger.log(`Warehouse deleted: ${warehouse.name} (${warehouse.id})`);
  }

  /**
   * Lists products and their quantities in a specific warehouse.
   *
   * @param id - Warehouse ID
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @returns Paginated list of products with quantities
   * @throws NotFoundException if warehouse not found
   */
  async getStock(
    id: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedWarehouseStockResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Getting stock for warehouse ${id} in tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Verify warehouse exists and belongs to tenant
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      this.logger.warn(`Warehouse not found: ${id}`);
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const where: Prisma.WarehouseStockWhereInput = {
      warehouseId: id,
      quantity: { gt: 0 },
    };

    const [stockItems, total] = await Promise.all([
      this.prisma.warehouseStock.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.warehouseStock.count({ where }),
    ]);

    const data: WarehouseStockItem[] = stockItems.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      productSku: item.product.sku,
      quantity: item.quantity,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Maps a Warehouse entity to a WarehouseResponse object
   *
   * @param warehouse - The warehouse entity to map
   * @returns WarehouseResponse object
   */
  private mapToWarehouseResponse(warehouse: Warehouse): WarehouseResponse {
    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      city: warehouse.city,
      phone: warehouse.phone,
      isDefault: warehouse.isMain,
      status: warehouse.status,
      isActive: warehouse.status === WarehouseStatus.ACTIVE,
      tenantId: warehouse.tenantId,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    };
  }

  /**
   * Builds a paginated response from warehouses and pagination params
   */
  private buildPaginatedResponse(
    warehouses: Warehouse[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedWarehousesResponse {
    return {
      data: warehouses.map((warehouse) =>
        this.mapToWarehouseResponse(warehouse),
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
   * Generates a warehouse code from the name.
   * Converts to uppercase, removes special characters, and adds a numeric suffix.
   *
   * @param name - Warehouse name
   * @returns Generated code
   */
  private generateCode(name: string): string {
    const baseCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    // Add timestamp suffix for uniqueness
    const suffix = Date.now().toString(36).toUpperCase().substring(-4);

    return `${baseCode || 'WH'}-${suffix}`;
  }

  /**
   * Unsets the default warehouse for a tenant.
   * Called before setting a new default warehouse.
   *
   * @param tenantId - Tenant ID
   */
  private async unsetDefaultWarehouse(tenantId: string): Promise<void> {
    await this.prisma.warehouse.updateMany({
      where: { tenantId, isMain: true },
      data: { isMain: false },
    });
  }
}
