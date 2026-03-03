import { Injectable, NotFoundException } from '@nestjs/common';
import { CurrencyCode, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common';
import {
  CreateExchangeRateDto,
  FilterExchangeRatesDto,
  ConvertAmountDto,
} from './dto';

/**
 * ExchangeRatesService — manages currency exchange rates per tenant.
 *
 * nestjs-best-practices applied:
 * - arch-single-responsibility: focused on exchange rate operations only
 * - di-prefer-constructor-injection: all deps via constructor
 * - error-throw-http-exceptions: NestJS HTTP exceptions
 * - perf-optimize-database: indexed queries with tenant scoping
 */
@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new exchange rate entry.
   */
  async create(dto: CreateExchangeRateDto) {
    const tenantId = this.tenantContext.requireTenantId();

    return this.prisma.exchangeRate.create({
      data: {
        tenantId,
        fromCurrency: dto.fromCurrency,
        toCurrency: dto.toCurrency,
        rate: new Prisma.Decimal(dto.rate),
        effectiveDate: dto.effectiveDate
          ? new Date(dto.effectiveDate)
          : new Date(),
        source: dto.source ?? 'manual',
      },
    });
  }

  /**
   * List exchange rates with optional filters.
   */
  async findAll(filters?: FilterExchangeRatesDto) {
    const tenantId = this.tenantContext.requireTenantId();

    const where: Prisma.ExchangeRateWhereInput = { tenantId };

    if (filters?.fromCurrency) {
      where.fromCurrency = filters.fromCurrency;
    }
    if (filters?.toCurrency) {
      where.toCurrency = filters.toCurrency;
    }
    if (filters?.startDate || filters?.endDate) {
      where.effectiveDate = {};
      if (filters?.startDate) {
        where.effectiveDate.gte = new Date(filters.startDate);
      }
      if (filters?.endDate) {
        where.effectiveDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.exchangeRate.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });
  }

  /**
   * Get the latest exchange rate for a currency pair.
   */
  async getLatestRate(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
  ) {
    // Same currency — rate is always 1
    if (fromCurrency === toCurrency) {
      return { rate: new Prisma.Decimal(1), source: 'identity' };
    }

    const tenantId = this.tenantContext.requireTenantId();

    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        tenantId,
        fromCurrency,
        toCurrency,
        effectiveDate: { lte: new Date() },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rate) {
      // Try inverse rate
      const inverseRate = await this.prisma.exchangeRate.findFirst({
        where: {
          tenantId,
          fromCurrency: toCurrency,
          toCurrency: fromCurrency,
          effectiveDate: { lte: new Date() },
        },
        orderBy: { effectiveDate: 'desc' },
      });

      if (!inverseRate) {
        throw new NotFoundException(
          `No se encontró tasa de cambio para ${fromCurrency}/${toCurrency}`,
        );
      }

      // Return inverse: 1 / rate
      const invertedRate = new Prisma.Decimal(1).div(inverseRate.rate);
      return { rate: invertedRate, source: `inverse:${inverseRate.source}` };
    }

    return { rate: rate.rate, source: rate.source };
  }

  /**
   * Convert an amount between currencies using the latest rate.
   */
  async convertAmount(dto: ConvertAmountDto) {
    const { rate, source } = await this.getLatestRate(
      dto.fromCurrency,
      dto.toCurrency,
    );

    const convertedAmount = new Prisma.Decimal(dto.amount).mul(rate);

    return {
      originalAmount: dto.amount,
      convertedAmount: convertedAmount.toDecimalPlaces(2).toNumber(),
      rate: rate.toNumber(),
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
      source,
    };
  }

  /**
   * Delete an exchange rate by ID.
   */
  async remove(id: string) {
    const tenantId = this.tenantContext.requireTenantId();

    const rate = await this.prisma.exchangeRate.findFirst({
      where: { id, tenantId },
    });

    if (!rate) {
      throw new NotFoundException('Tasa de cambio no encontrada');
    }

    return this.prisma.exchangeRate.delete({ where: { id } });
  }

  /**
   * Get all supported currencies with their display info.
   */
  getSupportedCurrencies() {
    return [
      { code: 'COP', name: 'Peso Colombiano', symbol: '$', decimals: 0 },
      { code: 'USD', name: 'Dólar Estadounidense', symbol: 'US$', decimals: 2 },
      { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
      { code: 'MXN', name: 'Peso Mexicano', symbol: 'MX$', decimals: 2 },
      { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', decimals: 2 },
      { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', decimals: 2 },
    ];
  }
}
