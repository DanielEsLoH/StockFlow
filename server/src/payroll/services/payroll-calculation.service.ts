import { Injectable, Logger } from '@nestjs/common';
import { ARLRiskLevel, SalaryType } from '@prisma/client';

// ===== Colombian Labor Law Constants (2026) =====

/** Employee health contribution rate */
const SALUD_EMPLEADO = 0.04;
/** Employee pension contribution rate */
const PENSION_EMPLEADO = 0.04;

/** Employer health contribution rate */
const SALUD_EMPLEADOR = 0.085;
/** Employer pension contribution rate */
const PENSION_EMPLEADOR = 0.12;
/** Employer caja de compensacion rate */
const CAJA_EMPLEADOR = 0.04;
/** Employer SENA rate */
const SENA_EMPLEADOR = 0.02;
/** Employer ICBF rate */
const ICBF_EMPLEADOR = 0.03;

/** ARL rates by risk level */
const ARL_RATES: Record<ARLRiskLevel, number> = {
  LEVEL_I: 0.00522,
  LEVEL_II: 0.01044,
  LEVEL_III: 0.02436,
  LEVEL_IV: 0.0435,
  LEVEL_V: 0.0696,
};

/** Provision rates */
const PRIMA_RATE = 8.33 / 100;
const CESANTIAS_RATE = 8.33 / 100;
const INTERESES_CESANTIAS_RATE = 0.01;
const VACACIONES_RATE = 4.17 / 100;

/** Fondo de solidaridad pensional threshold (>4 SMMLV) */
const FONDO_SOLIDARIDAD_THRESHOLD = 4;
/** Base fondo solidaridad rate */
const FONDO_SOLIDARIDAD_BASE_RATE = 0.01;
/** Additional fondo solidaridad sub-contribution for >16 SMMLV */
const FONDO_SUBSISTENCIA_RATES: { minSmmlv: number; maxSmmlv: number; rate: number }[] = [
  { minSmmlv: 16, maxSmmlv: 17, rate: 0.002 },
  { minSmmlv: 17, maxSmmlv: 18, rate: 0.004 },
  { minSmmlv: 18, maxSmmlv: 19, rate: 0.006 },
  { minSmmlv: 19, maxSmmlv: 20, rate: 0.008 },
  { minSmmlv: 20, maxSmmlv: Infinity, rate: 0.01 },
];

/** Overtime multipliers */
export const OVERTIME_MULTIPLIERS = {
  /** Hora Extra Diurna: +25% */
  HED: 1.25,
  /** Hora Extra Nocturna: +75% */
  HEN: 1.75,
  /** Hora Extra Dominical Diurna: +100% */
  HDD: 2.0,
  /** Hora Extra Dominical Nocturna: +150% */
  HDN: 2.5,
  /** Hora Extra Dominical/Festivo Diurna Feriado: +150% */
  HEDDF: 2.5,
  /** Hora Extra Dominical/Festivo Nocturna Feriado: +175% */
  HENDF: 2.75,
} as const;

/** Hours per month for hourly rate calculation */
const HOURS_PER_MONTH = 240;
/** Days in a standard month */
const DAYS_PER_MONTH = 30;
/** Integral salary factor (70% for IBC) */
const INTEGRAL_IBC_FACTOR = 0.7;
/** Minimum integral salary factor (13 SMMLV) */
const MIN_INTEGRAL_SMMLV = 13;

// ===== Retention tax table (Art. 383 ET) =====

interface UvtRange {
  minUvt: number;
  maxUvt: number;
  rate: number;
  subtractUvt: number;
}

const RETENCION_TABLE: UvtRange[] = [
  { minUvt: 0, maxUvt: 95, rate: 0, subtractUvt: 0 },
  { minUvt: 95, maxUvt: 150, rate: 0.19, subtractUvt: 95 },
  { minUvt: 150, maxUvt: 360, rate: 0.28, subtractUvt: 150 },
  { minUvt: 360, maxUvt: 640, rate: 0.33, subtractUvt: 360 },
  { minUvt: 640, maxUvt: 945, rate: 0.35, subtractUvt: 640 },
  { minUvt: 945, maxUvt: 2300, rate: 0.37, subtractUvt: 945 },
  { minUvt: 2300, maxUvt: Infinity, rate: 0.39, subtractUvt: 2300 },
];

