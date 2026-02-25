import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayrollBenefitsService } from './payroll-benefits.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/services/tenant-context.service';
import { PayrollConfigService } from '../payroll-config.service';
import { SalaryType, EmployeeStatus } from '@prisma/client';

const TENANT_ID = 'tenant-1';
const SMMLV = 1_423_500;
const AUXILIO_TRANSPORTE = 200_000;

const mockConfig = {
  smmlv: SMMLV,
  auxilioTransporteVal: AUXILIO_TRANSPORTE,
  uvtValue: 49_799,
};

const mockEmployee = {
  id: 'emp-1',
  tenantId: TENANT_ID,
  firstName: 'Juan',
  lastName: 'Perez',
  documentNumber: '1234567890',
  baseSalary: BigInt(SMMLV),
  salaryType: SalaryType.ORDINARIO,
  auxilioTransporte: true,
  startDate: new Date('2025-01-15'),
  endDate: null,
  status: EmployeeStatus.ACTIVE,
};

const mockIntegralEmployee = {
  ...mockEmployee,
  id: 'emp-2',
  firstName: 'Maria',
  lastName: 'Garcia',
  documentNumber: '0987654321',
  baseSalary: BigInt(18_505_500),
  salaryType: SalaryType.INTEGRAL,
  auxilioTransporte: false,
};

