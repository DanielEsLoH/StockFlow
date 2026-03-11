import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo, nextDocNumber, TENANT_PREFIX } from './helpers';

export async function seedWithholdingCertificates(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('📜 Seeding withholding certificates...');

  // ── Demo Tenant (4 certificates) ───────────────────────────────────
  const demoTenantId = ctx.tenants.demo.id;
  const demoSuppliers = ctx.suppliers.demo;

  console.log('  → Demo tenant certificates...');

  const demoCertNumber = (n: number) =>
    `CERT-${TENANT_PREFIX[ctx.tenants.demo.slug]}-2025-${String(n).padStart(3, '0')}`;

  await prisma.withholdingCertificate.createMany({
    data: [
      // RENTA — Samsung (3.5% retención en la fuente)
      {
        tenantId: demoTenantId,
        supplierId: demoSuppliers[0]!.id, // Samsung Colombia
        year: 2025,
        certificateNumber: demoCertNumber(1),
        totalBase: 45000000,
        totalWithheld: 1575000, // 3.5%
        withholdingType: 'RENTA',
        generatedAt: daysAgo(15),
        pdfUrl: '/certificates/CERT-TD-2025-001.pdf',
      },
      // RENTA — Lenovo (3.5% retención en la fuente)
      {
        tenantId: demoTenantId,
        supplierId: demoSuppliers[1]!.id, // Lenovo Colombia
        year: 2025,
        certificateNumber: demoCertNumber(2),
        totalBase: 28000000,
        totalWithheld: 980000, // 3.5%
        withholdingType: 'RENTA',
        generatedAt: daysAgo(15),
        pdfUrl: '/certificates/CERT-TD-2025-002.pdf',
      },
      // ICA — Samsung (0.966% para Bogotá - actividad comercial)
      {
        tenantId: demoTenantId,
        supplierId: demoSuppliers[0]!.id, // Samsung Colombia
        year: 2025,
        certificateNumber: demoCertNumber(3),
        totalBase: 45000000,
        totalWithheld: 434700, // ~0.966%
        withholdingType: 'ICA',
        generatedAt: daysAgo(10),
        pdfUrl: '/certificates/CERT-TD-2025-003.pdf',
      },
      // IVA — Apple Distribución (15% del IVA retenido)
      {
        tenantId: demoTenantId,
        supplierId: demoSuppliers[2]!.id, // Apple Distribución Andina
        year: 2025,
        certificateNumber: demoCertNumber(4),
        totalBase: 52000000,
        totalWithheld: 1482000, // 15% del IVA (19% de base) = 15% * 9880000
        withholdingType: 'IVA',
        generatedAt: daysAgo(10),
        pdfUrl: '/certificates/CERT-TD-2025-004.pdf',
      },
    ],
  });

  // Update demo certificate counter
  ctx.counters.demo.certificate = 4;

  console.log('    ✓ 4 demo certificates created');

  // ── Distribuidora Tenant (3 certificates) ──────────────────────────
  const distTenantId = ctx.tenants.distribuidora.id;
  const distSuppliers = ctx.suppliers.distribuidora;

  console.log('  → Distribuidora tenant certificates...');

  const distCertNumber = (n: number) =>
    `CERT-${TENANT_PREFIX[ctx.tenants.distribuidora.slug]}-2025-${String(n).padStart(3, '0')}`;

  await prisma.withholdingCertificate.createMany({
    data: [
      // RENTA — Productos Familia (3.5%)
      {
        tenantId: distTenantId,
        supplierId: distSuppliers[0]!.id, // Productos Familia
        year: 2025,
        certificateNumber: distCertNumber(1),
        totalBase: 38000000,
        totalWithheld: 1330000, // 3.5%
        withholdingType: 'RENTA',
        generatedAt: daysAgo(12),
        pdfUrl: '/certificates/CERT-DN-2025-001.pdf',
      },
      // RENTA — Colombina (3.5%)
      {
        tenantId: distTenantId,
        supplierId: distSuppliers[4]!.id, // Colombina
        year: 2025,
        certificateNumber: distCertNumber(2),
        totalBase: 22000000,
        totalWithheld: 770000, // 3.5%
        withholdingType: 'RENTA',
        generatedAt: daysAgo(12),
        pdfUrl: '/certificates/CERT-DN-2025-002.pdf',
      },
      // ICA — Colgate Palmolive (0.966%)
      {
        tenantId: distTenantId,
        supplierId: distSuppliers[1]!.id, // Colgate Palmolive
        year: 2025,
        certificateNumber: distCertNumber(3),
        totalBase: 15000000,
        totalWithheld: 144900, // ~0.966%
        withholdingType: 'ICA',
        generatedAt: daysAgo(8),
        pdfUrl: '/certificates/CERT-DN-2025-003.pdf',
      },
    ],
  });

  // Update distribuidora certificate counter
  ctx.counters.distribuidora.certificate = 3;

  console.log('    ✓ 3 distribuidora certificates created');

  // ── Papelería Tenant (2 certificates) ──────────────────────────────
  const papTenantId = ctx.tenants.papeleria.id;
  const papSuppliers = ctx.suppliers.papeleria;

  console.log('  → Papelería tenant certificates...');

  const papCertNumber = (n: number) =>
    `CERT-${TENANT_PREFIX[ctx.tenants.papeleria.slug]}-2025-${String(n).padStart(3, '0')}`;

  await prisma.withholdingCertificate.createMany({
    data: [
      // RENTA — Carvajal Educación (3.5%)
      {
        tenantId: papTenantId,
        supplierId: papSuppliers[0]!.id, // Carvajal Educación
        year: 2025,
        certificateNumber: papCertNumber(1),
        totalBase: 12000000,
        totalWithheld: 420000, // 3.5%
        withholdingType: 'RENTA',
        generatedAt: daysAgo(14),
        pdfUrl: '/certificates/CERT-PC-2025-001.pdf',
      },
      // ICA — Faber-Castell (0.966%)
      {
        tenantId: papTenantId,
        supplierId: papSuppliers[1]!.id, // Faber-Castell Colombia
        year: 2025,
        certificateNumber: papCertNumber(2),
        totalBase: 8500000,
        totalWithheld: 82110, // ~0.966%
        withholdingType: 'ICA',
        generatedAt: daysAgo(8),
        pdfUrl: '/certificates/CERT-PC-2025-002.pdf',
      },
    ],
  });

  // Update papelería certificate counter
  ctx.counters.papeleria.certificate = 2;

  console.log('    ✓ 2 papelería certificates created');

  console.log('✅ Withholding certificates seeded: 9 total');
}
