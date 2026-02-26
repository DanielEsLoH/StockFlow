import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayrollEntryStatus, PayrollPeriodStatus } from '@prisma/client';
import { PayrollDianService } from './payroll-dian.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/services/tenant-context.service';
import { PayrollConfigService } from '../payroll-config.service';
import { PayrollXmlGeneratorService } from './payroll-xml-generator.service';
import { PayrollCuneGeneratorService } from './payroll-cune-generator.service';

describe('PayrollDianService', () => {
  let service: PayrollDianService;
  let prisma: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<PayrollConfigService>;
  let xmlGenerator: jest.Mocked<PayrollXmlGeneratorService>;
  let cuneGenerator: jest.Mocked<PayrollCuneGeneratorService>;

  const mockTenantId = 'tenant-123';

  const mockEntry = {
    id: 'entry-1',
    tenantId: mockTenantId,
    entryNumber: 'NOM-001-001',
    status: PayrollEntryStatus.APPROVED,
    periodId: 'period-1',
    employeeId: 'emp-1',
    baseSalary: 2000000,
    daysWorked: 30,
    totalDevengados: 2162000,
    totalDeducciones: 160000,
    totalNeto: 2002000,
    sueldo: 2000000,
    auxilioTransporte: 162000,
    horasExtras: 0,
    bonificaciones: 0,
    comisiones: 0,
    viaticos: 0,
    incapacidad: 0,
    licencia: 0,
    vacaciones: 0,
    otrosDevengados: 0,
    saludEmpleado: 80000,
    pensionEmpleado: 80000,
    fondoSolidaridad: 0,
    retencionFuente: 0,
    sindicato: 0,
    libranzas: 0,
    otrasDeducciones: 0,
    saludEmpleador: 0,
    pensionEmpleador: 240000,
    arlEmpleador: 10440,
    cajaEmpleador: 80000,
    senaEmpleador: 40000,
    icbfEmpleador: 60000,
    cune: null,
    employee: {
      id: 'emp-1',
      documentType: 'CC',
      documentNumber: '1234567890',
      firstName: 'Juan',
      lastName: 'Pérez',
      contractType: 'TERMINO_INDEFINIDO',
      arlRiskLevel: 'LEVEL_I',
      startDate: new Date('2023-01-01'),
      endDate: null,
      departmentCode: '11',
      cityCode: '11001',
      address: 'Calle 123',
    },
    period: {
      name: 'Enero 2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      paymentDate: new Date('2024-01-31'),
    },
  };

  const mockDianConfig = {
    nit: '900123456',
    dv: '7',
    businessName: 'Test Company',
    address: 'Calle 123',
    departmentCode: '11',
    cityCode: '11001',
  };

  const mockConfig = {
    id: 'config-1',
    smmlv: 1300000,
    auxilioTransporteVal: 162000,
    uvtValue: 47065,
    payrollSoftwareId: 'soft-id',
    payrollSoftwarePin: 'soft-pin',
    payrollTestSetId: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      payrollEntry: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      payrollPeriod: {
        findFirst: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockConfigService = {
      getOrFail: jest.fn().mockResolvedValue(mockConfig),
    };

    const mockXmlGenerator = {
      generateNominaIndividualXml: jest.fn().mockReturnValue('<xml>payroll</xml>'),
    };

    const mockCuneGenerator = {
      generateTimestamp: jest.fn().mockReturnValue({
        date: '2024-01-31',
        time: '10:00:00',
      }),
      generateCune: jest.fn().mockReturnValue('cune-generated-hash'),
      formatMoney: jest.fn().mockImplementation((val: number) => val.toFixed(2)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollDianService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: PayrollConfigService, useValue: mockConfigService },
        {
          provide: PayrollXmlGeneratorService,
          useValue: mockXmlGenerator,
        },
        {
          provide: PayrollCuneGeneratorService,
          useValue: mockCuneGenerator,
        },
      ],
    }).compile();

    service = module.get<PayrollDianService>(PayrollDianService);
    prisma = module.get(PrismaService);
    configService = module.get(PayrollConfigService);
    xmlGenerator = module.get(PayrollXmlGeneratorService);
    cuneGenerator = module.get(PayrollCuneGeneratorService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateEntryXml', () => {
    it('should generate XML and CUNE for approved entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: mockDianConfig,
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.generateEntryXml('entry-1');

      expect(result.cune).toBe('cune-generated-hash');
      expect(result.xml).toBe('<xml>payroll</xml>');
      expect(cuneGenerator.generateCune).toHaveBeenCalled();
      expect(xmlGenerator.generateNominaIndividualXml).toHaveBeenCalled();
      expect(prisma.payrollEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cune: 'cune-generated-hash',
            xmlContent: '<xml>payroll</xml>',
          }),
        }),
      );
    });

    it('should throw NotFoundException when entry not found', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.generateEntryXml('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-APPROVED entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: PayrollEntryStatus.DRAFT,
      });

      await expect(service.generateEntryXml('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when tenant not found', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generateEntryXml('entry-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no DIAN config', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: null,
      });

      await expect(service.generateEntryXml('entry-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generatePeriodXmls', () => {
    it('should generate XMLs for all approved entries in period', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'period-1',
        tenantId: mockTenantId,
        name: 'Enero 2024',
        status: PayrollPeriodStatus.APPROVED,
      });
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue([
        { ...mockEntry, id: 'entry-1', entryNumber: 'NOM-001-001' },
        { ...mockEntry, id: 'entry-2', entryNumber: 'NOM-001-002' },
      ]);
      // For each generateEntryXml call
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: mockTenantId,
        dianConfig: mockDianConfig,
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.generatePeriodXmls('period-1');

      expect(result.generated).toBe(2);
      expect(result.entries).toHaveLength(2);
    });

    it('should throw NotFoundException when period not found', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.generatePeriodXmls('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-APPROVED period', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'period-1',
        tenantId: mockTenantId,
        status: PayrollPeriodStatus.DRAFT,
      });

      await expect(
        service.generatePeriodXmls('period-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return zero when no entries need XML generation', async () => {
      (prisma.payrollPeriod.findFirst as jest.Mock).mockResolvedValue({
        id: 'period-1',
        tenantId: mockTenantId,
        name: 'Enero 2024',
        status: PayrollPeriodStatus.APPROVED,
      });
      (prisma.payrollEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generatePeriodXmls('period-1');

      expect(result.generated).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });
});
