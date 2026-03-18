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
  WithholdingTax,
} from './services/xml-generator.service';
import { CufeGeneratorService } from './services/cufe-generator.service';
import { DianClientService } from './services/dian-client.service';
import { XmlSignerService } from './services/xml-signer.service';
import {
  CreateDianConfigDto,
  UpdateDianConfigDto,
  SetDianSoftwareDto,
  SetDianResolutionDto,
  GenerateCreditNoteDto,
  GenerateDebitNoteDto,
  SetNoteConfigDto,
  ProcessPOSSaleDto,
  GenerateNotaAjusteDto,
  SetPosResolutionDto,
} from './dto';
import {
  DianDocumentStatus,
  DianDocumentType,
  CreditNoteReason,
  MovementType,
} from '@prisma/client';
import { DebitNoteItem } from './services/xml-generator.service';
import { AccountingBridgeService } from '../accounting/accounting-bridge.service';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt } from '../common/crypto.util';
import { EventXmlGeneratorService, type DianEventCode } from './services/event-xml-generator.service';

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
    private readonly xmlSigner: XmlSignerService,
    private readonly accountingBridge: AccountingBridgeService,
    private readonly eventXmlGenerator: EventXmlGeneratorService,
    private readonly configService: ConfigService,
  ) {}

  private getEncryptionSecret(): string {
    return this.configService.get<string>('jwt.secret') || 'stockflow-default-key';
  }

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

    // Validate certificate format and password
    const validation = this.xmlSigner.validateCertificate(file, password);

    if (!validation.isValid) {
      throw new BadRequestException(
        validation.errors.join('. '),
      );
    }

    const encryptedPassword = encrypt(password, this.getEncryptionSecret());

    await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: {
        certificateFile: new Uint8Array(file),
        certificatePassword: encryptedPassword,
      },
    });

    return {
      success: true,
      message: 'Certificado digital cargado correctamente',
      certificate: {
        subject: validation.subject,
        issuer: validation.issuer,
        validFrom: validation.validFrom,
        validTo: validation.validTo,
      },
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

    // Fetch config, invoice, and existing doc in parallel (all independent)
    const [config, invoice, existingDoc] = await Promise.all([
      this.prisma.tenantDianConfig.findUnique({
        where: { tenantId },
      }),
      this.prisma.invoice.findFirst({
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
      }) as Promise<InvoiceWithDetails | null>,
      this.prisma.dianDocument.findFirst({
        where: { invoiceId, tenantId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

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

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Validate invoice number is within resolution range
    if (config.resolutionRangeFrom && config.resolutionRangeTo) {
      const numMatch = invoice.invoiceNumber.match(/(\d+)$/);
      if (numMatch) {
        const invoiceNum = parseInt(numMatch[1], 10);
        if (invoiceNum > config.resolutionRangeTo) {
          throw new BadRequestException(
            `Número de factura ${invoice.invoiceNumber} excede el rango autorizado por la DIAN (${config.resolutionRangeFrom}-${config.resolutionRangeTo}). Debe solicitar una nueva resolución.`,
          );
        }
      }
    }

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

    // Calculate withholding taxes from accounting config
    const withholdings = await this.calculateWithholdings(
      tenantId,
      Number(invoice.subtotal) || 0,
      Number(invoice.tax) || 0,
    );

    // Generate XML
    const xml = this.xmlGenerator.generateInvoiceXml({
      dianConfig: config,
      invoice,
      cufe,
      qrCode,
      withholdings,
    });

    // Determine document type based on export flag
    const docType = invoice.isExport
      ? DianDocumentType.FACTURA_EXPORTACION
      : DianDocumentType.FACTURA_ELECTRONICA;

    // Create document record
    const document = await this.prisma.dianDocument.create({
      data: {
        tenantId,
        invoiceId,
        documentType: docType,
        documentNumber: invoice.invoiceNumber,
        cufe,
        qrCode,
        status: DianDocumentStatus.GENERATED,
        xmlContent: xml,
      },
    });

    // Sign XML with digital certificate (XAdES-BES)
    const signedXml = this.signXmlIfCertificateAvailable(xml, config);

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
   * Process and send a credit note to DIAN
   */
  async processCreditNote(
    dto: GenerateCreditNoteDto,
  ): Promise<ProcessInvoiceResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(
      `Processing credit note for invoice ${dto.invoiceId}`,
    );

    // Fetch config, invoice, and original doc in parallel (all independent)
    const [config, invoice, originalDoc] = await Promise.all([
      this.getAndValidateConfig(tenantId),
      this.getInvoiceWithDetails(dto.invoiceId, tenantId),
      this.prisma.dianDocument.findFirst({
        where: {
          invoiceId: dto.invoiceId,
          tenantId,
          documentType: DianDocumentType.FACTURA_ELECTRONICA,
          status: DianDocumentStatus.ACCEPTED,
        },
      }),
    ]);

    if (!config.creditNotePrefix) {
      throw new BadRequestException(
        'Prefijo de notas credito no configurado. Configure en DIAN > Configuracion > Notas.',
      );
    }

    if (!originalDoc) {
      throw new BadRequestException(
        'La factura original no ha sido aceptada por la DIAN. Solo se pueden crear notas credito para facturas aceptadas.',
      );
    }

    // Build credit note invoice data (clone items or filter partial)
    let noteInvoice: InvoiceWithDetails;
    if (dto.items && dto.items.length > 0) {
      // Partial credit — adjust quantities
      const adjustedItems = dto.items.map((creditItem) => {
        const originalItem = invoice.items.find(
          (i) => i.id === creditItem.invoiceItemId,
        );
        if (!originalItem) {
          throw new BadRequestException(
            `Item ${creditItem.invoiceItemId} no encontrado en la factura original`,
          );
        }
        if (creditItem.quantity > Number(originalItem.quantity)) {
          throw new BadRequestException(
            `Cantidad a acreditar (${creditItem.quantity}) excede la cantidad original (${originalItem.quantity})`,
          );
        }
        const ratio = creditItem.quantity / Number(originalItem.quantity);
        return {
          ...originalItem,
          quantity: creditItem.quantity as any,
          subtotal: (Number(originalItem.subtotal) * ratio) as any,
          tax: (Number(originalItem.tax) * ratio) as any,
          total: (Number(originalItem.total) * ratio) as any,
        };
      });

      const subtotal = adjustedItems.reduce(
        (sum, i) => sum + Number(i.subtotal),
        0,
      );
      const tax = adjustedItems.reduce((sum, i) => sum + Number(i.tax), 0);
      const total = subtotal + tax;

      noteInvoice = {
        ...invoice,
        items: adjustedItems,
        subtotal: subtotal as any,
        tax: tax as any,
        total: total as any,
      };
    } else {
      // Full credit — clone all items
      noteInvoice = { ...invoice };
    }

    // Generate note number atomically
    const noteNumber = `${config.creditNotePrefix}${String(config.creditNoteCurrentNumber).padStart(8, '0')}`;

    // Generate CUDE
    const customerDocument =
      invoice.customer?.documentNumber || '222222222222';
    const issueDate = new Date();
    const cude = this.cufeGenerator.generateCude({
      documentNumber: noteNumber,
      issueDate,
      issueTime: issueDate.toISOString().split('T')[1].split('.')[0] + '-05:00',
      subtotal: Number(noteInvoice.subtotal),
      tax01: Number(noteInvoice.tax),
      tax04: 0,
      tax03: 0,
      total: Number(noteInvoice.total),
      supplierNit: config.nit,
      customerDocument,
      softwarePin: config.softwarePin || '',
      testMode: config.testMode,
    });

    // Generate QR code data for credit note
    const qrCode = `NumFac: ${noteNumber}\nFecFac: ${issueDate.toISOString().split('T')[0]}\nNitFac: ${config.nit}\nDocAdq: ${customerDocument}\nValFac: ${Number(noteInvoice.total).toFixed(2)}\nCUDE: ${cude}\nQRCode: https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cude}`;

    // Calculate withholdings for credit note
    const cnWithholdings = await this.calculateWithholdings(
      tenantId,
      Number(noteInvoice.subtotal) || 0,
      Number(noteInvoice.tax) || 0,
    );

    // Generate XML with dynamic responseCode
    const xml = this.xmlGenerator.generateCreditNoteXml(
      {
        dianConfig: config,
        invoice: { ...noteInvoice, invoiceNumber: noteNumber } as any,
        cufe: cude,
        qrCode,
        withholdings: cnWithholdings,
      },
      invoice,
      dto.reason,
      dto.reasonCode,
    );

    // Create document and increment number atomically
    const [document] = await this.prisma.$transaction([
      this.prisma.dianDocument.create({
        data: {
          tenantId,
          invoiceId: dto.invoiceId,
          originalDianDocumentId: originalDoc.id,
          documentType: DianDocumentType.NOTA_CREDITO,
          documentNumber: noteNumber,
          cude,
          creditNoteReason: dto.reason,
          qrCode,
          status: DianDocumentStatus.GENERATED,
          xmlContent: xml,
        },
      }),
      this.prisma.tenantDianConfig.update({
        where: { tenantId },
        data: { creditNoteCurrentNumber: { increment: 1 } },
      }),
    ]);

    // Sign XML
    const signedXml = this.signXmlIfCertificateAvailable(xml, config);

    // Update with signed XML
    await this.prisma.dianDocument.update({
      where: { id: document.id },
      data: { signedXml, status: DianDocumentStatus.SIGNED },
    });

    // Send to DIAN
    const fileName = `nc${noteNumber}.xml`;
    const result = await this.dianClient.sendDocument(
      config,
      signedXml,
      fileName,
    );

    // Update document status
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

    // Fire-and-forget: accounting entry + stock reversal
    if (result.success) {
      this.accountingBridge.onCreditNoteCreated({
        tenantId,
        dianDocumentId: document.id,
        noteNumber,
        invoiceNumber: invoice.invoiceNumber,
        subtotal: Number(noteInvoice.subtotal),
        tax: Number(noteInvoice.tax),
        total: Number(noteInvoice.total),
        reasonCode: dto.reasonCode,
        items: noteInvoice.items.map((i) => ({
          productId: i.product?.id ?? null,
          quantity: Number(i.quantity),
          product: i.product ? { costPrice: (i as any).product?.costPrice ?? 0 } : null,
        })),
      }).catch(() => {});

      this.restoreStockForCreditNote(tenantId, invoice, noteInvoice, dto.reasonCode).catch(() => {});
    }

    return {
      success: result.success,
      documentId: document.id,
      cufe: cude,
      trackId: result.trackId,
      status: finalStatus,
      message: result.success
        ? 'Nota credito enviada y aceptada por la DIAN'
        : result.statusDescription || 'Error al enviar la nota credito',
      errors: result.errors,
    };
  }

  /**
   * Process and send a debit note to DIAN
   */
  async processDebitNote(
    dto: GenerateDebitNoteDto,
  ): Promise<ProcessInvoiceResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(
      `Processing debit note for invoice ${dto.invoiceId}`,
    );

    // Fetch config, invoice, and original doc in parallel (all independent)
    const [config, invoice, originalDoc] = await Promise.all([
      this.getAndValidateConfig(tenantId),
      this.getInvoiceWithDetails(dto.invoiceId, tenantId),
      this.prisma.dianDocument.findFirst({
        where: {
          invoiceId: dto.invoiceId,
          tenantId,
          documentType: DianDocumentType.FACTURA_ELECTRONICA,
          status: DianDocumentStatus.ACCEPTED,
        },
      }),
    ]);

    if (!config.debitNotePrefix) {
      throw new BadRequestException(
        'Prefijo de notas debito no configurado. Configure en DIAN > Configuracion > Notas.',
      );
    }

    if (!originalDoc) {
      throw new BadRequestException(
        'La factura original no ha sido aceptada por la DIAN.',
      );
    }

    // Generate note number
    const noteNumber = `${config.debitNotePrefix}${String(config.debitNoteCurrentNumber).padStart(8, '0')}`;

    // Calculate totals from debit note items
    const debitItems: DebitNoteItem[] = dto.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: i.taxRate,
    }));

    let subtotal = 0;
    let totalTax = 0;
    for (const item of debitItems) {
      const lineSubtotal = item.quantity * item.unitPrice;
      subtotal += lineSubtotal;
      totalTax += lineSubtotal * (item.taxRate / 100);
    }
    const total = subtotal + totalTax;

    // Generate CUDE
    const customerDocument =
      invoice.customer?.documentNumber || '222222222222';
    const issueDate = new Date();
    const cude = this.cufeGenerator.generateCude({
      documentNumber: noteNumber,
      issueDate,
      issueTime: issueDate.toISOString().split('T')[1].split('.')[0] + '-05:00',
      subtotal,
      tax01: totalTax,
      tax04: 0,
      tax03: 0,
      total,
      supplierNit: config.nit,
      customerDocument,
      softwarePin: config.softwarePin || '',
      testMode: config.testMode,
    });

    const qrCode = `NumFac: ${noteNumber}\nFecFac: ${new Date().toISOString().split('T')[0]}\nNitFac: ${config.nit}\nDocAdq: ${customerDocument}\nValFac: ${total.toFixed(2)}\nCUDE: ${cude}\nQRCode: https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cude}`;

    // Calculate withholdings for debit note
    const dnWithholdings = await this.calculateWithholdings(
      tenantId,
      subtotal,
      totalTax,
    );

    // Generate XML — use a synthetic "invoice" with the note number
    const xml = this.xmlGenerator.generateDebitNoteXml(
      {
        dianConfig: config,
        invoice: { ...invoice, invoiceNumber: noteNumber } as any,
        cufe: cude,
        qrCode,
        withholdings: dnWithholdings,
      },
      invoice,
      dto.reason,
      dto.reasonCode,
      debitItems,
    );

    // Create document and increment number atomically
    const [document] = await this.prisma.$transaction([
      this.prisma.dianDocument.create({
        data: {
          tenantId,
          invoiceId: dto.invoiceId,
          originalDianDocumentId: originalDoc.id,
          documentType: DianDocumentType.NOTA_DEBITO,
          documentNumber: noteNumber,
          cude,
          creditNoteReason: dto.reason,
          qrCode,
          status: DianDocumentStatus.GENERATED,
          xmlContent: xml,
        },
      }),
      this.prisma.tenantDianConfig.update({
        where: { tenantId },
        data: { debitNoteCurrentNumber: { increment: 1 } },
      }),
    ]);

    // Sign XML
    const signedXml = this.signXmlIfCertificateAvailable(xml, config);

    await this.prisma.dianDocument.update({
      where: { id: document.id },
      data: { signedXml, status: DianDocumentStatus.SIGNED },
    });

    // Send to DIAN
    const fileName = `nd${noteNumber}.xml`;
    const result = await this.dianClient.sendDocument(
      config,
      signedXml,
      fileName,
    );

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

    // Fire-and-forget: accounting entry
    if (result.success) {
      this.accountingBridge.onDebitNoteCreated({
        tenantId,
        dianDocumentId: document.id,
        noteNumber,
        invoiceNumber: invoice.invoiceNumber,
        subtotal,
        tax: totalTax,
        total,
      }).catch(() => {});
    }

    return {
      success: result.success,
      documentId: document.id,
      cufe: cude,
      trackId: result.trackId,
      status: finalStatus,
      message: result.success
        ? 'Nota debito enviada y aceptada por la DIAN'
        : result.statusDescription || 'Error al enviar la nota debito',
      errors: result.errors,
    };
  }

  /**
   * Configure note numbering (prefixes and starting numbers)
   */
  async setNoteConfig(dto: SetNoteConfigDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const data: any = {};
    if (dto.creditNotePrefix !== undefined)
      data.creditNotePrefix = dto.creditNotePrefix;
    if (dto.creditNoteStartNumber !== undefined)
      data.creditNoteCurrentNumber = dto.creditNoteStartNumber;
    if (dto.debitNotePrefix !== undefined)
      data.debitNotePrefix = dto.debitNotePrefix;
    if (dto.debitNoteStartNumber !== undefined)
      data.debitNoteCurrentNumber = dto.debitNoteStartNumber;

    await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data,
    });

    return {
      success: true,
      message: 'Configuracion de notas actualizada',
    };
  }

  // ============================================================================
  // POS DOCUMENTO EQUIVALENTE
  // ============================================================================

  /**
   * Process a POS sale as Documento Equivalente Electronico
   */
  async processPOSSale(dto: ProcessPOSSaleDto): Promise<ProcessInvoiceResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Processing POS sale ${dto.invoiceId} as documento equivalente`);

    // Get DIAN config
    const config = await this.prisma.tenantDianConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      throw new BadRequestException(
        'Configuracion DIAN no encontrada. Configure primero los datos de facturacion electronica.',
      );
    }

    if (!config.posResolutionNumber || !config.posResolutionPrefix) {
      throw new BadRequestException(
        'Resolucion POS no configurada. Configure primero la resolucion de documento equivalente.',
      );
    }

    // Get invoice with details
    const invoice = (await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
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
      where: { invoiceId: dto.invoiceId, tenantId, documentType: DianDocumentType.DOCUMENTO_EQUIVALENTE },
      orderBy: { createdAt: 'desc' },
    });

    if (existingDoc && existingDoc.status === 'ACCEPTED' && !dto.force) {
      throw new BadRequestException(
        'Esta factura ya fue enviada como documento equivalente y aceptada por la DIAN.',
      );
    }

    // Generate document number
    const documentNumber = `${config.posResolutionPrefix}${String(config.posCurrentNumber).padStart(8, '0')}`;

    // Generate CUDE (NOT CUFE — documento equivalente uses softwarePin, not technicalKey)
    const customerDocument = invoice.customer?.documentNumber || '222222222222';
    const issueDate = new Date();
    const cude = this.cufeGenerator.generateCude({
      documentNumber,
      issueDate,
      issueTime: issueDate.toISOString().split('T')[1].split('.')[0] + '-05:00',
      subtotal: Number(invoice.subtotal),
      tax01: Number(invoice.tax),
      tax04: 0,
      tax03: 0,
      total: Number(invoice.total),
      supplierNit: config.nit,
      customerDocument,
      softwarePin: config.softwarePin || '',
      testMode: config.testMode,
    });

    // Generate QR code data
    const qrCode = this.cufeGenerator.generateQrCodeData(
      { ...invoice, invoiceNumber: documentNumber } as any,
      config,
      cude,
      customerDocument,
    );

    // Calculate withholdings for POS document
    const posWithholdings = await this.calculateWithholdings(
      tenantId,
      Number(invoice.subtotal) || 0,
      Number(invoice.tax) || 0,
    );

    // Generate Documento Equivalente XML
    const xml = this.xmlGenerator.generateDocumentoEquivalenteXml({
      dianConfig: config,
      invoice: { ...invoice, invoiceNumber: documentNumber } as any,
      cufe: cude,
      qrCode,
      withholdings: posWithholdings,
    });

    // Create document record
    const document = await this.prisma.dianDocument.create({
      data: {
        tenantId,
        invoiceId: dto.invoiceId,
        documentType: DianDocumentType.DOCUMENTO_EQUIVALENTE,
        documentNumber,
        cude,
        qrCode,
        status: DianDocumentStatus.GENERATED,
        xmlContent: xml,
      },
    });

    // Sign XML with digital certificate
    const signedXml = this.signXmlIfCertificateAvailable(xml, config);

    await this.prisma.dianDocument.update({
      where: { id: document.id },
      data: { signedXml, status: DianDocumentStatus.SIGNED },
    });

    // Send to DIAN
    const fileName = `de${config.posResolutionPrefix}${documentNumber}.xml`;
    const result = await this.dianClient.sendDocument(config, signedXml, fileName);

    // Update document status
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

    // Increment POS current number
    await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: { posCurrentNumber: { increment: 1 } },
    });

    // Update invoice with CUDE
    if (result.success) {
      await this.prisma.invoice.update({
        where: { id: dto.invoiceId },
        data: { dianCufe: cude },
      });
    }

    return {
      success: result.success,
      documentId: document.id,
      cufe: cude,
      trackId: result.trackId,
      status: finalStatus,
      message: result.success
        ? 'Documento equivalente enviado y aceptado por la DIAN'
        : result.statusDescription || 'Error al enviar el documento equivalente',
      errors: result.errors,
    };
  }

  /**
   * Process a Nota de Ajuste for a Documento Equivalente
   */
  async processNotaAjuste(dto: GenerateNotaAjusteDto): Promise<ProcessInvoiceResult> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Processing nota de ajuste for documento equivalente ${dto.documentoEquivalenteId}`);

    // Get config and validate
    const config = await this.getAndValidateConfig(tenantId);

    if (!config.posNotePrefix) {
      throw new BadRequestException(
        'Prefijo de notas de ajuste POS no configurado. Configure en DIAN > Configuracion > Resolucion POS.',
      );
    }

    // Find original Documento Equivalente
    const originalDoc = await this.prisma.dianDocument.findFirst({
      where: {
        id: dto.documentoEquivalenteId,
        tenantId,
        documentType: DianDocumentType.DOCUMENTO_EQUIVALENTE,
        status: DianDocumentStatus.ACCEPTED,
      },
    });

    if (!originalDoc) {
      throw new BadRequestException(
        'Documento equivalente original no encontrado o no ha sido aceptado por la DIAN.',
      );
    }

    if (!originalDoc.invoiceId) {
      throw new BadRequestException(
        'El documento equivalente no tiene factura asociada.',
      );
    }

    // Get original invoice with details
    const invoice = await this.getInvoiceWithDetails(originalDoc.invoiceId, tenantId);

    // Build note invoice data (clone items or filter partial)
    let noteInvoice: InvoiceWithDetails;
    if (dto.items && dto.items.length > 0) {
      // Partial adjustment — filter and adjust quantities
      const adjustedItems = dto.items.map((noteItem) => {
        const originalItem = invoice.items.find(
          (i) => i.id === noteItem.invoiceItemId,
        );
        if (!originalItem) {
          throw new BadRequestException(
            `Item ${noteItem.invoiceItemId} no encontrado en la factura original`,
          );
        }
        if (noteItem.quantity > Number(originalItem.quantity)) {
          throw new BadRequestException(
            `Cantidad a ajustar (${noteItem.quantity}) excede la cantidad original (${originalItem.quantity})`,
          );
        }
        const ratio = noteItem.quantity / Number(originalItem.quantity);
        return {
          ...originalItem,
          quantity: noteItem.quantity as any,
          subtotal: (Number(originalItem.subtotal) * ratio) as any,
          tax: (Number(originalItem.tax) * ratio) as any,
          total: (Number(originalItem.total) * ratio) as any,
        };
      });

      const subtotal = adjustedItems.reduce(
        (sum, i) => sum + Number(i.subtotal),
        0,
      );
      const tax = adjustedItems.reduce((sum, i) => sum + Number(i.tax), 0);
      const total = subtotal + tax;

      noteInvoice = {
        ...invoice,
        items: adjustedItems,
        subtotal: subtotal as any,
        tax: tax as any,
        total: total as any,
      };
    } else {
      // Full adjustment — clone all items
      noteInvoice = { ...invoice };
    }

    // Generate note number
    const noteNumber = `${config.posNotePrefix}${String(config.posNoteCurrentNumber).padStart(8, '0')}`;

    // Generate CUDE (uses softwarePin, NOT technicalKey)
    const customerDocument = invoice.customer?.documentNumber || '222222222222';
    const issueDate = new Date();
    const cude = this.cufeGenerator.generateCude({
      documentNumber: noteNumber,
      issueDate,
      issueTime: issueDate.toISOString().split('T')[1].split('.')[0] + '-05:00',
      subtotal: Number(noteInvoice.subtotal),
      tax01: Number(noteInvoice.tax),
      tax04: 0,
      tax03: 0,
      total: Number(noteInvoice.total),
      supplierNit: config.nit,
      customerDocument,
      softwarePin: config.softwarePin || '',
      testMode: config.testMode,
    });

    // Generate QR code data
    const qrCode = `NumFac: ${noteNumber}\nFecFac: ${issueDate.toISOString().split('T')[0]}\nNitFac: ${config.nit}\nDocAdq: ${customerDocument}\nValFac: ${Number(noteInvoice.total).toFixed(2)}\nCUDE: ${cude}\nQRCode: https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cude}`;

    // Calculate withholdings for nota de ajuste
    const naWithholdings = await this.calculateWithholdings(
      tenantId,
      Number(noteInvoice.subtotal) || 0,
      Number(noteInvoice.tax) || 0,
    );

    // Generate Nota de Ajuste XML
    const xml = this.xmlGenerator.generateNotaAjusteXml(
      {
        dianConfig: config,
        invoice: { ...noteInvoice, invoiceNumber: noteNumber } as any,
        cufe: cude,
        qrCode,
        withholdings: naWithholdings,
      },
      {
        documentNumber: originalDoc.documentNumber,
        cude: originalDoc.cude || '',
        issueDate: originalDoc.createdAt,
      },
      dto.reason,
      dto.reasonCode,
    );

    // Create document and increment number atomically
    const [document] = await this.prisma.$transaction([
      this.prisma.dianDocument.create({
        data: {
          tenantId,
          invoiceId: originalDoc.invoiceId,
          originalDianDocumentId: originalDoc.id,
          documentType: DianDocumentType.NOTA_AJUSTE,
          documentNumber: noteNumber,
          cude,
          creditNoteReason: dto.reason,
          qrCode,
          status: DianDocumentStatus.GENERATED,
          xmlContent: xml,
        },
      }),
      this.prisma.tenantDianConfig.update({
        where: { tenantId },
        data: { posNoteCurrentNumber: { increment: 1 } },
      }),
    ]);

    // Sign XML
    const signedXml = this.signXmlIfCertificateAvailable(xml, config);

    await this.prisma.dianDocument.update({
      where: { id: document.id },
      data: { signedXml, status: DianDocumentStatus.SIGNED },
    });

    // Send to DIAN
    const fileName = `na${noteNumber}.xml`;
    const result = await this.dianClient.sendDocument(config, signedXml, fileName);

    // Update document status
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

    return {
      success: result.success,
      documentId: document.id,
      cufe: cude,
      trackId: result.trackId,
      status: finalStatus,
      message: result.success
        ? 'Nota de ajuste enviada y aceptada por la DIAN'
        : result.statusDescription || 'Error al enviar la nota de ajuste',
      errors: result.errors,
    };
  }

  /**
   * Set POS resolution configuration for Documento Equivalente
   */
  async setPosResolution(dto: SetPosResolutionDto) {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.log(`Setting POS resolution for tenant ${tenantId}`);

    // Ensure DIAN config exists first
    const existing = await this.prisma.tenantDianConfig.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      throw new BadRequestException(
        'Configuracion DIAN no encontrada. Cree primero la configuracion basica antes de configurar la resolucion POS.',
      );
    }

    const config = await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: {
        posResolutionNumber: dto.posResolutionNumber,
        posResolutionDate: dto.posResolutionDate ? new Date(dto.posResolutionDate) : undefined,
        posResolutionPrefix: dto.posResolutionPrefix,
        posResolutionRangeFrom: dto.posResolutionRangeFrom,
        posResolutionRangeTo: dto.posResolutionRangeTo,
        posCurrentNumber: dto.posResolutionRangeFrom,
        posNotePrefix: dto.posNotePrefix,
      },
    });

    return {
      success: true,
      message: 'Resolucion POS configurada correctamente',
      config: {
        posResolutionNumber: config.posResolutionNumber,
        posResolutionPrefix: config.posResolutionPrefix,
        posResolutionRangeFrom: config.posResolutionRangeFrom,
        posResolutionRangeTo: config.posResolutionRangeTo,
        posCurrentNumber: config.posCurrentNumber,
        posNotePrefix: config.posNotePrefix,
      },
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  /**
   * Restore stock for credit notes that represent returns (DEVOLUCION_PARCIAL/TOTAL).
   * Only runs when the original invoice has a warehouseId.
   */
  private async restoreStockForCreditNote(
    tenantId: string,
    originalInvoice: InvoiceWithDetails,
    noteInvoice: InvoiceWithDetails,
    reasonCode: string,
  ): Promise<void> {
    try {
      if (reasonCode !== 'DEVOLUCION_PARCIAL' && reasonCode !== 'DEVOLUCION_TOTAL') return;
      if (!originalInvoice.warehouseId) return;

      const warehouseId = originalInvoice.warehouseId;
      const itemsToRestore = noteInvoice.items.filter((i) => i.product?.id && Number(i.quantity) > 0);
      if (itemsToRestore.length === 0) return;

      await this.prisma.$transaction(async (tx) => {
        for (const item of itemsToRestore) {
          const productId = item.product!.id;
          const qty = Number(item.quantity);

          // Increment product stock
          await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: qty } },
          });

          // Increment warehouse stock
          await tx.warehouseStock.upsert({
            where: { warehouseId_productId: { warehouseId, productId } },
            create: { warehouseId, productId, quantity: qty, tenantId },
            update: { quantity: { increment: qty } },
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId,
              warehouseId,
              type: MovementType.RETURN,
              quantity: qty,
              reason: `Devolucion por nota credito`,
            },
          });
        }
      });

      this.logger.debug(`Stock restored for ${itemsToRestore.length} items from credit note`);
    } catch (error) {
      this.logger.error(
        'Failed to restore stock for credit note',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async getAndValidateConfig(tenantId: string) {
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

    return config;
  }

  private async getInvoiceWithDetails(invoiceId: string, tenantId: string) {
    const invoice = (await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, costPrice: true },
            },
          },
        },
      },
    })) as InvoiceWithDetails | null;

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    return invoice;
  }

  // ============================================================================
  // DIAN EVENTS (ApplicationResponse)
  // ============================================================================

  async sendEvent(
    documentId: string,
    eventCode: DianEventCode,
    rejectionReason?: string,
  ) {
    const tenantId = this.tenantContext.requireTenantId();

    // Get the original DIAN document
    const dianDoc = await this.prisma.dianDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { invoice: { include: { customer: true } } },
    });

    if (!dianDoc) throw new NotFoundException('Documento DIAN no encontrado');
    if (!dianDoc.cufe) throw new BadRequestException('El documento no tiene CUFE');

    if (eventCode === '031' && !rejectionReason) {
      throw new BadRequestException('Se requiere motivo del reclamo para evento 031');
    }

    // Fetch config and tenant in parallel (both independent, only need tenantId)
    const [config, tenant] = await Promise.all([
      this.prisma.tenantDianConfig.findUnique({ where: { tenantId } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
    ]);
    if (!config) throw new BadRequestException('Configuración DIAN no encontrada');
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Determine sender/receiver based on event type
    // For received invoices: sender=us, receiver=invoice issuer
    // For our own invoices: sender=customer, receiver=us
    const senderNit = config.nit;
    const senderDv = config.dv;
    const senderName = config.businessName;
    const receiverNit = dianDoc.invoice?.customer?.documentNumber ?? '';
    const receiverDv = dianDoc.invoice?.customer?.dv ?? '';
    const receiverName = dianDoc.invoice?.customer?.name ?? '';

    const ambiente = config.testMode ? '2' : '1';

    // Generate ApplicationResponse XML
    const { xml, cude, documentNumber } =
      this.eventXmlGenerator.generateApplicationResponseXml({
        senderNit,
        senderDv,
        senderName,
        receiverNit,
        receiverDv,
        receiverName,
        invoiceNumber: dianDoc.documentNumber,
        invoiceCufe: dianDoc.cufe,
        invoiceIssueDate: dianDoc.createdAt.toISOString().split('T')[0],
        eventCode,
        rejectionReason,
        softwareId: config.softwareId ?? '',
        softwarePin: config.softwarePin ?? '',
        ambiente: ambiente as '1' | '2',
      });

    // Create event document record
    const eventDoc = await this.prisma.dianDocument.create({
      data: {
        tenantId,
        invoiceId: dianDoc.invoiceId,
        originalDianDocumentId: dianDoc.id,
        documentType: DianDocumentType.EVENTO,
        documentNumber,
        cude,
        status: DianDocumentStatus.GENERATED,
        xmlContent: xml,
      },
    });

    // Sign XML
    const signedXml = this.signXmlIfCertificateAvailable(xml, config);

    await this.prisma.dianDocument.update({
      where: { id: eventDoc.id },
      data: { signedXml, status: DianDocumentStatus.SIGNED },
    });

    // Send to DIAN
    const fileName = `ar${documentNumber}.xml`;
    const result = await this.dianClient.sendDocument(config, signedXml, fileName);

    const finalStatus = result.success
      ? DianDocumentStatus.ACCEPTED
      : result.isValid === false
        ? DianDocumentStatus.REJECTED
        : DianDocumentStatus.SENT;

    await this.prisma.dianDocument.update({
      where: { id: eventDoc.id },
      data: {
        status: finalStatus,
        dianTrackId: result.trackId,
        dianResponse: result as any,
        errorMessage: result.errors?.join('; '),
        sentAt: new Date(),
        acceptedAt: result.success ? new Date() : undefined,
      },
    });

    this.logger.log(
      `Evento ${eventCode} enviado para documento ${dianDoc.documentNumber}: ${finalStatus}`,
    );

    return {
      success: result.success,
      eventDocumentId: eventDoc.id,
      cude,
      trackId: result.trackId,
      status: finalStatus,
      message: result.success
        ? `Evento ${eventCode} enviado y aceptado por la DIAN`
        : result.statusDescription || 'Error al enviar el evento',
      errors: result.errors,
    };
  }

  async sendEventByInvoice(
    invoiceId: string,
    eventCode: DianEventCode,
    rejectionReason?: string,
  ) {
    const tenantId = this.tenantContext.requireTenantId();

    // Find the primary DIAN document for this invoice (factura or documento equivalente)
    const dianDoc = await this.prisma.dianDocument.findFirst({
      where: {
        invoiceId,
        tenantId,
        documentType: {
          in: [DianDocumentType.FACTURA_ELECTRONICA, DianDocumentType.DOCUMENTO_EQUIVALENTE],
        },
        status: DianDocumentStatus.ACCEPTED,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!dianDoc) {
      throw new NotFoundException('No se encontró documento DIAN aceptado para esta factura');
    }

    return this.sendEvent(dianDoc.id, eventCode, rejectionReason);
  }

  private signXmlIfCertificateAvailable(
    xml: string,
    config: { certificateFile: Uint8Array | null; certificatePassword: string | null },
  ): string {
    if (config.certificateFile && config.certificatePassword) {
      let password = config.certificatePassword;
      try {
        password = decrypt(config.certificatePassword, this.getEncryptionSecret());
      } catch {
        // Password might not be encrypted yet (legacy data), use as-is
        this.logger.debug('Certificate password not encrypted, using raw value');
      }
      const certContents = this.xmlSigner.loadCertificate(
        Buffer.from(config.certificateFile),
        password,
      );
      return this.xmlSigner.signXml(
        xml,
        certContents.privateKeyPem,
        certContents.certDerBase64,
        certContents.certDigestBase64,
        certContents.issuerName,
        certContents.serialNumber,
      );
    }
    this.logger.warn(
      'Certificate not configured — sending unsigned XML (test mode only)',
    );
    return xml;
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
    documentType?: DianDocumentType,
  ) {
    const tenantId = this.tenantContext.requireTenantId();

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (documentType) {
      where.documentType = documentType;
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

  /**
   * Calculate withholding taxes from AccountingConfig for XML generation.
   * Returns only applicable withholdings (enabled + amount exceeds min base).
   */
  private async calculateWithholdings(
    tenantId: string,
    subtotal: number,
    tax: number,
  ): Promise<WithholdingTax[]> {
    const config = await this.prisma.accountingConfig.findUnique({
      where: { tenantId },
    });

    if (!config) return [];

    const withholdings: WithholdingTax[] = [];

    // ReteFuente (code 06) — applies on subtotal
    const reteFuenteRate = Number(config.reteFuentePurchaseRate) || 0;
    const reteFuenteMinBase = Number(config.reteFuenteMinBase) || 0;
    if (reteFuenteRate > 0 && subtotal >= reteFuenteMinBase) {
      withholdings.push({
        schemeId: '06',
        schemeName: 'ReteRenta',
        taxableAmount: subtotal,
        taxAmount: Math.round(subtotal * reteFuenteRate * 100) / 100,
        percent: reteFuenteRate * 100,
      });
    }

    // ReteICA (code 05) — applies on subtotal
    const reteIcaEnabled = config.reteIcaEnabled;
    const reteIcaRate = Number(config.reteIcaRate) || 0;
    const reteIcaMinBase = Number(config.reteIcaMinBase) || 0;
    if (reteIcaEnabled && reteIcaRate > 0 && subtotal >= reteIcaMinBase) {
      withholdings.push({
        schemeId: '05',
        schemeName: 'ReteICA',
        taxableAmount: subtotal,
        taxAmount: Math.round(subtotal * reteIcaRate * 100) / 100,
        percent: reteIcaRate * 100,
      });
    }

    // ReteIVA (code 07) — applies on IVA amount
    const reteIvaEnabled = config.reteIvaEnabled;
    const reteIvaRate = Number(config.reteIvaRate) || 0;
    const reteIvaMinBase = Number(config.reteIvaMinBase) || 0;
    if (reteIvaEnabled && reteIvaRate > 0 && tax >= reteIvaMinBase) {
      withholdings.push({
        schemeId: '07',
        schemeName: 'ReteIVA',
        taxableAmount: tax,
        taxAmount: Math.round(tax * reteIvaRate * 100) / 100,
        percent: reteIvaRate * 100,
      });
    }

    return withholdings;
  }
}
