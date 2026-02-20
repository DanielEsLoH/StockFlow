import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AccountingPeriodsController } from './accounting-periods.controller';
import { AccountingPeriodsService } from './accounting-periods.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockPeriod = {
  id: 'period-123',
  name: 'Enero 2025',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  status: 'OPEN',
};

describe('AccountingPeriodsController', () => {
  let controller: AccountingPeriodsController;
  let service: jest.Mocked<AccountingPeriodsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn().mockResolvedValue([mockPeriod]),
      findOne: jest.fn().mockResolvedValue(mockPeriod),
      create: jest.fn().mockResolvedValue(mockPeriod),
      closePeriod: jest.fn().mockResolvedValue({ ...mockPeriod, status: 'CLOSED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountingPeriodsController],
      providers: [
        { provide: AccountingPeriodsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountingPeriodsController>(AccountingPeriodsController);
    service = module.get(AccountingPeriodsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ─── FINDALL ───────────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to service', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockPeriod]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to service', async () => {
      const result = await controller.findOne('period-123');

      expect(result).toEqual(mockPeriod);
      expect(service.findOne).toHaveBeenCalledWith('period-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      name: 'Febrero 2025',
      startDate: '2025-02-01',
      endDate: '2025-02-28',
    } as any;

    it('should delegate to service', async () => {
      const result = await controller.create(dto);

      expect(result).toEqual(mockPeriod);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should propagate ConflictException for overlapping period', async () => {
      service.create.mockRejectedValue(new ConflictException());

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ─── CLOSEPERIOD ──────────────────────────────────────────────
  describe('closePeriod', () => {
    it('should delegate to service with id and userId', async () => {
      const req = { user: { id: 'user-1' } };
      const result = await controller.closePeriod('period-123', req);

      expect(result).toEqual({ ...mockPeriod, status: 'CLOSED' });
      expect(service.closePeriod).toHaveBeenCalledWith('period-123', 'user-1');
    });

    it('should handle missing user in request', async () => {
      const req = { user: undefined };
      await controller.closePeriod('period-123', req);

      expect(service.closePeriod).toHaveBeenCalledWith('period-123', undefined);
    });

    it('should propagate BadRequestException for draft entries', async () => {
      service.closePeriod.mockRejectedValue(new BadRequestException());

      const req = { user: { id: 'user-1' } };
      await expect(controller.closePeriod('period-123', req)).rejects.toThrow(BadRequestException);
    });
  });
});
