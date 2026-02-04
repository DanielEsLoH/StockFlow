import { Injectable, Logger } from '@nestjs/common';
import { TenantDianConfig } from '@prisma/client';
import * as https from 'https';

// DIAN Web Service URLs
const DIAN_URLS = {
  test: {
    wsdl: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl',
    endpoint: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
  },
  production: {
    wsdl: 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl',
    endpoint: 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc',
  },
};

export interface DianSendResult {
  success: boolean;
  isValid?: boolean;
  statusCode: string;
  statusDescription: string;
  statusMessage?: string;
  trackId?: string;
  xmlBase64Bytes?: string;
  errors?: string[];
  warnings?: string[];
}

export interface DianStatusResult {
  success: boolean;
  isValid?: boolean;
  statusCode: string;
  statusDescription: string;
  statusMessage?: string;
  documentStatus?: string;
  errors?: string[];
}

/**
 * Client service for DIAN web services
 * Handles sending electronic documents and checking their status
 */
@Injectable()
export class DianClientService {
  private readonly logger = new Logger(DianClientService.name);

  /**
   * Send a signed XML document to DIAN
   */
  async sendDocument(
    config: TenantDianConfig,
    signedXml: string,
    fileName: string,
  ): Promise<DianSendResult> {
    const urls = config.testMode ? DIAN_URLS.test : DIAN_URLS.production;

    this.logger.log(`Sending document to DIAN: ${fileName} (testMode: ${config.testMode})`);

    try {
      // Convert XML to Base64
      const xmlBase64 = Buffer.from(signedXml, 'utf-8').toString('base64');

      // Build SOAP envelope
      const soapEnvelope = this.buildSendDocumentEnvelope(xmlBase64, fileName);

      // Send request
      const response = await this.sendSoapRequest(urls.endpoint, soapEnvelope, 'SendBillSync');

      return this.parseSendResponse(response);
    } catch (error) {
      this.logger.error(`Error sending document to DIAN: ${error}`);
      return {
        success: false,
        statusCode: 'ERROR',
        statusDescription: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send a test set document to DIAN (for habilitacion/enabling process)
   */
  async sendTestSetDocument(
    config: TenantDianConfig,
    signedXml: string,
    fileName: string,
    testSetId: string,
  ): Promise<DianSendResult> {
    const urls = config.testMode ? DIAN_URLS.test : DIAN_URLS.production;

    this.logger.log(`Sending test set document to DIAN: ${fileName}, testSetId: ${testSetId}`);

    try {
      const xmlBase64 = Buffer.from(signedXml, 'utf-8').toString('base64');
      const soapEnvelope = this.buildSendTestSetEnvelope(xmlBase64, fileName, testSetId);
      const response = await this.sendSoapRequest(urls.endpoint, soapEnvelope, 'SendTestSetAsync');

      return this.parseSendResponse(response);
    } catch (error) {
      this.logger.error(`Error sending test set document: ${error}`);
      return {
        success: false,
        statusCode: 'ERROR',
        statusDescription: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Check the status of a previously sent document
   */
  async getDocumentStatus(
    config: TenantDianConfig,
    trackId: string,
  ): Promise<DianStatusResult> {
    const urls = config.testMode ? DIAN_URLS.test : DIAN_URLS.production;

    this.logger.log(`Checking document status: ${trackId}`);

    try {
      const soapEnvelope = this.buildGetStatusEnvelope(trackId);
      const response = await this.sendSoapRequest(urls.endpoint, soapEnvelope, 'GetStatus');

      return this.parseStatusResponse(response);
    } catch (error) {
      this.logger.error(`Error checking document status: ${error}`);
      return {
        success: false,
        statusCode: 'ERROR',
        statusDescription: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get the status of a document by CUFE
   */
  async getDocumentStatusByCufe(
    config: TenantDianConfig,
    cufe: string,
  ): Promise<DianStatusResult> {
    const urls = config.testMode ? DIAN_URLS.test : DIAN_URLS.production;

    this.logger.log(`Checking document status by CUFE: ${cufe.substring(0, 20)}...`);

    try {
      const soapEnvelope = this.buildGetStatusByCufeEnvelope(cufe);
      const response = await this.sendSoapRequest(urls.endpoint, soapEnvelope, 'GetStatusZip');

      return this.parseStatusResponse(response);
    } catch (error) {
      this.logger.error(`Error checking document status by CUFE: ${error}`);
      return {
        success: false,
        statusCode: 'ERROR',
        statusDescription: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // SOAP envelope builders

  private buildSendDocumentEnvelope(xmlBase64: string, fileName: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:SendBillSync>
      <wcf:fileName>${fileName}</wcf:fileName>
      <wcf:contentFile>${xmlBase64}</wcf:contentFile>
    </wcf:SendBillSync>
  </soap:Body>
</soap:Envelope>`;
  }

  private buildSendTestSetEnvelope(xmlBase64: string, fileName: string, testSetId: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:SendTestSetAsync>
      <wcf:fileName>${fileName}</wcf:fileName>
      <wcf:contentFile>${xmlBase64}</wcf:contentFile>
      <wcf:testSetId>${testSetId}</wcf:testSetId>
    </wcf:SendTestSetAsync>
  </soap:Body>
</soap:Envelope>`;
  }

  private buildGetStatusEnvelope(trackId: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:GetStatus>
      <wcf:trackId>${trackId}</wcf:trackId>
    </wcf:GetStatus>
  </soap:Body>
</soap:Envelope>`;
  }

  private buildGetStatusByCufeEnvelope(cufe: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:GetStatusZip>
      <wcf:trackId>${cufe}</wcf:trackId>
    </wcf:GetStatusZip>
  </soap:Body>
</soap:Envelope>`;
  }

  // HTTP request handler

  private async sendSoapRequest(
    endpoint: string,
    soapEnvelope: string,
    action: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(soapEnvelope),
          'SOAPAction': `http://wcf.dian.colombia/IWcfDianCustomerServices/${action}`,
        },
        rejectUnauthorized: true,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(soapEnvelope);
      req.end();
    });
  }

  // Response parsers

  private parseSendResponse(xmlResponse: string): DianSendResult {
    try {
      // Simple XML parsing for DIAN response
      const isValid = this.extractXmlValue(xmlResponse, 'IsValid') === 'true';
      const statusCode = this.extractXmlValue(xmlResponse, 'StatusCode') || '';
      const statusDescription = this.extractXmlValue(xmlResponse, 'StatusDescription') || '';
      const statusMessage = this.extractXmlValue(xmlResponse, 'StatusMessage') || '';
      const trackId = this.extractXmlValue(xmlResponse, 'TrackId') || '';
      const xmlBase64Bytes = this.extractXmlValue(xmlResponse, 'XmlBase64Bytes') || '';

      // Extract errors and warnings
      const errors = this.extractXmlArray(xmlResponse, 'ErrorMessage');
      const warnings = this.extractXmlArray(xmlResponse, 'WarningMessage');

      return {
        success: isValid && statusCode === '00',
        isValid,
        statusCode,
        statusDescription,
        statusMessage,
        trackId: trackId || undefined,
        xmlBase64Bytes: xmlBase64Bytes || undefined,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      this.logger.error(`Error parsing DIAN response: ${error}`);
      return {
        success: false,
        statusCode: 'PARSE_ERROR',
        statusDescription: 'Failed to parse DIAN response',
        errors: [error instanceof Error ? error.message : 'Unknown parse error'],
      };
    }
  }

  private parseStatusResponse(xmlResponse: string): DianStatusResult {
    try {
      const isValid = this.extractXmlValue(xmlResponse, 'IsValid') === 'true';
      const statusCode = this.extractXmlValue(xmlResponse, 'StatusCode') || '';
      const statusDescription = this.extractXmlValue(xmlResponse, 'StatusDescription') || '';
      const statusMessage = this.extractXmlValue(xmlResponse, 'StatusMessage') || '';
      const documentStatus = this.extractXmlValue(xmlResponse, 'DocumentStatus') || '';

      const errors = this.extractXmlArray(xmlResponse, 'ErrorMessage');

      return {
        success: isValid,
        isValid,
        statusCode,
        statusDescription,
        statusMessage,
        documentStatus: documentStatus || undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error(`Error parsing status response: ${error}`);
      return {
        success: false,
        statusCode: 'PARSE_ERROR',
        statusDescription: 'Failed to parse status response',
        errors: [error instanceof Error ? error.message : 'Unknown parse error'],
      };
    }
  }

  // XML helpers

  private extractXmlValue(xml: string, tagName: string): string | null {
    // Handle namespaced tags
    const patterns = [
      new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'),
      new RegExp(`<[a-z]+:${tagName}[^>]*>([^<]*)</[a-z]+:${tagName}>`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractXmlArray(xml: string, tagName: string): string[] {
    const results: string[] = [];
    const patterns = [
      new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'gi'),
      new RegExp(`<[a-z]+:${tagName}[^>]*>([^<]*)</[a-z]+:${tagName}>`, 'gi'),
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(xml)) !== null) {
        const value = match[1].trim();
        if (value && !results.includes(value)) {
          results.push(value);
        }
      }
    }

    return results;
  }
}
