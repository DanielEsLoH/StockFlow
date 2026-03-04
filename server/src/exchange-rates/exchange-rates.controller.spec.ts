import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';
import { CurrencyCode } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  CreateExchangeRateDto,
  FilterExchangeRatesDto,
  ConvertAmountDto,
} from './dto';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  let service: jest.Mocked<ExchangeRatesService>;

  const mockExchangeRate = {
    id: 'rate-123',
    tenantId: 'tenant-123',
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockExchangeRatesService = {
      getSupportedCurrencies: jest.fn(),
      findAll: jest.fn(),
      getLatestRate: jest.fn(),
      create: jest.fn(),
      convertAmount: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRatesController],
      providers: [
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExchangeRatesController>(ExchangeRatesController);
    service = module.get(ExchangeRatesService);

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
      expect(controller).toBeDefined();
    });
  });

  describe('getCurrencies', () => {
    it('should return the list of supported currencies', () => {
      const currencies = [
        { code: 'COP', name: 'Peso Colombiano', symbol: '$', decimals: 0 },
        {
          code: 'USD',
          name: 'Dólar Estadounidense',
          symbol: 'US$',
          decimals: 2,
        },
        { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
      ];
      service.getSupportedCurrencies.mockReturnValue(currencies as any);

      const result = controller.getCurrencies();

      expect(result).toEqual(currencies);
      expect(service.getSupportedCurrencies).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all exchange rates without filters', async () => {
      const rates = [mockExchangeRate, mockExchangeRate2];
      service.findAll.mockResolvedValue(rates);

      const filters: FilterExchangeRatesDto = {};
      const result = await controller.findAll(filters);

      expect(result).toEqual(rates);
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass fromCurrency filter to service', async () => {
      service.findAll.mockResolvedValue([mockExchangeRate]);

      const filters: FilterExchangeRatesDto = {
        fromCurrency: CurrencyCode.USD,
      };
      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass toCurrency filter to service', async () => {
      service.findAll.mockResolvedValue([mockExchangeRate]);

      const filters: FilterExchangeRatesDto = {
        toCurrency: CurrencyCode.COP,
      };
      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass date range filters to service', async () => {
      service.findAll.mockResolvedValue([mockExchangeRate]);

      const filters: FilterExchangeRatesDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass all filters combined', async () => {
      service.findAll.mockResolvedValue([mockExchangeRate]);

      const filters: FilterExchangeRatesDto = {
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should return empty array when no rates match', async () => {
      service.findAll.mockResolvedValue([]);

      const filters: FilterExchangeRatesDto = {
        fromCurrency: CurrencyCode.BRL,
      };
      const result = await controller.findAll(filters);

      expect(result).toEqual([]);
    });
  });

  describe('getLatestRate', () => {
    it('should return the latest rate for a currency pair', async () => {
      const latestRate = {
        rate: new Prisma.Decimal(4200),
        source: 'manual',
      };
      service.getLatestRate.mockResolvedValue(latestRate);

      const result = await controller.getLatestRate('USD', 'COP');

      expect(result).toEqual(latestRate);
      expect(service.getLatestRate).toHaveBeenCalledWith('USD', 'COP');
    });

    it('should propagate NotFoundException when no rate exists', async () => {
      service.getLatestRate.mockRejectedValue(
        new NotFoundException(
          'No se encontró tasa de cambio para USD/COP',
        ),
      );

      await expect(controller.getLatestRate('USD', 'COP')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle same currency request', async () => {
      const identityRate = {
        rate: new Prisma.Decimal(1),
        source: 'identity',
      };
      service.getLatestRate.mockResolvedValue(identityRate);

      const result = await controller.getLatestRate('USD', 'USD');

      expect(result).toEqual(identityRate);
      expect(service.getLatestRate).toHaveBeenCalledWith('USD', 'USD');
    });
  });

  describe('create', () => {
    const createDto: CreateExchangeRateDto = {
      fromCurrency: CurrencyCode.USD,
      toCurrency: CurrencyCode.COP,
      rate: 4200,
      effectiveDate: '2024-06-01',
      source: 'manual',
    };

    it('should create a new exchange rate', async () => {
      service.create.mockResolvedValue(mockExchangeRate);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockExchangeRate);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should create exchange rate without optional fields', async () => {
      const minimalDto: CreateExchangeRateDto = {
        fromCurrency: CurrencyCode.EUR,
        toCurrency: CurrencyCode.USD,
        rate: 1.08,
      };
      service.create.mockResolvedValue(mockExchangeRate2);

      const result = await controller.create(minimalDto);

      expect(result).toEqual(mockExchangeRate2);
      expect(service.create).toHaveBeenCalledWith(minimalDto);
    });
  });

  describe('convert', () => {
    const convertDto: ConvertAmountDto = {
      amount: 100,
      fromCurrency: CurrencyCode.USD,
      toCurrency: CurrencyCode.COP,
    };

    it('should convert an amount between currencies', async () => {
      const conversionResult = {
        originalAmount: 100,
        convertedAmount: 420000,
        rate: 4200,
        fromCurrency: CurrencyCode.USD,
        toCurrency: CurrencyCode.COP,
        source: 'manual',
      };
      service.convertAmount.mockResolvedValue(conversionResult);

      const result = await controller.convert(convertDto);

      expect(result).toEqual(conversionResult);
      expect(service.convertAmount).toHaveBeenCalledWith(convertDto);
    });

    it('should propagate NotFoundException when no rate exists for conversion', async () => {
      service.convertAmount.mockRejectedValue(
        new NotFoundException(
          'No se encontró tasa de cambio para USD/COP',
        ),
      );

      await expect(controller.convert(convertDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an exchange rate by id', async () => {
      service.remove.mockResolvedValue(mockExchangeRate);

      const result = await controller.remove('rate-123');

      expect(result).toEqual(mockExchangeRate);
      expect(service.remove).toHaveBeenCalledWith('rate-123');
    });

    it('should propagate NotFoundException when rate does not exist', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Tasa de cambio no encontrada'),
      );

      await expect(controller.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
