import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException } from '@nestjs/common';
import { XmlSignerService } from './xml-signer.service';
import * as crypto from 'crypto';

describe('XmlSignerService', () => {
  let service: XmlSignerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [XmlSignerService],
    }).compile();

    service = module.get<XmlSignerService>(XmlSignerService);

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

  describe('validateCertificate', () => {
    it('should return invalid result for invalid buffer', () => {
      const result = service.validateCertificate(
        Buffer.from('not-a-certificate'),
        'password',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for empty buffer', () => {
      const result = service.validateCertificate(Buffer.alloc(0), 'password');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error on expired certificate', () => {
      // Mock loadCertificate to return expired cert
      jest.spyOn(service, 'loadCertificate').mockReturnValue({
        privateKeyPem: 'mock-pem',
        certPem: 'mock-cert-pem',
        certDerBase64: 'mock-der',
        certDigestBase64: 'mock-digest',
        issuerName: 'CN=Test CA',
        subjectName: 'CN=Test Subject',
        serialNumber: '12345',
        notBefore: new Date('2020-01-01'),
        notAfter: new Date('2020-12-31'),
      });

      const result = service.validateCertificate(
        Buffer.from('mock'),
        'password',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('vencido')]),
      );
    });

    it('should return error on not-yet-valid certificate', () => {
      jest.spyOn(service, 'loadCertificate').mockReturnValue({
        privateKeyPem: 'mock-pem',
        certPem: 'mock-cert-pem',
        certDerBase64: 'mock-der',
        certDigestBase64: 'mock-digest',
        issuerName: 'CN=Test CA',
        subjectName: 'CN=Test Subject',
        serialNumber: '12345',
        notBefore: new Date('2030-01-01'),
        notAfter: new Date('2035-12-31'),
      });

      const result = service.validateCertificate(
        Buffer.from('mock'),
        'password',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('aun no es valido')]),
      );
    });

    it('should catch BadRequestException from loadCertificate', () => {
      jest.spyOn(service, 'loadCertificate').mockImplementation(() => {
        throw new BadRequestException(
          'La contrasena del certificado es incorrecta',
        );
      });

      const result = service.validateCertificate(
        Buffer.from('mock'),
        'wrong-password',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('incorrecta')]),
      );
    });
  });

  describe('signXml', () => {
    // Generate a self-signed test certificate
    let privateKeyPem: string;
    let certDerBase64: string;
    let certDigestBase64: string;

    beforeAll(() => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      privateKeyPem = privateKey
        .export({ type: 'pkcs8', format: 'pem' })
        .toString();

      // Create a mock certificate DER (just a dummy for the test)
      const mockCertDer = Buffer.from('mock-certificate-der-content');
      certDerBase64 = mockCertDer.toString('base64');
      certDigestBase64 = crypto
        .createHash('sha256')
        .update(mockCertDer)
        .digest('base64');
    });

    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1">
          <sts:InvoiceControl/>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ID>SETT100</cbc:ID>
</Invoice>`;

    it('should inject ds:Signature into second ExtensionContent', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain('<ds:Signature');
      expect(signedXml).toContain('</ds:Signature>');
    });

    it('should include SignedInfo with three references', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain('<ds:SignedInfo');
      // 3 references: document, keyinfo, signed-properties
      const refMatches = signedXml.match(/<ds:Reference/g);
      expect(refMatches?.length).toBe(3);
    });

    it('should include SignatureValue', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain('<ds:SignatureValue');
      expect(signedXml).toContain('</ds:SignatureValue>');
    });

    it('should include KeyInfo with X509Certificate', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain('<ds:KeyInfo');
      expect(signedXml).toContain('<ds:X509Certificate>');
      expect(signedXml).toContain(certDerBase64);
    });

    it('should include QualifyingProperties with DIAN policy', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain('<xades:QualifyingProperties');
      expect(signedXml).toContain('<xades:SignedProperties');
      expect(signedXml).toContain(
        'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf',
      );
      expect(signedXml).toContain(
        'dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=',
      );
    });

    it('should include SigningCertificate with cert digest', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain('<xades:SigningCertificate>');
      expect(signedXml).toContain(certDigestBase64);
      expect(signedXml).toContain(
        '<ds:X509IssuerName>CN=Test CA</ds:X509IssuerName>',
      );
      expect(signedXml).toContain(
        '<ds:X509SerialNumber>12345</ds:X509SerialNumber>',
      );
    });

    it('should include RSA-SHA256 algorithm', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain(
        'Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"',
      );
    });

    it('should include C14N canonicalization method', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain(
        'Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"',
      );
    });

    it('should include enveloped-signature transform', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain(
        'Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"',
      );
    });

    it('should include supplier claimed role', () => {
      const signedXml = service.signXml(
        sampleXml,
        privateKeyPem,
        certDerBase64,
        certDigestBase64,
        'CN=Test CA',
        '12345',
      );

      expect(signedXml).toContain(
        '<xades:ClaimedRole>supplier</xades:ClaimedRole>',
      );
    });

    it('should throw when XML has less than 2 ExtensionContent elements', () => {
      const xmlNoExtension = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">TEST</cbc:ID>
</Invoice>`;

      expect(() =>
        service.signXml(
          xmlNoExtension,
          privateKeyPem,
          certDerBase64,
          certDigestBase64,
          'CN=Test CA',
          '12345',
        ),
      ).toThrow(BadRequestException);
    });
  });
});
