import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/services/tenant-context.service';
import { PayrollEntryStatus } from '@prisma/client';

export interface IncomeCertificateData {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    city: string | null;
    department: string | null;
    startDate: Date;
    endDate: Date | null;
  };
  employer: {
    name: string;
    nit: string;
    address: string | null;
    city: string | null;
  };
  year: number;
  periodsCount: number;
  totals: {
    sueldo: number;
    auxilioTransporte: number;
    horasExtras: number;
    bonificaciones: number;
    comisiones: number;
    viaticos: number;
    otrosDevengados: number;
    totalDevengados: number;
    saludEmpleado: number;
    pensionEmpleado: number;
    fondoSolidaridad: number;
    retencionFuente: number;
    sindicato: number;
    libranzas: number;
    otrasDeducciones: number;
    totalDeducciones: number;
    totalNeto: number;
    // Employer contributions (informational)
    saludEmpleador: number;
    pensionEmpleador: number;
    arlEmpleador: number;
    cajaEmpleador: number;
    senaEmpleador: number;
    icbfEmpleador: number;
  };
}

export interface PayrollPeriodSummary {
  periodId: string;
  periodName: string;
  startDate: Date;
  endDate: Date;
  status: string;
  employeeCount: number;
  totalDevengados: number;
  totalDeducciones: number;
  totalNeto: number;
  deductionBreakdown: {
    saludEmpleado: number;
    pensionEmpleado: number;
    fondoSolidaridad: number;
    retencionFuente: number;
    sindicato: number;
    libranzas: number;
    otrasDeducciones: number;
  };
  employerContributions: {
    saludEmpleador: number;
    pensionEmpleador: number;
    arlEmpleador: number;
    cajaEmpleador: number;
    senaEmpleador: number;
    icbfEmpleador: number;
    total: number;
  };
}

