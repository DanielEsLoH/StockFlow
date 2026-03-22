import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PayrollReportsController } from './payroll-reports.controller';
import { PayrollReportsService } from './services/payroll-reports.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

describe('PayrollReportsController', () => {
  let controller: PayrollReportsController;
  let reportsService: jest.Mocked<PayrollReportsService>;

  const mockCertificateResponse = {
    employee: {
      id: 'emp-1',
      firstName: 'Juan',
      lastName: 'Perez',
      documentType: 'CC',
      documentNumber: '12345678',
      city: 'Bogota',
      department: 'Cundinamarca',
      startDate: new Date('2025-01-15'),
      endDate: null,
    },
    employer: {
      name: 'Mi Empresa SAS',
      nit: '900123456',
      address: 'Calle 100',
      city: '11001',
    },
    year: 2026,
    periodsCount: 12,
    totals: {
      sueldo: 18000000,
      auxilioTransporte: 2400000,
      horasExtras: 0,
      bonificaciones: 0,
      comisiones: 0,
      viaticos: 0,
      otrosDevengados: 0,
      totalDevengados: 20400000,
      saludEmpleado: 720000,
      pensionEmpleado: 720000,
      fondoSolidaridad: 0,
      retencionFuente: 0,
      sindicato: 0,
      libranzas: 0,
      otrasDeducciones: 0,
      totalDeducciones: 1440000,
      totalNeto: 18960000,
      saludEmpleador: 0,
      pensionEmpleador: 2160000,
      arlEmpleador: 93960,
      cajaEmpleador: 720000,
      senaEmpleador: 360000,
      icbfEmpleador: 540000,
    },
  };

  const mockPeriodSummary = {
    periodId: 'period-1',
    periodName: 'Enero 2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
    status: 'APPROVED',
    employeeCount: 5,
    totalDevengados: 10000000,
    totalDeducciones: 800000,
    totalNeto: 9200000,
    deductionBreakdown: {
      saludEmpleado: 300000,
      pensionEmpleado: 300000,
      fondoSolidaridad: 0,
      retencionFuente: 0,
      sindicato: 0,
      libranzas: 0,
      otrasDeducciones: 200000,
    },
    employerContributions: {
      saludEmpleador: 0,
      pensionEmpleador: 900000,
      arlEmpleador: 39150,
      cajaEmpleador: 300000,
      senaEmpleador: 150000,
      icbfEmpleador: 225000,
      total: 1614150,
    },
  };

  const mockYtdResponse = {
    employeeId: 'emp-1',
    employeeName: 'Juan Perez',
    year: 2026,
    months: [
      {
        month: 1,
        periodName: 'Enero 2026',
        devengados: 2000000,
        deducciones: 160000,
        neto: 1840000,
      },
    ],
    yearTotal: { devengados: 2000000, deducciones: 160000, neto: 1840000 },
  };

  const mockDashboard = {
    year: 2026,
    activeEmployees: 10,
    totalEmployees: 12,
    periodsCount: 3,
    approvedPeriods: 2,
    totals: { earnings: 20000000, deductions: 1600000, netPay: 18400000 },
    averagePayroll: 9200000,
    monthlyTotals: [],
    recentPeriods: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockReportsService = {
      getIncomeCertificate: jest.fn(),
      getPeriodSummary: jest.fn(),
      getEmployeeYtdReport: jest.fn(),
      getDashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollReportsController],
      providers: [
        { provide: PayrollReportsService, useValue: mockReportsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollReportsController>(
      PayrollReportsController,
    );
    reportsService = module.get(PayrollReportsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getIncomeCertificate', () => {
    it('should return income certificate for employee and year', async () => {
      reportsService.getIncomeCertificate.mockResolvedValue(
        mockCertificateResponse as any,
      );

      const result = await controller.getIncomeCertificate('emp-1', 2026);

      expect(result).toEqual(mockCertificateResponse);
      expect(reportsService.getIncomeCertificate).toHaveBeenCalledWith(
        'emp-1',
        2026,
      );
    });

    it('should propagate NotFoundException', async () => {
      reportsService.getIncomeCertificate.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.getIncomeCertificate('nonexistent', 2026),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPeriodSummary', () => {
    it('should return period summary', async () => {
      reportsService.getPeriodSummary.mockResolvedValue(
        mockPeriodSummary as any,
      );

      const result = await controller.getPeriodSummary('period-1');

      expect(result).toEqual(mockPeriodSummary);
      expect(reportsService.getPeriodSummary).toHaveBeenCalledWith('period-1');
    });

    it('should propagate NotFoundException', async () => {
      reportsService.getPeriodSummary.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.getPeriodSummary('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEmployeeYtd', () => {
    it('should return YTD report for employee', async () => {
      reportsService.getEmployeeYtdReport.mockResolvedValue(
        mockYtdResponse as any,
      );

      const result = await controller.getEmployeeYtd('emp-1', 2026);

      expect(result).toEqual(mockYtdResponse);
      expect(reportsService.getEmployeeYtdReport).toHaveBeenCalledWith(
        'emp-1',
        2026,
      );
    });

    it('should propagate NotFoundException', async () => {
      reportsService.getEmployeeYtdReport.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.getEmployeeYtd('nonexistent', 2026),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard with specified year', async () => {
      reportsService.getDashboard.mockResolvedValue(mockDashboard as any);

      const result = await controller.getDashboard(2026);

      expect(result).toEqual(mockDashboard);
      expect(reportsService.getDashboard).toHaveBeenCalledWith(2026);
    });

    it('should use current year when no year provided', async () => {
      reportsService.getDashboard.mockResolvedValue(mockDashboard as any);

      const result = await controller.getDashboard(undefined);

      expect(result).toEqual(mockDashboard);
      expect(reportsService.getDashboard).toHaveBeenCalledWith(
        new Date().getFullYear(),
      );
    });
  });
});
