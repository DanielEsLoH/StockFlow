import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  CashRegister,
  CashRegisterStatus,
  Prisma,
  POSSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CreateCashRegisterDto, UpdateCashRegisterDto } from './dto';

/**
 * Cash register data returned in responses
 */
export interface CashRegisterResponse {
  id: string;
  tenantId: string;
  warehouseId: string;
  name: string;
  code: string;
  status: CashRegisterStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cash register with warehouse info
 */
export interface CashRegisterWithWarehouse extends CashRegisterResponse {
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  activeSession: {
    id: string;
    openedAt: Date;
    userId: string;
  } | null;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedCashRegistersResponse {
  data: CashRegisterWithWarehouse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * CashRegistersService handles all cash register management operations.
 *
 * Cash registers are physical or virtual stations where POS transactions occur.
 * Each cash register belongs to a warehouse and can have one active session at a time.
 */
@Injectable()
export class CashRegistersService {
  private readonly logger = new Logger(CashRegistersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Lists all cash registers within the current tenant with pagination.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @param warehouseId - Optional filter by warehouse
   * @returns Paginated list of cash registers with warehouse info
   */
  async findAll(
    page = 1,
    limit = 10,
    warehouseId?: string,
  ): Promise<PaginatedCashRegistersResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing cash registers for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    const where: Prisma.CashRegisterWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
    };

    const [cashRegisters, total] = await Promise.all([
      this.prisma.cashRegister.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          warehouse: {
            select: { id: true, name: true, code: true },
          },
          sessions: {
            where: { status: POSSessionStatus.ACTIVE },
            take: 1,
            select: { id: true, openedAt: true, userId: true },
          },
        },
      }),
      this.prisma.cashRegister.count({ where }),
    ]);

