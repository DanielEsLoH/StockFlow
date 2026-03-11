import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { recentBiasedDaysAgo, pickRandom, randomInt, daysAgo } from './helpers';

// ============================================================================
// STOCK MOVEMENTS SEEDER
// ============================================================================

const MOVEMENT_REASONS: Record<string, string[]> = {
  SALE: [
    'Venta mostrador',
    'Venta en línea',
    'Despacho a cliente',
    'Venta POS',
    'Venta mayorista',
  ],
  PURCHASE: [
    'Compra a proveedor',
    'Reposición de inventario',
    'Compra de emergencia',
    'Pedido programado',
    'Compra por importación',
  ],
  ADJUSTMENT: [
    'Ajuste por inventario físico',
    'Corrección de conteo',
    'Diferencia en auditoría',
    'Merma detectada',
    'Ajuste sistema',
  ],
  TRANSFER: [
    'Traslado entre bodegas',
    'Reubicación de mercancía',
    'Envío a sucursal',
    'Consolidación de stock',
  ],
  RETURN: [
    'Devolución de cliente',
    'Producto defectuoso devuelto',
    'Garantía aplicada',
    'Devolución parcial de pedido',
  ],
  DAMAGED: [
    'Producto dañado en transporte',
    'Daño por almacenamiento',
    'Producto vencido',
    'Daño por manipulación',
    'Rotura en exhibición',
  ],
};

type MovementTypeKey = keyof typeof MOVEMENT_REASONS;

const ALL_TYPES: MovementTypeKey[] = [
  'SALE',
  'PURCHASE',
  'ADJUSTMENT',
  'TRANSFER',
  'RETURN',
  'DAMAGED',
];

function generateMovements(
  tenantId: string,
  products: { id: string }[],
  warehouses: { id: string }[],
  users: { id: string }[],
  count: number,
) {
  const movements: {
    tenantId: string;
    productId: string;
    warehouseId: string;
    userId: string;
    type: string;
    quantity: number;
    reason: string;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const type = pickRandom(ALL_TYPES);
    const reasons = MOVEMENT_REASONS[type];
    const quantity =
      type === 'SALE'
        ? randomInt(1, 10)
        : type === 'PURCHASE'
          ? randomInt(5, 50)
          : type === 'ADJUSTMENT'
            ? randomInt(-5, 15)
            : type === 'TRANSFER'
              ? randomInt(3, 20)
              : type === 'RETURN'
                ? randomInt(1, 5)
                : randomInt(1, 3); // DAMAGED

    movements.push({
      tenantId,
      productId: pickRandom(products).id,
      warehouseId: pickRandom(warehouses).id,
      userId: pickRandom(users).id,
      type,
      quantity: Math.abs(quantity) || 1,
      reason: pickRandom(reasons),
      createdAt: daysAgo(recentBiasedDaysAgo(90)),
    });
  }

  return movements;
}

export async function seedStockMovements(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('📊 Seeding stock movements...');

  // ── Demo Tenant (~150 movements) ─────────────────────────────────
  const demoMovements = generateMovements(
    ctx.tenants.demo.id,
    ctx.products.demo,
    ctx.warehouses.demo.active,
    ctx.users.demo.allActive,
    150,
  );

  console.log('  → Demo tenant stock movements...');
  for (const m of demoMovements) {
    await prisma.stockMovement.create({ data: m as any });
  }
  console.log('    ✓ 150 demo stock movements created');

  // ── Distribuidora Tenant (~50 movements) ─────────────────────────
  const distUsers = [
    ctx.users.distribuidora.admin,
    ctx.users.distribuidora.manager,
    ...ctx.users.distribuidora.employees,
  ];

  const distMovements = generateMovements(
    ctx.tenants.distribuidora.id,
    ctx.products.distribuidora,
    ctx.warehouses.distribuidora.active,
    distUsers,
    50,
  );

  console.log('  → Distribuidora tenant stock movements...');
  for (const m of distMovements) {
    await prisma.stockMovement.create({ data: m as any });
  }
  console.log('    ✓ 50 distribuidora stock movements created');

  // ── Nuevo Negocio Tenant (~10 movements) ─────────────────────────
  const nuevoMovements = generateMovements(
    ctx.tenants.nuevo.id,
    ctx.products.nuevo,
    [ctx.warehouses.nuevo.main],
    [ctx.users.nuevo.admin],
    10,
  );

  console.log('  → Nuevo Negocio tenant stock movements...');
  for (const m of nuevoMovements) {
    await prisma.stockMovement.create({ data: m as any });
  }
  console.log('    ✓ 10 nuevo negocio stock movements created');

  // ── Papelería Tenant (~20 movements) ─────────────────────────────
  const papUsers = [
    ctx.users.papeleria.admin,
    ctx.users.papeleria.manager,
    ...ctx.users.papeleria.employees,
  ];

  const papMovements = generateMovements(
    ctx.tenants.papeleria.id,
    ctx.products.papeleria,
    ctx.warehouses.papeleria.active,
    papUsers,
    20,
  );

  console.log('  → Papelería tenant stock movements...');
  for (const m of papMovements) {
    await prisma.stockMovement.create({ data: m as any });
  }
  console.log('    ✓ 20 papelería stock movements created');

  console.log('✅ Stock movements seeded: 230 total');
}
