import { Injectable, Logger } from '@nestjs/common';
import {
  TenantDianConfig,
  Invoice,
  InvoiceItem,
  Customer,
  PaymentMethod,
  Product,
  CreditNoteReason,
  DebitNoteReason,
} from '@prisma/client';

export interface InvoiceItemWithProduct extends InvoiceItem {
  product: Pick<Product, 'id' | 'name'> | null;
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer | null;
  items: InvoiceItemWithProduct[];
}

export interface XmlGeneratorConfig {
  dianConfig: TenantDianConfig;
  invoice: InvoiceWithDetails;
  cufe: string;
  qrCode: string;
}

export interface DebitNoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

// DIAN ResponseCode mapping for credit notes
const CREDIT_NOTE_RESPONSE_CODES: Record<CreditNoteReason, string> = {
  DEVOLUCION_PARCIAL: '1',
  ANULACION: '2',
  DESCUENTO: '3',
  AJUSTE_PRECIO: '4',
  OTRO: '5',
};

// DIAN ResponseCode mapping for debit notes
const DEBIT_NOTE_RESPONSE_CODES: Record<DebitNoteReason, string> = {
  INTERESES: '1',
  GASTOS: '2',
  CAMBIO_VALOR: '3',
  OTRO: '4',
};

/**
 * Generates UBL 2.1 XML documents for Colombian electronic invoicing (DIAN)
 * Based on the Colombian technical annex for electronic invoicing
 */
@Injectable()
export class XmlGeneratorService {
  private readonly logger = new Logger(XmlGeneratorService.name);

  // Colombian UBL 2.1 namespaces
  private readonly namespaces = {
    xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'xmlns:cac':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'xmlns:cbc':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    'xmlns:ext':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    'xmlns:sts': 'dian:gov:co:facturaelectronica:Structures-2-1',
    'xmlns:xades': 'http://uri.etsi.org/01903/v1.3.2#',
    'xmlns:xades141': 'http://uri.etsi.org/01903/v1.4.1#',
    'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
  };

  // Tax type codes for Colombia
  private readonly taxTypeCodes = {
    IVA: '01',
    INC: '04',
    ICA: '03',
    ReteIVA: '05',
    ReteRenta: '06',
    ReteICA: '07',
  };

  // Payment method codes for DIAN
  private readonly paymentMethodCodes: Record<PaymentMethod, string> = {
    CASH: '10',
    CREDIT_CARD: '48',
    DEBIT_CARD: '48',
    BANK_TRANSFER: '42',
    PSE: '42',
    NEQUI: '42',
    DAVIPLATA: '42',
    OTHER: '1',
  };