    const data: CashRegisterWithWarehouse[] = cashRegisters.map((cr) => ({
      id: cr.id,
      tenantId: cr.tenantId,
      warehouseId: cr.warehouseId,
      name: cr.name,
      code: cr.code,
      status: cr.status,
      createdAt: cr.createdAt,
      updatedAt: cr.updatedAt,
      warehouse: cr.warehouse,
      activeSession: cr.sessions[0] || null,
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
   * Finds a single cash register by ID within the current tenant.
   *
   * @param id - Cash register ID
   * @returns Cash register data with warehouse info
   * @throws NotFoundException if cash register not found
   */
  async findOne(id: string): Promise<CashRegisterWithWarehouse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding cash register ${id} in tenant ${tenantId}`);

    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        sessions: {
          where: { status: POSSessionStatus.ACTIVE },
          take: 1,
          select: { id: true, openedAt: true, userId: true },
        },
      },
    });

    if (!cashRegister) {
      this.logger.warn(`Cash register not found: ${id}`);
      throw new NotFoundException(`Cash register with ID ${id} not found`);
    }

    return {
      id: cashRegister.id,
      tenantId: cashRegister.tenantId,
      warehouseId: cashRegister.warehouseId,
      name: cashRegister.name,
      code: cashRegister.code,
      status: cashRegister.status,
      createdAt: cashRegister.createdAt,
      updatedAt: cashRegister.updatedAt,
      warehouse: cashRegister.warehouse,
      activeSession: cashRegister.sessions[0] || null,
    };
  }

  /**
   * Creates a new cash register within the current tenant.
   * Auto-generates code from name if not provided.
   *
   * @param dto - Cash register creation data
   * @returns Created cash register data
   * @throws ConflictException if code already exists in tenant
   * @throws NotFoundException if warehouse not found
   */
  async create(dto: CreateCashRegisterDto): Promise<CashRegisterResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    const normalizedName = dto.name.trim();
    const normalizedCode =
      dto.code?.trim().toUpperCase() || this.generateCode(normalizedName);

    this.logger.debug(
      `Creating cash register "${normalizedName}" (code: ${normalizedCode}) in tenant ${tenantId}`,
    );

    // Verify warehouse exists and belongs to tenant
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });

    if (!warehouse) {
      this.logger.warn(`Warehouse not found: ${dto.warehouseId}`);
      throw new NotFoundException(
        `Warehouse with ID ${dto.warehouseId} not found`,
      );
    }

    // Check for existing cash register with same code in tenant
    const existingCode = await this.prisma.cashRegister.findUnique({
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
        `A cash register with the code "${normalizedCode}" already exists`,
      );
    }

    // Create cash register
    const cashRegister = await this.prisma.cashRegister.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        name: normalizedName,
        code: normalizedCode,
        status: CashRegisterStatus.CLOSED,
      },
    });

    this.logger.log(
      `Cash register created: ${cashRegister.name} (${cashRegister.id})`,
    );

    return this.mapToResponse(cashRegister);
  }

  /**
   * Updates an existing cash register.
   *
   * @param id - Cash register ID to update
   * @param dto - Update data
   * @returns Updated cash register data
   * @throws NotFoundException if cash register not found
   * @throws ConflictException if new code already exists in tenant
   * @throws BadRequestException if trying to update status of open register
   */
  async update(
    id: string,
    dto: UpdateCashRegisterDto,
  ): Promise<CashRegisterResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating cash register ${id} in tenant ${tenantId}`);

    // Find the cash register to update
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId },
      include: {
        sessions: {
          where: { status: POSSessionStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!cashRegister) {
      this.logger.warn(`Cash register not found: ${id}`);
      throw new NotFoundException(`Cash register with ID ${id} not found`);
    }

    // Cannot change status manually if there's an active session
    if (dto.status && cashRegister.sessions.length > 0) {
      throw new BadRequestException(
        'Cannot change status of a cash register with an active session. Close the session first.',
      );
    }

    // Build update data
    const updateData: Prisma.CashRegisterUpdateInput = {};

    // Code requires uniqueness check
    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim().toUpperCase();
      if (normalizedCode !== cashRegister.code) {
        const existingCode = await this.prisma.cashRegister.findUnique({
          where: {
            tenantId_code: {
              tenantId,
              code: normalizedCode,
            },
          },
        });

        if (existingCode) {
          throw new ConflictException(
            `A cash register with the code "${normalizedCode}" already exists`,
          );
        }

        updateData.code = normalizedCode;
      }
    }

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    // Update the cash register
    const updatedCashRegister = await this.prisma.cashRegister.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Cash register updated: ${updatedCashRegister.name} (${updatedCashRegister.id})`,
    );

    return this.mapToResponse(updatedCashRegister);
  }

  /**
   * Deletes a cash register from the tenant.
   * Deletion fails if the cash register has any sessions.
   *
   * @param id - Cash register ID to delete
   * @throws NotFoundException if cash register not found
   * @throws BadRequestException if cash register has sessions
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting cash register ${id} in tenant ${tenantId}`);

    // Find the cash register to delete
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId },
    });

    if (!cashRegister) {
      this.logger.warn(`Cash register not found: ${id}`);
      throw new NotFoundException(`Cash register with ID ${id} not found`);
    }

    // Check if any sessions exist for this cash register
    const sessionCount = await this.prisma.pOSSession.count({
      where: { cashRegisterId: id },
    });

    if (sessionCount > 0) {
      this.logger.warn(
        `Cannot delete cash register ${id}: ${sessionCount} session(s) exist`,
      );
      throw new BadRequestException(
        `Cannot delete cash register "${cashRegister.name}". ${sessionCount} session(s) have been recorded. Consider deactivating it instead.`,
      );
    }

    // Delete the cash register
    await this.prisma.cashRegister.delete({ where: { id } });

    this.logger.log(
      `Cash register deleted: ${cashRegister.name} (${cashRegister.id})`,
    );
  }

  /**
   * Maps a CashRegister entity to a CashRegisterResponse object
   */
  private mapToResponse(cashRegister: CashRegister): CashRegisterResponse {
    return {
      id: cashRegister.id,
      tenantId: cashRegister.tenantId,
      warehouseId: cashRegister.warehouseId,
      name: cashRegister.name,
      code: cashRegister.code,
      status: cashRegister.status,
      createdAt: cashRegister.createdAt,
      updatedAt: cashRegister.updatedAt,
    };
  }

  /**
   * Generates a cash register code from the name.
   * Converts to uppercase, removes special characters, and adds a numeric suffix.
   */
  private generateCode(name: string): string {
    const baseCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    // Add timestamp suffix for uniqueness
    const suffix = Date.now().toString(36).toUpperCase().slice(-4);

    return `${baseCode || 'CAJA'}-${suffix}`;
  }
}
