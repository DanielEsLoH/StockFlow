import { Injectable, Logger } from '@nestjs/common';

/**
 * XML Generator for Colombian Electronic Payroll (Nómina Electrónica).
 * Based on DIAN Anexo Técnico V1.0 - Resolución 000013 de 2021.
 */

export interface PayrollXmlEmployer {
  nit: string;
  dv: string;
  razonSocial: string;
  primerApellido?: string;
  primerNombre?: string;
  paisCode: string;
  departamentoCode: string;
  municipioCode: string;
  direccion: string;
}

export interface PayrollXmlEmployee {
  tipoDocumento: string;
  numeroDocumento: string;
  primerApellido: string;
  segundoApellido?: string;
  primerNombre: string;
  otrosNombres?: string;
  lugarTrabajoCode: string;
  lugarTrabajoDepartamento: string;
  lugarTrabajoMunicipio: string;
  lugarTrabajoDireccion: string;
  tipoContrato: string;
  salario: number;
  codigoTrabajador: string;
  tipoTrabajador: string;
  subTipoTrabajador: string;
  altoRiesgoPension: boolean;
  fechaIngreso: string;
  fechaRetiro?: string;
}

export interface PayrollXmlEntry {
  entryNumber: string;
  cune: string;
  fechaGeneracion: string;
  horaGeneracion: string;
  periodoInicio: string;
  periodoFin: string;
  fechaPago: string;
  tipoMoneda: string;
  tipoNota?: string;
  cuneReferenciadoPred?: string;
  // Devengados
  daysWorked: number;
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
  // Aportes
  saludEmpleador: number;
  pensionEmpleador: number;
  arlEmpleador: number;
  cajaEmpleador: number;
  senaEmpleador: number;
  icbfEmpleador: number;
}

export interface PayrollXmlParams {
  employer: PayrollXmlEmployer;
  employee: PayrollXmlEmployee;
  entry: PayrollXmlEntry;
  softwareId: string;
  softwarePin: string;
  ambiente: string;
}

@Injectable()
export class PayrollXmlGeneratorService {
  private readonly logger = new Logger(PayrollXmlGeneratorService.name);

