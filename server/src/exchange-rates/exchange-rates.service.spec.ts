import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { CurrencyCode, Prisma } from '@prisma/client';
import { ExchangeRatesService } from './exchange-rates.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/services';

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  const mockExchangeRate = {
    id: 'rate-123',
    tenantId: mockTenantId,
    fromCurrency: CurrencyCode.USD,
    toCurrency: CurrencyCode.COP,
    rate: new Prisma.Decimal(4200),
    effectiveDate: new Date('2024-06-01'),
    source: 'manual',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  };

  const mockExchangeRate2 = {
    ...mockExchangeRate,
    id: 'rate-456',
    fromCurrency: CurrencyCode.EUR,
    toCurrency: CurrencyCode.USD,
    rate: new Prisma.Decimal(1.08),
    effectiveDate: new Date('2024-06-15'),
    source: 'api',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      exchangeRate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
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

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should create an exchange rate with all fields', async () => {
      (prismaService.exchangeRate.create as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      const dto = {
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
        rate: 4200,
        effectiveDate: '2024-06-01',
        source: 'manual',
      };

      const result = await service.create(dto);

      expect(result).toEqual(mockExchangeRate);
      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
      expect(prismaService.exchangeRate.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          fromCurrency: CurrencyCode.USD,
          toCurrency: CurrencyCode.COP,
          rate: expect.any(Prisma.Decimal),
          effectiveDate: new Date('2024-06-01'),
          source: 'manual',
        },
      });
    });

    it('should default effectiveDate to now when not provided', async () => {
      (prismaService.exchangeRate.create as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      const dto = {
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
        rate: 4200,
      };

      await service.create(dto);

      const callArgs = (prismaService.exchangeRate.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.effectiveDate).toBeInstanceOf(Date);
    });

    it('should default source to "manual" when not provided', async () => {
      (prismaService.exchangeRate.create as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      const dto = {
        fromCurrency: CurrencyCode.EUR,
        toCurrency: CurrencyCode.USD,
        rate: 1.08,
      };

      await service.create(dto);

      const callArgs = (prismaService.exchangeRate.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.source).toBe('manual');
    });

    it('should use provided source value', async () => {
      (prismaService.exchangeRate.create as jest.Mock).mockResolvedValue(
        mockExchangeRate2,
      );

      const dto = {
        fromCurrency: CurrencyCode.EUR,
        toCurrency: CurrencyCode.USD,
        rate: 1.08,
        source: 'api',
      };

      await service.create(dto);

      const callArgs = (prismaService.exchangeRate.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.source).toBe('api');
    });

    it('should convert rate to Prisma.Decimal', async () => {
      (prismaService.exchangeRate.create as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      const dto = {
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
        rate: 4200,
      };

      await service.create(dto);

      const callArgs = (prismaService.exchangeRate.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.rate).toBeInstanceOf(Prisma.Decimal);
      expect(callArgs.data.rate.toNumber()).toBe(4200);
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all exchange rates for the tenant without filters', async () => {
      const rates = [mockExchangeRate, mockExchangeRate2];
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue(
        rates,
      );

      const result = await service.findAll();

      expect(result).toEqual(rates);
      expect(prismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should filter by fromCurrency', async () => {
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue([
        mockExchangeRate,
      ]);

      await service.findAll({ fromCurrency: CurrencyCode.USD });

      expect(prismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          fromCurrency: CurrencyCode.USD,
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should filter by toCurrency', async () => {
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue([
        mockExchangeRate,
      ]);

      await service.findAll({ toCurrency: CurrencyCode.COP });

      expect(prismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          toCurrency: CurrencyCode.COP,
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should filter by startDate only', async () => {
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ startDate: '2024-01-01' });

      expect(prismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          effectiveDate: { gte: new Date('2024-01-01') },
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should filter by endDate only', async () => {
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ endDate: '2024-12-31' });

      expect(prismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          effectiveDate: { lte: new Date('2024-12-31') },
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should filter by both startDate and endDate', async () => {
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue([
        mockExchangeRate,
      ]);

      await service.findAll({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(prismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          effectiveDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should combine all filters', async () => {
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(prismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          fromCurrency: CurrencyCode.USD,
          toCurrency: CurrencyCode.COP,
          effectiveDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should return empty array when no rates match', async () => {
      (prismaService.exchangeRate.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll({
        fromCurrency: CurrencyCode.BRL,
      });

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getLatestRate
  // ---------------------------------------------------------------------------
  describe('getLatestRate', () => {
    it('should return identity rate when currencies are the same', async () => {
      const result = await service.getLatestRate(
        CurrencyCode.USD,
        CurrencyCode.USD,
      );

      expect(result.rate).toEqual(new Prisma.Decimal(1));
      expect(result.source).toBe('identity');
      expect(prismaService.exchangeRate.findFirst).not.toHaveBeenCalled();
    });

    it('should return the direct rate when available', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      const result = await service.getLatestRate(
        CurrencyCode.USD,
        CurrencyCode.COP,
      );

      expect(result.rate).toEqual(mockExchangeRate.rate);
      expect(result.source).toBe('manual');
      expect(prismaService.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          fromCurrency: CurrencyCode.USD,
          toCurrency: CurrencyCode.COP,
          effectiveDate: { lte: expect.any(Date) },
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('should return inverse rate when direct rate is not found', async () => {
      const inverseRate = {
        ...mockExchangeRate,
        fromCurrency: CurrencyCode.COP,
        toCurrency: CurrencyCode.USD,
        rate: new Prisma.Decimal(4200),
        source: 'manual',
      };

      // First call (direct) returns null, second call (inverse) returns a rate
      (prismaService.exchangeRate.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(inverseRate);

      const result = await service.getLatestRate(
        CurrencyCode.USD,
        CurrencyCode.COP,
      );

      // Inverse of 4200 is ~0.000238...
      expect(result.rate.toNumber()).toBeCloseTo(1 / 4200, 6);
      expect(result.source).toBe('inverse:manual');
      expect(prismaService.exchangeRate.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when neither direct nor inverse rate exists', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.getLatestRate(CurrencyCode.USD, CurrencyCode.COP),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getLatestRate(CurrencyCode.USD, CurrencyCode.COP),
      ).rejects.toThrow('No se encontró tasa de cambio para USD/COP');
    });

    it('should query with inverse currencies for the fallback', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      try {
        await service.getLatestRate(CurrencyCode.EUR, CurrencyCode.MXN);
      } catch {
        // expected
      }

      // First call: direct EUR -> MXN
      expect(
        (prismaService.exchangeRate.findFirst as jest.Mock).mock.calls[0][0],
      ).toEqual({
        where: {
          tenantId: mockTenantId,
          fromCurrency: CurrencyCode.EUR,
          toCurrency: CurrencyCode.MXN,
          effectiveDate: { lte: expect.any(Date) },
        },
        orderBy: { effectiveDate: 'desc' },
      });

      // Second call: inverse MXN -> EUR
      expect(
        (prismaService.exchangeRate.findFirst as jest.Mock).mock.calls[1][0],
      ).toEqual({
        where: {
          tenantId: mockTenantId,
          fromCurrency: CurrencyCode.MXN,
          toCurrency: CurrencyCode.EUR,
          effectiveDate: { lte: expect.any(Date) },
        },
        orderBy: { effectiveDate: 'desc' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // convertAmount
  // ---------------------------------------------------------------------------
  describe('convertAmount', () => {
    it('should convert amount using the latest rate', async () => {
      // Mock getLatestRate indirectly via the prisma mock
      (prismaService.exchangeRate.findFirst as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      const dto = {
        amount: 100,
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
      };

      const result = await service.convertAmount(dto);

      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(420000);
      expect(result.rate).toBe(4200);
      expect(result.fromCurrency).toBe(CurrencyCode.USD);
      expect(result.toCurrency).toBe(CurrencyCode.COP);
      expect(result.source).toBe('manual');
    });

    it('should return same amount for same currency conversion', async () => {
      const dto = {
        amount: 250.5,
        fromCurrency: CurrencyCode.EUR,
        toCurrency: CurrencyCode.EUR,
      };

      const result = await service.convertAmount(dto);

      expect(result.originalAmount).toBe(250.5);
      expect(result.convertedAmount).toBe(250.5);
      expect(result.rate).toBe(1);
      expect(result.source).toBe('identity');
    });

    it('should round converted amount to 2 decimal places', async () => {
      const rateWithDecimals = {
        ...mockExchangeRate,
        rate: new Prisma.Decimal(1.33333),
      };
      (prismaService.exchangeRate.findFirst as jest.Mock).mockResolvedValue(
        rateWithDecimals,
      );

      const dto = {
        amount: 100,
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
      };

      const result = await service.convertAmount(dto);

      // 100 * 1.33333 = 133.333, rounded to 2 decimal places = 133.33
      expect(result.convertedAmount).toBe(133.33);
    });

    it('should propagate NotFoundException when no rate exists', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const dto = {
        amount: 100,
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.PEN,
      };

      await expect(service.convertAmount(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should delete an exchange rate by id', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );
      (prismaService.exchangeRate.delete as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      const result = await service.remove('rate-123');

      expect(result).toEqual(mockExchangeRate);
      expect(prismaService.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: { id: 'rate-123', tenantId: mockTenantId },
      });
      expect(prismaService.exchangeRate.delete).toHaveBeenCalledWith({
        where: { id: 'rate-123' },
      });
    });

    it('should throw NotFoundException when rate does not exist', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('nonexistent')).rejects.toThrow(
        'Tasa de cambio no encontrada',
      );
    });

    it('should not call delete when rate is not found', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      try {
        await service.remove('nonexistent');
      } catch {
        // expected
      }

      expect(prismaService.exchangeRate.delete).not.toHaveBeenCalled();
    });

    it('should scope findFirst by tenantId', async () => {
      (prismaService.exchangeRate.findFirst as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );
      (prismaService.exchangeRate.delete as jest.Mock).mockResolvedValue(
        mockExchangeRate,
      );

      await service.remove('rate-123');

      expect(prismaService.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: { id: 'rate-123', tenantId: mockTenantId },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getSupportedCurrencies
  // ---------------------------------------------------------------------------
  describe('getSupportedCurrencies', () => {
    it('should return the list of supported currencies', () => {
      const currencies = service.getSupportedCurrencies();

      expect(currencies).toHaveLength(6);
      expect(currencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'COP', symbol: '$' }),
          expect.objectContaining({ code: 'USD', symbol: 'US$' }),
          expect.objectContaining({ code: 'EUR', symbol: '€' }),
          expect.objectContaining({ code: 'MXN', symbol: 'MX$' }),
          expect.objectContaining({ code: 'PEN', symbol: 'S/' }),
          expect.objectContaining({ code: 'BRL', symbol: 'R$' }),
        ]),
      );
    });

    it('should include name, symbol, and decimals for each currency', () => {
      const currencies = service.getSupportedCurrencies();

      for (const currency of currencies) {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
        expect(currency).toHaveProperty('decimals');
        expect(typeof currency.code).toBe('string');
        expect(typeof currency.name).toBe('string');
        expect(typeof currency.symbol).toBe('string');
        expect(typeof currency.decimals).toBe('number');
      }
    });

    it('should return COP with 0 decimal places', () => {
      const currencies = service.getSupportedCurrencies();
      const cop = currencies.find((c) => c.code === 'COP');

      expect(cop).toBeDefined();
      expect(cop!.decimals).toBe(0);
    });

    it('should not require tenant context', () => {
      // getSupportedCurrencies is synchronous and does not call requireTenantId
      service.getSupportedCurrencies();

      expect(tenantContextService.requireTenantId).not.toHaveBeenCalled();
    });
  });
});
