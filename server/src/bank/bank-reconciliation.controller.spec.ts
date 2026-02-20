import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockReconciliationResult = {
  matched: 5,
  unmatched: 2,
  total: 7,
};

describe('BankReconciliationController', () => {
  let controller: BankReconciliationController;
  let service: jest.Mocked<BankReconciliationService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      autoMatch: jest.fn().mockResolvedValue(mockReconciliationResult),
      manualMatch: jest.fn().mockResolvedValue(undefined),
      unmatch: jest.fn().mockResolvedValue(undefined),
      finalize: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankReconciliationController],
      providers: [
        { provide: BankReconciliationService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BankReconciliationController>(BankReconciliationController);
    service = module.get(BankReconciliationService);

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

  // ─── AUTO-MATCH ────────────────────────────────────────────────
  describe('autoMatch', () => {
    it('should delegate to service with statementId', async () => {
      const result = await controller.autoMatch('stmt-123');

      expect(result).toEqual(mockReconciliationResult);
      expect(service.autoMatch).toHaveBeenCalledWith('stmt-123');
    });

    it('should propagate NotFoundException', async () => {
      service.autoMatch.mockRejectedValue(new NotFoundException());

      await expect(controller.autoMatch('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── MANUAL-MATCH ──────────────────────────────────────────────
  describe('manualMatch', () => {
    it('should delegate to service and return success message', async () => {
      const req = { user: { id: 'user-1' } };
      const result = await controller.manualMatch('line-1', 'je-1', req);

      expect(result).toEqual({ message: 'Linea conciliada exitosamente' });
      expect(service.manualMatch).toHaveBeenCalledWith('line-1', 'je-1', 'user-1');
    });

    it('should handle missing user in request', async () => {
      const req = { user: undefined };
      const result = await controller.manualMatch('line-1', 'je-1', req);

      expect(result).toEqual({ message: 'Linea conciliada exitosamente' });
      expect(service.manualMatch).toHaveBeenCalledWith('line-1', 'je-1', undefined);
    });

    it('should propagate NotFoundException', async () => {
      service.manualMatch.mockRejectedValue(new NotFoundException());

      const req = { user: { id: 'user-1' } };
      await expect(controller.manualMatch('line-1', 'je-1', req)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UNMATCH ───────────────────────────────────────────────────
  describe('unmatch', () => {
    it('should delegate to service and return success message', async () => {
      const result = await controller.unmatch('line-1');

      expect(result).toEqual({ message: 'Conciliacion deshecha exitosamente' });
      expect(service.unmatch).toHaveBeenCalledWith('line-1');
    });

    it('should propagate BadRequestException', async () => {
      service.unmatch.mockRejectedValue(new BadRequestException());

      await expect(controller.unmatch('line-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FINALIZE ──────────────────────────────────────────────────
  describe('finalize', () => {
    it('should delegate to service and return success message', async () => {
      const result = await controller.finalize('stmt-123');

      expect(result).toEqual({ message: 'Conciliacion finalizada exitosamente' });
      expect(service.finalize).toHaveBeenCalledWith('stmt-123');
    });

    it('should propagate BadRequestException', async () => {
      service.finalize.mockRejectedValue(new BadRequestException());

      await expect(controller.finalize('stmt-123')).rejects.toThrow(BadRequestException);
    });
  });
});
