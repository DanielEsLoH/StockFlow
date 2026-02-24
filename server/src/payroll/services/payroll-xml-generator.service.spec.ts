import { Test, TestingModule } from '@nestjs/testing';
import {
  PayrollXmlGeneratorService,
  PayrollXmlParams,
} from './payroll-xml-generator.service';

const sampleParams: PayrollXmlParams = {
  employer: {
    nit: '900123456',
    dv: '7',
    razonSocial: 'Test Company SAS',
    paisCode: 'CO',
    departamentoCode: '11',
    municipioCode: '11001',
    direccion: 'Calle 1 #2-3',
  },
  employee: {
    tipoDocumento: '13',
    numeroDocumento: '1234567890',
    primerApellido: 'Pérez',
    primerNombre: 'Juan',
    lugarTrabajoCode: 'CO',
    lugarTrabajoDepartamento: '11',
    lugarTrabajoMunicipio: '11001',
    lugarTrabajoDireccion: 'Calle 4 #5-6',
    tipoContrato: '2',
    salario: 1_423_500,
    codigoTrabajador: 'EMP001',
    tipoTrabajador: '01',
    subTipoTrabajador: '00',
    altoRiesgoPension: false,
    fechaIngreso: '2026-01-15',
  },
  entry: {
    entryNumber: 'NOM-000001',
    cune: 'abc123def456'.repeat(8),
    fechaGeneracion: '2026-01-31',
    horaGeneracion: '10:30:00-05:00',
    periodoInicio: '2026-01-01',
    periodoFin: '2026-01-31',
    fechaPago: '2026-02-05',
    tipoMoneda: 'COP',
    daysWorked: 30,
    sueldo: 1_423_500,
    auxilioTransporte: 200_000,
    horasExtras: 0,
    bonificaciones: 0,
    comisiones: 0,
    viaticos: 0,
    incapacidad: 0,
    licencia: 0,
    vacaciones: 0,
    otrosDevengados: 0,
    totalDevengados: 1_623_500,
    saludEmpleado: 56_940,
    pensionEmpleado: 56_940,
    fondoSolidaridad: 0,
    retencionFuente: 0,
    sindicato: 0,
    libranzas: 0,
    otrasDeducciones: 0,
    totalDeducciones: 113_880,
    saludEmpleador: 120_998,
    pensionEmpleador: 170_820,
    arlEmpleador: 7_431,
    cajaEmpleador: 56_940,
    senaEmpleador: 28_470,
    icbfEmpleador: 42_705,
  },
  softwareId: 'SW-001',
  softwarePin: '12345',
  ambiente: '2',
};

describe('PayrollXmlGeneratorService', () => {
  let service: PayrollXmlGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollXmlGeneratorService],
    }).compile();

    service = module.get<PayrollXmlGeneratorService>(PayrollXmlGeneratorService);
  });

  describe('generateNominaIndividualXml', () => {
    it('should generate valid XML with NominaIndividual root', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<NominaIndividual');
      expect(xml).toContain('</NominaIndividual>');
    });

    it('should include UBLExtensions for digital signature', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('<ext:UBLExtensions>');
      expect(xml).toContain('<ext:ExtensionContent/>');
    });

    it('should include CUNE', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain(`<CUNE>${sampleParams.entry.cune}</CUNE>`);
    });

    it('should include TipoXML 102 for individual payroll', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('<TipoXML>102</TipoXML>');
    });

    it('should include employer data', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('NIT="900123456"');
      expect(xml).toContain('DV="7"');
      expect(xml).toContain('RazonSocial="Test Company SAS"');
    });

    it('should include employee data', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('NumeroDocumento="1234567890"');
      expect(xml).toContain('PrimerApellido="P&eacute;rez"'.replace('&eacute;', 'é'));
      expect(xml).toContain('PrimerNombre="Juan"');
      expect(xml).toContain('Sueldo="1423500.00"');
    });

    it('should include Devengados section', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('<Devengados>');
      expect(xml).toContain('DiasTrabajados="30"');
      expect(xml).toContain('SueldoTrabajado="1423500.00"');
      expect(xml).toContain('AuxilioTransporte="200000.00"');
      expect(xml).toContain('</Devengados>');
    });

    it('should include Deducciones section', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('<Deducciones>');
      expect(xml).toContain('Deduccion="56940.00"');
      expect(xml).toContain('</Deducciones>');
    });

    it('should include totals', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('<DevengadosTotal>1623500.00</DevengadosTotal>');
      expect(xml).toContain('<DeduccionesTotal>113880.00</DeduccionesTotal>');
      expect(xml).toContain('<ComprobanteTotal>1509620.00</ComprobanteTotal>');
    });

    it('should include InformacionGeneral', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      expect(xml).toContain('SoftwareID="SW-001"');
      expect(xml).toContain('Ambiente="2"');
    });

    it('should omit optional sections when values are 0', () => {
      const xml = service.generateNominaIndividualXml(sampleParams);

      // horasExtras is 0, should NOT appear
      expect(xml).not.toContain('<HorasExtras>');
      expect(xml).not.toContain('<Bonificaciones>');
      expect(xml).not.toContain('<FondoSP');
      expect(xml).not.toContain('<RetencionFuente>');
    });

    it('should include optional sections when values are > 0', () => {
      const params = {
        ...sampleParams,
        entry: {
          ...sampleParams.entry,
          horasExtras: 50_000,
          bonificaciones: 100_000,
          fondoSolidaridad: 14_235,
          retencionFuente: 200_000,
        },
      };

      const xml = service.generateNominaIndividualXml(params);

      expect(xml).toContain('<HorasExtras>50000.00</HorasExtras>');
      expect(xml).toContain('<Bonificaciones>100000.00</Bonificaciones>');
      expect(xml).toContain('DeduccionSP="14235.00"');
      expect(xml).toContain('<RetencionFuente>200000.00</RetencionFuente>');
    });
  });

  describe('generateNominaAjusteXml', () => {
    it('should generate XML with NominaIndividualDeAjuste root', () => {
      const xml = service.generateNominaAjusteXml(sampleParams);

      expect(xml).toContain('<NominaIndividualDeAjuste');
      expect(xml).toContain('</NominaIndividualDeAjuste>');
    });

    it('should include TipoXML 103', () => {
      const xml = service.generateNominaAjusteXml(sampleParams);

      expect(xml).toContain('<TipoXML>103</TipoXML>');
    });

    it('should include Predecesor reference', () => {
      const xml = service.generateNominaAjusteXml(sampleParams);

      expect(xml).toContain('<Predecesor');
      expect(xml).toContain(`NumeroPred="${sampleParams.entry.entryNumber}"`);
    });

    it('should include TipoNota', () => {
      const xml = service.generateNominaAjusteXml(sampleParams);

      expect(xml).toContain('<TipoNota>2</TipoNota>');
    });
  });
});
