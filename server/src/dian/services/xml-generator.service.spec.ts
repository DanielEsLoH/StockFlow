import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  XmlGeneratorService,
  XmlGeneratorConfig,
  InvoiceWithDetails,
} from './xml-generator.service';
import type { TenantDianConfig, Customer } from '@prisma/client';
import { PaymentMethod } from '@prisma/client';

describe('XmlGeneratorService', () => {
  let service: XmlGeneratorService;

  const mockDianConfig = {
    id: 'config-123',
    tenantId: 'tenant-123',
    nit: '900123456',
    dv: '7',
    businessName: 'Test Company S.A.S',
    tradeName: 'Test Company',
    taxResponsibilities: ['O-15', 'O-48'],
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

  const mockCustomer: Customer = {
    id: 'customer-123',
    tenantId: 'tenant-123',
    name: 'Juan Perez',
    email: 'juan@example.com',
    phone: '3001234567',
    address: 'Carrera 10 #20-30',
    city: 'Medellin',
    state: 'Antioquia',
    country: 'Colombia',
    documentType: 'CC',
    documentNumber: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoice: InvoiceWithDetails = {
    id: 'invoice-123',
    tenantId: 'tenant-123',
    customerId: 'customer-123',
    invoiceNumber: 'SETT100',
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    status: 'PENDING',
    subtotal: 100000 as any,
    tax: 19000 as any,
    discount: 0 as any,
    total: 119000 as any,
    notes: 'Test invoice',
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAmount: 0 as any,
    dianCufe: null,
    customer: mockCustomer,
    items: [
      {
        id: 'item-123',
        tenantId: 'tenant-123',
        invoiceId: 'invoice-123',
        productId: 'product-123',
        description: 'Test Product',
        quantity: 2 as any,
        unitPrice: 50000 as any,
        taxRate: 19 as any,
        discount: 0 as any,
        subtotal: 100000 as any,
        tax: 19000 as any,
        total: 119000 as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: {
          id: 'product-123',
          name: 'Test Product Name',
        },
      },
    ],
  };

  const mockCufe = 'a'.repeat(96);
  const mockQrCode =
    'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=' +
    mockCufe;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [XmlGeneratorService],
    }).compile();

    service = module.get<XmlGeneratorService>(XmlGeneratorService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateInvoiceXml', () => {
    it('should generate valid UBL 2.1 XML for invoice', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toBeDefined();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Invoice');
      expect(xml).toContain('</Invoice>');
    });

    it('should include UBL 2.1 namespaces', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain(
        'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
      );
      expect(xml).toContain(
        'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
      );
      expect(xml).toContain(
        'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"',
      );
    });

    it('should include DIAN extensions', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<ext:UBLExtensions>');
      expect(xml).toContain('<sts:DianExtensions>');
      expect(xml).toContain('<sts:InvoiceControl>');
      expect(xml).toContain(
        '<sts:InvoiceAuthorization>18760000001</sts:InvoiceAuthorization>',
      );
    });

    it('should include resolution information', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<sts:Prefix>SETT</sts:Prefix>');
      expect(xml).toContain('<sts:From>1</sts:From>');
      expect(xml).toContain('<sts:To>5000000</sts:To>');
    });

    it('should include invoice number and CUFE', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:ID>SETT100</cbc:ID>');
      expect(xml).toContain(
        `<cbc:UUID schemeID="2" schemeName="CUFE-SHA384">${mockCufe}</cbc:UUID>`,
      );
    });

    it('should use production profile execution ID when not in test mode', () => {
      const prodConfig = { ...mockDianConfig, testMode: false };
      const config: XmlGeneratorConfig = {
        dianConfig: prodConfig as TenantDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>',
      );
      expect(xml).toContain('schemeID="1"');
    });

    it('should include supplier party information', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cac:AccountingSupplierParty>');
      expect(xml).toContain('<cbc:Name>Test Company</cbc:Name>');
      expect(xml).toContain(
        '<cbc:RegistrationName>Test Company S.A.S</cbc:RegistrationName>',
      );
      expect(xml).toContain('>900123456<');
    });

    it('should include customer party information', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('<cbc:Name>Juan Perez</cbc:Name>');
      expect(xml).toContain('>1234567890<');
    });

    it('should generate generic consumer when no customer', () => {
      const invoiceWithoutCustomer = { ...mockInvoice, customer: null };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceWithoutCustomer,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:Name>Consumidor Final</cbc:Name>');
      expect(xml).toContain('>222222222222<');
    });

    it('should include tax totals', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain(
        '<cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>',
      );
    });

    it('should include legal monetary total', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cac:LegalMonetaryTotal>');
      expect(xml).toContain(
        '<cbc:LineExtensionAmount currencyID="COP">100000.00</cbc:LineExtensionAmount>',
      );
      expect(xml).toContain(
        '<cbc:PayableAmount currencyID="COP">119000.00</cbc:PayableAmount>',
      );
    });

    it('should include invoice lines', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cac:InvoiceLine>');
      expect(xml).toContain(
        '<cbc:InvoicedQuantity unitCode="EA">2</cbc:InvoicedQuantity>',
      );
      expect(xml).toContain(
        '<cbc:Description>Test Product Name</cbc:Description>',
      );
    });

    it('should include QR code', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain(`<sts:QRCode>${mockQrCode}</sts:QRCode>`);
    });

    it('should include software security code', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<sts:SoftwareSecurityCode');
    });

    it('should handle invoice without due date', () => {
      const invoiceNoDueDate = { ...mockInvoice, dueDate: null };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceNoDueDate as InvoiceWithDetails,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toBeDefined();
      expect(xml).toContain('<cbc:DueDate>');
    });

    it('should handle invoice without notes', () => {
      const invoiceNoNotes = { ...mockInvoice, notes: null };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceNoNotes as InvoiceWithDetails,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:Note>Factura electronica</cbc:Note>');
    });

    it('should escape XML special characters', () => {
      const customerWithSpecialChars = {
        ...mockCustomer,
        name: 'Test & Company <S.A.S> "Special"',
      };
      const invoiceWithSpecialChars = {
        ...mockInvoice,
        customer: customerWithSpecialChars,
      };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceWithSpecialChars,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain(
        'Test &amp; Company &lt;S.A.S&gt; &quot;Special&quot;',
      );
    });

    it('should include line count', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:LineCountNumeric>1</cbc:LineCountNumeric>');
    });

    it('should handle multiple invoice items', () => {
      const invoiceMultipleItems = {
        ...mockInvoice,
        items: [
          ...mockInvoice.items,
          {
            id: 'item-456',
            tenantId: 'tenant-123',
            invoiceId: 'invoice-123',
            productId: 'product-456',
            description: 'Second Product',
            quantity: 3 as any,
            unitPrice: 30000 as any,
            taxRate: 19 as any,
            discount: 0 as any,
            subtotal: 90000 as any,
            tax: 17100 as any,
            total: 107100 as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: {
              id: 'product-456',
              name: 'Second Product Name',
            },
          },
        ],
      };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceMultipleItems,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:LineCountNumeric>2</cbc:LineCountNumeric>');
      expect(xml).toContain('Test Product Name');
      expect(xml).toContain('Second Product Name');
    });

    it('should handle item without product', () => {
      const invoiceItemWithoutProduct = {
        ...mockInvoice,
        items: [
          {
            ...mockInvoice.items[0],
            product: null,
          },
        ],
      };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceItemWithoutProduct,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:Description>Producto</cbc:Description>');
    });
  });

  describe('generateCreditNoteXml', () => {
    const originalInvoice: InvoiceWithDetails = {
      ...mockInvoice,
      invoiceNumber: 'SETT099',
      dianCufe: 'b'.repeat(96),
    };

    it('should generate valid UBL 2.1 XML for credit note', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalInvoice,
        'Devolucion de mercancia',
      );

      expect(xml).toBeDefined();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<CreditNote');
      expect(xml).toContain('</CreditNote>');
    });

    it('should include CUDE instead of CUFE', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalInvoice,
        'Devolucion',
      );

      expect(xml).toContain('schemeName="CUDE-SHA384"');
    });

    it('should include discrepancy response', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalInvoice,
        'Devolucion de mercancia',
      );

      expect(xml).toContain('<cac:DiscrepancyResponse>');
      expect(xml).toContain('<cbc:ReferenceID>SETT099</cbc:ReferenceID>');
      expect(xml).toContain('<cbc:ResponseCode>2</cbc:ResponseCode>');
      expect(xml).toContain(
        '<cbc:Description>Devolucion de mercancia</cbc:Description>',
      );
    });

    it('should include billing reference to original invoice', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalInvoice,
        'Anulacion',
      );

      expect(xml).toContain('<cac:BillingReference>');
      expect(xml).toContain('<cac:InvoiceDocumentReference>');
      expect(xml).toContain('<cbc:ID>SETT099</cbc:ID>');
      expect(xml).toContain(
        `schemeName="CUFE-SHA384">${'b'.repeat(96)}</cbc:UUID>`,
      );
    });

    it('should include credit note lines instead of invoice lines', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalInvoice,
        'Devolucion',
      );

      expect(xml).toContain('<cac:CreditNoteLine>');
      expect(xml).toContain('<cbc:CreditedQuantity unitCode="EA">');
      expect(xml).not.toContain('<cac:InvoiceLine>');
    });

    it('should include credit note type code', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalInvoice,
        'Devolucion',
      );

      expect(xml).toContain(
        '<cbc:CreditNoteTypeCode>91</cbc:CreditNoteTypeCode>',
      );
    });

    it('should use customization ID 20 for credit notes', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalInvoice,
        'Devolucion',
      );

      expect(xml).toContain('<cbc:CustomizationID>20</cbc:CustomizationID>');
    });

    it('should handle original invoice without CUFE', () => {
      const originalWithoutCufe = { ...originalInvoice, dianCufe: null };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateCreditNoteXml(
        config,
        originalWithoutCufe,
        'Devolucion',
      );

      expect(xml).toContain('schemeName="CUFE-SHA384"></cbc:UUID>');
    });
  });

  describe('document type mapping', () => {
    it('should map CC document type correctly', () => {
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('schemeName="13"');
    });

    it('should map NIT document type correctly', () => {
      const customerNIT = { ...mockCustomer, documentType: 'NIT' };
      const invoiceNIT = { ...mockInvoice, customer: customerNIT };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceNIT,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('schemeName="31"');
    });

    it('should map CE document type correctly', () => {
      const customerCE = { ...mockCustomer, documentType: 'CE' };
      const invoiceCE = { ...mockInvoice, customer: customerCE };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceCE,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('schemeName="22"');
    });

    it('should map passport document type correctly', () => {
      const customerPP = { ...mockCustomer, documentType: 'PP' };
      const invoicePP = { ...mockInvoice, customer: customerPP };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoicePP,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('schemeName="41"');
    });

    it('should default to CC (13) for unknown document type', () => {
      const customerUnknown = { ...mockCustomer, documentType: 'UNKNOWN' };
      const invoiceUnknown = { ...mockInvoice, customer: customerUnknown };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceUnknown,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('schemeName="13"');
    });
  });

  describe('edge cases', () => {
    it('should handle zero tax invoice', () => {
      const zeroTaxInvoice = {
        ...mockInvoice,
        tax: 0 as any,
        total: 100000 as any,
      };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: zeroTaxInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain(
        '<cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>',
      );
    });

    it('should handle null tax responsibilities', () => {
      const configNoTaxResp = { ...mockDianConfig, taxResponsibilities: null };
      const config: XmlGeneratorConfig = {
        dianConfig: configNoTaxResp as TenantDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toBeDefined();
      expect(xml).toContain('<Invoice');
    });

    it('should handle customer without email', () => {
      const customerNoEmail = { ...mockCustomer, email: null };
      const invoiceNoEmail = { ...mockInvoice, customer: customerNoEmail };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceNoEmail,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).not.toContain('<cac:Contact><cbc:ElectronicMail>');
    });

    it('should handle customer without address', () => {
      const customerNoAddress = { ...mockCustomer, address: null };
      const invoiceNoAddress = { ...mockInvoice, customer: customerNoAddress };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceNoAddress,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:Line>Sin direccion</cbc:Line>');
    });

    it('should handle customer without city', () => {
      const customerNoCity = { ...mockCustomer, city: null };
      const invoiceNoCity = { ...mockInvoice, customer: customerNoCity };
      const config: XmlGeneratorConfig = {
        dianConfig: mockDianConfig,
        invoice: invoiceNoCity,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:CityName>Bogota D.C.</cbc:CityName>');
    });

    it('should handle config without software ID', () => {
      const configNoSoftware = {
        ...mockDianConfig,
        softwareId: null,
        softwarePin: null,
      };
      const config: XmlGeneratorConfig = {
        dianConfig: configNoSoftware as TenantDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toBeDefined();
      expect(xml).toContain('<sts:SoftwareID');
    });

    it('should handle config without resolution data', () => {
      const configNoResolution = {
        ...mockDianConfig,
        resolutionNumber: null,
        resolutionPrefix: null,
        resolutionRangeFrom: null,
        resolutionRangeTo: null,
      };
      const config: XmlGeneratorConfig = {
        dianConfig: configNoResolution as TenantDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toBeDefined();
      expect(xml).toContain(
        '<sts:InvoiceAuthorization></sts:InvoiceAuthorization>',
      );
    });

    it('should handle config without postal code', () => {
      const configNoPostal = { ...mockDianConfig, postalCode: null };
      const config: XmlGeneratorConfig = {
        dianConfig: configNoPostal as TenantDianConfig,
        invoice: mockInvoice,
        cufe: mockCufe,
        qrCode: mockQrCode,
      };

      const xml = service.generateInvoiceXml(config);

      expect(xml).toContain('<cbc:PostalZone></cbc:PostalZone>');
    });
  });
});
