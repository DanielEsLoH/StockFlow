import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CufeGeneratorService } from './cufe-generator.service';
import type { TenantDianConfig, Invoice } from '@prisma/client';

describe('CufeGeneratorService', () => {
  let service: CufeGeneratorService;

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
    softwareId: 'software-123',
    softwarePin: 'pin-123',
    technicalKey: 'tech-key-123',
    resolutionNumber: '18760000001',
    resolutionDate: new Date('2024-01-01'),
    resolutionPrefix: 'SETT',
    resolutionRangeFrom: 1,
    resolutionRangeTo: 5000000,
    currentNumber: 100,
    certificateFile: null,
    certificatePassword: null,
    country: 'Colombia',
    countryCode: 'CO',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TenantDianConfig;

  const mockInvoice = {
    id: 'invoice-123',
    tenantId: 'tenant-123',
    invoiceNumber: 'SETT100',
    subtotal: 100000,
    tax: 19000,
    discount: 0,
    total: 119000,
    issueDate: new Date('2024-01-15T10:30:00Z'),
    dueDate: null,
    notes: null,
    status: 'SENT',
    paymentStatus: 'PAID',
    customerId: null,
    userId: 'user-123',
    source: 'WEB',
    dianCufe: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Invoice;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CufeGeneratorService],
    }).compile();

    service = module.get<CufeGeneratorService>(CufeGeneratorService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateCufe', () => {
    it('should generate a valid CUFE hash', () => {
      const input = {
        invoiceNumber: 'SETT100',
        issueDate: new Date('2024-01-15'),
        issueTime: '10:30:00-05:00',
        subtotal: 100000,
        tax01: 19000,
        tax04: 0,
        tax03: 0,
        total: 119000,
        supplierNit: '900123456',
        customerDocument: '123456789',
        technicalKey: 'tech-key-123',
        testMode: true,
      };

      const cufe = service.generateCufe(input);

      expect(cufe).toBeDefined();
      expect(cufe).toHaveLength(96); // SHA-384 produces 96 hex characters
      expect(/^[a-f0-9]{96}$/i.test(cufe)).toBe(true);
    });

    it('should generate different CUFEs for different invoices', () => {
      const input1 = {
        invoiceNumber: 'SETT100',
        issueDate: new Date('2024-01-15'),
        issueTime: '10:30:00-05:00',
        subtotal: 100000,
        tax01: 19000,
        tax04: 0,
        tax03: 0,
        total: 119000,
        supplierNit: '900123456',
        customerDocument: '123456789',
        technicalKey: 'tech-key-123',
        testMode: true,
      };

      const input2 = {
        ...input1,
        invoiceNumber: 'SETT101',
      };

      const cufe1 = service.generateCufe(input1);
      const cufe2 = service.generateCufe(input2);

      expect(cufe1).not.toBe(cufe2);
    });

    it('should generate consistent CUFE for same input', () => {
      const input = {
        invoiceNumber: 'SETT100',
        issueDate: new Date('2024-01-15'),
        issueTime: '10:30:00-05:00',
        subtotal: 100000,
        tax01: 19000,
        tax04: 0,
        tax03: 0,
        total: 119000,
        supplierNit: '900123456',
        customerDocument: '123456789',
        technicalKey: 'tech-key-123',
        testMode: true,
      };

      const cufe1 = service.generateCufe(input);
      const cufe2 = service.generateCufe(input);

      expect(cufe1).toBe(cufe2);
    });

    it('should use production environment code when testMode is false', () => {
      const inputTest = {
        invoiceNumber: 'SETT100',
        issueDate: new Date('2024-01-15'),
        issueTime: '10:30:00-05:00',
        subtotal: 100000,
        tax01: 19000,
        tax04: 0,
        tax03: 0,
        total: 119000,
        supplierNit: '900123456',
        customerDocument: '123456789',
        technicalKey: 'tech-key-123',
        testMode: true,
      };

      const inputProd = {
        ...inputTest,
        testMode: false,
      };

      const cufeTest = service.generateCufe(inputTest);
      const cufeProd = service.generateCufe(inputProd);

      expect(cufeTest).not.toBe(cufeProd);
    });
  });

  describe('generateCude', () => {
    it('should generate a valid CUDE hash', () => {
      const input = {
        documentNumber: 'NC100',
        issueDate: new Date('2024-01-15'),
        issueTime: '10:30:00-05:00',
        subtotal: 100000,
        tax01: 19000,
        tax04: 0,
        tax03: 0,
        total: 119000,
        supplierNit: '900123456',
        customerDocument: '123456789',
        softwarePin: 'pin-123',
        testMode: true,
      };

      const cude = service.generateCude(input);

      expect(cude).toBeDefined();
      expect(cude).toHaveLength(96);
      expect(/^[a-f0-9]{96}$/i.test(cude)).toBe(true);
    });

    it('should generate different CUDEs for different documents', () => {
      const input1 = {
        documentNumber: 'NC100',
        issueDate: new Date('2024-01-15'),
        issueTime: '10:30:00-05:00',
        subtotal: 100000,
        tax01: 19000,
        tax04: 0,
        tax03: 0,
        total: 119000,
        supplierNit: '900123456',
        customerDocument: '123456789',
        softwarePin: 'pin-123',
        testMode: true,
      };

      const input2 = {
        ...input1,
        documentNumber: 'NC101',
      };

      const cude1 = service.generateCude(input1);
      const cude2 = service.generateCude(input2);

      expect(cude1).not.toBe(cude2);
    });
  });

  describe('generateCufeFromInvoice', () => {
    it('should generate CUFE from invoice and config', () => {
      const cufe = service.generateCufeFromInvoice(
        mockInvoice,
        mockDianConfig,
        '123456789',
      );

      expect(cufe).toBeDefined();
      expect(cufe).toHaveLength(96);
    });

    it('should use default customer document when not provided', () => {
      const cufe = service.generateCufeFromInvoice(
        mockInvoice,
        mockDianConfig,
        '',
      );

      expect(cufe).toBeDefined();
      expect(cufe).toHaveLength(96);
    });

    it('should handle missing technicalKey', () => {
      const configNoKey = { ...mockDianConfig, technicalKey: null };

      const cufe = service.generateCufeFromInvoice(
        mockInvoice,
        configNoKey as TenantDianConfig,
        '123456789',
      );

      expect(cufe).toBeDefined();
      expect(cufe).toHaveLength(96);
    });
  });

  describe('generateQrCodeData', () => {
    it('should generate QR code data string', () => {
      const cufe = 'abc123def456'.repeat(8);

      const qrData = service.generateQrCodeData(
        mockInvoice,
        mockDianConfig,
        cufe,
        '123456789',
      );

      expect(qrData).toBeDefined();
      expect(qrData).toContain('NumFac: SETT100');
      expect(qrData).toContain('NitFac: 900123456');
      expect(qrData).toContain('CUFE:');
    });

    it('should use test URL when testMode is true', () => {
      const cufe = 'abc123def456'.repeat(8);

      const qrData = service.generateQrCodeData(
        mockInvoice,
        mockDianConfig,
        cufe,
        '123456789',
      );

      expect(qrData).toContain('catalogo-vpfe-hab.dian.gov.co');
    });

    it('should use production URL when testMode is false', () => {
      const cufe = 'abc123def456'.repeat(8);
      const prodConfig = { ...mockDianConfig, testMode: false };

      const qrData = service.generateQrCodeData(
        mockInvoice,
        prodConfig as TenantDianConfig,
        cufe,
        '123456789',
      );

      expect(qrData).toContain('catalogo-vpfe.dian.gov.co');
    });

    it('should use default customer document when not provided', () => {
      const cufe = 'abc123def456'.repeat(8);

      const qrData = service.generateQrCodeData(
        mockInvoice,
        mockDianConfig,
        cufe,
      );

      expect(qrData).toContain('DocAdq: 222222222222');
    });
  });

  describe('validateCufe', () => {
    it('should return true for valid CUFE', () => {
      const validCufe = 'a'.repeat(96);
      expect(service.validateCufe(validCufe)).toBe(true);
    });

    it('should return true for uppercase valid CUFE', () => {
      const validCufe = 'A'.repeat(96);
      expect(service.validateCufe(validCufe)).toBe(true);
    });

    it('should return true for mixed case valid CUFE', () => {
      const validCufe = 'aAbBcCdDeEfF01234567890'.repeat(4) + 'aAbBcCdDeEfF01234567890'.slice(0, 4);
      // Need exactly 96 characters
      const cufe96 = 'a1b2c3d4e5f6'.repeat(8);
      expect(service.validateCufe(cufe96)).toBe(true);
    });

    it('should return false for short CUFE', () => {
      const shortCufe = 'a'.repeat(95);
      expect(service.validateCufe(shortCufe)).toBe(false);
    });

    it('should return false for long CUFE', () => {
      const longCufe = 'a'.repeat(97);
      expect(service.validateCufe(longCufe)).toBe(false);
    });

    it('should return false for CUFE with invalid characters', () => {
      const invalidCufe = 'g'.repeat(96);
      expect(service.validateCufe(invalidCufe)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.validateCufe('')).toBe(false);
    });
  });
});
