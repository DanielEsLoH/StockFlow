import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException } from '@nestjs/common';
import { XmlSignerService } from './xml-signer.service';
import * as crypto from 'crypto';
import * as forge from 'node-forge';

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

  describe('loadCertificate', () => {
    // Shared OID constants matching node-forge
    const SHROUDED_KEY_BAG_OID = forge.pki.oids.pkcs8ShroudedKeyBag;
    const KEY_BAG_OID = forge.pki.oids.keyBag;
    const CERT_BAG_OID = forge.pki.oids.certBag;

    // Mock objects
    const mockPrivateKey = {
      n: 'mock-modulus',
    } as unknown as forge.pki.PrivateKey;
    const mockCert = {
      issuer: {
        attributes: [
          { name: 'commonName', shortName: 'CN', value: 'Test Issuer CA' },
          { name: 'organizationName', shortName: 'O', value: 'Test Org' },
          { name: 'countryName', shortName: 'C', value: 'CO' },
        ],
      },
      subject: {
        attributes: [
          { name: 'commonName', shortName: 'CN', value: 'Test Subject' },
          { name: 'organizationName', shortName: 'O', value: 'Subject Org' },
        ],
      },
      serialNumber: '0a1b2c3d',
      validity: {
        notBefore: new Date('2024-01-01'),
        notAfter: new Date('2025-12-31'),
      },
    } as unknown as forge.pki.Certificate;

    function setupForgeMocks(options: {
      shroudedBags?: any[];
      keyBags?: any[];
      certBags?: any[];
      cert?: any;
    }) {
      const {
        shroudedBags = [{ key: mockPrivateKey }],
        keyBags = [],
        certBags,
        cert = mockCert,
      } = options;

      const resolvedCertBags = certBags ?? [{ cert }];

      const mockP12 = {
        getBags: jest
          .fn()
          .mockImplementation(({ bagType }: { bagType: string }) => {
            if (bagType === SHROUDED_KEY_BAG_OID) {
              return { [SHROUDED_KEY_BAG_OID]: shroudedBags };
            }
            if (bagType === KEY_BAG_OID) {
              return { [KEY_BAG_OID]: keyBags };
            }
            if (bagType === CERT_BAG_OID) {
              return { [CERT_BAG_OID]: resolvedCertBags };
            }
            return {};
          }),
      };

      const mockAsn1 = { type: 'mock-asn1' };
      const mockCertAsn1 = { type: 'mock-cert-asn1' };
      const mockDerBytes = 'mock-der-binary-bytes';

      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue(mockAsn1 as any);
      jest
        .spyOn(forge.pkcs12, 'pkcs12FromAsn1')
        .mockReturnValue(mockP12 as any);
      jest
        .spyOn(forge.pki, 'privateKeyToPem')
        .mockReturnValue(
          '-----BEGIN RSA PRIVATE KEY-----\nmockkey\n-----END RSA PRIVATE KEY-----',
        );
      jest
        .spyOn(forge.pki, 'certificateToPem')
        .mockReturnValue(
          '-----BEGIN CERTIFICATE-----\nmockcert\n-----END CERTIFICATE-----',
        );
      jest
        .spyOn(forge.pki, 'certificateToAsn1')
        .mockReturnValue(mockCertAsn1 as any);
      jest.spyOn(forge.asn1, 'toDer').mockReturnValue({
        getBytes: () => mockDerBytes,
      } as any);

      return mockP12;
    }

    it('should successfully parse a .p12 certificate with shrouded key bag', () => {
      setupForgeMocks({ shroudedBags: [{ key: mockPrivateKey }] });

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      expect(result.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
      expect(result.certPem).toContain('BEGIN CERTIFICATE');
      expect(result.certDerBase64).toBeDefined();
      expect(result.certDigestBase64).toBeDefined();
      expect(result.notBefore).toEqual(new Date('2024-01-01'));
      expect(result.notAfter).toEqual(new Date('2025-12-31'));
    });

    it('should extract private key from keyBag when shroudedBags is empty', () => {
      setupForgeMocks({
        shroudedBags: [],
        keyBags: [{ key: mockPrivateKey }],
      });

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      expect(result.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    });

    it('should fallback to keyBag when shroudedBags has no key property', () => {
      setupForgeMocks({
        shroudedBags: [{ key: null }],
        keyBags: [{ key: mockPrivateKey }],
      });

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      expect(result.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    });

    it('should throw when no private key found in shroudedBags or keyBags', () => {
      setupForgeMocks({
        shroudedBags: [],
        keyBags: [],
      });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow('No se encontro llave privada en el certificado .p12');
    });

    it('should throw when shroudedBags and keyBags have entries but no key property', () => {
      setupForgeMocks({
        shroudedBags: [{ key: null }],
        keyBags: [{ key: null }],
      });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow('No se encontro llave privada en el certificado .p12');
    });

    it('should throw when certBags is empty', () => {
      setupForgeMocks({ certBags: [] });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow('No se encontro certificado X.509 en el archivo .p12');
    });

    it('should throw when certBags has entry but no cert property', () => {
      setupForgeMocks({ certBags: [{ cert: null }] });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow('No se encontro certificado X.509 en el archivo .p12');
    });

    it('should compute DER-encoded base64 of the certificate', () => {
      setupForgeMocks({});

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      const expectedDerBuffer = Buffer.from('mock-der-binary-bytes', 'binary');
      const expectedBase64 = expectedDerBuffer.toString('base64');

      expect(result.certDerBase64).toBe(expectedBase64);
      expect(forge.pki.certificateToAsn1).toHaveBeenCalledWith(mockCert);
      expect(forge.asn1.toDer).toHaveBeenCalled();
    });

    it('should compute SHA-256 digest of the DER certificate', () => {
      setupForgeMocks({});

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      const expectedDerBuffer = Buffer.from('mock-der-binary-bytes', 'binary');
      const expectedDigest = crypto
        .createHash('sha256')
        .update(expectedDerBuffer)
        .digest('base64');

      expect(result.certDigestBase64).toBe(expectedDigest);
    });

    it('should parse serial number as decimal from hex', () => {
      setupForgeMocks({});

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      // '0a1b2c3d' in hex = 169,858,109 in decimal
      const expectedSerial = BigInt('0x0a1b2c3d').toString(10);
      expect(result.serialNumber).toBe(expectedSerial);
    });

    it('should build issuer DN string with mapped attribute names in reverse order', () => {
      setupForgeMocks({});

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      // Attributes are [CN=Test Issuer CA, O=Test Org, C=CO]
      // Reversed: C=CO,O=Test Org,CN=Test Issuer CA
      expect(result.issuerName).toBe('C=CO,O=Test Org,CN=Test Issuer CA');
    });

    it('should build subject DN string with mapped attribute names in reverse order', () => {
      setupForgeMocks({});

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      // Attributes are [CN=Test Subject, O=Subject Org]
      // Reversed: O=Subject Org,CN=Test Subject
      expect(result.subjectName).toBe('O=Subject Org,CN=Test Subject');
    });

    it('should handle getBags returning undefined instead of array for shroudedBags', () => {
      const mockP12 = {
        getBags: jest
          .fn()
          .mockImplementation(({ bagType }: { bagType: string }) => {
            if (bagType === SHROUDED_KEY_BAG_OID) {
              return { [SHROUDED_KEY_BAG_OID]: undefined };
            }
            if (bagType === KEY_BAG_OID) {
              return { [KEY_BAG_OID]: [{ key: mockPrivateKey }] };
            }
            if (bagType === CERT_BAG_OID) {
              return { [CERT_BAG_OID]: [{ cert: mockCert }] };
            }
            return {};
          }),
      };

      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest
        .spyOn(forge.pkcs12, 'pkcs12FromAsn1')
        .mockReturnValue(mockP12 as any);
      jest
        .spyOn(forge.pki, 'privateKeyToPem')
        .mockReturnValue(
          '-----BEGIN RSA PRIVATE KEY-----\nmock\n-----END RSA PRIVATE KEY-----',
        );
      jest
        .spyOn(forge.pki, 'certificateToPem')
        .mockReturnValue(
          '-----BEGIN CERTIFICATE-----\nmock\n-----END CERTIFICATE-----',
        );
      jest.spyOn(forge.pki, 'certificateToAsn1').mockReturnValue({} as any);
      jest
        .spyOn(forge.asn1, 'toDer')
        .mockReturnValue({ getBytes: () => 'x' } as any);

      const result = service.loadCertificate(
        Buffer.from('mock-p12'),
        'password',
      );

      expect(result.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    });

    it('should handle getBags returning undefined for keyBags when shroudedBags is empty', () => {
      const mockP12 = {
        getBags: jest
          .fn()
          .mockImplementation(({ bagType }: { bagType: string }) => {
            if (bagType === SHROUDED_KEY_BAG_OID) {
              return { [SHROUDED_KEY_BAG_OID]: [] };
            }
            if (bagType === KEY_BAG_OID) {
              return { [KEY_BAG_OID]: undefined };
            }
            if (bagType === CERT_BAG_OID) {
              return { [CERT_BAG_OID]: [{ cert: mockCert }] };
            }
            return {};
          }),
      };

      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest
        .spyOn(forge.pkcs12, 'pkcs12FromAsn1')
        .mockReturnValue(mockP12 as any);

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow('No se encontro llave privada en el certificado .p12');
    });

    it('should handle getBags returning undefined for certBags', () => {
      const mockP12 = {
        getBags: jest
          .fn()
          .mockImplementation(({ bagType }: { bagType: string }) => {
            if (bagType === SHROUDED_KEY_BAG_OID) {
              return { [SHROUDED_KEY_BAG_OID]: [{ key: mockPrivateKey }] };
            }
            if (bagType === KEY_BAG_OID) {
              return { [KEY_BAG_OID]: [] };
            }
            if (bagType === CERT_BAG_OID) {
              return { [CERT_BAG_OID]: undefined };
            }
            return {};
          }),
      };

      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest
        .spyOn(forge.pkcs12, 'pkcs12FromAsn1')
        .mockReturnValue(mockP12 as any);
      jest
        .spyOn(forge.pki, 'privateKeyToPem')
        .mockReturnValue(
          '-----BEGIN RSA PRIVATE KEY-----\nmock\n-----END RSA PRIVATE KEY-----',
        );

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow('No se encontro certificado X.509 en el archivo .p12');
    });
  });

  describe('loadCertificate - password error handling', () => {
    it('should throw BadRequestException when forge reports "Invalid password"', () => {
      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockImplementation(() => {
        throw new Error('Invalid password');
      });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'wrong-password'),
      ).toThrow(BadRequestException);

      try {
        service.loadCertificate(Buffer.from('mock-p12'), 'wrong-password');
      } catch (e: any) {
        expect(e.message).toBe('La contrasena del certificado es incorrecta');
      }
    });

    it('should throw BadRequestException when forge reports "PKCS#12 MAC could not be verified"', () => {
      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockImplementation(() => {
        throw new Error('PKCS#12 MAC could not be verified. Invalid password?');
      });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'bad-password'),
      ).toThrow(BadRequestException);

      try {
        service.loadCertificate(Buffer.from('mock-p12'), 'bad-password');
      } catch (e: any) {
        expect(e.message).toBe('La contrasena del certificado es incorrecta');
      }
    });

    it('should re-throw non-password errors as-is', () => {
      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockImplementation(() => {
        throw new Error('Unexpected ASN.1 structure');
      });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow('Unexpected ASN.1 structure');

      // Verify it does NOT throw BadRequestException
      try {
        service.loadCertificate(Buffer.from('mock-p12'), 'password');
      } catch (e: any) {
        expect(e).not.toBeInstanceOf(BadRequestException);
        expect(e).toBeInstanceOf(Error);
      }
    });

    it('should re-throw error without message property', () => {
      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockImplementation(() => {
        throw { code: 'UNKNOWN' };
      });

      expect(() =>
        service.loadCertificate(Buffer.from('mock-p12'), 'password'),
      ).toThrow();
    });
  });

  describe('buildDnString (via loadCertificate)', () => {
    const SHROUDED_KEY_BAG_OID = forge.pki.oids.pkcs8ShroudedKeyBag;
    const KEY_BAG_OID = forge.pki.oids.keyBag;
    const CERT_BAG_OID = forge.pki.oids.certBag;
    const mockPrivateKey = {} as forge.pki.PrivateKey;

    function setupForDnTest(issuerAttrs: any[], subjectAttrs: any[]) {
      const mockCert = {
        issuer: { attributes: issuerAttrs },
        subject: { attributes: subjectAttrs },
        serialNumber: 'ff',
        validity: {
          notBefore: new Date('2024-01-01'),
          notAfter: new Date('2025-12-31'),
        },
      };

      const mockP12 = {
        getBags: jest
          .fn()
          .mockImplementation(({ bagType }: { bagType: string }) => {
            if (bagType === SHROUDED_KEY_BAG_OID) {
              return { [SHROUDED_KEY_BAG_OID]: [{ key: mockPrivateKey }] };
            }
            if (bagType === KEY_BAG_OID) {
              return { [KEY_BAG_OID]: [] };
            }
            if (bagType === CERT_BAG_OID) {
              return { [CERT_BAG_OID]: [{ cert: mockCert }] };
            }
            return {};
          }),
      };

      jest.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      jest
        .spyOn(forge.pkcs12, 'pkcs12FromAsn1')
        .mockReturnValue(mockP12 as any);
      jest
        .spyOn(forge.pki, 'privateKeyToPem')
        .mockReturnValue(
          '-----BEGIN RSA PRIVATE KEY-----\nmock\n-----END RSA PRIVATE KEY-----',
        );
      jest
        .spyOn(forge.pki, 'certificateToPem')
        .mockReturnValue(
          '-----BEGIN CERTIFICATE-----\nmock\n-----END CERTIFICATE-----',
        );
      jest.spyOn(forge.pki, 'certificateToAsn1').mockReturnValue({} as any);
      jest
        .spyOn(forge.asn1, 'toDer')
        .mockReturnValue({ getBytes: () => 'x' } as any);
    }

    it('should map all known attribute names to their short forms', () => {
      setupForDnTest(
        [
          { name: 'commonName', shortName: 'CN', value: 'My CA' },
          { name: 'organizationName', shortName: 'O', value: 'My Org' },
          { name: 'organizationalUnitName', shortName: 'OU', value: 'My Unit' },
          { name: 'countryName', shortName: 'C', value: 'CO' },
          { name: 'localityName', shortName: 'L', value: 'Bogota' },
          {
            name: 'stateOrProvinceName',
            shortName: 'ST',
            value: 'Cundinamarca',
          },
          { name: 'emailAddress', shortName: 'E', value: 'test@example.com' },
        ],
        [{ name: 'commonName', shortName: 'CN', value: 'Subject' }],
      );

      const result = service.loadCertificate(Buffer.from('mock'), 'password');

      expect(result.issuerName).toBe(
        'E=test@example.com,ST=Cundinamarca,L=Bogota,C=CO,OU=My Unit,O=My Org,CN=My CA',
      );
    });

    it('should fallback to shortName when attribute name is not in the mapping', () => {
      setupForDnTest(
        [{ name: 'unknownAttribute', shortName: 'UA', value: 'Unknown Value' }],
        [{ name: 'commonName', shortName: 'CN', value: 'Subject' }],
      );

      const result = service.loadCertificate(Buffer.from('mock'), 'password');

      expect(result.issuerName).toBe('UA=Unknown Value');
    });

    it('should fallback to name when neither mapping nor shortName exists', () => {
      setupForDnTest(
        [{ name: 'customField', value: 'Custom Value' }],
        [{ name: 'commonName', shortName: 'CN', value: 'Subject' }],
      );

      const result = service.loadCertificate(Buffer.from('mock'), 'password');

      expect(result.issuerName).toBe('customField=Custom Value');
    });

    it('should reverse the order of attributes (most specific last for DIAN)', () => {
      setupForDnTest(
        [
          { name: 'countryName', shortName: 'C', value: 'CO' },
          { name: 'organizationName', shortName: 'O', value: 'Org' },
          { name: 'commonName', shortName: 'CN', value: 'CA' },
        ],
        [{ name: 'commonName', shortName: 'CN', value: 'Subject' }],
      );

      const result = service.loadCertificate(Buffer.from('mock'), 'password');

      // Original order: C, O, CN -> Reversed: CN, O, C
      expect(result.issuerName).toBe('CN=CA,O=Org,C=CO');
    });

    it('should handle empty attributes array', () => {
      setupForDnTest(
        [],
        [{ name: 'commonName', shortName: 'CN', value: 'Subject' }],
      );

      const result = service.loadCertificate(Buffer.from('mock'), 'password');

      expect(result.issuerName).toBe('');
    });

    it('should handle single attribute', () => {
      setupForDnTest(
        [{ name: 'commonName', shortName: 'CN', value: 'Single CA' }],
        [{ name: 'commonName', shortName: 'CN', value: 'Subject' }],
      );

      const result = service.loadCertificate(Buffer.from('mock'), 'password');

      expect(result.issuerName).toBe('CN=Single CA');
    });

    it('should use shortName ?? name fallback chain correctly for attribute without shortName or known name', () => {
      setupForDnTest(
        [{ name: 'streetAddress', shortName: undefined, value: 'Calle 100' }],
        [{ name: 'commonName', shortName: 'CN', value: 'Subject' }],
      );

      const result = service.loadCertificate(Buffer.from('mock'), 'password');

      // shortName is undefined, name is 'streetAddress' (not in mapping)
      // So fallback: shortNames['streetAddress'] => undefined, then a.shortName => undefined, then a.name => 'streetAddress'
      expect(result.issuerName).toBe('streetAddress=Calle 100');
    });
  });

  describe('validateCertificate - generic error handling', () => {
    it('should return generic error message when loadCertificate throws a non-BadRequestException error', () => {
      jest.spyOn(service, 'loadCertificate').mockImplementation(() => {
        throw new Error('Unexpected ASN.1 parsing failure');
      });

      const result = service.validateCertificate(
        Buffer.from('mock'),
        'password',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        'Error al procesar el certificado: Unexpected ASN.1 parsing failure',
      ]);
    });

    it('should return fallback message when error has no message', () => {
      jest.spyOn(service, 'loadCertificate').mockImplementation(() => {
        throw { code: 'ERR_UNKNOWN' };
      });

      const result = service.validateCertificate(
        Buffer.from('mock'),
        'password',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        'Error al procesar el certificado: Formato invalido',
      ]);
    });

    it('should return valid result when certificate dates are current', () => {
      jest.spyOn(service, 'loadCertificate').mockReturnValue({
        privateKeyPem: 'mock-pem',
        certPem: 'mock-cert-pem',
        certDerBase64: 'mock-der',
        certDigestBase64: 'mock-digest',
        issuerName: 'CN=Test CA',
        subjectName: 'CN=Test Subject',
        serialNumber: '12345',
        notBefore: new Date('2020-01-01'),
        notAfter: new Date('2030-12-31'),
      });

      const result = service.validateCertificate(
        Buffer.from('mock'),
        'password',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.subject).toBe('CN=Test Subject');
      expect(result.issuer).toBe('CN=Test CA');
      expect(result.validFrom).toEqual(new Date('2020-01-01'));
      expect(result.validTo).toEqual(new Date('2030-12-31'));
    });
  });
});