@Injectable()
export class PayrollReportsService {
  private readonly logger = new Logger(PayrollReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Generate Certificado de Ingresos y Retenciones for an employee in a given year.
   * Aggregates all approved/sent/accepted payroll entries for the year.
   */
  async getIncomeCertificate(
    employeeId: string,
    year: number,
  ): Promise<IncomeCertificateData> {
    const tenantId = this.tenantContext.requireTenantId();

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { dianConfig: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Get all payroll entries for the employee in the given year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const entries = await this.prisma.payrollEntry.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: [
            PayrollEntryStatus.APPROVED,
            PayrollEntryStatus.SENT,
            PayrollEntryStatus.ACCEPTED,
          ],
        },
        period: {
          startDate: { gte: yearStart },
          endDate: { lt: yearEnd },
        },
      },
      include: {
        period: { select: { startDate: true, endDate: true } },
      },
    });

    // Aggregate totals
    const totals = {
      sueldo: 0,
      auxilioTransporte: 0,
      horasExtras: 0,
      bonificaciones: 0,
      comisiones: 0,
      viaticos: 0,
      otrosDevengados: 0,
      totalDevengados: 0,
      saludEmpleado: 0,
      pensionEmpleado: 0,
      fondoSolidaridad: 0,
      retencionFuente: 0,
      sindicato: 0,
      libranzas: 0,
      otrasDeducciones: 0,
      totalDeducciones: 0,
      totalNeto: 0,
      saludEmpleador: 0,
      pensionEmpleador: 0,
      arlEmpleador: 0,
      cajaEmpleador: 0,
      senaEmpleador: 0,
      icbfEmpleador: 0,
    };

    for (const entry of entries) {
      totals.sueldo += Number(entry.sueldo);
      totals.auxilioTransporte += Number(entry.auxilioTransporte);
      totals.horasExtras += Number(entry.horasExtras);
      totals.bonificaciones += Number(entry.bonificaciones);
      totals.comisiones += Number(entry.comisiones);
      totals.viaticos += Number(entry.viaticos);
      totals.otrosDevengados += Number(entry.otrosDevengados);
      totals.totalDevengados += Number(entry.totalDevengados);
      totals.saludEmpleado += Number(entry.saludEmpleado);
      totals.pensionEmpleado += Number(entry.pensionEmpleado);
      totals.fondoSolidaridad += Number(entry.fondoSolidaridad);
      totals.retencionFuente += Number(entry.retencionFuente);
      totals.sindicato += Number(entry.sindicato);
      totals.libranzas += Number(entry.libranzas);
      totals.otrasDeducciones += Number(entry.otrasDeducciones);
      totals.totalDeducciones += Number(entry.totalDeducciones);
      totals.totalNeto += Number(entry.totalNeto);
      totals.saludEmpleador += Number(entry.saludEmpleador);
      totals.pensionEmpleador += Number(entry.pensionEmpleador);
      totals.arlEmpleador += Number(entry.arlEmpleador);
      totals.cajaEmpleador += Number(entry.cajaEmpleador);
      totals.senaEmpleador += Number(entry.senaEmpleador);
      totals.icbfEmpleador += Number(entry.icbfEmpleador);
    }

    // Round all totals to 2 decimal places
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
      totals[key] = Math.round(totals[key] * 100) / 100;
    }

    // Count unique periods
    const uniquePeriods = new Set(entries.map((e) => e.periodId));

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        documentType: employee.documentType,
        documentNumber: employee.documentNumber,
        city: employee.city,
        department: employee.department,
        startDate: employee.startDate,
        endDate: employee.endDate,
      },
      employer: {
        name: tenant.dianConfig?.businessName ?? tenant.name,
        nit: tenant.dianConfig?.nit ?? '',
        address: tenant.dianConfig?.address ?? null,
        city: tenant.dianConfig?.cityCode ?? null,
      },
      year,
      periodsCount: uniquePeriods.size,
      totals,
    };
  }

  /**
   * Get payroll summary report for a period.
   * Returns aggregated totals with breakdown by deduction type.
   */
  async getPeriodSummary(periodId: string): Promise<PayrollPeriodSummary> {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) {
      throw new NotFoundException('Periodo no encontrado');
    }

    const entries = await this.prisma.payrollEntry.findMany({
      where: {
        periodId,
        tenantId,
        status: {
          in: [
            PayrollEntryStatus.CALCULATED,
            PayrollEntryStatus.APPROVED,
            PayrollEntryStatus.SENT,
            PayrollEntryStatus.ACCEPTED,
          ],
        },
      },
    });

    const deductionBreakdown = {
      saludEmpleado: 0,
      pensionEmpleado: 0,
      fondoSolidaridad: 0,
      retencionFuente: 0,
      sindicato: 0,
      libranzas: 0,
      otrasDeducciones: 0,
    };

    const employerContributions = {
      saludEmpleador: 0,
      pensionEmpleador: 0,
      arlEmpleador: 0,
      cajaEmpleador: 0,
      senaEmpleador: 0,
      icbfEmpleador: 0,
      total: 0,
    };

    let totalDevengados = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;

    for (const entry of entries) {
      totalDevengados += Number(entry.totalDevengados);
      totalDeducciones += Number(entry.totalDeducciones);
      totalNeto += Number(entry.totalNeto);

      deductionBreakdown.saludEmpleado += Number(entry.saludEmpleado);
      deductionBreakdown.pensionEmpleado += Number(entry.pensionEmpleado);
      deductionBreakdown.fondoSolidaridad += Number(entry.fondoSolidaridad);
      deductionBreakdown.retencionFuente += Number(entry.retencionFuente);
      deductionBreakdown.sindicato += Number(entry.sindicato);
      deductionBreakdown.libranzas += Number(entry.libranzas);
      deductionBreakdown.otrasDeducciones += Number(entry.otrasDeducciones);

      employerContributions.saludEmpleador += Number(entry.saludEmpleador);
      employerContributions.pensionEmpleador += Number(entry.pensionEmpleador);
      employerContributions.arlEmpleador += Number(entry.arlEmpleador);
      employerContributions.cajaEmpleador += Number(entry.cajaEmpleador);
      employerContributions.senaEmpleador += Number(entry.senaEmpleador);
      employerContributions.icbfEmpleador += Number(entry.icbfEmpleador);
    }

    employerContributions.total =
      employerContributions.saludEmpleador +
      employerContributions.pensionEmpleador +
      employerContributions.arlEmpleador +
      employerContributions.cajaEmpleador +
      employerContributions.senaEmpleador +
      employerContributions.icbfEmpleador;

    return {
      periodId: period.id,
      periodName: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
      employeeCount: entries.length,
      totalDevengados: Math.round(totalDevengados * 100) / 100,
      totalDeducciones: Math.round(totalDeducciones * 100) / 100,
      totalNeto: Math.round(totalNeto * 100) / 100,
      deductionBreakdown,
      employerContributions,
    };
  }

  /**
   * Get year-to-date payroll report for a specific employee.
   * Returns monthly breakdown of earnings, deductions, and net pay.
   */
  async getEmployeeYtdReport(
    employeeId: string,
    year: number,
  ): Promise<{
    employeeId: string;
    employeeName: string;
    year: number;
    months: {
      month: number;
      periodName: string;
      devengados: number;
      deducciones: number;
      neto: number;
    }[];
    yearTotal: { devengados: number; deducciones: number; neto: number };
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const entries = await this.prisma.payrollEntry.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: [
            PayrollEntryStatus.APPROVED,
            PayrollEntryStatus.SENT,
            PayrollEntryStatus.ACCEPTED,
          ],
        },
        period: {
          startDate: { gte: yearStart },
          endDate: { lt: yearEnd },
        },
      },
      include: {
        period: { select: { name: true, startDate: true } },
      },
      orderBy: { period: { startDate: 'asc' } },
    });

    const months = entries.map((entry) => ({
      month: entry.period.startDate.getMonth() + 1,
      periodName: entry.period.name,
      devengados: Number(entry.totalDevengados),
      deducciones: Number(entry.totalDeducciones),
      neto: Number(entry.totalNeto),
    }));

    const yearTotal = months.reduce(
      (acc, m) => ({
        devengados: acc.devengados + m.devengados,
        deducciones: acc.deducciones + m.deducciones,
        neto: acc.neto + m.neto,
      }),
      { devengados: 0, deducciones: 0, neto: 0 },
    );

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      year,
      months,
      yearTotal: {
        devengados: Math.round(yearTotal.devengados * 100) / 100,
        deducciones: Math.round(yearTotal.deducciones * 100) / 100,
        neto: Math.round(yearTotal.neto * 100) / 100,
      },
    };
  }

  /**
   * Dashboard with aggregated payroll metrics for the year.
   */
  async getDashboard(year: number) {
    const tenantId = this.tenantContext.requireTenantId();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    // Get all periods for the year with entry counts
    const periods = await this.prisma.payrollPeriod.findMany({
      where: {
        tenantId,
        startDate: { gte: startDate },
        endDate: { lt: endDate },
      },
      orderBy: { startDate: 'desc' },
    });

    // Active employees count
    const activeEmployees = await this.prisma.employee.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId },
    });

    // Aggregate totals from approved/closed periods using pre-calculated fields
    let totalEarnings = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let approvedPeriods = 0;

    const monthlyTotals: {
      month: number;
      earnings: number;
      deductions: number;
      netPay: number;
    }[] = [];

    for (const period of periods) {
      const month = period.startDate.getMonth();
      const monthEarnings = Number(period.totalDevengados) || 0;
      const monthDeductions = Number(period.totalDeducciones) || 0;
      const monthNetPay = Number(period.totalNeto) || 0;

      if (period.status === 'APPROVED' || period.status === 'CLOSED') {
        totalEarnings += monthEarnings;
        totalDeductions += monthDeductions;
        totalNetPay += monthNetPay;
        approvedPeriods++;
      }

      monthlyTotals.push({
        month,
        earnings: Math.round(monthEarnings * 100) / 100,
        deductions: Math.round(monthDeductions * 100) / 100,
        netPay: Math.round(monthNetPay * 100) / 100,
      });
    }

    // Recent periods summary
    const recentPeriods = periods.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      entriesCount: p.employeeCount,
    }));

    return {
      year,
      activeEmployees,
      totalEmployees,
      periodsCount: periods.length,
      approvedPeriods,
      totals: {
        earnings: Math.round(totalEarnings * 100) / 100,
        deductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(totalNetPay * 100) / 100,
      },
      averagePayroll:
        approvedPeriods > 0
          ? Math.round((totalNetPay / approvedPeriods) * 100) / 100
          : 0,
      monthlyTotals,
      recentPeriods,
    };
  }
}
