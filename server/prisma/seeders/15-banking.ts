import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo, randomDate } from './helpers';

export async function seedBanking(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('🏦 Seeding banking...');

  // ── Demo Tenant (3 bank accounts) ──────────────────────────────────
  const demoTenantId = ctx.tenants.demo.id;
  const demoAdmin = ctx.users.demo.admin;
  const demoContador = ctx.users.demo.contador;
  console.log('  → Demo tenant banking...');

  // Create BBVA USD account in chart of accounts first
  const parentAccountId1110 = ctx.accounts.get(`${demoTenantId}:1110`);
  const bbvaAccount = await prisma.account.create({
    data: {
      tenantId: demoTenantId,
      code: '111015',
      name: 'BBVA Cuenta USD',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: parentAccountId1110 ?? null,
      level: 6,
      isBankAccount: true,
      isActive: true,
    },
  });
  ctx.accounts.set(`${demoTenantId}:111015`, bbvaAccount.id);

  // Bank Accounts
  const demoBancolombia = await prisma.bankAccount.create({
    data: {
      tenantId: demoTenantId,
      accountId: ctx.accounts.get(`${demoTenantId}:111005`)!,
      name: 'Bancolombia Corriente',
      bankName: 'Bancolombia',
      accountNumber: '0011223344',
      accountType: 'CHECKING',
      currency: 'COP',
      initialBalance: 52000000,
      currentBalance: 48500000,
      isActive: true,
    },
  });
  ctx.bankAccounts.set(`${demoTenantId}:Bancolombia`, demoBancolombia.id);

  const demoDavivienda = await prisma.bankAccount.create({
    data: {
      tenantId: demoTenantId,
      accountId: ctx.accounts.get(`${demoTenantId}:111010`)!,
      name: 'Davivienda Ahorros',
      bankName: 'Davivienda',
      accountNumber: '0055667788',
      accountType: 'SAVINGS',
      currency: 'COP',
      initialBalance: 18000000,
      currentBalance: 21500000,
      isActive: true,
    },
  });
  ctx.bankAccounts.set(`${demoTenantId}:Davivienda`, demoDavivienda.id);

  const demoBBVA = await prisma.bankAccount.create({
    data: {
      tenantId: demoTenantId,
      accountId: bbvaAccount.id,
      name: 'BBVA USD',
      bankName: 'BBVA',
      accountNumber: '0099887766',
      accountType: 'CHECKING',
      currency: 'USD',
      initialBalance: 12000,
      currentBalance: 11200,
      isActive: true,
    },
  });
  ctx.bankAccounts.set(`${demoTenantId}:BBVA`, demoBBVA.id);

  console.log('    ✓ 3 demo bank accounts created');

  // ── Demo Statements ────────────────────────────────────────────────

  // Statement 1: Bancolombia Jan 2025 — RECONCILED (15 lines: 10 MATCHED, 3 MANUALLY_MATCHED, 2 UNMATCHED)
  const stmt1 = await prisma.bankStatement.create({
    data: {
      tenantId: demoTenantId,
      bankAccountId: demoBancolombia.id,
      fileName: 'bancolombia_enero_2025.csv',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
      status: 'RECONCILED',
      totalLines: 15,
      matchedLines: 13,
      importedAt: new Date('2025-02-02T10:00:00Z'),
      importedById: demoContador.id,
      reconciledAt: new Date('2025-02-05T16:30:00Z'),
    },
  });

  const stmt1Lines = [
    { lineDate: new Date('2025-01-03'), description: 'Consignación cliente Almacenes Éxito', reference: 'CON-001', debit: 0, credit: 12500000, balance: 64500000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-04'), description: 'Pago proveedor Samsung - Factura FC-2024-089', reference: 'PAG-001', debit: 8750000, credit: 0, balance: 55750000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-06'), description: 'Transferencia recibida - Cliente TechCorp', reference: 'TRF-001', debit: 0, credit: 5200000, balance: 60950000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-08'), description: 'Comisión bancaria mensual', reference: 'COM-001', debit: 185000, credit: 0, balance: 60765000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-10'), description: 'Pago nómina quincenal enero', reference: 'NOM-001', debit: 4500000, credit: 0, balance: 56265000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-12'), description: 'Consignación cliente Distribuidora ABC', reference: 'CON-002', debit: 0, credit: 3800000, balance: 60065000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-14'), description: 'Pago proveedor Lenovo - Factura FC-2024-102', reference: 'PAG-002', debit: 6200000, credit: 0, balance: 53865000, status: 'MANUALLY_MATCHED' as const },
    { lineDate: new Date('2025-01-16'), description: 'Transferencia recibida - Pago factura FV-TD-00015', reference: 'TRF-002', debit: 0, credit: 7400000, balance: 61265000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-18'), description: 'Pago servicios públicos - EPM', reference: 'SER-001', debit: 950000, credit: 0, balance: 60315000, status: 'MANUALLY_MATCHED' as const },
    { lineDate: new Date('2025-01-20'), description: 'Consignación efectivo punto de venta', reference: 'CON-003', debit: 0, credit: 2100000, balance: 62415000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-22'), description: 'Pago proveedor Apple Distribución', reference: 'PAG-003', debit: 15000000, credit: 0, balance: 47415000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-24'), description: 'GMF (4x1000) acumulado enero', reference: 'IMP-001', debit: 245000, credit: 0, balance: 47170000, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-01-25'), description: 'Pago nómina quincenal enero', reference: 'NOM-002', debit: 4500000, credit: 0, balance: 42670000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-01-28'), description: 'Transferencia recibida - Cliente Papelería Sur', reference: 'TRF-003', debit: 0, credit: 6800000, balance: 49470000, status: 'MANUALLY_MATCHED' as const },
    { lineDate: new Date('2025-01-30'), description: 'Rendimiento cuenta corriente', reference: 'REN-001', debit: 0, credit: 530000, balance: 50000000, status: 'UNMATCHED' as const },
  ];

  for (const line of stmt1Lines) {
    await prisma.bankStatementLine.create({
      data: {
        statementId: stmt1.id,
        lineDate: line.lineDate,
        description: line.description,
        reference: line.reference,
        debit: line.debit,
        credit: line.credit,
        balance: line.balance,
        status: line.status,
        matchedAt: line.status !== 'UNMATCHED' ? new Date('2025-02-05T16:30:00Z') : null,
        matchedById: line.status !== 'UNMATCHED' ? demoContador.id : null,
      },
    });
  }

  // Statement 2: Bancolombia Feb 2025 — PARTIALLY_RECONCILED (12 lines: 6 MATCHED, 6 UNMATCHED)
  const stmt2 = await prisma.bankStatement.create({
    data: {
      tenantId: demoTenantId,
      bankAccountId: demoBancolombia.id,
      fileName: 'bancolombia_febrero_2025.csv',
      periodStart: new Date('2025-02-01'),
      periodEnd: new Date('2025-02-28'),
      status: 'PARTIALLY_RECONCILED',
      totalLines: 12,
      matchedLines: 6,
      importedAt: new Date('2025-03-03T09:00:00Z'),
      importedById: demoContador.id,
    },
  });

  const stmt2Lines = [
    { lineDate: new Date('2025-02-03'), description: 'Consignación cliente Carrefour', reference: 'CON-004', debit: 0, credit: 9800000, balance: 59800000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-05'), description: 'Pago proveedor Sony - Factura FC-2025-003', reference: 'PAG-004', debit: 3400000, credit: 0, balance: 56400000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-07'), description: 'Transferencia recibida - Anticipo pedido #1042', reference: 'TRF-004', debit: 0, credit: 4500000, balance: 60900000, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-10'), description: 'Pago nómina quincenal febrero', reference: 'NOM-003', debit: 4500000, credit: 0, balance: 56400000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-12'), description: 'Comisión transferencia ACH', reference: 'COM-002', debit: 12500, credit: 0, balance: 56387500, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-14'), description: 'Consignación cliente MegaStore', reference: 'CON-005', debit: 0, credit: 6700000, balance: 63087500, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-17'), description: 'Pago arriendo bodega principal', reference: 'ARR-001', debit: 3200000, credit: 0, balance: 59887500, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-19'), description: 'Transferencia recibida - Pago factura FV-TD-00022', reference: 'TRF-005', debit: 0, credit: 8100000, balance: 67987500, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-21'), description: 'Pago seguro mercancía', reference: 'SEG-001', debit: 1850000, credit: 0, balance: 66137500, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-24'), description: 'Pago nómina quincenal febrero', reference: 'NOM-004', debit: 4500000, credit: 0, balance: 61637500, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-26'), description: 'Consignación efectivo tienda centro', reference: 'CON-006', debit: 0, credit: 1900000, balance: 63537500, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-28'), description: 'GMF (4x1000) acumulado febrero', reference: 'IMP-002', debit: 278000, credit: 0, balance: 63259500, status: 'UNMATCHED' as const },
  ];

  for (const line of stmt2Lines) {
    await prisma.bankStatementLine.create({
      data: {
        statementId: stmt2.id,
        lineDate: line.lineDate,
        description: line.description,
        reference: line.reference,
        debit: line.debit,
        credit: line.credit,
        balance: line.balance,
        status: line.status,
        matchedAt: line.status === 'MATCHED' ? new Date('2025-03-05T14:00:00Z') : null,
        matchedById: line.status === 'MATCHED' ? demoContador.id : null,
      },
    });
  }

  // Statement 3: Davivienda Jan 2025 — IMPORTED (8 lines, all UNMATCHED)
  const stmt3 = await prisma.bankStatement.create({
    data: {
      tenantId: demoTenantId,
      bankAccountId: demoDavivienda.id,
      fileName: 'davivienda_enero_2025.xlsx',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
      status: 'IMPORTED',
      totalLines: 8,
      matchedLines: 0,
      importedAt: new Date('2025-02-10T11:30:00Z'),
      importedById: demoContador.id,
    },
  });

  const stmt3Lines = [
    { lineDate: new Date('2025-01-05'), description: 'Rendimiento cuenta ahorros', reference: null, debit: 0, credit: 320000, balance: 18320000 },
    { lineDate: new Date('2025-01-08'), description: 'Transferencia enviada a Bancolombia', reference: 'TRF-INT-001', debit: 2000000, credit: 0, balance: 16320000 },
    { lineDate: new Date('2025-01-12'), description: 'Consignación recibida - Abono cliente', reference: null, debit: 0, credit: 4500000, balance: 20820000 },
    { lineDate: new Date('2025-01-15'), description: 'Retención en la fuente', reference: 'RET-001', debit: 156000, credit: 0, balance: 20664000 },
    { lineDate: new Date('2025-01-18'), description: 'Comisión manejo cuenta', reference: null, debit: 28000, credit: 0, balance: 20636000 },
    { lineDate: new Date('2025-01-22'), description: 'Transferencia recibida - Pago anticipo', reference: 'TRF-EXT-001', debit: 0, credit: 3200000, balance: 23836000 },
    { lineDate: new Date('2025-01-26'), description: 'Pago impuesto ICA bimestral', reference: 'IMP-ICA-001', debit: 850000, credit: 0, balance: 22986000 },
    { lineDate: new Date('2025-01-30'), description: 'GMF (4x1000) acumulado enero', reference: null, debit: 42000, credit: 0, balance: 22944000 },
  ];

  for (const line of stmt3Lines) {
    await prisma.bankStatementLine.create({
      data: {
        statementId: stmt3.id,
        lineDate: line.lineDate,
        description: line.description,
        reference: line.reference,
        debit: line.debit,
        credit: line.credit,
        balance: line.balance,
        status: 'UNMATCHED',
      },
    });
  }

  console.log('    ✓ 3 demo statements with 35 lines created');

  // ── Distribuidora Tenant (2 bank accounts) ─────────────────────────
  const distTenantId = ctx.tenants.distribuidora.id;
  const distContador = ctx.users.distribuidora.contador;
  console.log('  → Distribuidora tenant banking...');

  const distBogota = await prisma.bankAccount.create({
    data: {
      tenantId: distTenantId,
      accountId: ctx.accounts.get(`${distTenantId}:111005`)!,
      name: 'Banco de Bogotá Corriente',
      bankName: 'Banco de Bogotá',
      accountNumber: '1122334455',
      accountType: 'CHECKING',
      currency: 'COP',
      initialBalance: 35000000,
      currentBalance: 32000000,
      isActive: true,
    },
  });
  ctx.bankAccounts.set(`${distTenantId}:Banco de Bogotá`, distBogota.id);

  const distNequi = await prisma.bankAccount.create({
    data: {
      tenantId: distTenantId,
      accountId: ctx.accounts.get(`${distTenantId}:111010`)!,
      name: 'Nequi',
      bankName: 'Nequi',
      accountNumber: '3001234567',
      accountType: 'SAVINGS',
      currency: 'COP',
      initialBalance: 5000000,
      currentBalance: 4800000,
      isActive: true,
    },
  });
  ctx.bankAccounts.set(`${distTenantId}:Nequi`, distNequi.id);

  console.log('    ✓ 2 distribuidora bank accounts created');

  // Statement: Banco Bogotá Feb 2025 — PARTIALLY_RECONCILED (10 lines)
  const stmt4 = await prisma.bankStatement.create({
    data: {
      tenantId: distTenantId,
      bankAccountId: distBogota.id,
      fileName: 'banco_bogota_febrero_2025.csv',
      periodStart: new Date('2025-02-01'),
      periodEnd: new Date('2025-02-28'),
      status: 'PARTIALLY_RECONCILED',
      totalLines: 10,
      matchedLines: 5,
      importedAt: new Date('2025-03-05T08:30:00Z'),
      importedById: distContador.id,
    },
  });

  const stmt4Lines = [
    { lineDate: new Date('2025-02-03'), description: 'Consignación cliente Supermercado La 14', reference: 'CON-D01', debit: 0, credit: 8500000, balance: 43500000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-05'), description: 'Pago proveedor Productos Familia', reference: 'PAG-D01', debit: 4200000, credit: 0, balance: 39300000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-08'), description: 'Transferencia recibida - Tienda Don José', reference: 'TRF-D01', debit: 0, credit: 2300000, balance: 41600000, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-10'), description: 'Pago nómina primera quincena', reference: 'NOM-D01', debit: 3800000, credit: 0, balance: 37800000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-13'), description: 'Pago proveedor Colombina - Factura 4521', reference: 'PAG-D02', debit: 2900000, credit: 0, balance: 34900000, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-16'), description: 'Consignación cliente Minimercado Express', reference: 'CON-D02', debit: 0, credit: 5100000, balance: 40000000, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-19'), description: 'Comisión transferencia interbancaria', reference: 'COM-D01', debit: 8500, credit: 0, balance: 39991500, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-22'), description: 'Pago servicios transporte - Coordinadora', reference: 'SER-D01', debit: 1250000, credit: 0, balance: 38741500, status: 'UNMATCHED' as const },
    { lineDate: new Date('2025-02-25'), description: 'Pago nómina segunda quincena', reference: 'NOM-D02', debit: 3800000, credit: 0, balance: 34941500, status: 'MATCHED' as const },
    { lineDate: new Date('2025-02-28'), description: 'Consignación efectivo ruta norte', reference: 'CON-D03', debit: 0, credit: 3200000, balance: 38141500, status: 'UNMATCHED' as const },
  ];

  for (const line of stmt4Lines) {
    await prisma.bankStatementLine.create({
      data: {
        statementId: stmt4.id,
        lineDate: line.lineDate,
        description: line.description,
        reference: line.reference,
        debit: line.debit,
        credit: line.credit,
        balance: line.balance,
        status: line.status,
        matchedAt: line.status === 'MATCHED' ? new Date('2025-03-06T10:00:00Z') : null,
        matchedById: line.status === 'MATCHED' ? distContador.id : null,
      },
    });
  }

  console.log('    ✓ 1 distribuidora statement with 10 lines created');

  // ── Papelería Tenant (2 bank accounts) ─────────────────────────────
  const papTenantId = ctx.tenants.papeleria.id;
  const papContador = ctx.users.papeleria.contador;
  console.log('  → Papelería tenant banking...');

  const papBancolombia = await prisma.bankAccount.create({
    data: {
      tenantId: papTenantId,
      accountId: ctx.accounts.get(`${papTenantId}:111005`)!,
      name: 'Bancolombia Ahorros',
      bankName: 'Bancolombia',
      accountNumber: '2233445566',
      accountType: 'SAVINGS',
      currency: 'COP',
      initialBalance: 8000000,
      currentBalance: 9200000,
      isActive: true,
    },
  });
  ctx.bankAccounts.set(`${papTenantId}:Bancolombia`, papBancolombia.id);

  const papDavivienda = await prisma.bankAccount.create({
    data: {
      tenantId: papTenantId,
      accountId: ctx.accounts.get(`${papTenantId}:111010`)!,
      name: 'Davivienda Corriente',
      bankName: 'Davivienda',
      accountNumber: '3344556677',
      accountType: 'CHECKING',
      currency: 'COP',
      initialBalance: 12000000,
      currentBalance: 10500000,
      isActive: true,
    },
  });
  ctx.bankAccounts.set(`${papTenantId}:Davivienda`, papDavivienda.id);

  console.log('    ✓ 2 papelería bank accounts created');

  // Statement: Bancolombia Jan 2025 — IMPORTED (6 lines, all UNMATCHED)
  const stmt5 = await prisma.bankStatement.create({
    data: {
      tenantId: papTenantId,
      bankAccountId: papBancolombia.id,
      fileName: 'bancolombia_enero_2025.csv',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
      status: 'IMPORTED',
      totalLines: 6,
      matchedLines: 0,
      importedAt: new Date('2025-02-08T14:00:00Z'),
      importedById: papContador.id,
    },
  });

  const stmt5Lines = [
    { lineDate: new Date('2025-01-04'), description: 'Consignación ventas mostrador semanal', reference: null, debit: 0, credit: 2800000, balance: 10800000 },
    { lineDate: new Date('2025-01-10'), description: 'Pago proveedor Carvajal Educación', reference: 'PAG-P01', debit: 1500000, credit: 0, balance: 9300000 },
    { lineDate: new Date('2025-01-15'), description: 'Rendimiento cuenta ahorros', reference: null, debit: 0, credit: 85000, balance: 9385000 },
    { lineDate: new Date('2025-01-18'), description: 'Pago proveedor Faber-Castell', reference: 'PAG-P02', debit: 920000, credit: 0, balance: 8465000 },
    { lineDate: new Date('2025-01-24'), description: 'Consignación ventas mostrador semanal', reference: null, debit: 0, credit: 3100000, balance: 11565000 },
    { lineDate: new Date('2025-01-31'), description: 'Comisión manejo cuenta', reference: null, debit: 15000, credit: 0, balance: 11550000 },
  ];

  for (const line of stmt5Lines) {
    await prisma.bankStatementLine.create({
      data: {
        statementId: stmt5.id,
        lineDate: line.lineDate,
        description: line.description,
        reference: line.reference,
        debit: line.debit,
        credit: line.credit,
        balance: line.balance,
        status: 'UNMATCHED',
      },
    });
  }

  console.log('    ✓ 1 papelería statement with 6 lines created');

  console.log(
    `✅ Banking seeded: 7 bank accounts, 5 statements, ${15 + 12 + 8 + 10 + 6} lines total`,
  );
}
