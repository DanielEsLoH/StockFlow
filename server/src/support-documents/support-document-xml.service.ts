import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  TenantDianConfig,
  SupportDocument,
  SupportDocumentItem,
  Supplier,
} from '@prisma/client';

/**
 * Support document item with all fields needed for XML generation
 */
export interface SupportDocumentItemForXml extends SupportDocumentItem {}

/**
 * Support document with relations needed for XML generation
 */
export interface SupportDocumentWithDetails extends SupportDocument {
  items: SupportDocumentItemForXml[];
  supplier: Supplier | null;
}

/**
 * Configuration for generating a support document XML
 */
export interface SupportDocumentXmlConfig {
  dianConfig: TenantDianConfig;
  document: SupportDocumentWithDetails;
  cuds: string;
  qrCode: string;
}

/**
 * Generates UBL 2.1 XML for Colombian Documento Soporte a No Obligados a Facturar.
 *
 * Based on DIAN Resolution 000167 of 2021 and the Colombian UBL 2.1 technical annex.
 * Document type code: 05 (Documento Soporte).
 * CustomizationID: 05 (Documento Soporte en adquisiciones efectuadas a no obligados a facturar).
 *
 * The CUDS (Codigo Unico de Documento Soporte) follows the same SHA-384 formula
 * as CUDE, using the software PIN instead of the technical key.
 */
@Injectable()
export class SupportDocumentXmlService {
  private readonly logger = new Logger(SupportDocumentXmlService.name);

  // Colombian UBL 2.1 namespaces for Invoice-based documents
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

  // Document type codes for DIAN supplier party identification
  private readonly documentTypeCodes: Record<string, string> = {
    CC: '13',
    NIT: '31',
    CE: '22',
    TI: '12',
    PP: '41',
    RUT: '31',
    PASSPORT: '41',
    DIE: '42',
    DNI: '13',
    OTHER: '13',
  };