  /**
   * Generate Nómina Individual XML per DIAN Anexo Técnico V1.0.
   */
  generateNominaIndividualXml(params: PayrollXmlParams): string {
    const { employer, employee, entry, softwareId, ambiente } = params;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  SchemaLocation=""
  xs:schemaLocation="dian:gov:co:facturaelectronica:NominaIndividual NominaIndividualElectronicaXSD.xsd">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <Ambiente>${this.esc(ambiente)}</Ambiente>
  <TipoXML>102</TipoXML>
  <CUNE>${this.esc(entry.cune)}</CUNE>
  <NumeroDocumento>${this.esc(entry.entryNumber)}</NumeroDocumento>
  <FechaGen>${this.esc(entry.fechaGeneracion)}</FechaGen>
  <HoraGen>${this.esc(entry.horaGeneracion)}</HoraGen>
  <PeriodoNomina FechaIngreso="${this.esc(employee.fechaIngreso)}"${employee.fechaRetiro ? ` FechaRetiro="${this.esc(employee.fechaRetiro)}"` : ''} FechaLiquidacionInicio="${this.esc(entry.periodoInicio)}" FechaLiquidacionFin="${this.esc(entry.periodoFin)}" TiempoLaborado="${entry.daysWorked}" FechaPago="${this.esc(entry.fechaPago)}"/>
  <Moneda>${this.esc(entry.tipoMoneda)}</Moneda>
  <Empleador NIT="${this.esc(employer.nit)}" DV="${this.esc(employer.dv)}" RazonSocial="${this.esc(employer.razonSocial)}" Pais="${this.esc(employer.paisCode)}" DepartamentoEstado="${this.esc(employer.departamentoCode)}" MunicipioCiudad="${this.esc(employer.municipioCode)}" Direccion="${this.esc(employer.direccion)}"/>
  <Trabajador TipoDocumento="${this.esc(employee.tipoDocumento)}" NumeroDocumento="${this.esc(employee.numeroDocumento)}" PrimerApellido="${this.esc(employee.primerApellido)}"${employee.segundoApellido ? ` SegundoApellido="${this.esc(employee.segundoApellido)}"` : ''} PrimerNombre="${this.esc(employee.primerNombre)}"${employee.otrosNombres ? ` OtrosNombres="${this.esc(employee.otrosNombres)}"` : ''} LugarTrabajoPais="${this.esc(employee.lugarTrabajoCode)}" LugarTrabajoDepartamentoEstado="${this.esc(employee.lugarTrabajoDepartamento)}" LugarTrabajoMunicipioCiudad="${this.esc(employee.lugarTrabajoMunicipio)}" LugarTrabajoDireccion="${this.esc(employee.lugarTrabajoDireccion)}" TipoContrato="${this.esc(employee.tipoContrato)}" Sueldo="${this.money(employee.salario)}" CodigoTrabajador="${this.esc(employee.codigoTrabajador)}" TipoTrabajador="${this.esc(employee.tipoTrabajador)}" SubTipoTrabajador="${this.esc(employee.subTipoTrabajador)}" AltoRiesgoPension="${employee.altoRiesgoPension ? 'true' : 'false'}" FechaIngreso="${this.esc(employee.fechaIngreso)}"${employee.fechaRetiro ? ` FechaRetiro="${this.esc(employee.fechaRetiro)}"` : ''}/>
  <Pago Forma="1" Metodo="1"/>
  <Devengados>
    <Basico DiasTrabajados="${entry.daysWorked}" SueldoTrabajado="${this.money(entry.sueldo)}"/>
${entry.auxilioTransporte > 0 ? `    <Transporte AuxilioTransporte="${this.money(entry.auxilioTransporte)}"/>` : ''}
${entry.horasExtras > 0 ? `    <HorasExtras>${this.money(entry.horasExtras)}</HorasExtras>` : ''}
${entry.bonificaciones > 0 ? `    <Bonificaciones>${this.money(entry.bonificaciones)}</Bonificaciones>` : ''}
${entry.comisiones > 0 ? `    <Comisiones>${this.money(entry.comisiones)}</Comisiones>` : ''}
${entry.viaticos > 0 ? `    <Viaticos>${this.money(entry.viaticos)}</Viaticos>` : ''}
${entry.incapacidad > 0 ? `    <Incapacidades>${this.money(entry.incapacidad)}</Incapacidades>` : ''}
${entry.licencia > 0 ? `    <Licencias>${this.money(entry.licencia)}</Licencias>` : ''}
${entry.vacaciones > 0 ? `    <Vacaciones>${this.money(entry.vacaciones)}</Vacaciones>` : ''}
${entry.otrosDevengados > 0 ? `    <OtrosConceptos>${this.money(entry.otrosDevengados)}</OtrosConceptos>` : ''}
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="${this.money(entry.saludEmpleado)}"/>
    <FondoPension Porcentaje="4.00" Deduccion="${this.money(entry.pensionEmpleado)}"/>
${entry.fondoSolidaridad > 0 ? `    <FondoSP Porcentaje="1.00" DeduccionSP="${this.money(entry.fondoSolidaridad)}"/>` : ''}
${entry.retencionFuente > 0 ? `    <RetencionFuente>${this.money(entry.retencionFuente)}</RetencionFuente>` : ''}
${entry.sindicato > 0 ? `    <Sindicatos>${this.money(entry.sindicato)}</Sindicatos>` : ''}
${entry.libranzas > 0 ? `    <Libranzas>${this.money(entry.libranzas)}</Libranzas>` : ''}
${entry.otrasDeducciones > 0 ? `    <OtrasDeducciones>${this.money(entry.otrasDeducciones)}</OtrasDeducciones>` : ''}
  </Deducciones>
  <DevengadosTotal>${this.money(entry.totalDevengados)}</DevengadosTotal>
  <DeduccionesTotal>${this.money(entry.totalDeducciones)}</DeduccionesTotal>
  <ComprobanteTotal>${this.money(entry.totalDevengados - entry.totalDeducciones)}</ComprobanteTotal>
  <InformacionGeneral Version="V1.0: Documento Soporte de Pago de Nomina Electronica" Ambiente="${this.esc(ambiente)}" SoftwareID="${this.esc(softwareId)}" CUNE="${this.esc(entry.cune)}"/>
</NominaIndividual>`;

    // Clean up empty lines from conditional elements
    return xml.replace(/^\s*\n/gm, '');
  }

  /**
   * Generate Nómina de Ajuste XML.
   */
  generateNominaAjusteXml(params: PayrollXmlParams): string {
    const { employer, employee, entry, softwareId, ambiente } = params;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividualDeAjuste xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  SchemaLocation="">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <Ambiente>${this.esc(ambiente)}</Ambiente>
  <TipoXML>103</TipoXML>
  <CUNE>${this.esc(entry.cune)}</CUNE>
  <TipoNota>${this.esc(entry.tipoNota ?? '2')}</TipoNota>
  <Predecesor NumeroPred="${this.esc(entry.entryNumber)}" CUNEPred="${this.esc(entry.cuneReferenciadoPred ?? '')}" FechaGenPred="${this.esc(entry.fechaGeneracion)}"/>
  <NumeroDocumento>${this.esc(entry.entryNumber)}</NumeroDocumento>
  <FechaGen>${this.esc(entry.fechaGeneracion)}</FechaGen>
  <HoraGen>${this.esc(entry.horaGeneracion)}</HoraGen>
  <PeriodoNomina FechaIngreso="${this.esc(employee.fechaIngreso)}" FechaLiquidacionInicio="${this.esc(entry.periodoInicio)}" FechaLiquidacionFin="${this.esc(entry.periodoFin)}" TiempoLaborado="${entry.daysWorked}" FechaPago="${this.esc(entry.fechaPago)}"/>
  <Moneda>${this.esc(entry.tipoMoneda)}</Moneda>
  <Empleador NIT="${this.esc(employer.nit)}" DV="${this.esc(employer.dv)}" RazonSocial="${this.esc(employer.razonSocial)}" Pais="${this.esc(employer.paisCode)}" DepartamentoEstado="${this.esc(employer.departamentoCode)}" MunicipioCiudad="${this.esc(employer.municipioCode)}" Direccion="${this.esc(employer.direccion)}"/>
  <Trabajador TipoDocumento="${this.esc(employee.tipoDocumento)}" NumeroDocumento="${this.esc(employee.numeroDocumento)}" PrimerApellido="${this.esc(employee.primerApellido)}" PrimerNombre="${this.esc(employee.primerNombre)}" LugarTrabajoPais="${this.esc(employee.lugarTrabajoCode)}" LugarTrabajoDepartamentoEstado="${this.esc(employee.lugarTrabajoDepartamento)}" LugarTrabajoMunicipioCiudad="${this.esc(employee.lugarTrabajoMunicipio)}" LugarTrabajoDireccion="${this.esc(employee.lugarTrabajoDireccion)}" TipoContrato="${this.esc(employee.tipoContrato)}" Sueldo="${this.money(employee.salario)}" CodigoTrabajador="${this.esc(employee.codigoTrabajador)}" TipoTrabajador="${this.esc(employee.tipoTrabajador)}" SubTipoTrabajador="${this.esc(employee.subTipoTrabajador)}" AltoRiesgoPension="${employee.altoRiesgoPension ? 'true' : 'false'}" FechaIngreso="${this.esc(employee.fechaIngreso)}"/>
  <Pago Forma="1" Metodo="1"/>
  <Devengados>
    <Basico DiasTrabajados="${entry.daysWorked}" SueldoTrabajado="${this.money(entry.sueldo)}"/>
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="${this.money(entry.saludEmpleado)}"/>
    <FondoPension Porcentaje="4.00" Deduccion="${this.money(entry.pensionEmpleado)}"/>
  </Deducciones>
  <DevengadosTotal>${this.money(entry.totalDevengados)}</DevengadosTotal>
  <DeduccionesTotal>${this.money(entry.totalDeducciones)}</DeduccionesTotal>
  <ComprobanteTotal>${this.money(entry.totalDevengados - entry.totalDeducciones)}</ComprobanteTotal>
  <InformacionGeneral Version="V1.0: Nota de Ajuste de Documento Soporte de Pago de Nomina Electronica" Ambiente="${this.esc(ambiente)}" SoftwareID="${this.esc(softwareId)}" CUNE="${this.esc(entry.cune)}"/>
</NominaIndividualDeAjuste>`;

    return xml.replace(/^\s*\n/gm, '');
  }

  /** Escape XML special characters */
  private esc(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /** Format number for XML monetary values */
  private money(value: number): string {
    return value.toFixed(2);
  }
}
