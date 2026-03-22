import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  SupportDocumentXmlService,
  SupportDocumentXmlConfig,
  SupportDocumentWithDetails,
} from './support-document-xml.service';

describe('SupportDocumentXmlService', () => {
  let service: SupportDocumentXmlService;

  const mockDianConfig: any = {
    nit: '900123456',
    dv: '7',
    businessName: 'Test Company S.A.S.',
    tradeName: 'Test Trade',
    address: 'Calle 100 #15-20',
    city: 'Bogota D.C.',
    cityCode: '11001',
    department: 'Bogota D.C.',
    departmentCode: '11',
    countryCode: 'CO',
    country: 'Colombia',
    postalCode: '110111',
    email: 'test@company.com',
    resolutionNumber: 'RES-001',
    resolutionDate: new Date('2024-01-01'),
    resolutionPrefix: 'DS',
    resolutionRangeFrom: 1,
    resolutionRangeTo: 999999,
    softwareId: 'soft-123',
    softwarePin: 'pin-456',
    testMode: true,
    taxResponsibilities: ['O-48', 'O-15'],
  };

  const mockSupplier: any = {
    id: 'supplier-1',
    name: 'Proveedor Test',
    address: 'Carrera 50 #30-10',
    city: 'Medellin',
    state: 'Antioquia',
    email: 'proveedor@test.com',
    dv: '3',
  };

  const mockDocumentItem: any = {
    id: 'item-1',
    description: 'Servicio de consultoría',
    quantity: 2,
    unitPrice: 500000,
    subtotal: 1000000,
    tax: 190000,
    taxRate: 19,
  };

  const mockDocument: SupportDocumentWithDetails = {
    id: 'doc-1',
    tenantId: 'tenant-1',
    documentNumber: 'DS-00001',
    issueDate: new Date('2024-06-15T10:30:00.000Z'),
    supplierName: 'Proveedor Test',
    supplierDocument: '12345678',
    supplierDocType: 'CC',
    subtotal: 1000000 as any,
    tax: 190000 as any,
    withholdings: 25000 as any,
    total: 1165000 as any,
    notes: 'Documento de prueba',
    status: 'DRAFT' as any,
    supplierId: 'supplier-1',
    dianStatus: null,
    cuds: null,
    xmlUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [mockDocumentItem],
    supplier: mockSupplier,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SupportDocumentXmlService],
    }).compile();

    service = module.get<SupportDocumentXmlService>(
      SupportDocumentXmlService,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCuds', () => {
    it('should generate a SHA-384 CUDS hash', () => {
      const cuds = service.generateCuds(mockDocument, mockDianConfig);

      expect(cuds).toBeDefined();
      expect(typeof cuds).toBe('string');
      // SHA-384 produces 96 hex characters
      expect(cuds).toHaveLength(96);
      expect(cuds).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent output for same input', () => {
      const cuds1 = service.generateCuds(mockDocument, mockDianConfig);
      const cuds2 = service.generateCuds(mockDocument, mockDianConfig);

      expect(cuds1).toBe(cuds2);
    });

    it('should produce different output for different documents', () => {
      const cuds1 = service.generateCuds(mockDocument, mockDianConfig);

      const otherDocument = {
        ...mockDocument,
        documentNumber: 'DS-00002',
      };
      const cuds2 = service.generateCuds(otherDocument, mockDianConfig);

      expect(cuds1).not.toBe(cuds2);
    });

    it('should use testMode=2 for test environment', () => {
      const testConfig = { ...mockDianConfig, testMode: true };
      const prodConfig = { ...mockDianConfig, testMode: false };

      const cudsTest = service.generateCuds(mockDocument, testConfig);
      const cudsProd = service.generateCuds(mockDocument, prodConfig);

      expect(cudsTest).not.toBe(cudsProd);
    });

    it('should handle empty softwarePin gracefully', () => {
      const configNoPin = { ...mockDianConfig, softwarePin: '' };

      const cuds = service.generateCuds(mockDocument, configNoPin);

      expect(cuds).toHaveLength(96);
    });
  });

  describe('generateQrCodeData', () => {
    it('should generate QR code data string', () => {
      const cuds = 'test-cuds-hash';
      const qrData = service.generateQrCodeData(
        mockDocument,
        mockDianConfig,
        cuds,
      );

      expect(qrData).toContain('NumDS: DS-00001');
      expect(qrData).toContain('NitAdq: 900123456');
      expect(qrData).toContain('DocVend: 12345678');
      expect(qrData).toContain('CUDS: test-cuds-hash');
    });

    it('should use test URL for test mode', () => {
      const cuds = 'test-cuds';
      const qrData = service.generateQrCodeData(
        mockDocument,
        { ...mockDianConfig, testMode: true },
        cuds,
      );

      expect(qrData).toContain('catalogo-vpfe-hab.dian.gov.co');
    });

    it('should use production URL for production mode', () => {
      const cuds = 'prod-cuds';
      const qrData = service.generateQrCodeData(
        mockDocument,
        { ...mockDianConfig, testMode: false },
        cuds,
      );

      expect(qrData).toContain('catalogo-vpfe.dian.gov.co');
      expect(qrData).not.toContain('-hab');
    });

    it('should include amounts formatted to 2 decimal places', () => {
      const cuds = 'hash';
      const qrData = service.generateQrCodeData(
        mockDocument,
        mockDianConfig,
        cuds,
      );

      expect(qrData).toContain('ValDS: 1000000.00');
      expect(qrData).toContain('ValIva: 190000.00');
      expect(qrData).toContain('ValOtroIm: 25000.00');
      expect(qrData).toContain('ValTotDS: 1165000.00');
    });
  });

  describe('generateSupportDocumentXml', () => {
    it('should generate valid XML with correct root element', () => {
      const cuds = service.generateCuds(mockDocument, mockDianConfig);
      const qrCode = service.generateQrCodeData(
        mockDocument,
        mockDianConfig,
        cuds,
      );

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds,
        qrCode,
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Invoice');
      expect(xml).toContain('</Invoice>');
    });

    it('should include correct document type codes for Documento Soporte', () => {
      const cuds = 'test-cuds';
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds,
        qrCode: 'test-qr',
      });

      expect(xml).toContain('<cbc:CustomizationID>05</cbc:CustomizationID>');
      expect(xml).toContain('<cbc:InvoiceTypeCode>05</cbc:InvoiceTypeCode>');
      expect(xml).toContain(
        '<cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>',
      );
      expect(xml).toContain(
        '<cbc:ProfileID>DIAN 2.1</cbc:ProfileID>',
      );
    });

    it('should include ProfileExecutionID 2 for test mode', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: { ...mockDianConfig, testMode: true },
        document: mockDocument,
        cuds: 'test',
        qrCode: 'qr',
      });

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>',
      );
    });

    it('should include ProfileExecutionID 1 for production mode', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: { ...mockDianConfig, testMode: false },
        document: mockDocument,
        cuds: 'test',
        qrCode: 'qr',
      });

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>',
      );
    });

    it('should include document number and CUDS', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'my-cuds-hash',
        qrCode: 'qr-data',
      });

      expect(xml).toContain('<cbc:ID>DS-00001</cbc:ID>');
      expect(xml).toContain('my-cuds-hash');
    });

    it('should include supplier party information', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      // AccountingSupplierParty = the tenant (buyer)
      expect(xml).toContain('Test Company S.A.S.');
      expect(xml).toContain('900123456');

      // AccountingCustomerParty = the supplier (seller / non-invoicer)
      expect(xml).toContain('Proveedor Test');
      expect(xml).toContain('12345678');
    });

    it('should include invoice lines for items', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<cac:InvoiceLine>');
      expect(xml).toContain('Servicio de consultor');
      expect(xml).toContain('<cbc:InvoicedQuantity unitCode="EA">2</cbc:InvoicedQuantity>');
      expect(xml).toContain('500000.00');
    });

    it('should include tax totals', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain('190000.00');
      expect(xml).toContain('<cbc:Name>IVA</cbc:Name>');
    });

    it('should include withholding tax total when withholdings > 0', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: { ...mockDocument, withholdings: 25000 as any },
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<cac:WithholdingTaxTotal>');
      expect(xml).toContain('25000.00');
      expect(xml).toContain('ReteRenta');
    });

    it('should NOT include withholding tax when withholdings = 0', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: { ...mockDocument, withholdings: 0 as any },
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).not.toContain('<cac:WithholdingTaxTotal>');
    });

    it('should include legal monetary total', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<cac:LegalMonetaryTotal>');
      expect(xml).toContain('LineExtensionAmount');
      expect(xml).toContain('PayableAmount');
    });

    it('should include payment means', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<cac:PaymentMeans>');
      expect(xml).toContain(
        '<cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>',
      );
    });

    it('should use document notes or default note', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('Documento de prueba');
    });

    it('should use default note when notes is null', () => {
      const docNoNotes = { ...mockDocument, notes: null };
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: docNoNotes,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain(
        'Documento soporte en adquisiciones efectuadas a no obligados a facturar',
      );
    });

    it('should escape XML special characters in names', () => {
      const docWithSpecialChars = {
        ...mockDocument,
        supplier: {
          ...mockSupplier,
          name: 'Proveedor & Asociados <S.A.S.>',
        },
      };

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: docWithSpecialChars,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('Proveedor &amp; Asociados &lt;S.A.S.&gt;');
      expect(xml).not.toContain(
        'Proveedor & Asociados <S.A.S.>',
      );
    });

    it('should handle document without supplier relation', () => {
      const docNoSupplier = { ...mockDocument, supplier: null };

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: docNoSupplier,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      // Should fallback to supplierName from document
      expect(xml).toContain('Proveedor Test');
      expect(xml).toContain('Sin direccion');
    });

    it('should include QR code in DIAN extensions', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'my-qr-data',
      });

      expect(xml).toContain('<sts:QRCode>my-qr-data</sts:QRCode>');
    });

    it('should include resolution info in InvoiceControl', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain(
        '<sts:InvoiceAuthorization>RES-001</sts:InvoiceAuthorization>',
      );
      expect(xml).toContain('<sts:Prefix>DS</sts:Prefix>');
      expect(xml).toContain('<sts:From>1</sts:From>');
      expect(xml).toContain('<sts:To>999999</sts:To>');
    });

    it('should include tax responsibilities joined by semicolon', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('O-48;O-15');
    });

    it('should include UBL namespaces', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
      expect(xml).toContain('xmlns:cac=');
      expect(xml).toContain('xmlns:cbc=');
    });

    it('should handle document type NIT for supplier', () => {
      const docWithNit = {
        ...mockDocument,
        supplierDocType: 'NIT',
      };

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: docWithNit,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      // NIT maps to schemeName="31"
      expect(xml).toContain('schemeName="31"');
    });

    it('should handle unknown document type with default code', () => {
      const docWithUnknown = {
        ...mockDocument,
        supplierDocType: 'UNKNOWN_TYPE',
      };

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: docWithUnknown,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      // Unknown maps to default '13'
      expect(xml).toContain('schemeName="13"');
    });

    it('should include software security code', () => {
      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<sts:SoftwareSecurityCode');
    });

    it('should include multiple invoice lines for multiple items', () => {
      const multiItemDoc = {
        ...mockDocument,
        items: [
          mockDocumentItem,
          {
            ...mockDocumentItem,
            id: 'item-2',
            description: 'Otro servicio',
            quantity: 1,
            unitPrice: 200000,
            subtotal: 200000,
            tax: 38000,
            taxRate: 19,
          },
        ],
      };

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: multiItemDoc,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<cbc:LineCountNumeric>2</cbc:LineCountNumeric>');
      // Two InvoiceLine blocks
      const lineMatches = xml.match(/<cac:InvoiceLine>/g);
      expect(lineMatches).toHaveLength(2);
    });

    it('should handle zero tax items', () => {
      const zeroTaxItem = {
        ...mockDocumentItem,
        tax: 0,
        taxRate: 0,
      };
      const doc = {
        ...mockDocument,
        items: [zeroTaxItem],
        tax: 0 as any,
      };

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: doc,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      expect(xml).toContain('<cbc:Percent>0.00</cbc:Percent>');
    });

    it('should handle missing optional config fields', () => {
      const minimalConfig = {
        ...mockDianConfig,
        resolutionNumber: null,
        resolutionPrefix: null,
        postalCode: null,
        softwareId: null,
        softwarePin: null,
        tradeName: null,
        taxResponsibilities: [],
      };

      const xml = service.generateSupportDocumentXml({
        dianConfig: minimalConfig,
        document: mockDocument,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      // Should use businessName when tradeName is null
      expect(xml).toContain('Test Company S.A.S.');
      expect(xml).toContain('<Invoice');
    });

    it('should omit supplier contact when email is empty', () => {
      const docNoEmail = {
        ...mockDocument,
        supplier: { ...mockSupplier, email: '' },
      };

      const xml = service.generateSupportDocumentXml({
        dianConfig: mockDianConfig,
        document: docNoEmail,
        cuds: 'cuds',
        qrCode: 'qr',
      });

      // The contact section should still be included because email is a truthy check
      // Empty string is falsy, so no contact element
      expect(xml).not.toContain(
        '<cbc:ElectronicMail></cbc:ElectronicMail>',
      );
    });
  });
});
