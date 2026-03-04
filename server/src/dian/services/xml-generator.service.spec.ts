import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  XmlGeneratorService,
  XmlGeneratorConfig,
  InvoiceWithDetails,
  DebitNoteItem,
} from './xml-generator.service';
import type { TenantDianConfig, Customer } from '@prisma/client';
import {
  CreditNoteReason,
  DebitNoteReason,
  PaymentMethod,
} from '@prisma/client';

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
  } as unknown as TenantDianConfig;

  const mockCustomer = {
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
  } as unknown as Customer;

  const mockInvoice = {
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
        taxCategory: 'GRAVADO_19',
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
  } as unknown as InvoiceWithDetails;

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
            taxCategory: 'GRAVADO_19' as any,
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
        CreditNoteReason.DEVOLUCION_PARCIAL,
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
        CreditNoteReason.DEVOLUCION_PARCIAL,
      );

      expect(xml).toContain('schemeName="CUDE-SHA384"');
    });

    it('should include discrepancy response with dynamic response code', () => {
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
        CreditNoteReason.ANULACION,
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
        CreditNoteReason.ANULACION,
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
        CreditNoteReason.DEVOLUCION_PARCIAL,
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
        CreditNoteReason.DEVOLUCION_PARCIAL,
      );

      expect(xml).toContain(
        '<cbc:CreditNoteTypeCode listAgencyID="6" listID="UNCL1001">91</cbc:CreditNoteTypeCode>',
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
        CreditNoteReason.DEVOLUCION_PARCIAL,
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
        CreditNoteReason.DEVOLUCION_PARCIAL,
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
        invoice: invoiceNIT as unknown as InvoiceWithDetails,
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
        invoice: invoiceCE as unknown as InvoiceWithDetails,
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
        invoice: invoicePP as unknown as InvoiceWithDetails,
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
        invoice: invoiceUnknown as unknown as InvoiceWithDetails,
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
        dianConfig: configNoTaxResp as unknown as TenantDianConfig,
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

  // ==========================================================================
  // generateDebitNoteXml
  // ==========================================================================

  describe('generateDebitNoteXml', () => {
    const originalInvoice: InvoiceWithDetails = {
      ...mockInvoice,
      invoiceNumber: 'SETT099',
      dianCufe: 'b'.repeat(96),
    };

    const debitNoteItems: DebitNoteItem[] = [
      {
        description: 'Interes por mora',
        quantity: 1,
        unitPrice: 50000,
        taxRate: 19,
      },
    ];

    const makeConfig = (
      overrides: Partial<XmlGeneratorConfig> = {},
    ): XmlGeneratorConfig => ({
      dianConfig: mockDianConfig,
      invoice: mockInvoice,
      cufe: mockCufe,
      qrCode: mockQrCode,
      ...overrides,
    });

    it('should generate valid UBL 2.1 XML for debit note', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro de intereses',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toBeDefined();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<DebitNote');
      expect(xml).toContain('</DebitNote>');
    });

    it('should include DebitNote namespace', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro de intereses',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain(
        'xmlns="urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2"',
      );
    });

    it('should include UBL extension namespaces without root Invoice namespace', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain(
        'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
      );
      expect(xml).toContain(
        'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"',
      );
      expect(xml).toContain(
        'xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"',
      );
    });

    it('should include CUDE instead of CUFE', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro de intereses',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('schemeName="CUDE-SHA384"');
      expect(xml).not.toContain('schemeName="CUFE-SHA384">' + mockCufe);
    });

    it('should use customization ID 22 for debit notes', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro de intereses',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('<cbc:CustomizationID>22</cbc:CustomizationID>');
    });

    it('should include debit note type code 92', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain(
        '<cbc:DebitNoteTypeCode listAgencyID="6" listID="UNCL1001">92</cbc:DebitNoteTypeCode>',
      );
    });

    it('should include discrepancy response with INTERESES response code 1', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro de intereses por mora',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('<cac:DiscrepancyResponse>');
      expect(xml).toContain('<cbc:ReferenceID>SETT099</cbc:ReferenceID>');
      expect(xml).toContain('<cbc:ResponseCode>1</cbc:ResponseCode>');
      expect(xml).toContain(
        '<cbc:Description>Cobro de intereses por mora</cbc:Description>',
      );
    });

    it('should map GASTOS reason to response code 2', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Gastos adicionales',
        DebitNoteReason.GASTOS,
        debitNoteItems,
      );

      expect(xml).toContain('<cbc:ResponseCode>2</cbc:ResponseCode>');
    });

    it('should map CAMBIO_VALOR reason to response code 3', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cambio de valor',
        DebitNoteReason.CAMBIO_VALOR,
        debitNoteItems,
      );

      expect(xml).toContain('<cbc:ResponseCode>3</cbc:ResponseCode>');
    });

    it('should map OTRO reason to response code 4', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Otro motivo',
        DebitNoteReason.OTRO,
        debitNoteItems,
      );

      expect(xml).toContain('<cbc:ResponseCode>4</cbc:ResponseCode>');
    });

    it('should include billing reference to original invoice', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro de intereses',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('<cac:BillingReference>');
      expect(xml).toContain('<cac:InvoiceDocumentReference>');
      expect(xml).toContain('<cbc:ID>SETT099</cbc:ID>');
      expect(xml).toContain(
        `schemeName="CUFE-SHA384">${'b'.repeat(96)}</cbc:UUID>`,
      );
    });

    it('should handle original invoice without CUFE', () => {
      const originalWithoutCufe = { ...originalInvoice, dianCufe: null };
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalWithoutCufe,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('schemeName="CUFE-SHA384"></cbc:UUID>');
    });

    it('should calculate tax totals from debit note items', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      // 1 * 50000 = 50000 subtotal, 50000 * 0.19 = 9500 tax
      expect(xml).toContain(
        '<cbc:TaxAmount currencyID="COP">9500.00</cbc:TaxAmount>',
      );
      expect(xml).toContain(
        '<cbc:TaxableAmount currencyID="COP">50000.00</cbc:TaxableAmount>',
      );
    });

    it('should calculate totals correctly for multiple items', () => {
      const multipleItems: DebitNoteItem[] = [
        {
          description: 'Interes mora',
          quantity: 1,
          unitPrice: 50000,
          taxRate: 19,
        },
        {
          description: 'Gastos adicionales',
          quantity: 2,
          unitPrice: 25000,
          taxRate: 19,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Varios cargos',
        DebitNoteReason.GASTOS,
        multipleItems,
      );

      // item1: 1*50000 = 50000 sub, 9500 tax
      // item2: 2*25000 = 50000 sub, 9500 tax
      // total: 100000 sub, 19000 tax, 119000 total
      expect(xml).toContain(
        '<cbc:LineExtensionAmount currencyID="COP">100000.00</cbc:LineExtensionAmount>',
      );
      expect(xml).toContain(
        '<cbc:PayableAmount currencyID="COP">119000.00</cbc:PayableAmount>',
      );
    });

    it('should use RequestedMonetaryTotal instead of LegalMonetaryTotal', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('<cac:RequestedMonetaryTotal>');
      expect(xml).toContain('</cac:RequestedMonetaryTotal>');
      expect(xml).not.toContain('<cac:LegalMonetaryTotal>');
    });

    it('should generate debit note lines', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('<cac:DebitNoteLine>');
      expect(xml).toContain(
        '<cbc:DebitedQuantity unitCode="EA">1</cbc:DebitedQuantity>',
      );
      expect(xml).toContain(
        '<cbc:Description>Interes por mora</cbc:Description>',
      );
      expect(xml).not.toContain('<cac:InvoiceLine>');
      expect(xml).not.toContain('<cac:CreditNoteLine>');
    });

    it('should include line count matching debit note items', () => {
      const multipleItems: DebitNoteItem[] = [
        {
          description: 'Item A',
          quantity: 1,
          unitPrice: 10000,
          taxRate: 19,
        },
        {
          description: 'Item B',
          quantity: 2,
          unitPrice: 20000,
          taxRate: 19,
        },
        {
          description: 'Item C',
          quantity: 3,
          unitPrice: 30000,
          taxRate: 19,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Multiples cargos',
        DebitNoteReason.GASTOS,
        multipleItems,
      );

      expect(xml).toContain('<cbc:LineCountNumeric>3</cbc:LineCountNumeric>');
    });

    it('should use the original invoice customer party', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('<cbc:Name>Juan Perez</cbc:Name>');
    });

    it('should handle zero-tax items', () => {
      const zeroTaxItems: DebitNoteItem[] = [
        {
          description: 'Servicio exento',
          quantity: 1,
          unitPrice: 100000,
          taxRate: 0,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cargo adicional',
        DebitNoteReason.OTRO,
        zeroTaxItems,
      );

      expect(xml).toContain(
        '<cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>',
      );
      expect(xml).toContain(
        '<cbc:PayableAmount currencyID="COP">100000.00</cbc:PayableAmount>',
      );
    });

    it('should use default tax rate 19% when items array is empty', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        [],
      );

      // With no items: subtotal=0, tax=0
      expect(xml).toContain(
        '<cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>',
      );
      expect(xml).toContain('<cbc:Percent>19.00</cbc:Percent>');
      expect(xml).toContain('<cbc:LineCountNumeric>0</cbc:LineCountNumeric>');
    });

    it('should escape special characters in debit note item descriptions', () => {
      const specialItems: DebitNoteItem[] = [
        {
          description: 'Interes & recargo <adicional>',
          quantity: 1,
          unitPrice: 10000,
          taxRate: 19,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        specialItems,
      );

      expect(xml).toContain(
        '<cbc:Description>Interes &amp; recargo &lt;adicional&gt;</cbc:Description>',
      );
    });

    it('should use production profile when testMode is false', () => {
      const prodConfig = { ...mockDianConfig, testMode: false };
      const xml = service.generateDebitNoteXml(
        makeConfig({
          dianConfig: prodConfig as TenantDianConfig,
        }),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>',
      );
      expect(xml).toContain('schemeID="1"');
    });

    it('should include DIAN extensions with software provider and QR code', () => {
      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.INTERESES,
        debitNoteItems,
      );

      expect(xml).toContain('<sts:DianExtensions>');
      expect(xml).toContain('<sts:SoftwareProvider>');
      expect(xml).toContain(`<sts:QRCode>${mockQrCode}</sts:QRCode>`);
      expect(xml).toContain('<sts:SoftwareSecurityCode');
    });

    it('should compute per-line tax correctly for debit note lines', () => {
      const items: DebitNoteItem[] = [
        {
          description: 'Item A',
          quantity: 3,
          unitPrice: 20000,
          taxRate: 5,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cobro',
        DebitNoteReason.GASTOS,
        items,
      );

      // lineSubtotal = 3 * 20000 = 60000
      // lineTax = 60000 * 0.05 = 3000
      expect(xml).toContain(
        '<cbc:LineExtensionAmount currencyID="COP">60000.00</cbc:LineExtensionAmount>',
      );
      expect(xml).toContain('<cbc:Percent>5.00</cbc:Percent>');
    });
  });

  // ==========================================================================
  // generateDocumentoEquivalenteXml
  // ==========================================================================

  describe('generateDocumentoEquivalenteXml', () => {
    const mockDianConfigWithPos = {
      ...mockDianConfig,
      posResolutionNumber: '18764000001',
      posResolutionDate: new Date('2024-06-01'),
      posResolutionPrefix: 'POS',
      posResolutionRangeFrom: 1,
      posResolutionRangeTo: 500000,
      posCurrentNumber: 10,
    } as unknown as TenantDianConfig;

    const makeConfig = (
      overrides: Partial<XmlGeneratorConfig> = {},
    ): XmlGeneratorConfig => ({
      dianConfig: mockDianConfigWithPos,
      invoice: mockInvoice,
      cufe: mockCufe,
      qrCode: mockQrCode,
      ...overrides,
    });

    it('should generate valid UBL 2.1 XML wrapped in Invoice element', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toBeDefined();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Invoice');
      expect(xml).toContain('</Invoice>');
    });

    it('should include Invoice namespace (same as regular invoice)', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain(
        'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
      );
    });

    it('should use invoice type code 03 for documento equivalente', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain(
        '<cbc:InvoiceTypeCode>03</cbc:InvoiceTypeCode>',
      );
    });

    it('should use customization ID 11', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cbc:CustomizationID>11</cbc:CustomizationID>');
    });

    it('should include POS-specific note', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain(
        '<cbc:Note>Documento equivalente electronico POS</cbc:Note>',
      );
    });

    it('should use CUDE instead of CUFE', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('schemeName="CUDE-SHA384"');
    });

    it('should use POS resolution number in InvoiceAuthorization', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain(
        '<sts:InvoiceAuthorization>18764000001</sts:InvoiceAuthorization>',
      );
    });

    it('should use POS resolution prefix and range', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<sts:Prefix>POS</sts:Prefix>');
      expect(xml).toContain('<sts:From>1</sts:From>');
      expect(xml).toContain('<sts:To>500000</sts:To>');
    });

    it('should use POS resolution date for authorization period', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cbc:StartDate>2024-06-01</cbc:StartDate>');
      expect(xml).toContain('<cbc:EndDate>2026-06-01</cbc:EndDate>');
    });

    it('should fall back to regular resolution date when POS date is null', () => {
      const configNoPosDate = {
        ...mockDianConfigWithPos,
        posResolutionDate: null,
      } as unknown as TenantDianConfig;

      const xml = service.generateDocumentoEquivalenteXml(
        makeConfig({ dianConfig: configNoPosDate }),
      );

      // Falls back to dianConfig.resolutionDate which is 2024-01-01
      expect(xml).toContain('<cbc:StartDate>2024-01-01</cbc:StartDate>');
      expect(xml).toContain('<cbc:EndDate>2026-01-01</cbc:EndDate>');
    });

    it('should fall back to empty/defaults when POS fields are all null', () => {
      const configNoPosFields = {
        ...mockDianConfig,
        posResolutionNumber: null,
        posResolutionDate: null,
        posResolutionPrefix: null,
        posResolutionRangeFrom: null,
        posResolutionRangeTo: null,
      } as unknown as TenantDianConfig;

      const xml = service.generateDocumentoEquivalenteXml(
        makeConfig({ dianConfig: configNoPosFields }),
      );

      expect(xml).toContain(
        '<sts:InvoiceAuthorization></sts:InvoiceAuthorization>',
      );
      expect(xml).toContain('<sts:Prefix></sts:Prefix>');
      expect(xml).toContain('<sts:From>1</sts:From>');
      expect(xml).toContain('<sts:To>999999</sts:To>');
    });

    it('should include supplier party information', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cac:AccountingSupplierParty>');
      expect(xml).toContain('<cbc:Name>Test Company</cbc:Name>');
      expect(xml).toContain('>900123456<');
    });

    it('should include customer party information', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('<cbc:Name>Juan Perez</cbc:Name>');
    });

    it('should generate generic consumer when no customer', () => {
      const invoiceWithoutCustomer = { ...mockInvoice, customer: null };
      const xml = service.generateDocumentoEquivalenteXml(
        makeConfig({ invoice: invoiceWithoutCustomer }),
      );

      expect(xml).toContain('<cbc:Name>Consumidor Final</cbc:Name>');
      expect(xml).toContain('>222222222222<');
    });

    it('should include payment means', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cac:PaymentMeans>');
      expect(xml).toContain('<cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>');
    });

    it('should include tax totals', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain(
        '<cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>',
      );
    });

    it('should include legal monetary total', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cac:LegalMonetaryTotal>');
      expect(xml).toContain(
        '<cbc:LineExtensionAmount currencyID="COP">100000.00</cbc:LineExtensionAmount>',
      );
      expect(xml).toContain(
        '<cbc:PayableAmount currencyID="COP">119000.00</cbc:PayableAmount>',
      );
    });

    it('should include invoice lines (same as regular invoice)', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cac:InvoiceLine>');
      expect(xml).toContain(
        '<cbc:InvoicedQuantity unitCode="EA">2</cbc:InvoicedQuantity>',
      );
      expect(xml).toContain(
        '<cbc:Description>Test Product Name</cbc:Description>',
      );
    });

    it('should include line count', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<cbc:LineCountNumeric>1</cbc:LineCountNumeric>');
    });

    it('should include QR code', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain(`<sts:QRCode>${mockQrCode}</sts:QRCode>`);
    });

    it('should include DIAN extensions with InvoiceControl', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain('<ext:UBLExtensions>');
      expect(xml).toContain('<sts:DianExtensions>');
      expect(xml).toContain('<sts:InvoiceControl>');
      expect(xml).toContain('<sts:AuthorizationProvider>');
    });

    it('should use test profile execution ID when in test mode', () => {
      const xml = service.generateDocumentoEquivalenteXml(makeConfig());

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>',
      );
      expect(xml).toContain('schemeID="2"');
    });

    it('should use production profile when not in test mode', () => {
      const prodConfig = {
        ...mockDianConfigWithPos,
        testMode: false,
      } as unknown as TenantDianConfig;
      const xml = service.generateDocumentoEquivalenteXml(
        makeConfig({ dianConfig: prodConfig }),
      );

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>',
      );
      expect(xml).toContain('schemeID="1"');
    });

    it('should handle invoice without due date by using issue date', () => {
      const invoiceNoDueDate = { ...mockInvoice, dueDate: null };
      const xml = service.generateDocumentoEquivalenteXml(
        makeConfig({
          invoice: invoiceNoDueDate as InvoiceWithDetails,
        }),
      );

      expect(xml).toBeDefined();
      expect(xml).toContain('<cbc:DueDate>');
    });
  });

  // ==========================================================================
  // generateNotaAjusteXml
  // ==========================================================================

  describe('generateNotaAjusteXml', () => {
    const originalDoc = {
      documentNumber: 'POS00000010',
      cude: 'c'.repeat(96),
      issueDate: new Date('2024-06-15'),
    };

    const makeConfig = (
      overrides: Partial<XmlGeneratorConfig> = {},
    ): XmlGeneratorConfig => ({
      dianConfig: mockDianConfig,
      invoice: mockInvoice,
      cufe: mockCufe,
      qrCode: mockQrCode,
      ...overrides,
    });

    it('should generate valid UBL 2.1 XML for nota de ajuste', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion de mercancia POS',
        '1',
      );

      expect(xml).toBeDefined();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<CreditNote');
      expect(xml).toContain('</CreditNote>');
    });

    it('should include CreditNote namespace (not DebitNote)', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain(
        'xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"',
      );
    });

    it('should use customization ID 25 for nota de ajuste', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cbc:CustomizationID>25</cbc:CustomizationID>');
    });

    it('should use credit note type code 95', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain(
        '<cbc:CreditNoteTypeCode listAgencyID="6" listID="UNCL1001">95</cbc:CreditNoteTypeCode>',
      );
    });

    it('should include CUDE instead of CUFE', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('schemeName="CUDE-SHA384"');
    });

    it('should include discrepancy response with original document reference', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Anulacion de documento equivalente',
        '2',
      );

      expect(xml).toContain('<cac:DiscrepancyResponse>');
      expect(xml).toContain(
        '<cbc:ReferenceID>POS00000010</cbc:ReferenceID>',
      );
      expect(xml).toContain('<cbc:ResponseCode>2</cbc:ResponseCode>');
      expect(xml).toContain(
        '<cbc:Description>Anulacion de documento equivalente</cbc:Description>',
      );
    });

    it('should include billing reference with CUDE (not CUFE) scheme for original doc', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cac:BillingReference>');
      expect(xml).toContain('<cac:InvoiceDocumentReference>');
      expect(xml).toContain('<cbc:ID>POS00000010</cbc:ID>');
      expect(xml).toContain(
        `schemeName="CUDE-SHA384">${'c'.repeat(96)}</cbc:UUID>`,
      );
      expect(xml).toContain('<cbc:IssueDate>2024-06-15</cbc:IssueDate>');
    });

    it('should include credit note lines (not invoice lines)', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cac:CreditNoteLine>');
      expect(xml).toContain('<cbc:CreditedQuantity unitCode="EA">');
      expect(xml).not.toContain('<cac:InvoiceLine>');
      expect(xml).not.toContain('<cac:DebitNoteLine>');
    });

    it('should include supplier party information', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cac:AccountingSupplierParty>');
      expect(xml).toContain('>900123456<');
    });

    it('should include customer party from invoice', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('<cbc:Name>Juan Perez</cbc:Name>');
    });

    it('should include tax totals from the invoice', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain(
        '<cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>',
      );
    });

    it('should include legal monetary total', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cac:LegalMonetaryTotal>');
      expect(xml).toContain(
        '<cbc:PayableAmount currencyID="COP">119000.00</cbc:PayableAmount>',
      );
    });

    it('should include line count from invoice items', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cbc:LineCountNumeric>1</cbc:LineCountNumeric>');
    });

    it('should include DIAN extensions with QR code', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<sts:DianExtensions>');
      expect(xml).toContain(`<sts:QRCode>${mockQrCode}</sts:QRCode>`);
      expect(xml).toContain('<sts:SoftwareSecurityCode');
    });

    it('should use test profile execution ID when in test mode', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>',
      );
    });

    it('should use production profile when not in test mode', () => {
      const prodConfig = {
        ...mockDianConfig,
        testMode: false,
      } as TenantDianConfig;

      const xml = service.generateNotaAjusteXml(
        makeConfig({ dianConfig: prodConfig }),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain(
        '<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>',
      );
      expect(xml).toContain('schemeID="1"');
    });

    it('should pass reason code as-is (string) for nota de ajuste', () => {
      const xml = service.generateNotaAjusteXml(
        makeConfig(),
        originalDoc,
        'Descuento POS',
        '3',
      );

      expect(xml).toContain('<cbc:ResponseCode>3</cbc:ResponseCode>');
      expect(xml).toContain(
        '<cbc:Description>Descuento POS</cbc:Description>',
      );
    });

    it('should handle invoice with no customer (generic consumer)', () => {
      const invoiceNoCustomer = { ...mockInvoice, customer: null };
      const xml = service.generateNotaAjusteXml(
        makeConfig({
          invoice: invoiceNoCustomer,
        }),
        originalDoc,
        'Devolucion',
        '1',
      );

      expect(xml).toContain('<cbc:Name>Consumidor Final</cbc:Name>');
      expect(xml).toContain('>222222222222<');
    });
  });

  // ==========================================================================
  // generateDebitNoteLines (covered via generateDebitNoteXml, but focused tests)
  // ==========================================================================

  describe('generateDebitNoteLines (via generateDebitNoteXml)', () => {
    const originalInvoice: InvoiceWithDetails = {
      ...mockInvoice,
      invoiceNumber: 'SETT099',
      dianCufe: 'b'.repeat(96),
    };

    const makeConfig = (): XmlGeneratorConfig => ({
      dianConfig: mockDianConfig,
      invoice: mockInvoice,
      cufe: mockCufe,
      qrCode: mockQrCode,
    });

    it('should generate sequential line IDs starting from 1', () => {
      const items: DebitNoteItem[] = [
        {
          description: 'Item A',
          quantity: 1,
          unitPrice: 10000,
          taxRate: 19,
        },
        {
          description: 'Item B',
          quantity: 2,
          unitPrice: 20000,
          taxRate: 19,
        },
        {
          description: 'Item C',
          quantity: 3,
          unitPrice: 30000,
          taxRate: 5,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Varios',
        DebitNoteReason.GASTOS,
        items,
      );

      // Check sequential IDs within DebitNoteLine
      const lineIdMatches = xml.match(
        /<cac:DebitNoteLine>\s*<cbc:ID>(\d+)<\/cbc:ID>/g,
      );
      expect(lineIdMatches).toHaveLength(3);
      expect(xml).toContain(
        '<cac:DebitNoteLine>\n    <cbc:ID>1</cbc:ID>',
      );
      expect(xml).toContain(
        '<cac:DebitNoteLine>\n    <cbc:ID>2</cbc:ID>',
      );
      expect(xml).toContain(
        '<cac:DebitNoteLine>\n    <cbc:ID>3</cbc:ID>',
      );
    });

    it('should calculate per-line extension amount as quantity * unitPrice', () => {
      const items: DebitNoteItem[] = [
        {
          description: 'Bulk item',
          quantity: 5,
          unitPrice: 15000,
          taxRate: 19,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cargo',
        DebitNoteReason.GASTOS,
        items,
      );

      // 5 * 15000 = 75000
      expect(xml).toContain(
        '<cbc:DebitedQuantity unitCode="EA">5</cbc:DebitedQuantity>',
      );
      expect(xml).toContain(
        '<cbc:PriceAmount currencyID="COP">15000.00</cbc:PriceAmount>',
      );
    });

    it('should include tax scheme ID 01 (IVA) and name in each line', () => {
      const items: DebitNoteItem[] = [
        {
          description: 'Item',
          quantity: 1,
          unitPrice: 10000,
          taxRate: 19,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cargo',
        DebitNoteReason.GASTOS,
        items,
      );

      // Check within the DebitNoteLine context
      expect(xml).toContain('<cbc:ID>01</cbc:ID>');
      expect(xml).toContain('<cbc:Name>IVA</cbc:Name>');
    });

    it('should include base quantity 1 in price element', () => {
      const items: DebitNoteItem[] = [
        {
          description: 'Item',
          quantity: 10,
          unitPrice: 5000,
          taxRate: 19,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cargo',
        DebitNoteReason.GASTOS,
        items,
      );

      expect(xml).toContain(
        '<cbc:BaseQuantity unitCode="EA">1</cbc:BaseQuantity>',
      );
    });

    it('should handle items with different tax rates', () => {
      const items: DebitNoteItem[] = [
        {
          description: 'Item IVA 19%',
          quantity: 1,
          unitPrice: 100000,
          taxRate: 19,
        },
        {
          description: 'Item IVA 5%',
          quantity: 1,
          unitPrice: 50000,
          taxRate: 5,
        },
      ];

      const xml = service.generateDebitNoteXml(
        makeConfig(),
        originalInvoice,
        'Cargos',
        DebitNoteReason.GASTOS,
        items,
      );

      expect(xml).toContain('<cbc:Percent>19.00</cbc:Percent>');
      expect(xml).toContain('<cbc:Percent>5.00</cbc:Percent>');
      expect(xml).toContain(
        '<cbc:Description>Item IVA 19%</cbc:Description>',
      );
      expect(xml).toContain(
        '<cbc:Description>Item IVA 5%</cbc:Description>',
      );
    });
  });
});