  /**
   * Generate UBL 2.1 XML for a Documento Soporte (type 05).
   *
   * The support document uses the Invoice root element per DIAN specifications,
   * with InvoiceTypeCode 05 and CustomizationID 05 to identify it as a
   * Documento Soporte.
   */
  generateSupportDocumentXml(config: SupportDocumentXmlConfig): string {
    const { dianConfig, document, cuds, qrCode } = config;

    this.logger.log(
      `Generating XML for support document ${document.documentNumber}`,
    );

    const issueDate = new Date(document.issueDate);

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
          <sts:SoftwareSecurityCode schemeAgencyID="195" schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)">${this.generateSoftwareSecurityCode(dianConfig, document.documentNumber)}</sts:SoftwareSecurityCode>
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
  <cbc:CustomizationID>05</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${dianConfig.testMode ? '2' : '1'}</cbc:ProfileExecutionID>
  <cbc:ID>${document.documentNumber}</cbc:ID>
  <cbc:UUID schemeID="${dianConfig.testMode ? '2' : '1'}" schemeName="CUDS-SHA384">${cuds}</cbc:UUID>
  <cbc:IssueDate>${this.formatDate(issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${this.formatTime(issueDate)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>05</cbc:InvoiceTypeCode>
  <cbc:Note>${document.notes || 'Documento soporte en adquisiciones efectuadas a no obligados a facturar'}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${document.items.length}</cbc:LineCountNumeric>
${this.generateAccountingSupplierParty(dianConfig)}
${this.generateAccountingCustomerParty(document)}
${this.generatePaymentMeans(document)}
${this.generateTaxTotals(document)}
${this.generateLegalMonetaryTotal(document)}
${this.generateInvoiceLines(document.items)}
</Invoice>`;

    return xml;
  }

  /**
   * Generate CUDS (Codigo Unico de Documento Soporte) using SHA-384.
   *
   * The CUDS formula is identical to CUDE:
   * SHA-384(NumDS + FecDS + HorDS + ValDS + CodImp1 + ValImp1 + CodImp2 + ValImp2 +
   *         CodImp3 + ValImp3 + ValTot + NitAdq + NumFac + PinSoftware + TipoAmbiente)
   *
   * Where:
   * - NitAdq = NIT of the acquirer (the tenant, who is the buyer)
   * - NumFac = Document number of the supplier (the seller, who is a non-invoicer)
   */
  generateCuds(
    document: SupportDocumentWithDetails,
    dianConfig: TenantDianConfig,
  ): string {
    const issueDate = new Date(document.issueDate);

    const numDs = document.documentNumber;
    const fecDs = this.formatDate(issueDate);
    const horDs = this.formatTime(issueDate);
    const valDs = this.formatAmount(Number(document.subtotal));
    const codImp1 = '01'; // IVA
    const valImp1 = this.formatAmount(Number(document.tax));
    const codImp2 = '04'; // INC
    const valImp2 = this.formatAmount(0);
    const codImp3 = '03'; // ICA
    const valImp3 = this.formatAmount(0);
    const valTot = this.formatAmount(Number(document.total));
    const nitAdq = dianConfig.nit; // Acquirer (buyer / tenant)
    const numFac = document.supplierDocument; // Supplier document number
    const pinSoftware = dianConfig.softwarePin || '';
    const tipoAmbiente = dianConfig.testMode ? '2' : '1';

    const concatenated = [
      numDs,
      fecDs,
      horDs,
      valDs,
      codImp1,
      valImp1,
      codImp2,
      valImp2,
      codImp3,
      valImp3,
      valTot,
      nitAdq,
      numFac,
      pinSoftware,
      tipoAmbiente,
    ].join('');

    this.logger.debug(`CUDS input string: ${concatenated}`);

    const cuds = createHash('sha384').update(concatenated).digest('hex');

    this.logger.log(
      `Generated CUDS for document ${document.documentNumber}: ${cuds.substring(0, 20)}...`,
    );

    return cuds;
  }

  /**
   * Generate QR code data string for a support document.
   */
  generateQrCodeData(
    document: SupportDocumentWithDetails,
    dianConfig: TenantDianConfig,
    cuds: string,
  ): string {
    const issueDate = new Date(document.issueDate);
    const baseUrl = dianConfig.testMode
      ? 'https://catalogo-vpfe-hab.dian.gov.co'
      : 'https://catalogo-vpfe.dian.gov.co';

    const qrData = [
      `NumDS: ${document.documentNumber}`,
      `FecDS: ${this.formatDate(issueDate)}`,
      `HorDS: ${this.formatTime(issueDate)}`,
      `NitAdq: ${dianConfig.nit}`,
      `DocVend: ${document.supplierDocument}`,
      `ValDS: ${this.formatAmount(Number(document.subtotal))}`,
      `ValIva: ${this.formatAmount(Number(document.tax))}`,
      `ValOtroIm: ${this.formatAmount(Number(document.withholdings))}`,
      `ValTotDS: ${this.formatAmount(Number(document.total))}`,
      `CUDS: ${cuds}`,
      `${baseUrl}/document/searchqr?documentkey=${cuds}`,
    ].join('\n');

    return qrData;
  }

  // ============================================================================
  // XML SECTION GENERATORS
  // ============================================================================

  /**
   * In a Documento Soporte the AccountingSupplierParty is the acquirer (buyer/tenant),
   * since the tenant is the one issuing the support document.
   */
  private generateAccountingSupplierParty(config: TenantDianConfig): string {
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

  /**
   * The AccountingCustomerParty in a Documento Soporte is the seller
   * (the supplier who is not required to invoice).
   */
  private generateAccountingCustomerParty(
    document: SupportDocumentWithDetails,
  ): string {
    const supplier = document.supplier;
    const docTypeCode =
      this.documentTypeCodes[document.supplierDocType] || '13';

    const supplierName = supplier?.name || document.supplierName;
    const supplierAddress = supplier?.address || 'Sin direccion';
    const supplierCity = supplier?.city || 'Bogota D.C.';
    const supplierState = supplier?.state || 'Bogota D.C.';
    const supplierEmail = supplier?.email || '';

    // Non-invoicers typically have R-99-PN (No Responsable) tax level
    return `  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>2</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(supplierName)}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>11001</cbc:ID>
          <cbc:CityName>${supplierCity}</cbc:CityName>
          <cbc:CountrySubentity>${supplierState}</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>${this.escapeXml(supplierAddress)}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            <cbc:Name languageID="es">Colombia</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${this.escapeXml(supplierName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="${supplier?.dv || '0'}" schemeName="${docTypeCode}">${document.supplierDocument}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">R-99-PN</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>ZZ</cbc:ID>
          <cbc:Name>No Aplica</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(supplierName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN" schemeID="${supplier?.dv || '0'}" schemeName="${docTypeCode}">${document.supplierDocument}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      ${supplierEmail ? `<cac:Contact><cbc:ElectronicMail>${supplierEmail}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>`;
  }

  /**
   * Payment means for the support document.
   * Defaults to cash (10) since these are typically cash purchases from non-invoicers.
   */
  private generatePaymentMeans(document: SupportDocument): string {
    const issueDate = new Date(document.issueDate);

    return `  <cac:PaymentMeans>
    <cbc:ID>1</cbc:ID>
    <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${this.formatDate(issueDate)}</cbc:PaymentDueDate>
  </cac:PaymentMeans>`;
  }

  /**
   * Generate tax totals including IVA and withholdings (ReteFuente, ReteICA, ReteIVA).
   *
   * Support documents commonly include withholding taxes since the acquirer
   * is responsible for withholding on purchases from non-invoicers.
   */
  private generateTaxTotals(document: SupportDocumentWithDetails): string {
    const tax = Number(document.tax) || 0;
    const subtotal = Number(document.subtotal) || 0;
    const withholdings = Number(document.withholdings) || 0;

    // Calculate effective IVA rate from document totals
    const taxPercent =
      subtotal > 0 ? ((tax / subtotal) * 100).toFixed(2) : '0.00';

    let xml = '';

    // IVA tax total (positive tax)
    xml += `  <cac:TaxTotal>
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

    // Withholding tax total (ReteFuente - code 06)
    // In support documents, withholdings are aggregated in a single field.
    // We report them as ReteFuente (the most common withholding for non-invoicers).
    if (withholdings > 0) {
      xml += `\n  <cac:WithholdingTaxTotal>
    <cbc:TaxAmount currencyID="COP">${withholdings.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${withholdings.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${subtotal > 0 ? ((withholdings / subtotal) * 100).toFixed(2) : '0.00'}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>06</cbc:ID>
          <cbc:Name>ReteRenta</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:WithholdingTaxTotal>`;
    }

    return xml;
  }

  /**
   * Legal monetary total with subtotal, tax, withholdings, and payable amount.
   */
  private generateLegalMonetaryTotal(document: SupportDocument): string {
    const subtotal = Number(document.subtotal) || 0;
    const tax = Number(document.tax) || 0;
    const withholdings = Number(document.withholdings) || 0;
    const total = Number(document.total) || 0;

    return `  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${(subtotal + tax).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="COP">0.00</cbc:AllowanceTotalAmount>
    <cbc:PrePaidAmount currencyID="COP">${withholdings.toFixed(2)}</cbc:PrePaidAmount>
    <cbc:PayableAmount currencyID="COP">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>`;
  }

  /**
   * Generate invoice lines from support document items.
   * Each line includes the item description, quantity, unit price, and IVA tax.
   */
  private generateInvoiceLines(items: SupportDocumentItemForXml[]): string {
    return items
      .map((item, index) => {
        const unitPrice = Number(item.unitPrice) || 0;
        const quantity = Number(item.quantity) || 1;
        const tax = Number(item.tax) || 0;
        const subtotal = Number(item.subtotal) || unitPrice * quantity;
        const taxPercent = Number(item.taxRate) || 0;

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
      <cbc:Description>${this.escapeXml(item.description)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${unitPrice.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="EA">1</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>`;
      })
      .join('\n');
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private formatNamespaces(): string {
    return Object.entries(this.namespaces)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTime(date: Date): string {
    return date.toISOString().split('T')[1].split('.')[0] + '-05:00';
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  private generateSoftwareSecurityCode(
    config: TenantDianConfig,
    documentNumber: string,
  ): string {
    const data = `${config.softwareId || ''}${config.softwarePin || ''}${documentNumber}`;
    return createHash('sha384').update(data).digest('hex');
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
