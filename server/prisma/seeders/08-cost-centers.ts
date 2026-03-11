import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';

export async function seedCostCenters(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('📊 Seeding cost centers...');

  // Helper to create a cost center and store in context map
  async function createCostCenter(
    tenantId: string,
    code: string,
    name: string,
    description: string,
    isActive: boolean = true,
  ) {
    const costCenter = await prisma.costCenter.create({
      data: { tenantId, code, name, description, isActive },
    });
    ctx.costCenters.set(`${tenantId}:${code}`, costCenter.id);
    return costCenter;
  }

  // ── Demo Tenant (5 cost centers) ───────────────────────────────────
  const demoTenantId = ctx.tenants.demo.id;
  console.log('  → Demo tenant cost centers...');

  await createCostCenter(
    demoTenantId,
    'CC-001',
    'Administración',
    'Gastos administrativos generales, nómina administrativa y servicios corporativos',
  );
  await createCostCenter(
    demoTenantId,
    'CC-002',
    'Ventas',
    'Operación comercial, comisiones, publicidad y fuerza de ventas',
  );
  await createCostCenter(
    demoTenantId,
    'CC-003',
    'Bodega/Logística',
    'Almacenamiento, despacho, transporte y manejo de inventarios',
  );
  await createCostCenter(
    demoTenantId,
    'CC-004',
    'Marketing',
    'Campañas publicitarias, redes sociales y branding',
  );
  await createCostCenter(
    demoTenantId,
    'CC-005',
    'Servicio al Cliente',
    'Soporte posventa, garantías y atención al cliente',
  );

  console.log('    ✓ 5 demo cost centers created');

  // ── Distribuidora Tenant (4 cost centers) ──────────────────────────
  const distribuidoraTenantId = ctx.tenants.distribuidora.id;
  console.log('  → Distribuidora tenant cost centers...');

  await createCostCenter(
    distribuidoraTenantId,
    'CC-001',
    'Administración',
    'Gastos administrativos, contabilidad y recursos humanos',
  );
  await createCostCenter(
    distribuidoraTenantId,
    'CC-002',
    'Distribución',
    'Logística de distribución, transporte y entregas a clientes',
  );
  await createCostCenter(
    distribuidoraTenantId,
    'CC-003',
    'Almacén',
    'Gestión de almacén, recepción de mercancía y control de inventario',
  );
  await createCostCenter(
    distribuidoraTenantId,
    'CC-004',
    'Comercial',
    'Equipo comercial, visitas a clientes y negociaciones',
  );

  console.log('    ✓ 4 distribuidora cost centers created');

  // ── Nuevo Negocio Tenant (2 cost centers) ──────────────────────────
  const nuevoTenantId = ctx.tenants.nuevo.id;
  console.log('  → Nuevo Negocio tenant cost centers...');

  await createCostCenter(
    nuevoTenantId,
    'CC-001',
    'General',
    'Centro de costo general para todos los gastos del negocio',
  );
  await createCostCenter(
    nuevoTenantId,
    'CC-002',
    'Ventas Online',
    'Operaciones de comercio electrónico y ventas por internet',
  );

  console.log('    ✓ 2 nuevo negocio cost centers created');

  // ── Papelería Tenant (3 cost centers) ──────────────────────────────
  const papeleriaTenantId = ctx.tenants.papeleria.id;
  console.log('  → Papelería tenant cost centers...');

  await createCostCenter(
    papeleriaTenantId,
    'CC-001',
    'Administración',
    'Gastos administrativos, contabilidad y gestión general',
  );
  await createCostCenter(
    papeleriaTenantId,
    'CC-002',
    'Punto de Venta',
    'Operación del punto de venta, caja y atención directa al público',
  );
  await createCostCenter(
    papeleriaTenantId,
    'CC-003',
    'Bodega',
    'Almacenamiento de mercancía y manejo de inventario',
  );

  console.log('    ✓ 3 papelería cost centers created');

  console.log(`✅ Cost centers seeded: ${ctx.costCenters.size} total`);
}
