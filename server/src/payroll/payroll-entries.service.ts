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
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';
import { PayrollEntryStatus } from '@prisma/client';

@Injectable()
export class PayrollEntriesService {
  private readonly logger = new Logger(PayrollEntriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly calculationService: PayrollCalculationService,
    private readonly configService: PayrollConfigService,
  ) {}

  async findOne(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const entry = await this.prisma.payrollEntry.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            documentNumber: true,
            documentType: true,
            contractType: true,
            salaryType: true,
            arlRiskLevel: true,
            epsName: true,
            afpName: true,
            cajaName: true,
          },
        },
        period: { select: { name: true, startDate: true, endDate: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada de nómina no encontrada');
    }

    return this.mapToDetailResponse(entry);
  }

  async update(id: string, dto: UpdatePayrollEntryDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const entry = await this.prisma.payrollEntry.findFirst({
      where: { id, tenantId },
      include: { employee: true },
    });

    if (!entry) {
      throw new NotFoundException('Entrada de nómina no encontrada');
    }

    if (
      entry.status !== PayrollEntryStatus.DRAFT &&
      entry.status !== PayrollEntryStatus.CALCULATED
    ) {
      throw new BadRequestException(
        `No se puede editar una entrada en estado ${entry.status}`,
      );
    }

    const config = await this.configService.getOrFail();

    const overtime = dto.overtimeDetails ?? (entry.overtimeDetails as any[] ?? []);
    const daysWorked = dto.daysWorked ?? Number(entry.daysWorked);

    const result = this.calculationService.calculatePayrollEntry({
      baseSalary: Number(entry.baseSalary),
      salaryType: entry.employee.salaryType,
      daysWorked,
      arlRiskLevel: entry.employee.arlRiskLevel,
      auxilioTransporte: entry.employee.auxilioTransporte,
      smmlv: config.smmlv,
      auxilioTransporteVal: config.auxilioTransporteVal,
      uvtValue: config.uvtValue,
      overtime,
      bonificaciones: dto.bonificaciones ?? Number(entry.bonificaciones),
      comisiones: dto.comisiones ?? Number(entry.comisiones),
      viaticos: dto.viaticos ?? Number(entry.viaticos),
      incapacidadDias: dto.incapacidadDias ?? 0,
      licenciaDias: dto.licenciaDias ?? 0,
      vacacionesDias: dto.vacacionesDias ?? 0,
      sindicato: dto.sindicato ?? Number(entry.sindicato),
      libranzas: dto.libranzas ?? Number(entry.libranzas),
      otrasDeducciones: dto.otrasDeducciones ?? Number(entry.otrasDeducciones),
      otrosDevengados: dto.otrosDevengados ?? Number(entry.otrosDevengados),
    });

    const updated = await this.prisma.payrollEntry.update({
      where: { id },
      data: {
        status: PayrollEntryStatus.CALCULATED,
        daysWorked,
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
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            documentNumber: true,
            documentType: true,
            contractType: true,
            salaryType: true,
            arlRiskLevel: true,
            epsName: true,
            afpName: true,
            cajaName: true,
          },
        },
        period: { select: { name: true, startDate: true, endDate: true } },
      },
    });

    this.logger.log(`Entrada ${entry.entryNumber} recalculada`);
    return this.mapToDetailResponse(updated);
  }

  private mapToDetailResponse(entry: any) {
    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status,
      periodId: entry.periodId,
      periodName: entry.period?.name ?? null,
      employeeId: entry.employeeId,
      employee: entry.employee
        ? {
            name: `${entry.employee.firstName} ${entry.employee.lastName}`,
            documentNumber: entry.employee.documentNumber,
            documentType: entry.employee.documentType,
            contractType: entry.employee.contractType,
            salaryType: entry.employee.salaryType,
            arlRiskLevel: entry.employee.arlRiskLevel,
            epsName: entry.employee.epsName,
            afpName: entry.employee.afpName,
            cajaName: entry.employee.cajaName,
          }
        : null,
      baseSalary: Number(entry.baseSalary),
      daysWorked: Number(entry.daysWorked),
      // Devengados
      sueldo: Number(entry.sueldo),
      auxilioTransporte: Number(entry.auxilioTransporte),
      horasExtras: Number(entry.horasExtras),
      bonificaciones: Number(entry.bonificaciones),
      comisiones: Number(entry.comisiones),
      viaticos: Number(entry.viaticos),
      incapacidad: Number(entry.incapacidad),
      licencia: Number(entry.licencia),
      vacaciones: Number(entry.vacaciones),
      otrosDevengados: Number(entry.otrosDevengados),
      totalDevengados: Number(entry.totalDevengados),
      // Deducciones
      saludEmpleado: Number(entry.saludEmpleado),
      pensionEmpleado: Number(entry.pensionEmpleado),
      fondoSolidaridad: Number(entry.fondoSolidaridad),
      retencionFuente: Number(entry.retencionFuente),
      sindicato: Number(entry.sindicato),
      libranzas: Number(entry.libranzas),
      otrasDeducciones: Number(entry.otrasDeducciones),
      totalDeducciones: Number(entry.totalDeducciones),
      // Aportes empleador
      saludEmpleador: Number(entry.saludEmpleador),
      pensionEmpleador: Number(entry.pensionEmpleador),
      arlEmpleador: Number(entry.arlEmpleador),
      cajaEmpleador: Number(entry.cajaEmpleador),
      senaEmpleador: Number(entry.senaEmpleador),
      icbfEmpleador: Number(entry.icbfEmpleador),
      // Provisiones
      provisionPrima: Number(entry.provisionPrima),
      provisionCesantias: Number(entry.provisionCesantias),
      provisionIntereses: Number(entry.provisionIntereses),
      provisionVacaciones: Number(entry.provisionVacaciones),
      // Neto
      totalNeto: Number(entry.totalNeto),
      // Overtime details
      overtimeDetails: entry.overtimeDetails,
      // DIAN
      cune: entry.cune,
      dianStatus: entry.dianStatus,
      sentAt: entry.sentAt,
      acceptedAt: entry.acceptedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
