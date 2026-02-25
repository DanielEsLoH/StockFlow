import { Test, TestingModule } from '@nestjs/testing';
import {
  PayrollCalculationService,
  PayrollCalculationParams,
  OVERTIME_MULTIPLIERS,
} from './payroll-calculation.service';
import { ARLRiskLevel, SalaryType } from '@prisma/client';

// 2026 values
const SMMLV = 1_423_500;
const AUXILIO_TRANSPORTE = 200_000;
const UVT_VALUE = 49_799;

const baseParams: PayrollCalculationParams = {
  baseSalary: SMMLV,
  salaryType: SalaryType.ORDINARIO,
  daysWorked: 30,
  arlRiskLevel: ARLRiskLevel.LEVEL_I,
  auxilioTransporte: true,
  smmlv: SMMLV,
  auxilioTransporteVal: AUXILIO_TRANSPORTE,
  uvtValue: UVT_VALUE,
};

describe('PayrollCalculationService', () => {
  let service: PayrollCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollCalculationService],
    }).compile();

    service = module.get<PayrollCalculationService>(PayrollCalculationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== SUELDO =====
  describe('calculateSueldo', () => {
    it('should return full salary for 30 days', () => {
      expect(service.calculateSueldo(SMMLV, 30)).toBe(SMMLV);
    });

    it('should prorate for partial month (15 days)', () => {
      expect(service.calculateSueldo(SMMLV, 15)).toBe(Math.round(SMMLV / 2));
    });

    it('should return 0 for 0 days', () => {
      expect(service.calculateSueldo(SMMLV, 0)).toBe(0);
    });

    it('should return full salary for days >= 30', () => {
      expect(service.calculateSueldo(SMMLV, 31)).toBe(SMMLV);
    });
  });

  // ===== AUXILIO DE TRANSPORTE =====
  describe('calculateAuxilioTransporte', () => {
    it('should return full auxilio for 30 days when eligible', () => {
      expect(service.calculateAuxilioTransporte(true, AUXILIO_TRANSPORTE, 30)).toBe(
        AUXILIO_TRANSPORTE,
      );
    });

    it('should prorate for partial month', () => {
      expect(service.calculateAuxilioTransporte(true, AUXILIO_TRANSPORTE, 15)).toBe(
        Math.round(AUXILIO_TRANSPORTE / 2),
      );
    });

    it('should return 0 when not eligible', () => {
      expect(service.calculateAuxilioTransporte(false, AUXILIO_TRANSPORTE, 30)).toBe(0);
    });
  });

  // ===== OVERTIME =====
  describe('calculateOvertime', () => {
    const hourlyRate = SMMLV / 240;

    it('should calculate HED (hora extra diurna) at 1.25x', () => {
      const result = service.calculateOvertime(SMMLV, [{ type: 'HED', hours: 1 }]);
      expect(result).toBe(Math.round(hourlyRate * 1.25));
    });

    it('should calculate HEN (hora extra nocturna) at 1.75x', () => {
      const result = service.calculateOvertime(SMMLV, [{ type: 'HEN', hours: 1 }]);
      expect(result).toBe(Math.round(hourlyRate * 1.75));
    });

    it('should calculate HDD (hora dominical diurna) at 2.0x', () => {
      const result = service.calculateOvertime(SMMLV, [{ type: 'HDD', hours: 1 }]);
      expect(result).toBe(Math.round(hourlyRate * 2.0));
    });

    it('should calculate HDN (hora dominical nocturna) at 2.5x', () => {
      const result = service.calculateOvertime(SMMLV, [{ type: 'HDN', hours: 1 }]);
      expect(result).toBe(Math.round(hourlyRate * 2.5));
    });

    it('should calculate HEDDF at 2.5x', () => {
      const result = service.calculateOvertime(SMMLV, [{ type: 'HEDDF', hours: 1 }]);
      expect(result).toBe(Math.round(hourlyRate * 2.5));
    });

    it('should calculate HENDF at 2.75x', () => {
      const result = service.calculateOvertime(SMMLV, [{ type: 'HENDF', hours: 1 }]);
      expect(result).toBe(Math.round(hourlyRate * 2.75));
    });

    it('should sum multiple overtime types', () => {
      const result = service.calculateOvertime(SMMLV, [
        { type: 'HED', hours: 2 },
        { type: 'HEN', hours: 3 },
      ]);
      const expected = Math.round(hourlyRate * 1.25 * 2 + hourlyRate * 1.75 * 3);
      expect(result).toBe(expected);
    });

    it('should return 0 for empty overtime', () => {
      expect(service.calculateOvertime(SMMLV, [])).toBe(0);
    });
  });

  // ===== IBC =====
  describe('calculateIBC', () => {
    it('should exclude auxilio transporte from IBC', () => {
      const totalDev = SMMLV + AUXILIO_TRANSPORTE;
      expect(service.calculateIBC(totalDev, AUXILIO_TRANSPORTE)).toBe(SMMLV);
    });

    it('should include overtime in IBC', () => {
      const totalDev = SMMLV + AUXILIO_TRANSPORTE + 100_000;
      expect(service.calculateIBC(totalDev, AUXILIO_TRANSPORTE)).toBe(SMMLV + 100_000);
    });
  });

  describe('calculateIBCIntegral', () => {
    it('should calculate IBC as 70% of integral salary', () => {
      const integralSalary = 18_505_500;
      expect(service.calculateIBCIntegral(integralSalary, 30)).toBe(
        Math.round(integralSalary * 0.7),
      );
    });

    it('should prorate IBC integral for partial month', () => {
      const integralSalary = 18_505_500;
      expect(service.calculateIBCIntegral(integralSalary, 15)).toBe(
        Math.round((integralSalary * 0.7 / 30) * 15),
      );
    });
  });

  // ===== FONDO DE SOLIDARIDAD =====
  describe('calculateFondoSolidaridad', () => {
    it('should return 0 when IBC <= 4 SMMLV', () => {
      const ibc = 4 * SMMLV;
      expect(service.calculateFondoSolidaridad(ibc, SMMLV)).toBe(0);
    });

    it('should apply 1% for IBC > 4 SMMLV but < 16 SMMLV', () => {
      const ibc = 5 * SMMLV;
      expect(service.calculateFondoSolidaridad(ibc, SMMLV)).toBe(
        Math.round(ibc * 0.01),
      );
    });

    it('should apply 1% + 0.2% for IBC between 16-17 SMMLV', () => {
      const ibc = 16.5 * SMMLV;
      expect(service.calculateFondoSolidaridad(ibc, SMMLV)).toBe(
        Math.round(ibc * 0.012),
      );
    });

    it('should apply 1% + 1% for IBC >= 20 SMMLV', () => {
      const ibc = 25 * SMMLV;
      expect(service.calculateFondoSolidaridad(ibc, SMMLV)).toBe(
        Math.round(ibc * 0.02),
      );
    });

    it('should return 0 for minimum salary', () => {
      expect(service.calculateFondoSolidaridad(SMMLV, SMMLV)).toBe(0);
    });
  });

  // ===== RETENCION EN LA FUENTE =====
  describe('calculateRetencionFuente', () => {
    it('should return 0 for minimum salary', () => {
      const result = service.calculateRetencionFuente(
        SMMLV + AUXILIO_TRANSPORTE,
        AUXILIO_TRANSPORTE,
        Math.round(SMMLV * 0.04),
        Math.round(SMMLV * 0.04),
        0,
        UVT_VALUE,
      );
      expect(result).toBe(0);
    });

    it('should apply retention for high salary', () => {
      const salary = 10_000_000;
      const saludEmp = Math.round(salary * 0.04);
      const pensionEmp = Math.round(salary * 0.04);
      const fondoSol = Math.round(salary * 0.01);

      const result = service.calculateRetencionFuente(
        salary,
        0,
        saludEmp,
        pensionEmp,
        fondoSol,
        UVT_VALUE,
      );

      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when net base is negative', () => {
      const result = service.calculateRetencionFuente(
        100_000,
        AUXILIO_TRANSPORTE,
        10_000,
        10_000,
        0,
        UVT_VALUE,
      );
      expect(result).toBe(0);
    });
  });

  // ===== FULL CALCULATION: SALARIO MÍNIMO =====
  describe('full calculation - minimum salary', () => {
    it('should calculate correctly for SMMLV with auxilio', () => {
      const result = service.calculatePayrollEntry(baseParams);

      expect(result.sueldo).toBe(SMMLV);
      expect(result.auxilioTransporte).toBe(AUXILIO_TRANSPORTE);
      expect(result.horasExtras).toBe(0);
      expect(result.totalDevengados).toBe(SMMLV + AUXILIO_TRANSPORTE);

      // IBC should exclude auxilio
      expect(result.ibc).toBe(SMMLV);

      // Deducciones
      expect(result.saludEmpleado).toBe(Math.round(SMMLV * 0.04));
      expect(result.pensionEmpleado).toBe(Math.round(SMMLV * 0.04));
      expect(result.fondoSolidaridad).toBe(0);
      expect(result.retencionFuente).toBe(0);

      // Aportes empleador
      expect(result.saludEmpleador).toBe(Math.round(SMMLV * 0.085));
      expect(result.pensionEmpleador).toBe(Math.round(SMMLV * 0.12));
      expect(result.arlEmpleador).toBe(Math.round(SMMLV * 0.00522));
      expect(result.cajaEmpleador).toBe(Math.round(SMMLV * 0.04));
      expect(result.senaEmpleador).toBe(Math.round(SMMLV * 0.02));
      expect(result.icbfEmpleador).toBe(Math.round(SMMLV * 0.03));

      // Provisiones (base = baseSalary + auxilioTransporte for prima/cesantias)
      const benefitBase = SMMLV + AUXILIO_TRANSPORTE;
      expect(result.provisionPrima).toBe(Math.round(benefitBase / 12));
      expect(result.provisionCesantias).toBe(Math.round(benefitBase / 12));
      // Vacaciones base = baseSalary only (no auxilio)
      expect(result.provisionVacaciones).toBe(Math.round(SMMLV / 24));

      // Neto
      expect(result.totalNeto).toBe(result.totalDevengados - result.totalDeducciones);
    });
  });

  // ===== FULL CALCULATION: SALARY > 2 SMMLV =====
  describe('full calculation - salary > 2 SMMLV', () => {
    it('should not include auxilio for salary above threshold', () => {
      const result = service.calculatePayrollEntry({
        ...baseParams,
        baseSalary: 3_000_000,
        auxilioTransporte: false,
      });

      expect(result.auxilioTransporte).toBe(0);
      expect(result.sueldo).toBe(3_000_000);
      expect(result.ibc).toBe(3_000_000);
    });
  });

  // ===== FULL CALCULATION: INTEGRAL SALARY =====
  describe('full calculation - integral salary', () => {
    const integralSalary = 18_505_500; // 13 SMMLV

    it('should calculate correctly for integral salary', () => {
      const result = service.calculatePayrollEntry({
        ...baseParams,
        baseSalary: integralSalary,
        salaryType: SalaryType.INTEGRAL,
        auxilioTransporte: false,
      });

      expect(result.sueldo).toBe(integralSalary);
      expect(result.auxilioTransporte).toBe(0);
      expect(result.horasExtras).toBe(0); // No overtime for integral

      // IBC = 70% of salary
      const expectedIBC = Math.round(integralSalary * 0.7);
      expect(result.ibc).toBe(expectedIBC);

      // Deductions on IBC
      expect(result.saludEmpleado).toBe(Math.round(expectedIBC * 0.04));
      expect(result.pensionEmpleado).toBe(Math.round(expectedIBC * 0.04));

      // Fondo solidaridad applies (IBC > 4 SMMLV)
      expect(result.fondoSolidaridad).toBeGreaterThan(0);

      // No provisions for integral salary
      expect(result.provisionPrima).toBe(0);
      expect(result.provisionCesantias).toBe(0);
      expect(result.provisionIntereses).toBe(0);
      expect(result.provisionVacaciones).toBe(0);
    });

    it('should NOT generate overtime for integral salary', () => {
      const result = service.calculatePayrollEntry({
        ...baseParams,
        baseSalary: integralSalary,
        salaryType: SalaryType.INTEGRAL,
        auxilioTransporte: false,
        overtime: [{ type: 'HED', hours: 10 }],
      });

      expect(result.horasExtras).toBe(0);
    });
  });

  // ===== FULL CALCULATION: WITH OVERTIME =====
  describe('full calculation - with overtime', () => {
    it('should include overtime in devengados and IBC', () => {
      const overtime = [
        { type: 'HED' as const, hours: 5 },
        { type: 'HEN' as const, hours: 3 },
      ];

      const result = service.calculatePayrollEntry({
        ...baseParams,
        overtime,
      });

      const hourlyRate = SMMLV / 240;
      const expectedOvertime = Math.round(
        hourlyRate * 1.25 * 5 + hourlyRate * 1.75 * 3,
      );

      expect(result.horasExtras).toBe(expectedOvertime);
      expect(result.totalDevengados).toBe(SMMLV + AUXILIO_TRANSPORTE + expectedOvertime);
      expect(result.ibc).toBe(SMMLV + expectedOvertime);
    });
  });

  // ===== FULL CALCULATION: PARTIAL MONTH =====
  describe('full calculation - partial month', () => {
    it('should prorate all values for 15 days', () => {
      const result = service.calculatePayrollEntry({
        ...baseParams,
        daysWorked: 15,
      });

      expect(result.sueldo).toBe(Math.round(SMMLV / 2));
      expect(result.auxilioTransporte).toBe(Math.round(AUXILIO_TRANSPORTE / 2));
      expect(result.ibc).toBe(Math.round(SMMLV / 2));
    });
  });

  // ===== ARL LEVELS =====
  describe('ARL risk levels', () => {
    it.each([
      ['LEVEL_I', 0.00522],
      ['LEVEL_II', 0.01044],
      ['LEVEL_III', 0.02436],
      ['LEVEL_IV', 0.0435],
      ['LEVEL_V', 0.0696],
    ])('should apply correct rate for %s', (level, rate) => {
      const result = service.calculatePayrollEntry({
        ...baseParams,
        arlRiskLevel: level as ARLRiskLevel,
      });

      expect(result.arlEmpleador).toBe(Math.round(SMMLV * rate));
    });
  });

  // ===== INCAPACIDAD =====
  describe('calculateIncapacidad', () => {
    it('should pay 100% for first 2 days, 66.67% after', () => {
      const dailyRate = SMMLV / 30;
      const result = service.calculateIncapacidad(SMMLV, 5);
      const expected = Math.round(dailyRate * 2 + dailyRate * (2 / 3) * 3);
      expect(result).toBe(expected);
    });

    it('should pay 100% for only 1 day incapacidad', () => {
      const dailyRate = SMMLV / 30;
      expect(service.calculateIncapacidad(SMMLV, 1)).toBe(Math.round(dailyRate));
    });

    it('should return 0 for 0 days', () => {
      expect(service.calculateIncapacidad(SMMLV, 0)).toBe(0);
    });
  });

  // ===== VACACIONES =====
  describe('calculateVacaciones', () => {
    it('should pay daily rate × days', () => {
      const dailyRate = SMMLV / 30;
      expect(service.calculateVacaciones(SMMLV, 15)).toBe(Math.round(dailyRate * 15));
    });
  });

  // ===== LICENCIA =====
  describe('calculateLicencia', () => {
    it('should pay daily rate × days', () => {
      const dailyRate = SMMLV / 30;
      expect(service.calculateLicencia(SMMLV, 3)).toBe(Math.round(dailyRate * 3));
    });
  });

  // ===== INTEGRAL SALARY VALIDATION =====
  describe('isValidIntegralSalary', () => {
    it('should return true for salary >= 13 SMMLV', () => {
      expect(service.isValidIntegralSalary(13 * SMMLV, SMMLV)).toBe(true);
    });

    it('should return false for salary < 13 SMMLV', () => {
      expect(service.isValidIntegralSalary(12 * SMMLV, SMMLV)).toBe(false);
    });
  });

  // ===== NET PARITY =====
  describe('net calculation parity', () => {
    it('should have totalNeto = totalDevengados - totalDeducciones', () => {
      const result = service.calculatePayrollEntry({
        ...baseParams,
        baseSalary: 5_000_000,
        auxilioTransporte: false,
        overtime: [{ type: 'HED', hours: 10 }],
        bonificaciones: 200_000,
        comisiones: 300_000,
      });

      expect(result.totalNeto).toBe(result.totalDevengados - result.totalDeducciones);
    });
  });

  // ===== PROVISION INTERESES =====
  describe('provision intereses cesantias', () => {
    it('should be 1% of provision cesantias', () => {
      const result = service.calculatePayrollEntry(baseParams);
      expect(result.provisionIntereses).toBe(
        Math.round(result.provisionCesantias * 0.01),
      );
    });
  });
});
