import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export type DianEventCode = '030' | '031' | '032' | '033';

const EVENT_NAMES: Record<DianEventCode, string> = {
  '030': 'Acuse de recibo de Factura Electrónica de Venta',
  '031': 'Reclamo de la Factura Electrónica de Venta',
  '032': 'Recibo del bien y/o prestación del servicio',
  '033': 'Aceptación expresa',
};

interface EventXmlParams {
  senderNit: string;
  senderDv: string;
  senderName: string;
  receiverNit: string;
  receiverDv: string;
  receiverName: string;
  invoiceNumber: string;
  invoiceCufe: string;
  invoiceIssueDate: string;
  eventCode: DianEventCode;
  rejectionReason?: string;
  softwareId: string;
  softwarePin: string;
  ambiente: '1' | '2';
}

@Injectable()
export class EventXmlGeneratorService {
  generateApplicationResponseXml(params: EventXmlParams): {
    xml: string;
    cude: string;
    documentNumber: string;
  } {
    const now = new Date();
    const issueDate = now.toISOString().split('T')[0];
    const issueTime = now.toTimeString().split(' ')[0] + '-05:00';

    const documentNumber = `EVT-${params.eventCode}-${params.invoiceNumber}`;

    // Generate CUDE for the event
    const cudeString = [
      documentNumber,
      issueDate,
      issueTime,
      params.senderNit,
      params.receiverNit,
      params.eventCode,
      params.ambiente,
      params.softwarePin,
    ].join('');

    const cude = crypto.createHash('sha384').update(cudeString).digest('hex');

    const eventName = EVENT_NAMES[params.eventCode];
    const rejectionNote =
      params.eventCode === '031' && params.rejectionReason
        ? `<cbc:Note>${this.escapeXml(params.rejectionReason)}</cbc:Note>`
        : '';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>1</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: ApplicationResponse de la Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ProfileExecutionID>${params.ambiente}</cbc:ProfileExecutionID>
  <cbc:ID>${documentNumber}</cbc:ID>
  <cbc:UUID schemeID="${params.ambiente}" schemeName="CUDE-SHA384">${cude}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  ${rejectionNote}
  <cac:SenderParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>${this.escapeXml(params.senderName)}</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="${params.senderDv}" schemeName="31">${params.senderNit}</cbc:CompanyID>
      <cac:TaxScheme>
        <cbc:ID>01</cbc:ID>
        <cbc:Name>IVA</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:SenderParty>
  <cac:ReceiverParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>${this.escapeXml(params.receiverName)}</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="${params.receiverDv}" schemeName="31">${params.receiverNit}</cbc:CompanyID>
      <cac:TaxScheme>
        <cbc:ID>01</cbc:ID>
        <cbc:Name>IVA</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:ReceiverParty>
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ResponseCode>${params.eventCode}</cbc:ResponseCode>
      <cbc:Description>${eventName}</cbc:Description>
    </cac:Response>
    <cac:DocumentReference>
      <cbc:ID>${params.invoiceNumber}</cbc:ID>
      <cbc:UUID schemeName="CUFE-SHA384">${params.invoiceCufe}</cbc:UUID>
    </cac:DocumentReference>
  </cac:DocumentResponse>
</ApplicationResponse>`;

    return { xml, cude, documentNumber };
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
