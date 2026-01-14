import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let prismaHealth: jest.Mocked<PrismaHealthIndicator>;
  let memoryHealth: jest.Mocked<MemoryHealthIndicator>;
  let diskHealth: jest.Mocked<DiskHealthIndicator>;

  const mockHealthResult: HealthCheckResult = {
    status: 'ok',
    info: {
      database: { status: 'up' },
    },
    error: {},
    details: {
      database: { status: 'up' },
    },
  };

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockPrismaHealth = {
      isHealthy: jest.fn(),
    };

    const mockMemoryHealth = {
      checkHeap: jest.fn(),
      checkRSS: jest.fn(),
    };

    const mockDiskHealth = {
      checkStorage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealth },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealth },
        { provide: DiskHealthIndicator, useValue: mockDiskHealth },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    prismaHealth = module.get(PrismaHealthIndicator);
    memoryHealth = module.get(MemoryHealthIndicator);
    diskHealth = module.get(DiskHealthIndicator);

    // Setup default mock implementations
    healthCheckService.check.mockResolvedValue(mockHealthResult);
    prismaHealth.isHealthy.mockResolvedValue({ database: { status: 'up' } });
    memoryHealth.checkHeap.mockResolvedValue({ memory_heap: { status: 'up' } });
    memoryHealth.checkRSS.mockResolvedValue({ memory_rss: { status: 'up' } });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check results', async () => {
      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
        ]),
      );
    });

    it('should include database check', async () => {
      await controller.check();

      const checks = healthCheckService.check.mock.calls[0][0];
      expect(checks.length).toBe(3);
    });
  });

  describe('live', () => {
    it('should return liveness status', () => {
      const result = controller.live();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return ISO timestamp', () => {
      const result = controller.live();

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('ready', () => {
    it('should return readiness status', async () => {
      const result = await controller.ready();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should only check database for readiness', async () => {
      await controller.ready();

      const checks = healthCheckService.check.mock.calls[0][0];
      expect(checks.length).toBe(1);
    });
  });

  describe('database', () => {
    it('should return database health status', async () => {
      const result = await controller.database();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should only check database', async () => {
      await controller.database();

      const checks = healthCheckService.check.mock.calls[0][0];
      expect(checks.length).toBe(1);
    });
  });

  describe('memory', () => {
    it('should return memory health status', async () => {
      const result = await controller.memory();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should check both heap and RSS', async () => {
      await controller.memory();

      const checks = healthCheckService.check.mock.calls[0][0];
      expect(checks.length).toBe(2);
    });
  });
});