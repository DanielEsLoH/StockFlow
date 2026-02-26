import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayrollEntryStatus, SalaryType, ARLRiskLevel } from '@prisma/client';
import { PayrollEntriesService } from './payroll-entries.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollConfigService } from './payroll-config.service';

describe('PayrollEntriesService', () => {
  let service: PayrollEntriesService;
  let prisma: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<PayrollConfigService>;
  let calculationService: jest.Mocked<PayrollCalculationService>;

  const mockTenantId = 'tenant-123';

  const mockEmployee = {
    firstName: 'Juan',
    lastName: 'Pérez',
    documentNumber: '1234567890',
    documentType: 'CC',
    contractType: 'INDEFINIDO',
    salaryType: SalaryType.ORDINARIO,
    arlRiskLevel: ARLRiskLevel.LEVEL_I,
    auxilioTransporte: true,
    epsName: 'Sura',
    afpName: 'Porvenir',
    cajaName: 'Comfama',
  };

  const mockEntry = {
    id: 'entry-1',
    tenantId: mockTenantId,
    entryNumber: 'NOM-001-001',
    status: PayrollEntryStatus.DRAFT,
    periodId: 'period-1',
    employeeId: 'emp-1',
    baseSalary: 2000000,
    daysWorked: 30,
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
    totalDevengados: 2162000,
    saludEmpleado: 80000,
    pensionEmpleado: 80000,
    fondoSolidaridad: 0,
    retencionFuente: 0,
    sindicato: 0,
    libranzas: 0,
    otrasDeducciones: 0,
    totalDeducciones: 160000,
    saludEmpleador: 0,
    pensionEmpleador: 240000,
    arlEmpleador: 10440,
    cajaEmpleador: 80000,
    senaEmpleador: 40000,
    icbfEmpleador: 60000,
    provisionPrima: 180167,
    provisionCesantias: 180167,
    provisionIntereses: 21620,
    provisionVacaciones: 83333,
    totalNeto: 2002000,
    overtimeDetails: [],
    cune: null,
    dianStatus: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    employee: mockEmployee,
    period: { name: 'Enero 2024', startDate: new Date(), endDate: new Date() },
  };

  const mockCalculationResult = {
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
    totalDevengados: 2162000,
    saludEmpleado: 80000,
    pensionEmpleado: 80000,
    fondoSolidaridad: 0,
    retencionFuente: 0,
    sindicato: 0,
    libranzas: 0,
    otrasDeducciones: 0,
    totalDeducciones: 160000,
    saludEmpleador: 0,
    pensionEmpleador: 240000,
    arlEmpleador: 10440,
    cajaEmpleador: 80000,
    senaEmpleador: 40000,
    icbfEmpleador: 60000,
    provisionPrima: 180167,
    provisionCesantias: 180167,
    provisionIntereses: 21620,
    provisionVacaciones: 83333,
    totalNeto: 2002000,
  };

  const mockConfigResponse = {
    id: 'config-1',
    tenantId: mockTenantId,
    smmlv: 1300000,
    auxilioTransporteVal: 162000,
    uvtValue: 47065,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      payrollEntry: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockCalculationService = {
      calculatePayrollEntry: jest.fn().mockReturnValue(mockCalculationResult),
    };

    const mockConfigService = {
      getOrFail: jest.fn().mockResolvedValue(mockConfigResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollEntriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        {
          provide: PayrollCalculationService,
          useValue: mockCalculationService,
        },
        { provide: PayrollConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PayrollEntriesService>(PayrollEntriesService);
    prisma = module.get(PrismaService);
    configService = module.get(PayrollConfigService);
    calculationService = module.get(PayrollCalculationService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should return entry with employee and period', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.findOne('entry-1');

      expect(result.id).toBe('entry-1');
      expect(result.employee).toEqual({
        name: 'Juan Pérez',
        documentNumber: '1234567890',
        documentType: 'CC',
        contractType: 'INDEFINIDO',
        salaryType: SalaryType.ORDINARIO,
        arlRiskLevel: ARLRiskLevel.LEVEL_I,
        epsName: 'Sura',
        afpName: 'Porvenir',
        cajaName: 'Comfama',
      });
      expect(result.periodName).toBe('Enero 2024');
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and recalculate a DRAFT entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.update('entry-1', { daysWorked: 25 });

      expect(result.id).toBe('entry-1');
      expect(calculationService.calculatePayrollEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          baseSalary: 2000000,
          daysWorked: 25,
        }),
      );
      expect(prisma.payrollEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PayrollEntryStatus.CALCULATED,
            daysWorked: 25,
          }),
        }),
      );
    });

    it('should update a CALCULATED entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: PayrollEntryStatus.CALCULATED,
      });
      (prisma.payrollEntry.update as jest.Mock).mockResolvedValue(mockEntry);

      await service.update('entry-1', { bonificaciones: 100000 });

      expect(calculationService.calculatePayrollEntry).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { daysWorked: 25 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for APPROVED entry', async () => {
      (prisma.payrollEntry.findFirst as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: PayrollEntryStatus.APPROVED,
      });

      await expect(
        service.update('entry-1', { daysWorked: 25 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
