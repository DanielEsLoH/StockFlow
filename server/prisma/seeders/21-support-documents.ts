import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo, nextDocNumber, computeLineAmounts, sumDocumentTotals, TENANT_PREFIX } from './helpers';

export async function seedSupportDocuments(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('📄 Seeding support documents...');

  // ── Demo Tenant (4 support documents) ──────────────────────────────
  const demoTenantId = ctx.tenants.demo.id;
  const demoSlug = ctx.tenants.demo.slug;
  const prefix = `DS-${TENANT_PREFIX[demoSlug]}`;
  const demoSuppliers = ctx.suppliers.demo;
  const demoAdmin = ctx.users.demo.admin;
  const demoContador = ctx.users.demo.contador;

  console.log('  → Demo tenant support documents...');

  // Helper to compute support document totals with optional reteFuente
  function buildSupportDoc(
    items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>,
    applyReteFuente: boolean,
  ) {
    const computedItems = items.map((item) => {
      const amounts = computeLineAmounts(item.quantity, item.unitPrice, item.taxRate);
      return { ...item, ...amounts };
    });
    const totals = sumDocumentTotals(computedItems);
    const withholdings = applyReteFuente ? Math.round(totals.subtotal * 0.035) : 0;
    return {
      items: computedItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      withholdings,
      total: totals.total - withholdings,
    };
  }

  // 1. DRAFT — Servicio de transporte
  const doc1Data = buildSupportDoc(
    [
      { description: 'Servicio de transporte de mercancía Bogotá-Medellín', quantity: 1, unitPrice: 1800000, taxRate: 0 },
      { description: 'Servicio de cargue y descargue', quantity: 1, unitPrice: 350000, taxRate: 0 },
    ],
    false,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: demoTenantId,
      supplierId: demoSuppliers[7]?.id, // Proveedor Genérico (persona natural, CC)
      userId: demoAdmin.id,
      documentNumber: nextDocNumber(prefix, ctx.counters.demo, 'supportDoc'),
      issueDate: daysAgo(3),
      supplierName: demoSuppliers[7]?.name ?? 'Proveedor Genérico',
      supplierDocument: demoSuppliers[7]?.documentNumber ?? '1234567890',
      supplierDocType: 'CC',
      subtotal: doc1Data.subtotal,
      tax: doc1Data.tax,
      withholdings: doc1Data.withholdings,
      total: doc1Data.total,
      status: 'DRAFT',
      notes: 'Servicio de transporte contratado para traslado de mercancía entre bodegas',
      items: {
        create: doc1Data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  // 2. GENERATED — Servicio de limpieza
  const doc2Data = buildSupportDoc(
    [
      { description: 'Servicio de aseo y limpieza oficinas - Enero 2025', quantity: 1, unitPrice: 2200000, taxRate: 0 },
      { description: 'Servicio de limpieza bodega principal - Enero 2025', quantity: 1, unitPrice: 800000, taxRate: 0 },
    ],
    true,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: demoTenantId,
      supplierId: demoSuppliers[7]?.id,
      userId: demoContador.id,
      documentNumber: nextDocNumber(prefix, ctx.counters.demo, 'supportDoc'),
      issueDate: daysAgo(20),
      supplierName: demoSuppliers[7]?.name ?? 'Proveedor Genérico',
      supplierDocument: demoSuppliers[7]?.documentNumber ?? '1234567890',
      supplierDocType: 'CC',
      subtotal: doc2Data.subtotal,
      tax: doc2Data.tax,
      withholdings: doc2Data.withholdings,
      total: doc2Data.total,
      status: 'GENERATED',
      dianCude: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      notes: 'Documento soporte generado para servicios de limpieza de enero',
      items: {
        create: doc2Data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  // 3. SENT — Honorarios consultoría
  const doc3Data = buildSupportDoc(
    [
      { description: 'Honorarios consultoría tributaria - Febrero 2025', quantity: 1, unitPrice: 4500000, taxRate: 0 },
    ],
    true,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: demoTenantId,
      supplierId: demoSuppliers[7]?.id,
      userId: demoContador.id,
      documentNumber: nextDocNumber(prefix, ctx.counters.demo, 'supportDoc'),
      issueDate: daysAgo(15),
      supplierName: demoSuppliers[7]?.name ?? 'Proveedor Genérico',
      supplierDocument: demoSuppliers[7]?.documentNumber ?? '1234567890',
      supplierDocType: 'CC',
      subtotal: doc3Data.subtotal,
      tax: doc3Data.tax,
      withholdings: doc3Data.withholdings,
      total: doc3Data.total,
      status: 'SENT',
      dianCude: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5',
      notes: 'Enviado al proveedor para aceptación',
      items: {
        create: doc3Data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  // 4. ACCEPTED — Mantenimiento equipos
  const doc4Data = buildSupportDoc(
    [
      { description: 'Servicio de mantenimiento preventivo aires acondicionados', quantity: 3, unitPrice: 450000, taxRate: 0 },
      { description: 'Servicio de mantenimiento UPS y planta eléctrica', quantity: 1, unitPrice: 680000, taxRate: 0 },
      { description: 'Revisión y mantenimiento sistema contra incendios', quantity: 1, unitPrice: 520000, taxRate: 0 },
    ],
    true,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: demoTenantId,
      supplierId: demoSuppliers[7]?.id,
      userId: demoContador.id,
      documentNumber: nextDocNumber(prefix, ctx.counters.demo, 'supportDoc'),
      issueDate: daysAgo(30),
      supplierName: demoSuppliers[7]?.name ?? 'Proveedor Genérico',
      supplierDocument: demoSuppliers[7]?.documentNumber ?? '1234567890',
      supplierDocType: 'CC',
      subtotal: doc4Data.subtotal,
      tax: doc4Data.tax,
      withholdings: doc4Data.withholdings,
      total: doc4Data.total,
      status: 'ACCEPTED',
      dianCude: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b',
      dianXml: '<AttachedDocument><DocumentReference>DS-TD-00004</DocumentReference></AttachedDocument>',
      notes: 'Aceptado por la DIAN. Documento soporte válido para deducción',
      items: {
        create: doc4Data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  console.log('    ✓ 4 demo support documents created');

  // ── Distribuidora Tenant (3 support documents) ─────────────────────
  const distTenantId = ctx.tenants.distribuidora.id;
  const distSlug = ctx.tenants.distribuidora.slug;
  const distPrefix = `DS-${TENANT_PREFIX[distSlug]}`;
  const distSuppliers = ctx.suppliers.distribuidora;
  const distAdmin = ctx.users.distribuidora.admin;
  const distContador = ctx.users.distribuidora.contador;

  console.log('  → Distribuidora tenant support documents...');

  // 1. DRAFT — Servicio de fumigación
  const distDoc1 = buildSupportDoc(
    [
      { description: 'Servicio de fumigación y control de plagas bodega', quantity: 1, unitPrice: 950000, taxRate: 0 },
      { description: 'Certificado sanitario INVIMA', quantity: 1, unitPrice: 180000, taxRate: 0 },
    ],
    false,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: distTenantId,
      supplierId: distSuppliers[9]?.id ?? distSuppliers[0]?.id,
      userId: distAdmin.id,
      documentNumber: nextDocNumber(distPrefix, ctx.counters.distribuidora, 'supportDoc'),
      issueDate: daysAgo(5),
      supplierName: distSuppliers[9]?.name ?? distSuppliers[0]?.name ?? 'Proveedor',
      supplierDocument: distSuppliers[9]?.documentNumber ?? distSuppliers[0]?.documentNumber ?? '000',
      supplierDocType: 'NIT',
      subtotal: distDoc1.subtotal,
      tax: distDoc1.tax,
      withholdings: distDoc1.withholdings,
      total: distDoc1.total,
      status: 'DRAFT',
      notes: 'Fumigación trimestral obligatoria para bodegas de alimentos',
      items: {
        create: distDoc1.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  // 2. GENERATED — Servicio de vigilancia
  const distDoc2 = buildSupportDoc(
    [
      { description: 'Servicio de vigilancia nocturna bodega - Enero 2025', quantity: 1, unitPrice: 3500000, taxRate: 0 },
    ],
    true,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: distTenantId,
      supplierId: distSuppliers[9]?.id ?? distSuppliers[0]?.id,
      userId: distContador.id,
      documentNumber: nextDocNumber(distPrefix, ctx.counters.distribuidora, 'supportDoc'),
      issueDate: daysAgo(25),
      supplierName: distSuppliers[9]?.name ?? distSuppliers[0]?.name ?? 'Proveedor',
      supplierDocument: distSuppliers[9]?.documentNumber ?? distSuppliers[0]?.documentNumber ?? '000',
      supplierDocType: 'NIT',
      subtotal: distDoc2.subtotal,
      tax: distDoc2.tax,
      withholdings: distDoc2.withholdings,
      total: distDoc2.total,
      status: 'GENERATED',
      dianCude: 'dd11ee22ff33dd11ee22ff33dd11ee22ff33dd11ee22ff33dd11ee22ff33dd11ee22',
      notes: 'Servicio de vigilancia contratado con persona natural',
      items: {
        create: distDoc2.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  // 3. ACCEPTED — Reparación vehículo
  const distDoc3 = buildSupportDoc(
    [
      { description: 'Reparación motor vehículo de reparto placa ABC-123', quantity: 1, unitPrice: 2800000, taxRate: 0 },
      { description: 'Repuestos y mano de obra adicional', quantity: 1, unitPrice: 750000, taxRate: 19 },
    ],
    true,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: distTenantId,
      supplierId: distSuppliers[9]?.id ?? distSuppliers[0]?.id,
      userId: distContador.id,
      documentNumber: nextDocNumber(distPrefix, ctx.counters.distribuidora, 'supportDoc'),
      issueDate: daysAgo(40),
      supplierName: distSuppliers[9]?.name ?? distSuppliers[0]?.name ?? 'Proveedor',
      supplierDocument: distSuppliers[9]?.documentNumber ?? distSuppliers[0]?.documentNumber ?? '000',
      supplierDocType: 'NIT',
      subtotal: distDoc3.subtotal,
      tax: distDoc3.tax,
      withholdings: distDoc3.withholdings,
      total: distDoc3.total,
      status: 'ACCEPTED',
      dianCude: 'aa99bb88cc77aa99bb88cc77aa99bb88cc77aa99bb88cc77aa99bb88cc77aa99bb88',
      dianXml: '<AttachedDocument><DocumentReference>DS-DN-00003</DocumentReference></AttachedDocument>',
      notes: 'Reparación de emergencia del vehículo de reparto. Aceptado por DIAN.',
      items: {
        create: distDoc3.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  console.log('    ✓ 3 distribuidora support documents created');

  // ── Nuevo Negocio Tenant (1 support document) ──────────────────────
  const nuevoTenantId = ctx.tenants.nuevo.id;
  const nuevoSlug = ctx.tenants.nuevo.slug;
  const nuevoPrefix = `DS-${TENANT_PREFIX[nuevoSlug]}`;
  const nuevoSuppliers = ctx.suppliers.nuevo;
  const nuevoAdmin = ctx.users.nuevo.admin;

  console.log('  → Nuevo Negocio tenant support documents...');

  const nuevoDoc1 = buildSupportDoc(
    [
      { description: 'Servicio de diseño de logo y branding', quantity: 1, unitPrice: 1500000, taxRate: 0 },
      { description: 'Diseño de tarjetas de presentación (1000 unidades)', quantity: 1, unitPrice: 350000, taxRate: 19 },
    ],
    false,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: nuevoTenantId,
      supplierId: nuevoSuppliers[0]?.id,
      userId: nuevoAdmin.id,
      documentNumber: nextDocNumber(nuevoPrefix, ctx.counters.nuevo, 'supportDoc'),
      issueDate: daysAgo(7),
      supplierName: nuevoSuppliers[0]?.name ?? 'Proveedor Nuevo',
      supplierDocument: nuevoSuppliers[0]?.documentNumber ?? '000',
      supplierDocType: 'NIT',
      subtotal: nuevoDoc1.subtotal,
      tax: nuevoDoc1.tax,
      withholdings: nuevoDoc1.withholdings,
      total: nuevoDoc1.total,
      status: 'DRAFT',
      notes: 'Primer documento soporte del negocio - diseño de identidad corporativa',
      items: {
        create: nuevoDoc1.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  console.log('    ✓ 1 nuevo negocio support document created');

  // ── Papelería Tenant (2 support documents) ─────────────────────────
  const papTenantId = ctx.tenants.papeleria.id;
  const papSlug = ctx.tenants.papeleria.slug;
  const papPrefix = `DS-${TENANT_PREFIX[papSlug]}`;
  const papSuppliers = ctx.suppliers.papeleria;
  const papAdmin = ctx.users.papeleria.admin;
  const papContador = ctx.users.papeleria.contador;

  console.log('  → Papelería tenant support documents...');

  // 1. GENERATED — Mantenimiento local
  const papDoc1 = buildSupportDoc(
    [
      { description: 'Servicio de pintura y adecuación local comercial', quantity: 1, unitPrice: 2500000, taxRate: 0 },
      { description: 'Material de pintura y acabados', quantity: 1, unitPrice: 800000, taxRate: 19 },
    ],
    true,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: papTenantId,
      supplierId: papSuppliers[4]?.id ?? papSuppliers[0]?.id,
      userId: papContador.id,
      documentNumber: nextDocNumber(papPrefix, ctx.counters.papeleria, 'supportDoc'),
      issueDate: daysAgo(18),
      supplierName: papSuppliers[4]?.name ?? papSuppliers[0]?.name ?? 'Proveedor Papelería',
      supplierDocument: papSuppliers[4]?.documentNumber ?? papSuppliers[0]?.documentNumber ?? '000',
      supplierDocType: 'NIT',
      subtotal: papDoc1.subtotal,
      tax: papDoc1.tax,
      withholdings: papDoc1.withholdings,
      total: papDoc1.total,
      status: 'GENERATED',
      dianCude: 'pp11qq22rr33pp11qq22rr33pp11qq22rr33pp11qq22rr33pp11qq22rr33pp11qq22',
      notes: 'Adecuación del local para temporada escolar',
      items: {
        create: papDoc1.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  // 2. SENT — Servicio contable externo
  const papDoc2 = buildSupportDoc(
    [
      { description: 'Honorarios asesoría contable y tributaria - Enero 2025', quantity: 1, unitPrice: 1800000, taxRate: 0 },
    ],
    true,
  );

  await prisma.supportDocument.create({
    data: {
      tenantId: papTenantId,
      supplierId: papSuppliers[4]?.id ?? papSuppliers[0]?.id,
      userId: papContador.id,
      documentNumber: nextDocNumber(papPrefix, ctx.counters.papeleria, 'supportDoc'),
      issueDate: daysAgo(10),
      supplierName: papSuppliers[4]?.name ?? papSuppliers[0]?.name ?? 'Proveedor Papelería',
      supplierDocument: papSuppliers[4]?.documentNumber ?? papSuppliers[0]?.documentNumber ?? '000',
      supplierDocType: 'NIT',
      subtotal: papDoc2.subtotal,
      tax: papDoc2.tax,
      withholdings: papDoc2.withholdings,
      total: papDoc2.total,
      status: 'SENT',
      dianCude: 'ss44tt55uu66ss44tt55uu66ss44tt55uu66ss44tt55uu66ss44tt55uu66ss44tt55',
      notes: 'Honorarios del contador externo',
      items: {
        create: papDoc2.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      },
    },
  });

  console.log('    ✓ 2 papelería support documents created');

  console.log('✅ Support documents seeded: 10 total');
}
