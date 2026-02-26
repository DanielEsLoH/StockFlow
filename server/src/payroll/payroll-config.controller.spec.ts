import { Test, TestingModule } from '@nestjs/testing';
import { PayrollConfigController } from './payroll-config.controller';
import { PayrollConfigService } from './payroll-config.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

describe('PayrollConfigController', () => {
  let controller: PayrollConfigController;
  let service: jest.Mocked<PayrollConfigService>;

  const mockConfigResponse = {
    id: 'config-1',
    tenantId: 'tenant-123',
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

    const mockService = {
      getConfig: jest.fn(),
      createOrUpdate: jest.fn(),
      getOrFail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollConfigController],
      providers: [{ provide: PayrollConfigService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PayrollConfigController>(PayrollConfigController);
    service = module.get(PayrollConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getConfig', () => {
    it('should return payroll config', async () => {
      service.getConfig.mockResolvedValue(mockConfigResponse);

      const result = await controller.getConfig();

      expect(result).toEqual(mockConfigResponse);
      expect(service.getConfig).toHaveBeenCalled();
    });

    it('should return null when no config', async () => {
      service.getConfig.mockResolvedValue(null);

      const result = await controller.getConfig();

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdate', () => {
    it('should create or update config', async () => {
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
      service.createOrUpdate.mockResolvedValue(mockConfigResponse);

      const result = await controller.createOrUpdate(dto);

      expect(result).toEqual(mockConfigResponse);
      expect(service.createOrUpdate).toHaveBeenCalledWith(dto);
    });
  });
});
