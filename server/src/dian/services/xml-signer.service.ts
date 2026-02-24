import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as forge from 'node-forge';
import * as crypto from 'crypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as xpath from 'xpath';

export interface CertificateContents {
  privateKeyPem: string;
  certPem: string;
  certDerBase64: string;
  certDigestBase64: string;
  issuerName: string;
  subjectName: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
}

export interface CertificateValidationResult {
  isValid: boolean;
  subject?: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  errors: string[];
}

const ALGORITHMS = {
  C14N: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  ENVELOPED_SIG: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
  RSA_SHA256: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  SHA256: 'http://www.w3.org/2001/04/xmlenc#sha256',
  SIGNED_PROPS_TYPE: 'http://uri.etsi.org/01903#SignedProperties',
  XADES_NS: 'http://uri.etsi.org/01903/v1.3.2#',
  XMLDSIG_NS: 'http://www.w3.org/2000/09/xmldsig#',
  DIAN_POLICY_URI:
    'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf',
  DIAN_POLICY_HASH: 'dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=',
} as const;

@Injectable()
export class XmlSignerService {
  private readonly logger = new Logger(XmlSignerService.name);

  /**
   * Parse a .p12 (PKCS#12) file and extract private key + certificate
   */
  loadCertificate(p12Buffer: Buffer, password: string): CertificateContents {
    try {
      const p12Der = p12Buffer.toString('binary');
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

      // Extract private key
      const shroudedBags =
        p12.getBags({
          bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
        })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];

      let privateKey: forge.pki.PrivateKey | null = null;
      if (shroudedBags.length > 0 && shroudedBags[0].key) {
        privateKey = shroudedBags[0].key;
      } else {
        const keyBags =
          p12.getBags({
            bagType: forge.pki.oids.keyBag,
          })[forge.pki.oids.keyBag] ?? [];
        if (keyBags.length > 0 && keyBags[0].key) {
          privateKey = keyBags[0].key;
        }
      }

      if (!privateKey) {
        throw new Error('No se encontro llave privada en el certificado .p12');
      }

      const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

      // Extract certificate
      const certBags =
        p12.getBags({
          bagType: forge.pki.oids.certBag,
        })[forge.pki.oids.certBag] ?? [];

      if (!certBags.length || !certBags[0].cert) {
        throw new Error(
          'No se encontro certificado X.509 en el archivo .p12',
        );
      }

      const cert = certBags[0].cert;
      const certPem = forge.pki.certificateToPem(cert);

      // DER-encoded certificate
      const certAsn1 = forge.pki.certificateToAsn1(cert);
      const certDerBinary = forge.asn1.toDer(certAsn1).getBytes();
      const certDerBuffer = Buffer.from(certDerBinary, 'binary');
      const certDerBase64 = certDerBuffer.toString('base64');

      // SHA-256 digest of DER cert (for xades:CertDigest)
      const certDigestBase64 = crypto
        .createHash('sha256')
        .update(certDerBuffer)
        .digest('base64');

      // DN strings (RFC 4514 — most specific last for DIAN)
      const issuerName = this.buildDnString(cert.issuer.attributes);
      const subjectName = this.buildDnString(cert.subject.attributes);

      // Serial number as decimal
      const serialNumber = BigInt('0x' + cert.serialNumber).toString(10);

      return {
        privateKeyPem,
        certPem,
        certDerBase64,
        certDigestBase64,
        issuerName,
        subjectName,
        serialNumber,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
      };
    } catch (error: any) {
      if (
        error.message?.includes('Invalid password') ||
        error.message?.includes('PKCS#12 MAC could not be verified')
      ) {
        throw new BadRequestException(
          'La contrasena del certificado es incorrecta',
        );
      }
      throw error;
    }
  }

  /**
   * Validate a .p12 certificate without extracting the full contents
   */
  validateCertificate(
    p12Buffer: Buffer,
    password: string,
  ): CertificateValidationResult {
    const errors: string[] = [];

    try {
      const contents = this.loadCertificate(p12Buffer, password);
      const now = new Date();

      if (contents.notBefore > now) {
        errors.push(
          `El certificado aun no es valido. Valido desde: ${contents.notBefore.toISOString().split('T')[0]}`,
        );
      }

      if (contents.notAfter < now) {
        errors.push(
          `El certificado esta vencido. Vencimiento: ${contents.notAfter.toISOString().split('T')[0]}`,
        );
      }

      return {
        isValid: errors.length === 0,
        subject: contents.subjectName,
        issuer: contents.issuerName,
        validFrom: contents.notBefore,
        validTo: contents.notAfter,
        errors,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        return {
          isValid: false,
          errors: [error.message],
        };
      }
      return {
        isValid: false,
        errors: [
          `Error al procesar el certificado: ${error.message || 'Formato invalido'}`,
        ],
      };
    }
  }

  /**
   * Sign a UBL 2.1 XML document with XAdES-BES using the provided certificate
   * Injects the signature into the second ext:ExtensionContent element
   */
  signXml(
    xml: string,
    privateKeyPem: string,
    certDerBase64: string,
    certDigestBase64: string,
    issuerName: string,
    serialNumber: string,
  ): string {
    const uuid = crypto.randomUUID();
    const signatureId = `xmldsig-${uuid}`;
    const keyInfoId = `${signatureId}-keyinfo`;
    const signedPropsId = `${signatureId}-signedprops`;
    const objectId = `${signatureId}-object0`;

    this.logger.log(`Signing XML with signature ID: ${signatureId}`);

    // 1. Parse the XML document
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    // 2. Compute digest of the document (enveloped-signature transform)
    //    Since signature isn't in the doc yet, c14n of root IS the input
    const docC14n = this.canonicalize(doc.documentElement);
    const docDigest = this.sha256Base64(docC14n);

    // 3. Build KeyInfo XML
    const keyInfoXml = this.buildKeyInfo(keyInfoId, certDerBase64);
    const keyInfoC14n = this.canonicalizeFragment(keyInfoXml);
    const keyInfoDigest = this.sha256Base64(keyInfoC14n);

    // 4. Build SignedProperties XML
    const signedPropsXml = this.buildSignedProperties(
      signedPropsId,
      certDigestBase64,
      issuerName,
      serialNumber,
    );
    const signedPropsC14n = this.canonicalizeFragment(signedPropsXml);
    const signedPropsDigest = this.sha256Base64(signedPropsC14n);

    // 5. Build SignedInfo
    const signedInfoXml = this.buildSignedInfo(
      signatureId,
      keyInfoId,
      signedPropsId,
      docDigest,
      keyInfoDigest,
      signedPropsDigest,
    );

    // 6. Canonicalize SignedInfo and compute RSA-SHA256 signature
    const signedInfoC14n = this.canonicalizeFragment(signedInfoXml);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signedInfoC14n);
    const signatureValue = signer.sign(privateKeyPem, 'base64');

    // 7. Assemble complete ds:Signature
    const signatureXml = `<ds:Signature xmlns:ds="${ALGORITHMS.XMLDSIG_NS}" Id="${signatureId}">
${signedInfoXml}
<ds:SignatureValue Id="${signatureId}-sigvalue">${signatureValue}</ds:SignatureValue>
${keyInfoXml}
<ds:Object Id="${objectId}">
<xades:QualifyingProperties xmlns:xades="${ALGORITHMS.XADES_NS}" Target="#${signatureId}">
${signedPropsXml}
</xades:QualifyingProperties>
</ds:Object>
</ds:Signature>`;

    // 8. Inject into second ext:ExtensionContent
    const select = xpath.useNamespaces({
      ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    });
    const extensionContents = select(
      '//ext:ExtensionContent',
      doc,
    ) as Element[];

    if (extensionContents.length < 2) {
      throw new BadRequestException(
        'El XML debe tener al menos 2 elementos ext:ExtensionContent para inyectar la firma',
      );
    }

    const sigDoc = new DOMParser().parseFromString(signatureXml, 'text/xml');
    const sigNode = doc.importNode(sigDoc.documentElement, true);
    extensionContents[1].appendChild(sigNode);

    return new XMLSerializer().serializeToString(doc);
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private buildDnString(
    attributes: forge.pki.CertificateField[],
  ): string {
    const shortNames: Record<string, string> = {
      commonName: 'CN',
      organizationName: 'O',
      organizationalUnitName: 'OU',
      countryName: 'C',
      localityName: 'L',
      stateOrProvinceName: 'ST',
      emailAddress: 'E',
    };
    return attributes
      .map(
        (a: any) =>
          `${shortNames[a.name] ?? a.shortName ?? a.name}=${a.value}`,
      )
      .reverse()
      .join(',');
  }

  private buildKeyInfo(keyInfoId: string, certDerBase64: string): string {
    return `<ds:KeyInfo xmlns:ds="${ALGORITHMS.XMLDSIG_NS}" Id="${keyInfoId}">
<ds:X509Data>
<ds:X509Certificate>${certDerBase64}</ds:X509Certificate>
</ds:X509Data>
</ds:KeyInfo>`;
  }

  private buildSignedProperties(
    signedPropsId: string,
    certDigestBase64: string,
    issuerName: string,
    serialNumber: string,
  ): string {
    const signingTime = new Date()
      .toISOString()
      .replace('Z', '-05:00');

    return `<xades:SignedProperties xmlns:xades="${ALGORITHMS.XADES_NS}" xmlns:ds="${ALGORITHMS.XMLDSIG_NS}" Id="${signedPropsId}">
<xades:SignedSignatureProperties>
<xades:SigningTime>${signingTime}</xades:SigningTime>
<xades:SigningCertificate>
<xades:Cert>
<xades:CertDigest>
<ds:DigestMethod Algorithm="${ALGORITHMS.SHA256}"/>
<ds:DigestValue>${certDigestBase64}</ds:DigestValue>
</xades:CertDigest>
<xades:IssuerSerial>
<ds:X509IssuerName>${issuerName}</ds:X509IssuerName>
<ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>
</xades:IssuerSerial>
</xades:Cert>
</xades:SigningCertificate>
<xades:SignaturePolicyIdentifier>
<xades:SignaturePolicyId>
<xades:SigPolicyId>
<xades:Identifier>${ALGORITHMS.DIAN_POLICY_URI}</xades:Identifier>
</xades:SigPolicyId>
<xades:SigPolicyHash>
<ds:DigestMethod Algorithm="${ALGORITHMS.SHA256}"/>
<ds:DigestValue>${ALGORITHMS.DIAN_POLICY_HASH}</ds:DigestValue>
</xades:SigPolicyHash>
</xades:SignaturePolicyId>
</xades:SignaturePolicyIdentifier>
<xades:SignerRole>
<xades:ClaimedRoles>
<xades:ClaimedRole>supplier</xades:ClaimedRole>
</xades:ClaimedRoles>
</xades:SignerRole>
</xades:SignedSignatureProperties>
</xades:SignedProperties>`;
  }

  private buildSignedInfo(
    signatureId: string,
    keyInfoId: string,
    signedPropsId: string,
    docDigest: string,
    keyInfoDigest: string,
    signedPropsDigest: string,
  ): string {
    return `<ds:SignedInfo xmlns:ds="${ALGORITHMS.XMLDSIG_NS}">
<ds:CanonicalizationMethod Algorithm="${ALGORITHMS.C14N}"/>
<ds:SignatureMethod Algorithm="${ALGORITHMS.RSA_SHA256}"/>
<ds:Reference Id="${signatureId}-ref0" URI="">
<ds:Transforms>
<ds:Transform Algorithm="${ALGORITHMS.ENVELOPED_SIG}"/>
</ds:Transforms>
<ds:DigestMethod Algorithm="${ALGORITHMS.SHA256}"/>
<ds:DigestValue>${docDigest}</ds:DigestValue>
</ds:Reference>
<ds:Reference URI="#${keyInfoId}">
<ds:Transforms>
<ds:Transform Algorithm="${ALGORITHMS.C14N}"/>
</ds:Transforms>
<ds:DigestMethod Algorithm="${ALGORITHMS.SHA256}"/>
<ds:DigestValue>${keyInfoDigest}</ds:DigestValue>
</ds:Reference>
<ds:Reference Id="${signatureId}-ref2" URI="#${signedPropsId}" Type="${ALGORITHMS.SIGNED_PROPS_TYPE}">
<ds:Transforms>
<ds:Transform Algorithm="${ALGORITHMS.C14N}"/>
</ds:Transforms>
<ds:DigestMethod Algorithm="${ALGORITHMS.SHA256}"/>
<ds:DigestValue>${signedPropsDigest}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>`;
  }

  private canonicalize(node: Node): string {
    // Use xml-crypto's C14N canonicalization
    const {
      C14nCanonicalization,
    } = require('xml-crypto/lib/c14n-canonicalization');
    const canon = new C14nCanonicalization();
    return canon.process(node, { defaultNsForPrefix: {} });
  }

  private canonicalizeFragment(xmlFragment: string): string {
    const doc = new DOMParser().parseFromString(xmlFragment, 'text/xml');
    return this.canonicalize(doc.documentElement);
  }

  private sha256Base64(input: string): string {
    return crypto.createHash('sha256').update(input, 'utf8').digest('base64');
  }
}
