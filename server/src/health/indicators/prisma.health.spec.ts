import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '../../prisma';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when database is reachable', async () => {
      prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      const result = await indicator.isHealthy('database');

      expect(result).toEqual({
        database: {
          status: 'up',
          responseTime: 'ok',
        },
      });
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should use default key when not provided', async () => {
      prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      const result = await indicator.isHealthy();

      expect(result).toHaveProperty('database');
    });

    it('should throw HealthCheckError when database is unreachable', async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      await expect(indicator.isHealthy('database')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should include error message in health check error', async () => {
      const errorMessage = 'Database connection failed';
      prismaService.$queryRaw.mockRejectedValue(new Error(errorMessage));

      try {
        await indicator.isHealthy('database');
        fail('Expected HealthCheckError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toEqual({
          database: {
            status: 'down',
            error: errorMessage,
          },
        });
      }
    });

    it('should handle non-Error exceptions', async () => {
      prismaService.$queryRaw.mockRejectedValue('string error');

      try {
        await indicator.isHealthy('database');
        fail('Expected HealthCheckError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toEqual({
          database: {
            status: 'down',
            error: 'Unknown error',
          },
        });
      }
    });

    it('should use custom key when provided', async () => {
      prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      const result = await indicator.isHealthy('custom_key');

      expect(result).toHaveProperty('custom_key');
      expect(result.custom_key).toEqual({
        status: 'up',
        responseTime: 'ok',
      });
    });
  });
});