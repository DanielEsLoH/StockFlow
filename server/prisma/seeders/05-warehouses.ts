import { PrismaClient } from '@prisma/client';
import { SeedContext, WarehouseRef } from './types';

// ============================================================================
// 05 — WAREHOUSES + WAREHOUSE STOCK
// ============================================================================

function toRef(w: { id: string; name: string; code: string }): WarehouseRef {
  return { id: w.id, name: w.name, code: w.code };
}

export async function seedWarehouses(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('🏭 Creating Warehouses...');

  // ── Demo Tenant (6 warehouses, 5 active + 1 inactive) ────────────
  const demoId = ctx.tenants.demo.id;

  const warehouseMain = await prisma.warehouse.create({
    data: {
      tenantId: demoId,
      name: 'Almacén Principal',
      code: 'BOD-001',
      address: 'Calle 10 #43-67, El Poblado',
      city: 'Medellín',
      phone: '+57 4 444 5555',
      isMain: true,
      status: 'ACTIVE',
    },
  });

  const warehouseNorth = await prisma.warehouse.create({
    data: {
      tenantId: demoId,
      name: 'Bodega Norte',
      code: 'BOD-002',
      address: 'Carrera 50 #78-32',
      city: 'Bello',
      phone: '+57 4 455 6666',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  const warehouseSouth = await prisma.warehouse.create({
    data: {
      tenantId: demoId,
      name: 'Bodega Sur',
      code: 'BOD-003',
      address: 'Avenida Las Vegas #10-25',
      city: 'Envigado',
      phone: '+57 4 466 7777',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  const warehouseBogota = await prisma.warehouse.create({
    data: {
      tenantId: demoId,
      name: 'Centro de Distribución',
      code: 'BOD-004',
      address: 'Calle 26 #92-32, Zona Franca',
      city: 'Bogotá',
      phone: '+57 1 777 8888',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  const warehouseStore = await prisma.warehouse.create({
    data: {
      tenantId: demoId,
      name: 'Punto de Venta Centro',
      code: 'BOD-005',
      address: 'Centro Comercial Santafé Local 234',
      city: 'Medellín',
      phone: '+57 4 488 9999',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  // Inactive warehouse (not included in active list)
  await prisma.warehouse.create({
    data: {
      tenantId: demoId,
      name: 'Bodega Reserva',
      code: 'BOD-006',
      address: 'Zona Industrial Km 5',
      city: 'Itagüí',
      phone: '+57 4 499 0000',
      isMain: false,
      status: 'INACTIVE',
    },
  });

  const demoActiveWarehouses = [
    warehouseMain,
    warehouseNorth,
    warehouseSouth,
    warehouseBogota,
    warehouseStore,
  ];

  ctx.warehouses.demo = {
    main: toRef(warehouseMain),
    store: toRef(warehouseStore),
    active: demoActiveWarehouses.map(toRef),
  };

  // ── Distribuidora Nacional (3 warehouses) ────────────────────────
  const dnId = ctx.tenants.distribuidora.id;

  const dnWarehouseMain = await prisma.warehouse.create({
    data: {
      tenantId: dnId,
      name: 'Bodega Central',
      code: 'DN-BOD-001',
      address: 'Cra 7 #72-13 Chapinero',
      city: 'Bogotá',
      phone: '+57 1 555 0010',
      isMain: true,
      status: 'ACTIVE',
    },
  });

  const dnWarehouse2 = await prisma.warehouse.create({
    data: {
      tenantId: dnId,
      name: 'Centro de Acopio Norte',
      code: 'DN-BOD-002',
      address: 'Autopista Norte Km 15',
      city: 'Bogotá',
      phone: '+57 1 555 0011',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  const dnWarehouse3 = await prisma.warehouse.create({
    data: {
      tenantId: dnId,
      name: 'Punto Distribución Sur',
      code: 'DN-BOD-003',
      address: 'Av. Boyacá #65S-20',
      city: 'Bogotá',
      phone: '+57 1 555 0012',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  const dnActiveWarehouses = [dnWarehouseMain, dnWarehouse2, dnWarehouse3];

  ctx.warehouses.distribuidora = {
    main: toRef(dnWarehouseMain),
    active: dnActiveWarehouses.map(toRef),
  };

  // ── Nuevo Negocio (1 warehouse) ──────────────────────────────────
  const nnId = ctx.tenants.nuevo.id;

  const nnWarehouse = await prisma.warehouse.create({
    data: {
      tenantId: nnId,
      name: 'Local Principal',
      code: 'NN-BOD-001',
      address: 'Calle 53 #45-12, Laureles',
      city: 'Medellín',
      phone: '+57 311 555 4445',
      isMain: true,
      status: 'ACTIVE',
    },
  });

  ctx.warehouses.nuevo = {
    main: toRef(nnWarehouse),
  };

  // ── Papelería Central (2 warehouses) ─────────────────────────────
  const pcId = ctx.tenants.papeleria.id;

  const pcWarehouseMain = await prisma.warehouse.create({
    data: {
      tenantId: pcId,
      name: 'Papelería Principal',
      code: 'PC-BOD-001',
      address: 'Carrera 43A #7-50',
      city: 'Medellín',
      phone: '+57 4 987 0010',
      isMain: true,
      status: 'ACTIVE',
    },
  });

  const pcWarehouse2 = await prisma.warehouse.create({
    data: {
      tenantId: pcId,
      name: 'Bodega Stock',
      code: 'PC-BOD-002',
      address: 'Calle 30 #65-20',
      city: 'Medellín',
      phone: '+57 4 987 0011',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  const pcActiveWarehouses = [pcWarehouseMain, pcWarehouse2];

  ctx.warehouses.papeleria = {
    main: toRef(pcWarehouseMain),
    active: pcActiveWarehouses.map(toRef),
  };

  console.log('   ✅ 12 Warehouses created (6 + 3 + 1 + 2)');

  // ════════════════════════════════════════════════════════════════════
  // WAREHOUSE STOCK DISTRIBUTION
  // ════════════════════════════════════════════════════════════════════
  console.log('📊 Distributing stock across warehouses...');

  // Demo: 50% principal, 20% norte, 15% sur, 10% bogotá, 5% tienda
  for (const product of ctx.products.demo) {
    if (product.stock === 0) continue;
    const distributions = [
      { warehouseId: warehouseMain.id, pct: 0.50 },
      { warehouseId: warehouseNorth.id, pct: 0.20 },
      { warehouseId: warehouseSouth.id, pct: 0.15 },
      { warehouseId: warehouseBogota.id, pct: 0.10 },
      { warehouseId: warehouseStore.id, pct: 0.05 },
    ];
    let remaining = product.stock;
    for (let i = 0; i < distributions.length; i++) {
      const isLast = i === distributions.length - 1;
      const qty = isLast
        ? remaining
        : Math.floor(product.stock * distributions[i].pct);
      if (qty > 0) {
        await prisma.warehouseStock.create({
          data: {
            tenantId: demoId,
            warehouseId: distributions[i].warehouseId,
            productId: product.id,
            quantity: qty,
          },
        });
        remaining -= qty;
      }
    }
  }

  // Distribuidora: 60% central, 25% norte, 15% sur
  for (const product of ctx.products.distribuidora) {
    if (product.stock === 0) continue;
    const distributions = [
      { warehouseId: dnWarehouseMain.id, pct: 0.60 },
      { warehouseId: dnWarehouse2.id, pct: 0.25 },
      { warehouseId: dnWarehouse3.id, pct: 0.15 },
    ];
    let remaining = product.stock;
    for (let i = 0; i < distributions.length; i++) {
      const isLast = i === distributions.length - 1;
      const qty = isLast
        ? remaining
        : Math.floor(product.stock * distributions[i].pct);
      if (qty > 0) {
        await prisma.warehouseStock.create({
          data: {
            tenantId: dnId,
            warehouseId: distributions[i].warehouseId,
            productId: product.id,
            quantity: qty,
          },
        });
        remaining -= qty;
      }
    }
  }

  // Nuevo Negocio: 100% local
  for (const product of ctx.products.nuevo) {
    if (product.stock === 0) continue;
    await prisma.warehouseStock.create({
      data: {
        tenantId: nnId,
        warehouseId: nnWarehouse.id,
        productId: product.id,
        quantity: product.stock,
      },
    });
  }

  // Papelería: 70% principal, 30% bodega
  for (const product of ctx.products.papeleria) {
    if (product.stock === 0) continue;
    const mainQty = Math.floor(product.stock * 0.70);
    const stockQty = product.stock - mainQty;
    if (mainQty > 0) {
      await prisma.warehouseStock.create({
        data: {
          tenantId: pcId,
          warehouseId: pcWarehouseMain.id,
          productId: product.id,
          quantity: mainQty,
        },
      });
    }
    if (stockQty > 0) {
      await prisma.warehouseStock.create({
        data: {
          tenantId: pcId,
          warehouseId: pcWarehouse2.id,
          productId: product.id,
          quantity: stockQty,
        },
      });
    }
  }

  console.log('   ✅ Stock distributed across all warehouses');
}
