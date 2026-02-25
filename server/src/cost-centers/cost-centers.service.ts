import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CostCenter, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';

/**
 * Datos del centro de costos retornados en las respuestas
 */
export interface CostCenterResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  journalEntryLineCount?: number;
}

/**
 * Respuesta para el endpoint de opciones (dropdowns)
 */
export interface CostCenterOptionResponse {
  id: string;
  code: string;
  name: string;
}

/**
 * CostCentersService maneja todas las operaciones de gestión de centros de costos
 * incluyendo CRUD y funcionalidad de búsqueda con aislamiento multi-tenant.
 *
 * Los centros de costos se utilizan para clasificar y agrupar los asientos
 * contables por área o departamento dentro de un tenant.
 * Cada código de centro de costos debe ser único dentro de su tenant.
 */
@Injectable()
export class CostCentersService {
  private readonly logger = new Logger(CostCentersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Lista todos los centros de costos dentro del tenant actual.
   * Soporta filtrado por nombre o código mediante el parámetro de búsqueda.
   *
   * @param search - Consulta de búsqueda opcional (filtra por nombre o código)
   * @returns Lista de centros de costos ordenados por código ASC
   */
  async findAll(search?: string): Promise<CostCenterResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Listing cost centers for tenant ${tenantId}, search: "${search ?? ''}"`,
    );

    const where: Prisma.CostCenterWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const costCenters = await this.prisma.costCenter.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { journalEntryLines: true } },
      },
    });

    return costCenters.map((cc) => this.mapToCostCenterResponse(cc));
  }

  /**
   * Busca un único centro de costos por ID dentro del tenant actual.
   * Incluye el conteo de líneas de asiento contable asociadas.
   *
   * @param id - ID del centro de costos
   * @returns Datos del centro de costos con estadísticas de uso
   * @throws NotFoundException si el centro de costos no se encuentra
   */
  async findOne(id: string): Promise<CostCenterResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding cost center ${id} in tenant ${tenantId}`);

    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { journalEntryLines: true } },
      },
    });

    if (!costCenter) {
      this.logger.warn(`Cost center not found: ${id}`);
      throw new NotFoundException(
        `Centro de costos con ID ${id} no encontrado`,
      );
    }

    return this.mapToCostCenterResponse(costCenter);
  }

  /**
   * Crea un nuevo centro de costos dentro del tenant actual.
   *
   * @param dto - Datos de creación del centro de costos
   * @returns Datos del centro de costos creado
   * @throws ConflictException si el código ya existe en el tenant
   */
  async create(dto: CreateCostCenterDto): Promise<CostCenterResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();

    this.logger.debug(
      `Creating cost center "${normalizedCode}" in tenant ${tenantId}`,
    );

    // Verificar que no exista un centro de costos con el mismo código en el tenant
    const existingCostCenter = await this.prisma.costCenter.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: normalizedCode,
        },
      },
    });

    if (existingCostCenter) {
      this.logger.warn(`Cost center code already exists: ${normalizedCode}`);
      throw new ConflictException(
        `Ya existe un centro de costos con el código "${normalizedCode}"`,
      );
    }

    // Crear centro de costos
    const costCenter = await this.prisma.costCenter.create({
      data: {
        tenantId,
        code: normalizedCode,
        name: dto.name.trim(),
        description: dto.description?.trim(),
      },
    });

    this.logger.log(
      `Cost center created: ${costCenter.code} - ${costCenter.name} (${costCenter.id})`,
    );

    return this.mapToCostCenterResponse(costCenter);
  }

  /**
   * Actualiza un centro de costos existente.
   *
   * @param id - ID del centro de costos a actualizar
   * @param dto - Datos de actualización
   * @returns Datos del centro de costos actualizado
   * @throws NotFoundException si el centro de costos no se encuentra
   * @throws ConflictException si el nuevo código ya existe en el tenant
   */
  async update(
    id: string,
    dto: UpdateCostCenterDto,
  ): Promise<CostCenterResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating cost center ${id} in tenant ${tenantId}`);

    // Buscar el centro de costos a actualizar
    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id, tenantId },
    });

    if (!costCenter) {
      this.logger.warn(`Cost center not found: ${id}`);
      throw new NotFoundException(
        `Centro de costos con ID ${id} no encontrado`,
      );
    }

    // Construir datos de actualización
    const updateData: Prisma.CostCenterUpdateInput = {};

    // El código requiere verificación de unicidad
    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim().toUpperCase();
      if (normalizedCode !== costCenter.code) {
        const existingCostCenter = await this.prisma.costCenter.findUnique({
          where: {
            tenantId_code: {
              tenantId,
              code: normalizedCode,
            },
          },
        });

        if (existingCostCenter) {
          this.logger.warn(
            `Cost center code already exists: ${normalizedCode}`,
          );
          throw new ConflictException(
            `Ya existe un centro de costos con el código "${normalizedCode}"`,
          );
        }

        updateData.code = normalizedCode;
      }
    }

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description?.trim();
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    // Actualizar el centro de costos
    const updatedCostCenter = await this.prisma.costCenter.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Cost center updated: ${updatedCostCenter.code} - ${updatedCostCenter.name} (${updatedCostCenter.id})`,
    );

    return this.mapToCostCenterResponse(updatedCostCenter);
  }

  /**
   * Elimina un centro de costos del tenant.
   * Solo se permite si no tiene líneas de asiento contable asociadas.
   *
   * @param id - ID del centro de costos a eliminar
   * @throws NotFoundException si el centro de costos no se encuentra
   * @throws BadRequestException si tiene líneas de asiento contable asociadas
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting cost center ${id} in tenant ${tenantId}`);

    // Buscar el centro de costos a eliminar
    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id, tenantId },
    });

    if (!costCenter) {
      this.logger.warn(`Cost center not found: ${id}`);
      throw new NotFoundException(
        `Centro de costos con ID ${id} no encontrado`,
      );
    }

    // Verificar si tiene líneas de asiento contable asociadas
    const journalEntryLineCount = await this.prisma.journalEntryLine.count({
      where: { costCenterId: id },
    });

    if (journalEntryLineCount > 0) {
      this.logger.warn(
        `Cannot delete cost center ${id}: ${journalEntryLineCount} journal entry lines associated`,
      );
      throw new BadRequestException(
        `No se puede eliminar el centro de costos "${costCenter.name}". Tiene ${journalEntryLineCount} línea(s) de asiento contable asociada(s). Reasigne o elimine las líneas primero.`,
      );
    }

    await this.prisma.costCenter.delete({ where: { id } });

    this.logger.log(
      `Cost center deleted: ${costCenter.code} - ${costCenter.name} (${costCenter.id})`,
    );
  }

  /**
   * Retorna una lista simplificada de centros de costos activos para uso en dropdowns.
   * Solo incluye id, código y nombre.
   *
   * @returns Lista de opciones de centros de costos ordenadas por código ASC
   */
  async getOptions(): Promise<CostCenterOptionResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Getting cost center options for tenant ${tenantId}`,
    );

    const costCenters = await this.prisma.costCenter.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { code: 'asc' },
    });

    return costCenters;
  }

  /**
   * Mapea una entidad CostCenter a un objeto CostCenterResponse
   *
   * @param costCenter - La entidad de centro de costos a mapear
   * @returns Objeto CostCenterResponse
   */
  private mapToCostCenterResponse(
    costCenter: CostCenter & { _count?: { journalEntryLines: number } },
  ): CostCenterResponse {
    return {
      id: costCenter.id,
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description,
      isActive: costCenter.isActive,
      tenantId: costCenter.tenantId,
      createdAt: costCenter.createdAt,
      updatedAt: costCenter.updatedAt,
      journalEntryLineCount: costCenter._count?.journalEntryLines,
    };
  }
}
