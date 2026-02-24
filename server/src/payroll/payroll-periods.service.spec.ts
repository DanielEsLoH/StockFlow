import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollConfigService } from './payroll-config.service';
import {
  PayrollPeriodStatus,
  PayrollEntryStatus,
  EmployeeStatus,
  SalaryType,
  ARLRiskLevel,
  PayrollPeriodType,
} from '@prisma/client';

const TENANT_ID = 'tenant-1';

const mockPeriod = {
  id: 'period-1',
  tenantId: TENANT_ID,
  name: 'Nómina Enero 2026',
  periodType: PayrollPeriodType.MONTHLY,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
  paymentDate: new Date('2026-02-05'),
  status: PayrollPeriodStatus.OPEN,
  totalDevengados: 0n,
  totalDeducciones: 0n,
  totalNeto: 0n,
  employeeCount: 0,
  approvedAt: null,
  approvedById: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { entries: 0 },
};

const mockEmployee = {
  id: 'emp-1',
  tenantId: TENANT_ID,
  baseSalary: 1_423_500n,
  salaryType: SalaryType.ORDINARIO,
  arlRiskLevel: ARLRiskLevel.LEVEL_I,
  auxilioTransporte: true,
  status: EmployeeStatus.ACTIVE,
};

const mockConfig = {
  smmlv: 1_423_500,
  auxilioTransporteVal: 200_000,
  uvtValue: 49_799,
};

describe('PayrollPeriodsService', () => {
  let service: PayrollPeriodsService;
  let prisma: any;
  let tenantContext: any;
  let calculationService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      payrollPeriod: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payrollEntry: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      employee: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    tenantContext = {
      requireTenantId: jest.fn().mockReturnValue(TENANT_ID),
    };

    calculationService = {
      calculatePayrollEntry: jest.fn().mockReturnValue({
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
        provisionPrima: 118_578,
        provisionCesantias: 118_578,
        provisionIntereses: 1_186,
        provisionVacaciones: 59_360,
        totalNeto: 1_509_620,
        ibc: 1_423_500,
      }),
    };

    configService = {
      getOrFail: jest.fn().mockResolvedValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollPeriodsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: PayrollCalculationService, useValue: calculationService },
        { provide: PayrollConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PayrollPeriodsService>(PayrollPeriodsService);
  });

  describe('findAll', () => {
    it('should return paginated periods', async () => {
      prisma.payrollPeriod.findMany.mockResolvedValue([mockPeriod]);
      prisma.payrollPeriod.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return period with entries', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        ...mockPeriod,
        entries: [],
      });

      const result = await service.findOne('period-1');

      expect(result.id).toBe('period-1');
      expect(result.entries).toEqual([]);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a period', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(null);
      prisma.payrollPeriod.create.mockResolvedValue(mockPeriod);

      const result = await service.create({
        name: 'Nómina Enero 2026',
        periodType: PayrollPeriodType.MONTHLY,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        paymentDate: '2026-02-05',
      });

      expect(result.name).toBe('Nómina Enero 2026');
    });

    it('should throw if endDate <= startDate', async () => {
      await expect(
        service.create({
          name: 'Bad Period',
          periodType: PayrollPeriodType.MONTHLY,
          startDate: '2026-01-31',
          endDate: '2026-01-01',
          paymentDate: '2026-02-05',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if overlapping period exists', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);

      await expect(
        service.create({
          name: 'Overlap',
          periodType: PayrollPeriodType.MONTHLY,
          startDate: '2026-01-15',
          endDate: '2026-02-15',
          paymentDate: '2026-02-20',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('calculatePeriod', () => {
    it('should calculate all active employees', async () => {
      prisma.payrollPeriod.findFirst
        .mockResolvedValueOnce(mockPeriod) // first call in calculatePeriod
        .mockResolvedValueOnce({ ...mockPeriod, entries: [], _count: { entries: 1 } }); // findOne after

      prisma.employee.findMany.mockResolvedValue([mockEmployee]);
      prisma.payrollEntry.findFirst.mockResolvedValue(null);
      prisma.payrollEntry.create.mockResolvedValue({});
      prisma.payrollPeriod.update.mockResolvedValue(mockPeriod);

      const result = await service.calculatePeriod('period-1');

      expect(calculationService.calculatePayrollEntry).toHaveBeenCalledTimes(1);
      expect(prisma.payrollEntry.create).toHaveBeenCalled();
      expect(prisma.payrollPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PayrollPeriodStatus.CALCULATED,
            employeeCount: 1,
          }),
        }),
      );
    });

    it('should throw if period not found', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(null);

      await expect(service.calculatePeriod('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if no active employees', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.employee.findMany.mockResolvedValue([]);

      await expect(service.calculatePeriod('period-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if period is APPROVED', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        ...mockPeriod,
        status: PayrollPeriodStatus.APPROVED,
      });

      await expect(service.calculatePeriod('period-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approvePeriod', () => {
    it('should approve a calculated period', async () => {
      const calculatedPeriod = {
        ...mockPeriod,
        status: PayrollPeriodStatus.CALCULATED,
        entries: [{ status: PayrollEntryStatus.CALCULATED }],
      };

      prisma.payrollPeriod.findFirst
        .mockResolvedValueOnce(calculatedPeriod) // approvePeriod
        .mockResolvedValueOnce({ ...calculatedPeriod, status: PayrollPeriodStatus.APPROVED, entries: [] }); // findOne

      prisma.payrollEntry.updateMany.mockResolvedValue({ count: 1 });
      prisma.payrollPeriod.update.mockResolvedValue({
        ...calculatedPeriod,
        status: PayrollPeriodStatus.APPROVED,
      });

      const result = await service.approvePeriod('period-1', 'user-1');

      expect(prisma.payrollEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PayrollEntryStatus.APPROVED },
        }),
      );
    });

    it('should throw if period is not CALCULATED', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        ...mockPeriod,
        status: PayrollPeriodStatus.OPEN,
        entries: [],
      });

      await expect(
        service.approvePeriod('period-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if entries are not all CALCULATED', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        ...mockPeriod,
        status: PayrollPeriodStatus.CALCULATED,
        entries: [
          { status: PayrollEntryStatus.CALCULATED },
          { status: PayrollEntryStatus.DRAFT },
        ],
      });

      await expect(
        service.approvePeriod('period-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('closePeriod', () => {
    it('should close an approved period', async () => {
      prisma.payrollPeriod.findFirst
        .mockResolvedValueOnce({ ...mockPeriod, status: PayrollPeriodStatus.APPROVED })
        .mockResolvedValueOnce({ ...mockPeriod, status: PayrollPeriodStatus.CLOSED, entries: [] });

      prisma.payrollPeriod.update.mockResolvedValue({
        ...mockPeriod,
        status: PayrollPeriodStatus.CLOSED,
      });

      const result = await service.closePeriod('period-1');
      expect(result.status).toBe(PayrollPeriodStatus.CLOSED);
    });

    it('should throw if period is OPEN', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);

      await expect(service.closePeriod('period-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
