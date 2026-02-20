import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BankAccountType, AccountType, AccountNature } from '@prisma/client';
import { BankAccountsService } from './bank-accounts.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountsService } from '../accounting/accounts.service';
import type { CreateBankAccountDto } from './dto/create-bank-account.dto';
import type { UpdateBankAccountDto } from './dto/update-bank-account.dto';

describe('BankAccountsService', () => {
  let service: BankAccountsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  const mockBankParent = {
    id: 'account-parent-1110',
    tenantId: mockTenantId,
    code: '1110',
    name: 'Bancos',
    type: AccountType.ASSET,
    nature: AccountNature.DEBIT,
    level: 3,
  };

  const mockPucAccount = {
    id: 'puc-account-111001',
    tenantId: mockTenantId,
    code: '111001',
    name: 'Bancolombia Corriente',
    type: AccountType.ASSET,
    nature: AccountNature.DEBIT,
    parentId: mockBankParent.id,
    level: 4,
    isBankAccount: true,
    isSystemAccount: false,
  };

  const mockBankAccount = {
    id: 'bank-account-1',
    tenantId: mockTenantId,
    accountId: mockPucAccount.id,
    name: 'Bancolombia Corriente',
    bankName: 'Bancolombia',
    accountNumber: '123-456789-00',
    accountType: BankAccountType.CHECKING,
    currency: 'COP',
    initialBalance: 5000000,
    currentBalance: 5000000,
    isActive: true,
    account: { code: '111001', name: 'Bancolombia Corriente' },
    _count: { statements: 2 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockBankAccount2 = {
    ...mockBankAccount,
    id: 'bank-account-2',
    name: 'Davivienda Ahorros',
    bankName: 'Davivienda',
    accountNumber: '987-654321-00',
    accountType: BankAccountType.SAVINGS,
    account: { code: '111002', name: 'Davivienda Ahorros' },
    _count: { statements: 0 },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      bankAccount: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      account: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockAccountsService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: AccountsService, useValue: mockAccountsService },
      ],
    }).compile();

    service = module.get<BankAccountsService>(BankAccountsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

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
      expect(service).toBeDefined();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.bankAccount.findMany as jest.Mock).mockResolvedValue([
        mockBankAccount,
        mockBankAccount2,
      ]);
    });

    it('should return all active bank accounts by default', async () => {
      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bank-account-1');
      expect(result[1].id).toBe('bank-account-2');
    });

    it('should filter by isActive when activeOnly is true', async () => {
      await service.findAll(true);

      expect(prismaService.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, isActive: true },
        }),
      );
    });

    it('should not filter by isActive when activeOnly is false', async () => {
      await service.findAll(false);

      expect(prismaService.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
    });

    it('should include account relation and statement count', async () => {
      await service.findAll();

      expect(prismaService.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            account: { select: { code: true, name: true } },
            _count: { select: { statements: true } },
          },
        }),
      );
    });

    it('should order by name ascending', async () => {
      await service.findAll();

      expect(prismaService.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should map response with correct fields', async () => {
      const result = await service.findAll();

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'bank-account-1',
          name: 'Bancolombia Corriente',
          bankName: 'Bancolombia',
          accountNumber: '123-456789-00',
          accountType: BankAccountType.CHECKING,
          currency: 'COP',
          initialBalance: 5000000,
          currentBalance: 5000000,
          isActive: true,
          accountCode: '111001',
          accountName: 'Bancolombia Corriente',
          statementCount: 2,
        }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a bank account by id', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        mockBankAccount,
      );

      const result = await service.findOne('bank-account-1');

      expect(result.id).toBe('bank-account-1');
      expect(result.name).toBe('Bancolombia Corriente');
    });

    it('should scope query to tenant', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        mockBankAccount,
      );

      await service.findOne('bank-account-1');

      expect(prismaService.bankAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 'bank-account-1', tenantId: mockTenantId },
        include: {
          account: { select: { code: true, name: true } },
          _count: { select: { statements: true } },
        },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Cuenta bancaria con ID nonexistent no encontrada',
      );
    });
  });

  describe('create', () => {
    const createDto: CreateBankAccountDto = {
      name: 'Bancolombia Corriente',
      bankName: 'Bancolombia',
      accountNumber: '123-456789-00',
      accountType: BankAccountType.CHECKING,
      currency: 'COP',
      initialBalance: 5000000,
    };

    beforeEach(() => {
      (prismaService.bankAccount.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(
        mockBankParent,
      );
      (prismaService.account.count as jest.Mock).mockResolvedValue(0);
      (prismaService.account.create as jest.Mock).mockResolvedValue(
        mockPucAccount,
      );
      (prismaService.bankAccount.create as jest.Mock).mockResolvedValue(
        mockBankAccount,
      );
    });

    it('should create a new bank account', async () => {
      const result = await service.create(createDto);

      expect(result.name).toBe('Bancolombia Corriente');
      expect(result.bankName).toBe('Bancolombia');
      expect(prismaService.bankAccount.create).toHaveBeenCalled();
    });

    it('should check account number uniqueness with compound key', async () => {
      await service.create(createDto);

      expect(prismaService.bankAccount.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_accountNumber: {
            tenantId: mockTenantId,
            accountNumber: '123-456789-00',
          },
        },
      });
    });

    it('should throw ConflictException when account number already exists', async () => {
      (prismaService.bankAccount.findUnique as jest.Mock).mockResolvedValue(
        mockBankAccount,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message for duplicate account number', async () => {
      (prismaService.bankAccount.findUnique as jest.Mock).mockResolvedValue(
        mockBankAccount,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe una cuenta con el numero ${createDto.accountNumber}`,
      );
    });

    it('should look up PUC 1110 parent account', async () => {
      await service.create(createDto);

      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_code: { tenantId: mockTenantId, code: '1110' },
        },
      });
    });

    it('should throw BadRequestException when PUC 1110 parent not found', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message when PUC 1110 missing', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        'No se encontro la cuenta PUC 1110 (Bancos). Debe configurar la contabilidad primero.',
      );
    });

    it('should auto-generate sub-account code 111001 for first account', async () => {
      (prismaService.account.count as jest.Mock).mockResolvedValue(0);

      await service.create(createDto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: '111001',
          }),
        }),
      );
    });

    it('should auto-generate sub-account code 111002 for second account', async () => {
      (prismaService.account.count as jest.Mock).mockResolvedValue(1);

      await service.create(createDto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: '111002',
          }),
        }),
      );
    });

    it('should create PUC account with correct properties', async () => {
      await service.create(createDto);

      expect(prismaService.account.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          code: '111001',
          name: 'Bancolombia Corriente',
          type: AccountType.ASSET,
          nature: AccountNature.DEBIT,
          parentId: mockBankParent.id,
          level: 4,
          isBankAccount: true,
          isSystemAccount: false,
        },
      });
    });

    it('should create PUC account name as "Ahorros" for SAVINGS type', async () => {
      const savingsDto: CreateBankAccountDto = {
        ...createDto,
        accountNumber: '999-888777-00',
        accountType: BankAccountType.SAVINGS,
      };

      await service.create(savingsDto);

      expect(prismaService.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Bancolombia Ahorros',
          }),
        }),
      );
    });

    it('should create bank account linked to PUC account', async () => {
      await service.create(createDto);

      expect(prismaService.bankAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            accountId: mockPucAccount.id,
            name: 'Bancolombia Corriente',
            bankName: 'Bancolombia',
            accountNumber: '123-456789-00',
            accountType: BankAccountType.CHECKING,
            currency: 'COP',
            initialBalance: 5000000,
            currentBalance: 5000000,
          }),
        }),
      );
    });

    it('should default currency to COP when not provided', async () => {
      const dtoWithoutCurrency: CreateBankAccountDto = {
        name: 'Test Account',
        bankName: 'TestBank',
        accountNumber: '111-222333-00',
        accountType: BankAccountType.CHECKING,
      };

      await service.create(dtoWithoutCurrency);

      expect(prismaService.bankAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'COP',
            initialBalance: 0,
            currentBalance: 0,
          }),
        }),
      );
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateBankAccountDto = {
      name: 'Bancolombia Principal',
      bankName: 'Bancolombia S.A.',
    };

    beforeEach(() => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        mockBankAccount,
      );
      (prismaService.bankAccount.update as jest.Mock).mockResolvedValue({
        ...mockBankAccount,
        name: 'Bancolombia Principal',
        bankName: 'Bancolombia S.A.',
      });
    });

    it('should update bank account', async () => {
      const result = await service.update('bank-account-1', updateDto);

      expect(result.name).toBe('Bancolombia Principal');
      expect(result.bankName).toBe('Bancolombia S.A.');
    });

    it('should throw NotFoundException when account not found', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.update('nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.update('nonexistent', updateDto),
      ).rejects.toThrow('Cuenta bancaria con ID nonexistent no encontrada');
    });

    it('should scope lookup to tenant', async () => {
      await service.update('bank-account-1', updateDto);

      expect(prismaService.bankAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 'bank-account-1', tenantId: mockTenantId },
      });
    });

    it('should update name, bankName, and currency only', async () => {
      const currencyDto: UpdateBankAccountDto = { currency: 'USD' };

      await service.update('bank-account-1', currencyDto);

      expect(prismaService.bankAccount.update).toHaveBeenCalledWith({
        where: { id: 'bank-account-1' },
        data: {
          name: undefined,
          bankName: undefined,
          currency: 'USD',
        },
        include: {
          account: { select: { code: true, name: true } },
          _count: { select: { statements: true } },
        },
      });
    });

    it('should require tenant context', async () => {
      await service.update('bank-account-1', updateDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });
});