// Accumulated UVT values at each bracket boundary for additive calculation
const RETENCION_ACCUMULATED: number[] = [];
{
  let acc = 0;
  for (let i = 0; i < RETENCION_TABLE.length; i++) {
    RETENCION_ACCUMULATED.push(acc);
    const range = RETENCION_TABLE[i];
    const width = range.maxUvt === Infinity ? 0 : range.maxUvt - range.minUvt;
    acc += width * range.rate;
  }
}

// ===== Interfaces =====

export interface OvertimeDetail {
  type: keyof typeof OVERTIME_MULTIPLIERS;
  hours: number;
}

export interface PayrollCalculationParams {
  baseSalary: number;
  salaryType: SalaryType;
  daysWorked: number;
  arlRiskLevel: ARLRiskLevel;
  auxilioTransporte: boolean;
  smmlv: number;
  auxilioTransporteVal: number;
  uvtValue: number;
  overtime?: OvertimeDetail[];
  bonificaciones?: number;
  comisiones?: number;
  viaticos?: number;
  incapacidadDias?: number;
  licenciaDias?: number;
  vacacionesDias?: number;
  sindicato?: number;
  libranzas?: number;
  otrasDeducciones?: number;
  otrosDevengados?: number;
}

export interface PayrollCalculationResult {
  // Devengados
  sueldo: number;
  auxilioTransporte: number;
  horasExtras: number;
  bonificaciones: number;
  comisiones: number;
  viaticos: number;
  incapacidad: number;
  licencia: number;
  vacaciones: number;
  otrosDevengados: number;
  totalDevengados: number;

  // Deducciones
  saludEmpleado: number;
  pensionEmpleado: number;
  fondoSolidaridad: number;
  retencionFuente: number;
  sindicato: number;
  libranzas: number;
  otrasDeducciones: number;
  totalDeducciones: number;

  // Aportes empleador
  saludEmpleador: number;
  pensionEmpleador: number;
  arlEmpleador: number;
  cajaEmpleador: number;
  senaEmpleador: number;
  icbfEmpleador: number;

  // Provisiones
  provisionPrima: number;
  provisionCesantias: number;
  provisionIntereses: number;
  provisionVacaciones: number;

  // Neto
  totalNeto: number;

  // IBC reference
  ibc: number;
}

@Injectable()
export class PayrollCalculationService {
  private readonly logger = new Logger(PayrollCalculationService.name);

