import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { PayrollPeriodsService } from './payroll-periods.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

describe('PayrollPeriodsController', () => {
  let controller: PayrollPeriodsController;
  let service: jest.Mocked<PayrollPeriodsService>;

  const mockPeriodResponse = {
    id: 'period-1',
    name: 'Enero 2024',
    status: 'DRAFT',
  };

  const mockPaginatedResponse = {
    data: [mockPeriodResponse],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      calculatePeriod: jest.fn(),
      approvePeriod: jest.fn(),
      closePeriod: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollPeriodsController],
      providers: [{ provide: PayrollPeriodsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollPeriodsController>(
      PayrollPeriodsController,
    );
    service = module.get(PayrollPeriodsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated periods', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse as any);

      const result = await controller.findAll(1, 20);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('findOne', () => {
    it('should return period with entries', async () => {
      service.findOne.mockResolvedValue(mockPeriodResponse as any);

      const result = await controller.findOne('period-1');

      expect(result).toEqual(mockPeriodResponse);
      expect(service.findOne).toHaveBeenCalledWith('period-1');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a payroll period', async () => {
      const dto = {
        name: 'Enero 2024',
        startDate: '2024-01-01' as any,
        endDate: '2024-01-31' as any,
        paymentDate: '2024-01-31' as any,
        periodType: 'MONTHLY' as any,
      };
      service.create.mockResolvedValue(mockPeriodResponse as any);

      const result = await controller.create(dto);

      expect(result).toEqual(mockPeriodResponse);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('calculate', () => {
    it('should calculate period entries', async () => {
      service.calculatePeriod.mockResolvedValue(mockPeriodResponse as any);

      const result = await controller.calculate('period-1');

      expect(result).toEqual(mockPeriodResponse);
      expect(service.calculatePeriod).toHaveBeenCalledWith('period-1');
    });
  });

  describe('approve', () => {
    it('should approve period with userId', async () => {
      service.approvePeriod.mockResolvedValue(mockPeriodResponse as any);

      const result = await controller.approve('period-1', 'user-123');

      expect(result).toEqual(mockPeriodResponse);
      expect(service.approvePeriod).toHaveBeenCalledWith(
        'period-1',
        'user-123',
      );
    });
  });

  describe('close', () => {
    it('should close a period', async () => {
      service.closePeriod.mockResolvedValue(mockPeriodResponse as any);

      const result = await controller.close('period-1');

      expect(result).toEqual(mockPeriodResponse);
      expect(service.closePeriod).toHaveBeenCalledWith('period-1');
    });
  });
});
