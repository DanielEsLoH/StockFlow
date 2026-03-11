import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';

export async function seedExchangeRates(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  // --- DEMO (3 rates) ---
  const demoRates = [
    {
      tenantId: ctx.tenants.demo.id,
      fromCurrency: 'USD',
      toCurrency: 'COP',
      rate: 4150.5,
      effectiveDate: new Date('2025-01-15'),
      source: 'api',
    },
    {
      tenantId: ctx.tenants.demo.id,
      fromCurrency: 'USD',
      toCurrency: 'COP',
      rate: 4200.75,
      effectiveDate: new Date('2025-02-15'),
      source: 'api',
    },
    {
      tenantId: ctx.tenants.demo.id,
      fromCurrency: 'EUR',
      toCurrency: 'COP',
      rate: 4520.3,
      effectiveDate: new Date('2025-02-15'),
      source: 'manual',
    },
  ];

  // --- DISTRIBUIDORA (2 rates) ---
  const distRates = [
    {
      tenantId: ctx.tenants.distribuidora.id,
      fromCurrency: 'USD',
      toCurrency: 'COP',
      rate: 4180.0,
      effectiveDate: new Date('2025-02-01'),
      source: 'api',
    },
    {
      tenantId: ctx.tenants.distribuidora.id,
      fromCurrency: 'USD',
      toCurrency: 'COP',
      rate: 4210.25,
      effectiveDate: new Date('2025-03-01'),
      source: 'api',
    },
  ];

  // --- PAPELERÍA (1 rate) ---
  const papRates = [
    {
      tenantId: ctx.tenants.papeleria.id,
      fromCurrency: 'USD',
      toCurrency: 'COP',
      rate: 4200.0,
      effectiveDate: new Date('2025-03-01'),
      source: 'manual',
    },
  ];

  await prisma.exchangeRate.createMany({
    data: [...demoRates, ...distRates, ...papRates] as any,
  });
}
