import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysFromNow, daysAgo } from './helpers';

export async function seedRecurringInvoices(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  const demoProducts = ctx.products.demo;
  const demoCustomers = ctx.customers.demo;
  const demoWarehouses = ctx.warehouses.demo;

  const distProducts = ctx.products.distribuidora;
  const distCustomers = ctx.customers.distribuidora;
  const distWarehouses = ctx.warehouses.distribuidora;

  const papProducts = ctx.products.papeleria;
  const papCustomers = ctx.customers.papeleria;
  const papWarehouses = ctx.warehouses.papeleria;

  // --- DEMO (3 recurring invoices) ---

  // 1. MONTHLY: Active, 2-3 items, autoSend + autoEmail
  await prisma.recurringInvoice.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      customerId: demoCustomers[0].id,
      warehouseId: demoWarehouses.main.id,
      notes: 'Factura recurrente mensual para suministros de oficina',
      items: [
        {
          productId: demoProducts[0].id,
          quantity: 5,
          unitPrice: demoProducts[0].salePrice,
          taxRate: demoProducts[0].taxRate,
        },
        {
          productId: demoProducts[1].id,
          quantity: 10,
          unitPrice: demoProducts[1].salePrice,
          taxRate: demoProducts[1].taxRate,
        },
        {
          productId: demoProducts[2].id,
          quantity: 3,
          unitPrice: demoProducts[2].salePrice,
          taxRate: demoProducts[2].taxRate,
        },
      ],
      interval: 'MONTHLY',
      nextIssueDate: daysFromNow(15),
      lastIssuedAt: daysAgo(15),
      autoSend: true,
      autoEmail: true,
      isActive: true,
    },
  });

  // 2. QUARTERLY: Active, nextIssueDate in 60 days, lastIssuedAt 30 days ago
  await prisma.recurringInvoice.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      customerId: demoCustomers[1 % demoCustomers.length].id,
      warehouseId: demoWarehouses.main.id,
      notes: 'Factura trimestral de mantenimiento y servicios',
      items: [
        {
          productId: demoProducts[3 % demoProducts.length].id,
          quantity: 1,
          unitPrice: demoProducts[3 % demoProducts.length].salePrice,
          taxRate: demoProducts[3 % demoProducts.length].taxRate,
        },
        {
          productId: demoProducts[4 % demoProducts.length].id,
          quantity: 2,
          unitPrice: demoProducts[4 % demoProducts.length].salePrice,
          taxRate: demoProducts[4 % demoProducts.length].taxRate,
        },
      ],
      interval: 'QUARTERLY',
      nextIssueDate: daysFromNow(60),
      lastIssuedAt: daysAgo(30),
      autoSend: true,
      autoEmail: false,
      isActive: true,
    },
  });

  // 3. WEEKLY: Inactive, endDate in the past
  await prisma.recurringInvoice.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      customerId: demoCustomers[2 % demoCustomers.length].id,
      notes: 'Pedido semanal de insumos — contrato finalizado',
      items: [
        {
          productId: demoProducts[5 % demoProducts.length].id,
          quantity: 20,
          unitPrice: demoProducts[5 % demoProducts.length].salePrice,
          taxRate: demoProducts[5 % demoProducts.length].taxRate,
        },
      ],
      interval: 'WEEKLY',
      nextIssueDate: daysAgo(7),
      endDate: daysAgo(7),
      lastIssuedAt: daysAgo(14),
      autoSend: false,
      autoEmail: false,
      isActive: false,
    },
  });

  // --- DISTRIBUIDORA (2 recurring invoices) ---

  // 1. MONTHLY: Active
  await prisma.recurringInvoice.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      customerId: distCustomers[0].id,
      warehouseId: distWarehouses.main.id,
      notes: 'Suministro mensual de productos para distribución',
      items: [
        {
          productId: distProducts[0].id,
          quantity: 50,
          unitPrice: distProducts[0].salePrice,
          taxRate: distProducts[0].taxRate,
        },
        {
          productId: distProducts[1 % distProducts.length].id,
          quantity: 30,
          unitPrice: distProducts[1 % distProducts.length].salePrice,
          taxRate: distProducts[1 % distProducts.length].taxRate,
        },
      ],
      interval: 'MONTHLY',
      nextIssueDate: daysFromNow(20),
      lastIssuedAt: daysAgo(10),
      autoSend: true,
      autoEmail: true,
      isActive: true,
    },
  });

  // 2. BIWEEKLY: Active
  await prisma.recurringInvoice.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      customerId: distCustomers[1 % distCustomers.length].id,
      notes: 'Reposición quincenal de inventario',
      items: [
        {
          productId: distProducts[2 % distProducts.length].id,
          quantity: 15,
          unitPrice: distProducts[2 % distProducts.length].salePrice,
          taxRate: distProducts[2 % distProducts.length].taxRate,
        },
      ],
      interval: 'BIWEEKLY',
      nextIssueDate: daysFromNow(10),
      lastIssuedAt: daysAgo(4),
      autoSend: true,
      autoEmail: false,
      isActive: true,
    },
  });

  // --- PAPELERÍA (1 recurring invoice) ---

  // 1. MONTHLY: Active
  await prisma.recurringInvoice.create({
    data: {
      tenantId: ctx.tenants.papeleria.id,
      customerId: papCustomers[0].id,
      warehouseId: papWarehouses.main.id,
      notes: 'Pedido mensual de papelería y útiles escolares',
      items: [
        {
          productId: papProducts[0].id,
          quantity: 100,
          unitPrice: papProducts[0].salePrice,
          taxRate: papProducts[0].taxRate,
        },
        {
          productId: papProducts[1 % papProducts.length].id,
          quantity: 50,
          unitPrice: papProducts[1 % papProducts.length].salePrice,
          taxRate: papProducts[1 % papProducts.length].taxRate,
        },
      ],
      interval: 'MONTHLY',
      nextIssueDate: daysFromNow(25),
      lastIssuedAt: daysAgo(5),
      autoSend: true,
      autoEmail: true,
      isActive: true,
    },
  });
}
