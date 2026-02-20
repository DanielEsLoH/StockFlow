import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockBankAccount = {
  id: 'ba-123',
  bankName: 'Bancolombia',
  accountNumber: '1234567890',
  accountType: 'SAVINGS',
  currency: 'COP',
  isActive: true,
  currentBalance: 5000000,
  accountId: 'acc-123',
};

describe('BankAccountsController', () => {
  let controller: BankAccountsController;
  let service: jest.Mocked<BankAccountsService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn().mockResolvedValue([mockBankAccount]),
      findOne: jest.fn().mockResolvedValue(mockBankAccount),
      create: jest.fn().mockResolvedValue(mockBankAccount),
      update: jest.fn().mockResolvedValue(mockBankAccount),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankAccountsController],
      providers: [
        { provide: BankAccountsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BankAccountsController>(BankAccountsController);
    service = module.get(BankAccountsService);

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
    it('should call service with activeOnly true by default', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockBankAccount]);
      expect(service.findAll).toHaveBeenCalledWith(true);
    });

    it('should pass activeOnly false when query is "false"', async () => {
      await controller.findAll('false');

      expect(service.findAll).toHaveBeenCalledWith(false);
    });

    it('should pass activeOnly true for any non-"false" string', async () => {
      await controller.findAll('true');

      expect(service.findAll).toHaveBeenCalledWith(true);
    });

    it('should pass activeOnly true for random string', async () => {
      await controller.findAll('anything');

      expect(service.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ─── FINDONE ───────────────────────────────────────────────────
  describe('findOne', () => {
    it('should delegate to service with id', async () => {
      const result = await controller.findOne('ba-123');

      expect(result).toEqual(mockBankAccount);
      expect(service.findOne).toHaveBeenCalledWith('ba-123');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      bankName: 'Bancolombia',
      accountNumber: '1234567890',
      accountType: 'SAVINGS' as any,
    };

    it('should delegate to service', async () => {
      const result = await controller.create(createDto as any);

      expect(result).toEqual(mockBankAccount);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate ConflictException for duplicate account number', async () => {
      service.create.mockRejectedValue(new ConflictException());

      await expect(controller.create(createDto as any)).rejects.toThrow(ConflictException);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    it('should delegate to service with id and dto', async () => {
      const dto = { bankName: 'Davivienda' } as any;
      const result = await controller.update('ba-123', dto);

      expect(result).toEqual(mockBankAccount);
      expect(service.update).toHaveBeenCalledWith('ba-123', dto);
    });

    it('should propagate NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('invalid', {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
