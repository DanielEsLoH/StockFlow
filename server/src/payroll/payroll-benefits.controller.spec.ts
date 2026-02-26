import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PayrollBenefitsController } from './payroll-benefits.controller';
import { PayrollBenefitsService } from './services/payroll-benefits.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

describe('PayrollBenefitsController', () => {
  let controller: PayrollBenefitsController;
  let service: jest.Mocked<PayrollBenefitsService>;

  const mockPreview = {
    employeeId: 'emp-1',
    employeeName: 'Juan Pérez',
    prima: { accrued: 180000, paid: 0, pending: 180000 },
    cesantias: { accrued: 180000, paid: 0, pending: 180000 },
    intereses: { accrued: 21600, paid: 0, pending: 21600 },
    vacaciones: { accrued: 83333, paid: 0, pending: 83333 },
    totalPending: 464933,
  };

  const mockBenefitPayment = {
    benefitType: 'PRIMA',
    amount: 180000,
    daysAccrued: 180,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      getLiquidationPreview: jest.fn(),
      calculateBenefitPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollBenefitsController],
      providers: [
        { provide: PayrollBenefitsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollBenefitsController>(
      PayrollBenefitsController,
    );
    service = module.get(PayrollBenefitsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getBenefitsPreview', () => {
    it('should return benefits preview for employee', async () => {
      service.getLiquidationPreview.mockResolvedValue(mockPreview as any);

      const result = await controller.getBenefitsPreview('emp-1');

      expect(result).toEqual(mockPreview);
      expect(service.getLiquidationPreview).toHaveBeenCalledWith('emp-1');
    });

    it('should propagate NotFoundException', async () => {
      service.getLiquidationPreview.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.getBenefitsPreview('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateBenefitPayment', () => {
    it('should calculate benefit payment', async () => {
      service.calculateBenefitPayment.mockResolvedValue(
        mockBenefitPayment as any,
      );

      const dto = {
        benefitType: 'PRIMA' as any,
        paymentDate: '2024-06-30',
      };

      const result = await controller.calculateBenefitPayment('emp-1', dto);

      expect(result).toEqual(mockBenefitPayment);
      expect(service.calculateBenefitPayment).toHaveBeenCalledWith(
        'emp-1',
        'PRIMA',
        expect.any(Date),
      );
    });

    it('should use current date when paymentDate not provided', async () => {
      service.calculateBenefitPayment.mockResolvedValue(
        mockBenefitPayment as any,
      );

      const dto = { benefitType: 'PRIMA' as any };

      await controller.calculateBenefitPayment('emp-1', dto);

      expect(service.calculateBenefitPayment).toHaveBeenCalledWith(
        'emp-1',
        'PRIMA',
        expect.any(Date),
      );
    });
  });

  describe('calculateLiquidation', () => {
    it('should calculate liquidation with termination date', async () => {
      service.getLiquidationPreview.mockResolvedValue(mockPreview as any);

      const dto = { terminationDate: '2024-12-31' };

      const result = await controller.calculateLiquidation('emp-1', dto);

      expect(result).toEqual(mockPreview);
      expect(service.getLiquidationPreview).toHaveBeenCalledWith(
        'emp-1',
        expect.any(Date),
      );
    });

    it('should calculate liquidation without termination date', async () => {
      service.getLiquidationPreview.mockResolvedValue(mockPreview as any);

      const dto = {};

      await controller.calculateLiquidation('emp-1', dto);

      expect(service.getLiquidationPreview).toHaveBeenCalledWith(
        'emp-1',
        undefined,
      );
    });
  });
});
