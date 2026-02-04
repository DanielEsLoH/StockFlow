import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { TenantDianConfig, Invoice } from '@prisma/client';

export interface CufeInput {
  invoiceNumber: string;
  issueDate: Date;
  issueTime: string;
  subtotal: number;
  tax01: number; // IVA
  tax04: number; // INC
  tax03: number; // ICA
  total: number;
  supplierNit: string;
  customerDocument: string;
  technicalKey: string;
  testMode: boolean;
}

export interface CudeInput {
  documentNumber: string;
  issueDate: Date;
  issueTime: string;
  subtotal: number;
  tax01: number;
  tax04: number;
  tax03: number;
  total: number;
  supplierNit: string;
  customerDocument: string;
  softwarePin: string;
  testMode: boolean;
}

/**
 * Service for generating CUFE (Codigo Unico de Factura Electronica)
 * and CUDE (Codigo Unico de Documento Electronico) for Colombian electronic invoicing
 *
 * CUFE is calculated using SHA-384 hash of concatenated invoice data
 * as defined by DIAN technical annex
 */
@Injectable()
export class CufeGeneratorService {
  private readonly logger = new Logger(CufeGeneratorService.name);

  /**
   * Generate CUFE for an electronic invoice
   *
   * Formula: SHA-384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
   *                  CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot +
   *                  NitOFE + NumAdq + ClTec + TipoAmbiente)
   */
  generateCufe(input: CufeInput): string {
    const {
      invoiceNumber,
      issueDate,
      issueTime,
      subtotal,
      tax01,
      tax04,
      tax03,
      total,
      supplierNit,
      customerDocument,
      technicalKey,
      testMode,
    } = input;

    // Format values according to DIAN specifications
    const numFac = invoiceNumber;
    const fecFac = this.formatDateForCufe(issueDate);
    const horFac = issueTime;
    const valFac = this.formatAmount(subtotal);
    const codImp1 = '01'; // IVA
    const valImp1 = this.formatAmount(tax01);
    const codImp2 = '04'; // INC
    const valImp2 = this.formatAmount(tax04);
    const codImp3 = '03'; // ICA
    const valImp3 = this.formatAmount(tax03);
    const valTot = this.formatAmount(total);
    const nitOfe = supplierNit;
    const numAdq = customerDocument;
    const clTec = technicalKey;
    const tipoAmbiente = testMode ? '2' : '1';

    // Concatenate all values
    const concatenated = [
      numFac,
      fecFac,
      horFac,
      valFac,
      codImp1,
      valImp1,
      codImp2,
      valImp2,
      codImp3,
      valImp3,
      valTot,
      nitOfe,
      numAdq,
      clTec,
      tipoAmbiente,
    ].join('');

    this.logger.debug(`CUFE input string: ${concatenated}`);

    // Generate SHA-384 hash
    const cufe = createHash('sha384').update(concatenated).digest('hex');

    this.logger.log(`Generated CUFE for invoice ${invoiceNumber}: ${cufe.substring(0, 20)}...`);

    return cufe;
  }

  /**
   * Generate CUDE for credit notes and debit notes
   *
   * Formula similar to CUFE but uses PIN instead of Technical Key
   */
  generateCude(input: CudeInput): string {
    const {
      documentNumber,
      issueDate,
      issueTime,
      subtotal,
      tax01,
      tax04,
      tax03,
      total,
      supplierNit,
      customerDocument,
      softwarePin,
      testMode,
    } = input;

    // Format values
    const numDoc = documentNumber;
    const fecDoc = this.formatDateForCufe(issueDate);
    const horDoc = issueTime;
    const valDoc = this.formatAmount(subtotal);
    const codImp1 = '01';
    const valImp1 = this.formatAmount(tax01);
    const codImp2 = '04';
    const valImp2 = this.formatAmount(tax04);
    const codImp3 = '03';
    const valImp3 = this.formatAmount(tax03);
    const valTot = this.formatAmount(total);
    const nitOfe = supplierNit;
    const numAdq = customerDocument;
    const pinSoftware = softwarePin;
    const tipoAmbiente = testMode ? '2' : '1';

    const concatenated = [
      numDoc,
      fecDoc,
      horDoc,
      valDoc,
      codImp1,
      valImp1,
      codImp2,
      valImp2,
      codImp3,
      valImp3,
      valTot,
      nitOfe,
      numAdq,
      pinSoftware,
      tipoAmbiente,
    ].join('');

    this.logger.debug(`CUDE input string: ${concatenated}`);

    const cude = createHash('sha384').update(concatenated).digest('hex');

    this.logger.log(`Generated CUDE for document ${documentNumber}: ${cude.substring(0, 20)}...`);

    return cude;
  }

  /**
   * Generate CUFE from invoice and config
   */
  generateCufeFromInvoice(
    invoice: Invoice,
    config: TenantDianConfig,
    customerDocument: string,
  ): string {
    const issueDate = new Date(invoice.issueDate);

    return this.generateCufe({
      invoiceNumber: invoice.invoiceNumber,
      issueDate,
      issueTime: this.formatTime(issueDate),
      subtotal: Number(invoice.subtotal) || 0,
      tax01: Number(invoice.tax) || 0, // IVA
      tax04: 0, // INC - would need to be calculated separately
      tax03: 0, // ICA - would need to be calculated separately
      total: Number(invoice.total) || 0,
      supplierNit: config.nit,
      customerDocument: customerDocument || '222222222222',
      technicalKey: config.technicalKey || '',
      testMode: config.testMode,
    });
  }

  /**
   * Generate QR code data string for DIAN
   */
  generateQrCodeData(
    invoice: Invoice,
    config: TenantDianConfig,
    cufe: string,
    customerDocument?: string,
  ): string {
    const issueDate = new Date(invoice.issueDate);
    const baseUrl = config.testMode
      ? 'https://catalogo-vpfe-hab.dian.gov.co'
      : 'https://catalogo-vpfe.dian.gov.co';

    // QR Code format according to DIAN
    const qrData = [
      `NumFac: ${invoice.invoiceNumber}`,
      `FecFac: ${this.formatDateForCufe(issueDate)}`,
      `HorFac: ${this.formatTime(issueDate)}`,
      `NitFac: ${config.nit}`,
      `DocAdq: ${customerDocument || '222222222222'}`,
      `ValFac: ${this.formatAmount(Number(invoice.subtotal))}`,
      `ValIva: ${this.formatAmount(Number(invoice.tax))}`,
      `ValOtroIm: 0.00`,
      `ValTotFac: ${this.formatAmount(Number(invoice.total))}`,
      `CUFE: ${cufe}`,
      `${baseUrl}/document/searchqr?documentkey=${cufe}`,
    ].join('\n');

    return qrData;
  }

  /**
   * Format date as YYYY-MM-DD for CUFE calculation
   */
  private formatDateForCufe(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time as HH:MM:SS-05:00 (Colombia timezone)
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}-05:00`;
  }

  /**
   * Format amount with 2 decimal places
   */
  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Validate CUFE format (96 hex characters for SHA-384)
   */
  validateCufe(cufe: string): boolean {
    return /^[a-f0-9]{96}$/i.test(cufe);
  }
}
