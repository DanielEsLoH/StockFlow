import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollConfigService } from './payroll-config.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import {
  PayrollPeriodStatus,
  PayrollEntryStatus,
  EmployeeStatus,
  SalaryType,
} from '@prisma/client';

@Injectable()
export class PayrollPeriodsService {
  private readonly logger = new Logger(PayrollPeriodsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly calculationService: PayrollCalculationService,
    private readonly configService: PayrollConfigService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    const [periods, total] = await Promise.all([
      this.prisma.payrollPeriod.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { entries: true } } },
      }),
      this.prisma.payrollPeriod.count({ where: { tenantId } }),
    ]);

    return {
      data: periods.map((p) => this.mapPeriodToResponse(p)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
      include: {
        entries: {
          include: { employee: { select: { firstName: true, lastName: true, documentNumber: true } } },
          orderBy: { employee: { lastName: 'asc' } },
        },
        _count: { select: { entries: true } },
      },
    });

    if (!period) {
      throw new NotFoundException('Periodo de nómina no encontrado');
    }

    return this.mapPeriodDetailToResponse(period);
  }

  async create(dto: CreatePayrollPeriodDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha fin debe ser posterior a la fecha inicio');
    }

    // Check for overlapping periods
    const overlap = await this.prisma.payrollPeriod.findFirst({
      where: {
        tenantId,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlap) {
      throw new BadRequestException(
        `Ya existe un periodo que se traslapa: ${overlap.name}`,
      );
    }

    const period = await this.prisma.payrollPeriod.create({
      data: {
        tenantId,
        name: dto.name,
        periodType: dto.periodType,
        startDate,
        endDate,
        paymentDate: new Date(dto.paymentDate),
        notes: dto.notes,
      },
    });

    this.logger.log(`Periodo creado: ${period.name}`);
    return this.mapPeriodToResponse(period);
  }

  async calculatePeriod(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
    });

    if (!period) {
      throw new NotFoundException('Periodo no encontrado');
    }

    if (
      period.status !== PayrollPeriodStatus.OPEN &&
      period.status !== PayrollPeriodStatus.CALCULATED
    ) {
      throw new BadRequestException(
        `No se puede calcular un periodo en estado ${period.status}`,
      );
    }

    const config = await this.configService.getOrFail();
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: EmployeeStatus.ACTIVE },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No hay empleados activos para calcular');
    }

    // Calculate days in period
    const periodDays = this.calculatePeriodDays(period.startDate, period.endDate);

    let totalDevengados = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const employee of employees) {
        const baseSalary = Number(employee.baseSalary);
        const isIntegral = employee.salaryType === SalaryType.INTEGRAL;

        // Check if entry already exists (for recalculation)
        const existingEntry = await tx.payrollEntry.findFirst({
          where: { tenantId, periodId: id, employeeId: employee.id },
        });

        // Get overtime and adjustments from existing entry if any
        const overtime = existingEntry?.overtimeDetails
          ? (existingEntry.overtimeDetails as any[])
          : [];

        const result = this.calculationService.calculatePayrollEntry({
          baseSalary,
          salaryType: employee.salaryType,
          daysWorked: existingEntry ? Number(existingEntry.daysWorked) : periodDays,
          arlRiskLevel: employee.arlRiskLevel,
          auxilioTransporte: employee.auxilioTransporte,
          smmlv: config.smmlv,
          auxilioTransporteVal: config.auxilioTransporteVal,
          uvtValue: config.uvtValue,
          overtime,
          bonificaciones: existingEntry ? Number(existingEntry.bonificaciones) : 0,
          comisiones: existingEntry ? Number(existingEntry.comisiones) : 0,
          viaticos: existingEntry ? Number(existingEntry.viaticos) : 0,
          incapacidadDias: 0,
          licenciaDias: 0,
          vacacionesDias: 0,
          sindicato: existingEntry ? Number(existingEntry.sindicato) : 0,
          libranzas: existingEntry ? Number(existingEntry.libranzas) : 0,
          otrasDeducciones: existingEntry ? Number(existingEntry.otrasDeducciones) : 0,
          otrosDevengados: existingEntry ? Number(existingEntry.otrosDevengados) : 0,
        });

        const entryNumber = existingEntry?.entryNumber ?? await this.getNextEntryNumber(tx, tenantId);

        const entryData = {
          tenantId,
          periodId: id,
          employeeId: employee.id,
          entryNumber,
          status: PayrollEntryStatus.CALCULATED,
          baseSalary: baseSalary,
          salaryType: employee.salaryType,
          daysWorked: existingEntry ? Number(existingEntry.daysWorked) : periodDays,
          sueldo: result.sueldo,
          auxilioTransporte: result.auxilioTransporte,
          horasExtras: result.horasExtras,
          bonificaciones: result.bonificaciones,
          comisiones: result.comisiones,
          viaticos: result.viaticos,
          incapacidad: result.incapacidad,
          licencia: result.licencia,
          vacaciones: result.vacaciones,
          otrosDevengados: result.otrosDevengados,
          totalDevengados: result.totalDevengados,
          saludEmpleado: result.saludEmpleado,
          pensionEmpleado: result.pensionEmpleado,
          fondoSolidaridad: result.fondoSolidaridad,
          retencionFuente: result.retencionFuente,
          sindicato: result.sindicato,
          libranzas: result.libranzas,
          otrasDeducciones: result.otrasDeducciones,
          totalDeducciones: result.totalDeducciones,
          saludEmpleador: result.saludEmpleador,
          pensionEmpleador: result.pensionEmpleador,
          arlEmpleador: result.arlEmpleador,
          cajaEmpleador: result.cajaEmpleador,
          senaEmpleador: result.senaEmpleador,
          icbfEmpleador: result.icbfEmpleador,
          provisionPrima: result.provisionPrima,
          provisionCesantias: result.provisionCesantias,
          provisionIntereses: result.provisionIntereses,
          provisionVacaciones: result.provisionVacaciones,
          totalNeto: result.totalNeto,
          overtimeDetails: overtime,
        };

        if (existingEntry) {
          await tx.payrollEntry.update({
            where: { id: existingEntry.id },
            data: entryData,
          });
        } else {
          await tx.payrollEntry.create({ data: entryData });
        }

        totalDevengados += result.totalDevengados;
        totalDeducciones += result.totalDeducciones;
        totalNeto += result.totalNeto;
      }

      // Update period totals
      await tx.payrollPeriod.update({
        where: { id },
        data: {
          status: PayrollPeriodStatus.CALCULATED,
          totalDevengados: Math.round(totalDevengados),
          totalDeducciones: Math.round(totalDeducciones),
          totalNeto: Math.round(totalNeto),
          employeeCount: employees.length,
        },
      });
    });

    this.logger.log(
      `Periodo ${period.name} calculado: ${employees.length} empleados`,
    );

    return this.findOne(id);
  }

  async approvePeriod(id: string, userId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
      include: { entries: true },
    });

    if (!period) {
      throw new NotFoundException('Periodo no encontrado');
    }

    if (period.status !== PayrollPeriodStatus.CALCULATED) {
      throw new BadRequestException(
        'Solo se pueden aprobar periodos en estado CALCULATED',
      );
    }

    const uncalculated = period.entries.filter(
      (e) => e.status !== PayrollEntryStatus.CALCULATED,
    );
    if (uncalculated.length > 0) {
      throw new BadRequestException(
        `Hay ${uncalculated.length} entradas sin calcular`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Update all entries to APPROVED
      await tx.payrollEntry.updateMany({
        where: { periodId: id, tenantId },
        data: { status: PayrollEntryStatus.APPROVED },
      });

      // Update period
      await tx.payrollPeriod.update({
        where: { id },
        data: {
          status: PayrollPeriodStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: userId,
        },
      });
    });

    this.logger.log(`Periodo ${period.name} aprobado por ${userId}`);
    return this.findOne(id);
  }

  async closePeriod(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
    });

    if (!period) {
      throw new NotFoundException('Periodo no encontrado');
    }

    if (
      period.status !== PayrollPeriodStatus.APPROVED &&
      period.status !== PayrollPeriodStatus.SENT_TO_DIAN
    ) {
      throw new BadRequestException(
        'Solo se pueden cerrar periodos aprobados o enviados a DIAN',
      );
    }

    await this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: PayrollPeriodStatus.CLOSED },
    });

    this.logger.log(`Periodo ${period.name} cerrado`);
    return this.findOne(id);
  }

  private calculatePeriodDays(startDate: Date, endDate: Date): number {
    // For payroll, a month = 30 days
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(diffDays, 30);
  }

  private async getNextEntryNumber(tx: any, tenantId: string): Promise<string> {
    const lastEntry = await tx.payrollEntry.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { entryNumber: true },
    });

    if (!lastEntry) return 'NOM-000001';

    const match = lastEntry.entryNumber.match(/(\d+)$/);
    if (!match) return 'NOM-000001';

    const nextNum = parseInt(match[1], 10) + 1;
    return `NOM-${String(nextNum).padStart(6, '0')}`;
  }

  private mapPeriodToResponse(period: any) {
    return {
      id: period.id,
      tenantId: period.tenantId,
      name: period.name,
      periodType: period.periodType,
      startDate: period.startDate,
      endDate: period.endDate,
      paymentDate: period.paymentDate,
      status: period.status,
      totalDevengados: Number(period.totalDevengados),
      totalDeducciones: Number(period.totalDeducciones),
      totalNeto: Number(period.totalNeto),
      employeeCount: period.employeeCount,
      approvedAt: period.approvedAt,
      approvedById: period.approvedById,
      notes: period.notes,
      entryCount: period._count?.entries ?? 0,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }

  private mapPeriodDetailToResponse(period: any) {
    return {
      ...this.mapPeriodToResponse(period),
      entries: period.entries?.map((e: any) => ({
        id: e.id,
        entryNumber: e.entryNumber,
        status: e.status,
        employeeId: e.employeeId,
        employeeName: e.employee
          ? `${e.employee.firstName} ${e.employee.lastName}`
          : null,
        employeeDocument: e.employee?.documentNumber ?? null,
        baseSalary: Number(e.baseSalary),
        daysWorked: Number(e.daysWorked),
        totalDevengados: Number(e.totalDevengados),
        totalDeducciones: Number(e.totalDeducciones),
        totalNeto: Number(e.totalNeto),
      })) ?? [],
    };
  }
}
