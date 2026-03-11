import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';

export async function seedTenants(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('🏢 Creating Tenants...');

  // Plan limits (from plan-limits.ts):
  // EMPRENDEDOR: maxUsers=2 (1+1 contador), maxWarehouses=1, maxProducts=-1, maxInvoices=-1
  // PYME:        maxUsers=3 (2+1 contador), maxWarehouses=2, maxProducts=-1, maxInvoices=-1
  // PRO:         maxUsers=4 (3+1 contador), maxWarehouses=10, maxProducts=-1, maxInvoices=-1
  // PLUS:        maxUsers=9 (8+1 contador), maxWarehouses=100, maxProducts=-1, maxInvoices=-1

  const tenantDemo = await prisma.tenant.create({
    data: {
      name: 'Tienda Demo',
      slug: 'tienda-demo',
      email: 'admin@tienda-demo.com',
      phone: '+57 300 123 4567',
      status: 'ACTIVE',
      plan: 'PRO',
      maxUsers: 4,
      maxProducts: -1,
      maxInvoices: -1,
      maxWarehouses: 10,
    },
  });
  console.log(`   → Tenant: ${tenantDemo.name} (${tenantDemo.plan})`);

  const tenantDistribuidora = await prisma.tenant.create({
    data: {
      name: 'Distribuidora Nacional',
      slug: 'distribuidora-nacional',
      email: 'admin@distribuidoranacional.com',
      phone: '+57 1 234 5678',
      status: 'ACTIVE',
      plan: 'PLUS',
      maxUsers: 9,
      maxProducts: -1,
      maxInvoices: -1,
      maxWarehouses: 100,
    },
  });
  console.log(`   → Tenant: ${tenantDistribuidora.name} (${tenantDistribuidora.plan})`);

  const tenantNuevo = await prisma.tenant.create({
    data: {
      name: 'Nuevo Negocio',
      slug: 'nuevo-negocio',
      email: 'admin@nuevonegocio.com',
      phone: '+57 311 555 4444',
      status: 'TRIAL',
      plan: 'EMPRENDEDOR',
      maxUsers: 2,
      maxProducts: -1,
      maxInvoices: -1,
      maxWarehouses: 1,
    },
  });
  console.log(`   → Tenant: ${tenantNuevo.name} (${tenantNuevo.plan})`);

  const tenantPapeleria = await prisma.tenant.create({
    data: {
      name: 'Papelería Central',
      slug: 'papeleria-central',
      email: 'admin@papeleriacentral.com',
      phone: '+57 4 987 6543',
      status: 'ACTIVE',
      plan: 'PYME',
      maxUsers: 3,
      maxProducts: -1,
      maxInvoices: -1,
      maxWarehouses: 2,
    },
  });
  console.log(`   → Tenant: ${tenantPapeleria.name} (${tenantPapeleria.plan})`);

  // Populate context
  ctx.tenants = {
    demo: { id: tenantDemo.id, name: tenantDemo.name, slug: 'tienda-demo', plan: 'PRO' },
    distribuidora: { id: tenantDistribuidora.id, name: tenantDistribuidora.name, slug: 'distribuidora-nacional', plan: 'PLUS' },
    nuevo: { id: tenantNuevo.id, name: tenantNuevo.name, slug: 'nuevo-negocio', plan: 'EMPRENDEDOR' },
    papeleria: { id: tenantPapeleria.id, name: tenantPapeleria.name, slug: 'papeleria-central', plan: 'PYME' },
  };

  console.log('   ✅ 4 Tenants created');
}
