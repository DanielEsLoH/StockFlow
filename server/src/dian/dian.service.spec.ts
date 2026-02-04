import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DianService } from './dian.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common';
import { XmlGeneratorService } from './services/xml-generator.service';
import { CufeGeneratorService } from './services/cufe-generator.service';
import { DianClientService } from './services/dian-client.service';
import { DianDocumentStatus, DianDocumentType } from '@prisma/client';

describe('DianService', () => {
  let service: DianService;
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let xmlGenerator: jest.Mocked<XmlGeneratorService>;
  let cufeGenerator: jest.Mocked<CufeGeneratorService>;
  let dianClient: jest.Mocked<DianClientService>;

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
    items: [{
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
    }],
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
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockXmlGeneratorService = {
      generateInvoiceXml: jest.fn().mockReturnValue('<xml>generated</xml>'),
    };

    const mockCufeGeneratorService = {
      generateCufeFromInvoice: jest.fn().mockReturnValue('cufe-generated'),
      generateQrCodeData: jest.fn().mockReturnValue('qrcode-generated'),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DianService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: XmlGeneratorService, useValue: mockXmlGeneratorService },
        { provide: CufeGeneratorService, useValue: mockCufeGeneratorService },
        { provide: DianClientService, useValue: mockDianClientService },
      ],
    }).compile();

    service = module.get<DianService>(DianService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);
    xmlGenerator = module.get(XmlGeneratorService);
    cufeGenerator = module.get(CufeGeneratorService);
    dianClient = module.get(DianClientService);

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
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(mockDianConfig);

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

      const result = await service.createConfig(createDto);

      expect(result).toBeDefined();
      expect(prisma.tenantDianConfig.create).toHaveBeenCalled();
    });

    it('should update existing config', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(mockDianConfig);
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(mockDianConfig);

      const result = await service.createConfig(createDto);

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
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(mockDianConfig);

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
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(mockDianConfig);

      const result = await service.setResolution(dto);

      expect(result.success).toBe(true);
      expect(prisma.tenantDianConfig.update).toHaveBeenCalled();
    });
  });

  describe('uploadCertificate', () => {
    it('should upload certificate', async () => {
      const file = Buffer.from('certificate-content');
      const password = 'cert-password';
      (prisma.tenantDianConfig.update as jest.Mock).mockResolvedValue(mockDianConfig);

      const result = await service.uploadCertificate(file, password);

      expect(result.success).toBe(true);
      expect(prisma.tenantDianConfig.update).toHaveBeenCalled();
    });
  });

  describe('processInvoice', () => {
    it('should throw BadRequestException when no config', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.processInvoice('invoice-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no software credentials', async () => {
      const configNoSoftware = { ...mockDianConfig, softwareId: null, technicalKey: null };
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(configNoSoftware);

      await expect(service.processInvoice('invoice-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no resolution', async () => {
      const configNoResolution = { ...mockDianConfig, resolutionNumber: null, resolutionPrefix: null };
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(configNoResolution);

      await expect(service.processInvoice('invoice-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(mockDianConfig);
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.processInvoice('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when invoice already accepted', async () => {
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(mockDianConfig);
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue({
        ...mockDianDocument,
        status: 'ACCEPTED',
      });

      await expect(service.processInvoice('invoice-123', false)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkDocumentStatus', () => {
    it('should throw NotFoundException when document not found', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.checkDocumentStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no trackId or cufe', async () => {
      const docNoTrack = { ...mockDianDocument, dianTrackId: null, cufe: null };
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(docNoTrack);

      await expect(service.checkDocumentStatus('document-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listDocuments', () => {
    it('should return paginated documents', async () => {
      (prisma.dianDocument.findMany as jest.Mock).mockResolvedValue([mockDianDocument]);
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
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(docWithInvoice);

      const result = await service.getDocument('document-123');

      expect(result).toBeDefined();
      expect(result.invoice).toBeDefined();
    });

    it('should throw NotFoundException when document not found', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getDocument('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadXml', () => {
    it('should return xml content', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(mockDianDocument);

      const result = await service.downloadXml('document-123');

      expect(result.xml).toBeDefined();
      expect(result.fileName).toContain('xml');
    });

    it('should throw NotFoundException when document not found', async () => {
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.downloadXml('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no xml content', async () => {
      const docNoXml = { ...mockDianDocument, xmlContent: null, signedXml: null };
      (prisma.dianDocument.findFirst as jest.Mock).mockResolvedValue(docNoXml);

      await expect(service.downloadXml('document-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      (prisma.dianDocument.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // accepted
        .mockResolvedValueOnce(10)  // rejected
        .mockResolvedValueOnce(10); // pending
      (prisma.tenantDianConfig.findUnique as jest.Mock).mockResolvedValue(mockDianConfig);

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.accepted).toBe(80);
      expect(result.rejected).toBe(10);
      expect(result.pending).toBe(10);
      expect(result.acceptanceRate).toBe('80.0');
    });
  });
});
