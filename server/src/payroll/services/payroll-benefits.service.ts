import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/services/tenant-context.service';
import { PayrollConfigService } from '../payroll-config.service';
import { SalaryType, EmployeeStatus } from '@prisma/client';

// ===== Colombian Social Benefits Constants =====

/** Days in a full year for benefit calculations */
const DAYS_PER_YEAR = 360;

/** Days in a month for payroll */
const DAYS_PER_MONTH = 30;

/** Intereses sobre cesantias annual rate */
const INTERESES_CESANTIAS_RATE = 0.12;

/** Vacaciones divisor: baseSalary * daysWorked / 720 */
const VACACIONES_DIVISOR = 720;

// ===== Types =====

export type BenefitType = 'PRIMA' | 'CESANTIAS' | 'INTERESES_CESANTIAS' | 'VACACIONES';

export interface MonthlyProvisions {
  provisionPrima: number;
  provisionCesantias: number;
  provisionIntereses: number;
  provisionVacaciones: number;
}

export interface BenefitPaymentResult {
  employeeId: string;
  employeeName: string;
  benefitType: BenefitType;
  baseSalary: number;
  auxilioTransporte: number;
  daysWorked: number;
  calculatedAmount: number;
  paymentDate: Date;
  periodDescription: string;
}

export interface LiquidationBenefitItem {
  concept: string;
  base: number;
  days: number;
  amount: number;
  formula: string;
}

export interface LiquidationPreview {
  employeeId: string;
  employeeName: string;
  documentNumber: string;
  baseSalary: number;
  auxilioTransporte: number;
  startDate: Date;
  endDate: Date;
  totalDaysWorked: number;
  salaryType: string;
  benefits: LiquidationBenefitItem[];
  totalBenefits: number;
  /** Accumulated provisions already recorded in closed payroll periods */
  accumulatedProvisions: {
    prima: number;
    cesantias: number;
    intereses: number;
    vacaciones: number;
    total: number;
  };
  /** Net difference: totalBenefits - accumulated provisions */
  netPayable: number;
}

@Injectable()
export class PayrollBenefitsService {
  private readonly logger = new Logger(PayrollBenefitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly configService: PayrollConfigService,
  ) {}

  // ===================================================================
  // Monthly Provisions (called during payroll period calculation)
  // ===================================================================

  /**
   * Calculate monthly benefit provisions for a payroll entry.
   *
   * Colombian law:
   * - Prima de servicios: (baseSalary + auxTransporte) / 12
   * - Cesantias: (baseSalary + auxTransporte) / 12
   * - Intereses cesantias: cesantias_provision * 1%
   * - Vacaciones: baseSalary / 24 (auxTransporte NOT included)
   * - Salario integral: NO provisions (already factored into salary)
   *
   * When daysWorked < 30, provisions are proportional.
   */
  calculateMonthlyProvisions(params: {
    baseSalary: number;
    auxilioTransporte: number;
    daysWorked: number;
    isIntegral: boolean;
  }): MonthlyProvisions {
    const { baseSalary, auxilioTransporte, daysWorked, isIntegral } = params;

    if (isIntegral) {
      return {
        provisionPrima: 0,
        provisionCesantias: 0,
        provisionIntereses: 0,
        provisionVacaciones: 0,
      };
    }

    const dayFraction = daysWorked / DAYS_PER_MONTH;

    // Prima and cesantias base includes auxilio de transporte
    const benefitBase = baseSalary + auxilioTransporte;

    const provisionPrima = Math.round((benefitBase / 12) * dayFraction);
    const provisionCesantias = Math.round((benefitBase / 12) * dayFraction);
    const provisionIntereses = Math.round(provisionCesantias * 0.01);

    // Vacaciones does NOT include auxilio de transporte
    const provisionVacaciones = Math.round((baseSalary / 24) * dayFraction);

    return {
      provisionPrima,
      provisionCesantias,
      provisionIntereses,
      provisionVacaciones,
    };
  }

  // ===================================================================
  // Benefit Payment Calculation
  // ===================================================================

