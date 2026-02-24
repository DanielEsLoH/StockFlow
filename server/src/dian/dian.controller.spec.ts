import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { DianController } from './dian.controller';
import { DianService } from './dian.service';
import { DianDocumentStatus, DianDocumentType } from '@prisma/client';

describe('DianController', () => {
  let controller: DianController;
  let service: jest.Mocked<DianService>;

  const mockDianConfig = {
    id: 'config-123',
    tenantId: 'tenant-123',
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
    hasSoftwareConfig: true,
    hasResolution: true,
    hasCertificate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDianDocument = {
    id: 'document-123',
    tenantId: 'tenant-123',
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
    invoice: {
      id: 'invoice-123',
      invoiceNumber: 'INV-00001',
      total: 119000,
      customer: {
        id: 'customer-123',
        name: 'Test Customer',
        documentNumber: '123456789',
      },
    },
  };

  const mockPaginatedDocuments = {
    data: [mockDianDocument],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockStats = {
    total: 100,
    accepted: 80,
    rejected: 10,
    pending: 10,
    remainingNumbers: 4999900,
    acceptanceRate: '80.0',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockDianService = {
      getConfig: jest.fn(),
      createConfig: jest.fn(),
      updateConfig: jest.fn(),
      setSoftwareCredentials: jest.fn(),
      setResolution: jest.fn(),
      uploadCertificate: jest.fn(),
      processInvoice: jest.fn(),
      checkDocumentStatus: jest.fn(),
      listDocuments: jest.fn(),
      getDocument: jest.fn(),
      downloadXml: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DianController],
      providers: [{ provide: DianService, useValue: mockDianService }],
    }).compile();

    controller = module.get<DianController>(DianController);
    service = module.get(DianService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return config', async () => {
      service.getConfig.mockResolvedValue(mockDianConfig as any);

      const result = await controller.getConfig();

      expect(result).toEqual(mockDianConfig);
      expect(service.getConfig).toHaveBeenCalled();
    });

    it('should return null when no config', async () => {
      service.getConfig.mockResolvedValue(null);

      const result = await controller.getConfig();

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

    it('should create config', async () => {
      service.createConfig.mockResolvedValue(mockDianConfig as any);

      const result = await controller.createConfig(createDto as any);

      expect(result).toEqual(mockDianConfig);
      expect(service.createConfig).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateConfig', () => {
    it('should update config', async () => {
      const updateDto = { businessName: 'Updated Company' };
      service.updateConfig.mockResolvedValue({
        ...mockDianConfig,
        ...updateDto,
      } as any);

      const result = await controller.updateConfig(updateDto);

      expect(result.businessName).toBe('Updated Company');
      expect(service.updateConfig).toHaveBeenCalledWith(updateDto);
    });
  });

  describe('setSoftwareCredentials', () => {
    it('should set software credentials', async () => {
      const dto = {
        softwareId: 'software-id',
        softwarePin: 'pin',
        technicalKey: 'key',
      };
      service.setSoftwareCredentials.mockResolvedValue({
        success: true,
        message: 'Updated',
      });

      const result = await controller.setSoftwareCredentials(dto);

      expect(result.success).toBe(true);
      expect(service.setSoftwareCredentials).toHaveBeenCalledWith(dto);
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
      service.setResolution.mockResolvedValue({
        success: true,
        message: 'Updated',
      });

      const result = await controller.setResolution(dto);

      expect(result.success).toBe(true);
      expect(service.setResolution).toHaveBeenCalledWith(dto);
    });
  });

  describe('uploadCertificate', () => {
    it('should upload certificate', async () => {
      const file = { buffer: Buffer.from('cert') } as Express.Multer.File;
      const password = 'password';
      service.uploadCertificate.mockResolvedValue({
        success: true,
        message: 'Uploaded',
        certificate: {
          subject: 'CN=Test',
          issuer: 'CN=CA',
          validFrom: new Date(),
          validTo: new Date(),
        },
      });

      const result = await controller.uploadCertificate(file, password);

      expect(result.success).toBe(true);
      expect(service.uploadCertificate).toHaveBeenCalledWith(
        file.buffer,
        password,
      );
    });
  });

  describe('sendInvoice', () => {
    it('should send invoice to DIAN', async () => {
      const dto = { invoiceId: 'invoice-123', force: false };
      const processResult = {
        success: true,
        documentId: 'document-123',
        cufe: 'cufe-123',
        trackId: 'track-123',
        status: DianDocumentStatus.ACCEPTED,
        message: 'Factura enviada y aceptada',
      };
      service.processInvoice.mockResolvedValue(processResult);

      const result = await controller.sendInvoice(dto);

      expect(result.success).toBe(true);
      expect(service.processInvoice).toHaveBeenCalledWith(
        dto.invoiceId,
        dto.force,
      );
    });

    it('should propagate BadRequestException', async () => {
      const dto = { invoiceId: 'invoice-123', force: false };
      service.processInvoice.mockRejectedValue(
        new BadRequestException('Configuration missing'),
      );

      await expect(controller.sendInvoice(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException', async () => {
      const dto = { invoiceId: 'nonexistent', force: false };
      service.processInvoice.mockRejectedValue(
        new NotFoundException('Invoice not found'),
      );

      await expect(controller.sendInvoice(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkStatus', () => {
    it('should check document status', async () => {
      const dto = { documentId: 'document-123' };
      service.checkDocumentStatus.mockResolvedValue({
        documentId: 'document-123',
        success: true,
        isValid: true,
      } as any);

      const result = await controller.checkStatus(dto);

      expect(result.success).toBe(true);
      expect(service.checkDocumentStatus).toHaveBeenCalledWith(dto.documentId);
    });

    it('should propagate NotFoundException', async () => {
      const dto = { documentId: 'nonexistent' };
      service.checkDocumentStatus.mockRejectedValue(new NotFoundException());

      await expect(controller.checkStatus(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listDocuments', () => {
    it('should return paginated documents', async () => {
      service.listDocuments.mockResolvedValue(mockPaginatedDocuments as any);

      const result = await controller.listDocuments('1', '10');

      expect(result).toEqual(mockPaginatedDocuments);
      expect(service.listDocuments).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should handle invalid page number by defaulting to 1', async () => {
      service.listDocuments.mockResolvedValue(mockPaginatedDocuments as any);

      await controller.listDocuments('invalid', '10');

      expect(service.listDocuments).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass status filter', async () => {
      service.listDocuments.mockResolvedValue(mockPaginatedDocuments as any);

      await controller.listDocuments('1', '10', DianDocumentStatus.ACCEPTED);

      expect(service.listDocuments).toHaveBeenCalledWith(
        1,
        10,
        DianDocumentStatus.ACCEPTED,
        undefined,
        undefined,
      );
    });

    it('should pass date range filters', async () => {
      service.listDocuments.mockResolvedValue(mockPaginatedDocuments as any);

      await controller.listDocuments(
        '1',
        '10',
        undefined,
        '2024-01-01',
        '2024-12-31',
      );

      expect(service.listDocuments).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );
    });
  });

  describe('getDocument', () => {
    it('should return document', async () => {
      service.getDocument.mockResolvedValue(mockDianDocument as any);

      const result = await controller.getDocument('document-123');

      expect(result).toEqual(mockDianDocument);
      expect(service.getDocument).toHaveBeenCalledWith('document-123');
    });

    it('should propagate NotFoundException', async () => {
      service.getDocument.mockRejectedValue(new NotFoundException());

      await expect(controller.getDocument('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('downloadXml', () => {
    it('should download xml', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      service.downloadXml.mockResolvedValue({
        xml: '<xml>content</xml>',
        fileName: 'FACTURA_ELECTRONICA_INV-00001.xml',
      });

      await controller.downloadXml('document-123', mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/xml',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment'),
      );
      expect(mockResponse.send).toHaveBeenCalledWith('<xml>content</xml>');
    });

    it('should propagate NotFoundException', async () => {
      const mockResponse = {} as Response;
      service.downloadXml.mockRejectedValue(new NotFoundException());

      await expect(
        controller.downloadXml('nonexistent', mockResponse),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return stats', async () => {
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });
});