  /**
   * Generate UBL 2.1 XML for an electronic invoice
   */
  generateInvoiceXml(config: XmlGeneratorConfig): string {
    const { dianConfig, invoice, cufe, qrCode } = config;

    this.logger.log(`Generating XML for invoice ${invoice.invoiceNumber}`);

    const issueDate = new Date(invoice.issueDate);
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : issueDate;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice ${this.formatNamespaces()}>
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceControl>
            <sts:InvoiceAuthorization>${dianConfig.resolutionNumber || ''}</sts:InvoiceAuthorization>
            <sts:AuthorizationPeriod>
              <cbc:StartDate>${this.formatDate(dianConfig.resolutionDate || new Date())}</cbc:StartDate>
              <cbc:EndDate>${this.formatDate(this.addYears(dianConfig.resolutionDate || new Date(), 2))}</cbc:EndDate>
            </sts:AuthorizationPeriod>
            <sts:AuthorizedInvoices>
              <sts:Prefix>${dianConfig.resolutionPrefix || ''}</sts:Prefix>
              <sts:From>${dianConfig.resolutionRangeFrom || 1}</sts:From>
              <sts:To>${dianConfig.resolutionRangeTo || 999999}</sts:To>
            </sts:AuthorizedInvoices>
          </sts:InvoiceControl>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1">CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)" schemeID="${dianConfig.dv}" schemeName="31">${dianConfig.nit}</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)">${dianConfig.softwareId || ''}</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195" schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)">${this.generateSoftwareSecurityCode(dianConfig, invoice.invoiceNumber)}</sts:SoftwareSecurityCode>
          <sts:AuthorizationProvider>
            <sts:AuthorizationProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)" schemeID="4" schemeName="31">800197268</sts:AuthorizationProviderID>
          </sts:AuthorizationProvider>
          <sts:QRCode>${qrCode}</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${dianConfig.testMode ? '2' : '1'}</cbc:ProfileExecutionID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:UUID schemeID="${dianConfig.testMode ? '2' : '1'}" schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${this.formatDate(issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${this.formatTime(issueDate)}</cbc:IssueTime>
  <cbc:DueDate>${this.formatDate(dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:Note>${invoice.notes || 'Factura electronica'}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${invoice.items.length}</cbc:LineCountNumeric>
${this.generateSupplierParty(dianConfig)}
${this.generateCustomerParty(invoice.customer)}
${this.generatePaymentMeans(invoice)}
${this.generateTaxTotal(invoice)}
${this.generateLegalMonetaryTotal(invoice)}
${this.generateInvoiceLines(invoice.items)}
</Invoice>`;

    return xml;
  }

  /**
   * Generate UBL 2.1 XML for a credit note
   */
  generateCreditNoteXml(
    config: XmlGeneratorConfig,
    originalInvoice: InvoiceWithDetails,
    reason: string,
    reasonCode: CreditNoteReason,
  ): string {
    const { dianConfig, invoice, cufe, qrCode } = config;
    const responseCode = CREDIT_NOTE_RESPONSE_CODES[reasonCode];

    this.logger.log(
      `Generating Credit Note XML for invoice ${invoice.invoiceNumber}`,
    );

    const issueDate = new Date();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2" ${this.formatNamespacesWithoutRoot()}>
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe">CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195" schemeID="${dianConfig.dv}" schemeName="31">${dianConfig.nit}</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195">${dianConfig.softwareId || ''}</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195">${this.generateSoftwareSecurityCode(dianConfig, invoice.invoiceNumber)}</sts:SoftwareSecurityCode>
          <sts:QRCode>${qrCode}</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>20</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${dianConfig.testMode ? '2' : '1'}</cbc:ProfileExecutionID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:UUID schemeID="${dianConfig.testMode ? '2' : '1'}" schemeName="CUDE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${this.formatDate(issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${this.formatTime(issueDate)}</cbc:IssueTime>
  <cbc:CreditNoteTypeCode listAgencyID="6" listID="UNCL1001">91</cbc:CreditNoteTypeCode>
  <cbc:Note>${reason}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${invoice.items.length}</cbc:LineCountNumeric>
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${originalInvoice.invoiceNumber}</cbc:ReferenceID>
    <cbc:ResponseCode>${responseCode}</cbc:ResponseCode>
    <cbc:Description>${reason}</cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${originalInvoice.invoiceNumber}</cbc:ID>
      <cbc:UUID schemeName="CUFE-SHA384">${originalInvoice.dianCufe || ''}</cbc:UUID>
      <cbc:IssueDate>${this.formatDate(new Date(originalInvoice.issueDate))}</cbc:IssueDate>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
${this.generateSupplierParty(dianConfig)}
${this.generateCustomerParty(invoice.customer)}
${this.generateTaxTotal(invoice)}
${this.generateLegalMonetaryTotal(invoice)}
${this.generateCreditNoteLines(invoice.items)}
</CreditNote>`;

    return xml;
  }

  /**
   * Generate UBL 2.1 XML for a debit note
   */
  generateDebitNoteXml(
    config: XmlGeneratorConfig,
    originalInvoice: InvoiceWithDetails,
    reason: string,
    reasonCode: DebitNoteReason,
    items: DebitNoteItem[],
  ): string {
    const { dianConfig, invoice, cufe, qrCode } = config;
    const responseCode = DEBIT_NOTE_RESPONSE_CODES[reasonCode];

    this.logger.log(
      `Generating Debit Note XML for invoice ${invoice.invoiceNumber}`,
    );

    const issueDate = new Date();

    // Calculate totals from debit note items
    let subtotal = 0;
    let totalTax = 0;
    for (const item of items) {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineTax = lineSubtotal * (item.taxRate / 100);
      subtotal += lineSubtotal;
      totalTax += lineTax;
    }
    const total = subtotal + totalTax;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DebitNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2" ${this.formatNamespacesWithoutRoot()}>
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe">CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195" schemeID="${dianConfig.dv}" schemeName="31">${dianConfig.nit}</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195">${dianConfig.softwareId || ''}</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195">${this.generateSoftwareSecurityCode(dianConfig, invoice.invoiceNumber)}</sts:SoftwareSecurityCode>
          <sts:QRCode>${qrCode}</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>22</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${dianConfig.testMode ? '2' : '1'}</cbc:ProfileExecutionID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:UUID schemeID="${dianConfig.testMode ? '2' : '1'}" schemeName="CUDE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${this.formatDate(issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${this.formatTime(issueDate)}</cbc:IssueTime>
  <cbc:DebitNoteTypeCode listAgencyID="6" listID="UNCL1001">92</cbc:DebitNoteTypeCode>
  <cbc:Note>${reason}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${items.length}</cbc:LineCountNumeric>
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${originalInvoice.invoiceNumber}</cbc:ReferenceID>
    <cbc:ResponseCode>${responseCode}</cbc:ResponseCode>
    <cbc:Description>${reason}</cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${originalInvoice.invoiceNumber}</cbc:ID>
      <cbc:UUID schemeName="CUFE-SHA384">${originalInvoice.dianCufe || ''}</cbc:UUID>
      <cbc:IssueDate>${this.formatDate(new Date(originalInvoice.issueDate))}</cbc:IssueDate>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
${this.generateSupplierParty(dianConfig)}
${this.generateCustomerParty(originalInvoice.customer)}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${totalTax.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${totalTax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${items.length > 0 ? items[0].taxRate.toFixed(2) : '19.00'}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:RequestedMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:RequestedMonetaryTotal>
${this.generateDebitNoteLines(items)}
</DebitNote>`;

    return xml;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private formatNamespaces(): string {
    return Object.entries(this.namespaces)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
  }

  private formatNamespacesWithoutRoot(): string {
    return Object.entries(this.namespaces)
      .filter(([key]) => key !== 'xmlns')
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTime(date: Date): string {
    return date.toISOString().split('T')[1].split('.')[0] + '-05:00';
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  private generateSoftwareSecurityCode(
    config: TenantDianConfig,
    invoiceNumber: string,
  ): string {
    // Software security code = SHA384(SoftwareID + PIN + InvoiceNumber)
    const crypto = require('crypto');
    const data = `${config.softwareId || ''}${config.softwarePin || ''}${invoiceNumber}`;
    return crypto.createHash('sha384').update(data).digest('hex');
  }

  private generateSupplierParty(config: TenantDianConfig): string {
    const taxResponsibilities = config.taxResponsibilities || [];

    return `  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(config.tradeName || config.businessName)}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>${config.cityCode}</cbc:ID>
          <cbc:CityName>${config.city}</cbc:CityName>
          <cbc:PostalZone>${config.postalCode || ''}</cbc:PostalZone>
          <cbc:CountrySubentity>${config.department}</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>${config.departmentCode}</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>${this.escapeXml(config.address)}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>${config.countryCode}</cbc:IdentificationCode>
            <cbc:Name languageID="es">${config.country}</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${this.escapeXml(config.businessName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="${config.dv}" schemeName="31">${config.nit}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">${taxResponsibilities.join(';')}</cbc:TaxLevelCode>
        <cac:RegistrationAddress>
          <cbc:ID>${config.cityCode}</cbc:ID>
          <cbc:CityName>${config.city}</cbc:CityName>
          <cbc:CountrySubentity>${config.department}</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>${config.departmentCode}</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>${this.escapeXml(config.address)}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>${config.countryCode}</cbc:IdentificationCode>
            <cbc:Name languageID="es">${config.country}</cbc:Name>
          </cac:Country>
        </cac:RegistrationAddress>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(config.businessName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="${config.dv}" schemeName="31">${config.nit}</cbc:CompanyID>
        <cac:CorporateRegistrationScheme>
          <cbc:ID>${config.resolutionPrefix || ''}</cbc:ID>
        </cac:CorporateRegistrationScheme>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${config.email}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>`;
  }

  private generateCustomerParty(customer: Customer | null): string {
    if (!customer) {
      // Generic consumer
      return `  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>2</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Consumidor Final</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>11001</cbc:ID>
          <cbc:CityName>Bogota D.C.</cbc:CityName>
          <cbc:CountrySubentity>Bogota D.C.</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>Sin direccion</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            <cbc:Name languageID="es">Colombia</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>Consumidor Final</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="0" schemeName="13">222222222222</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">R-99-PN</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>ZZ</cbc:ID>
          <cbc:Name>No Aplica</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Consumidor Final</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="0" schemeName="13">222222222222</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>`;
    }

    const documentType = this.getDocumentType(customer.documentType);

    return `  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>2</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(customer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>11001</cbc:ID>
          <cbc:CityName>${customer.city || 'Bogota D.C.'}</cbc:CityName>
          <cbc:CountrySubentity>${customer.state || 'Bogota D.C.'}</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>${this.escapeXml(customer.address || 'Sin direccion')}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            <cbc:Name languageID="es">Colombia</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${this.escapeXml(customer.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="0" schemeName="${documentType}">${customer.documentNumber}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">R-99-PN</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>ZZ</cbc:ID>
          <cbc:Name>No Aplica</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(customer.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="0" schemeName="${documentType}">${customer.documentNumber}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      ${customer.email ? `<cac:Contact><cbc:ElectronicMail>${customer.email}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>`;
  }

  private getDocumentType(type: string | null): string {
    const types: Record<string, string> = {
      CC: '13', // Cedula de ciudadania
      NIT: '31', // NIT
      CE: '22', // Cedula de extranjeria
      TI: '12', // Tarjeta de identidad
      PP: '41', // Pasaporte
      DIE: '42', // Documento de identificacion extranjero
    };
    return types[type || 'CC'] || '13';
  }

  private generatePaymentMeans(invoice: Invoice): string {
    // Invoice doesn't store payment method - default to cash (10)
    const paymentCode = '10';
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate)
      : new Date(invoice.issueDate);

    return `  <cac:PaymentMeans>
    <cbc:ID>1</cbc:ID>
    <cbc:PaymentMeansCode>${paymentCode}</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${this.formatDate(dueDate)}</cbc:PaymentDueDate>
  </cac:PaymentMeans>`;
  }

  private generateTaxTotal(invoice: Invoice): string {
    const tax = Number(invoice.tax) || 0;
    const subtotal = Number(invoice.subtotal) || 0;
    const taxPercent =
      subtotal > 0 ? ((tax / subtotal) * 100).toFixed(2) : '19.00';

    return `  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${tax.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${tax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`;
  }

  private generateLegalMonetaryTotal(invoice: Invoice): string {
    const subtotal = Number(invoice.subtotal) || 0;
    const discount = Number(invoice.discount) || 0;
    const tax = Number(invoice.tax) || 0;
    const total = Number(invoice.total) || 0;

    return `  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${(subtotal + tax).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="COP">${discount.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="COP">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>`;
  }

  private generateInvoiceLines(items: InvoiceItemWithProduct[]): string {
    return items
      .map((item, index) => {
        const unitPrice = Number(item.unitPrice) || 0;
        const quantity = Number(item.quantity) || 1;
        const tax = Number(item.tax) || 0;
        const subtotal = Number(item.subtotal) || unitPrice * quantity;
        const taxPercent = Number(item.taxRate) || 19;
        const productName = item.product?.name || 'Producto';

        return `  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">${quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${tax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="COP">${tax.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>${taxPercent.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
            <cbc:Name>IVA</cbc:Name>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>${this.escapeXml(productName)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${unitPrice.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="EA">1</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>`;
      })
      .join('\n');
  }

  private generateCreditNoteLines(items: InvoiceItemWithProduct[]): string {
    return items
      .map((item, index) => {
        const unitPrice = Number(item.unitPrice) || 0;
        const quantity = Number(item.quantity) || 1;
        const tax = Number(item.tax) || 0;
        const subtotal = Number(item.subtotal) || unitPrice * quantity;
        const taxPercent = Number(item.taxRate) || 19;
        const productName = item.product?.name || 'Producto';

        return `  <cac:CreditNoteLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:CreditedQuantity unitCode="EA">${quantity}</cbc:CreditedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${tax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="COP">${tax.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>${taxPercent.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
            <cbc:Name>IVA</cbc:Name>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>${this.escapeXml(productName)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${unitPrice.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="EA">1</cbc:BaseQuantity>
    </cac:Price>
  </cac:CreditNoteLine>`;
      })
      .join('\n');
  }

  private generateDebitNoteLines(items: DebitNoteItem[]): string {
    return items
      .map((item, index) => {
        const lineSubtotal = item.quantity * item.unitPrice;
        const lineTax = lineSubtotal * (item.taxRate / 100);

        return `  <cac:DebitNoteLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:DebitedQuantity unitCode="EA">${item.quantity}</cbc:DebitedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${lineSubtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${lineTax.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="COP">${lineSubtotal.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="COP">${lineTax.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>${item.taxRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
            <cbc:Name>IVA</cbc:Name>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>${this.escapeXml(item.description)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="EA">1</cbc:BaseQuantity>
    </cac:Price>
  </cac:DebitNoteLine>`;
      })
      .join('\n');
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
