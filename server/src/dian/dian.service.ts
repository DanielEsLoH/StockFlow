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
import { XmlSignerService } from './services/xml-signer.service';
import {
  CreateDianConfigDto,
  UpdateDianConfigDto,
  SetDianSoftwareDto,
  SetDianResolutionDto,
  GenerateCreditNoteDto,
  GenerateDebitNoteDto,
  SetNoteConfigDto,
} from './dto';
import {
  DianDocumentStatus,
  DianDocumentType,
  CreditNoteReason,
  MovementType,
} from '@prisma/client';
import { DebitNoteItem } from './services/xml-generator.service';
import { AccountingBridgeService } from '../accounting/accounting-bridge.service';

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

    // Validate certificate format and password
    const validation = this.xmlSigner.validateCertificate(file, password);

    if (!validation.isValid) {
      throw new BadRequestException(
        validation.errors.join('. '),
      );
    }

    await this.prisma.tenantDianConfig.update({
      where: { tenantId },
      data: {
        certificateFile: new Uint8Array(file),
        certificatePassword: password,
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

    // Get config and validate
    const config = await this.getAndValidateConfig(tenantId);

    if (!config.creditNotePrefix) {
      throw new BadRequestException(
        'Prefijo de notas credito no configurado. Configure en DIAN > Configuracion > Notas.',
      );
    }

    // Get original invoice with details
    const invoice = await this.getInvoiceWithDetails(dto.invoiceId, tenantId);

    // Find original accepted DIAN document
    const originalDoc = await this.prisma.dianDocument.findFirst({
      where: {
        invoiceId: dto.invoiceId,
        tenantId,
        documentType: DianDocumentType.FACTURA_ELECTRONICA,
        status: DianDocumentStatus.ACCEPTED,
      },
    });

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

    // Generate XML with dynamic responseCode
    const xml = this.xmlGenerator.generateCreditNoteXml(
      {
        dianConfig: config,
        invoice: { ...noteInvoice, invoiceNumber: noteNumber } as any,
        cufe: cude,
        qrCode,
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

    const config = await this.getAndValidateConfig(tenantId);

    if (!config.debitNotePrefix) {
      throw new BadRequestException(
        'Prefijo de notas debito no configurado. Configure en DIAN > Configuracion > Notas.',
      );
    }

    // Get original invoice
    const invoice = await this.getInvoiceWithDetails(dto.invoiceId, tenantId);

    // Find original accepted DIAN document
    const originalDoc = await this.prisma.dianDocument.findFirst({
      where: {
        invoiceId: dto.invoiceId,
        tenantId,
        documentType: DianDocumentType.FACTURA_ELECTRONICA,
        status: DianDocumentStatus.ACCEPTED,
      },
    });

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

    // Generate XML — use a synthetic "invoice" with the note number
    const xml = this.xmlGenerator.generateDebitNoteXml(
      {
        dianConfig: config,
        invoice: { ...invoice, invoiceNumber: noteNumber } as any,
        cufe: cude,
        qrCode,
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
              select: { id: true, name: true },
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

  private signXmlIfCertificateAvailable(
    xml: string,
    config: { certificateFile: Uint8Array | null; certificatePassword: string | null },
  ): string {
    if (config.certificateFile && config.certificatePassword) {
      const certContents = this.xmlSigner.loadCertificate(
        Buffer.from(config.certificateFile),
        config.certificatePassword,
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
}
