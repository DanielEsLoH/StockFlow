import { Test, TestingModule } from '@nestjs/testing';
import { Logger, ConflictException } from '@nestjs/common';
import { AccountingSetupService } from './accounting-setup.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';

const mockTenantId = 'tenant-123';

describe('AccountingSetupService', () => {
  let service: AccountingSetupService;
  let prismaService: jest.Mocked<PrismaService>;

  let accountCreateCounter: number;

  beforeEach(async () => {
    jest.clearAllMocks();
    accountCreateCounter = 0;

    const mockPrismaService = {
      account: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(() => {
          accountCreateCounter++;
          return Promise.resolve({
            id: `account-${accountCreateCounter}`,
            tenantId: mockTenantId,
          });
        }),
      },
      accountingConfig: {
        create: jest.fn().mockResolvedValue({ id: 'config-123' }),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingSetupService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<AccountingSetupService>(AccountingSetupService);
    prismaService = module.get(PrismaService);

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

  describe('setup', () => {
    it('should create all PUC accounts when tenant has no existing accounts', async () => {
      const result = await service.setup();

      // Should create ~55 accounts
      expect(accountCreateCounter).toBeGreaterThan(50);
      expect(result.accountsCreated).toBe(accountCreateCounter);
    });

    it('should throw ConflictException when accounts already exist', async () => {
      (prismaService.account.count as jest.Mock).mockResolvedValue(55);

      await expect(service.setup()).rejects.toThrow(ConflictException);
      await expect(service.setup()).rejects.toThrow(
        'La contabilidad ya esta configurada',
      );
    });

    it('should create accounts with correct tenantId', async () => {
      await service.setup();

      const firstCreateCall = (prismaService.account.create as jest.Mock).mock.calls[0][0];
      expect(firstCreateCall.data.tenantId).toBe(mockTenantId);
    });

    it('should mark all accounts as isSystemAccount', async () => {
      await service.setup();

      const allCalls = (prismaService.account.create as jest.Mock).mock.calls;
      for (const call of allCalls) {
        expect(call[0].data.isSystemAccount).toBe(true);
      }
    });

    it('should create accounts in hierarchical order (parents first)', async () => {
      await service.setup();

      const allCalls = (prismaService.account.create as jest.Mock).mock.calls;
      const codes = allCalls.map((call) => call[0].data.code);

      // Clase 1 (code '1') must come before Grupo 11 (code '11')
      const idx1 = codes.indexOf('1');
      const idx11 = codes.indexOf('11');
      expect(idx1).toBeLessThan(idx11);

      // Grupo 11 must come before Cuenta 1105
      const idx1105 = codes.indexOf('1105');
      expect(idx11).toBeLessThan(idx1105);
    });

    it('should assign correct levels based on code length', async () => {
      await service.setup();

      const allCalls = (prismaService.account.create as jest.Mock).mock.calls;

      // Find level 1 (code length 1, e.g., '1')
      const level1Calls = allCalls.filter((call) => call[0].data.code.length <= 1);
      for (const call of level1Calls) {
        expect(call[0].data.level).toBe(1);
      }

      // Find level 2 (code length 2, e.g., '11')
      const level2Calls = allCalls.filter((call) => call[0].data.code.length === 2);
      for (const call of level2Calls) {
        expect(call[0].data.level).toBe(2);
      }

      // Find level 3 (code length 3-4, e.g., '1105')
      const level3Calls = allCalls.filter(
        (call) => call[0].data.code.length === 3 || call[0].data.code.length === 4,
      );
      for (const call of level3Calls) {
        expect(call[0].data.level).toBe(3);
      }

      // Find level 4 (code length > 4, e.g., '110505')
      const level4Calls = allCalls.filter((call) => call[0].data.code.length > 4);
      for (const call of level4Calls) {
        expect(call[0].data.level).toBe(4);
      }
    });

    it('should create AccountingConfig with account mappings', async () => {
      await service.setup();

      expect(prismaService.accountingConfig.create).toHaveBeenCalledTimes(1);
      const configCall = (prismaService.accountingConfig.create as jest.Mock).mock.calls[0][0];
      expect(configCall.data.tenantId).toBe(mockTenantId);
      expect(configCall.data.autoGenerateEntries).toBe(false);
      // All mapped account IDs should be strings (not null) since they come from created accounts
      expect(configCall.data.cashAccountId).toEqual(expect.any(String));
      expect(configCall.data.bankAccountId).toEqual(expect.any(String));
      expect(configCall.data.revenueAccountId).toEqual(expect.any(String));
      expect(configCall.data.cogsAccountId).toEqual(expect.any(String));
    });

    it('should return success message with account count', async () => {
      const result = await service.setup();

      expect(result.message).toContain('Contabilidad configurada exitosamente');
      expect(result.message).toContain('cuentas PUC creadas');
      expect(result.accountsCreated).toBeGreaterThan(0);
    });

    it('should set parentId from previously created parent accounts', async () => {
      await service.setup();

      const allCalls = (prismaService.account.create as jest.Mock).mock.calls;

      // First account (code '1') should have no parent
      expect(allCalls[0][0].data.parentId).toBeNull();

      // Second account (code '11') should have parentId = account-1 (the id of code '1')
      expect(allCalls[1][0].data.parentId).toBe('account-1');
    });

    it('should mark bank accounts with isBankAccount flag', async () => {
      await service.setup();

      const allCalls = (prismaService.account.create as jest.Mock).mock.calls;
      const bankAccountCalls = allCalls.filter((call) => call[0].data.isBankAccount === true);

      expect(bankAccountCalls.length).toBeGreaterThan(0);
      // 111005 Bancos Nacionales should be a bank account
      const bancosCall = allCalls.find((call) => call[0].data.code === '111005');
      expect(bancosCall![0].data.isBankAccount).toBe(true);
    });
  });
});