  /**
   * Calculate the actual benefit payment amount for a specific benefit type.
   *
   * Formulas (Colombian labor law):
   * - Prima = (baseSalary + auxTransporte) * daysWorked / 360
   *   Paid semiannually: Jun (Jan-Jun) and Dec (Jul-Dec)
   *
   * - Cesantias = (baseSalary + auxTransporte) * daysWorked / 360
   *   Paid annually in February to the fund
   *
   * - Intereses cesantias = cesantias * 12% * daysWorked / 360
   *   Paid annually in January
   *
   * - Vacaciones = baseSalary * daysWorked / 720
   *   15 business days per year of service
   *
   * @param daysWorked - days in the calculation period (not calendar days)
   */
  async calculateBenefitPayment(
    employeeId: string,
    benefitType: BenefitType,
    paymentDate: Date,
  ): Promise<BenefitPaymentResult> {
    const tenantId = this.tenantContext.requireTenantId();
    const config = await this.configService.getOrFail();

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (employee.salaryType === SalaryType.INTEGRAL) {
      throw new BadRequestException(
        'Los empleados con salario integral no tienen derecho a prestaciones sociales separadas',
      );
    }

    const baseSalary = Number(employee.baseSalary);
    const auxilioTransporte = employee.auxilioTransporte
      ? config.auxilioTransporteVal
      : 0;

    const { daysWorked, periodDescription } = this.calculateBenefitPeriod(
      benefitType,
      employee.startDate,
      paymentDate,
    );

    const calculatedAmount = this.computeBenefitAmount(
      benefitType,
      baseSalary,
      auxilioTransporte,
      daysWorked,
    );

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      benefitType,
      baseSalary,
      auxilioTransporte,
      daysWorked,
      calculatedAmount,
      paymentDate,
      periodDescription,
    };
  }

  // ===================================================================
  // Liquidation Preview (for employee termination)
  // ===================================================================

  /**
   * Generate a complete liquidation preview for an employee.
   * Calculates all owed benefits from start date (or last settlement) to now,
   * subtracts accumulated provisions from closed payroll periods.
   */
  async getLiquidationPreview(
    employeeId: string,
    terminationDate?: Date,
  ): Promise<LiquidationPreview> {
    const tenantId = this.tenantContext.requireTenantId();
    const config = await this.configService.getOrFail();

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const baseSalary = Number(employee.baseSalary);
    const isIntegral = employee.salaryType === SalaryType.INTEGRAL;
    const auxilioTransporte = employee.auxilioTransporte
      ? config.auxilioTransporteVal
      : 0;

    const endDate = terminationDate ?? new Date();
    const startDate = employee.startDate;
    const totalDaysWorked = this.calculateDays360(startDate, endDate);

    // Calculate current-year days for annual benefits
    const currentYearStart = new Date(endDate.getFullYear(), 0, 1);
    const effectiveYearStart = startDate > currentYearStart ? startDate : currentYearStart;
    const daysCurrentYear = this.calculateDays360(effectiveYearStart, endDate);

    // Calculate current semester days for prima
    const semesterStart = endDate.getMonth() < 6
      ? new Date(endDate.getFullYear(), 0, 1)
      : new Date(endDate.getFullYear(), 6, 1);
    const effectiveSemesterStart = startDate > semesterStart ? startDate : semesterStart;
    const daysSemester = this.calculateDays360(effectiveSemesterStart, endDate);

    const benefits: LiquidationBenefitItem[] = [];

    if (!isIntegral) {
      const benefitBase = baseSalary + auxilioTransporte;

      // Prima de servicios (proportional to current semester)
      const primaAmount = Math.round(
        (benefitBase * daysSemester) / DAYS_PER_YEAR,
      );
      benefits.push({
        concept: 'Prima de servicios',
        base: benefitBase,
        days: daysSemester,
        amount: primaAmount,
        formula: `(${this.formatCurrency(benefitBase)} x ${daysSemester} dias) / ${DAYS_PER_YEAR}`,
      });

      // Cesantias (proportional to current year)
      const cesantiasAmount = Math.round(
        (benefitBase * daysCurrentYear) / DAYS_PER_YEAR,
      );
      benefits.push({
        concept: 'Cesantias',
        base: benefitBase,
        days: daysCurrentYear,
        amount: cesantiasAmount,
        formula: `(${this.formatCurrency(benefitBase)} x ${daysCurrentYear} dias) / ${DAYS_PER_YEAR}`,
      });

      // Intereses sobre cesantias
      const interesesAmount = Math.round(
        (cesantiasAmount * INTERESES_CESANTIAS_RATE * daysCurrentYear) / DAYS_PER_YEAR,
      );
      benefits.push({
        concept: 'Intereses sobre cesantias',
        base: cesantiasAmount,
        days: daysCurrentYear,
        amount: interesesAmount,
        formula: `(${this.formatCurrency(cesantiasAmount)} x 12% x ${daysCurrentYear} dias) / ${DAYS_PER_YEAR}`,
      });

      // Vacaciones (does NOT include auxilio transporte)
      const vacacionesAmount = Math.round(
        (baseSalary * totalDaysWorked) / VACACIONES_DIVISOR,
      );
      benefits.push({
        concept: 'Vacaciones',
        base: baseSalary,
        days: totalDaysWorked,
        amount: vacacionesAmount,
        formula: `(${this.formatCurrency(baseSalary)} x ${totalDaysWorked} dias) / ${VACACIONES_DIVISOR}`,
      });
    }

    const totalBenefits = benefits.reduce((sum, b) => sum + b.amount, 0);

    // Sum accumulated provisions from closed/approved payroll periods
    const accumulatedProvisions = await this.getAccumulatedProvisions(
      tenantId,
      employeeId,
    );

    const netPayable = totalBenefits - accumulatedProvisions.total;

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      documentNumber: employee.documentNumber,
      baseSalary,
      auxilioTransporte,
      startDate,
      endDate,
      totalDaysWorked,
      salaryType: employee.salaryType,
      benefits,
      totalBenefits,
      accumulatedProvisions,
      netPayable,
    };
  }

  // ===================================================================
  // Private Helpers
  // ===================================================================

  /**
   * Compute the raw benefit amount based on type.
   */
  private computeBenefitAmount(
    type: BenefitType,
    baseSalary: number,
    auxilioTransporte: number,
    daysWorked: number,
  ): number {
    const benefitBase = baseSalary + auxilioTransporte;

    switch (type) {
      case 'PRIMA':
        // (baseSalary + auxTransporte) * daysWorked / 360
        return Math.round((benefitBase * daysWorked) / DAYS_PER_YEAR);

      case 'CESANTIAS':
        // (baseSalary + auxTransporte) * daysWorked / 360
        return Math.round((benefitBase * daysWorked) / DAYS_PER_YEAR);

      case 'INTERESES_CESANTIAS': {
        // cesantias * 12% * daysWorked / 360
        const cesantias = (benefitBase * daysWorked) / DAYS_PER_YEAR;
        return Math.round(
          (cesantias * INTERESES_CESANTIAS_RATE * daysWorked) / DAYS_PER_YEAR,
        );
      }

      case 'VACACIONES':
        // baseSalary * daysWorked / 720 (NO auxilio)
        return Math.round((baseSalary * daysWorked) / VACACIONES_DIVISOR);

      default:
        throw new BadRequestException(`Tipo de prestacion invalido: ${type}`);
    }
  }

  /**
   * Determine the applicable period and days worked for a benefit type.
   * Uses the employee's start date and the payment date to calculate
   * proportional days.
   */
  private calculateBenefitPeriod(
    type: BenefitType,
    startDate: Date,
    paymentDate: Date,
  ): { daysWorked: number; periodDescription: string } {
    const year = paymentDate.getFullYear();

    switch (type) {
      case 'PRIMA': {
        // Prima: semiannual (Jan-Jun or Jul-Dec)
        const isFirstHalf = paymentDate.getMonth() < 6;
        const periodStart = isFirstHalf
          ? new Date(year, 0, 1)
          : new Date(year, 6, 1);
        const periodEnd = isFirstHalf
          ? new Date(year, 5, 30)
          : new Date(year, 11, 31);

        const effectiveStart = startDate > periodStart ? startDate : periodStart;
        const effectiveEnd = paymentDate < periodEnd ? paymentDate : periodEnd;
        const daysWorked = this.calculateDays360(effectiveStart, effectiveEnd);
        const periodLabel = isFirstHalf ? 'Ene-Jun' : 'Jul-Dic';

        return {
          daysWorked,
          periodDescription: `Prima ${periodLabel} ${year}`,
        };
      }

      case 'CESANTIAS': {
        // Cesantias: annual (Jan 1 - Dec 31 of previous year, paid in Feb)
        const cesantiasYear = paymentDate.getMonth() <= 1 ? year - 1 : year;
        const periodStart = new Date(cesantiasYear, 0, 1);
        const periodEnd = new Date(cesantiasYear, 11, 31);

        const effectiveStart = startDate > periodStart ? startDate : periodStart;
        const daysWorked = this.calculateDays360(effectiveStart, periodEnd);

        return {
          daysWorked,
          periodDescription: `Cesantias ${cesantiasYear}`,
        };
      }

      case 'INTERESES_CESANTIAS': {
        // Same period as cesantias
        const intYear = paymentDate.getMonth() === 0 ? year - 1 : year;
        const periodStart = new Date(intYear, 0, 1);
        const periodEnd = new Date(intYear, 11, 31);

        const effectiveStart = startDate > periodStart ? startDate : periodStart;
        const daysWorked = this.calculateDays360(effectiveStart, periodEnd);

        return {
          daysWorked,
          periodDescription: `Intereses cesantias ${intYear}`,
        };
      }

      case 'VACACIONES': {
        // Total days from start of employment
        const daysWorked = this.calculateDays360(startDate, paymentDate);

        return {
          daysWorked,
          periodDescription: `Vacaciones acumuladas desde ${startDate.toISOString().split('T')[0]}`,
        };
      }

      default:
        throw new BadRequestException(`Tipo de prestacion invalido: ${type}`);
    }
  }

  /**
   * Calculate days using the 360-day year convention (30 days per month).
   * This is the standard method for Colombian labor law calculations.
   */
  private calculateDays360(startDate: Date, endDate: Date): number {
    const y1 = startDate.getFullYear();
    const m1 = startDate.getMonth(); // 0-indexed
    const d1 = Math.min(startDate.getDate(), 30);

    const y2 = endDate.getFullYear();
    const m2 = endDate.getMonth();
    const d2 = Math.min(endDate.getDate(), 30);

    const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
    return Math.max(days, 0);
  }

  /**
   * Get accumulated provisions from all closed/approved payroll entries
   * for an employee. These represent provisions already "set aside".
   */
  private async getAccumulatedProvisions(
    tenantId: string,
    employeeId: string,
  ): Promise<{
    prima: number;
    cesantias: number;
    intereses: number;
    vacaciones: number;
    total: number;
  }> {
    const result = await this.prisma.payrollEntry.aggregate({
      where: {
        tenantId,
        employeeId,
        status: { in: ['APPROVED', 'CLOSED'] },
      },
      _sum: {
        provisionPrima: true,
        provisionCesantias: true,
        provisionIntereses: true,
        provisionVacaciones: true,
      },
    });

    const prima = Number(result._sum.provisionPrima ?? 0);
    const cesantias = Number(result._sum.provisionCesantias ?? 0);
    const intereses = Number(result._sum.provisionIntereses ?? 0);
    const vacaciones = Number(result._sum.provisionVacaciones ?? 0);

    return {
      prima,
      cesantias,
      intereses,
      vacaciones,
      total: prima + cesantias + intereses + vacaciones,
    };
  }

  private formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('es-CO')}`;
  }
}
