import { EventXmlGeneratorService, DianEventCode } from './event-xml-generator.service';

describe('EventXmlGeneratorService', () => {
  let service: EventXmlGeneratorService;

  const baseParams = {
    senderNit: '900123456',
    senderDv: '7',
    senderName: 'Test Company S.A.S',
    receiverNit: '800456789',
    receiverDv: '3',
    receiverName: 'Customer Corp',
    invoiceNumber: 'SETT00000001',
    invoiceCufe: 'abcdef1234567890cufe',
    invoiceIssueDate: '2025-01-15',
    softwareId: 'sw-123',
    softwarePin: 'pin-456',
    ambiente: '2' as const,
  };

  beforeEach(() => {
    service = new EventXmlGeneratorService();
  });

  describe('generateApplicationResponseXml', () => {
    it('should return an object with xml, cude, and documentNumber', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result).toHaveProperty('xml');
      expect(result).toHaveProperty('cude');
      expect(result).toHaveProperty('documentNumber');
    });

    it('should generate a documentNumber with event code and invoice number', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '033',
      });

      expect(result.documentNumber).toBe('EVT-033-SETT00000001');
    });

    it('should generate a valid SHA-384 CUDE hex string', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      // SHA-384 produces 96 hex chars
      expect(result.cude).toMatch(/^[a-f0-9]{96}$/);
    });

    it('should produce different CUDEs for different event codes', () => {
      const result030 = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });
      const result033 = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '033',
      });

      expect(result030.cude).not.toBe(result033.cude);
    });

    it.each<DianEventCode>(['030', '031', '032', '033'])(
      'should include the event name for code %s in the XML',
      (eventCode) => {
        const result = service.generateApplicationResponseXml({
          ...baseParams,
          eventCode,
        });

        expect(result.xml).toContain(`<cbc:ResponseCode>${eventCode}</cbc:ResponseCode>`);
      },
    );

    it('should include event 030 description in XML', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toContain('Acuse de recibo de Factura');
    });

    it('should include event 031 description in XML', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '031',
        rejectionReason: 'Factura incorrecta',
      });

      expect(result.xml).toContain('Reclamo de la Factura');
    });

    it('should include rejection note for event code 031', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '031',
        rejectionReason: 'No corresponde al pedido',
      });

      expect(result.xml).toContain('<cbc:Note>No corresponde al pedido</cbc:Note>');
    });

    it('should NOT include rejection note for non-031 event codes', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '033',
        rejectionReason: 'This should be ignored',
      });

      expect(result.xml).not.toContain('<cbc:Note>');
    });

    it('should NOT include rejection note for 031 without rejectionReason', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '031',
      });

      expect(result.xml).not.toContain('<cbc:Note>');
    });

    it('should include sender party info', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toContain(`<cbc:RegistrationName>Test Company S.A.S</cbc:RegistrationName>`);
      expect(result.xml).toContain(`schemeID="7"`);
      expect(result.xml).toContain('>900123456</cbc:CompanyID>');
    });

    it('should include receiver party info', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toContain('Customer Corp');
      expect(result.xml).toContain('>800456789</cbc:CompanyID>');
    });

    it('should include the CUFE of the referenced invoice', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '032',
      });

      expect(result.xml).toContain(
        `<cbc:UUID schemeName="CUFE-SHA384">${baseParams.invoiceCufe}</cbc:UUID>`,
      );
    });

    it('should include the referenced invoice number in DocumentReference', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '032',
      });

      expect(result.xml).toContain(`<cbc:ID>${baseParams.invoiceNumber}</cbc:ID>`);
    });

    it('should include the CUDE in the UUID element', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toContain(`schemeName="CUDE-SHA384">${result.cude}</cbc:UUID>`);
    });

    it('should include the ambiente in ProfileExecutionID', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
        ambiente: '1',
      });

      expect(result.xml).toContain('<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>');
    });

    it('should escape XML special characters in names', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        senderName: 'Company & Sons <Test> "Corp"',
        eventCode: '030',
      });

      expect(result.xml).toContain('Company &amp; Sons &lt;Test&gt; &quot;Corp&quot;');
      expect(result.xml).not.toContain('Company & Sons <Test>');
    });

    it('should escape XML special characters in rejection reason', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '031',
        rejectionReason: 'Price > expected & invalid',
      });

      expect(result.xml).toContain('Price &gt; expected &amp; invalid');
    });

    it('should escape apostrophes in XML content', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        receiverName: "O'Brien Corp",
        eventCode: '030',
      });

      expect(result.xml).toContain('O&apos;Brien Corp');
    });

    it('should produce valid XML structure with proper root element', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.xml).toContain('<ApplicationResponse');
      expect(result.xml).toContain('</ApplicationResponse>');
    });

    it('should include UBL namespaces', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"');
      expect(result.xml).toContain('xmlns:cac=');
      expect(result.xml).toContain('xmlns:cbc=');
      expect(result.xml).toContain('xmlns:ext=');
    });

    it('should include IssueDate in YYYY-MM-DD format', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toMatch(/<cbc:IssueDate>\d{4}-\d{2}-\d{2}<\/cbc:IssueDate>/);
    });

    it('should include IssueTime with timezone offset', () => {
      const result = service.generateApplicationResponseXml({
        ...baseParams,
        eventCode: '030',
      });

      expect(result.xml).toMatch(/<cbc:IssueTime>\d{2}:\d{2}:\d{2}-05:00<\/cbc:IssueTime>/);
    });
  });
});
