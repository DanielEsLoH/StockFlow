import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common';
import {
  XmlGeneratorService,
  InvoiceWithDetails,
} from './services/xml-generator.service';
import { CufeGeneratorService } from './services/cufe-generator.service';
import { DianClientService } from './services/dian-client.service';
import {
  CreateDianConfigDto,
  UpdateDianConfigDto,
  SetDianSoftwareDto,
  SetDianResolutionDto,
} from './dto';
import { DianDocumentStatus, DianDocumentType } from '@prisma/client';

export interface ProcessInvoiceResult {
  success: boolean;
  documentId: string;
  cufe?: string;
  trackId?: string;
  status: DianDocumentStatus;
  message: string;
  errors?: string[];
}

@Injectable()
export class DianService {
  private readonly logger = new Logger(DianService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly xmlGenerator: XmlGeneratorService,
    private readonly cufeGenerator: CufeGeneratorService,
    private readonly dianClient: DianClientService,
  ) {}

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Get DIAN configuration for current tenant
   */
  async getConfig() {
    const tenantId = this.tenantContext.requireTenantId();

    const config = await this.prisma.tenantDianConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return null;
    }

    // Return config without sensitive data
    return {
      ...config,
      certificateFile: undefined,
      certificatePassword: undefined,
      softwarePin: undefined,
      technicalKey: undefined,
      hasSoftwareConfig: !!(config.softwareId && config.softwarePin),
      hasResolution: !!(config.resolutionNumber && config.resolutionPrefix),
      hasCertificate: !!config.certificateFile,
    };
  }

  /**
   * Create or update DIAN configuration
   */
  async createConfig(dto: CreateDianConfigDto) {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Creating DIAN config for tenant ${tenantId}`);

    const existing = await this.prisma.tenantDianConfig.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return this.updateConfig(dto);
    }

    const config = await this.prisma.tenantDianConfig.create({
      data: {
        tenantId,
        nit: dto.nit,
        dv: dto.dv,
        businessName: dto.businessName,
        tradeName: dto.tradeName,
        taxResponsibilities: dto.taxResponsibilities,
        economicActivity: dto.economicActivity,
        address: dto.address,
        city: dto.city,
        cityCode: dto.cityCode,
        department: dto.department,
        departmentCode: dto.departmentCode,
        postalCode: dto.postalCode,
        phone: dto.phone,
        email: dto.email,
        testMode: dto.testMode ?? true,
      },
    });

    return {
      ...config,
      certificateFile: undefined,
      certificatePassword: undefined,
      hasSoftwareConfig: false,
      hasResolution: false,
      hasCertificate: false,
    };
  }

  /**
   * Update DIAN configuration
   */
  async updateConfig(dto: UpdateDianConfigDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const config = await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: {
        ...dto,
      },
    });

    return {
      ...config,
      certificateFile: undefined,
      certificatePassword: undefined,
      softwarePin: undefined,
      technicalKey: undefined,
      hasSoftwareConfig: !!(config.softwareId && config.softwarePin),
      hasResolution: !!(config.resolutionNumber && config.resolutionPrefix),
      hasCertificate: !!config.certificateFile,
    };
  }

  /**
   * Set software credentials (from DIAN registration)
   */
  async setSoftwareCredentials(dto: SetDianSoftwareDto) {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Setting software credentials for tenant ${tenantId}`);

    const config = await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: {
        softwareId: dto.softwareId,
        softwarePin: dto.softwarePin,
        technicalKey: dto.technicalKey,
      },
    });

    return {
      success: true,
      message: 'Credenciales de software actualizadas',
    };
  }

  /**
   * Set resolution data (from DIAN authorization)
   */
  async setResolution(dto: SetDianResolutionDto) {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Setting resolution for tenant ${tenantId}`);

    await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: {
        resolutionNumber: dto.resolutionNumber,
        resolutionDate: new Date(dto.resolutionDate),
        resolutionPrefix: dto.resolutionPrefix,
        resolutionRangeFrom: dto.resolutionRangeFrom,
        resolutionRangeTo: dto.resolutionRangeTo,
        currentNumber: dto.resolutionRangeFrom,
      },
    });

    return {
      success: true,
      message: 'Resolucion configurada correctamente',
    };
  }

  /**
   * Upload digital certificate
   */
  async uploadCertificate(file: Buffer, password: string) {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Uploading certificate for tenant ${tenantId}`);

    // TODO: Validate certificate format and password
    // This would require a library like node-forge or pkcs12

    await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: {
        certificateFile: new Uint8Array(file),
        certificatePassword: password, // Should be encrypted in production
      },
    });

    return {
      success: true,
      message: 'Certificado digital cargado correctamente',
    };
  }

  // ============================================================================
  // DOCUMENT PROCESSING
  // ============================================================================

  /**
   * Process and send an invoice to DIAN
   */
  async processInvoice(
    invoiceId: string,
    force = false,
  ): Promise<ProcessInvoiceResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Processing invoice ${invoiceId} for DIAN`);

    // Get DIAN config
    const config = await this.prisma.tenantDianConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new BadRequestException(
        'Configuracion DIAN no encontrada. Configure primero los datos de facturacion electronica.',
      );
    }

    if (!config.softwareId || !config.technicalKey) {
      throw new BadRequestException(
        'Credenciales de software DIAN no configuradas.',
      );
    }

    if (!config.resolutionNumber || !config.resolutionPrefix) {
      throw new BadRequestException(
        'Resolucion de facturacion no configurada.',
      );
    }

    // Get invoice with details
    const invoice = (await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })) as InvoiceWithDetails | null;

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Check if already sent
    const existingDoc = await this.prisma.dianDocument.findFirst({
      where: { invoiceId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingDoc && existingDoc.status === 'ACCEPTED' && !force) {
      throw new BadRequestException(
        'Esta factura ya fue enviada y aceptada por la DIAN.',
      );
    }

    // Generate CUFE
    const customerDocument = invoice.customer?.documentNumber || '222222222222';
    const cufe = this.cufeGenerator.generateCufeFromInvoice(
      invoice,
      config,
      customerDocument,
    );

    // Generate QR Code data
    const qrCode = this.cufeGenerator.generateQrCodeData(
      invoice,
      config,
      cufe,
      customerDocument,
    );

    // Generate XML
    const xml = this.xmlGenerator.generateInvoiceXml({
      dianConfig: config,
      invoice,
      cufe,
      qrCode,
    });

    // Create document record
    const document = await this.prisma.dianDocument.create({
      data: {
        tenantId,
        invoiceId,
        documentType: DianDocumentType.FACTURA_ELECTRONICA,
        documentNumber: invoice.invoiceNumber,
        cufe,
        qrCode,
        status: DianDocumentStatus.GENERATED,
        xmlContent: xml,
      },
    });

    // TODO: Sign XML with digital certificate
    // For now, we'll use the unsigned XML (only valid for testing)
    const signedXml = xml; // Should be signed in production

    // Update document with signed XML
    await this.prisma.dianDocument.update({
      where: { id: document.id },
      data: {
        signedXml,
        status: DianDocumentStatus.SIGNED,
      },
    });

    // Send to DIAN
    const fileName = `fv${config.resolutionPrefix}${invoice.invoiceNumber}.xml`;
    const result = await this.dianClient.sendDocument(
      config,
      signedXml,
      fileName,
    );

    // Update document with result
    const finalStatus = result.success
      ? DianDocumentStatus.ACCEPTED
      : result.isValid === false
        ? DianDocumentStatus.REJECTED
        : DianDocumentStatus.SENT;

    await this.prisma.dianDocument.update({
      where: { id: document.id },
      data: {
        status: finalStatus,
        dianTrackId: result.trackId,
        dianResponse: result as any,
        errorMessage: result.errors?.join('; '),
        sentAt: new Date(),
        acceptedAt: result.success ? new Date() : undefined,
      },
    });

    // Update invoice with DIAN data
    if (result.success) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          dianCufe: cufe,
        },
      });
    }

    return {
      success: result.success,
      documentId: document.id,
      cufe,
      trackId: result.trackId,
      status: finalStatus,
      message: result.success
        ? 'Factura enviada y aceptada por la DIAN'
        : result.statusDescription || 'Error al enviar la factura',
      errors: result.errors,
    };
  }

  /**
   * Check the status of a DIAN document
   */
  async checkDocumentStatus(documentId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const document = await this.prisma.dianDocument.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (!document.dianTrackId && !document.cufe) {
      throw new BadRequestException(
        'El documento no tiene trackId ni CUFE para consultar',
      );
    }

    const config = await this.prisma.tenantDianConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new BadRequestException('Configuracion DIAN no encontrada');
    }

    const result = document.dianTrackId
      ? await this.dianClient.getDocumentStatus(config, document.dianTrackId)
      : await this.dianClient.getDocumentStatusByCufe(config, document.cufe!);

    // Update document status
    if (result.success) {
      const newStatus = result.isValid
        ? DianDocumentStatus.ACCEPTED
        : DianDocumentStatus.REJECTED;

      await this.prisma.dianDocument.update({
        where: { id: documentId },
        data: {
          status: newStatus,
          dianResponse: result as any,
          acceptedAt: result.isValid ? new Date() : undefined,
          errorMessage: result.errors?.join('; '),
        },
      });
    }

    return {
      documentId,
      ...result,
    };
  }

  // ============================================================================
  // DOCUMENT LISTING
  // ============================================================================

  /**
   * List DIAN documents with pagination
   */
  async listDocuments(
    page = 1,
    limit = 10,
    status?: DianDocumentStatus,
    fromDate?: Date,
    toDate?: Date,
  ) {
    const tenantId = this.tenantContext.requireTenantId();

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.dianDocument.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  documentNumber: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dianDocument.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const document = await this.prisma.dianDocument.findFirst({
      where: { id, tenantId },
      include: {
        invoice: {
          include: {
            customer: true,
            items: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return document;
  }

  /**
   * Download XML for a document
   */
  async downloadXml(id: string): Promise<{ xml: string; fileName: string }> {
    const tenantId = this.tenantContext.requireTenantId();

    const document = await this.prisma.dianDocument.findFirst({
      where: { id, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const xml = document.signedXml || document.xmlContent;

    if (!xml) {
      throw new BadRequestException('El documento no tiene XML generado');
    }

    return {
      xml,
      fileName: `${document.documentType}_${document.documentNumber}.xml`,
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get DIAN invoicing statistics
   */
  async getStats() {
    const tenantId = this.tenantContext.requireTenantId();

    const [total, accepted, rejected, pending] = await Promise.all([
      this.prisma.dianDocument.count({ where: { tenantId } }),
      this.prisma.dianDocument.count({
        where: { tenantId, status: DianDocumentStatus.ACCEPTED },
      }),
      this.prisma.dianDocument.count({
        where: { tenantId, status: DianDocumentStatus.REJECTED },
      }),
      this.prisma.dianDocument.count({
        where: {
          tenantId,
          status: {
            in: [
              DianDocumentStatus.PENDING,
              DianDocumentStatus.GENERATED,
              DianDocumentStatus.SIGNED,
              DianDocumentStatus.SENT,
            ],
          },
        },
      }),
    ]);

    const config = await this.prisma.tenantDianConfig.findUnique({
      where: { tenantId },
      select: {
        currentNumber: true,
        resolutionRangeFrom: true,
        resolutionRangeTo: true,
      },
    });

    const remainingNumbers = config
      ? (config.resolutionRangeTo || 0) - (config.currentNumber || 0) + 1
      : 0;

    return {
      total,
      accepted,
      rejected,
      pending,
      remainingNumbers,
      acceptanceRate: total > 0 ? ((accepted / total) * 100).toFixed(1) : 0,
    };
  }
}
