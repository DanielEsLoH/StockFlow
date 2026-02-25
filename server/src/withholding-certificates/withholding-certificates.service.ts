import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus, Supplier, WithholdingCertificate } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  FilterWithholdingCertificatesDto,
  GenerateCertificateDto,
  GenerateAllCertificatesDto,
} from './dto';

/**
 * Withholding certificate data returned in responses.
 * Converts Prisma Decimal fields to plain numbers.
 */
export interface WithholdingCertificateResponse {
  id: string;
  tenantId: string;
  supplierId: string;
  year: number;
  certificateNumber: string;
  totalBase: number;
  totalWithheld: number;
  withholdingType: string;
  generatedAt: Date;
  pdfUrl: string | null;
  createdAt: Date;
  supplier?: {
    id: string;
    name: string;
    documentNumber: string;
  } | null;
}

/**
 * Paginated response for certificate list endpoints
 */
export interface PaginatedWithholdingCertificatesResponse {
  data: WithholdingCertificateResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Statistics response for withholding certificates by year
 */
export interface WithholdingCertificateStatsResponse {
  year: number;
  totalCertificates: number;
  totalBase: number;
  totalWithheld: number;
  byType: Record<string, { count: number; base: number; withheld: number }>;
}

/**
 * Result of a generate-all operation
 */
export interface GenerateAllResult {
  generated: number;
  certificates: WithholdingCertificateResponse[];
}

/**
 * Withholding certificate with optional supplier relation
 */
type CertificateWithSupplier = WithholdingCertificate & {
  supplier?: Supplier | null;
};

/**
 * Default withholding rates by type (Colombian tax law)
 */
const WITHHOLDING_RATES: Record<string, number> = {
  RENTA: 0.025, // 2.5% retencion en la fuente por renta
  ICA: 0.00966, // 0.966% tarifa ICA (varies by municipality, using Bogota default)
  IVA: 0.15, // 15% of IVA value
};

/**
 * WithholdingCertificatesService handles generation and management of
 * annual withholding certificates (Certificados de Retencion) for suppliers.
 *
 * Certificates are generated based on RECEIVED purchase orders for a given
 * supplier, year, and withholding type. The service calculates the total
 * taxable base and withheld amounts according to Colombian tax regulations.
 *
 * All operations are scoped to the current tenant via TenantContextService.
 */
@Injectable()
export class WithholdingCertificatesService {
  private readonly logger = new Logger(WithholdingCertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Lists all withholding certificates within the current tenant with
   * optional filtering by year, supplier, and withholding type.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of withholding certificates
   */
  async findAll(
    filters: FilterWithholdingCertificatesDto = {},
  ): Promise<PaginatedWithholdingCertificatesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const { page = 1, limit = 10, year, supplierId, withholdingType } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing withholding certificates for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    const where: Prisma.WithholdingCertificateWhereInput = { tenantId };

    if (year !== undefined) {
      where.year = year;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (withholdingType) {
      where.withholdingType = withholdingType;
    }

    const [certificates, total] = await Promise.all([
      this.prisma.withholdingCertificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: 'desc' },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              documentNumber: true,
            },
          },
        },
      }),
      this.prisma.withholdingCertificate.count({ where }),
    ]);

    return {
      data: certificates.map((cert) =>
        this.mapToResponse(cert as CertificateWithSupplier),
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
   * Finds a single withholding certificate by ID within the current tenant.
   * Includes supplier relation data.
   *
   * @param id - Certificate ID
   * @returns Certificate data with supplier info
   * @throws NotFoundException if certificate not found
   */
  async findOne(id: string): Promise<WithholdingCertificateResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding withholding certificate ${id} in tenant ${tenantId}`);

    const certificate = await this.prisma.withholdingCertificate.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
      },
    });

    if (!certificate) {
      this.logger.warn(`Withholding certificate not found: ${id}`);
      throw new NotFoundException('Certificado de retencion no encontrado');
    }

    return this.mapToResponse(certificate);
  }

  /**
   * Generates a withholding certificate for a specific supplier, year, and type.
   *
   * Process:
   * 1. Validates the supplier exists in the tenant
   * 2. Queries all RECEIVED purchase orders for that supplier in the given year
   * 3. Calculates total base (sum of subtotals) and total withheld amount
   * 4. Auto-generates certificate number: CRT-{year}-00001
   * 5. Upserts the certificate (creates or updates on unique constraint)
   *
   * @param dto - Generation parameters (supplierId, year, withholdingType)
   * @returns Generated or updated certificate
   * @throws NotFoundException if supplier not found
   * @throws BadRequestException if no purchase orders found for the period
   */
  async generate(dto: GenerateCertificateDto): Promise<WithholdingCertificateResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const { supplierId, year, withholdingType } = dto;

    this.logger.debug(
      `Generating ${withholdingType} certificate for supplier ${supplierId}, year ${year}, tenant ${tenantId}`,
    );

    // 1. Validate supplier exists and belongs to tenant
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // 2. Query RECEIVED purchase orders for this supplier in the given year
    const startDate = new Date(year, 0, 1); // Jan 1st
    const endDate = new Date(year + 1, 0, 1); // Jan 1st of next year

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        supplierId,
        status: PurchaseOrderStatus.RECEIVED,
        receivedDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        subtotal: true,
        tax: true,
      },
    });

    if (purchaseOrders.length === 0) {
      throw new BadRequestException(
        `No se encontraron ordenes de compra recibidas para el proveedor en el ano ${year}`,
      );
    }

    // 3. Calculate totals
    const totalBase = purchaseOrders.reduce(
      (sum, po) => sum + Number(po.subtotal),
      0,
    );

    const totalWithheld = this.calculateWithholding(
      totalBase,
      withholdingType,
      purchaseOrders.reduce((sum, po) => sum + Number(po.tax), 0),
    );

    // 4. Generate certificate inside a transaction (for auto-numbering)
    const certificate = await this.prisma.$transaction(async (tx) => {
      const certificateNumber = await this.generateCertificateNumber(tx, year);

      return tx.withholdingCertificate.upsert({
        where: {
          tenantId_supplierId_year_withholdingType: {
            tenantId,
            supplierId,
            year,
            withholdingType,
          },
        },
        create: {
          tenantId,
          supplierId,
          year,
          withholdingType,
          certificateNumber,
          totalBase,
          totalWithheld,
          generatedAt: new Date(),
        },
        update: {
          totalBase,
          totalWithheld,
          generatedAt: new Date(),
        },
        include: {
          supplier: true,
        },
      });
    });

    this.logger.log(
      `Withholding certificate generated: ${certificate.certificateNumber} for supplier ${supplier.name} (${withholdingType}, ${year})`,
    );

    return this.mapToResponse(certificate);
  }

  /**
   * Generates withholding certificates for ALL suppliers that had RECEIVED
   * purchase orders in the given year.
   *
   * @param dto - Year and optional withholding type
   * @returns Summary of generated certificates
   */
  async generateAll(dto: GenerateAllCertificatesDto): Promise<GenerateAllResult> {
    const tenantId = this.tenantContext.requireTenantId();
    const { year, withholdingType = 'RENTA' } = dto;

    this.logger.debug(
      `Generating ${withholdingType} certificates for all suppliers, year ${year}, tenant ${tenantId}`,
    );

    // Find all suppliers that had RECEIVED purchase orders in the given year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const suppliersWithPurchases = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: PurchaseOrderStatus.RECEIVED,
        receivedDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        supplierId: true,
      },
      distinct: ['supplierId'],
    });

    if (suppliersWithPurchases.length === 0) {
      this.logger.log(
        `No suppliers with RECEIVED purchase orders found for year ${year}`,
      );
      return { generated: 0, certificates: [] };
    }

    const certificates: WithholdingCertificateResponse[] = [];

    for (const { supplierId } of suppliersWithPurchases) {
      try {
        const certificate = await this.generate({
          supplierId,
          year,
          withholdingType,
        });
        certificates.push(certificate);
      } catch (error) {
        // Log and continue if a specific supplier fails
        this.logger.warn(
          `Error generating certificate for supplier ${supplierId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `Generated ${certificates.length} withholding certificates for year ${year} (type: ${withholdingType})`,
    );

    return {
      generated: certificates.length,
      certificates,
    };
  }

  /**
   * Deletes a withholding certificate from the tenant.
   *
   * @param id - Certificate ID to delete
   * @throws NotFoundException if certificate not found
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Deleting withholding certificate ${id} in tenant ${tenantId}`,
    );

    const certificate = await this.prisma.withholdingCertificate.findFirst({
      where: { id, tenantId },
    });

    if (!certificate) {
      this.logger.warn(`Withholding certificate not found: ${id}`);
      throw new NotFoundException('Certificado de retencion no encontrado');
    }

    await this.prisma.withholdingCertificate.delete({ where: { id } });

    this.logger.log(
      `Withholding certificate deleted: ${certificate.certificateNumber} (${certificate.id})`,
    );
  }

  /**
   * Gets aggregated statistics for withholding certificates in a given year.
   *
   * @param year - Fiscal year
   * @returns Statistics including total certificates, base, withheld, and breakdown by type
   */
  async getStats(year: number): Promise<WithholdingCertificateStatsResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Getting withholding certificate statistics for tenant ${tenantId}, year ${year}`,
    );

    const certificates = await this.prisma.withholdingCertificate.findMany({
      where: { tenantId, year },
      select: {
        withholdingType: true,
        totalBase: true,
        totalWithheld: true,
      },
    });

    const byType: Record<string, { count: number; base: number; withheld: number }> = {};
    let totalBase = 0;
    let totalWithheld = 0;

    for (const cert of certificates) {
      const type = cert.withholdingType;
      const base = Number(cert.totalBase);
      const withheld = Number(cert.totalWithheld);

      totalBase += base;
      totalWithheld += withheld;

      if (!byType[type]) {
        byType[type] = { count: 0, base: 0, withheld: 0 };
      }

      byType[type].count++;
      byType[type].base += base;
      byType[type].withheld += withheld;
    }

    return {
      year,
      totalCertificates: certificates.length,
      totalBase,
      totalWithheld,
      byType,
    };
  }

  /**
   * Calculates the withholding amount based on type.
   *
   * - RENTA: 2.5% of subtotal (base)
   * - ICA: 0.966% of subtotal (base) - Bogota default rate
   * - IVA: 15% of the IVA (tax) amount
   *
   * @param totalBase - Sum of subtotals from purchase orders
   * @param withholdingType - Type of withholding (RENTA, ICA, IVA)
   * @param totalTax - Sum of tax from purchase orders (used for IVA calculations)
   * @returns Calculated withholding amount rounded to 2 decimal places
   */
  calculateWithholding(
    totalBase: number,
    withholdingType: string,
    totalTax: number,
  ): number {
    if (withholdingType === 'IVA') {
      // IVA withholding is 15% of the IVA (tax) amount
      return Math.round(totalTax * WITHHOLDING_RATES.IVA * 100) / 100;
    }

    const rate = WITHHOLDING_RATES[withholdingType] ?? WITHHOLDING_RATES.RENTA;
    return Math.round(totalBase * rate * 100) / 100;
  }

  /**
   * Generates a consecutive certificate number unique to the tenant for a given year.
   * Format: CRT-{year}-00001, CRT-{year}-00002, etc.
   *
   * Must be called inside a transaction to prevent race conditions.
   *
   * @param tx - Prisma transaction client
   * @param year - Fiscal year for the certificate
   * @returns Generated certificate number
   */
  private async generateCertificateNumber(
    tx: Prisma.TransactionClient,
    year: number,
  ): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();
    const prefix = `CRT-${year}-`;

    const lastCertificate = await tx.withholdingCertificate.findFirst({
      where: {
        tenantId,
        certificateNumber: { startsWith: prefix },
      },
      orderBy: { certificateNumber: 'desc' },
      select: { certificateNumber: true },
    });

    let nextNumber = 1;

    if (lastCertificate?.certificateNumber) {
      const match = lastCertificate.certificateNumber.match(
        /CRT-\d{4}-(\d+)/,
      );
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const certificateNumber = `${prefix}${nextNumber.toString().padStart(5, '0')}`;

    this.logger.debug(`Generated certificate number: ${certificateNumber}`);

    return certificateNumber;
  }

  /**
   * Maps a WithholdingCertificate entity (with Prisma Decimal fields) to
   * a WithholdingCertificateResponse with plain number fields.
   *
   * @param certificate - The certificate entity to map
   * @returns WithholdingCertificateResponse object
   */
  private mapToResponse(
    certificate: CertificateWithSupplier,
  ): WithholdingCertificateResponse {
    const response: WithholdingCertificateResponse = {
      id: certificate.id,
      tenantId: certificate.tenantId,
      supplierId: certificate.supplierId,
      year: certificate.year,
      certificateNumber: certificate.certificateNumber,
      totalBase: Number(certificate.totalBase),
      totalWithheld: Number(certificate.totalWithheld),
      withholdingType: certificate.withholdingType,
      generatedAt: certificate.generatedAt,
      pdfUrl: certificate.pdfUrl,
      createdAt: certificate.createdAt,
    };

    if (certificate.supplier) {
      response.supplier = {
        id: certificate.supplier.id,
        name: certificate.supplier.name,
        documentNumber: certificate.supplier.documentNumber,
      };
    }

    return response;
  }
}
