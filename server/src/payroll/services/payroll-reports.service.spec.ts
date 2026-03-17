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
      employee: { findFirst: jest.fn() },
      tenant: { findUnique: jest.fn() },
      payrollEntry: { findMany: jest.fn() },
      payrollPeriod: { findFirst: jest.fn() },
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

      await expect(
        service.getIncomeCertificate('emp-x', 2026),
      ).rejects.toThrow(NotFoundException);
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
  });
});
