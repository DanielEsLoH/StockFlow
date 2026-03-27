import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ── Seeders ──
import { cleanup } from './seeders/00-cleanup';
import { seedSystemAdmins } from './seeders/01-system-admins';
import { seedTenants } from './seeders/02-tenants';
import { seedUsers } from './seeders/03-users';
import { seedCatalog } from './seeders/04-catalog';
import { seedWarehouses } from './seeders/05-warehouses';
import { seedCustomers } from './seeders/06-customers';
import { seedSuppliers } from './seeders/07-suppliers';
import { seedCostCenters } from './seeders/08-cost-centers';
import { seedAccounting } from './seeders/09-accounting';
import { seedInvoices } from './seeders/10-invoices';
import { seedQuotations } from './seeders/11-quotations';
import { seedPurchases } from './seeders/12-purchases';
import { seedExpenses } from './seeders/13-expenses';
import { seedJournalEntries } from './seeders/14-journal-entries';
import { seedBanking } from './seeders/15-banking';
import { seedStockMovements } from './seeders/16-stock-movements';
import { seedPOS } from './seeders/17-pos';
import { seedDIAN } from './seeders/18-dian';
import { seedPayroll } from './seeders/19-payroll';
import { seedRemissions } from './seeders/20-remissions';
import { seedSupportDocuments } from './seeders/21-support-documents';
import { seedWithholdingCertificates as seedCertificates } from './seeders/22-certificates';
import { seedCollectionReminders } from './seeders/23-collection';
import { seedRecurringInvoices } from './seeders/24-recurring';
import { seedIntegrations } from './seeders/25-integrations';
import { seedBilling } from './seeders/26-billing';
import { seedExchangeRates } from './seeders/27-exchange-rates';
import { seedNotifications } from './seeders/28-notifications';
import { createEmptyContext } from './seeders/types';

// ── Prisma Client ──
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Checking database...\n');

  const existingTenants = await prisma.tenant.count();
  if (existingTenants > 0) {
    console.log('✅ Database already has data. Seed skipped.\n');
    return;
  }

  console.log('📦 Empty database. Running full seed...\n');

  const ctx = createEmptyContext();

  // ── Foundation ──
  await cleanup(prisma);
  await seedSystemAdmins(prisma, ctx);
  await seedTenants(prisma, ctx);
  await seedUsers(prisma, ctx);
  await seedCatalog(prisma, ctx);
  await seedWarehouses(prisma, ctx);
  await seedCustomers(prisma, ctx);
  await seedSuppliers(prisma, ctx);
  await seedCostCenters(prisma, ctx);
  await seedAccounting(prisma, ctx);

  // ── Transactions ──
  await seedInvoices(prisma, ctx);
  await seedQuotations(prisma, ctx);
  await seedPurchases(prisma, ctx);
  await seedExpenses(prisma, ctx);
  await seedJournalEntries(prisma, ctx);
  await seedBanking(prisma, ctx);

  // ── Operations ──
  await seedStockMovements(prisma, ctx);
  await seedPOS(prisma, ctx);
  await seedDIAN(prisma, ctx);
  await seedPayroll(prisma, ctx);

  // ── Documents ──
  await seedRemissions(prisma, ctx);
  await seedSupportDocuments(prisma, ctx);
  await seedCertificates(prisma, ctx);

  // ── External & Platform ──
  await seedCollectionReminders(prisma, ctx);
  await seedRecurringInvoices(prisma, ctx);
  await seedIntegrations(prisma, ctx);
  await seedBilling(prisma, ctx);
  await seedExchangeRates(prisma, ctx);

  // ── Final ──
  await seedNotifications(prisma, ctx);

  // ── Summary ──
  console.log('\n══════════════════════════════════════════════════════');
  console.log('📊 FULL SEED COMPLETED — All 65 models seeded');
  console.log('══════════════════════════════════════════════════════');
  console.log('\n🔑 ACCESS CREDENTIALS:');
  console.log('──────────────────────────────────────────────────────');
  console.log('  Tienda Demo (PRO):');
  console.log('    admin@tienda-demo.com / password123');
  console.log('    contador@tienda-demo.com / password123 (CONTADOR)');
  console.log('  Distribuidora Nacional (PLUS):');
  console.log('    admin@distribuidoranacional.com / password123');
  console.log('    contador@distribuidoranacional.com / password123 (CONTADOR)');
  console.log('  Nuevo Negocio (EMPRENDEDOR):');
  console.log('    admin@nuevonegocio.com / password123');
  console.log('  Papelería Central (PYME):');
  console.log('    admin@papeleriacentral.com / password123');
  console.log('    contador@papeleriacentral.com / password123 (CONTADOR)');
  console.log('──────────────────────────────────────────────────────');
  console.log('  System Admin:');
  console.log(`    ${process.env.SYSTEM_ADMIN_EMAIL || 'daniel.esloh@gmail.com'} / ${process.env.SYSTEM_ADMIN_PASSWORD || 'Picema82*'}`);
  console.log('══════════════════════════════════════════════════════');

  console.log('\n🎉 FULL SEED COMPLETED');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
