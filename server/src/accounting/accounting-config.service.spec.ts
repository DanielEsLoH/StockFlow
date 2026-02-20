import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingConfigService } from './accounting-config.service';

describe('AccountingConfigService', () => {
  let service: AccountingConfigService;
  let prisma: jest.Mocked<any>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-cfg';

  const mockFullConfig = {
    id: 'config-1',
    tenantId: mockTenantId,
    cashAccountId: 'acc-cash',
    bankAccountId: 'acc-bank',
    accountsReceivableId: 'acc-ar',
    inventoryAccountId: 'acc-inv',
    accountsPayableId: 'acc-ap',
    ivaPorPagarId: 'acc-iva-pp',
    ivaDescontableId: 'acc-iva-d',
    revenueAccountId: 'acc-rev',
    cogsAccountId: 'acc-cogs',
    inventoryAdjustmentId: 'acc-adj',
    reteFuenteReceivedId: 'acc-rf-r',
    reteFuentePayableId: 'acc-rf-p',
    autoGenerateEntries: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockPartialConfig = {
    ...mockFullConfig,
    id: 'config-partial',
    cashAccountId: 'acc-cash',
    accountsReceivableId: null,
    inventoryAccountId: null,
    accountsPayableId: null,
    revenueAccountId: null,
    cogsAccountId: null,
    autoGenerateEntries: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrisma = {
      accountingConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const mockTenantContext = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingConfigService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<AccountingConfigService>(AccountingConfigService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getConfig
  // ---------------------------------------------------------------------------
  describe('getConfig', () => {
    it('should return mapped config when it exists', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(mockFullConfig);

      const result = await service.getConfig();

      expect(prisma.accountingConfig.findUnique).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
      expect(result).not.toBeNull();
      expect(result!.id).toBe('config-1');
      expect(result!.cashAccountId).toBe('acc-cash');
    });

    it('should return null when no config exists', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(null);

      const result = await service.getConfig();

      expect(result).toBeNull();
    });

    it('should compute isConfigured=true when all required account IDs are set', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(mockFullConfig);

      const result = await service.getConfig();

      expect(result!.isConfigured).toBe(true);
    });

    it('should compute isConfigured=false when required account IDs are missing', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(mockPartialConfig);

      const result = await service.getConfig();

      expect(result!.isConfigured).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // updateConfig
  // ---------------------------------------------------------------------------
  describe('updateConfig', () => {
    it('should upsert config and return mapped response', async () => {
      const dto = { cashAccountId: 'new-cash', autoGenerateEntries: true };
      prisma.accountingConfig.upsert.mockResolvedValue({
        ...mockFullConfig,
        cashAccountId: 'new-cash',
      });

      const result = await service.updateConfig(dto);

      expect(prisma.accountingConfig.upsert).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        create: { tenantId: mockTenantId, ...dto },
        update: dto,
      });
      expect(result.cashAccountId).toBe('new-cash');
    });

    it('should log after successful update', async () => {
      prisma.accountingConfig.upsert.mockResolvedValue(mockFullConfig);

      await service.updateConfig({ autoGenerateEntries: false });

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getConfigForTenant
  // ---------------------------------------------------------------------------
  describe('getConfigForTenant', () => {
    it('should look up config by the provided tenantId without using tenant context', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(mockFullConfig);

      const result = await service.getConfigForTenant('other-tenant');

      expect(prisma.accountingConfig.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 'other-tenant' },
      });
      expect(tenantContext.requireTenantId).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('should return null when no config exists for the given tenant', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(null);

      const result = await service.getConfigForTenant('unknown-tenant');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // isConfigured (computed property)
  // ---------------------------------------------------------------------------
  describe('isConfigured mapping', () => {
    it('should be true when cash, AR, inventory, AP, revenue, and COGS accounts are all set', async () => {
      prisma.accountingConfig.findUnique.mockResolvedValue(mockFullConfig);

      const result = await service.getConfig();

      expect(result!.isConfigured).toBe(true);
    });

    it('should be false when any of the six required accounts is null', async () => {
      const missingRevenue = { ...mockFullConfig, revenueAccountId: null };
      prisma.accountingConfig.findUnique.mockResolvedValue(missingRevenue);

      const result = await service.getConfig();

      expect(result!.isConfigured).toBe(false);
    });
  });
});