  /**
   * Main calculation method — computes all payroll components.
   */
  calculatePayrollEntry(params: PayrollCalculationParams): PayrollCalculationResult {
    const {
      baseSalary,
      salaryType,
      daysWorked,
      arlRiskLevel,
      auxilioTransporte: hasAuxilio,
      smmlv,
      auxilioTransporteVal,
      uvtValue,
      overtime = [],
      bonificaciones = 0,
      comisiones = 0,
      viaticos = 0,
      incapacidadDias = 0,
      licenciaDias = 0,
      vacacionesDias = 0,
      sindicato = 0,
      libranzas = 0,
      otrasDeducciones = 0,
      otrosDevengados = 0,
    } = params;

    const isIntegral = salaryType === SalaryType.INTEGRAL;

    // === Devengados ===
    const sueldo = this.calculateSueldo(baseSalary, daysWorked);
    const auxTransporte = this.calculateAuxilioTransporte(
      hasAuxilio,
      auxilioTransporteVal,
      daysWorked,
    );
    const horasExtras = isIntegral ? 0 : this.calculateOvertime(baseSalary, overtime);
    const incapacidad = this.calculateIncapacidad(baseSalary, incapacidadDias);
    const licencia = this.calculateLicencia(baseSalary, licenciaDias);
    const vacaciones = this.calculateVacaciones(baseSalary, vacacionesDias);

    const totalDevengados = this.round(
      sueldo + auxTransporte + horasExtras + bonificaciones +
      comisiones + viaticos + incapacidad + licencia + vacaciones + otrosDevengados,
    );

    // === IBC (Ingreso Base de Cotización) ===
    const ibc = isIntegral
      ? this.calculateIBCIntegral(baseSalary, daysWorked)
      : this.calculateIBC(totalDevengados, auxTransporte);

    // === Deducciones ===
    const saludEmpleado = this.round(ibc * SALUD_EMPLEADO);
    const pensionEmpleado = this.round(ibc * PENSION_EMPLEADO);
    const fondoSolidaridad = this.calculateFondoSolidaridad(ibc, smmlv);
    const retencionFuente = this.calculateRetencionFuente(
      totalDevengados,
      auxTransporte,
      saludEmpleado,
      pensionEmpleado,
      fondoSolidaridad,
      uvtValue,
    );

    const totalDeducciones = this.round(
      saludEmpleado + pensionEmpleado + fondoSolidaridad +
      retencionFuente + sindicato + libranzas + otrasDeducciones,
    );

    // === Aportes empleador ===
    const saludEmpleador = this.round(ibc * SALUD_EMPLEADOR);
    const pensionEmpleador = this.round(ibc * PENSION_EMPLEADOR);
    const arlEmpleador = this.round(ibc * ARL_RATES[arlRiskLevel]);
    const cajaEmpleador = this.round(ibc * CAJA_EMPLEADOR);
    const senaEmpleador = this.round(ibc * SENA_EMPLEADOR);
    const icbfEmpleador = this.round(ibc * ICBF_EMPLEADOR);

    // === Provisiones (sobre IBC, no sobre sueldo) ===
    const provisionBase = isIntegral ? 0 : ibc;
    const provisionPrima = this.round(provisionBase * PRIMA_RATE);
    const provisionCesantias = this.round(provisionBase * CESANTIAS_RATE);
    const provisionIntereses = this.round(provisionCesantias * INTERESES_CESANTIAS_RATE);
    const provisionVacaciones = this.round(provisionBase * VACACIONES_RATE);

    // === Neto ===
    const totalNeto = this.round(totalDevengados - totalDeducciones);

    return {
      sueldo,
      auxilioTransporte: auxTransporte,
      horasExtras,
      bonificaciones,
      comisiones,
      viaticos,
      incapacidad,
      licencia,
      vacaciones,
      otrosDevengados,
      totalDevengados,
      saludEmpleado,
      pensionEmpleado,
      fondoSolidaridad,
      retencionFuente,
      sindicato,
      libranzas,
      otrasDeducciones,
      totalDeducciones,
      saludEmpleador,
      pensionEmpleador,
      arlEmpleador,
      cajaEmpleador,
      senaEmpleador,
      icbfEmpleador,
      provisionPrima,
      provisionCesantias,
      provisionIntereses,
      provisionVacaciones,
      totalNeto,
      ibc,
    };
  }

  /**
   * Calculate proportional salary based on days worked.
   */
  calculateSueldo(baseSalary: number, daysWorked: number): number {
    if (daysWorked >= DAYS_PER_MONTH) return this.round(baseSalary);
    return this.round((baseSalary / DAYS_PER_MONTH) * daysWorked);
  }

  /**
   * Calculate auxilio de transporte (proportional to days worked).
   * Only applies if employee has auxilio (salary ≤ 2 SMMLV and not integral).
   */
  calculateAuxilioTransporte(
    hasAuxilio: boolean,
    auxilioTransporteVal: number,
    daysWorked: number,
  ): number {
    if (!hasAuxilio) return 0;
    if (daysWorked >= DAYS_PER_MONTH) return this.round(auxilioTransporteVal);
    return this.round((auxilioTransporteVal / DAYS_PER_MONTH) * daysWorked);
  }

  /**
   * Calculate overtime pay.
   * hourlyRate = baseSalary / 240 (monthly hours)
   */
  calculateOvertime(baseSalary: number, overtime: OvertimeDetail[]): number {
    if (!overtime.length) return 0;

    const hourlyRate = baseSalary / HOURS_PER_MONTH;
    let total = 0;

    for (const entry of overtime) {
      const multiplier = OVERTIME_MULTIPLIERS[entry.type];
      total += hourlyRate * multiplier * entry.hours;
    }

    return this.round(total);
  }

  /**
   * Calculate IBC for ordinary salary.
   * IBC = totalDevengados - auxilioTransporte
   */
  calculateIBC(totalDevengados: number, auxilioTransporte: number): number {
    return this.round(totalDevengados - auxilioTransporte);
  }

