import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';

// ── Helper: create account and store in context map ──────────────────
async function createAccount(
  prisma: PrismaClient,
  tenantId: string,
  data: {
    code: string;
    name: string;
    description?: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COGS';
    nature: 'DEBIT' | 'CREDIT';
    parentId?: string | null;
    level: number;
    isActive?: boolean;
    isSystemAccount?: boolean;
    isBankAccount?: boolean;
  },
  ctx: SeedContext,
) {
  const account = await prisma.account.create({
    data: {
      tenantId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      nature: data.nature,
      parentId: data.parentId ?? null,
      level: data.level,
      isActive: data.isActive ?? true,
      isSystemAccount: data.isSystemAccount ?? false,
      isBankAccount: data.isBankAccount ?? false,
    },
  });
  ctx.accounts.set(`${tenantId}:${data.code}`, account.id);
  return account;
}

// ── Helper: get account ID from context map ──────────────────────────
function acctId(ctx: SeedContext, tenantId: string, code: string): string {
  const id = ctx.accounts.get(`${tenantId}:${code}`);
  if (!id) {
    throw new Error(
      `Account not found in context: tenant=${tenantId}, code=${code}`,
    );
  }
  return id;
}

// ── Create full PUC chart of accounts for a tenant ───────────────────
async function createPUC(
  prisma: PrismaClient,
  tenantId: string,
  ctx: SeedContext,
): Promise<void> {
  // ─── Level 1: Classes ──────────────────────────────────────────────
  await createAccount(
    prisma,
    tenantId,
    {
      code: '1',
      name: 'Activo',
      description: 'Bienes y derechos de la empresa',
      type: 'ASSET',
      nature: 'DEBIT',
      level: 1,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2',
      name: 'Pasivo',
      description: 'Obligaciones y deudas de la empresa',
      type: 'LIABILITY',
      nature: 'CREDIT',
      level: 1,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '3',
      name: 'Patrimonio',
      description: 'Capital y resultados acumulados',
      type: 'EQUITY',
      nature: 'CREDIT',
      level: 1,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '4',
      name: 'Ingresos',
      description: 'Ingresos operacionales y no operacionales',
      type: 'REVENUE',
      nature: 'CREDIT',
      level: 1,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '5',
      name: 'Gastos',
      description: 'Gastos operacionales y no operacionales',
      type: 'EXPENSE',
      nature: 'DEBIT',
      level: 1,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '6',
      name: 'Costos de Venta',
      description: 'Costos directos de los productos vendidos',
      type: 'COGS',
      nature: 'DEBIT',
      level: 1,
      isSystemAccount: true,
    },
    ctx,
  );

  // ─── Level 2: Groups ──────────────────────────────────────────────
  await createAccount(
    prisma,
    tenantId,
    {
      code: '11',
      name: 'Disponible',
      description: 'Recursos de liquidez inmediata',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '13',
      name: 'Deudores',
      description: 'Cuentas por cobrar comerciales y otras',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '14',
      name: 'Inventarios',
      description: 'Mercancías y materias primas',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '22',
      name: 'Proveedores',
      description: 'Cuentas por pagar a proveedores',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '23',
      name: 'Cuentas por Pagar',
      description: 'Costos y gastos por pagar',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '24',
      name: 'Impuestos, Gravámenes y Tasas',
      description: 'Obligaciones tributarias por pagar',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '25',
      name: 'Obligaciones Laborales',
      description: 'Pasivos laborales y prestaciones sociales',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '31',
      name: 'Capital Social',
      description: 'Aportes de los socios',
      type: 'EQUITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '3'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '36',
      name: 'Resultados del Ejercicio',
      description: 'Utilidad o pérdida del período',
      type: 'EQUITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '3'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '41',
      name: 'Ingresos Operacionales',
      description: 'Ingresos derivados de la actividad principal',
      type: 'REVENUE',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '4'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '51',
      name: 'Gastos Operacionales de Administración',
      description: 'Gastos de administración del negocio',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '52',
      name: 'Gastos Operacionales de Ventas',
      description: 'Gastos asociados a la actividad de ventas',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '61',
      name: 'Costo de Ventas y Prestación de Servicios',
      description: 'Costo directo de la mercancía vendida',
      type: 'COGS',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '6'),
      level: 2,
      isSystemAccount: true,
    },
    ctx,
  );

  // ─── Level 3: Subgroups / Accounts ────────────────────────────────
  // Disponible
  await createAccount(
    prisma,
    tenantId,
    {
      code: '1105',
      name: 'Caja',
      description: 'Efectivo en caja',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '11'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '1110',
      name: 'Bancos',
      description: 'Cuentas bancarias',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '11'),
      level: 3,
      isSystemAccount: true,
      isBankAccount: true,
    },
    ctx,
  );

  // Deudores
  await createAccount(
    prisma,
    tenantId,
    {
      code: '1305',
      name: 'Clientes',
      description: 'Cuentas por cobrar a clientes',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '13'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // Inventarios
  await createAccount(
    prisma,
    tenantId,
    {
      code: '1435',
      name: 'Mercancías no Fabricadas por la Empresa',
      description: 'Inventario de mercancías para la venta',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '14'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // Proveedores
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2205',
      name: 'Proveedores Nacionales',
      description: 'Cuentas por pagar a proveedores nacionales',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '22'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // Retención en la Fuente
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2365',
      name: 'Retención en la Fuente',
      description: 'Retenciones practicadas por pagar',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '23'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // IVA
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2408',
      name: 'Impuesto sobre las Ventas por Pagar',
      description: 'IVA generado en ventas',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '24'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2404',
      name: 'IVA Descontable',
      description: 'IVA pagado en compras descontable',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '24'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // Obligaciones Laborales
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2505',
      name: 'Salarios por Pagar',
      description: 'Nómina pendiente de pago',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '25'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2510',
      name: 'Cesantías Consolidadas',
      description: 'Provisión de cesantías',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '25'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2515',
      name: 'Intereses sobre Cesantías',
      description: 'Intereses sobre cesantías consolidadas',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '25'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2520',
      name: 'Prima de Servicios',
      description: 'Provisión de prima de servicios',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '25'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2525',
      name: 'Vacaciones Consolidadas',
      description: 'Provisión de vacaciones',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '25'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '2570',
      name: 'Aportes Parafiscales',
      description: 'Aportes a entidades parafiscales',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '25'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // Ingresos Operacionales
  await createAccount(
    prisma,
    tenantId,
    {
      code: '4135',
      name: 'Comercio al Por Mayor y al Por Menor',
      description: 'Ingresos por venta de mercancías',
      type: 'REVENUE',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '41'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // Gastos Operacionales de Administración
  await createAccount(
    prisma,
    tenantId,
    {
      code: '5105',
      name: 'Gastos de Personal',
      description: 'Sueldos, salarios y prestaciones',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '51'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '5110',
      name: 'Honorarios',
      description: 'Pagos por servicios profesionales',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '51'),
      level: 3,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '5115',
      name: 'Impuestos',
      description: 'Impuestos asumidos',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '51'),
      level: 3,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '5120',
      name: 'Arrendamientos',
      description: 'Arriendos de locales y oficinas',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '51'),
      level: 3,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '5135',
      name: 'Servicios',
      description: 'Servicios públicos y otros',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '51'),
      level: 3,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '5195',
      name: 'Diversos',
      description: 'Otros gastos operacionales',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '51'),
      level: 3,
    },
    ctx,
  );

  // Costo de Ventas
  await createAccount(
    prisma,
    tenantId,
    {
      code: '6135',
      name: 'Comercio al Por Mayor y al Por Menor',
      description: 'Costo de la mercancía vendida',
      type: 'COGS',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '61'),
      level: 3,
      isSystemAccount: true,
    },
    ctx,
  );

  // ─── Level 4: Auxiliary / Detail Accounts ─────────────────────────
  // Caja
  await createAccount(
    prisma,
    tenantId,
    {
      code: '110505',
      name: 'Caja General',
      description: 'Caja general del negocio',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1105'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // Bancos
  await createAccount(
    prisma,
    tenantId,
    {
      code: '111005',
      name: 'Bancolombia',
      description: 'Cuenta corriente Bancolombia',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1110'),
      level: 4,
      isSystemAccount: true,
      isBankAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '111010',
      name: 'Davivienda',
      description: 'Cuenta de ahorros Davivienda',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1110'),
      level: 4,
      isBankAccount: true,
    },
    ctx,
  );

  // Clientes
  await createAccount(
    prisma,
    tenantId,
    {
      code: '130505',
      name: 'Clientes Nacionales',
      description: 'Cuentas por cobrar a clientes nacionales',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1305'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // Inventario
  await createAccount(
    prisma,
    tenantId,
    {
      code: '143505',
      name: 'Mercancía Disponible para la Venta',
      description: 'Inventario de mercancías disponible',
      type: 'ASSET',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '1435'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // Proveedores CxP
  await createAccount(
    prisma,
    tenantId,
    {
      code: '220505',
      name: 'Proveedores Nacionales CxP',
      description: 'Cuentas por pagar a proveedores nacionales',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2205'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // ReteFuente
  await createAccount(
    prisma,
    tenantId,
    {
      code: '236505',
      name: 'Retención en la Fuente por Pagar',
      description: 'Retención en la fuente practicada pendiente de declarar',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2365'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // IVA por Pagar
  await createAccount(
    prisma,
    tenantId,
    {
      code: '240805',
      name: 'IVA por Pagar',
      description: 'IVA generado en ventas por declarar',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2408'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // IVA Descontable
  await createAccount(
    prisma,
    tenantId,
    {
      code: '240405',
      name: 'IVA Descontable',
      description: 'IVA pagado en compras descontable en declaración',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2404'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // Nómina por Pagar
  await createAccount(
    prisma,
    tenantId,
    {
      code: '250505',
      name: 'Nómina por Pagar',
      description: 'Salarios y sueldos pendientes de pago',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2505'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // Provisiones laborales (level 4 under 2520)
  await createAccount(
    prisma,
    tenantId,
    {
      code: '252005',
      name: 'Prima de Servicios por Pagar',
      description: 'Provisión de prima de servicios pendiente',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2520'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // Aportes Parafiscales detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '257005',
      name: 'SENA',
      description: 'Aportes al Servicio Nacional de Aprendizaje',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2570'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '257010',
      name: 'ICBF',
      description: 'Aportes al Instituto Colombiano de Bienestar Familiar',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2570'),
      level: 4,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '257015',
      name: 'Caja de Compensación',
      description: 'Aportes a caja de compensación familiar',
      type: 'LIABILITY',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '2570'),
      level: 4,
    },
    ctx,
  );

  // Ingresos - Ventas Nacionales
  await createAccount(
    prisma,
    tenantId,
    {
      code: '413505',
      name: 'Ventas Nacionales',
      description: 'Ingresos por ventas de mercancías a nivel nacional',
      type: 'REVENUE',
      nature: 'CREDIT',
      parentId: acctId(ctx, tenantId, '4135'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // Gastos de Personal detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '510505',
      name: 'Sueldos',
      description: 'Gasto por sueldos del personal',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5105'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '510510',
      name: 'Auxilio de Transporte',
      description: 'Auxilio de transporte legal',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5105'),
      level: 4,
    },
    ctx,
  );

  // Honorarios detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '511005',
      name: 'Honorarios',
      description: 'Honorarios por asesorías y servicios profesionales',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5110'),
      level: 4,
    },
    ctx,
  );

  // Impuestos detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '511505',
      name: 'Impuestos Municipales',
      description: 'ICA y otros impuestos municipales',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5115'),
      level: 4,
    },
    ctx,
  );

  // Arrendamientos detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '512005',
      name: 'Arriendo Local Comercial',
      description: 'Arriendo de local comercial u oficina',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5120'),
      level: 4,
    },
    ctx,
  );

  // Servicios detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '513505',
      name: 'Energía Eléctrica',
      description: 'Servicio de energía eléctrica',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5135'),
      level: 4,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '513510',
      name: 'Acueducto y Alcantarillado',
      description: 'Servicio de agua y alcantarillado',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5135'),
      level: 4,
    },
    ctx,
  );
  await createAccount(
    prisma,
    tenantId,
    {
      code: '513515',
      name: 'Teléfono e Internet',
      description: 'Servicio de telecomunicaciones',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5135'),
      level: 4,
    },
    ctx,
  );

  // Diversos detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '519505',
      name: 'Otros Gastos',
      description: 'Gastos varios no clasificados',
      type: 'EXPENSE',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '5195'),
      level: 4,
    },
    ctx,
  );

  // Costo de Ventas detail
  await createAccount(
    prisma,
    tenantId,
    {
      code: '613505',
      name: 'Costo de Ventas Mercancía',
      description: 'Costo de la mercancía vendida al por mayor y menor',
      type: 'COGS',
      nature: 'DEBIT',
      parentId: acctId(ctx, tenantId, '6135'),
      level: 4,
      isSystemAccount: true,
    },
    ctx,
  );

  // ─── Additional accounts needed by journal entries ──────────────────

  // Level 2: Pasivos Estimados y Provisiones
  await createAccount(prisma, tenantId, {
    code: '26', name: 'Pasivos Estimados y Provisiones',
    description: 'Provisiones y obligaciones estimadas',
    type: 'LIABILITY', nature: 'CREDIT',
    parentId: acctId(ctx, tenantId, '2'), level: 2, isSystemAccount: true,
  }, ctx);

  // Level 2: Impuesto de Renta y Complementarios
  await createAccount(prisma, tenantId, {
    code: '54', name: 'Impuesto de Renta y Complementarios',
    description: 'Provisión de impuesto de renta del ejercicio',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5'), level: 2, isSystemAccount: true,
  }, ctx);

  // Level 2: Ganancias y Pérdidas
  await createAccount(prisma, tenantId, {
    code: '59', name: 'Ganancias y Pérdidas',
    description: 'Resultado del ejercicio',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5'), level: 2, isSystemAccount: true,
  }, ctx);

  // Level 3: Cesantías (under 26)
  await createAccount(prisma, tenantId, {
    code: '2610', name: 'Cesantías',
    description: 'Provisión de cesantías por pagar',
    type: 'LIABILITY', nature: 'CREDIT',
    parentId: acctId(ctx, tenantId, '26'), level: 3, isSystemAccount: true,
  }, ctx);

  // Level 3: Capital Suscrito y Pagado (under 31)
  await createAccount(prisma, tenantId, {
    code: '3115', name: 'Capital Suscrito y Pagado',
    description: 'Aportes efectivamente pagados por los socios',
    type: 'EQUITY', nature: 'CREDIT',
    parentId: acctId(ctx, tenantId, '31'), level: 3, isSystemAccount: true,
  }, ctx);

  // Level 3: Provisiones ventas (under 52)
  await createAccount(prisma, tenantId, {
    code: '5290', name: 'Provisiones',
    description: 'Provisiones por pérdida de inventario y otros',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '52'), level: 3,
  }, ctx);

  // Level 3: Impuesto de Renta (under 54)
  await createAccount(prisma, tenantId, {
    code: '5405', name: 'Impuesto de Renta y Complementarios',
    description: 'Impuesto de renta corriente',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '54'), level: 3, isSystemAccount: true,
  }, ctx);

  // Level 3: Ganancias y Pérdidas (under 59)
  await createAccount(prisma, tenantId, {
    code: '5905', name: 'Ganancias y Pérdidas',
    description: 'Resultado neto del ejercicio',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '59'), level: 3, isSystemAccount: true,
  }, ctx);

  // Level 4: IVA Descontable por Compras (under 2408)
  await createAccount(prisma, tenantId, {
    code: '240810', name: 'IVA Descontable por Compras',
    description: 'IVA pagado en compras descontable en declaración',
    type: 'LIABILITY', nature: 'CREDIT',
    parentId: acctId(ctx, tenantId, '2408'), level: 4, isSystemAccount: true,
  }, ctx);

  // Level 4: Provisión Cesantías (under 2610)
  await createAccount(prisma, tenantId, {
    code: '261005', name: 'Para Cesantías',
    description: 'Provisión de cesantías consolidadas por pagar',
    type: 'LIABILITY', nature: 'CREDIT',
    parentId: acctId(ctx, tenantId, '2610'), level: 4, isSystemAccount: true,
  }, ctx);

  // Level 4: Capital Suscrito y Pagado (under 3115)
  await createAccount(prisma, tenantId, {
    code: '311505', name: 'Capital Suscrito y Pagado',
    description: 'Capital social efectivamente pagado',
    type: 'EQUITY', nature: 'CREDIT',
    parentId: acctId(ctx, tenantId, '3115'), level: 4, isSystemAccount: true,
  }, ctx);

  // Level 4: Cesantías gasto (under 5105)
  await createAccount(prisma, tenantId, {
    code: '510536', name: 'Cesantías',
    description: 'Gasto provisión de cesantías',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5105'), level: 4,
  }, ctx);

  // Level 4: Arriendo edificios y locales (under 5120)
  await createAccount(prisma, tenantId, {
    code: '512010', name: 'Arriendo Edificios y Locales',
    description: 'Arriendo de locales comerciales y bodegas',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5120'), level: 4,
  }, ctx);

  // Level 4: Útiles, papelería y fotocopias (under 5195)
  await createAccount(prisma, tenantId, {
    code: '519530', name: 'Útiles, Papelería y Fotocopias',
    description: 'Gastos en útiles de oficina y papelería',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5195'), level: 4,
  }, ctx);

  // Level 4: Pérdida de inventario (under 5290)
  await createAccount(prisma, tenantId, {
    code: '529010', name: 'Pérdida de Inventario',
    description: 'Pérdida por ajuste, merma o daño de inventario',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5290'), level: 4,
  }, ctx);

  // Level 4: Impuesto de Renta del ejercicio (under 5405)
  await createAccount(prisma, tenantId, {
    code: '540505', name: 'Impuesto de Renta del Ejercicio',
    description: 'Gasto por impuesto de renta corriente',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5405'), level: 4, isSystemAccount: true,
  }, ctx);

  // Level 4: Ganancias y Pérdidas del ejercicio (under 5905)
  await createAccount(prisma, tenantId, {
    code: '590505', name: 'Ganancias y Pérdidas',
    description: 'Resultado neto del ejercicio corriente',
    type: 'EXPENSE', nature: 'DEBIT',
    parentId: acctId(ctx, tenantId, '5905'), level: 4, isSystemAccount: true,
  }, ctx);
}

// ── Main seeder function ─────────────────────────────────────────────
export async function seedAccounting(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('📒 Seeding accounting (PUC, config, periods)...');

  // Tenants that get accounting (Nuevo Negocio excluded — plan EMPRENDEDOR)
  const accountingTenants = [
    { key: 'demo', tenant: ctx.tenants.demo },
    { key: 'distribuidora', tenant: ctx.tenants.distribuidora },
    { key: 'papeleria', tenant: ctx.tenants.papeleria },
  ];

  // ─── Create PUC Chart of Accounts ─────────────────────────────────
  for (const { key, tenant } of accountingTenants) {
    console.log(`  → Creating PUC for ${key} (${tenant.name})...`);
    await createPUC(prisma, tenant.id, ctx);

    const accountCount = [...ctx.accounts.keys()].filter((k) =>
      k.startsWith(tenant.id),
    ).length;
    console.log(`    ✓ ${accountCount} accounts created`);
  }

  // ─── Create AccountingConfig ───────────────────────────────────────
  console.log('  → Creating accounting configurations...');

  for (const { key, tenant } of accountingTenants) {
    const tid = tenant.id;

    await prisma.accountingConfig.create({
      data: {
        tenantId: tid,
        cashAccountId: acctId(ctx, tid, '110505'),
        bankAccountId: acctId(ctx, tid, '111005'),
        accountsReceivableId: acctId(ctx, tid, '130505'),
        inventoryAccountId: acctId(ctx, tid, '143505'),
        accountsPayableId: acctId(ctx, tid, '220505'),
        ivaPorPagarId: acctId(ctx, tid, '240805'),
        ivaDescontableId: acctId(ctx, tid, '240405'),
        revenueAccountId: acctId(ctx, tid, '413505'),
        cogsAccountId: acctId(ctx, tid, '613505'),
        reteFuenteReceivedId: acctId(ctx, tid, '236505'),
        reteFuentePayableId: acctId(ctx, tid, '236505'),
        payrollExpenseId: acctId(ctx, tid, '510505'),
        payrollPayableId: acctId(ctx, tid, '250505'),
        payrollRetentionsId: acctId(ctx, tid, '236505'),
        payrollContributionsId: acctId(ctx, tid, '257005'),
        payrollProvisionsId: acctId(ctx, tid, '252005'),
        autoGenerateEntries: key === 'demo',
      },
    });

    console.log(`    ✓ ${key} accounting config created`);
  }

  // ─── Create AccountingPeriods ──────────────────────────────────────
  console.log('  → Creating accounting periods...');

  // Demo: 4 periods (Jan CLOSED, Feb CLOSED, Mar OPEN, Apr OPEN)
  const demoId = ctx.tenants.demo.id;
  const demoAdminId = ctx.users.demo.admin.id;

  await prisma.accountingPeriod.create({
    data: {
      tenantId: demoId,
      name: 'Enero 2025',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      status: 'CLOSED',
      closedAt: new Date('2025-02-05'),
      closedById: demoAdminId,
      notes: 'Período cerrado — conciliación completada',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: demoId,
      name: 'Febrero 2025',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-28'),
      status: 'CLOSED',
      closedAt: new Date('2025-03-05'),
      closedById: demoAdminId,
      notes: 'Período cerrado — conciliación completada',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: demoId,
      name: 'Marzo 2025',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-31'),
      status: 'OPEN',
      notes: 'Período contable activo',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: demoId,
      name: 'Abril 2025',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-04-30'),
      status: 'OPEN',
      notes: 'Período contable próximo',
    },
  });
  console.log('    ✓ 4 demo periods created');

  // Distribuidora: 3 periods (Jan CLOSED, Feb CLOSING, Mar OPEN)
  const distribuidoraId = ctx.tenants.distribuidora.id;

  await prisma.accountingPeriod.create({
    data: {
      tenantId: distribuidoraId,
      name: 'Enero 2025',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      status: 'CLOSED',
      closedAt: new Date('2025-02-10'),
      notes: 'Período cerrado',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: distribuidoraId,
      name: 'Febrero 2025',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-28'),
      status: 'CLOSING',
      notes: 'En proceso de cierre — pendiente conciliación bancaria',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: distribuidoraId,
      name: 'Marzo 2025',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-31'),
      status: 'OPEN',
      notes: 'Período contable activo',
    },
  });
  console.log('    ✓ 3 distribuidora periods created');

  // Papelería: 3 periods (Jan CLOSED, Feb OPEN, Mar OPEN)
  const papeleriaId = ctx.tenants.papeleria.id;

  await prisma.accountingPeriod.create({
    data: {
      tenantId: papeleriaId,
      name: 'Enero 2025',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      status: 'CLOSED',
      closedAt: new Date('2025-02-08'),
      notes: 'Período cerrado',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: papeleriaId,
      name: 'Febrero 2025',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-28'),
      status: 'OPEN',
      notes: 'Período contable activo',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: papeleriaId,
      name: 'Marzo 2025',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-31'),
      status: 'OPEN',
      notes: 'Período contable activo',
    },
  });
  console.log('    ✓ 3 papelería periods created');

  console.log(`✅ Accounting seeded: ${ctx.accounts.size} accounts, 3 configs, 10 periods`);
}
