import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { CreatePayrollConfigDto } from './dto/payroll-config.dto';

@Injectable()
export class PayrollConfigService {
  private readonly logger = new Logger(PayrollConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getConfig() {
    const tenantId = this.tenantContext.requireTenantId();

    const config = await this.prisma.payrollConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return null;
    }

    return this.mapToResponse(config);
  }

  async createOrUpdate(dto: CreatePayrollConfigDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const config = await this.prisma.payrollConfig.upsert({
      where: { tenantId },
      update: {
        smmlv: dto.smmlv,
        auxilioTransporteVal: dto.auxilioTransporteVal,
        uvtValue: dto.uvtValue,
        defaultPeriodType: dto.defaultPeriodType,
        payrollPrefix: dto.payrollPrefix,
        payrollCurrentNumber: dto.payrollCurrentNumber,
        adjustmentPrefix: dto.adjustmentPrefix,
        adjustmentCurrentNumber: dto.adjustmentCurrentNumber,
        payrollSoftwareId: dto.payrollSoftwareId,
        payrollSoftwarePin: dto.payrollSoftwarePin,
        payrollTestSetId: dto.payrollTestSetId,
      },
      create: {
        tenantId,
        smmlv: dto.smmlv,
        auxilioTransporteVal: dto.auxilioTransporteVal,
        uvtValue: dto.uvtValue,
        defaultPeriodType: dto.defaultPeriodType,
        payrollPrefix: dto.payrollPrefix,
        payrollCurrentNumber: dto.payrollCurrentNumber,
        adjustmentPrefix: dto.adjustmentPrefix,
        adjustmentCurrentNumber: dto.adjustmentCurrentNumber,
        payrollSoftwareId: dto.payrollSoftwareId,
        payrollSoftwarePin: dto.payrollSoftwarePin,
        payrollTestSetId: dto.payrollTestSetId,
      },
    });

    this.logger.log(`Payroll config updated for tenant ${tenantId}`);
    return this.mapToResponse(config);
  }

  async getOrFail() {
    const config = await this.getConfig();
    if (!config) {
      throw new NotFoundException(
        'Configuración de nómina no encontrada. Configure los parámetros anuales primero.',
      );
    }
    return config;
  }

  private mapToResponse(config: any) {
    return {
      id: config.id,
      tenantId: config.tenantId,
      smmlv: Number(config.smmlv),
      auxilioTransporteVal: Number(config.auxilioTransporteVal),
      uvtValue: Number(config.uvtValue),
      defaultPeriodType: config.defaultPeriodType,
      payrollPrefix: config.payrollPrefix,
      payrollCurrentNumber: config.payrollCurrentNumber,
      adjustmentPrefix: config.adjustmentPrefix,
      adjustmentCurrentNumber: config.adjustmentCurrentNumber,
      payrollSoftwareId: config.payrollSoftwareId,
      payrollSoftwarePin: config.payrollSoftwarePin,
      payrollTestSetId: config.payrollTestSetId,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
