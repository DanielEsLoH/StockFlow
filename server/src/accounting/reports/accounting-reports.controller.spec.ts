import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException } from '@nestjs/common';
import { AccountingReportsController } from './accounting-reports.controller';
import { AccountingReportsService } from './accounting-reports.service';
import { JwtAuthGuard } from '../../auth';
import { PermissionsGuard } from '../../common';

const mockTrialBalance = { accounts: [], totalDebit: 0, totalCredit: 0 };
const mockGeneralJournal = { entries: [] };
const mockGeneralLedger = { accounts: [] };
const mockBalanceSheet = { assets: [], liabilities: [], equity: [] };
const mockIncomeStatement = { revenue: [], expenses: [], netIncome: 0 };
const mockCashFlow = { operating: [], investing: [], financing: [] };

describe('AccountingReportsController', () => {
  let controller: AccountingReportsController;
  let service: jest.Mocked<AccountingReportsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      getTrialBalance: jest.fn().mockResolvedValue(mockTrialBalance),
      getGeneralJournal: jest.fn().mockResolvedValue(mockGeneralJournal),
      getGeneralLedger: jest.fn().mockResolvedValue(mockGeneralLedger),
      getBalanceSheet: jest.fn().mockResolvedValue(mockBalanceSheet),
      getIncomeStatement: jest.fn().mockResolvedValue(mockIncomeStatement),
      getCashFlow: jest.fn().mockResolvedValue(mockCashFlow),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountingReportsController],
      providers: [
        { provide: AccountingReportsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountingReportsController>(AccountingReportsController);
    service = module.get(AccountingReportsService);

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

  // ─── TRIAL BALANCE ─────────────────────────────────────────────
  describe('getTrialBalance', () => {
    it('should use current date when no asOfDate provided', async () => {
      await controller.getTrialBalance();

      expect(service.getTrialBalance).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should parse asOfDate string', async () => {
      await controller.getTrialBalance('2025-06-15');

      const calledDate = service.getTrialBalance.mock.calls[0][0] as Date;
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(5); // June = 5
      expect(calledDate.getDate()).toBe(15);
    });

    it('should throw BadRequestException for invalid date', async () => {
      await expect(controller.getTrialBalance('not-a-date')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── GENERAL JOURNAL ──────────────────────────────────────────
  describe('getGeneralJournal', () => {
    it('should parse dates and delegate to service', async () => {
      await controller.getGeneralJournal('2025-01-01', '2025-01-31');

      expect(service.getGeneralJournal).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should throw BadRequestException when fromDate is missing', async () => {
      await expect(
        controller.getGeneralJournal(undefined as any, '2025-01-31'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when toDate is missing', async () => {
      await expect(
        controller.getGeneralJournal('2025-01-01', undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when fromDate > toDate', async () => {
      await expect(
        controller.getGeneralJournal('2025-12-31', '2025-01-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid date format', async () => {
      await expect(
        controller.getGeneralJournal('invalid', '2025-01-31'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── GENERAL LEDGER ───────────────────────────────────────────
  describe('getGeneralLedger', () => {
    it('should delegate to service with dates', async () => {
      await controller.getGeneralLedger('2025-01-01', '2025-01-31');

      expect(service.getGeneralLedger).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        undefined,
      );
    });

    it('should pass accountId filter', async () => {
      await controller.getGeneralLedger('2025-01-01', '2025-01-31', 'acc-123');

      expect(service.getGeneralLedger).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'acc-123',
      );
    });

    it('should throw BadRequestException for invalid date range', async () => {
      await expect(
        controller.getGeneralLedger('2025-12-31', '2025-01-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── BALANCE SHEET ─────────────────────────────────────────────
  describe('getBalanceSheet', () => {
    it('should use current date when no asOfDate provided', async () => {
      await controller.getBalanceSheet();

      expect(service.getBalanceSheet).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should parse asOfDate', async () => {
      await controller.getBalanceSheet('2025-12-31');

      const calledDate = service.getBalanceSheet.mock.calls[0][0] as Date;
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(11); // December = 11
    });

    it('should throw BadRequestException for invalid date', async () => {
      await expect(controller.getBalanceSheet('garbage')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── INCOME STATEMENT ─────────────────────────────────────────
  describe('getIncomeStatement', () => {
    it('should delegate to service with parsed dates', async () => {
      await controller.getIncomeStatement('2025-01-01', '2025-12-31');

      expect(service.getIncomeStatement).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should throw BadRequestException for invalid range', async () => {
      await expect(
        controller.getIncomeStatement('2025-06-30', '2025-01-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── CASH FLOW ─────────────────────────────────────────────────
  describe('getCashFlow', () => {
    it('should delegate to service with parsed dates', async () => {
      await controller.getCashFlow('2025-01-01', '2025-12-31');

      expect(service.getCashFlow).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should throw BadRequestException for missing dates', async () => {
      await expect(
        controller.getCashFlow(undefined as any, '2025-12-31'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid range', async () => {
      await expect(
        controller.getCashFlow('2025-12-31', '2025-01-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
