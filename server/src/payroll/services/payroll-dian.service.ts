import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/services/tenant-context.service';
import { PayrollConfigService } from '../payroll-config.service';
import { PayrollXmlGeneratorService } from './payroll-xml-generator.service';
import { PayrollCuneGeneratorService } from './payroll-cune-generator.service';
import { XmlSignerService } from '../../dian/services/xml-signer.service';
import { DianClientService } from '../../dian/services/dian-client.service';
import {
  PayrollEntryStatus,
  PayrollPeriodStatus,
  PayrollDocumentType,
} from '@prisma/client';

@Injectable()
export class PayrollDianService {
  private readonly logger = new Logger(PayrollDianService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly configService: PayrollConfigService,
    private readonly xmlGenerator: PayrollXmlGeneratorService,
    private readonly cuneGenerator: PayrollCuneGeneratorService,
    private readonly xmlSigner: XmlSignerService,
    private readonly dianClient: DianClientService,
  ) {}

  /**
   * Generate XML and CUNE for a single payroll entry.
   * Does NOT send to DIAN — just generates and stores.
   */
  async generateEntryXml(entryId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const entry = await this.prisma.payrollEntry.findFirst({
      where: { id: entryId, tenantId },
      include: {
        employee: true,
        period: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada de nómina no encontrada');
    }

    if (entry.status !== PayrollEntryStatus.APPROVED) {
      throw new BadRequestException(
        'Solo se pueden generar XMLs para entradas aprobadas',
      );
    }

    const config = await this.configService.getOrFail();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { dianConfig: true },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    if (!tenant.dianConfig) {
      throw new BadRequestException(
        'Se requiere configuración DIAN del tenant para generar nómina electrónica',
      );
    }

    const dianConfig = tenant.dianConfig;

    const { date, time } = this.cuneGenerator.generateTimestamp();
    const ambiente = config.payrollTestSetId ? '2' : '1';

    const isAdjustment = entry.dianDocumentType === PayrollDocumentType.NOMINA_AJUSTE;
    const tipoXML = isAdjustment ? '103' : '102';

    // Generate CUNE
    const cune = this.cuneGenerator.generateCune({
      numNIE: entry.entryNumber,
      fecNIE: date,
      horNIE: time,
      valDev: this.cuneGenerator.formatMoney(Number(entry.totalDevengados)),
      valDed: this.cuneGenerator.formatMoney(Number(entry.totalDeducciones)),
      valTol: this.cuneGenerator.formatMoney(Number(entry.totalNeto)),
      nitNIE: dianConfig.nit,
      docEmp: entry.employee.documentNumber,
      tipoAmb: ambiente,
      softwarePin: config.payrollSoftwarePin ?? '',
      tipoXML,
    });

    // For adjustments, get original entry's CUNE
    let originalCune: string | undefined;
    let originalEntryNumber: string | undefined;
    if (isAdjustment && entry.originalEntryId) {
      const originalEntry = await this.prisma.payrollEntry.findUnique({
        where: { id: entry.originalEntryId },
        select: { cune: true, entryNumber: true },
      });
      originalCune = originalEntry?.cune ?? undefined;
      originalEntryNumber = originalEntry?.entryNumber ?? undefined;
    }

    // Generate XML - use appropriate generator based on document type
    const xmlParams = {
      employer: {
        nit: dianConfig.nit,
        dv: dianConfig.dv,
        razonSocial: dianConfig.businessName,
        paisCode: 'CO',
        departamentoCode: dianConfig.departmentCode,
        municipioCode: dianConfig.cityCode,
        direccion: dianConfig.address,
      },
      employee: {
        tipoDocumento: this.mapDocumentType(entry.employee.documentType),
        numeroDocumento: entry.employee.documentNumber,
        primerApellido: entry.employee.lastName,
        primerNombre: entry.employee.firstName,
        lugarTrabajoCode: 'CO',
        lugarTrabajoDepartamento: entry.employee.departmentCode ?? '11',
        lugarTrabajoMunicipio: entry.employee.cityCode ?? '11001',
        lugarTrabajoDireccion: entry.employee.address ?? '',
        tipoContrato: this.mapContractType(entry.employee.contractType),
        salario: Number(entry.baseSalary),
        codigoTrabajador: entry.employee.id.substring(0, 10),
        tipoTrabajador: '01',
        subTipoTrabajador: '00',
        altoRiesgoPension: ['LEVEL_IV', 'LEVEL_V'].includes(entry.employee.arlRiskLevel),
        fechaIngreso: entry.employee.startDate.toISOString().split('T')[0],
        fechaRetiro: entry.employee.endDate
          ? entry.employee.endDate.toISOString().split('T')[0]
          : undefined,
      },
      entry: {
        entryNumber: entry.entryNumber,
        cune,
        fechaGeneracion: date,
        horaGeneracion: time,
        periodoInicio: entry.period.startDate.toISOString().split('T')[0],
        periodoFin: entry.period.endDate.toISOString().split('T')[0],
        fechaPago: entry.period.paymentDate!.toISOString().split('T')[0],
        tipoMoneda: 'COP',
        daysWorked: Number(entry.daysWorked),
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
        saludEmpleado: Number(entry.saludEmpleado),
        pensionEmpleado: Number(entry.pensionEmpleado),
        fondoSolidaridad: Number(entry.fondoSolidaridad),
        retencionFuente: Number(entry.retencionFuente),
        sindicato: Number(entry.sindicato),
        libranzas: Number(entry.libranzas),
        otrasDeducciones: Number(entry.otrasDeducciones),
        totalDeducciones: Number(entry.totalDeducciones),
        saludEmpleador: Number(entry.saludEmpleador),
        pensionEmpleador: Number(entry.pensionEmpleador),
        arlEmpleador: Number(entry.arlEmpleador),
        cajaEmpleador: Number(entry.cajaEmpleador),
        senaEmpleador: Number(entry.senaEmpleador),
        icbfEmpleador: Number(entry.icbfEmpleador),
        ...(isAdjustment && {
          tipoNota: (entry as any).notes === 'DELETE' ? '2' : '1',
          cuneReferenciadoPred: originalCune,
        }),
      },
      softwareId: config.payrollSoftwareId ?? '',
      softwarePin: config.payrollSoftwarePin ?? '',
      ambiente,
    };

    const xml = isAdjustment
      ? this.xmlGenerator.generateNominaAjusteXml(xmlParams)
      : this.xmlGenerator.generateNominaIndividualXml(xmlParams);

    // Update entry with generated XML and CUNE
    await this.prisma.payrollEntry.update({
      where: { id: entryId },
      data: {
        cune,
        dianDocumentType: isAdjustment
          ? PayrollDocumentType.NOMINA_AJUSTE
          : PayrollDocumentType.NOMINA_INDIVIDUAL,
        xmlContent: xml,
        status: PayrollEntryStatus.APPROVED,
      },
    });

    this.logger.log(`XML generado para entrada ${entry.entryNumber}, CUNE: ${cune.substring(0, 16)}...`);

    return { cune, xml };
  }

  /**
   * Generate XMLs for all approved entries in a period.
   */
  async generatePeriodXmls(periodId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) throw new NotFoundException('Periodo no encontrado');

    if (period.status !== PayrollPeriodStatus.APPROVED) {
      throw new BadRequestException('El periodo debe estar aprobado');
    }

    const entries = await this.prisma.payrollEntry.findMany({
      where: {
        periodId,
        tenantId,
        status: PayrollEntryStatus.APPROVED,
        cune: null,
      },
    });

    const results: { entryId: string; entryNumber: string; cune: string }[] = [];
    for (const entry of entries) {
      const result = await this.generateEntryXml(entry.id);
      results.push({ entryId: entry.id, entryNumber: entry.entryNumber, cune: result.cune });
    }

    this.logger.log(`XMLs generados para periodo ${period.name}: ${results.length} entradas`);
    return { periodId, generated: results.length, entries: results };
  }

  /**
   * Sign XML and send a single payroll entry to DIAN.
   * The entry must already have XML generated (cune + xmlContent).
   */
  async signAndSubmitEntry(entryId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const entry = await this.prisma.payrollEntry.findFirst({
      where: { id: entryId, tenantId },
      include: { employee: true },
    });

    if (!entry) throw new NotFoundException('Entrada de nómina no encontrada');

    if (!entry.xmlContent || !entry.cune) {
      throw new BadRequestException(
        'La entrada no tiene XML generado. Genere el XML primero.',
      );
    }

    if (entry.status === PayrollEntryStatus.SENT || entry.status === PayrollEntryStatus.ACCEPTED) {
      throw new BadRequestException('La entrada ya fue enviada a la DIAN');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { dianConfig: true },
    });

    if (!tenant?.dianConfig) {
      throw new BadRequestException('Se requiere configuración DIAN del tenant');
    }

    const dianConfig = tenant.dianConfig;

    // Sign XML
    let signedXml = entry.xmlContent;
    if (dianConfig.certificateFile && dianConfig.certificatePassword) {
      const cert = this.xmlSigner.loadCertificate(
        Buffer.from(dianConfig.certificateFile),
        dianConfig.certificatePassword,
      );
      signedXml = this.xmlSigner.signXml(
        entry.xmlContent,
        cert.privateKeyPem,
        cert.certDerBase64,
        cert.certDigestBase64,
        cert.issuerName,
        cert.serialNumber,
      );
    } else {
      this.logger.warn('Certificado no configurado — enviando XML sin firma (solo modo prueba)');
    }

    // Update with signed XML
    await this.prisma.payrollEntry.update({
      where: { id: entryId },
      data: { signedXml },
    });

    // Send to DIAN
    const fileName = `nie${entry.entryNumber}.xml`;
    const config = await this.configService.getOrFail();
    const testSetId = config.payrollTestSetId;

    const result = testSetId
      ? await this.dianClient.sendTestSetDocument(dianConfig, signedXml, fileName, testSetId)
      : await this.dianClient.sendDocument(dianConfig, signedXml, fileName);

    // Determine final status
    const finalStatus = result.success
      ? PayrollEntryStatus.ACCEPTED
      : result.isValid === false
        ? PayrollEntryStatus.REJECTED
        : PayrollEntryStatus.SENT;

    await this.prisma.payrollEntry.update({
      where: { id: entryId },
      data: {
        status: finalStatus,
        dianTrackId: result.trackId,
        dianResponse: result as any,
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Entrada ${entry.entryNumber} enviada a DIAN: ${finalStatus} (trackId: ${result.trackId ?? 'N/A'})`,
    );

    return {
      success: result.success,
      entryId,
      entryNumber: entry.entryNumber,
      cune: entry.cune,
      trackId: result.trackId,
      status: finalStatus,
      message: result.success
        ? 'Nómina enviada y aceptada por la DIAN'
        : result.statusDescription || 'Error al enviar la nómina',
      errors: result.errors,
    };
  }

  /**
   * Sign and submit all approved entries in a period to DIAN.
   * Generates XML first for entries without it, then signs and sends.
   */
  async submitPeriod(periodId: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) throw new NotFoundException('Periodo no encontrado');

    if (period.status !== PayrollPeriodStatus.APPROVED) {
      throw new BadRequestException('El periodo debe estar aprobado para enviar a DIAN');
    }

    // Get all approved entries (with or without XML)
    const entries = await this.prisma.payrollEntry.findMany({
      where: {
        periodId,
        tenantId,
        status: PayrollEntryStatus.APPROVED,
      },
    });

    if (entries.length === 0) {
      throw new BadRequestException('No hay entradas aprobadas para enviar');
    }

    // Generate XML for entries that don't have it
    for (const entry of entries) {
      if (!entry.cune || !entry.xmlContent) {
        await this.generateEntryXml(entry.id);
      }
    }

    // Sign and submit each entry
    const results: { entryId: string; entryNumber: string; success: boolean; message: string }[] = [];
    for (const entry of entries) {
      try {
        const result = await this.signAndSubmitEntry(entry.id);
        results.push({
          entryId: entry.id,
          entryNumber: entry.entryNumber,
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        results.push({
          entryId: entry.id,
          entryNumber: entry.entryNumber,
          success: false,
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Update period status if all succeeded
    if (successCount === entries.length) {
      await this.prisma.payrollPeriod.update({
        where: { id: periodId },
        data: { status: PayrollPeriodStatus.SENT_TO_DIAN },
      });
    }

    this.logger.log(
      `Periodo ${period.name}: ${successCount}/${entries.length} entradas enviadas a DIAN`,
    );

    return {
      periodId,
      total: entries.length,
      sent: successCount,
      failed: entries.length - successCount,
      entries: results,
    };
  }

  private mapDocumentType(type: string): string {
    const map: Record<string, string> = {
      CC: '13',
      CE: '22',
      TI: '12',
      NIT: '31',
      PP: '41',
      PEP: '47',
    };
    return map[type] ?? '13';
  }

  private mapContractType(type: string): string {
    const map: Record<string, string> = {
      TERMINO_FIJO: '1',
      TERMINO_INDEFINIDO: '2',
      OBRA_O_LABOR: '3',
      PRESTACION_SERVICIOS: '4',
    };
    return map[type] ?? '2';
  }
}