describe('PayrollBenefitsService', () => {
  let service: PayrollBenefitsService;
  let prisma: any;
  let tenantContext: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      employee: {
        findFirst: jest.fn(),
      },
      payrollEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            provisionPrima: null,
            provisionCesantias: null,
            provisionIntereses: null,
            provisionVacaciones: null,
          },
        }),
      },
    };

    tenantContext = {
      requireTenantId: jest.fn().mockReturnValue(TENANT_ID),
    };

    configService = {
      getOrFail: jest.fn().mockResolvedValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollBenefitsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: PayrollConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PayrollBenefitsService>(PayrollBenefitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===================================================================
  // calculateMonthlyProvisions
  // ===================================================================
  describe('calculateMonthlyProvisions', () => {
    it('should calculate provisions for full month at minimum salary', () => {
      const result = service.calculateMonthlyProvisions({
        baseSalary: SMMLV,
        auxilioTransporte: AUXILIO_TRANSPORTE,
        daysWorked: 30,
        isIntegral: false,
      });

      const benefitBase = SMMLV + AUXILIO_TRANSPORTE;
      expect(result.provisionPrima).toBe(Math.round(benefitBase / 12));
      expect(result.provisionCesantias).toBe(Math.round(benefitBase / 12));
      expect(result.provisionIntereses).toBe(
        Math.round(Math.round(benefitBase / 12) * 0.01),
      );
      // Vacaciones excludes auxilio
      expect(result.provisionVacaciones).toBe(Math.round(SMMLV / 24));
    });

    it('should prorate provisions for partial month (15 days)', () => {
      const result = service.calculateMonthlyProvisions({
        baseSalary: SMMLV,
        auxilioTransporte: AUXILIO_TRANSPORTE,
        daysWorked: 15,
        isIntegral: false,
      });

      const benefitBase = SMMLV + AUXILIO_TRANSPORTE;
      const dayFraction = 15 / 30;
      expect(result.provisionPrima).toBe(
        Math.round((benefitBase / 12) * dayFraction),
      );
      expect(result.provisionCesantias).toBe(
        Math.round((benefitBase / 12) * dayFraction),
      );
      expect(result.provisionVacaciones).toBe(
        Math.round((SMMLV / 24) * dayFraction),
      );
    });

    it('should return all zeros for integral salary', () => {
      const result = service.calculateMonthlyProvisions({
        baseSalary: 18_505_500,
        auxilioTransporte: 0,
        daysWorked: 30,
        isIntegral: true,
      });

      expect(result.provisionPrima).toBe(0);
      expect(result.provisionCesantias).toBe(0);
      expect(result.provisionIntereses).toBe(0);
      expect(result.provisionVacaciones).toBe(0);
    });

    it('should handle salary without auxilio (> 2 SMMLV)', () => {
      const salary = 3_000_000;
      const result = service.calculateMonthlyProvisions({
        baseSalary: salary,
        auxilioTransporte: 0,
        daysWorked: 30,
        isIntegral: false,
      });

      // No auxilio, so benefit base = salary only
      expect(result.provisionPrima).toBe(Math.round(salary / 12));
      expect(result.provisionCesantias).toBe(Math.round(salary / 12));
      expect(result.provisionVacaciones).toBe(Math.round(salary / 24));
    });

    it('should calculate intereses as 1% of cesantias provision', () => {
      const result = service.calculateMonthlyProvisions({
        baseSalary: 5_000_000,
        auxilioTransporte: 0,
        daysWorked: 30,
        isIntegral: false,
      });

      expect(result.provisionIntereses).toBe(
        Math.round(result.provisionCesantias * 0.01),
      );
    });
  });

  // ===================================================================
  // calculateBenefitPayment
  // ===================================================================
  describe('calculateBenefitPayment', () => {
    it('should throw NotFoundException for non-existent employee', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateBenefitPayment('non-existent', 'PRIMA', new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for integral salary employee', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockIntegralEmployee);

      await expect(
        service.calculateBenefitPayment('emp-2', 'PRIMA', new Date()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate prima for first semester', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      const paymentDate = new Date(2026, 5, 30); // Jun 30 2026 (local)
      const result = await service.calculateBenefitPayment(
        'emp-1',
        'PRIMA',
        paymentDate,
      );

      expect(result.benefitType).toBe('PRIMA');
      expect(result.employeeName).toBe('Juan Perez');
      expect(result.baseSalary).toBe(SMMLV);
      expect(result.auxilioTransporte).toBe(AUXILIO_TRANSPORTE);

      // Full semester Jan 1 - Jun 30: (5-0)*30 + (30-1) = 179 days (360-day convention)
      const benefitBase = SMMLV + AUXILIO_TRANSPORTE;
      expect(result.daysWorked).toBe(179);
      const expectedAmount = Math.round((benefitBase * 179) / 360);
      expect(result.calculatedAmount).toBe(expectedAmount);
    });

    it('should calculate prima proportionally for employee who started mid-semester', async () => {
      // Employee started March 15, 2026 - calculating prima for Jun 2026
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2026, 2, 15), // Mar 15 2026 (local)
      });

      const paymentDate = new Date(2026, 5, 30); // Jun 30 2026 (local)
      const result = await service.calculateBenefitPayment(
        'emp-1',
        'PRIMA',
        paymentDate,
      );

      // Days from Mar 15 to Jun 30 using 360-day convention
      // (5-2)*30 + (30-15) = 90 + 15 = 105 days
      expect(result.daysWorked).toBe(105);

      const benefitBase = SMMLV + AUXILIO_TRANSPORTE;
      const expectedAmount = Math.round((benefitBase * 105) / 360);
      expect(result.calculatedAmount).toBe(expectedAmount);
    });

    it('should calculate cesantias for full year', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      // Cesantias paid in February for previous year
      const paymentDate = new Date(2026, 1, 14); // Feb 14 2026 (local)
      const result = await service.calculateBenefitPayment(
        'emp-1',
        'CESANTIAS',
        paymentDate,
      );

      expect(result.benefitType).toBe('CESANTIAS');
      // Full year 2025: Jan 1 to Dec 31 = (11)*30 + (30-1) = 359 days (360-day convention)
      expect(result.daysWorked).toBe(359);

      const benefitBase = SMMLV + AUXILIO_TRANSPORTE;
      const expectedAmount = Math.round((benefitBase * 359) / 360);
      expect(result.calculatedAmount).toBe(expectedAmount);
    });

    it('should calculate intereses sobre cesantias', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      // Intereses paid in January for previous year
      const paymentDate = new Date(2026, 0, 15); // Jan 15 2026 (local)
      const result = await service.calculateBenefitPayment(
        'emp-1',
        'INTERESES_CESANTIAS',
        paymentDate,
      );

      expect(result.benefitType).toBe('INTERESES_CESANTIAS');
      // Full year 2025: 359 days (360-day convention, Jan 1 to Dec 31)
      const daysWorked = result.daysWorked;
      expect(daysWorked).toBe(359);

      const benefitBase = SMMLV + AUXILIO_TRANSPORTE;
      const cesantias = (benefitBase * daysWorked) / 360;
      const expectedIntereses = Math.round((cesantias * 0.12 * daysWorked) / 360);
      expect(result.calculatedAmount).toBe(expectedIntereses);
    });

    it('should calculate vacaciones without auxilio', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      const paymentDate = new Date(2026, 5, 30); // Jun 30 2026 (local)
      const result = await service.calculateBenefitPayment(
        'emp-1',
        'VACACIONES',
        paymentDate,
      );

      expect(result.benefitType).toBe('VACACIONES');
      expect(result.auxilioTransporte).toBe(AUXILIO_TRANSPORTE);

      // Vacaciones = baseSalary * daysWorked / 720 (no auxilio in formula)
      // Days from Jan 1, 2025 to Jun 30, 2026 = 1*360 + 5*30 + (30-1) = 539 days
      const daysWorked = result.daysWorked;
      expect(daysWorked).toBe(539);
      const expectedAmount = Math.round((SMMLV * daysWorked) / 720);
      expect(result.calculatedAmount).toBe(expectedAmount);
    });

    it('should not include auxilio for employee without it', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        auxilioTransporte: false,
        startDate: new Date(2025, 0, 15), // Jan 15 2025 (local)
      });

      const paymentDate = new Date(2026, 5, 30); // Jun 30 2026 (local)
      const result = await service.calculateBenefitPayment(
        'emp-1',
        'PRIMA',
        paymentDate,
      );

      expect(result.auxilioTransporte).toBe(0);

      // Prima base = salary only, no auxilio
      const expectedAmount = Math.round((SMMLV * result.daysWorked) / 360);
      expect(result.calculatedAmount).toBe(expectedAmount);
    });
  });

  // ===================================================================
  // getLiquidationPreview
  // ===================================================================
  describe('getLiquidationPreview', () => {
    it('should throw NotFoundException for non-existent employee', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.getLiquidationPreview('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return all 4 benefit items for ordinary employee', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 5, 1), // Jun 1 2025 (local)
      });

      const terminationDate = new Date(2026, 1, 24); // Feb 24 2026 (local)
      const result = await service.getLiquidationPreview(
        'emp-1',
        terminationDate,
      );

      expect(result.employeeId).toBe('emp-1');
      expect(result.employeeName).toBe('Juan Perez');
      expect(result.baseSalary).toBe(SMMLV);
      expect(result.auxilioTransporte).toBe(AUXILIO_TRANSPORTE);
      expect(result.salaryType).toBe(SalaryType.ORDINARIO);

      // Should have 4 benefit items
      expect(result.benefits).toHaveLength(4);

      const concepts = result.benefits.map((b) => b.concept);
      expect(concepts).toContain('Prima de servicios');
      expect(concepts).toContain('Cesantias');
      expect(concepts).toContain('Intereses sobre cesantias');
      expect(concepts).toContain('Vacaciones');

      // All amounts should be positive
      for (const benefit of result.benefits) {
        expect(benefit.amount).toBeGreaterThan(0);
        expect(benefit.formula).toBeDefined();
      }

      // Total should be sum of all benefits
      const expectedTotal = result.benefits.reduce(
        (sum, b) => sum + b.amount,
        0,
      );
      expect(result.totalBenefits).toBe(expectedTotal);
    });

    it('should return empty benefits for integral salary', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockIntegralEmployee);

      const result = await service.getLiquidationPreview('emp-2');

      expect(result.benefits).toHaveLength(0);
      expect(result.totalBenefits).toBe(0);
      expect(result.salaryType).toBe(SalaryType.INTEGRAL);
    });

    it('should subtract accumulated provisions from net payable', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      // Mock accumulated provisions
      prisma.payrollEntry.aggregate.mockResolvedValue({
        _sum: {
          provisionPrima: BigInt(500_000),
          provisionCesantias: BigInt(500_000),
          provisionIntereses: BigInt(5_000),
          provisionVacaciones: BigInt(250_000),
        },
      });

      const result = await service.getLiquidationPreview(
        'emp-1',
        new Date(2026, 1, 24), // Feb 24 2026 (local)
      );

      expect(result.accumulatedProvisions.prima).toBe(500_000);
      expect(result.accumulatedProvisions.cesantias).toBe(500_000);
      expect(result.accumulatedProvisions.intereses).toBe(5_000);
      expect(result.accumulatedProvisions.vacaciones).toBe(250_000);
      expect(result.accumulatedProvisions.total).toBe(1_255_000);

      expect(result.netPayable).toBe(result.totalBenefits - 1_255_000);
    });

    it('should use current date when no termination date provided', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      const result = await service.getLiquidationPreview('emp-1');

      expect(result.endDate).toBeDefined();
      expect(result.totalDaysWorked).toBeGreaterThan(0);
    });

    it('should calculate prima for current semester only', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      // Terminate in February (first semester)
      const terminationDate = new Date(2026, 1, 24); // Feb 24 2026 (local)
      const result = await service.getLiquidationPreview(
        'emp-1',
        terminationDate,
      );

      const prima = result.benefits.find(
        (b) => b.concept === 'Prima de servicios',
      );
      expect(prima).toBeDefined();
      // Days from Jan 1 to Feb 24: (1-0)*30 + (24-1) = 53 days (360-day convention)
      expect(prima!.days).toBe(53);
    });

    it('should calculate cesantias for current year only', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      const terminationDate = new Date(2026, 1, 24); // Feb 24 2026 (local)
      const result = await service.getLiquidationPreview(
        'emp-1',
        terminationDate,
      );

      const cesantias = result.benefits.find(
        (b) => b.concept === 'Cesantias',
      );
      expect(cesantias).toBeDefined();
      // From Jan 1 2026 to Feb 24 2026 = (1-0)*30 + (24-1) = 53 days
      expect(cesantias!.days).toBe(53);
    });

    it('should calculate vacaciones based on total days of service', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 0, 1), // Jan 1 2025 (local)
      });

      const terminationDate = new Date(2026, 1, 24); // Feb 24 2026 (local)
      const result = await service.getLiquidationPreview(
        'emp-1',
        terminationDate,
      );

      const vacaciones = result.benefits.find(
        (b) => b.concept === 'Vacaciones',
      );
      expect(vacaciones).toBeDefined();
      // Total days from Jan 1 2025 to Feb 24 2026 (360-day convention):
      // y1=2025, m1=0 (Jan), d1=min(1,30)=1
      // y2=2026, m2=1 (Feb), d2=min(24,30)=24
      // days = (2026-2025)*360 + (1-0)*30 + (24-1) = 360 + 30 + 23 = 413
      expect(vacaciones!.days).toBe(413);

      // Vacaciones = baseSalary * totalDays / 720
      const expectedVacaciones = Math.round((SMMLV * 413) / 720);
      expect(vacaciones!.amount).toBe(expectedVacaciones);
    });

    it('should handle new employee with start date in current year', async () => {
      const startDate = new Date(2026, 1, 1); // Feb 1 2026 (local)
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate,
      });

      const terminationDate = new Date(2026, 1, 24); // Feb 24 2026 (local)
      const result = await service.getLiquidationPreview(
        'emp-1',
        terminationDate,
      );

      // All benefit periods should be capped to start date
      const prima = result.benefits.find(
        (b) => b.concept === 'Prima de servicios',
      );
      const cesantias = result.benefits.find(
        (b) => b.concept === 'Cesantias',
      );

      // From Feb 1 to Feb 24 = (24-1) = 23 days (360-day convention)
      expect(prima!.days).toBe(23);
      expect(cesantias!.days).toBe(23);
    });

    it('should include formula descriptions for each benefit', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        ...mockEmployee,
        startDate: new Date(2025, 5, 1), // Jun 1 2025 (local)
      });

      const result = await service.getLiquidationPreview(
        'emp-1',
        new Date(2026, 1, 24), // Feb 24 2026 (local)
      );

      for (const benefit of result.benefits) {
        expect(benefit.formula).toBeTruthy();
        expect(benefit.formula.length).toBeGreaterThan(0);
      }
    });
  });
});
