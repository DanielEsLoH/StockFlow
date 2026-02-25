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
const mockARAgingReport = { asOfDate: '2025-01-01', rows: [], totals: { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, totalOverdue: 0, totalBalance: 0 } };
const mockIvaDeclaration = { year: 2026, bimonthlyPeriod: 1, salesByRate: [], netIvaPayable: 0 };
const mockReteFuenteSummary = { year: 2026, month: 2, rows: [], totalWithheld: 0 };
const mockYtdTaxSummary = { year: 2026, ivaGeneradoYtd: 0, netIvaYtd: 0 };
const mockAPAgingReport = { asOfDate: '2025-01-01', rows: [], totals: { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, totalOverdue: 0, totalBalance: 0 } };

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
      getARAgingReport: jest.fn().mockResolvedValue(mockARAgingReport),
      getAPAgingReport: jest.fn().mockResolvedValue(mockAPAgingReport),
      getIvaDeclaration: jest.fn().mockResolvedValue(mockIvaDeclaration),
      getReteFuenteSummary: jest.fn().mockResolvedValue(mockReteFuenteSummary),
      getYtdTaxSummary: jest.fn().mockResolvedValue(mockYtdTaxSummary),
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

  // ─── AR AGING ─────────────────────────────────────────────────
  describe('getARAgingReport', () => {
    it('should use current date when no asOfDate provided', async () => {
      await controller.getARAgingReport();

      expect(service.getARAgingReport).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should parse asOfDate string', async () => {
      await controller.getARAgingReport('2025-06-15');

      const calledDate = service.getARAgingReport.mock.calls[0][0] as Date;
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(5);
      expect(calledDate.getDate()).toBe(15);
    });

    it('should throw BadRequestException for invalid date', async () => {
      await expect(controller.getARAgingReport('not-a-date')).rejects.toThrow(BadRequestException);
    });

    it('should return the service result', async () => {
      const result = await controller.getARAgingReport();

      expect(result).toBe(mockARAgingReport);
    });
  });

  // ─── AP AGING ─────────────────────────────────────────────────
  describe('getAPAgingReport', () => {
    it('should use current date when no asOfDate provided', async () => {
      await controller.getAPAgingReport();

      expect(service.getAPAgingReport).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should parse asOfDate string', async () => {
      await controller.getAPAgingReport('2025-03-20');

      const calledDate = service.getAPAgingReport.mock.calls[0][0] as Date;
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(2);
      expect(calledDate.getDate()).toBe(20);
    });

    it('should throw BadRequestException for invalid date', async () => {
      await expect(controller.getAPAgingReport('invalid')).rejects.toThrow(BadRequestException);
    });

    it('should return the service result', async () => {
      const result = await controller.getAPAgingReport();

      expect(result).toBe(mockAPAgingReport);
    });
  });

  // ─── IVA DECLARATION ─────────────────────────────────────────
  describe('getIvaDeclaration', () => {
    it('should parse year and period and delegate to service', async () => {
      await controller.getIvaDeclaration('2026', '1');

      expect(service.getIvaDeclaration).toHaveBeenCalledWith(2026, 1);
    });

    it('should throw BadRequestException for invalid year', async () => {
      await expect(controller.getIvaDeclaration('abc', '1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid period', async () => {
      await expect(controller.getIvaDeclaration('2026', '7')).rejects.toThrow(BadRequestException);
      await expect(controller.getIvaDeclaration('2026', '0')).rejects.toThrow(BadRequestException);
    });

    it('should return the service result', async () => {
      const result = await controller.getIvaDeclaration('2026', '1');

      expect(result).toBe(mockIvaDeclaration);
    });
  });

  // ─── RETEFUENTE SUMMARY ──────────────────────────────────────
  describe('getReteFuenteSummary', () => {
    it('should parse year and month and delegate to service', async () => {
      await controller.getReteFuenteSummary('2026', '2');

      expect(service.getReteFuenteSummary).toHaveBeenCalledWith(2026, 2);
    });

    it('should throw BadRequestException for invalid month', async () => {
      await expect(controller.getReteFuenteSummary('2026', '13')).rejects.toThrow(BadRequestException);
      await expect(controller.getReteFuenteSummary('2026', '0')).rejects.toThrow(BadRequestException);
    });

    it('should return the service result', async () => {
      const result = await controller.getReteFuenteSummary('2026', '2');

      expect(result).toBe(mockReteFuenteSummary);
    });
  });

  // ─── YTD TAX SUMMARY ─────────────────────────────────────────
  describe('getYtdTaxSummary', () => {
    it('should parse year and delegate to service', async () => {
      await controller.getYtdTaxSummary('2026');

      expect(service.getYtdTaxSummary).toHaveBeenCalledWith(2026);
    });

    it('should throw BadRequestException for invalid year', async () => {
      await expect(controller.getYtdTaxSummary('abc')).rejects.toThrow(BadRequestException);
    });

    it('should return the service result', async () => {
      const result = await controller.getYtdTaxSummary('2026');

      expect(result).toBe(mockYtdTaxSummary);
    });
  });
});