  /**
   * Calculate IBC for integral salary (70% of base salary, proportional).
   */
  calculateIBCIntegral(baseSalary: number, daysWorked: number): number {
    const monthlyIBC = baseSalary * INTEGRAL_IBC_FACTOR;
    if (daysWorked >= DAYS_PER_MONTH) return this.round(monthlyIBC);
    return this.round((monthlyIBC / DAYS_PER_MONTH) * daysWorked);
  }

  /**
   * Calculate fondo de solidaridad pensional.
   * Applies when IBC > 4 SMMLV.
   * Base 1% + additional sub-contribution for >16 SMMLV.
   */
  calculateFondoSolidaridad(ibc: number, smmlv: number): number {
    const threshold = FONDO_SOLIDARIDAD_THRESHOLD * smmlv;
    if (ibc <= threshold) return 0;

    let rate = FONDO_SOLIDARIDAD_BASE_RATE;

    // Additional sub-contribution for very high salaries
    const smmlvMultiple = ibc / smmlv;
    for (const bracket of FONDO_SUBSISTENCIA_RATES) {
      if (smmlvMultiple >= bracket.minSmmlv && smmlvMultiple < bracket.maxSmmlv) {
        rate += bracket.rate;
        break;
      }
    }

    return this.round(ibc * rate);
  }

  /**
   * Calculate retención en la fuente (income tax withholding).
   * Uses progressive UVT-based table (Art. 383 ET).
   */
  calculateRetencionFuente(
    totalDevengados: number,
    auxilioTransporte: number,
    saludEmpleado: number,
    pensionEmpleado: number,
    fondoSolidaridad: number,
    uvtValue: number,
  ): number {
    // Taxable base: devengados - auxilio - mandatory contributions
    const mandatoryContributions = saludEmpleado + pensionEmpleado + fondoSolidaridad;
    const taxableBase = totalDevengados - auxilioTransporte - mandatoryContributions;

    // 25% renta exenta
    const rentaExenta = taxableBase * 0.25;
    const netTaxableBase = taxableBase - rentaExenta;

    if (netTaxableBase <= 0) return 0;

    // Convert to UVT
    const baseInUvt = netTaxableBase / uvtValue;

    // Find applicable bracket
    for (let i = RETENCION_TABLE.length - 1; i >= 0; i--) {
      const range = RETENCION_TABLE[i];
      if (baseInUvt >= range.minUvt) {
        if (range.rate === 0) return 0;
        const taxInUvt = RETENCION_ACCUMULATED[i] + (baseInUvt - range.minUvt) * range.rate;
        return this.round(taxInUvt * uvtValue);
      }
    }

    return 0;
  }

  /**
   * Calculate incapacidad pay (2/3 of daily salary × days).
   */
  calculateIncapacidad(baseSalary: number, dias: number): number {
    if (dias <= 0) return 0;
    const dailyRate = baseSalary / DAYS_PER_MONTH;
    // First 2 days paid by employer at 100%, rest at 66.67%
    const daysAt100 = Math.min(dias, 2);
    const daysAt67 = Math.max(0, dias - 2);
    return this.round(dailyRate * daysAt100 + dailyRate * (2 / 3) * daysAt67);
  }

  /**
   * Calculate licencia pay (daily salary × days at 100%).
   */
  calculateLicencia(baseSalary: number, dias: number): number {
    if (dias <= 0) return 0;
    return this.round((baseSalary / DAYS_PER_MONTH) * dias);
  }

  /**
   * Calculate vacaciones pay (daily salary × days at 100%).
   */
  calculateVacaciones(baseSalary: number, dias: number): number {
    if (dias <= 0) return 0;
    return this.round((baseSalary / DAYS_PER_MONTH) * dias);
  }

  /**
   * Validate that integral salary meets minimum threshold (13 SMMLV).
   */
  isValidIntegralSalary(baseSalary: number, smmlv: number): boolean {
    return baseSalary >= MIN_INTEGRAL_SMMLV * smmlv;
  }

  /**
   * Round to nearest peso (no decimals for COP).
   */
  private round(value: number): number {
    return Math.round(value);
  }
}
