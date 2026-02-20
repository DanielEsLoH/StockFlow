import { Test, TestingModule } from '@nestjs/testing';
import { Logger, ConflictException } from '@nestjs/common';
import { AccountingConfigController } from './accounting-config.controller';
import { AccountingConfigService } from './accounting-config.service';
import { AccountingSetupService } from './accounting-setup.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

const mockConfig = {
  id: 'config-123',
  cashAccountId: 'acc-1',
  bankAccountId: 'acc-2',
  autoGenerateEntries: false,
};

const mockSetupResult = {
  message: 'Contabilidad configurada exitosamente. 55 cuentas PUC creadas.',
  accountsCreated: 55,
};

describe('AccountingConfigController', () => {
  let controller: AccountingConfigController;
  let configService: jest.Mocked<AccountingConfigService>;
  let setupService: jest.Mocked<AccountingSetupService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      getConfig: jest.fn().mockResolvedValue(mockConfig),
      updateConfig: jest.fn().mockResolvedValue(mockConfig),
    };

    const mockSetupService = {
      setup: jest.fn().mockResolvedValue(mockSetupResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountingConfigController],
      providers: [
        { provide: AccountingConfigService, useValue: mockConfigService },
        { provide: AccountingSetupService, useValue: mockSetupService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountingConfigController>(AccountingConfigController);
    configService = module.get(AccountingConfigService);
    setupService = module.get(AccountingSetupService);

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

  // ─── GETCONFIG ─────────────────────────────────────────────────
  describe('getConfig', () => {
    it('should delegate to configService', async () => {
      const result = await controller.getConfig();

      expect(result).toEqual(mockConfig);
      expect(configService.getConfig).toHaveBeenCalled();
    });

    it('should return null when not configured', async () => {
      configService.getConfig.mockResolvedValue(null as any);

      const result = await controller.getConfig();

      expect(result).toBeNull();
    });
  });

  // ─── UPDATECONFIG ──────────────────────────────────────────────
  describe('updateConfig', () => {
    const dto = { autoGenerateEntries: true } as any;

    it('should delegate to configService', async () => {
      const result = await controller.updateConfig(dto);

      expect(result).toEqual(mockConfig);
      expect(configService.updateConfig).toHaveBeenCalledWith(dto);
    });
  });

  // ─── SETUP ─────────────────────────────────────────────────────
  describe('setup', () => {
    it('should delegate to setupService', async () => {
      const result = await controller.setup();

      expect(result).toEqual(mockSetupResult);
      expect(setupService.setup).toHaveBeenCalled();
    });

    it('should propagate ConflictException when already set up', async () => {
      setupService.setup.mockRejectedValue(new ConflictException());

      await expect(controller.setup()).rejects.toThrow(ConflictException);
    });
  });
});
