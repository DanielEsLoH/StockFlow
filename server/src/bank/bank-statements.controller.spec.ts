import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { BankStatementsController } from './bank-statements.controller';
import { BankStatementsService } from './bank-statements.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
}));

const mockStatementResponse = {
  id: 'stmt-123',
  bankAccountId: 'bank-acc-123',
  fileName: 'extracto.xlsx',
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-01-31'),
  status: 'IMPORTED',
  totalLines: 5,
  matchedLines: 0,
};

describe('BankStatementsController', () => {
  let controller: BankStatementsController;
  let statementsService: jest.Mocked<BankStatementsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockStatementsService = {
      importLines: jest.fn().mockResolvedValue(mockStatementResponse),
      findByBankAccount: jest.fn().mockResolvedValue([mockStatementResponse]),
      findOne: jest.fn().mockResolvedValue(mockStatementResponse),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankStatementsController],
      providers: [
        { provide: BankStatementsService, useValue: mockStatementsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BankStatementsController>(BankStatementsController);
    statementsService = module.get(BankStatementsService);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
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

  // ─── IMPORT ────────────────────────────────────────────────────
  describe('importStatement', () => {
    const mockDto = {
      bankAccountId: 'bank-acc-123',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
    };

    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'extracto.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Express.Multer.File;

    const mockHeaderRow = { A: 'Fecha', B: 'Descripcion', C: 'Debito', D: 'Credito' };
    const mockDataRow = {
      A: new Date('2025-01-15'),
      B: 'Pago cliente',
      C: 50000,
      D: 0,
    };

    beforeEach(() => {
      (XLSX.read as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        mockDataRow,
      ]);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.importStatement(null as any, mockDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importStatement(null as any, mockDto, 'user-123'),
      ).rejects.toThrow('El archivo es requerido');
    });

    it('should throw BadRequestException when file has no sheets', async () => {
      (XLSX.read as jest.Mock).mockReturnValue({
        SheetNames: [],
        Sheets: {},
      });

      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow('no contiene hojas');
    });

    it('should throw BadRequestException when file has fewer than 2 rows', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([mockHeaderRow]);

      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow('no contiene suficientes filas');
    });

    it('should throw BadRequestException when required columns not found', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { A: 'Column1', B: 'Column2', C: 'Column3', D: 'Column4' },
        { A: 'data', B: 'data', C: 'data', D: 'data' },
      ]);

      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow('No se encontraron las columnas requeridas');
    });

    it('should throw BadRequestException when no valid lines can be parsed', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: null, B: '', C: 0, D: 0 }, // all invalid
      ]);

      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.importStatement(mockFile, mockDto, 'user-123'),
      ).rejects.toThrow('No se pudieron extraer lineas validas');
    });

    it('should call service.importLines with parsed lines on success', async () => {
      await controller.importStatement(mockFile, mockDto, 'user-123');

      expect(statementsService.importLines).toHaveBeenCalledWith(
        'bank-acc-123',
        'extracto.xlsx',
        expect.any(Date),
        expect.any(Date),
        [
          expect.objectContaining({
            lineDate: new Date('2025-01-15'),
            description: 'Pago cliente',
            debit: 50000,
            credit: 0,
          }),
        ],
        'user-123',
      );
    });

    it('should parse Date objects correctly', async () => {
      const date = new Date('2025-03-20');
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: date, B: 'Deposito', C: 0, D: 100000 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].lineDate).toEqual(date);
    });

    it('should parse Excel serial date numbers correctly', async () => {
      // Excel serial number — just verify it produces a valid Date
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: 45658, B: 'Serial date', C: 1000, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].lineDate).toBeInstanceOf(Date);
      expect(lines[0].lineDate.getFullYear()).toBeGreaterThanOrEqual(2024);
    });

    it('should parse string dates correctly', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: '2025-06-15', B: 'String date', C: 500, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].lineDate).toBeInstanceOf(Date);
    });

    it('should skip rows where debit and credit are both 0', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: new Date(), B: 'Zero row', C: 0, D: 0 },
        { A: new Date(), B: 'Valid row', C: 1000, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines).toHaveLength(1);
      expect(lines[0].description).toBe('Valid row');
    });

    it('should skip rows with empty description', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: new Date(), B: '', C: 1000, D: 0 },
        { A: new Date(), B: 'Has desc', C: 500, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines).toHaveLength(1);
      expect(lines[0].description).toBe('Has desc');
    });

    it('should skip rows with invalid dates', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: null, B: 'No date', C: 1000, D: 0 },
        { A: new Date(), B: 'Has date', C: 500, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines).toHaveLength(1);
    });

    it('should parse currency strings removing $ and dots', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: new Date(), B: 'Currency test', C: '$50.000', D: '0' },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].debit).toBe(50000);
    });

    it('should handle comma as decimal separator', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: new Date(), B: 'Comma test', C: '1500,50', D: '0' },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].debit).toBe(1500.50);
    });

    it('should use Math.abs for parsed numbers', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: new Date(), B: 'Negative', C: -5000, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].debit).toBe(5000);
    });

    it('should match columns case-insensitively', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { A: 'FECHA', B: 'DESCRIPCION', C: 'DEBITO', D: 'CREDITO' },
        { A: new Date(), B: 'Upper case', C: 1000, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      expect(statementsService.importLines).toHaveBeenCalled();
    });

    it('should match columns by partial name', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { A: 'Fecha Movimiento', B: 'Descripcion del Movimiento', C: 'Monto Debito', D: 'Monto Credito' },
        { A: new Date(), B: 'Partial match', C: 1000, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      expect(statementsService.importLines).toHaveBeenCalled();
    });

    it('should handle optional reference and balance columns', async () => {
      const dtoWithOptionals = {
        ...mockDto,
        referenceColumn: 'Referencia',
        balanceColumn: 'Saldo',
      };

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { A: 'Fecha', B: 'Descripcion', C: 'Debito', D: 'Credito', E: 'Referencia', F: 'Saldo' },
        { A: new Date(), B: 'With ref', C: 1000, D: 0, E: 'REF-001', F: 50000 },
      ]);

      await controller.importStatement(mockFile, dtoWithOptionals, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].reference).toBe('REF-001');
      expect(lines[0].balance).toBe(50000);
    });

    it('should use custom headerRow offset', async () => {
      const dtoWithHeaderRow = { ...mockDto, headerRow: 3 };

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        mockDataRow,
      ]);

      await controller.importStatement(mockFile, dtoWithHeaderRow, 'user-123');

      expect(XLSX.utils.sheet_to_json).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ range: 3 }),
      );
    });

    it('should use custom column names from dto', async () => {
      const dtoWithCustomCols = {
        ...mockDto,
        dateColumn: 'Fecha Op',
        descriptionColumn: 'Concepto',
        debitColumn: 'Cargo',
        creditColumn: 'Abono',
      };

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { A: 'Fecha Op', B: 'Concepto', C: 'Cargo', D: 'Abono' },
        { A: new Date(), B: 'Custom cols', C: 1000, D: 0 },
      ]);

      await controller.importStatement(mockFile, dtoWithCustomCols, 'user-123');

      expect(statementsService.importLines).toHaveBeenCalled();
    });

    it('should return 0 for empty/null/undefined cell values', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: new Date(), B: 'Empty debit', C: '', D: 1000 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines[0].debit).toBe(0);
      expect(lines[0].credit).toBe(1000);
    });

    it('should skip rows that throw parse errors', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: new Date(), B: 'Good row', C: 1000, D: 0 },
        { A: { toString: () => { throw new Error('bad'); } }, B: 'Bad row', C: 500, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });

    it('should return invalid date string as null', async () => {
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        mockHeaderRow,
        { A: 'not-a-date-xyz', B: 'Invalid date str', C: 1000, D: 0 },
        { A: new Date(), B: 'Valid', C: 500, D: 0 },
      ]);

      await controller.importStatement(mockFile, mockDto, 'user-123');

      const lines = (statementsService.importLines as jest.Mock).mock.calls[0][4];
      // First row skipped (invalid date), only second row present
      expect(lines).toHaveLength(1);
      expect(lines[0].description).toBe('Valid');
    });
  });

  // ─── FINDBYBANKACCOUNT ─────────────────────────────────────────
  describe('findByBankAccount', () => {
    it('should delegate to service', async () => {
      const result = await controller.findByBankAccount('bank-acc-123');

      expect(result).toEqual([mockStatementResponse]);
      expect(statementsService.findByBankAccount).toHaveBeenCalledWith('bank-acc-123');
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to service', async () => {
      const result = await controller.findOne('stmt-123');

      expect(result).toEqual(mockStatementResponse);
      expect(statementsService.findOne).toHaveBeenCalledWith('stmt-123');
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────
  describe('delete', () => {
    it('should delegate to service and return message', async () => {
      const result = await controller.delete('stmt-123');

      expect(statementsService.delete).toHaveBeenCalledWith('stmt-123');
      expect(result.message).toBe('Extracto eliminado exitosamente');
    });
  });
});
