import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { PayrollConfigService } from './payroll-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services/tenant-context.service';

describe('PayrollConfigService', () => {
  let service: PayrollConfigService;
  let prisma: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';

  const mockConfig = {
    id: 'config-1',
    tenantId: mockTenantId,
    smmlv: 1300000,
    auxilioTransporteVal: 162000,
    uvtValue: 47065,
    defaultPeriodType: 'MONTHLY',
    payrollPrefix: 'NOM',
    payrollCurrentNumber: 1,
    adjustmentPrefix: 'AJU',
    adjustmentCurrentNumber: 1,
    payrollSoftwareId: null,
    payrollSoftwarePin: null,
    payrollTestSetId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      payrollConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollConfigService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<PayrollConfigService>(PayrollConfigService);
    prisma = module.get(PrismaService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getConfig', () => {
    it('should return config when found', async () => {
      (prisma.payrollConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig,
      );

      const result = await service.getConfig();

      expect(result).toBeDefined();
      expect(result!.smmlv).toBe(1300000);
      expect(result!.auxilioTransporteVal).toBe(162000);
    });

    it('should return null when not found', async () => {
      (prisma.payrollConfig.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getConfig();

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdate', () => {
    it('should upsert payroll config', async () => {
      const dto = {
        smmlv: 1300000,
        auxilioTransporteVal: 162000,
        uvtValue: 47065,
        defaultPeriodType: 'MONTHLY' as any,
        payrollPrefix: 'NOM',
        payrollCurrentNumber: 1,
        adjustmentPrefix: 'AJU',
        adjustmentCurrentNumber: 1,
      };

      (prisma.payrollConfig.upsert as jest.Mock).mockResolvedValue(mockConfig);

      const result = await service.createOrUpdate(dto);

      expect(result.smmlv).toBe(1300000);
      expect(prisma.payrollConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        }),
      );
    });
  });

  describe('getOrFail', () => {
    it('should return config when found', async () => {
      (prisma.payrollConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig,
      );

      const result = await service.getOrFail();

      expect(result.smmlv).toBe(1300000);
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.payrollConfig.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrFail()).rejects.toThrow(NotFoundException);
    });
  });
});
