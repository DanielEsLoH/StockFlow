import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DianService } from './dian.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common';
import { XmlGeneratorService } from './services/xml-generator.service';
import { CufeGeneratorService } from './services/cufe-generator.service';
import { DianClientService } from './services/dian-client.service';
import { XmlSignerService } from './services/xml-signer.service';
import { AccountingBridgeService } from '../accounting/accounting-bridge.service';
import { DianDocumentStatus, DianDocumentType } from '@prisma/client';

describe('DianService', () => {
  let service: DianService;
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let xmlGenerator: jest.Mocked<XmlGeneratorService>;
  let cufeGenerator: jest.Mocked<CufeGeneratorService>;
  let dianClient: jest.Mocked<DianClientService>;
  let xmlSigner: jest.Mocked<XmlSignerService>;
  let accountingBridge: jest.Mocked<AccountingBridgeService>;

  const mockTenantId = 'tenant-123';

  const mockDianConfig = {
    id: 'config-123',
    tenantId: mockTenantId,
    nit: '900123456',
    dv: '7',
    businessName: 'Test Company S.A.S',
    tradeName: 'Test Company',
    taxResponsibilities: ['O-15'],
    economicActivity: '4711',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    cityCode: '11001',
    department: 'Bogota D.C.',
    departmentCode: '11',
    postalCode: '110111',
    phone: '3001234567',
    email: 'test@company.com',
    testMode: true,
    softwareId: 'software-123',
    softwarePin: 'pin-123',
    technicalKey: 'key-123',
    resolutionNumber: '18760000001',
    resolutionDate: new Date('2024-01-01'),
    resolutionPrefix: 'SETT',
    resolutionRangeFrom: 1,
    resolutionRangeTo: 5000000,
    currentNumber: 100,
    certificateFile: null,
    certificatePassword: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoice = {
    id: 'invoice-123',
    tenantId: mockTenantId,
    invoiceNumber: 'INV-00001',
    total: 119000,
    subtotal: 100000,
    tax: 19000,
    issueDate: new Date(),
    customer: {
      id: 'customer-123',
      name: 'Test Customer',
      documentNumber: '123456789',
    },
    items: [
      {
        id: 'item-123',
        productId: 'product-123',
        product: { id: 'product-123', name: 'Test Product' },
        quantity: 1,
        unitPrice: 100000,
        taxRate: 19,
        discount: 0,
        subtotal: 100000,
        tax: 19000,
        total: 119000,
      },
    ],
  };

  const mockDianDocument = {
    id: 'document-123',
    tenantId: mockTenantId,
    invoiceId: 'invoice-123',
    documentType: DianDocumentType.FACTURA_ELECTRONICA,
    documentNumber: 'INV-00001',
    cufe: 'cufe-123',
    qrCode: 'qrcode-data',
    status: DianDocumentStatus.ACCEPTED,
    xmlContent: '<xml>content</xml>',
    signedXml: '<xml>signed</xml>',
    dianTrackId: 'track-123',
    dianResponse: null,
    errorMessage: null,
    sentAt: new Date(),
    acceptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      tenantDianConfig: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      dianDocument: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn().mockResolvedValue({}),
      },
      warehouseStock: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((args: unknown) => {
        if (Array.isArray(args)) return Promise.all(args);
        return (args as (prisma: any) => Promise<any>)(mockPrismaService);
      }),
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockXmlGeneratorService = {
      generateInvoiceXml: jest.fn().mockReturnValue('<xml>generated</xml>'),
      generateCreditNoteXml: jest.fn().mockReturnValue('<xml>credit-note</xml>'),
      generateDebitNoteXml: jest.fn().mockReturnValue('<xml>debit-note</xml>'),
    };

    const mockCufeGeneratorService = {
      generateCufeFromInvoice: jest.fn().mockReturnValue('cufe-generated'),
      generateQrCodeData: jest.fn().mockReturnValue('qrcode-generated'),
      generateCude: jest.fn().mockReturnValue('cude-generated'),
    };

    const mockDianClientService = {
      sendDocument: jest.fn().mockResolvedValue({
        success: true,
        trackId: 'track-123',
        isValid: true,
      }),
      getDocumentStatus: jest.fn().mockResolvedValue({
        success: true,
        isValid: true,
      }),
      getDocumentStatusByCufe: jest.fn().mockResolvedValue({
        success: true,
        isValid: true,
      }),
    };

    const mockXmlSignerService = {
      loadCertificate: jest.fn(),
      validateCertificate: jest.fn().mockReturnValue({
        isValid: true,
        subject: 'CN=Test',
        issuer: 'CN=CA',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        errors: [],
      }),
      signXml: jest.fn().mockReturnValue('<xml>signed</xml>'),
    };

    const mockAccountingBridgeService = {
      onInvoiceCreated: jest.fn(),
      onInvoiceCancelled: jest.fn(),
      onPaymentCreated: jest.fn(),
      onPurchaseReceived: jest.fn(),
      onStockAdjustment: jest.fn(),
      onExpensePaid: jest.fn(),
      onCreditNoteCreated: jest.fn().mockResolvedValue(undefined),
      onDebitNoteCreated: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DianService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: XmlGeneratorService, useValue: mockXmlGeneratorService },
        { provide: CufeGeneratorService, useValue: mockCufeGeneratorService },
        { provide: DianClientService, useValue: mockDianClientService },
        { provide: XmlSignerService, useValue: mockXmlSignerService },
        { provide: AccountingBridgeService, useValue: mockAccountingBridgeService },
      ],
    }).compile();

    service = module.get<DianService>(DianService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);
    xmlGenerator = module.get(XmlGeneratorService);
    cufeGenerator = module.get(CufeGeneratorService);
    dianClient = module.get(DianClientService);
    xmlSigner = module.get(XmlSignerService);
    accountingBridge = module.get(AccountingBridgeService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return config without sensitive data', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.getConfig();

      expect(result).toBeDefined();
      expect(result?.nit).toBe('900123456');
      expect(result?.certificateFile).toBeUndefined();
      expect(result?.certificatePassword).toBeUndefined();
      expect(result?.softwarePin).toBeUndefined();
      expect(result?.hasSoftwareConfig).toBe(true);
      expect(result?.hasResolution).toBe(true);
    });

    it('should return null when no config exists', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getConfig();

      expect(result).toBeNull();
    });
  });

  describe('createConfig', () => {
    const createDto = {
      nit: '900123456',
      dv: '7',
      businessName: 'Test Company S.A.S',
      tradeName: 'Test Company',
      taxResponsibilities: ['O-15'],
      economicActivity: '4711',
      address: 'Calle 123 #45-67',
      city: 'Bogota',
      cityCode: '11001',
      department: 'Bogota D.C.',
      departmentCode: '11',
      postalCode: '110111',
      phone: '3001234567',
      email: 'test@company.com',
      testMode: true,
    };

    it('should create new config', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.tenantDianConfig.create as jest.Mock).mockResolvedValue({
        ...mockDianConfig,
        softwareId: null,
        softwarePin: null,
        technicalKey: null,
        resolutionNumber: null,
        resolutionPrefix: null,
      });

      const result = await service.createConfig(createDto as any);

      expect(result).toBeDefined();
      expect(prisma.tenantDianConfig.create).toHaveBeenCalled();
    });

    it('should update existing config', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.createConfig(createDto as any);

      expect(result).toBeDefined();
      expect(prisma.tenantDianConfig.update).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update config', async () => {
      const updateDto = { businessName: 'Updated Company' };
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue({
        ...mockDianConfig,
        ...updateDto,
      });

      const result = await service.updateConfig(updateDto);

      expect(result).toBeDefined();
      expect(result.businessName).toBe('Updated Company');
    });
  });

  describe('setSoftwareCredentials', () => {
    it('should set software credentials', async () => {
      const dto = {
        softwareId: 'new-software-id',
        softwarePin: 'new-pin',
        technicalKey: 'new-key',
      };
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.setSoftwareCredentials(dto);

      expect(result.success).toBe(true);
      expect(prisma.tenantDianConfig.update).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        data: {
          softwareId: dto.softwareId,
          softwarePin: dto.softwarePin,
          technicalKey: dto.technicalKey,
        },
      });
    });
  });

  describe('setResolution', () => {
    it('should set resolution', async () => {
      const dto = {
        resolutionNumber: '18760000001',
        resolutionDate: '2024-01-01',
        resolutionPrefix: 'SETT',
        resolutionRangeFrom: 1,
        resolutionRangeTo: 5000000,
      };
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.setResolution(dto);

      expect(result.success).toBe(true);
      expect(prisma.tenantDianConfig.update).toHaveBeenCalled();
    });
  });

  describe('uploadCertificate', () => {
    it('should upload certificate', async () => {
      const file = Buffer.from('certificate-content');
      const password = 'cert-password';
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.uploadCertificate(file, password);

      expect(result.success).toBe(true);
      expect(prisma.tenantDianConfig.update).toHaveBeenCalled();
    });
  });

  describe('processInvoice', () => {
    it('should throw BadRequestException when no config', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.processInvoice('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no software credentials', async () => {
      const configNoSoftware = {
        ...mockDianConfig,
        softwareId: null,
        technicalKey: null,
      };
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        configNoSoftware,
      );

      await expect(service.processInvoice('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no resolution', async () => {
      const configNoResolution = {
        ...mockDianConfig,
        resolutionNumber: null,
        resolutionPrefix: null,
      };
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        configNoResolution,
      );

      await expect(service.processInvoice('invoice-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.processInvoice('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when invoice already accepted', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDianDocument,
        status: 'ACCEPTED',
      });

      await expect(
        service.processInvoice('invoice-123', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process invoice successfully when DIAN accepts', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice);
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-123',
        isValid: true,
      });

      const result = await service.processInvoice('invoice-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe(DianDocumentStatus.ACCEPTED);
      expect(result.cufe).toBe('cufe-generated');
      expect(result.trackId).toBe('track-123');
      expect(result.documentId).toBe('document-123');
      expect(result.message).toBe('Factura enviada y aceptada por la DIAN');

      // Verify CUFE and QR code generation
      expect(cufeGenerator.generateCufeFromInvoice).toHaveBeenCalledWith(
        mockInvoice,
        mockDianConfig,
        '123456789',
      );
      expect(cufeGenerator.generateQrCodeData).toHaveBeenCalledWith(
        mockInvoice,
        mockDianConfig,
        'cufe-generated',
        '123456789',
      );

      // Verify XML generation
      expect(xmlGenerator.generateInvoiceXml).toHaveBeenCalledWith({
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: 'cufe-generated',
        qrCode: 'qrcode-generated',
      });

      // Verify document record creation
      expect(prisma.dianDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          invoiceId: 'invoice-123',
          documentType: DianDocumentType.FACTURA_ELECTRONICA,
          cufe: 'cufe-generated',
          qrCode: 'qrcode-generated',
          status: DianDocumentStatus.GENERATED,
        }),
      });

      // Verify signed XML update
      expect(prisma.dianDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'document-123' },
          data: expect.objectContaining({
            status: DianDocumentStatus.SIGNED,
          }),
        }),
      );

      // Verify document sent to DIAN
      expect(dianClient.sendDocument).toHaveBeenCalledWith(
        mockDianConfig,
        '<xml>generated</xml>',
        `fv${mockDianConfig.resolutionPrefix}${mockInvoice.invoiceNumber}.xml`,
      );

      // Verify invoice updated with CUFE
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: { dianCufe: 'cufe-generated' },
      });
    });

    it('should set REJECTED status when DIAN rejects the document', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
        trackId: 'track-456',
        statusDescription: 'Documento rechazado por la DIAN',
        errors: ['Error en campo X', 'Error en campo Y'],
      });

      const result = await service.processInvoice('invoice-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe(DianDocumentStatus.REJECTED);
      expect(result.message).toBe('Documento rechazado por la DIAN');
      expect(result.errors).toEqual(['Error en campo X', 'Error en campo Y']);

      // Should NOT update invoice with CUFE when rejected
      expect(prisma.invoice.update).not.toHaveBeenCalled();

      // Verify final status update with error details
      expect(prisma.dianDocument.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DianDocumentStatus.REJECTED,
            errorMessage: 'Error en campo X; Error en campo Y',
          }),
        }),
      );
    });

    it('should set SENT status when result is neither success nor explicitly invalid', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: undefined,
        trackId: 'track-789',
        statusDescription: 'Procesando',
      });

      const result = await service.processInvoice('invoice-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe(DianDocumentStatus.SENT);
      expect(result.message).toBe('Procesando');

      // Should NOT update invoice with CUFE when not accepted
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should use default document number when customer has no documentNumber', async () => {
      const invoiceNoCustomerDoc = {
        ...mockInvoice,
        customer: {
          id: 'customer-123',
          name: 'Test Customer',
          documentNumber: null,
        },
      };
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(
        invoiceNoCustomerDoc,
      );
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.invoice.update as jest.Mock).mockResolvedValue(
        invoiceNoCustomerDoc,
      );

      await service.processInvoice('invoice-123');

      expect(cufeGenerator.generateCufeFromInvoice).toHaveBeenCalledWith(
        invoiceNoCustomerDoc,
        mockDianConfig,
        '222222222222',
      );
      expect(cufeGenerator.generateQrCodeData).toHaveBeenCalledWith(
        invoiceNoCustomerDoc,
        mockDianConfig,
        'cufe-generated',
        '222222222222',
      );
    });

    it('should allow reprocessing when force=true even if already accepted', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDianDocument,
        status: 'ACCEPTED',
      });
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.invoice.update as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.processInvoice('invoice-123', true);

      expect(result.success).toBe(true);
      expect(result.status).toBe(DianDocumentStatus.ACCEPTED);
    });

    it('should return error message fallback when no statusDescription', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
      });

      const result = await service.processInvoice('invoice-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error al enviar la factura');
    });
  });

  describe('checkDocumentStatus', () => {
    it('should throw NotFoundException when document not found', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.checkDocumentStatus('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no trackId or cufe', async () => {
      const docNoTrack = { ...mockDianDocument, dianTrackId: null, cufe: null };
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        docNoTrack,
      );

      await expect(service.checkDocumentStatus('document-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no DIAN config found', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.checkDocumentStatus('document-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should check status by trackId when available', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (dianClient.getDocumentStatus as jest.Mock).mockResolvedValue({
        success: true,
        isValid: true,
      });
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );

      const result = await service.checkDocumentStatus('document-123');

      expect(dianClient.getDocumentStatus).toHaveBeenCalledWith(
        mockDianConfig,
        'track-123',
      );
      expect(dianClient.getDocumentStatusByCufe).not.toHaveBeenCalled();
      expect(result.documentId).toBe('document-123');
      expect(result.success).toBe(true);

      // Verify document updated to ACCEPTED
      expect(prisma.dianDocument.update).toHaveBeenCalledWith({
        where: { id: 'document-123' },
        data: expect.objectContaining({
          status: DianDocumentStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        }),
      });
    });

    it('should check status by cufe when no trackId', async () => {
      const docWithCufeOnly = {
        ...mockDianDocument,
        dianTrackId: null,
        cufe: 'cufe-123',
      };
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        docWithCufeOnly,
      );
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (dianClient.getDocumentStatusByCufe as jest.Mock).mockResolvedValue({
        success: true,
        isValid: true,
      });
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );

      const result = await service.checkDocumentStatus('document-123');

      expect(dianClient.getDocumentStatusByCufe).toHaveBeenCalledWith(
        mockDianConfig,
        'cufe-123',
      );
      expect(dianClient.getDocumentStatus).not.toHaveBeenCalled();
      expect(result.documentId).toBe('document-123');
    });

    it('should update status to REJECTED when isValid is false', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (dianClient.getDocumentStatus as jest.Mock).mockResolvedValue({
        success: true,
        isValid: false,
        errors: ['Validation error 1'],
      });
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );

      const result = await service.checkDocumentStatus('document-123');

      expect(prisma.dianDocument.update).toHaveBeenCalledWith({
        where: { id: 'document-123' },
        data: expect.objectContaining({
          status: DianDocumentStatus.REJECTED,
          acceptedAt: undefined,
          errorMessage: 'Validation error 1',
        }),
      });
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('should not update document when result.success is false', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );
      (dianClient.getDocumentStatus as jest.Mock).mockResolvedValue({
        success: false,
        errorMessage: 'DIAN service unavailable',
      });

      const result = await service.checkDocumentStatus('document-123');

      // Should NOT update document when DIAN check itself fails
      expect(prisma.dianDocument.update).not.toHaveBeenCalled();
      expect(result.documentId).toBe('document-123');
      expect(result.success).toBe(false);
    });
  });

  describe('listDocuments', () => {
    it('should return paginated documents', async () => {
      (prisma.dianDocument.findMany as jest.Mock).mockResolvedValue([
        mockDianDocument,
      ]);
      (prisma.dianDocument.count as jest.Mock).mockResolvedValue(1);

      const result = await service.listDocuments(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      (prisma.dianDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.dianDocument.count as jest.Mock).mockResolvedValue(0);

      await service.listDocuments(1, 10, DianDocumentStatus.ACCEPTED);

      expect(prisma.dianDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DianDocumentStatus.ACCEPTED,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      (prisma.dianDocument.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.dianDocument.count as jest.Mock).mockResolvedValue(0);

      await service.listDocuments(1, 10, undefined, fromDate, toDate);

      expect(prisma.dianDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          }),
        }),
      );
    });
  });

  describe('getDocument', () => {
    it('should return document with invoice', async () => {
      const docWithInvoice = { ...mockDianDocument, invoice: mockInvoice };
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        docWithInvoice,
      );

      const result = await service.getDocument('document-123');

      expect(result).toBeDefined();
      expect(result.invoice).toBeDefined();
    });

    it('should throw NotFoundException when document not found', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getDocument('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('downloadXml', () => {
    it('should return xml content', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(
        mockDianDocument,
      );

      const result = await service.downloadXml('document-123');

      expect(result.xml).toBeDefined();
      expect(result.fileName).toContain('xml');
    });

    it('should throw NotFoundException when document not found', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.downloadXml('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no xml content', async () => {
      const docNoXml = {
        ...mockDianDocument,
        xmlContent: null,
        signedXml: null,
      };
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(docNoXml);

      await expect(service.downloadXml('document-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      (prisma.dianDocument.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // accepted
        .mockResolvedValueOnce(10) // rejected
        .mockResolvedValueOnce(10); // pending
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.accepted).toBe(80);
      expect(result.rejected).toBe(10);
      expect(result.pending).toBe(10);
      expect(result.acceptanceRate).toBe('80.0');
    });
  });

  // ============================================================================
  // CREDIT NOTE TESTS
  // ============================================================================

  describe('processCreditNote', () => {
    const mockConfigWithNotes = {
      ...mockDianConfig,
      creditNotePrefix: 'NC',
      creditNoteCurrentNumber: 1,
      debitNotePrefix: 'ND',
      debitNoteCurrentNumber: 1,
    };

    const mockInvoiceWithWarehouse = {
      ...mockInvoice,
      warehouseId: 'warehouse-1',
    };

    const creditNoteDto = {
      invoiceId: 'invoice-123',
      reason: 'DEVOLUCION_TOTAL' as any,
      reasonCode: 'DEVOLUCION_TOTAL',
    };

    const mockCreditNoteDoc = {
      id: 'credit-note-doc-1',
      tenantId: mockTenantId,
      invoiceId: 'invoice-123',
      documentType: DianDocumentType.NOTA_CREDITO,
      documentNumber: 'NC00000001',
      cude: 'cude-generated',
      status: DianDocumentStatus.GENERATED,
      xmlContent: '<xml>credit-note</xml>',
    };

    beforeEach(() => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfigWithNotes,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoiceWithWarehouse,
      );
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDianDocument,
        status: DianDocumentStatus.ACCEPTED,
        documentType: DianDocumentType.FACTURA_ELECTRONICA,
      });
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockCreditNoteDoc,
      );
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockConfigWithNotes,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockCreditNoteDoc,
      );
    });

    it('should process full credit note successfully', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-cn-1',
        isValid: true,
      });

      const result = await service.processCreditNote(creditNoteDto);

      expect(result.success).toBe(true);
      expect(result.status).toBe(DianDocumentStatus.ACCEPTED);
      expect(result.cufe).toBe('cude-generated');
      expect(result.trackId).toBe('track-cn-1');
      expect(result.message).toBe(
        'Nota credito enviada y aceptada por la DIAN',
      );
      expect(cufeGenerator.generateCude).toHaveBeenCalled();
      expect(xmlGenerator.generateCreditNoteXml).toHaveBeenCalled();
    });

    it('should process partial credit note with specific items', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-cn-2',
        isValid: true,
      });

      const partialDto = {
        ...creditNoteDto,
        items: [{ invoiceItemId: 'item-123', quantity: 1 }],
      };

      const result = await service.processCreditNote(partialDto);

      expect(result.success).toBe(true);
      expect(xmlGenerator.generateCreditNoteXml).toHaveBeenCalled();
    });

    it('should generate correct note number from config', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-cn-3',
        isValid: true,
      });

      await service.processCreditNote(creditNoteDto);

      expect(prisma.dianDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentType: DianDocumentType.NOTA_CREDITO,
            documentNumber: 'NC00000001',
            cude: 'cude-generated',
          }),
        }),
      );
    });

    it('should use $transaction for atomic document creation and number increment', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-cn-4',
        isValid: true,
      });

      await service.processCreditNote(creditNoteDto);

      expect((prisma as any).$transaction).toHaveBeenCalled();
      expect(prisma.tenantDianConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { creditNoteCurrentNumber: { increment: 1 } },
        }),
      );
    });

    it('should throw BadRequestException when credit note prefix not configured', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue({
        ...mockConfigWithNotes,
        creditNotePrefix: null,
      });

      await expect(
        service.processCreditNote(creditNoteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no DIAN config exists', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.processCreditNote(creditNoteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processCreditNote(creditNoteDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when original document not accepted by DIAN', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processCreditNote(creditNoteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when item not found in original invoice', async () => {
      const dtoWithBadItem = {
        ...creditNoteDto,
        items: [{ invoiceItemId: 'nonexistent-item', quantity: 1 }],
      };

      await expect(
        service.processCreditNote(dtoWithBadItem),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quantity exceeds original', async () => {
      const dtoWithExcessQty = {
        ...creditNoteDto,
        items: [{ invoiceItemId: 'item-123', quantity: 999 }],
      };

      await expect(
        service.processCreditNote(dtoWithExcessQty),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set REJECTED status when DIAN rejects credit note', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
        trackId: 'track-cn-rej',
        statusDescription: 'Nota credito rechazada',
        errors: ['Error en campo Z'],
      });

      const result = await service.processCreditNote(creditNoteDto);

      expect(result.success).toBe(false);
      expect(result.status).toBe(DianDocumentStatus.REJECTED);
      expect(result.message).toBe('Nota credito rechazada');
      expect(result.errors).toEqual(['Error en campo Z']);
    });

    it('should set SENT status when DIAN result is pending', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: undefined,
        trackId: 'track-cn-pend',
        statusDescription: 'Procesando',
      });

      const result = await service.processCreditNote(creditNoteDto);

      expect(result.success).toBe(false);
      expect(result.status).toBe(DianDocumentStatus.SENT);
    });

    it('should use fallback error message when no statusDescription', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
      });

      const result = await service.processCreditNote(creditNoteDto);

      expect(result.message).toBe('Error al enviar la nota credito');
    });

    it('should not block when accountingBridge.onCreditNoteCreated fails', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-cn-5',
        isValid: true,
      });
      (accountingBridge.onCreditNoteCreated as jest.Mock).mockRejectedValue(
        new Error('Accounting failed'),
      );

      const result = await service.processCreditNote(creditNoteDto);

      expect(result.success).toBe(true);
      expect(accountingBridge.onCreditNoteCreated).toHaveBeenCalled();
    });

    it('should call restoreStock for DEVOLUCION_TOTAL reason', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-cn-6',
        isValid: true,
      });

      await service.processCreditNote(creditNoteDto);

      // restoreStockForCreditNote is fire-and-forget, just verify no error
      expect(accountingBridge.onCreditNoteCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          noteNumber: 'NC00000001',
          invoiceNumber: 'INV-00001',
        }),
      );
    });

    it('should use default customer document when customer has no documentNumber', async () => {
      const invoiceNoCustomerDoc = {
        ...mockInvoiceWithWarehouse,
        customer: { id: 'customer-123', name: 'Test', documentNumber: null },
      };
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(
        invoiceNoCustomerDoc,
      );
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-cn-7',
        isValid: true,
      });

      await service.processCreditNote(creditNoteDto);

      expect(cufeGenerator.generateCude).toHaveBeenCalledWith(
        expect.objectContaining({
          customerDocument: '222222222222',
        }),
      );
    });
  });

  // ============================================================================
  // DEBIT NOTE TESTS
  // ============================================================================

  describe('processDebitNote', () => {
    const mockConfigWithNotes = {
      ...mockDianConfig,
      creditNotePrefix: 'NC',
      creditNoteCurrentNumber: 1,
      debitNotePrefix: 'ND',
      debitNoteCurrentNumber: 1,
    };

    const debitNoteDto = {
      invoiceId: 'invoice-123',
      reason: 'Correccion de valor' as any,
      reasonCode: 'VALOR_ADICIONAL',
      items: [
        {
          description: 'Cargo adicional por transporte',
          quantity: 1,
          unitPrice: 50000,
          taxRate: 19,
        },
      ],
    };

    const mockDebitNoteDoc = {
      id: 'debit-note-doc-1',
      tenantId: mockTenantId,
      invoiceId: 'invoice-123',
      documentType: DianDocumentType.NOTA_DEBITO,
      documentNumber: 'ND00000001',
      cude: 'cude-generated',
      status: DianDocumentStatus.GENERATED,
      xmlContent: '<xml>debit-note</xml>',
    };

    beforeEach(() => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfigWithNotes,
      );
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDianDocument,
        status: DianDocumentStatus.ACCEPTED,
        documentType: DianDocumentType.FACTURA_ELECTRONICA,
      });
      (prisma.dianDocument.create as jest.Mock).mockResolvedValue(
        mockDebitNoteDoc,
      );
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockConfigWithNotes,
      );
      (prisma.dianDocument.update as jest.Mock).mockResolvedValue(
        mockDebitNoteDoc,
      );
    });

    it('should process debit note successfully', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-dn-1',
        isValid: true,
      });

      const result = await service.processDebitNote(debitNoteDto);

      expect(result.success).toBe(true);
      expect(result.status).toBe(DianDocumentStatus.ACCEPTED);
      expect(result.cufe).toBe('cude-generated');
      expect(result.message).toBe(
        'Nota debito enviada y aceptada por la DIAN',
      );
      expect(cufeGenerator.generateCude).toHaveBeenCalled();
      expect(xmlGenerator.generateDebitNoteXml).toHaveBeenCalled();
    });

    it('should calculate subtotal, tax, and total correctly from items', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-dn-2',
        isValid: true,
      });

      const dtoWithMultipleItems = {
        ...debitNoteDto,
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100000, taxRate: 19 },
          { description: 'Item 2', quantity: 1, unitPrice: 50000, taxRate: 19 },
        ],
      };

      await service.processDebitNote(dtoWithMultipleItems);

      // subtotal = (2*100000) + (1*50000) = 250000
      // tax = (200000*0.19) + (50000*0.19) = 38000 + 9500 = 47500
      // total = 250000 + 47500 = 297500
      expect(cufeGenerator.generateCude).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 250000,
          tax01: 47500,
          total: 297500,
        }),
      );
    });

    it('should generate correct note number from config', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-dn-3',
        isValid: true,
      });

      await service.processDebitNote(debitNoteDto);

      expect(prisma.dianDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentType: DianDocumentType.NOTA_DEBITO,
            documentNumber: 'ND00000001',
          }),
        }),
      );
    });

    it('should use $transaction for atomic creation and number increment', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-dn-4',
        isValid: true,
      });

      await service.processDebitNote(debitNoteDto);

      expect((prisma as any).$transaction).toHaveBeenCalled();
      expect(prisma.tenantDianConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { debitNoteCurrentNumber: { increment: 1 } },
        }),
      );
    });

    it('should throw BadRequestException when debit note prefix not configured', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue({
        ...mockConfigWithNotes,
        debitNotePrefix: null,
      });

      await expect(
        service.processDebitNote(debitNoteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when original document not accepted', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processDebitNote(debitNoteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processDebitNote(debitNoteDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set REJECTED status when DIAN rejects debit note', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
        trackId: 'track-dn-rej',
        statusDescription: 'Nota debito rechazada',
        errors: ['Error en campo W'],
      });

      const result = await service.processDebitNote(debitNoteDto);

      expect(result.success).toBe(false);
      expect(result.status).toBe(DianDocumentStatus.REJECTED);
      expect(result.message).toBe('Nota debito rechazada');
      expect(result.errors).toEqual(['Error en campo W']);
    });

    it('should set SENT status when DIAN result is pending', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: undefined,
        trackId: 'track-dn-pend',
      });

      const result = await service.processDebitNote(debitNoteDto);

      expect(result.success).toBe(false);
      expect(result.status).toBe(DianDocumentStatus.SENT);
    });

    it('should use fallback error message when no statusDescription', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
      });

      const result = await service.processDebitNote(debitNoteDto);

      expect(result.message).toBe('Error al enviar la nota debito');
    });

    it('should fire-and-forget accountingBridge.onDebitNoteCreated on success', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-dn-5',
        isValid: true,
      });

      await service.processDebitNote(debitNoteDto);

      expect(accountingBridge.onDebitNoteCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          noteNumber: 'ND00000001',
          invoiceNumber: 'INV-00001',
        }),
      );
    });

    it('should not call accountingBridge when DIAN rejects', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: false,
        isValid: false,
      });

      await service.processDebitNote(debitNoteDto);

      expect(accountingBridge.onDebitNoteCreated).not.toHaveBeenCalled();
    });

    it('should not block when accountingBridge.onDebitNoteCreated fails', async () => {
      (dianClient.sendDocument as jest.Mock).mockResolvedValue({
        success: true,
        trackId: 'track-dn-6',
        isValid: true,
      });
      (accountingBridge.onDebitNoteCreated as jest.Mock).mockRejectedValue(
        new Error('Accounting failed'),
      );

      const result = await service.processDebitNote(debitNoteDto);

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // NOTE CONFIG TESTS
  // ============================================================================

  describe('setNoteConfig', () => {
    it('should update only creditNotePrefix', async () => {
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.setNoteConfig({
        creditNotePrefix: 'NC',
      } as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Configuracion de notas actualizada');
      expect(prisma.tenantDianConfig.update).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        data: { creditNotePrefix: 'NC' },
      });
    });

    it('should update all note config fields', async () => {
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.setNoteConfig({
        creditNotePrefix: 'NC',
        creditNoteStartNumber: 100,
        debitNotePrefix: 'ND',
        debitNoteStartNumber: 200,
      } as any);

      expect(result.success).toBe(true);
      expect(prisma.tenantDianConfig.update).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        data: {
          creditNotePrefix: 'NC',
          creditNoteCurrentNumber: 100,
          debitNotePrefix: 'ND',
          debitNoteCurrentNumber: 200,
        },
      });
    });

    it('should update only debitNotePrefix and debitNoteStartNumber', async () => {
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(
        mockDianConfig,
      );

      const result = await service.setNoteConfig({
        debitNotePrefix: 'ND',
        debitNoteStartNumber: 50,
      } as any);

      expect(result.success).toBe(true);
      expect(prisma.tenantDianConfig.update).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        data: {
          debitNotePrefix: 'ND',
          debitNoteCurrentNumber: 50,
        },
      });
    });
  });
});
