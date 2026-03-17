import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * CUNE (Código Único de Nómina Electrónica) generator.
 *
 * Based on DIAN Anexo Técnico Nómina Electrónica V1.0
 * CUNE = SHA-384 of concatenation:
 *   NumNIE + FecNIE + HorNIE + ValDev + ValDed + ValTol +
 *   NitNIE + DocEmp + TipoAmb + SoftwarePin + TipoXML
 */
export interface CuneParams {
  /** Número del documento de nómina individual (e.g. "NOM-000001") */
  numNIE: string;
  /** Fecha de generación YYYY-MM-DD */
  fecNIE: string;
  /** Hora de generación HH:mm:ss-05:00 */
  horNIE: string;
  /** Valor total devengados (formato XX.XX) */
  valDev: string;
  /** Valor total deducciones (formato XX.XX) */
  valDed: string;
  /** Valor total neto (formato XX.XX) */
  valTol: string;
  /** NIT del empleador */
  nitNIE: string;
  /** Número de documento del empleado */
  docEmp: string;
  /** Tipo de ambiente: 1=Producción, 2=Pruebas */
  tipoAmb: string;
  /** Software PIN */
  softwarePin: string;
  /** Tipo de XML: 102=Nómina Individual, 103=Nómina de Ajuste */
  tipoXML: string;
}

@Injectable()
export class PayrollCuneGeneratorService {
  private readonly logger = new Logger(PayrollCuneGeneratorService.name);

  /**
   * Generate CUNE using SHA-384
   */
  generateCune(params: CuneParams): string {
    const concatenation = [
      params.numNIE,
      params.fecNIE,
      params.horNIE,
      params.valDev,
      params.valDed,
      params.valTol,
      params.nitNIE,
      params.docEmp,
      params.tipoAmb,
      params.softwarePin,
      params.tipoXML,
    ].join('');

    const cune = crypto.createHash('sha384').update(concatenation).digest('hex');

    this.logger.debug(`CUNE generated for ${params.numNIE}: ${cune.substring(0, 16)}...`);
    return cune;
  }

  /**
   * Format a monetary value for CUNE concatenation (XX.XX format)
   */
  formatMoney(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Generate current timestamp in DIAN format using Colombia timezone (America/Bogota, UTC-5).
   * Colombia does not observe DST so the offset is always -05:00.
   */
  generateTimestamp(): { date: string; time: string } {
    const colombiaDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }),
    );
    const year = colombiaDate.getFullYear();
    const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaDate.getDate()).padStart(2, '0');
    const hours = String(colombiaDate.getHours()).padStart(2, '0');
    const minutes = String(colombiaDate.getMinutes()).padStart(2, '0');
    const seconds = String(colombiaDate.getSeconds()).padStart(2, '0');

    const date = `${year}-${month}-${day}`;
    const time = `${hours}:${minutes}:${seconds}-05:00`;
    return { date, time };
  }
}
