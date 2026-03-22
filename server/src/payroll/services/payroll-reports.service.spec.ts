import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PayrollReportsService } from './payroll-reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/services/tenant-context.service';

describe('PayrollReportsService', () => {
  let service: PayrollReportsService;
  let prisma: any;

  const tenantId = 'tenant-reports';

  const mockEmployee = {
    id: 'emp-1',
    tenantId,
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'CC',
    documentNumber: '12345678',
    city: 'Bogotá',
    department: 'Cundinamarca',
    startDate: new Date('2025-01-15'),
    endDate: null,
  };

  const mockTenant = {
    id: tenantId,
    name: 'Mi Empresa SAS',
    dianConfig: {
      businessName: 'Mi Empresa SAS',
      nit: '900123456',
      address: 'Calle 100 #15-20',
      cityCode: '11001',
    },
  };

  const mockEntries = [
    {
      id: 'entry-1',
      periodId: 'period-jan',
      employeeId: 'emp-1',
      sueldo: 1500000,
      auxilioTransporte: 200000,
      horasExtras: 50000,
      bonificaciones: 0,
      comisiones: 0,
      viaticos: 0,
      otrosDevengados: 0,
      totalDevengados: 1750000,
      saludEmpleado: 60000,
      pensionEmpleado: 60000,
      fondoSolidaridad: 0,
      retencionFuente: 0,
      sindicato: 0,
      libranzas: 0,
      otrasDeducciones: 0,
      totalDeducciones: 120000,
      totalNeto: 1630000,
      saludEmpleador: 127500,
      pensionEmpleador: 180000,
      arlEmpleador: 7830,
      cajaEmpleador: 60000,
      senaEmpleador: 30000,
      icbfEmpleador: 45000,
      period: { name: 'Enero 2026', startDate: new Date(2026, 0, 1) },
    },
    {
      id: 'entry-2',
      periodId: 'period-feb',
      employeeId: 'emp-1',
      sueldo: 1500000,
      auxilioTransporte: 200000,
      horasExtras: 0,
      bonificaciones: 100000,
      comisiones: 0,
      viaticos: 0,
      otrosDevengados: 0,
      totalDevengados: 1800000,
      saludEmpleado: 64000,
      pensionEmpleado: 64000,
      fondoSolidaridad: 0,
      retencionFuente: 0,
      sindicato: 0,
      libranzas: 0,
      otrasDeducciones: 0,
      totalDeducciones: 128000,
      totalNeto: 1672000,
      saludEmpleador: 136000,
      pensionEmpleador: 192000,
      arlEmpleador: 8352,
      cajaEmpleador: 64000,
      senaEmpleador: 32000,
      icbfEmpleador: 48000,
      period: { name: 'Febrero 2026', startDate: new Date(2026, 1, 1) },
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      employee: { findFirst: jest.fn(), count: jest.fn() },
      tenant: { findUnique: jest.fn() },
      payrollEntry: { findMany: jest.fn() },
      payrollPeriod: { findFirst: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollReportsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TenantContextService,
          useValue: { requireTenantId: jest.fn().mockReturnValue(tenantId) },
        },
      ],
    }).compile();

    service = module.get<PayrollReportsService>(PayrollReportsService);
  });

  describe('getIncomeCertificate', () => {
    it('should aggregate yearly totals for an employee', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.payrollEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.getIncomeCertificate('emp-1', 2026);

      expect(result.employee.firstName).toBe('Juan');
      expect(result.year).toBe(2026);
      expect(result.periodsCount).toBe(2);
      expect(result.totals.totalDevengados).toBe(3550000);
      expect(result.totals.totalDeducciones).toBe(248000);
      expect(result.totals.totalNeto).toBe(3302000);
      expect(result.totals.saludEmpleador).toBe(263500);
    });

    it('should throw NotFoundException when employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.getIncomeCertificate('emp-x', 2026)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return zero totals when no entries exist', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.payrollEntry.findMany.mockResolvedValue([]);

      const result = await service.getIncomeCertificate('emp-1', 2026);

      expect(result.periodsCount).toBe(0);
      expect(result.totals.totalDevengados).toBe(0);
      expect(result.totals.totalNeto).toBe(0);
    });
  });

  describe('getPeriodSummary', () => {
    const mockPeriod = {
      id: 'period-jan',
      name: 'Enero 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      status: 'APPROVED',
    };

    it('should return period summary with deduction breakdown', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.payrollEntry.findMany.mockResolvedValue([mockEntries[0]]);

      const result = await service.getPeriodSummary('period-jan');

      expect(result.periodName).toBe('Enero 2026');
      expect(result.employeeCount).toBe(1);
      expect(result.totalDevengados).toBe(1750000);
      expect(result.deductionBreakdown.saludEmpleado).toBe(60000);
      expect(result.employerContributions.total).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when period not found', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(null);

      await expect(service.getPeriodSummary('period-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEmployeeYtdReport', () => {
    it('should return monthly breakdown for the year', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.payrollEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.getEmployeeYtdReport('emp-1', 2026);

      expect(result.employeeName).toBe('Juan Pérez');
      expect(result.year).toBe(2026);
      expect(result.months).toHaveLength(2);
      expect(result.months[0].month).toBe(1);
      expect(result.yearTotal.devengados).toBe(3550000);
    });

    it('should throw NotFoundException when employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.getEmployeeYtdReport('emp-x', 2026),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty months when no entries exist', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.payrollEntry.findMany.mockResolvedValue([]);

      const result = await service.getEmployeeYtdReport('emp-1', 2026);

      expect(result.months).toHaveLength(0);
      expect(result.yearTotal.devengados).toBe(0);
      expect(result.yearTotal.deducciones).toBe(0);
      expect(result.yearTotal.neto).toBe(0);
    });
  });

  describe('getIncomeCertificate - additional coverage', () => {
    it('should throw NotFoundException when tenant not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getIncomeCertificate('emp-1', 2026),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use tenant name when no dianConfig businessName', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);
      prisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        name: 'Fallback Company',
        dianConfig: null,
      });
      prisma.payrollEntry.findMany.mockResolvedValue([]);

      const result = await service.getIncomeCertificate('emp-1', 2026);

      expect(result.employer.name).toBe('Fallback Company');
      expect(result.employer.nit).toBe('');
    });
  });

  describe('getDashboard', () => {
    const mockPeriods = [
      {
        id: 'period-feb',
        name: 'Febrero 2026',
        startDate: new Date(2026, 1, 1),
        endDate: new Date(2026, 1, 28),
        status: 'APPROVED',
        totalDevengados: 5000000,
        totalDeducciones: 400000,
        totalNeto: 4600000,
        employeeCount: 5,
      },
      {
        id: 'period-jan',
        name: 'Enero 2026',
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 0, 31),
        status: 'APPROVED',
        totalDevengados: 4800000,
        totalDeducciones: 380000,
        totalNeto: 4420000,
        employeeCount: 5,
      },
      {
        id: 'period-mar',
        name: 'Marzo 2026',
        startDate: new Date(2026, 2, 1),
        endDate: new Date(2026, 2, 31),
        status: 'OPEN',
        totalDevengados: 0,
        totalDeducciones: 0,
        totalNeto: 0,
        employeeCount: 0,
      },
    ];

    it('should return dashboard with aggregated metrics', async () => {
      prisma.payrollPeriod.findMany.mockResolvedValue(mockPeriods);
      prisma.employee.count
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(12); // total

      const result = await service.getDashboard(2026);

      expect(result.year).toBe(2026);
      expect(result.activeEmployees).toBe(10);
      expect(result.totalEmployees).toBe(12);
      expect(result.periodsCount).toBe(3);
      expect(result.approvedPeriods).toBe(2);
      // Only APPROVED/CLOSED periods contribute to totals
      expect(result.totals.earnings).toBe(9800000);
      expect(result.totals.deductions).toBe(780000);
      expect(result.totals.netPay).toBe(9020000);
      expect(result.averagePayroll).toBe(4510000);
      expect(result.monthlyTotals).toHaveLength(3);
      expect(result.recentPeriods).toHaveLength(3);
    });

    it('should return zero averagePayroll when no approved periods', async () => {
      prisma.payrollPeriod.findMany.mockResolvedValue([
        { ...mockPeriods[2] }, // only OPEN
      ]);
      prisma.employee.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      const result = await service.getDashboard(2026);

      expect(result.approvedPeriods).toBe(0);
      expect(result.averagePayroll).toBe(0);
      expect(result.totals.earnings).toBe(0);
    });

    it('should limit recent periods to 6', async () => {
      const manyPeriods = Array.from({ length: 10 }, (_, i) => ({
        id: `period-${i}`,
        name: `Period ${i}`,
        startDate: new Date(2026, i, 1),
        endDate: new Date(2026, i + 1, 0),
        status: 'APPROVED',
        totalDevengados: 1000000,
        totalDeducciones: 100000,
        totalNeto: 900000,
        employeeCount: 5,
      }));
      prisma.payrollPeriod.findMany.mockResolvedValue(manyPeriods);
      prisma.employee.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      const result = await service.getDashboard(2026);

      expect(result.recentPeriods).toHaveLength(6);
    });

    it('should handle CLOSED period status in aggregation', async () => {
      prisma.payrollPeriod.findMany.mockResolvedValue([
        {
          ...mockPeriods[0],
          status: 'CLOSED',
        },
      ]);
      prisma.employee.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      const result = await service.getDashboard(2026);

      expect(result.approvedPeriods).toBe(1);
      expect(result.totals.earnings).toBe(5000000);
    });

    it('should return empty arrays when no periods exist', async () => {
      prisma.payrollPeriod.findMany.mockResolvedValue([]);
      prisma.employee.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getDashboard(2026);

      expect(result.periodsCount).toBe(0);
      expect(result.monthlyTotals).toHaveLength(0);
      expect(result.recentPeriods).toHaveLength(0);
    });
  });
});
