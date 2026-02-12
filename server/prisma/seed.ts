import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEAN13(prefix: string, index: number): string {
  const base = (prefix + String(index).padStart(12 - prefix.length, '0')).slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

function productImageUrl(sku: string): string {
  return `https://picsum.photos/seed/${sku}/400/400`;
}

function avatarUrl(firstName: string, lastName: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=random&size=200&bold=true&format=png`;
}

function recentBiasedDaysAgo(maxDays: number): number {
  const r = Math.random();
  return Math.floor(r * r * maxDays);
}

function randomDate(from: Date, to: Date): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  salePrice: number;
  taxRate: number;
  categoryId: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  status: string;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  paymentStatus: string;
  total: number;
  items: { productId: string; quantity: number; unitPrice: number; taxRate: number }[];
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Iniciando seed ULTRA-COMPLETO de base de datos...\n');

  // ============================================================================
  // STEP 1: Clean existing data
  // ============================================================================
  console.log('🗑️  Limpiando datos existentes...');
  await prisma.salePayment.deleteMany();
  await prisma.cashRegisterMovement.deleteMany();
  await prisma.pOSSale.deleteMany();
  await prisma.pOSSession.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.dianDocument.deleteMany();
  await prisma.tenantDianConfig.deleteMany();
  await prisma.userPermissionOverride.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.systemAdminAuditLog.deleteMany();
  await prisma.systemAdmin.deleteMany();
  console.log('   ✅ Datos limpiados');

  // ============================================================================
  // STEP 2: System Admins (3)
  // ============================================================================
  console.log('👤 Creando System Admins...');
  const systemAdminPassword = process.env.SYSTEM_ADMIN_PASSWORD || 'admin123!';
  const hashedSystemAdminPassword = await bcrypt.hash(systemAdminPassword, 12);

  const superAdmin = await prisma.systemAdmin.create({
    data: {
      email: process.env.SYSTEM_ADMIN_EMAIL || 'superadmin@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(0),
    },
  });

  const supportAdmin = await prisma.systemAdmin.create({
    data: {
      email: 'soporte@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Carlos',
      lastName: 'Soporte',
      role: 'SUPPORT',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(1),
    },
  });

  const billingAdmin = await prisma.systemAdmin.create({
    data: {
      email: 'facturacion@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Laura',
      lastName: 'Facturación',
      role: 'BILLING',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(3),
    },
  });

  console.log('   ✅ 3 System Admins creados');

  // ============================================================================
  // STEP 3: Tenants (4)
  // ============================================================================
  console.log('🏢 Creando Tenants...');

  const tenantDemo = await prisma.tenant.create({
    data: {
      name: 'Tienda Demo',
      slug: 'tienda-demo',
      email: 'admin@tienda-demo.com',
      phone: '+57 300 123 4567',
      status: 'ACTIVE',
      plan: 'PRO',
      maxUsers: 10,
      maxProducts: 5000,
      maxInvoices: -1,
      maxWarehouses: 20,
    },
  });

  const tenantDistribuidora = await prisma.tenant.create({
    data: {
      name: 'Distribuidora Nacional',
      slug: 'distribuidora-nacional',
      email: 'admin@distribuidoranacional.com',
      phone: '+57 1 234 5678',
      status: 'ACTIVE',
      plan: 'PLUS',
      maxUsers: 25,
      maxProducts: -1,
      maxInvoices: -1,
      maxWarehouses: 100,
    },
  });

  const tenantNuevo = await prisma.tenant.create({
    data: {
      name: 'Nuevo Negocio',
      slug: 'nuevo-negocio',
      email: 'admin@nuevonegocio.com',
      phone: '+57 311 555 4444',
      status: 'TRIAL',
      plan: 'EMPRENDEDOR',
      maxUsers: 1,
      maxProducts: 100,
      maxInvoices: 50,
      maxWarehouses: 1,
    },
  });

  const tenantPapeleria = await prisma.tenant.create({
    data: {
      name: 'Papelería Central',
      slug: 'papeleria-central',
      email: 'admin@papeleriacentral.com',
      phone: '+57 4 987 6543',
      status: 'ACTIVE',
      plan: 'PYME',
      maxUsers: 5,
      maxProducts: 1000,
      maxInvoices: -1,
      maxWarehouses: 5,
    },
  });

  console.log('   ✅ 4 Tenants creados');

  // ============================================================================
  // STEP 4: Users (21 total)
  // ============================================================================
  console.log('👥 Creando Usuarios...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ── Tienda Demo Users (10) ──
  const adminDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'admin@tienda-demo.com', password: hashedPassword,
      firstName: 'Juan', lastName: 'Pérez', phone: '+57 300 111 1111',
      avatar: avatarUrl('Juan', 'Pérez'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const managerDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'gerente@tienda-demo.com', password: hashedPassword,
      firstName: 'Andrea', lastName: 'López', phone: '+57 300 999 8888',
      avatar: avatarUrl('Andrea', 'López'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  const employeeDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'empleado@tienda-demo.com', password: hashedPassword,
      firstName: 'María', lastName: 'González', phone: '+57 300 222 2222',
      avatar: avatarUrl('María', 'González'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const employee2Demo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'vendedor@tienda-demo.com', password: hashedPassword,
      firstName: 'Luis', lastName: 'Ramírez', phone: '+57 300 333 3333',
      avatar: avatarUrl('Luis', 'Ramírez'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(2),
    },
  });

  const managerSouthDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'gerente.sur@tienda-demo.com', password: hashedPassword,
      firstName: 'Camilo', lastName: 'Restrepo', phone: '+57 300 444 4444',
      avatar: avatarUrl('Camilo', 'Restrepo'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(2),
    },
  });

  const employeePosDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'cajero@tienda-demo.com', password: hashedPassword,
      firstName: 'Sofía', lastName: 'Herrera', phone: '+57 300 555 5555',
      avatar: avatarUrl('Sofía', 'Herrera'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const employeeSouthDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'bodeguero@tienda-demo.com', password: hashedPassword,
      firstName: 'Ricardo', lastName: 'Salazar', phone: '+57 300 666 6666',
      avatar: avatarUrl('Ricardo', 'Salazar'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  const suspendedUserDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'suspendido@tienda-demo.com', password: hashedPassword,
      firstName: 'Fernando', lastName: 'Arias', phone: '+57 300 777 7777',
      avatar: avatarUrl('Fernando', 'Arias'),
      role: 'EMPLOYEE', status: 'SUSPENDED', emailVerified: true, lastLoginAt: daysAgo(30),
    },
  });

  const pendingUserDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'pendiente@tienda-demo.com', password: hashedPassword,
      firstName: 'Carolina', lastName: 'Muñoz', phone: '+57 300 888 8888',
      role: 'EMPLOYEE', status: 'PENDING', emailVerified: false,
    },
  });

  const inactiveUserDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id, email: 'inactivo@tienda-demo.com', password: hashedPassword,
      firstName: 'Miguel', lastName: 'Ospina', phone: '+57 300 999 0000',
      role: 'MANAGER', status: 'INACTIVE', emailVerified: true, lastLoginAt: daysAgo(60),
    },
  });

  const demoActiveUsers = [adminDemo, managerDemo, employeeDemo, employee2Demo, managerSouthDemo, employeePosDemo, employeeSouthDemo];

  // ── Distribuidora Nacional Users (6) ──
  const dnAdmin = await prisma.user.create({
    data: {
      tenantId: tenantDistribuidora.id, email: 'admin@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Roberto', lastName: 'Camacho', phone: '+57 1 555 0001',
      avatar: avatarUrl('Roberto', 'Camacho'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  const dnManager = await prisma.user.create({
    data: {
      tenantId: tenantDistribuidora.id, email: 'gerente@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Patricia', lastName: 'Mendoza', phone: '+57 1 555 0002',
      avatar: avatarUrl('Patricia', 'Mendoza'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const dnEmployee1 = await prisma.user.create({
    data: {
      tenantId: tenantDistribuidora.id, email: 'empleado@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Diana', lastName: 'Acosta', phone: '+57 1 555 0003',
      avatar: avatarUrl('Diana', 'Acosta'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const dnEmployee2 = await prisma.user.create({
    data: {
      tenantId: tenantDistribuidora.id, email: 'bodeguero@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Héctor', lastName: 'Vargas', phone: '+57 1 555 0004',
      avatar: avatarUrl('Héctor', 'Vargas'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(2),
    },
  });

  // OAuth users for enum coverage
  const dnGoogleUser = await prisma.user.create({
    data: {
      tenantId: tenantDistribuidora.id, email: 'google.user@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Marcela', lastName: 'Ríos', phone: '+57 1 555 0005',
      avatar: avatarUrl('Marcela', 'Ríos'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(3),
      authProvider: 'GOOGLE', googleId: 'google-oauth-id-12345',
    },
  });

  const dnGithubUser = await prisma.user.create({
    data: {
      tenantId: tenantDistribuidora.id, email: 'github.user@distribuidoranacional.com', password: hashedPassword,
      firstName: 'Esteban', lastName: 'Cruz', phone: '+57 1 555 0006',
      role: 'EMPLOYEE', status: 'SUSPENDED', emailVerified: true, lastLoginAt: daysAgo(15),
      authProvider: 'GITHUB', githubId: 'github-oauth-id-67890',
    },
  });

  // ── Nuevo Negocio Users (1) ──
  const nnAdmin = await prisma.user.create({
    data: {
      tenantId: tenantNuevo.id, email: 'admin@nuevonegocio.com', password: hashedPassword,
      firstName: 'Alejandro', lastName: 'Mora', phone: '+57 311 555 4444',
      avatar: avatarUrl('Alejandro', 'Mora'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  // ── Papelería Central Users (4) ──
  const pcAdmin = await prisma.user.create({
    data: {
      tenantId: tenantPapeleria.id, email: 'admin@papeleriacentral.com', password: hashedPassword,
      firstName: 'Gloria', lastName: 'Espinosa', phone: '+57 4 987 6543',
      avatar: avatarUrl('Gloria', 'Espinosa'),
      role: 'ADMIN', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const pcManager = await prisma.user.create({
    data: {
      tenantId: tenantPapeleria.id, email: 'gerente@papeleriacentral.com', password: hashedPassword,
      firstName: 'Fabián', lastName: 'Ortiz', phone: '+57 4 987 0001',
      avatar: avatarUrl('Fabián', 'Ortiz'),
      role: 'MANAGER', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  const pcEmployee1 = await prisma.user.create({
    data: {
      tenantId: tenantPapeleria.id, email: 'vendedor@papeleriacentral.com', password: hashedPassword,
      firstName: 'Natalia', lastName: 'Cardona', phone: '+57 4 987 0002',
      avatar: avatarUrl('Natalia', 'Cardona'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(0),
    },
  });

  const pcEmployee2 = await prisma.user.create({
    data: {
      tenantId: tenantPapeleria.id, email: 'cajero@papeleriacentral.com', password: hashedPassword,
      firstName: 'Tomás', lastName: 'Duque', phone: '+57 4 987 0003',
      avatar: avatarUrl('Tomás', 'Duque'),
      role: 'EMPLOYEE', status: 'ACTIVE', emailVerified: true, lastLoginAt: daysAgo(1),
    },
  });

  console.log('   ✅ 21 Usuarios creados (10 Demo + 6 Distribuidora + 1 Nuevo Negocio + 4 Papelería)');

  // ============================================================================
  // STEP 5: Categories
  // ============================================================================
  console.log('📁 Creando Categorías...');

  // ── Tienda Demo Categories (15) ──
  const demoCategoriesData = [
    { name: 'Electrónica', description: 'Televisores, consolas, cámaras y gadgets', color: '#3b82f6' },
    { name: 'Computadores y Laptops', description: 'Portátiles, PCs de escritorio y monitores', color: '#6366f1' },
    { name: 'Celulares y Tablets', description: 'Smartphones, tablets y accesorios móviles', color: '#8b5cf6' },
    { name: 'Audio y Video', description: 'Audífonos, parlantes, barras de sonido', color: '#a855f7' },
    { name: 'Ropa Hombre', description: 'Camisas, pantalones, chaquetas masculinas', color: '#10b981' },
    { name: 'Ropa Mujer', description: 'Vestidos, blusas, pantalones femeninos', color: '#14b8a6' },
    { name: 'Calzado', description: 'Tenis, zapatos formales, botas', color: '#06b6d4' },
    { name: 'Accesorios de Moda', description: 'Relojes, gafas, bolsos, billeteras', color: '#0ea5e9' },
    { name: 'Alimentos y Bebidas', description: 'Productos alimenticios y bebidas', color: '#f59e0b' },
    { name: 'Hogar y Decoración', description: 'Lámparas, sábanas, cortinas, decoración', color: '#f97316' },
    { name: 'Muebles', description: 'Sillas, escritorios, sofás, camas', color: '#ef4444' },
    { name: 'Deportes y Fitness', description: 'Equipamiento deportivo y fitness', color: '#dc2626' },
    { name: 'Juguetes', description: 'Juguetes, juegos de mesa, LEGO', color: '#ec4899' },
    { name: 'Papelería y Oficina', description: 'Artículos de oficina y papelería', color: '#64748b' },
    { name: 'Ferretería y Herramientas', description: 'Herramientas y materiales de construcción', color: '#78716c' },
  ];

  const demoCategories: Record<string, { id: string; name: string }> = {};
  for (const cat of demoCategoriesData) {
    const created = await prisma.category.create({ data: { tenantId: tenantDemo.id, ...cat } });
    demoCategories[cat.name] = created;
  }

  // ── Distribuidora Nacional Categories (6) ──
  const dnCategoriesData = [
    { name: 'Aseo y Limpieza', description: 'Productos de aseo hogar e industrial', color: '#10b981' },
    { name: 'Alimentos al Mayor', description: 'Granos, aceites y abarrotes por bulto', color: '#f59e0b' },
    { name: 'Bebidas al Mayor', description: 'Gaseosas, jugos y agua por caja', color: '#3b82f6' },
    { name: 'Cuidado Personal', description: 'Shampoo, jabón, cremas al mayor', color: '#ec4899' },
    { name: 'Desechables', description: 'Vasos, platos, bolsas por paquete', color: '#78716c' },
    { name: 'Hogar Mayorista', description: 'Ollas, sartenes, utensilios al mayor', color: '#f97316' },
  ];

  const dnCategories: Record<string, { id: string }> = {};
  for (const cat of dnCategoriesData) {
    const created = await prisma.category.create({ data: { tenantId: tenantDistribuidora.id, ...cat } });
    dnCategories[cat.name] = created;
  }

  // ── Nuevo Negocio Categories (3) ──
  const nnCategoriesData = [
    { name: 'Camisetas y Tops', description: 'Camisetas, polos y tops casuales', color: '#3b82f6' },
    { name: 'Pantalones y Jeans', description: 'Jeans, joggers y pantalones casuales', color: '#10b981' },
    { name: 'Accesorios Urbanos', description: 'Gorras, gafas, correas y calzado', color: '#f59e0b' },
  ];

  const nnCategories: Record<string, { id: string }> = {};
  for (const cat of nnCategoriesData) {
    const created = await prisma.category.create({ data: { tenantId: tenantNuevo.id, ...cat } });
    nnCategories[cat.name] = created;
  }

  // ── Papelería Central Categories (8) ──
  const pcCategoriesData = [
    { name: 'Cuadernos', description: 'Cuadernos escolares y profesionales', color: '#3b82f6' },
    { name: 'Escritura', description: 'Lápices, esferos, marcadores', color: '#6366f1' },
    { name: 'Papel y Cartulinas', description: 'Resmas, cartulinas, papel especial', color: '#f59e0b' },
    { name: 'Arte y Manualidades', description: 'Pinturas, pinceles, pegamentos', color: '#ec4899' },
    { name: 'Organización', description: 'Carpetas, archivadores, folders', color: '#10b981' },
    { name: 'Tecnología Escolar', description: 'Calculadoras, USB, audífonos', color: '#8b5cf6' },
    { name: 'Mochilas y Morrales', description: 'Maletas escolares y universitarias', color: '#ef4444' },
    { name: 'Oficina', description: 'Grapadoras, perforadoras, suministros', color: '#64748b' },
  ];

  const pcCategories: Record<string, { id: string }> = {};
  for (const cat of pcCategoriesData) {
    const created = await prisma.category.create({ data: { tenantId: tenantPapeleria.id, ...cat } });
    pcCategories[cat.name] = created;
  }

  console.log('   ✅ 32 Categorías creadas (15 + 6 + 3 + 8)');

  // ============================================================================
  // STEP 6: Products - Tienda Demo (85 productos)
  // ============================================================================
  console.log('📦 Creando Productos Tienda Demo...');

  interface ProductInput {
    sku: string; name: string; description: string; costPrice: number; salePrice: number;
    taxRate: number; stock: number; minStock: number; maxStock: number; brand: string; categoryName: string;
  }

  const demoProductsData: ProductInput[] = [
    // Electrónica (6)
    { sku: 'ELEC-001', name: 'Televisor Samsung 55" 4K UHD', description: 'Smart TV Samsung 55 pulgadas 4K UHD con HDR', costPrice: 1800000, salePrice: 2500000, taxRate: 19, stock: 12, minStock: 5, maxStock: 30, brand: 'Samsung', categoryName: 'Electrónica' },
    { sku: 'ELEC-002', name: 'Consola PlayStation 5', description: 'Consola PS5 edición estándar con disco', costPrice: 2200000, salePrice: 2800000, taxRate: 19, stock: 8, minStock: 3, maxStock: 20, brand: 'Sony', categoryName: 'Electrónica' },
    { sku: 'ELEC-003', name: 'Consola Nintendo Switch OLED', description: 'Nintendo Switch modelo OLED pantalla 7"', costPrice: 1200000, salePrice: 1500000, taxRate: 19, stock: 15, minStock: 5, maxStock: 25, brand: 'Nintendo', categoryName: 'Electrónica' },
    { sku: 'ELEC-004', name: 'Cámara Canon EOS Rebel T7', description: 'Cámara DSLR Canon con lente 18-55mm', costPrice: 2400000, salePrice: 3200000, taxRate: 19, stock: 4, minStock: 2, maxStock: 10, brand: 'Canon', categoryName: 'Electrónica' },
    { sku: 'ELEC-005', name: 'Drone DJI Mini 3 Pro', description: 'Drone compacto con cámara 4K y gimbal', costPrice: 1600000, salePrice: 2100000, taxRate: 19, stock: 3, minStock: 2, maxStock: 8, brand: 'DJI', categoryName: 'Electrónica' },
    { sku: 'ELEC-006', name: 'Apple Watch Series 9', description: 'Smartwatch Apple 45mm GPS + Cellular', costPrice: 1400000, salePrice: 1800000, taxRate: 19, stock: 0, minStock: 5, maxStock: 15, brand: 'Apple', categoryName: 'Electrónica' },
    // Computadores y Laptops (6)
    { sku: 'COMP-001', name: 'Laptop Dell Inspiron 15', description: 'Intel Core i5, 8GB RAM, 512GB SSD', costPrice: 1600000, salePrice: 2100000, taxRate: 19, stock: 18, minStock: 5, maxStock: 30, brand: 'Dell', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-002', name: 'Laptop HP Pavilion 15', description: 'AMD Ryzen 5, 16GB RAM, 512GB SSD', costPrice: 1500000, salePrice: 1900000, taxRate: 19, stock: 14, minStock: 5, maxStock: 25, brand: 'HP', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-003', name: 'MacBook Air M2', description: 'Apple M2, 8GB RAM, 256GB SSD, 13.6"', costPrice: 4200000, salePrice: 5500000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Apple', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-004', name: 'PC Gamer RTX 4070', description: 'Intel i7, RTX 4070, 32GB RAM, 1TB NVMe', costPrice: 3200000, salePrice: 4200000, taxRate: 19, stock: 5, minStock: 2, maxStock: 8, brand: 'Custom', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-005', name: 'Monitor Samsung 27" Curvo', description: 'Monitor LED 27" Full HD 75Hz', costPrice: 480000, salePrice: 650000, taxRate: 19, stock: 22, minStock: 8, maxStock: 40, brand: 'Samsung', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-006', name: 'Monitor LG UltraWide 34"', description: 'Monitor IPS 34" WQHD 21:9', costPrice: 1100000, salePrice: 1400000, taxRate: 19, stock: 2, minStock: 3, maxStock: 10, brand: 'LG', categoryName: 'Computadores y Laptops' },
    // Celulares y Tablets (6)
    { sku: 'CEL-001', name: 'iPhone 15 Pro 256GB', description: 'Apple iPhone 15 Pro Titanio Natural', costPrice: 3800000, salePrice: 4500000, taxRate: 19, stock: 10, minStock: 5, maxStock: 20, brand: 'Apple', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-002', name: 'Samsung Galaxy S24 Ultra', description: 'Samsung S24 Ultra 256GB 5G', costPrice: 3200000, salePrice: 3800000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Samsung', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-003', name: 'Xiaomi Redmi Note 13 Pro', description: 'Redmi Note 13 Pro 256GB 5G', costPrice: 700000, salePrice: 900000, taxRate: 19, stock: 25, minStock: 10, maxStock: 50, brand: 'Xiaomi', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-004', name: 'iPad Air 5ta Gen', description: 'iPad Air 10.9" 64GB WiFi', costPrice: 2000000, salePrice: 2500000, taxRate: 19, stock: 0, minStock: 4, maxStock: 12, brand: 'Apple', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-005', name: 'Samsung Galaxy Tab S9', description: 'Galaxy Tab S9 11" 128GB WiFi', costPrice: 1800000, salePrice: 2200000, taxRate: 19, stock: 7, minStock: 3, maxStock: 15, brand: 'Samsung', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-006', name: 'Tablet Lenovo Tab M10 Plus', description: 'Tab M10 Plus 10.6" 64GB', costPrice: 350000, salePrice: 450000, taxRate: 19, stock: 30, minStock: 10, maxStock: 50, brand: 'Lenovo', categoryName: 'Celulares y Tablets' },
    // Audio y Video (5)
    { sku: 'AUD-001', name: 'Audífonos Sony WH-1000XM5', description: 'Audífonos inalámbricos con ANC', costPrice: 1200000, salePrice: 1500000, taxRate: 19, stock: 12, minStock: 5, maxStock: 25, brand: 'Sony', categoryName: 'Audio y Video' },
    { sku: 'AUD-002', name: 'AirPods Pro 2da Gen', description: 'Apple AirPods Pro con estuche MagSafe', costPrice: 850000, salePrice: 1100000, taxRate: 19, stock: 15, minStock: 8, maxStock: 30, brand: 'Apple', categoryName: 'Audio y Video' },
    { sku: 'AUD-003', name: 'Parlante JBL Flip 6', description: 'Parlante Bluetooth portátil resistente al agua', costPrice: 350000, salePrice: 450000, taxRate: 19, stock: 20, minStock: 10, maxStock: 40, brand: 'JBL', categoryName: 'Audio y Video' },
    { sku: 'AUD-004', name: 'Barra de Sonido Samsung HW-B550', description: 'Soundbar 2.1 con subwoofer inalámbrico', costPrice: 600000, salePrice: 800000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Samsung', categoryName: 'Audio y Video' },
    { sku: 'AUD-005', name: 'Micrófono Blue Yeti USB', description: 'Micrófono condensador USB para streaming', costPrice: 420000, salePrice: 550000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Blue', categoryName: 'Audio y Video' },
    // Ropa Hombre (6)
    { sku: 'RH-001', name: 'Camiseta Polo Lacoste', description: 'Polo clásico algodón piqué', costPrice: 120000, salePrice: 180000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Lacoste', categoryName: 'Ropa Hombre' },
    { sku: 'RH-002', name: 'Camisa Formal Arturo Calle', description: 'Camisa manga larga algodón', costPrice: 95000, salePrice: 150000, taxRate: 19, stock: 35, minStock: 12, maxStock: 60, brand: 'Arturo Calle', categoryName: 'Ropa Hombre' },
    { sku: 'RH-003', name: 'Jean Levi\'s 501 Original', description: 'Jean clásico corte recto', costPrice: 180000, salePrice: 280000, taxRate: 19, stock: 28, minStock: 10, maxStock: 50, brand: 'Levi\'s', categoryName: 'Ropa Hombre' },
    { sku: 'RH-004', name: 'Chaqueta The North Face', description: 'Chaqueta impermeable ThermoBall', costPrice: 320000, salePrice: 450000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'The North Face', categoryName: 'Ropa Hombre' },
    { sku: 'RH-005', name: 'Bermuda Tommy Hilfiger', description: 'Bermuda chino algodón', costPrice: 150000, salePrice: 220000, taxRate: 19, stock: 22, minStock: 8, maxStock: 40, brand: 'Tommy Hilfiger', categoryName: 'Ropa Hombre' },
    { sku: 'RH-006', name: 'Sudadera Adidas Originals', description: 'Sudadera con capucha algodón', costPrice: 120000, salePrice: 180000, taxRate: 19, stock: 25, minStock: 10, maxStock: 45, brand: 'Adidas', categoryName: 'Ropa Hombre' },
    // Ropa Mujer (6)
    { sku: 'RM-001', name: 'Vestido Zara Casual', description: 'Vestido midi estampado floral', costPrice: 160000, salePrice: 250000, taxRate: 19, stock: 18, minStock: 8, maxStock: 35, brand: 'Zara', categoryName: 'Ropa Mujer' },
    { sku: 'RM-002', name: 'Blusa Studio F Elegante', description: 'Blusa manga larga satinada', costPrice: 75000, salePrice: 120000, taxRate: 19, stock: 30, minStock: 12, maxStock: 50, brand: 'Studio F', categoryName: 'Ropa Mujer' },
    { sku: 'RM-003', name: 'Jean Mom Fit', description: 'Jean tiro alto corte mom', costPrice: 110000, salePrice: 180000, taxRate: 19, stock: 24, minStock: 10, maxStock: 45, brand: 'Pull&Bear', categoryName: 'Ropa Mujer' },
    { sku: 'RM-004', name: 'Chaqueta de Cuero Sintético', description: 'Chaqueta biker cuero sintético', costPrice: 250000, salePrice: 380000, taxRate: 19, stock: 10, minStock: 5, maxStock: 18, brand: 'Bershka', categoryName: 'Ropa Mujer' },
    { sku: 'RM-005', name: 'Falda Midi Plisada', description: 'Falda midi plisada elegante', costPrice: 90000, salePrice: 150000, taxRate: 19, stock: 15, minStock: 6, maxStock: 25, brand: 'Mango', categoryName: 'Ropa Mujer' },
    { sku: 'RM-006', name: 'Conjunto Deportivo Nike', description: 'Conjunto leggings + top deportivo', costPrice: 220000, salePrice: 320000, taxRate: 19, stock: 20, minStock: 8, maxStock: 35, brand: 'Nike', categoryName: 'Ropa Mujer' },
    // Calzado (5)
    { sku: 'CAL-001', name: 'Tenis Nike Air Max 90', description: 'Tenis clásicos Air Max 90', costPrice: 320000, salePrice: 450000, taxRate: 19, stock: 16, minStock: 8, maxStock: 30, brand: 'Nike', categoryName: 'Calzado' },
    { sku: 'CAL-002', name: 'Zapatos Formales Bosi', description: 'Zapatos Oxford cuero genuino', costPrice: 180000, salePrice: 280000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'Bosi', categoryName: 'Calzado' },
    { sku: 'CAL-003', name: 'Botas Timberland Premium', description: 'Botas 6-inch premium waterproof', costPrice: 380000, salePrice: 520000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Timberland', categoryName: 'Calzado' },
    { sku: 'CAL-004', name: 'Sandalias Crocs Classic', description: 'Crocs Classic Clog unisex', costPrice: 100000, salePrice: 150000, taxRate: 19, stock: 35, minStock: 15, maxStock: 60, brand: 'Crocs', categoryName: 'Calzado' },
    { sku: 'CAL-005', name: 'Tenis Adidas Ultraboost', description: 'Tenis running Ultraboost 23', costPrice: 280000, salePrice: 380000, taxRate: 19, stock: 14, minStock: 6, maxStock: 25, brand: 'Adidas', categoryName: 'Calzado' },
    // Accesorios de Moda (5)
    { sku: 'ACC-001', name: 'Reloj Casio G-Shock', description: 'Reloj digital resistente golpes y agua', costPrice: 250000, salePrice: 350000, taxRate: 19, stock: 18, minStock: 8, maxStock: 30, brand: 'Casio', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-002', name: 'Gafas Ray-Ban Aviator', description: 'Gafas de sol Aviator Classic', costPrice: 350000, salePrice: 480000, taxRate: 19, stock: 10, minStock: 5, maxStock: 20, brand: 'Ray-Ban', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-003', name: 'Bolso Coach Crossbody', description: 'Bolso bandolera cuero genuino', costPrice: 480000, salePrice: 650000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Coach', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-004', name: 'Cinturón Cuero Italiano', description: 'Cinturón cuero italiano hebilla clásica', costPrice: 55000, salePrice: 85000, taxRate: 19, stock: 40, minStock: 15, maxStock: 70, brand: 'Vélez', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-005', name: 'Billetera Tommy Hilfiger', description: 'Billetera cuero con portamonedas', costPrice: 80000, salePrice: 120000, taxRate: 19, stock: 25, minStock: 10, maxStock: 40, brand: 'Tommy Hilfiger', categoryName: 'Accesorios de Moda' },
    // Alimentos y Bebidas (8)
    { sku: 'ALI-001', name: 'Café Juan Valdez 500g', description: 'Café molido premium origen Huila', costPrice: 25000, salePrice: 35000, taxRate: 5, stock: 80, minStock: 30, maxStock: 150, brand: 'Juan Valdez', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-002', name: 'Chocolate Corona 500g', description: 'Chocolate tradicional en pastillas', costPrice: 5500, salePrice: 8500, taxRate: 0, stock: 120, minStock: 50, maxStock: 200, brand: 'Corona', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-003', name: 'Aceite Girasol Premier 3L', description: 'Aceite de girasol premium', costPrice: 22000, salePrice: 28000, taxRate: 0, stock: 60, minStock: 25, maxStock: 100, brand: 'Premier', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-004', name: 'Arroz Diana 5kg', description: 'Arroz blanco premium', costPrice: 18000, salePrice: 22000, taxRate: 0, stock: 100, minStock: 40, maxStock: 180, brand: 'Diana', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-005', name: 'Leche Alpina Entera 6-pack', description: 'Leche entera UHT 1L x 6', costPrice: 14000, salePrice: 18500, taxRate: 0, stock: 45, minStock: 20, maxStock: 80, brand: 'Alpina', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-006', name: 'Galletas Oreo Pack Familiar', description: 'Galletas Oreo 6 paquetes', costPrice: 8500, salePrice: 12000, taxRate: 0, stock: 70, minStock: 30, maxStock: 120, brand: 'Oreo', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-007', name: 'Gaseosa Coca-Cola 2.5L', description: 'Coca-Cola Original 2.5 litros', costPrice: 5500, salePrice: 7500, taxRate: 0, stock: 90, minStock: 40, maxStock: 150, brand: 'Coca-Cola', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-008', name: 'Agua Cristal 6-pack', description: 'Agua Cristal 600ml x 6', costPrice: 6500, salePrice: 9000, taxRate: 0, stock: 85, minStock: 35, maxStock: 140, brand: 'Cristal', categoryName: 'Alimentos y Bebidas' },
    // Hogar y Decoración (6)
    { sku: 'HOG-001', name: 'Lámpara LED Escritorio Philips', description: 'Lámpara LED regulable con USB', costPrice: 55000, salePrice: 75000, taxRate: 19, stock: 25, minStock: 10, maxStock: 45, brand: 'Philips', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-002', name: 'Set Sábanas 300 Hilos Queen', description: 'Juego sábanas algodón egipcio', costPrice: 130000, salePrice: 180000, taxRate: 19, stock: 18, minStock: 8, maxStock: 30, brand: 'Cannon', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-003', name: 'Cortinas Blackout 2 Paneles', description: 'Cortinas blackout térmicas', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 22, minStock: 10, maxStock: 40, brand: 'Home Collection', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-004', name: 'Alfombra Decorativa 160x230', description: 'Alfombra moderna pelo corto', costPrice: 180000, salePrice: 250000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Kalpana', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-005', name: 'Set Toallas 6 Piezas', description: 'Toallas algodón 600gsm', costPrice: 65000, salePrice: 95000, taxRate: 19, stock: 30, minStock: 12, maxStock: 50, brand: 'Cannon', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-006', name: 'Espejo Decorativo Redondo', description: 'Espejo pared marco dorado 60cm', costPrice: 95000, salePrice: 145000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'Home Collection', categoryName: 'Hogar y Decoración' },
    // Muebles (5)
    { sku: 'MUE-001', name: 'Silla Oficina Ergonómica', description: 'Silla ergonómica malla con lumbar', costPrice: 380000, salePrice: 520000, taxRate: 19, stock: 10, minStock: 5, maxStock: 18, brand: 'Rimax', categoryName: 'Muebles' },
    { sku: 'MUE-002', name: 'Escritorio en L Gaming', description: 'Escritorio esquinero con porta PC', costPrice: 500000, salePrice: 680000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Maderkit', categoryName: 'Muebles' },
    { sku: 'MUE-003', name: 'Sofá 3 Puestos Moderno', description: 'Sofá tela gris estructura madera', costPrice: 1400000, salePrice: 1800000, taxRate: 19, stock: 4, minStock: 2, maxStock: 8, brand: 'Jamar', categoryName: 'Muebles' },
    { sku: 'MUE-004', name: 'Mesa de Centro Moderna', description: 'Mesa centro vidrio templado', costPrice: 250000, salePrice: 350000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Tugó', categoryName: 'Muebles' },
    { sku: 'MUE-005', name: 'Cama Queen con Base', description: 'Base cama queen + cabecero tapizado', costPrice: 900000, salePrice: 1200000, taxRate: 19, stock: 3, minStock: 2, maxStock: 6, brand: 'Spring', categoryName: 'Muebles' },
    // Deportes y Fitness (6)
    { sku: 'DEP-001', name: 'Balón Fútbol Adidas Pro', description: 'Balón oficial FIFA Quality Pro', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 25, minStock: 10, maxStock: 45, brand: 'Adidas', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-002', name: 'Raqueta Tenis Wilson Pro', description: 'Raqueta profesional grafito', costPrice: 200000, salePrice: 280000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Wilson', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-003', name: 'Set Mancuernas 20kg', description: 'Par mancuernas ajustables 1-10kg', costPrice: 130000, salePrice: 180000, taxRate: 19, stock: 15, minStock: 6, maxStock: 25, brand: 'Everlast', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-004', name: 'Colchoneta Yoga TPE', description: 'Mat yoga antideslizante 6mm', costPrice: 32000, salePrice: 45000, taxRate: 19, stock: 35, minStock: 15, maxStock: 60, brand: 'Manduka', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-005', name: 'Bicicleta Spinning Pro', description: 'Bicicleta estática spinning', costPrice: 650000, salePrice: 850000, taxRate: 19, stock: 4, minStock: 2, maxStock: 8, brand: 'Athletic', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-006', name: 'Set Bandas Elásticas 5pz', description: 'Kit bandas resistencia niveles', costPrice: 25000, salePrice: 35000, taxRate: 19, stock: 40, minStock: 15, maxStock: 70, brand: 'Theraband', categoryName: 'Deportes y Fitness' },
    // Juguetes (5)
    { sku: 'JUG-001', name: 'LEGO Star Wars Millennium', description: 'Set LEGO 1353 piezas Halcón Milenario', costPrice: 280000, salePrice: 350000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'LEGO', categoryName: 'Juguetes' },
    { sku: 'JUG-002', name: 'Barbie Dreamhouse', description: 'Casa de muñecas Barbie 3 pisos', costPrice: 140000, salePrice: 180000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Mattel', categoryName: 'Juguetes' },
    { sku: 'JUG-003', name: 'Hot Wheels Pista Épica', description: 'Pista Hot Wheels con looping', costPrice: 90000, salePrice: 120000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'Hot Wheels', categoryName: 'Juguetes' },
    { sku: 'JUG-004', name: 'Rompecabezas 1000 Piezas', description: 'Puzzle paisaje 1000 piezas', costPrice: 32000, salePrice: 45000, taxRate: 19, stock: 20, minStock: 8, maxStock: 35, brand: 'Ravensburger', categoryName: 'Juguetes' },
    { sku: 'JUG-005', name: 'Monopoly Edición Colombia', description: 'Juego de mesa Monopoly Colombia', costPrice: 65000, salePrice: 85000, taxRate: 19, stock: 15, minStock: 6, maxStock: 25, brand: 'Hasbro', categoryName: 'Juguetes' },
    // Papelería y Oficina (5)
    { sku: 'PAP-001', name: 'Resma Papel Carta 500h', description: 'Papel bond 75g carta 500 hojas', costPrice: 14000, salePrice: 18000, taxRate: 19, stock: 80, minStock: 30, maxStock: 150, brand: 'Reprograf', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-002', name: 'Cuaderno Argollado 100h', description: 'Cuaderno profesional argollado', costPrice: 6000, salePrice: 8500, taxRate: 19, stock: 100, minStock: 40, maxStock: 180, brand: 'Norma', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-003', name: 'Set Marcadores 12 Colores', description: 'Marcadores permanentes Sharpie', costPrice: 18000, salePrice: 25000, taxRate: 19, stock: 45, minStock: 20, maxStock: 80, brand: 'Sharpie', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-004', name: 'Grapadora Industrial', description: 'Grapadora capacidad 100 hojas', costPrice: 25000, salePrice: 35000, taxRate: 19, stock: 20, minStock: 8, maxStock: 35, brand: 'Bostitch', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-005', name: 'Organizador Escritorio 5pz', description: 'Set organizador acrílico oficina', costPrice: 30000, salePrice: 42000, taxRate: 19, stock: 25, minStock: 10, maxStock: 40, brand: 'Artesco', categoryName: 'Papelería y Oficina' },
    // Ferretería y Herramientas (5)
    { sku: 'FER-001', name: 'Taladro Percutor Bosch 700W', description: 'Taladro percutor reversible', costPrice: 240000, salePrice: 320000, taxRate: 19, stock: 10, minStock: 5, maxStock: 18, brand: 'Bosch', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-002', name: 'Set Destornilladores 20pz', description: 'Juego destornilladores precisión', costPrice: 65000, salePrice: 85000, taxRate: 19, stock: 18, minStock: 8, maxStock: 30, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-003', name: 'Cinta Métrica 8m Stanley', description: 'Flexómetro profesional 8 metros', costPrice: 12000, salePrice: 18000, taxRate: 19, stock: 40, minStock: 15, maxStock: 70, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-004', name: 'Martillo Carpintero Stanley', description: 'Martillo uña fibra vidrio 16oz', costPrice: 35000, salePrice: 45000, taxRate: 19, stock: 22, minStock: 10, maxStock: 40, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-005', name: 'Caja Herramientas 100pz', description: 'Maletín herramientas completo', costPrice: 200000, salePrice: 280000, taxRate: 19, stock: 7, minStock: 3, maxStock: 12, brand: 'Black+Decker', categoryName: 'Ferretería y Herramientas' },
  ];

  const demoProducts: ProductRecord[] = [];
  for (let i = 0; i < demoProductsData.length; i++) {
    const p = demoProductsData[i];
    const category = demoCategories[p.categoryName];
    const status = p.stock === 0 ? 'OUT_OF_STOCK' : (p.stock < p.minStock ? 'ACTIVE' : 'ACTIVE');
    const created = await prisma.product.create({
      data: {
        tenantId: tenantDemo.id, categoryId: category.id, sku: p.sku, name: p.name,
        description: p.description, costPrice: p.costPrice, salePrice: p.salePrice,
        taxRate: p.taxRate, stock: p.stock, minStock: p.minStock, maxStock: p.maxStock,
        brand: p.brand, unit: 'UND', status,
        barcode: generateEAN13('770', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    demoProducts.push({ ...created, salePrice: p.salePrice, taxRate: p.taxRate, categoryId: category.id });
  }
  console.log(`   ✅ ${demoProducts.length} Productos Tienda Demo creados`);

  // ============================================================================
  // STEP 6b: Products - Distribuidora Nacional (30 productos)
  // ============================================================================
  console.log('📦 Creando Productos Distribuidora Nacional...');

  const dnProductsData: { sku: string; name: string; description: string; costPrice: number; salePrice: number; taxRate: number; stock: number; minStock: number; maxStock: number; brand: string; catKey: string }[] = [
    { sku: 'DN-001', name: 'Jabón Líquido Fabuloso 5L', description: 'Limpiador multiusos lavanda', costPrice: 15000, salePrice: 22000, taxRate: 19, stock: 200, minStock: 50, maxStock: 400, brand: 'Fabuloso', catKey: 'Aseo y Limpieza' },
    { sku: 'DN-002', name: 'Detergente Fab 3kg', description: 'Detergente polvo floral', costPrice: 18000, salePrice: 26000, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Fab', catKey: 'Aseo y Limpieza' },
    { sku: 'DN-003', name: 'Desinfectante Clorox 3.8L', description: 'Desinfectante multiusos', costPrice: 12000, salePrice: 18000, taxRate: 19, stock: 250, minStock: 80, maxStock: 450, brand: 'Clorox', catKey: 'Aseo y Limpieza' },
    { sku: 'DN-004', name: 'Limpiavidrios Windex 1L x6', description: 'Pack limpiador vidrios', costPrice: 24000, salePrice: 35000, taxRate: 19, stock: 120, minStock: 40, maxStock: 220, brand: 'Windex', catKey: 'Aseo y Limpieza' },
    { sku: 'DN-005', name: 'Papel Higiénico x48 rollos', description: 'Paquete papel higiénico doble hoja', costPrice: 32000, salePrice: 45000, taxRate: 0, stock: 300, minStock: 100, maxStock: 500, brand: 'Familia', catKey: 'Aseo y Limpieza' },
    { sku: 'DN-006', name: 'Arroz Diana 25kg Bulto', description: 'Arroz blanco premium al mayor', costPrice: 65000, salePrice: 85000, taxRate: 0, stock: 150, minStock: 40, maxStock: 300, brand: 'Diana', catKey: 'Alimentos al Mayor' },
    { sku: 'DN-007', name: 'Azúcar Manuelita 25kg', description: 'Azúcar blanca refinada bulto', costPrice: 55000, salePrice: 72000, taxRate: 0, stock: 130, minStock: 35, maxStock: 260, brand: 'Manuelita', catKey: 'Alimentos al Mayor' },
    { sku: 'DN-008', name: 'Sal Refisal 25kg', description: 'Sal refinada yodada bulto', costPrice: 20000, salePrice: 30000, taxRate: 0, stock: 180, minStock: 50, maxStock: 350, brand: 'Refisal', catKey: 'Alimentos al Mayor' },
    { sku: 'DN-009', name: 'Aceite Girasol 20L Bidón', description: 'Aceite cocina bidón industrial', costPrice: 80000, salePrice: 110000, taxRate: 5, stock: 80, minStock: 20, maxStock: 160, brand: 'Girasoli', catKey: 'Alimentos al Mayor' },
    { sku: 'DN-010', name: 'Harina Trigo 25kg', description: 'Harina de trigo panificación', costPrice: 48000, salePrice: 65000, taxRate: 0, stock: 100, minStock: 30, maxStock: 200, brand: 'Harinera del Valle', catKey: 'Alimentos al Mayor' },
    { sku: 'DN-011', name: 'Lentejas 10kg', description: 'Lentejas secas grano grueso', costPrice: 35000, salePrice: 48000, taxRate: 0, stock: 90, minStock: 25, maxStock: 180, brand: 'La Muñeca', catKey: 'Alimentos al Mayor' },
    { sku: 'DN-012', name: 'Atún Van Camps x24', description: 'Caja atún en aceite latas', costPrice: 72000, salePrice: 95000, taxRate: 5, stock: 60, minStock: 20, maxStock: 120, brand: 'Van Camps', catKey: 'Alimentos al Mayor' },
    { sku: 'DN-013', name: 'Cerveza Águila x24', description: 'Caja cerveza Águila 330ml', costPrice: 42000, salePrice: 58000, taxRate: 19, stock: 200, minStock: 70, maxStock: 400, brand: 'Bavaria', catKey: 'Bebidas al Mayor' },
    { sku: 'DN-014', name: 'Gaseosa Postobón 1.5L x12', description: 'Pack gaseosas surtidas', costPrice: 28000, salePrice: 38000, taxRate: 19, stock: 300, minStock: 100, maxStock: 500, brand: 'Postobón', catKey: 'Bebidas al Mayor' },
    { sku: 'DN-015', name: 'Agua Cristal 600ml x24', description: 'Caja agua personal', costPrice: 18000, salePrice: 26000, taxRate: 0, stock: 250, minStock: 80, maxStock: 450, brand: 'Cristal', catKey: 'Bebidas al Mayor' },
    { sku: 'DN-016', name: 'Jugo Hit 1L x12', description: 'Caja jugos surtidos', costPrice: 24000, salePrice: 34000, taxRate: 19, stock: 160, minStock: 50, maxStock: 300, brand: 'Hit', catKey: 'Bebidas al Mayor' },
    { sku: 'DN-017', name: 'Coca-Cola 2.5L x8', description: 'Pack familiar gaseosa', costPrice: 32000, salePrice: 44000, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Coca-Cola', catKey: 'Bebidas al Mayor' },
    { sku: 'DN-018', name: 'Shampoo Sedal 1L x12', description: 'Caja shampoo cuidado capilar', costPrice: 48000, salePrice: 68000, taxRate: 19, stock: 90, minStock: 30, maxStock: 180, brand: 'Sedal', catKey: 'Cuidado Personal' },
    { sku: 'DN-019', name: 'Jabón Dove x24', description: 'Caja jabón tocador cremoso', costPrice: 55000, salePrice: 75000, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Dove', catKey: 'Cuidado Personal' },
    { sku: 'DN-020', name: 'Crema Dental Colgate x24', description: 'Caja crema dental triple acción', costPrice: 36000, salePrice: 50000, taxRate: 19, stock: 140, minStock: 45, maxStock: 280, brand: 'Colgate', catKey: 'Cuidado Personal' },
    { sku: 'DN-021', name: 'Desodorante Rexona x12', description: 'Caja desodorante aerosol', costPrice: 42000, salePrice: 58000, taxRate: 19, stock: 110, minStock: 35, maxStock: 220, brand: 'Rexona', catKey: 'Cuidado Personal' },
    { sku: 'DN-022', name: 'Pañales Huggies x100', description: 'Paquete pañales etapa 3', costPrice: 65000, salePrice: 88000, taxRate: 0, stock: 75, minStock: 25, maxStock: 150, brand: 'Huggies', catKey: 'Cuidado Personal' },
    { sku: 'DN-023', name: 'Vasos Desechables x1000', description: 'Vasos 7oz poliestireno', costPrice: 22000, salePrice: 32000, taxRate: 19, stock: 200, minStock: 60, maxStock: 400, brand: 'Darnel', catKey: 'Desechables' },
    { sku: 'DN-024', name: 'Platos Desechables x500', description: 'Platos 9" icopor', costPrice: 18000, salePrice: 26000, taxRate: 19, stock: 150, minStock: 50, maxStock: 300, brand: 'Darnel', catKey: 'Desechables' },
    { sku: 'DN-025', name: 'Bolsas Basura x100', description: 'Bolsas negras industriales', costPrice: 15000, salePrice: 22000, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Reyplast', catKey: 'Desechables' },
    { sku: 'DN-026', name: 'Servilletas x1000', description: 'Servilletas dobladas blancas', costPrice: 12000, salePrice: 18000, taxRate: 0, stock: 220, minStock: 70, maxStock: 400, brand: 'Familia', catKey: 'Desechables' },
    { sku: 'DN-027', name: 'Olla Imusa Set x5', description: 'Set ollas aluminio con tapas', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Imusa', catKey: 'Hogar Mayorista' },
    { sku: 'DN-028', name: 'Sartén Antiadherente x6', description: 'Pack sartenes 20-24-28cm', costPrice: 65000, salePrice: 90000, taxRate: 19, stock: 35, minStock: 12, maxStock: 70, brand: 'Imusa', catKey: 'Hogar Mayorista' },
    { sku: 'DN-029', name: 'Resma Papel x10', description: 'Pack 10 resmas carta 75g', costPrice: 120000, salePrice: 165000, taxRate: 19, stock: 60, minStock: 20, maxStock: 120, brand: 'Reprograf', catKey: 'Hogar Mayorista' },
    { sku: 'DN-030', name: 'Escoba + Trapero Set x12', description: 'Pack escobas y trapeadores', costPrice: 48000, salePrice: 68000, taxRate: 19, stock: 50, minStock: 18, maxStock: 100, brand: 'Fuller', catKey: 'Hogar Mayorista' },
  ];

  const dnProducts: ProductRecord[] = [];
  for (let i = 0; i < dnProductsData.length; i++) {
    const p = dnProductsData[i];
    const created = await prisma.product.create({
      data: {
        tenantId: tenantDistribuidora.id, categoryId: dnCategories[p.catKey].id,
        sku: p.sku, name: p.name, description: p.description,
        costPrice: p.costPrice, salePrice: p.salePrice, taxRate: p.taxRate,
        stock: p.stock, minStock: p.minStock, maxStock: p.maxStock,
        brand: p.brand, unit: 'UND', status: 'ACTIVE',
        barcode: generateEAN13('771', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    dnProducts.push({ ...created, salePrice: p.salePrice, taxRate: p.taxRate, categoryId: dnCategories[p.catKey].id });
  }
  console.log(`   ✅ ${dnProducts.length} Productos Distribuidora creados`);

  // ============================================================================
  // STEP 6c: Products - Nuevo Negocio (12 productos)
  // ============================================================================
  console.log('📦 Creando Productos Nuevo Negocio...');

  const nnProductsData = [
    { sku: 'NN-001', name: 'Camiseta Básica Algodón', description: 'Camiseta unisex 100% algodón', costPrice: 18000, salePrice: 35000, taxRate: 19, stock: 50, minStock: 15, maxStock: 100, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
    { sku: 'NN-002', name: 'Camiseta Estampada Vintage', description: 'Camiseta con diseño retro', costPrice: 22000, salePrice: 42000, taxRate: 19, stock: 35, minStock: 10, maxStock: 70, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
    { sku: 'NN-003', name: 'Polo Casual Slim', description: 'Polo manga corta ajustado', costPrice: 28000, salePrice: 52000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
    { sku: 'NN-004', name: 'Crop Top Deportivo', description: 'Top corto para mujer', costPrice: 15000, salePrice: 32000, taxRate: 19, stock: 25, minStock: 8, maxStock: 50, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
    { sku: 'NN-005', name: 'Jean Skinny Negro', description: 'Jean ajustado negro stretch', costPrice: 35000, salePrice: 65000, taxRate: 19, stock: 40, minStock: 12, maxStock: 80, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
    { sku: 'NN-006', name: 'Jean Mom Fit Clásico', description: 'Jean tiro alto corte mom', costPrice: 38000, salePrice: 68000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
    { sku: 'NN-007', name: 'Jogger Cargo Unisex', description: 'Pantalón jogger con bolsillos cargo', costPrice: 32000, salePrice: 58000, taxRate: 19, stock: 25, minStock: 8, maxStock: 50, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
    { sku: 'NN-008', name: 'Sudadera Oversize', description: 'Sudadera con capucha oversize', costPrice: 35000, salePrice: 62000, taxRate: 19, stock: 20, minStock: 8, maxStock: 40, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
    { sku: 'NN-009', name: 'Gorra Snapback', description: 'Gorra plana ajustable', costPrice: 12000, salePrice: 28000, taxRate: 19, stock: 45, minStock: 15, maxStock: 90, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
    { sku: 'NN-010', name: 'Gafas Sol Espejo', description: 'Gafas de sol lente espejo', costPrice: 8000, salePrice: 22000, taxRate: 19, stock: 35, minStock: 10, maxStock: 70, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
    { sku: 'NN-011', name: 'Correa Lona Militar', description: 'Cinturón lona estilo militar', costPrice: 8000, salePrice: 18000, taxRate: 19, stock: 40, minStock: 12, maxStock: 80, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
    { sku: 'NN-012', name: 'Tenis Urbanos Blancos', description: 'Zapatillas blancas casuales', costPrice: 45000, salePrice: 85000, taxRate: 19, stock: 20, minStock: 8, maxStock: 40, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
  ];

  const nnProducts: ProductRecord[] = [];
  for (let i = 0; i < nnProductsData.length; i++) {
    const p = nnProductsData[i];
    const created = await prisma.product.create({
      data: {
        tenantId: tenantNuevo.id, categoryId: nnCategories[p.catKey].id,
        sku: p.sku, name: p.name, description: p.description,
        costPrice: p.costPrice, salePrice: p.salePrice, taxRate: p.taxRate,
        stock: p.stock, minStock: p.minStock, maxStock: p.maxStock,
        brand: p.brand, unit: 'UND', status: 'ACTIVE',
        barcode: generateEAN13('772', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    nnProducts.push({ ...created, salePrice: p.salePrice, taxRate: p.taxRate, categoryId: nnCategories[p.catKey].id });
  }
  console.log(`   ✅ ${nnProducts.length} Productos Nuevo Negocio creados`);

  // ============================================================================
  // STEP 6d: Products - Papelería Central (40 productos)
  // ============================================================================
  console.log('📦 Creando Productos Papelería Central...');

  const pcProductsData = [
    // Cuadernos (5)
    { sku: 'PC-001', name: 'Cuaderno Argollado 100h Norma', description: 'Cuaderno profesional cuadriculado', costPrice: 5500, salePrice: 8500, taxRate: 19, stock: 150, minStock: 50, maxStock: 300, brand: 'Norma', catKey: 'Cuadernos' },
    { sku: 'PC-002', name: 'Cuaderno Cosido 100h Norma', description: 'Cuaderno cosido rayado', costPrice: 3500, salePrice: 5500, taxRate: 19, stock: 200, minStock: 70, maxStock: 400, brand: 'Norma', catKey: 'Cuadernos' },
    { sku: 'PC-003', name: 'Cuaderno Argollado 80h Scribe', description: 'Cuaderno escolar básico', costPrice: 4000, salePrice: 6500, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Scribe', catKey: 'Cuadernos' },
    { sku: 'PC-004', name: 'Cuaderno de Dibujo A4', description: 'Block dibujo sin líneas 40h', costPrice: 3000, salePrice: 5000, taxRate: 19, stock: 120, minStock: 40, maxStock: 250, brand: 'Norma', catKey: 'Cuadernos' },
    { sku: 'PC-005', name: 'Agenda Ejecutiva 2025', description: 'Agenda profesional diaria', costPrice: 15000, salePrice: 28000, taxRate: 19, stock: 60, minStock: 20, maxStock: 120, brand: 'Norma', catKey: 'Cuadernos' },
    // Escritura (5)
    { sku: 'PC-006', name: 'Lápiz Mongol #2 x12', description: 'Caja lápices grafito', costPrice: 4500, salePrice: 7000, taxRate: 19, stock: 200, minStock: 80, maxStock: 400, brand: 'Faber-Castell', catKey: 'Escritura' },
    { sku: 'PC-007', name: 'Esfero BIC Cristal x12', description: 'Caja esferos punto medio', costPrice: 7000, salePrice: 11000, taxRate: 19, stock: 250, minStock: 100, maxStock: 500, brand: 'BIC', catKey: 'Escritura' },
    { sku: 'PC-008', name: 'Marcador Permanente Sharpie x4', description: 'Pack marcadores negro', costPrice: 12000, salePrice: 18000, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Sharpie', catKey: 'Escritura' },
    { sku: 'PC-009', name: 'Colores Prismacolor x24', description: 'Caja colores profesionales', costPrice: 25000, salePrice: 42000, taxRate: 19, stock: 45, minStock: 15, maxStock: 90, brand: 'Prismacolor', catKey: 'Escritura' },
    { sku: 'PC-010', name: 'Resaltador Stabilo x6', description: 'Pack resaltadores pastel', costPrice: 15000, salePrice: 24000, taxRate: 19, stock: 60, minStock: 20, maxStock: 120, brand: 'Stabilo', catKey: 'Escritura' },
    // Papel y Cartulinas (5)
    { sku: 'PC-011', name: 'Resma Papel Carta 500h', description: 'Papel bond 75g blanco', costPrice: 13000, salePrice: 18000, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Reprograf', catKey: 'Papel y Cartulinas' },
    { sku: 'PC-012', name: 'Resma Papel Oficio 500h', description: 'Papel bond 75g oficio', costPrice: 15000, salePrice: 20000, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Reprograf', catKey: 'Papel y Cartulinas' },
    { sku: 'PC-013', name: 'Cartulina Colores x10', description: 'Pliego cartulina surtida', costPrice: 5000, salePrice: 8000, taxRate: 19, stock: 150, minStock: 50, maxStock: 300, brand: 'Propalcote', catKey: 'Papel y Cartulinas' },
    { sku: 'PC-014', name: 'Papel Iris x50', description: 'Paquete papel iris colores', costPrice: 4000, salePrice: 6500, taxRate: 19, stock: 120, minStock: 40, maxStock: 240, brand: 'Propalcote', catKey: 'Papel y Cartulinas' },
    { sku: 'PC-015', name: 'Papel Contact x5m', description: 'Rollo papel adhesivo transparente', costPrice: 3500, salePrice: 6000, taxRate: 19, stock: 80, minStock: 25, maxStock: 160, brand: 'Propalcote', catKey: 'Papel y Cartulinas' },
    // Arte y Manualidades (5)
    { sku: 'PC-016', name: 'Pinturas Acrílicas x12', description: 'Set pinturas acrílicas colores', costPrice: 18000, salePrice: 30000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Mariposa', catKey: 'Arte y Manualidades' },
    { sku: 'PC-017', name: 'Set Pinceles x10', description: 'Pinceles pelo sintético', costPrice: 12000, salePrice: 20000, taxRate: 19, stock: 50, minStock: 18, maxStock: 100, brand: 'Mariposa', catKey: 'Arte y Manualidades' },
    { sku: 'PC-018', name: 'Silicona Líquida 250ml', description: 'Pegamento silicona escolar', costPrice: 3500, salePrice: 6000, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Pegastic', catKey: 'Arte y Manualidades' },
    { sku: 'PC-019', name: 'Plastilina x12 Barras', description: 'Set plastilina colores', costPrice: 4000, salePrice: 7000, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Pelikan', catKey: 'Arte y Manualidades' },
    { sku: 'PC-020', name: 'Foamy Colores x10', description: 'Láminas foamy surtidas', costPrice: 6000, salePrice: 10000, taxRate: 19, stock: 90, minStock: 30, maxStock: 180, brand: 'Propalcote', catKey: 'Arte y Manualidades' },
    // Organización (5)
    { sku: 'PC-021', name: 'Carpeta Legajadora AZ', description: 'Carpeta archivo carta', costPrice: 5000, salePrice: 8500, taxRate: 19, stock: 120, minStock: 40, maxStock: 240, brand: 'Norma', catKey: 'Organización' },
    { sku: 'PC-022', name: 'Folder Manila x25', description: 'Pack folders carta', costPrice: 6000, salePrice: 9500, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Norma', catKey: 'Organización' },
    { sku: 'PC-023', name: 'Sobre Manila x25', description: 'Pack sobres carta', costPrice: 4500, salePrice: 7500, taxRate: 19, stock: 90, minStock: 30, maxStock: 180, brand: 'Norma', catKey: 'Organización' },
    { sku: 'PC-024', name: 'Archivador de Palanca', description: 'Archivador AZ ancho', costPrice: 8000, salePrice: 13000, taxRate: 19, stock: 70, minStock: 25, maxStock: 140, brand: 'Norma', catKey: 'Organización' },
    { sku: 'PC-025', name: 'Separadores x5 Colores', description: 'Separadores plásticos para carpeta', costPrice: 2500, salePrice: 4500, taxRate: 19, stock: 110, minStock: 40, maxStock: 220, brand: 'Norma', catKey: 'Organización' },
    // Tecnología Escolar (5)
    { sku: 'PC-026', name: 'Calculadora Casio FX-82', description: 'Calculadora científica', costPrice: 35000, salePrice: 55000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Casio', catKey: 'Tecnología Escolar' },
    { sku: 'PC-027', name: 'USB Kingston 32GB', description: 'Memoria USB 3.0', costPrice: 12000, salePrice: 20000, taxRate: 19, stock: 50, minStock: 20, maxStock: 100, brand: 'Kingston', catKey: 'Tecnología Escolar' },
    { sku: 'PC-028', name: 'Audífonos Escolares', description: 'Audífonos con micrófono básicos', costPrice: 8000, salePrice: 15000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Genius', catKey: 'Tecnología Escolar' },
    { sku: 'PC-029', name: 'Mouse Inalámbrico', description: 'Mouse óptico inalámbrico', costPrice: 15000, salePrice: 25000, taxRate: 19, stock: 35, minStock: 12, maxStock: 70, brand: 'Logitech', catKey: 'Tecnología Escolar' },
    { sku: 'PC-030', name: 'Teclado USB Básico', description: 'Teclado español USB', costPrice: 18000, salePrice: 28000, taxRate: 19, stock: 25, minStock: 10, maxStock: 50, brand: 'Genius', catKey: 'Tecnología Escolar' },
    // Mochilas y Morrales (5)
    { sku: 'PC-031', name: 'Morral Escolar Totto', description: 'Morral escolar estampado', costPrice: 65000, salePrice: 110000, taxRate: 19, stock: 25, minStock: 10, maxStock: 50, brand: 'Totto', catKey: 'Mochilas y Morrales' },
    { sku: 'PC-032', name: 'Morral Universitario Totto', description: 'Morral laptop 15" acolchado', costPrice: 85000, salePrice: 140000, taxRate: 19, stock: 18, minStock: 8, maxStock: 35, brand: 'Totto', catKey: 'Mochilas y Morrales' },
    { sku: 'PC-033', name: 'Lonchera Térmica Infantil', description: 'Lonchera con aislante térmico', costPrice: 25000, salePrice: 42000, taxRate: 19, stock: 30, minStock: 12, maxStock: 60, brand: 'Totto', catKey: 'Mochilas y Morrales' },
    { sku: 'PC-034', name: 'Cartuchera Doble Cierre', description: 'Cartuchera escolar grande', costPrice: 12000, salePrice: 22000, taxRate: 19, stock: 45, minStock: 18, maxStock: 90, brand: 'Totto', catKey: 'Mochilas y Morrales' },
    { sku: 'PC-035', name: 'Maleta con Ruedas Infantil', description: 'Maleta rodante para niños', costPrice: 75000, salePrice: 125000, taxRate: 19, stock: 12, minStock: 5, maxStock: 25, brand: 'Totto', catKey: 'Mochilas y Morrales' },
    // Oficina (5)
    { sku: 'PC-036', name: 'Grapadora Estándar', description: 'Grapadora oficina 25 hojas', costPrice: 8000, salePrice: 14000, taxRate: 19, stock: 35, minStock: 12, maxStock: 70, brand: 'Bostitch', catKey: 'Oficina' },
    { sku: 'PC-037', name: 'Perforadora 2 Huecos', description: 'Perforadora estándar metal', costPrice: 10000, salePrice: 16000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Bostitch', catKey: 'Oficina' },
    { sku: 'PC-038', name: 'Cinta Pegante x6', description: 'Pack cintas transparentes', costPrice: 5000, salePrice: 8500, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Scotch', catKey: 'Oficina' },
    { sku: 'PC-039', name: 'Post-it 3x3 x5 Colores', description: 'Pack notas adhesivas', costPrice: 8000, salePrice: 13000, taxRate: 19, stock: 60, minStock: 22, maxStock: 120, brand: '3M', catKey: 'Oficina' },
    { sku: 'PC-040', name: 'Clips x100 + Ganchos x50', description: 'Kit sujetadores oficina', costPrice: 3000, salePrice: 5500, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Artesco', catKey: 'Oficina' },
  ];

  const pcProducts: ProductRecord[] = [];
  for (let i = 0; i < pcProductsData.length; i++) {
    const p = pcProductsData[i];
    const created = await prisma.product.create({
      data: {
        tenantId: tenantPapeleria.id, categoryId: pcCategories[p.catKey].id,
        sku: p.sku, name: p.name, description: p.description,
        costPrice: p.costPrice, salePrice: p.salePrice, taxRate: p.taxRate,
        stock: p.stock, minStock: p.minStock, maxStock: p.maxStock,
        brand: p.brand, unit: 'UND', status: 'ACTIVE',
        barcode: generateEAN13('773', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    pcProducts.push({ ...created, salePrice: p.salePrice, taxRate: p.taxRate, categoryId: pcCategories[p.catKey].id });
  }
  console.log(`   ✅ ${pcProducts.length} Productos Papelería Central creados`);
  console.log(`   📊 Total productos: ${demoProducts.length + dnProducts.length + nnProducts.length + pcProducts.length}`);

  // ============================================================================
  // STEP 7: Warehouses
  // ============================================================================
  console.log('🏭 Creando Bodegas...');

  // ── Tienda Demo (6) ──
  const warehouseMain = await prisma.warehouse.create({ data: { tenantId: tenantDemo.id, name: 'Almacén Principal', code: 'BOD-001', address: 'Calle 10 #43-67, El Poblado', city: 'Medellín', phone: '+57 4 444 5555', isMain: true, status: 'ACTIVE' } });
  const warehouseNorth = await prisma.warehouse.create({ data: { tenantId: tenantDemo.id, name: 'Bodega Norte', code: 'BOD-002', address: 'Carrera 50 #78-32', city: 'Bello', phone: '+57 4 455 6666', isMain: false, status: 'ACTIVE' } });
  const warehouseSouth = await prisma.warehouse.create({ data: { tenantId: tenantDemo.id, name: 'Bodega Sur', code: 'BOD-003', address: 'Avenida Las Vegas #10-25', city: 'Envigado', phone: '+57 4 466 7777', isMain: false, status: 'ACTIVE' } });
  const warehouseBogota = await prisma.warehouse.create({ data: { tenantId: tenantDemo.id, name: 'Centro de Distribución', code: 'BOD-004', address: 'Calle 26 #92-32, Zona Franca', city: 'Bogotá', phone: '+57 1 777 8888', isMain: false, status: 'ACTIVE' } });
  const warehouseStore = await prisma.warehouse.create({ data: { tenantId: tenantDemo.id, name: 'Punto de Venta Centro', code: 'BOD-005', address: 'Centro Comercial Santafé Local 234', city: 'Medellín', phone: '+57 4 488 9999', isMain: false, status: 'ACTIVE' } });
  await prisma.warehouse.create({ data: { tenantId: tenantDemo.id, name: 'Bodega Reserva', code: 'BOD-006', address: 'Zona Industrial Km 5', city: 'Itagüí', phone: '+57 4 499 0000', isMain: false, status: 'INACTIVE' } });
  const demoActiveWarehouses = [warehouseMain, warehouseNorth, warehouseSouth, warehouseBogota, warehouseStore];

  // ── Distribuidora Nacional (3) ──
  const dnWarehouseMain = await prisma.warehouse.create({ data: { tenantId: tenantDistribuidora.id, name: 'Bodega Central', code: 'DN-BOD-001', address: 'Cra 7 #72-13 Chapinero', city: 'Bogotá', phone: '+57 1 555 0010', isMain: true, status: 'ACTIVE' } });
  const dnWarehouse2 = await prisma.warehouse.create({ data: { tenantId: tenantDistribuidora.id, name: 'Centro de Acopio Norte', code: 'DN-BOD-002', address: 'Autopista Norte Km 15', city: 'Bogotá', phone: '+57 1 555 0011', isMain: false, status: 'ACTIVE' } });
  const dnWarehouse3 = await prisma.warehouse.create({ data: { tenantId: tenantDistribuidora.id, name: 'Punto Distribución Sur', code: 'DN-BOD-003', address: 'Av. Boyacá #65S-20', city: 'Bogotá', phone: '+57 1 555 0012', isMain: false, status: 'ACTIVE' } });
  const dnActiveWarehouses = [dnWarehouseMain, dnWarehouse2, dnWarehouse3];

  // ── Nuevo Negocio (1) ──
  const nnWarehouse = await prisma.warehouse.create({ data: { tenantId: tenantNuevo.id, name: 'Local Principal', code: 'NN-BOD-001', address: 'Calle 53 #45-12, Laureles', city: 'Medellín', phone: '+57 311 555 4445', isMain: true, status: 'ACTIVE' } });

  // ── Papelería Central (2) ──
  const pcWarehouseMain = await prisma.warehouse.create({ data: { tenantId: tenantPapeleria.id, name: 'Papelería Principal', code: 'PC-BOD-001', address: 'Carrera 43A #7-50', city: 'Medellín', phone: '+57 4 987 0010', isMain: true, status: 'ACTIVE' } });
  const pcWarehouse2 = await prisma.warehouse.create({ data: { tenantId: tenantPapeleria.id, name: 'Bodega Stock', code: 'PC-BOD-002', address: 'Calle 30 #65-20', city: 'Medellín', phone: '+57 4 987 0011', isMain: false, status: 'ACTIVE' } });
  const pcActiveWarehouses = [pcWarehouseMain, pcWarehouse2];

  console.log('   ✅ 12 Bodegas creadas (6 + 3 + 1 + 2)');

  // ── Assign warehouses to users ──
  console.log('🔗 Asignando bodegas a usuarios...');

  // Demo users
  await prisma.user.update({ where: { id: managerDemo.id }, data: { warehouseId: warehouseMain.id } });
  await prisma.user.update({ where: { id: employeeDemo.id }, data: { warehouseId: warehouseNorth.id } });
  await prisma.user.update({ where: { id: employee2Demo.id }, data: { warehouseId: warehouseStore.id } });
  await prisma.user.update({ where: { id: managerSouthDemo.id }, data: { warehouseId: warehouseSouth.id } });
  await prisma.user.update({ where: { id: employeePosDemo.id }, data: { warehouseId: warehouseStore.id } });
  await prisma.user.update({ where: { id: employeeSouthDemo.id }, data: { warehouseId: warehouseSouth.id } });
  await prisma.user.update({ where: { id: suspendedUserDemo.id }, data: { warehouseId: warehouseNorth.id } });
  await prisma.user.update({ where: { id: pendingUserDemo.id }, data: { warehouseId: warehouseStore.id } });
  await prisma.user.update({ where: { id: inactiveUserDemo.id }, data: { warehouseId: warehouseMain.id } });

  // DN users
  await prisma.user.update({ where: { id: dnManager.id }, data: { warehouseId: dnWarehouseMain.id } });
  await prisma.user.update({ where: { id: dnEmployee1.id }, data: { warehouseId: dnWarehouseMain.id } });
  await prisma.user.update({ where: { id: dnEmployee2.id }, data: { warehouseId: dnWarehouse2.id } });
  await prisma.user.update({ where: { id: dnGoogleUser.id }, data: { warehouseId: dnWarehouse3.id } });

  // NN user
  await prisma.user.update({ where: { id: nnAdmin.id }, data: { warehouseId: nnWarehouse.id } });

  // PC users
  await prisma.user.update({ where: { id: pcManager.id }, data: { warehouseId: pcWarehouseMain.id } });
  await prisma.user.update({ where: { id: pcEmployee1.id }, data: { warehouseId: pcWarehouseMain.id } });
  await prisma.user.update({ where: { id: pcEmployee2.id }, data: { warehouseId: pcWarehouse2.id } });

  console.log('   ✅ Bodegas asignadas a usuarios');

  // ── Permission Overrides ──
  console.log('🔑 Creando Permission Overrides...');
  await prisma.userPermissionOverride.createMany({
    data: [
      // Demo (7)
      { userId: employee2Demo.id, tenantId: tenantDemo.id, permission: 'pos:refund', granted: true, grantedBy: adminDemo.id, reason: 'Autorizado para procesar devoluciones en POS Centro' },
      { userId: employee2Demo.id, tenantId: tenantDemo.id, permission: 'pos:discount', granted: true, grantedBy: adminDemo.id, reason: 'Puede aplicar descuentos hasta 10%' },
      { userId: employeePosDemo.id, tenantId: tenantDemo.id, permission: 'pos:refund', granted: true, grantedBy: adminDemo.id, reason: 'Cajera principal - autorizada para devoluciones' },
      { userId: employeeSouthDemo.id, tenantId: tenantDemo.id, permission: 'inventory:view', granted: true, grantedBy: adminDemo.id, reason: 'Necesita ver inventario para recibir mercancía' },
      { userId: managerDemo.id, tenantId: tenantDemo.id, permission: 'inventory:transfer', granted: true, grantedBy: adminDemo.id, reason: 'Autorizada para transferencias entre bodegas' },
      { userId: managerDemo.id, tenantId: tenantDemo.id, permission: 'reports:export', granted: true, grantedBy: adminDemo.id, reason: 'Necesita exportar reportes mensuales' },
      { userId: managerSouthDemo.id, tenantId: tenantDemo.id, permission: 'invoices:cancel', granted: false, grantedBy: adminDemo.id, reason: 'Restricción temporal - investigación de facturación' },
      // DN (3)
      { userId: dnEmployee1.id, tenantId: tenantDistribuidora.id, permission: 'pos:refund', granted: true, grantedBy: dnAdmin.id, reason: 'Puede procesar devoluciones' },
      { userId: dnManager.id, tenantId: tenantDistribuidora.id, permission: 'reports:export', granted: true, grantedBy: dnAdmin.id, reason: 'Exportación de reportes mayoristas' },
      { userId: dnGoogleUser.id, tenantId: tenantDistribuidora.id, permission: 'inventory:adjust', granted: false, grantedBy: dnAdmin.id, reason: 'Sin permisos de ajuste - usuario nuevo' },
      // PC (2)
      { userId: pcEmployee1.id, tenantId: tenantPapeleria.id, permission: 'pos:discount', granted: true, grantedBy: pcAdmin.id, reason: 'Puede dar descuentos a clientes frecuentes' },
      { userId: pcManager.id, tenantId: tenantPapeleria.id, permission: 'inventory:transfer', granted: true, grantedBy: pcAdmin.id, reason: 'Transferencias entre local y bodega' },
    ],
  });
  console.log('   ✅ 12 Permission Overrides creados');

  // ============================================================================
  // STEP 8: Warehouse Stock Distribution
  // ============================================================================
  console.log('📊 Distribuyendo stock en bodegas...');

  // Demo: 50% principal, 20% norte, 15% sur, 10% bogotá, 5% tienda
  for (const product of demoProducts) {
    if (product.stock === 0) continue;
    const distributions = [
      { warehouse: warehouseMain, pct: 0.50 },
      { warehouse: warehouseNorth, pct: 0.20 },
      { warehouse: warehouseSouth, pct: 0.15 },
      { warehouse: warehouseBogota, pct: 0.10 },
      { warehouse: warehouseStore, pct: 0.05 },
    ];
    let remaining = product.stock;
    for (let i = 0; i < distributions.length; i++) {
      const isLast = i === distributions.length - 1;
      const qty = isLast ? remaining : Math.floor(product.stock * distributions[i].pct);
      if (qty > 0) {
        await prisma.warehouseStock.create({ data: { tenantId: tenantDemo.id, warehouseId: distributions[i].warehouse.id, productId: product.id, quantity: qty } });
        remaining -= qty;
      }
    }
  }

  // DN: 60% central, 25% norte, 15% sur
  for (const product of dnProducts) {
    const distributions = [
      { warehouse: dnWarehouseMain, pct: 0.60 },
      { warehouse: dnWarehouse2, pct: 0.25 },
      { warehouse: dnWarehouse3, pct: 0.15 },
    ];
    let remaining = product.stock;
    for (let i = 0; i < distributions.length; i++) {
      const isLast = i === distributions.length - 1;
      const qty = isLast ? remaining : Math.floor(product.stock * distributions[i].pct);
      if (qty > 0) {
        await prisma.warehouseStock.create({ data: { tenantId: tenantDistribuidora.id, warehouseId: distributions[i].warehouse.id, productId: product.id, quantity: qty } });
        remaining -= qty;
      }
    }
  }

  // NN: 100% local
  for (const product of nnProducts) {
    await prisma.warehouseStock.create({ data: { tenantId: tenantNuevo.id, warehouseId: nnWarehouse.id, productId: product.id, quantity: product.stock } });
  }

  // PC: 70% principal, 30% bodega
  for (const product of pcProducts) {
    const mainQty = Math.floor(product.stock * 0.70);
    const stockQty = product.stock - mainQty;
    if (mainQty > 0) await prisma.warehouseStock.create({ data: { tenantId: tenantPapeleria.id, warehouseId: pcWarehouseMain.id, productId: product.id, quantity: mainQty } });
    if (stockQty > 0) await prisma.warehouseStock.create({ data: { tenantId: tenantPapeleria.id, warehouseId: pcWarehouse2.id, productId: product.id, quantity: stockQty } });
  }

  console.log('   ✅ Stock distribuido en todas las bodegas');

  // ============================================================================
  // STEP 9: Customers (57 total)
  // ============================================================================
  console.log('👤 Creando Clientes...');

  // ── Tienda Demo Customers (25) ──
  const demoCustomersData = [
    { name: 'Carlos Alberto Gómez', email: 'carlos.gomez@email.com', phone: '+57 300 100 0001', documentType: 'CC', documentNumber: '1020304050', address: 'Calle 10 #43-12, El Poblado', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Laura Valentina Ríos', email: 'laura.rios@email.com', phone: '+57 300 100 0002', documentType: 'CC', documentNumber: '1030405060', address: 'Carrera 70 #44-21', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Andrés Felipe Castillo', email: 'andres.castillo@email.com', phone: '+57 300 100 0003', documentType: 'CC', documentNumber: '1040506070', address: 'Av. El Poblado #8A-25', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Juliana Marcela Duarte', email: 'juliana.duarte@email.com', phone: '+57 300 100 0004', documentType: 'CC', documentNumber: '1050607080', address: 'Calle 33 #65-20', city: 'Envigado', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Santiago José Moreno', email: 'santiago.moreno@email.com', phone: '+57 300 100 0005', documentType: 'CC', documentNumber: '1060708090', address: 'Carrera 43A #1S-50', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Valentina Sofía Quintero', email: 'valentina.quintero@email.com', phone: '+57 300 100 0006', documentType: 'CC', documentNumber: '1070809010', address: 'Calle 50 #40-30', city: 'Bello', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Daniel Esteban Herrera', email: 'daniel.herrera@email.com', phone: '+57 300 100 0007', documentType: 'CC', documentNumber: '1080901020', address: 'Av. 80 #32-45', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Camila Andrea Ospina', email: 'camila.ospina@email.com', phone: '+57 300 100 0008', documentType: 'CC', documentNumber: '1090102030', address: 'Calle 7 #42-18', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Sebastián David Muñoz', email: 'sebastian.munoz@email.com', phone: '+57 300 100 0009', documentType: 'CC', documentNumber: '1100203040', address: 'Carrera 48 #10-45', city: 'Itagüí', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Isabella María Torres', email: 'isabella.torres@email.com', phone: '+57 300 100 0010', documentType: 'CC', documentNumber: '1110304050', address: 'Calle 30A #82-10', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Mateo Alejandro Vargas', email: 'mateo.vargas@email.com', phone: '+57 300 100 0011', documentType: 'CC', documentNumber: '1120405060', address: 'Av. Las Palmas #25-60', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Sara Lucía Cardona', email: 'sara.cardona@email.com', phone: '+57 300 100 0012', documentType: 'CC', documentNumber: '1130506070', address: 'Carrera 25 #1A-50', city: 'Envigado', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Nicolás Andrés Mejía', email: 'nicolas.mejia@email.com', phone: '+57 300 100 0013', documentType: 'CC', documentNumber: '1140607080', address: 'Calle 44 #68-12', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Mariana Alejandra Ruiz', email: null, phone: '+57 300 100 0014', documentType: 'CC', documentNumber: '1150708090', address: 'Carrera 80 #34-20', city: 'Medellín', state: 'Antioquia', status: 'INACTIVE' },
    { name: 'Tomás Felipe Salazar', email: null, phone: '+57 300 100 0015', documentType: 'CC', documentNumber: '1160809010', address: 'Calle 52 #43-60', city: 'Bello', state: 'Antioquia', status: 'INACTIVE' },
    // Empresas NIT
    { name: 'Inversiones El Poblado S.A.S', email: 'contacto@invelpoblado.com', phone: '+57 4 444 1111', documentType: 'NIT', documentNumber: '900123456-1', address: 'Calle 10 #40-20 Of 301', city: 'Medellín', state: 'Antioquia', businessName: 'Inversiones El Poblado S.A.S', taxId: '900123456-1', status: 'ACTIVE' },
    { name: 'TechSolutions Colombia', email: 'info@techsolutions.co', phone: '+57 4 444 2222', documentType: 'NIT', documentNumber: '900234567-2', address: 'Carrera 43A #14-109', city: 'Medellín', state: 'Antioquia', businessName: 'TechSolutions Colombia S.A.S', taxId: '900234567-2', status: 'ACTIVE' },
    { name: 'Distribuciones ABC Ltda', email: 'ventas@distabc.com', phone: '+57 4 444 3333', documentType: 'NIT', documentNumber: '900345678-3', address: 'Zona Industrial Guayabal', city: 'Medellín', state: 'Antioquia', businessName: 'Distribuciones ABC Ltda', taxId: '900345678-3', status: 'ACTIVE' },
    { name: 'Hotel Boutique Laureles', email: 'reservas@hotellaureles.com', phone: '+57 4 444 4444', documentType: 'NIT', documentNumber: '900456789-4', address: 'Circular 73A #39-30', city: 'Medellín', state: 'Antioquia', businessName: 'Hotel Boutique Laureles S.A.S', taxId: '900456789-4', status: 'ACTIVE' },
    { name: 'Restaurante Sabor Paisa', email: 'admin@saborpaisa.co', phone: '+57 4 444 5556', documentType: 'NIT', documentNumber: '900567890-5', address: 'Calle 33 #76-20', city: 'Medellín', state: 'Antioquia', businessName: 'Restaurante Sabor Paisa S.A.S', taxId: '900567890-5', status: 'ACTIVE' },
    { name: 'Constructora Antioquia', email: 'proyectos@construant.com', phone: '+57 4 444 6666', documentType: 'NIT', documentNumber: '900678901-6', address: 'Av. El Poblado #12-80', city: 'Medellín', state: 'Antioquia', businessName: 'Constructora Antioquia S.A', taxId: '900678901-6', status: 'ACTIVE' },
    { name: 'Farmacia Vida Sana', email: 'pedidos@vidasana.co', phone: '+57 4 444 7777', documentType: 'NIT', documentNumber: '900789012-7', address: 'Carrera 50 #48-30', city: 'Bello', state: 'Antioquia', businessName: 'Farmacia Vida Sana S.A.S', taxId: '900789012-7', status: 'ACTIVE' },
    { name: 'Colegio Los Andes', email: 'compras@colegiolosandes.edu.co', phone: '+57 4 444 8888', documentType: 'NIT', documentNumber: '900890123-8', address: 'Calle 20 Sur #43-10', city: 'Envigado', state: 'Antioquia', businessName: 'Colegio Los Andes', taxId: '900890123-8', status: 'ACTIVE' },
    // CE y PASSPORT para cobertura de enum
    { name: 'Jean Pierre Dubois', email: 'jpdubois@email.com', phone: '+57 300 100 0016', documentType: 'CE', documentNumber: 'CE-123456', address: 'Calle 9 #43A-28', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Emily Johnson', email: 'emily.j@email.com', phone: '+57 300 100 0017', documentType: 'PASSPORT', documentNumber: 'US-987654321', address: 'El Poblado, Loma Los Balsos', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
  ];

  const demoCustomers: CustomerRecord[] = [];
  for (const c of demoCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: tenantDemo.id, name: c.name, email: c.email, phone: c.phone,
        documentType: c.documentType as any, documentNumber: c.documentNumber,
        address: c.address, city: c.city, state: c.state,
        businessName: (c as any).businessName || null, taxId: (c as any).taxId || null,
        status: c.status as any,
      },
    });
    demoCustomers.push({ id: created.id, name: created.name, status: c.status });
  }

  // ── Distribuidora Nacional Customers (15) ──
  const dnCustomersData = [
    { name: 'Supermercado La Economía', email: 'compras@laeconomia.co', phone: '+57 1 300 0001', documentType: 'NIT', documentNumber: '800100200-1', address: 'Cra 7 #45-20', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Supermercado La Economía S.A.S', taxId: '800100200-1', status: 'ACTIVE' },
    { name: 'Tienda Don José', email: 'donjose@email.com', phone: '+57 1 300 0002', documentType: 'CC', documentNumber: '79800100', address: 'Calle 68 #15-30', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' },
    { name: 'Minimercado El Vecino', email: 'elvecino@email.com', phone: '+57 1 300 0003', documentType: 'NIT', documentNumber: '800200300-2', address: 'Av. Boyacá #72-18', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Minimercado El Vecino Ltda', taxId: '800200300-2', status: 'ACTIVE' },
    { name: 'Droguería Farma Plus', email: 'pedidos@farmaplus.co', phone: '+57 1 300 0004', documentType: 'NIT', documentNumber: '800300400-3', address: 'Carrera 13 #60-50', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Droguería Farma Plus S.A.S', taxId: '800300400-3', status: 'ACTIVE' },
    { name: 'Restaurante El Sazón', email: 'compras@elsazon.co', phone: '+57 1 300 0005', documentType: 'NIT', documentNumber: '800400500-4', address: 'Calle 85 #11-53', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Restaurante El Sazón S.A.S', taxId: '800400500-4', status: 'ACTIVE' },
    { name: 'Panadería Pan de Vida', email: 'pandevida@email.com', phone: '+57 1 300 0006', documentType: 'NIT', documentNumber: '800500600-5', address: 'Av. Suba #115-20', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Panadería Pan de Vida S.A.S', taxId: '800500600-5', status: 'ACTIVE' },
    { name: 'Hotel Capital Plaza', email: 'suministros@capitalplaza.co', phone: '+57 1 300 0007', documentType: 'NIT', documentNumber: '800600700-6', address: 'Calle 26 #69-76', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Hotel Capital Plaza S.A', taxId: '800600700-6', status: 'ACTIVE' },
    { name: 'Cafetería Aroma', email: 'aroma@email.com', phone: '+57 1 300 0008', documentType: 'CC', documentNumber: '79900200', address: 'Carrera 11 #93-40', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' },
    { name: 'Colegio Nueva Granada', email: 'compras@nuevagranada.edu.co', phone: '+57 1 300 0009', documentType: 'NIT', documentNumber: '800700800-7', address: 'Calle 200 #70-30', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Colegio Nueva Granada', taxId: '800700800-7', status: 'ACTIVE' },
    { name: 'Tienda Naturista Vida', email: 'vida.naturista@email.com', phone: '+57 1 300 0010', documentType: 'CC', documentNumber: '52100300', address: 'Calle 53 #13-40', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' },
    { name: 'Distribuidora El Sol', email: 'pedidos@distsol.co', phone: '+57 1 300 0011', documentType: 'NIT', documentNumber: '800800900-8', address: 'Av. 68 #17-50', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Distribuidora El Sol S.A.S', taxId: '800800900-8', status: 'ACTIVE' },
    { name: 'Casino Las Américas', email: 'casino@lasamericas.co', phone: '+57 1 300 0012', documentType: 'NIT', documentNumber: '800901000-9', address: 'Cra 59A #26-20', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Casino Las Américas S.A.S', taxId: '800901000-9', status: 'ACTIVE' },
    { name: 'María Elena Pardo', email: 'mepardo@email.com', phone: '+57 1 300 0013', documentType: 'CC', documentNumber: '52200400', address: 'Carrera 9 #74-08', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' },
    { name: 'Club Deportivo Norte', email: 'suministros@clubnorte.co', phone: '+57 1 300 0014', documentType: 'NIT', documentNumber: '801000100-0', address: 'Autopista Norte Km 7', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Club Deportivo Norte', taxId: '801000100-0', status: 'ACTIVE' },
    { name: 'Ferretería El Maestro', email: 'elmaestro@email.com', phone: '+57 1 300 0015', documentType: 'NIT', documentNumber: '801100200-1', address: 'Calle 13 #32-45', city: 'Bogotá', state: 'Cundinamarca', businessName: 'Ferretería El Maestro Ltda', taxId: '801100200-1', status: 'ACTIVE' },
  ];

  const dnCustomers: CustomerRecord[] = [];
  for (const c of dnCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: tenantDistribuidora.id, name: c.name, email: c.email, phone: c.phone,
        documentType: c.documentType as any, documentNumber: c.documentNumber,
        address: c.address, city: c.city, state: c.state,
        businessName: (c as any).businessName || null, taxId: (c as any).taxId || null,
        status: c.status as any,
      },
    });
    dnCustomers.push({ id: created.id, name: created.name, status: c.status });
  }

  // ── Nuevo Negocio Customers (5) ──
  const nnCustomersData = [
    { name: 'Daniela Monsalve', email: 'daniela.m@email.com', phone: '+57 311 600 0001', documentType: 'CC', documentNumber: '1040200300', address: 'Calle 45 #79-10', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Juan Esteban Arango', email: 'juane.arango@email.com', phone: '+57 311 600 0002', documentType: 'CC', documentNumber: '1050300400', address: 'Carrera 65 #48-20', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Paulina Restrepo', email: 'paulina.r@email.com', phone: '+57 311 600 0003', documentType: 'CC', documentNumber: '1060400500', address: 'Av. Nutibara #10-30', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Felipe Zuluaga', email: 'felipe.z@email.com', phone: '+57 311 600 0004', documentType: 'CC', documentNumber: '1070500600', address: 'Calle 30 #43-55', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Manuela Botero', email: 'manuela.b@email.com', phone: '+57 311 600 0005', documentType: 'CC', documentNumber: '1080600700', address: 'Carrera 70 #30-15', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
  ];

  const nnCustomers: CustomerRecord[] = [];
  for (const c of nnCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: tenantNuevo.id, name: c.name, email: c.email, phone: c.phone,
        documentType: c.documentType as any, documentNumber: c.documentNumber,
        address: c.address, city: c.city, state: c.state, status: c.status as any,
      },
    });
    nnCustomers.push({ id: created.id, name: created.name, status: c.status });
  }

  // ── Papelería Central Customers (12) ──
  const pcCustomersData = [
    { name: 'Ana María Velásquez', email: 'ana.velasquez@email.com', phone: '+57 4 500 0001', documentType: 'CC', documentNumber: '1090100200', address: 'Calle 10 #30-15', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Diego Armando Patiño', email: 'diego.patino@email.com', phone: '+57 4 500 0002', documentType: 'CC', documentNumber: '1100200300', address: 'Carrera 52 #49-20', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Colegio San José', email: 'compras@colegiosanjose.edu.co', phone: '+57 4 500 0003', documentType: 'NIT', documentNumber: '811100200-1', address: 'Calle 45 #65-30', city: 'Medellín', state: 'Antioquia', businessName: 'Colegio San José', taxId: '811100200-1', status: 'ACTIVE' },
    { name: 'Oficinas Creativas S.A.S', email: 'admin@oficinascreativas.co', phone: '+57 4 500 0004', documentType: 'NIT', documentNumber: '811200300-2', address: 'Av. El Poblado #7-40', city: 'Medellín', state: 'Antioquia', businessName: 'Oficinas Creativas S.A.S', taxId: '811200300-2', status: 'ACTIVE' },
    { name: 'Paula Andrea Giraldo', email: 'paula.giraldo@email.com', phone: '+57 4 500 0005', documentType: 'CC', documentNumber: '1110300400', address: 'Carrera 43 #30-25', city: 'Envigado', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Instituto Técnico Industrial', email: 'compras@iti.edu.co', phone: '+57 4 500 0006', documentType: 'NIT', documentNumber: '811300400-3', address: 'Calle 80 #55-20', city: 'Medellín', state: 'Antioquia', businessName: 'Instituto Técnico Industrial', taxId: '811300400-3', status: 'ACTIVE' },
    { name: 'Roberto Carlos Ossa', email: 'roberto.ossa@email.com', phone: '+57 4 500 0007', documentType: 'CC', documentNumber: '1120400500', address: 'Calle 33 #78-10', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Librería El Saber', email: 'libreria@elsaber.co', phone: '+57 4 500 0008', documentType: 'NIT', documentNumber: '811400500-4', address: 'Carrera 49 #52-30', city: 'Medellín', state: 'Antioquia', businessName: 'Librería El Saber Ltda', taxId: '811400500-4', status: 'ACTIVE' },
    { name: 'Lucía Fernanda Castro', email: 'lucia.castro@email.com', phone: '+57 4 500 0009', documentType: 'CC', documentNumber: '1130500600', address: 'Av. 80 #24-30', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Empresa de Diseño Gráfico', email: 'contacto@diseno.co', phone: '+57 4 500 0010', documentType: 'NIT', documentNumber: '811500600-5', address: 'Calle 7 #43-28', city: 'Medellín', state: 'Antioquia', businessName: 'Diseño Gráfico S.A.S', taxId: '811500600-5', status: 'ACTIVE' },
    { name: 'Jorge Iván Montoya', email: 'jorge.montoya@email.com', phone: '+57 4 500 0011', documentType: 'CC', documentNumber: '1140600700', address: 'Carrera 70 #48-15', city: 'Bello', state: 'Antioquia', status: 'ACTIVE' },
    { name: 'Jardín Infantil Arcoíris', email: 'jardin@arcoiris.edu.co', phone: '+57 4 500 0012', documentType: 'NIT', documentNumber: '811600700-6', address: 'Calle 50 #80-10', city: 'Medellín', state: 'Antioquia', businessName: 'Jardín Infantil Arcoíris', taxId: '811600700-6', status: 'ACTIVE' },
  ];

  const pcCustomers: CustomerRecord[] = [];
  for (const c of pcCustomersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: tenantPapeleria.id, name: c.name, email: c.email, phone: c.phone,
        documentType: c.documentType as any, documentNumber: c.documentNumber,
        address: c.address, city: c.city, state: c.state,
        businessName: (c as any).businessName || null, taxId: (c as any).taxId || null,
        status: c.status as any,
      },
    });
    pcCustomers.push({ id: created.id, name: created.name, status: c.status });
  }

  console.log(`   ✅ ${demoCustomers.length + dnCustomers.length + nnCustomers.length + pcCustomers.length} Clientes creados`);

  // ============================================================================
  // STEP 10: Invoice Helper + Invoices (108 total)
  // ============================================================================
  console.log('🧾 Creando Facturas...');

  async function createTenantInvoice(config: {
    tenantId: string; products: ProductRecord[]; customers: CustomerRecord[];
    status: string; paymentStatus: string;
    daysAgoIssued: number; daysUntilDue?: number; userId: string; warehouseId: string;
    source?: string; invoicePrefix: string; counterRef: { value: number };
  }): Promise<InvoiceRecord> {
    const numItems = randomInt(1, 4);
    const selected: ProductRecord[] = [];
    const used = new Set<number>();
    for (let i = 0; i < numItems && i < config.products.length; i++) {
      let idx: number;
      do { idx = randomInt(0, config.products.length - 1); } while (used.has(idx));
      used.add(idx); selected.push(config.products[idx]);
    }
    const items = selected.map(p => {
      const quantity = randomInt(1, 5);
      const subtotal = quantity * p.salePrice;
      const tax = Math.round(subtotal * p.taxRate / 100);
      return { productId: p.id, quantity, unitPrice: p.salePrice, taxRate: p.taxRate, subtotal, tax, total: subtotal + tax };
    });
    const invSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const invTax = items.reduce((s, i) => s + i.tax, 0);
    const invTotal = invSubtotal + invTax;
    const activeCustomers = config.customers.filter(c => c.status === 'ACTIVE');
    const customer = pickRandom(activeCustomers.length > 0 ? activeCustomers : config.customers);
    const issueDate = daysAgo(config.daysAgoIssued);
    const dueDate = config.daysUntilDue !== undefined
      ? new Date(issueDate.getTime() + config.daysUntilDue * 24 * 60 * 60 * 1000)
      : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    config.counterRef.value += 1;
    const invoiceNumber = `${config.invoicePrefix}-${String(config.counterRef.value).padStart(5, '0')}`;
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: config.tenantId, customerId: customer.id, userId: config.userId,
        invoiceNumber, source: (config.source || 'MANUAL') as any,
        subtotal: invSubtotal, tax: invTax, discount: 0, total: invTotal,
        issueDate, dueDate, status: config.status as any, paymentStatus: config.paymentStatus as any,
        warehouseId: config.warehouseId,
        notes: config.status === 'VOID' ? 'Factura anulada por error en datos' : null,
        items: { create: items.map(it => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice, taxRate: it.taxRate, discount: 0, subtotal: it.subtotal, tax: it.tax, total: it.total })) },
      },
    });
    return { id: invoice.id, invoiceNumber, paymentStatus: config.paymentStatus, total: invTotal, items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })) };
  }

  // ── Demo Invoices (~55) ──
  const demoInvCounter = { value: 0 };
  const demoInvoices: InvoiceRecord[] = [];
  const demoInvCfgs: { status: string; paymentStatus: string; count: number; daysRange: [number, number]; source?: string }[] = [
    { status: 'SENT', paymentStatus: 'PAID', count: 18, daysRange: [5, 90] },
    { status: 'PENDING', paymentStatus: 'UNPAID', count: 10, daysRange: [1, 15] },
    { status: 'SENT', paymentStatus: 'UNPAID', count: 8, daysRange: [3, 20] },
    { status: 'SENT', paymentStatus: 'PARTIALLY_PAID', count: 5, daysRange: [5, 30] },
    { status: 'OVERDUE', paymentStatus: 'UNPAID', count: 4, daysRange: [35, 60] },
    { status: 'OVERDUE', paymentStatus: 'PARTIALLY_PAID', count: 2, daysRange: [40, 55] },
    { status: 'DRAFT', paymentStatus: 'UNPAID', count: 3, daysRange: [0, 3] },
    { status: 'CANCELLED', paymentStatus: 'UNPAID', count: 3, daysRange: [10, 30] },
    { status: 'VOID', paymentStatus: 'UNPAID', count: 2, daysRange: [15, 40] },
  ];
  for (const cfg of demoInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice({
        tenantId: tenantDemo.id, products: demoProducts, customers: demoCustomers,
        status: cfg.status, paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        daysUntilDue: cfg.status === 'OVERDUE' ? -randomInt(1, 15) : 30,
        userId: pickRandom(demoActiveUsers).id, warehouseId: pickRandom(demoActiveWarehouses).id,
        source: cfg.source || 'MANUAL', invoicePrefix: 'TD', counterRef: demoInvCounter,
      });
      demoInvoices.push(inv);
    }
  }

  // ── DN Invoices (25) ──
  const dnInvCounter = { value: 0 };
  const dnInvoices: InvoiceRecord[] = [];
  const dnInvUsers = [dnAdmin, dnManager, dnEmployee1, dnEmployee2];
  const dnInvCfgs = [
    { status: 'SENT', paymentStatus: 'PAID', count: 10, daysRange: [5, 60] as [number, number] },
    { status: 'PENDING', paymentStatus: 'UNPAID', count: 5, daysRange: [1, 10] as [number, number] },
    { status: 'SENT', paymentStatus: 'UNPAID', count: 3, daysRange: [3, 15] as [number, number] },
    { status: 'SENT', paymentStatus: 'PARTIALLY_PAID', count: 2, daysRange: [5, 20] as [number, number] },
    { status: 'OVERDUE', paymentStatus: 'UNPAID', count: 2, daysRange: [35, 50] as [number, number] },
    { status: 'DRAFT', paymentStatus: 'UNPAID', count: 2, daysRange: [0, 2] as [number, number] },
    { status: 'CANCELLED', paymentStatus: 'UNPAID', count: 1, daysRange: [10, 20] as [number, number] },
  ];
  for (const cfg of dnInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice({
        tenantId: tenantDistribuidora.id, products: dnProducts, customers: dnCustomers,
        status: cfg.status, paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        daysUntilDue: cfg.status === 'OVERDUE' ? -randomInt(1, 10) : 30,
        userId: pickRandom(dnInvUsers).id, warehouseId: pickRandom(dnActiveWarehouses).id,
        invoicePrefix: 'DN', counterRef: dnInvCounter,
      });
      dnInvoices.push(inv);
    }
  }

  // ── NN Invoices (8) ──
  const nnInvCounter = { value: 0 };
  const nnInvoices: InvoiceRecord[] = [];
  const nnInvCfgs = [
    { status: 'SENT', paymentStatus: 'PAID', count: 3, daysRange: [3, 20] as [number, number] },
    { status: 'PENDING', paymentStatus: 'UNPAID', count: 2, daysRange: [0, 5] as [number, number] },
    { status: 'SENT', paymentStatus: 'UNPAID', count: 2, daysRange: [2, 10] as [number, number] },
    { status: 'DRAFT', paymentStatus: 'UNPAID', count: 1, daysRange: [0, 1] as [number, number] },
  ];
  for (const cfg of nnInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice({
        tenantId: tenantNuevo.id, products: nnProducts, customers: nnCustomers,
        status: cfg.status, paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        userId: nnAdmin.id, warehouseId: nnWarehouse.id,
        invoicePrefix: 'NN', counterRef: nnInvCounter,
      });
      nnInvoices.push(inv);
    }
  }

  // ── PC Invoices (20) ──
  const pcInvCounter = { value: 0 };
  const pcInvoices: InvoiceRecord[] = [];
  const pcInvUsers = [pcAdmin, pcManager, pcEmployee1, pcEmployee2];
  const pcInvCfgs = [
    { status: 'SENT', paymentStatus: 'PAID', count: 8, daysRange: [3, 45] as [number, number] },
    { status: 'PENDING', paymentStatus: 'UNPAID', count: 4, daysRange: [0, 8] as [number, number] },
    { status: 'SENT', paymentStatus: 'UNPAID', count: 3, daysRange: [2, 12] as [number, number] },
    { status: 'SENT', paymentStatus: 'PARTIALLY_PAID', count: 2, daysRange: [5, 15] as [number, number] },
    { status: 'OVERDUE', paymentStatus: 'UNPAID', count: 1, daysRange: [32, 45] as [number, number] },
    { status: 'DRAFT', paymentStatus: 'UNPAID', count: 1, daysRange: [0, 1] as [number, number] },
    { status: 'CANCELLED', paymentStatus: 'UNPAID', count: 1, daysRange: [8, 15] as [number, number] },
  ];
  for (const cfg of pcInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice({
        tenantId: tenantPapeleria.id, products: pcProducts, customers: pcCustomers,
        status: cfg.status, paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        daysUntilDue: cfg.status === 'OVERDUE' ? -randomInt(1, 10) : 30,
        userId: pickRandom(pcInvUsers).id, warehouseId: pickRandom(pcActiveWarehouses).id,
        invoicePrefix: 'PC', counterRef: pcInvCounter,
      });
      pcInvoices.push(inv);
    }
  }

  console.log(`   ✅ ${demoInvoices.length + dnInvoices.length + nnInvoices.length + pcInvoices.length} Facturas creadas`);

  // ============================================================================
  // STEP 11: Payments (123+ total)
  // ============================================================================
  console.log('💰 Creando Pagos...');

  const allPaymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PSE', 'NEQUI', 'DAVIPLATA', 'OTHER'];
  let paymentCount = 0;

  async function createPaymentsForInvoices(tenantId: string, invoices: InvoiceRecord[], userId: string) {
    for (const inv of invoices) {
      if (inv.paymentStatus === 'PAID') {
        const method = allPaymentMethods[paymentCount % allPaymentMethods.length];
        await prisma.payment.create({
          data: {
            tenantId, invoiceId: inv.id, amount: inv.total, method: method as any,
            reference: method === 'BANK_TRANSFER' ? `TRF-${randomInt(100000, 999999)}` : method === 'PSE' ? `PSE-${randomInt(100000, 999999)}` : null,
            notes: method === 'OTHER' ? 'Pago en especie / trueque' : null,
            paymentDate: daysAgo(randomInt(1, 30)),
          },
        });
        paymentCount++;
      } else if (inv.paymentStatus === 'PARTIALLY_PAID') {
        const partialAmount = Math.round(inv.total * (randomInt(30, 70) / 100));
        const method = allPaymentMethods[paymentCount % allPaymentMethods.length];
        await prisma.payment.create({
          data: {
            tenantId, invoiceId: inv.id, amount: partialAmount, method: method as any,
            reference: null, paymentDate: daysAgo(randomInt(5, 25)),
          },
        });
        paymentCount++;
      }
    }
  }

  await createPaymentsForInvoices(tenantDemo.id, demoInvoices, adminDemo.id);
  await createPaymentsForInvoices(tenantDistribuidora.id, dnInvoices, dnAdmin.id);
  await createPaymentsForInvoices(tenantNuevo.id, nnInvoices, nnAdmin.id);
  await createPaymentsForInvoices(tenantPapeleria.id, pcInvoices, pcAdmin.id);

  console.log(`   ✅ ${paymentCount} Pagos creados (todos los PaymentMethod cubiertos)`);

  // ============================================================================
  // STEP 12: Stock Movements (230+ total)
  // ============================================================================
  console.log('📦 Creando Movimientos de Stock...');

  let movementCount = 0;
  const movementTypes = ['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGED'];

  async function createStockMovements(tenantId: string, products: ProductRecord[], warehouses: { id: string }[], userId: string, count: number) {
    for (let i = 0; i < count; i++) {
      const product = pickRandom(products);
      const warehouse = pickRandom(warehouses);
      const type = movementTypes[i % movementTypes.length];
      const quantity = type === 'DAMAGED' ? -randomInt(1, 3) : type === 'SALE' ? -randomInt(1, 10) : type === 'RETURN' ? randomInt(1, 5) : type === 'ADJUSTMENT' ? (Math.random() > 0.5 ? randomInt(1, 10) : -randomInt(1, 5)) : randomInt(5, 50);

      if (type === 'TRANSFER' && warehouses.length > 1) {
        const fromWh = warehouse;
        const toWh = warehouses.find(w => w.id !== fromWh.id) || warehouses[0];
        const transferQty = randomInt(2, 15);
        await prisma.stockMovement.create({
          data: { tenantId, productId: product.id, warehouseId: fromWh.id, type: 'TRANSFER' as any, quantity: -transferQty, reason: `Transferencia salida`, notes: `Transfer to ${toWh.id.slice(0, 8)}`, userId, createdAt: daysAgo(randomInt(1, 60)) },
        });
        await prisma.stockMovement.create({
          data: { tenantId, productId: product.id, warehouseId: toWh.id, type: 'TRANSFER' as any, quantity: transferQty, reason: `Transferencia entrada`, notes: `Transfer from ${fromWh.id.slice(0, 8)}`, userId, createdAt: daysAgo(randomInt(1, 60)) },
        });
        movementCount += 2;
      } else {
        await prisma.stockMovement.create({
          data: { tenantId, productId: product.id, warehouseId: warehouse.id, type: (type === 'TRANSFER' ? 'ADJUSTMENT' : type) as any, quantity, reason: type === 'DAMAGED' ? 'Producto dañado en transporte' : type === 'RETURN' ? 'Devolución de cliente' : `${type} regular`, userId, createdAt: daysAgo(randomInt(1, 90)) },
        });
        movementCount++;
      }
    }
  }

  await createStockMovements(tenantDemo.id, demoProducts, demoActiveWarehouses, adminDemo.id, 130);
  await createStockMovements(tenantDistribuidora.id, dnProducts, dnActiveWarehouses, dnAdmin.id, 50);
  await createStockMovements(tenantNuevo.id, nnProducts, [nnWarehouse], nnAdmin.id, 15);
  await createStockMovements(tenantPapeleria.id, pcProducts, pcActiveWarehouses, pcAdmin.id, 35);

  console.log(`   ✅ ${movementCount} Movimientos de stock creados`);

  // ============================================================================
  // STEP 13: Notifications (77+ total — ALL 16 types, ALL 4 priorities)
  // ============================================================================
  console.log('🔔 Creando Notificaciones...');

  const notificationTypes = [
    'LOW_STOCK', 'OUT_OF_STOCK', 'NEW_INVOICE', 'INVOICE_PAID', 'INVOICE_OVERDUE',
    'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'NEW_CUSTOMER', 'REPORT_READY', 'SYSTEM',
    'INFO', 'USER_VERIFIED_EMAIL', 'USER_APPROVED', 'SUBSCRIPTION_EXPIRING',
    'SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_ACTIVATED',
  ];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  const notifTemplates: Record<string, { title: string; message: string }> = {
    LOW_STOCK: { title: 'Stock bajo', message: 'El producto tiene stock por debajo del mínimo' },
    OUT_OF_STOCK: { title: 'Sin stock', message: 'Producto agotado en bodega principal' },
    NEW_INVOICE: { title: 'Nueva factura', message: 'Se ha creado una nueva factura' },
    INVOICE_PAID: { title: 'Factura pagada', message: 'Se registró un pago completo' },
    INVOICE_OVERDUE: { title: 'Factura vencida', message: 'La factura ha superado su fecha de vencimiento' },
    PAYMENT_RECEIVED: { title: 'Pago recibido', message: 'Se recibió un nuevo pago' },
    PAYMENT_FAILED: { title: 'Pago fallido', message: 'El intento de pago no fue procesado' },
    NEW_CUSTOMER: { title: 'Nuevo cliente', message: 'Se registró un nuevo cliente' },
    REPORT_READY: { title: 'Reporte listo', message: 'El reporte solicitado está disponible' },
    SYSTEM: { title: 'Mantenimiento programado', message: 'Mantenimiento del sistema este fin de semana' },
    INFO: { title: 'Información', message: 'Actualización de funcionalidades disponible' },
    USER_VERIFIED_EMAIL: { title: 'Email verificado', message: 'El usuario ha verificado su correo' },
    USER_APPROVED: { title: 'Usuario aprobado', message: 'Se ha aprobado el acceso del nuevo usuario' },
    SUBSCRIPTION_EXPIRING: { title: 'Suscripción por vencer', message: 'Su suscripción vence en 5 días' },
    SUBSCRIPTION_EXPIRED: { title: 'Suscripción expirada', message: 'Su suscripción ha expirado' },
    SUBSCRIPTION_ACTIVATED: { title: 'Suscripción activada', message: 'Su plan ha sido activado exitosamente' },
  };

  let notifCount = 0;

  async function createNotifications(tenantId: string, userId: string, count: number) {
    for (let i = 0; i < count; i++) {
      const type = notificationTypes[i % notificationTypes.length];
      const priority = priorities[i % priorities.length];
      const tmpl = notifTemplates[type];
      await prisma.notification.create({
        data: {
          tenantId, userId, type: type as any, priority: priority as any,
          title: tmpl.title, message: tmpl.message,
          read: i < count / 2, createdAt: daysAgo(randomInt(0, 30)),
        },
      });
      notifCount++;
    }
  }

  await createNotifications(tenantDemo.id, adminDemo.id, 45);
  await createNotifications(tenantDistribuidora.id, dnAdmin.id, 15);
  await createNotifications(tenantNuevo.id, nnAdmin.id, 5);
  await createNotifications(tenantPapeleria.id, pcAdmin.id, 12);

  console.log(`   ✅ ${notifCount} Notificaciones creadas (16 tipos, 4 prioridades)`);

  // ============================================================================
  // STEP 14: Audit Logs (52 total)
  // ============================================================================
  console.log('📋 Creando Audit Logs...');

  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'];
  const auditEntities = ['Product', 'Invoice', 'Customer', 'User', 'Warehouse', 'Payment'];
  let auditCount = 0;

  async function createAuditLogs(tenantId: string, users: { id: string }[], count: number) {
    for (let i = 0; i < count; i++) {
      const action = auditActions[i % auditActions.length];
      const entity = auditEntities[i % auditEntities.length];
      await prisma.auditLog.create({
        data: {
          tenantId, userId: pickRandom(users).id, action: action as any,
          entityType: entity, entityId: `entity-${randomInt(1000, 9999)}`,
          newValues: action === 'IMPORT' ? { fileName: 'productos_bulk.csv', totalRows: 150, imported: 148, failed: 2 } as any : { description: `${action} en ${entity}` } as any,
          ipAddress: `192.168.1.${randomInt(1, 254)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          createdAt: daysAgo(randomInt(0, 60)),
        },
      });
      auditCount++;
    }
  }

  await createAuditLogs(tenantDemo.id, demoActiveUsers, 25);
  await createAuditLogs(tenantDistribuidora.id, dnInvUsers, 12);
  await createAuditLogs(tenantNuevo.id, [nnAdmin], 5);
  await createAuditLogs(tenantPapeleria.id, pcInvUsers, 10);

  console.log(`   ✅ ${auditCount} Audit Logs creados (incluye IMPORT)`);

  // ============================================================================
  // STEP 15: System Admin Audit Logs (15)
  // ============================================================================
  console.log('🛡️ Creando System Admin Audit Logs...');

  const sysAdminActions = [
    { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Tienda Demo' } },
    { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Distribuidora Nacional' } },
    { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Nuevo Negocio' } },
    { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Papelería Central' } },
    { adminId: superAdmin.id, action: 'UPDATE_PLAN', entity: 'Tenant', details: { tenant: 'Tienda Demo', from: 'PYME', to: 'PRO' } },
    { adminId: superAdmin.id, action: 'UPDATE_PLAN', entity: 'Tenant', details: { tenant: 'Distribuidora Nacional', from: 'PRO', to: 'PLUS' } },
    { adminId: supportAdmin.id, action: 'VIEW_TENANT', entity: 'Tenant', details: { tenant: 'Nuevo Negocio', reason: 'Soporte técnico' } },
    { adminId: supportAdmin.id, action: 'VIEW_TENANT', entity: 'Tenant', details: { tenant: 'Tienda Demo', reason: 'Revisión de facturación' } },
    { adminId: supportAdmin.id, action: 'RESET_PASSWORD', entity: 'User', details: { userEmail: 'admin@tienda-demo.com' } },
    { adminId: billingAdmin.id, action: 'VIEW_SUBSCRIPTION', entity: 'Subscription', details: { tenant: 'Tienda Demo' } },
    { adminId: billingAdmin.id, action: 'VIEW_SUBSCRIPTION', entity: 'Subscription', details: { tenant: 'Distribuidora Nacional' } },
    { adminId: billingAdmin.id, action: 'PROCESS_PAYMENT', entity: 'Subscription', details: { tenant: 'Papelería Central', amount: 299000 } },
    { adminId: superAdmin.id, action: 'SUSPEND_TENANT', entity: 'Tenant', details: { tenant: 'Test Tenant', reason: 'Impago' } },
    { adminId: superAdmin.id, action: 'REACTIVATE_TENANT', entity: 'Tenant', details: { tenant: 'Test Tenant' } },
    { adminId: superAdmin.id, action: 'SYSTEM_CONFIG', entity: 'System', details: { setting: 'maintenance_mode', value: false } },
  ];

  for (let i = 0; i < sysAdminActions.length; i++) {
    const a = sysAdminActions[i];
    await prisma.systemAdminAuditLog.create({
      data: {
        adminId: a.adminId, action: a.action, entityType: a.entity,
        entityId: `sys-${randomInt(1000, 9999)}`,
        details: a.details as any,
        createdAt: daysAgo(randomInt(0, 90)),
      },
    });
  }

  console.log(`   ✅ ${sysAdminActions.length} System Admin Audit Logs creados`);

  // ============================================================================
  // STEP 16: Invitations (13 total)
  // ============================================================================
  console.log('📨 Creando Invitaciones...');

  const invitationsData = [
    // Demo (7)
    { tenantId: tenantDemo.id, email: 'nuevo.empleado1@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: adminDemo.id },
    { tenantId: tenantDemo.id, email: 'nuevo.empleado2@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: adminDemo.id },
    { tenantId: tenantDemo.id, email: 'gerente.nuevo@email.com', role: 'MANAGER', status: 'PENDING', invitedById: adminDemo.id },
    { tenantId: tenantDemo.id, email: 'aceptado1@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: adminDemo.id },
    { tenantId: tenantDemo.id, email: 'aceptado2@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: managerDemo.id },
    { tenantId: tenantDemo.id, email: 'expirado@email.com', role: 'EMPLOYEE', status: 'EXPIRED', invitedById: adminDemo.id },
    { tenantId: tenantDemo.id, email: 'cancelado@email.com', role: 'MANAGER', status: 'CANCELLED', invitedById: adminDemo.id },
    // DN (3)
    { tenantId: tenantDistribuidora.id, email: 'nuevo.dn1@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: dnAdmin.id },
    { tenantId: tenantDistribuidora.id, email: 'aceptado.dn@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: dnAdmin.id },
    { tenantId: tenantDistribuidora.id, email: 'expirado.dn@email.com', role: 'MANAGER', status: 'EXPIRED', invitedById: dnAdmin.id },
    // NN (1)
    { tenantId: tenantNuevo.id, email: 'invitado.nn@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: nnAdmin.id },
    // PC (2)
    { tenantId: tenantPapeleria.id, email: 'nuevo.pc@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: pcAdmin.id },
    { tenantId: tenantPapeleria.id, email: 'aceptado.pc@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: pcAdmin.id },
  ];

  for (const inv of invitationsData) {
    const expiresAt = inv.status === 'EXPIRED' ? daysAgo(5) : daysFromNow(7);
    await prisma.invitation.create({
      data: {
        tenantId: inv.tenantId, email: inv.email, role: inv.role as any,
        status: inv.status as any, invitedById: inv.invitedById,
        token: `inv-token-${randomInt(100000, 999999)}`,
        expiresAt, createdAt: daysAgo(randomInt(1, 30)),
      },
    });
  }

  console.log(`   ✅ ${invitationsData.length} Invitaciones creadas`);

  // ============================================================================
  // STEP 17: DIAN Config + Documents
  // ============================================================================
  console.log('📄 Creando DIAN Config y Documentos...');

  // DIAN Config (3 tenants — not NN)
  const dianTenants = [
    { tenantId: tenantDemo.id, nit: '900999888', dv: '1', businessName: 'Tienda Demo S.A.S', economicActivity: '4791', address: 'Calle 10 #43-12', city: 'Medellín', cityCode: '05001', department: 'Antioquia', departmentCode: '05', email: 'admin@tienda-demo.com', resolutionNumber: 'DIAN-18764005678901', resolutionDate: daysAgo(365), resolutionPrefix: 'SETP', rangeFrom: 1, rangeTo: 5000, testMode: false },
    { tenantId: tenantDistribuidora.id, nit: '800888777', dv: '2', businessName: 'Distribuidora Nacional S.A.S', economicActivity: '4631', address: 'Cra 7 #45-20', city: 'Bogotá', cityCode: '11001', department: 'Cundinamarca', departmentCode: '11', email: 'admin@distribuidoranacional.com', resolutionNumber: 'DIAN-18764005678902', resolutionDate: daysAgo(200), resolutionPrefix: 'DIST', rangeFrom: 1, rangeTo: 10000, testMode: false },
    { tenantId: tenantPapeleria.id, nit: '811777666', dv: '3', businessName: 'Papelería Central S.A.S', economicActivity: '4761', address: 'Calle 50 #80-10', city: 'Medellín', cityCode: '05001', department: 'Antioquia', departmentCode: '05', email: 'admin@papeleriacentral.com', resolutionNumber: 'DIAN-18764005678903', resolutionDate: daysAgo(100), resolutionPrefix: 'PAPC', rangeFrom: 1, rangeTo: 3000, testMode: true },
  ];

  const dianConfigs: { id: string; tenantId: string }[] = [];
  for (const d of dianTenants) {
    const config = await prisma.tenantDianConfig.create({
      data: {
        tenantId: d.tenantId, nit: d.nit, dv: d.dv, businessName: d.businessName,
        taxResponsibilities: ['O_47', 'R_99_PN'] as any,
        economicActivity: d.economicActivity,
        address: d.address, city: d.city, cityCode: d.cityCode,
        department: d.department, departmentCode: d.departmentCode,
        email: d.email,
        resolutionNumber: d.resolutionNumber, resolutionDate: d.resolutionDate,
        resolutionPrefix: d.resolutionPrefix, resolutionRangeFrom: d.rangeFrom, resolutionRangeTo: d.rangeTo,
        technicalKey: `tech-key-${randomInt(100000, 999999)}`,
        softwareId: `software-${randomInt(1000, 9999)}`, softwarePin: `pin-${randomInt(100000, 999999)}`,
        certificatePassword: 'cert-password-encrypted', testMode: d.testMode,
      },
    });
    dianConfigs.push({ id: config.id, tenantId: d.tenantId });
  }

  // DIAN Documents (17 total)
  const dianDocTypes = ['FACTURA_ELECTRONICA', 'NOTA_CREDITO', 'NOTA_DEBITO'];
  const dianDocStatuses = ['PENDING', 'GENERATED', 'SIGNED', 'SENT', 'ACCEPTED', 'REJECTED', 'ERROR'];
  let dianDocCount = 0;

  for (const dc of dianConfigs) {
    const numDocs = dc.tenantId === tenantDemo.id ? 8 : dc.tenantId === tenantDistribuidora.id ? 5 : 4;
    for (let i = 0; i < numDocs; i++) {
      const docType = dianDocTypes[i % dianDocTypes.length];
      const docStatus = dianDocStatuses[i % dianDocStatuses.length];
      await prisma.dianDocument.create({
        data: {
          tenantId: dc.tenantId,
          documentType: docType as any, documentNumber: `DIAN-DOC-${dianDocCount + 1}`,
          cufe: `cufe-${randomInt(100000000, 999999999)}`,
          status: docStatus as any,
          xmlContent: `<xml>DIAN Document ${dianDocCount + 1}</xml>`,
          signedXml: docStatus !== 'PENDING' ? `<signed-xml>Doc ${dianDocCount + 1}</signed-xml>` : null,
          dianResponse: ['ACCEPTED', 'REJECTED', 'ERROR'].includes(docStatus) ? { code: docStatus === 'ACCEPTED' ? '200' : '400', message: docStatus } as any : null,
          sentAt: ['SENT', 'ACCEPTED', 'REJECTED', 'ERROR'].includes(docStatus) ? daysAgo(randomInt(1, 30)) : null,
          createdAt: daysAgo(randomInt(1, 60)),
        },
      });
      dianDocCount++;
    }
  }

  console.log(`   ✅ ${dianConfigs.length} DIAN Configs + ${dianDocCount} Documentos creados`);

  // ============================================================================
  // STEP 18: POS Infrastructure
  // ============================================================================
  console.log('🏪 Creando POS (Cajas, Sesiones, Ventas)...');

  // Cash Registers (11)
  const crData = [
    // Demo (6) — use demo warehouses
    { tenantId: tenantDemo.id, warehouseId: warehouseMain.id, name: 'Caja 1 - Principal', code: 'CAJA-001', status: 'OPEN' },
    { tenantId: tenantDemo.id, warehouseId: warehouseMain.id, name: 'Caja 2 - Electrónica', code: 'CAJA-002', status: 'OPEN' },
    { tenantId: tenantDemo.id, warehouseId: warehouseMain.id, name: 'Caja 3 - Express', code: 'CAJA-003', status: 'OPEN' },
    { tenantId: tenantDemo.id, warehouseId: warehouseSouth.id, name: 'Caja 4 - Sur', code: 'CAJA-004', status: 'CLOSED' },
    { tenantId: tenantDemo.id, warehouseId: warehouseNorth.id, name: 'Caja 5 - Norte', code: 'CAJA-005', status: 'CLOSED' },
    { tenantId: tenantDemo.id, warehouseId: warehouseNorth.id, name: 'Caja 6 - Suspendida', code: 'CAJA-006', status: 'SUSPENDED' },
    // DN (2)
    { tenantId: tenantDistribuidora.id, warehouseId: dnWarehouseMain.id, name: 'Caja Mayorista 1', code: 'CJDN-001', status: 'OPEN' },
    { tenantId: tenantDistribuidora.id, warehouseId: dnWarehouse2.id, name: 'Caja Mayorista 2', code: 'CJDN-002', status: 'CLOSED' },
    // NN (1)
    { tenantId: tenantNuevo.id, warehouseId: nnWarehouse.id, name: 'Caja Única', code: 'CJNN-001', status: 'CLOSED' },
    // PC (2)
    { tenantId: tenantPapeleria.id, warehouseId: pcWarehouseMain.id, name: 'Caja Papelería 1', code: 'CJPC-001', status: 'OPEN' },
    { tenantId: tenantPapeleria.id, warehouseId: pcWarehouse2.id, name: 'Caja Papelería 2', code: 'CJPC-002', status: 'CLOSED' },
  ];

  const cashRegisters: { id: string; tenantId: string; name: string }[] = [];
  for (const cr of crData) {
    const created = await prisma.cashRegister.create({
      data: { tenantId: cr.tenantId, warehouseId: cr.warehouseId, name: cr.name, code: cr.code, status: cr.status as any },
    });
    cashRegisters.push({ id: created.id, tenantId: cr.tenantId, name: cr.name });
  }

  // POS Sessions (13)
  const sessionConfigs = [
    // Demo (6: 5 CLOSED + 1 ACTIVE)
    ...Array(5).fill(null).map((_, i) => ({ tenantId: tenantDemo.id, crIdx: i % 3, userId: demoActiveUsers[i % demoActiveUsers.length].id, status: 'CLOSED', daysAgoStart: randomInt(1, 30) })),
    { tenantId: tenantDemo.id, crIdx: 0, userId: employeePosDemo.id, status: 'ACTIVE', daysAgoStart: 0 },
    // DN (3: 2 CLOSED + 1 SUSPENDED)
    { tenantId: tenantDistribuidora.id, crIdx: 6, userId: dnEmployee1.id, status: 'CLOSED', daysAgoStart: 5 },
    { tenantId: tenantDistribuidora.id, crIdx: 6, userId: dnEmployee2.id, status: 'CLOSED', daysAgoStart: 2 },
    { tenantId: tenantDistribuidora.id, crIdx: 7, userId: dnEmployee1.id, status: 'SUSPENDED', daysAgoStart: 1 },
    // NN (1 CLOSED)
    { tenantId: tenantNuevo.id, crIdx: 8, userId: nnAdmin.id, status: 'CLOSED', daysAgoStart: 3 },
    // PC (3: 2 CLOSED + 1 ACTIVE)
    { tenantId: tenantPapeleria.id, crIdx: 9, userId: pcEmployee1.id, status: 'CLOSED', daysAgoStart: 4 },
    { tenantId: tenantPapeleria.id, crIdx: 9, userId: pcEmployee2.id, status: 'CLOSED', daysAgoStart: 1 },
    { tenantId: tenantPapeleria.id, crIdx: 9, userId: pcEmployee1.id, status: 'ACTIVE', daysAgoStart: 0 },
  ];

  const posSessions: { id: string; tenantId: string; cashRegisterId: string }[] = [];
  for (const sc of sessionConfigs) {
    const cr = cashRegisters[sc.crIdx] || cashRegisters.find(c => c.tenantId === sc.tenantId);
    if (!cr) continue;
    const openedAt = daysAgo(sc.daysAgoStart);
    const closedAt = sc.status === 'CLOSED' ? new Date(openedAt.getTime() + 8 * 60 * 60 * 1000) : null;
    const session = await prisma.pOSSession.create({
      data: {
        tenantId: sc.tenantId, cashRegisterId: cr.id, userId: sc.userId,
        status: sc.status as any, openingAmount: randomInt(100000, 500000),
        closingAmount: sc.status === 'CLOSED' ? randomInt(500000, 2000000) : null,
        openedAt, closedAt,
      },
    });
    posSessions.push({ id: session.id, tenantId: sc.tenantId, cashRegisterId: cr.id });
  }

  // CashRegisterMovements (covering OPENING, CLOSING, SALE, REFUND, CASH_IN, CASH_OUT)
  const movTypes = ['OPENING', 'SALE', 'SALE', 'CASH_IN', 'REFUND', 'CASH_OUT', 'CLOSING'];
  let crMovCount = 0;
  for (const sess of posSessions) {
    for (const mt of movTypes) {
      const amount = mt === 'OPENING' ? randomInt(200000, 500000) : mt === 'CLOSING' ? randomInt(800000, 2000000) : mt === 'REFUND' ? -randomInt(10000, 50000) : mt === 'CASH_OUT' ? -randomInt(50000, 150000) : randomInt(20000, 200000);
      await prisma.cashRegisterMovement.create({
        data: {
          tenantId: sess.tenantId, sessionId: sess.id,
          type: mt as any, amount, notes: `${mt} - Sesión POS`,
          createdAt: daysAgo(randomInt(0, 30)),
        },
      });
      crMovCount++;
    }
  }

  // POS Sales (create POS invoices first, then link)
  let posSaleCount = 0;
  const posInvCounter = { value: 0 };
  for (const sess of posSessions.slice(0, 10)) {
    // Determine tenant products/customers for this session
    let products: ProductRecord[], customers: CustomerRecord[], userId: string, warehouseId: string, prefix: string;
    if (sess.tenantId === tenantDemo.id) { products = demoProducts; customers = demoCustomers; userId = employeePosDemo.id; warehouseId = warehouseMain.id; prefix = 'POS-TD'; }
    else if (sess.tenantId === tenantDistribuidora.id) { products = dnProducts; customers = dnCustomers; userId = dnEmployee1.id; warehouseId = dnWarehouseMain.id; prefix = 'POS-DN'; }
    else if (sess.tenantId === tenantNuevo.id) { products = nnProducts; customers = nnCustomers; userId = nnAdmin.id; warehouseId = nnWarehouse.id; prefix = 'POS-NN'; }
    else { products = pcProducts; customers = pcCustomers; userId = pcEmployee1.id; warehouseId = pcWarehouseMain.id; prefix = 'POS-PC'; }

    const posInv = await createTenantInvoice({
      tenantId: sess.tenantId, products, customers, status: 'SENT', paymentStatus: 'PAID',
      daysAgoIssued: randomInt(0, 15), userId, warehouseId, source: 'POS',
      invoicePrefix: prefix, counterRef: posInvCounter,
    });
    const subtotal = Math.round(posInv.total / 1.19);
    const tax = posInv.total - subtotal;
    posInvCounter.value++;
    const saleNumber = `${prefix}-${String(posInvCounter.value).padStart(4, '0')}`;
    const posSale = await prisma.pOSSale.create({
      data: {
        tenantId: sess.tenantId, sessionId: sess.id, invoiceId: posInv.id,
        saleNumber, subtotal, tax, total: posInv.total,
        createdAt: daysAgo(randomInt(0, 15)),
      },
    });
    await prisma.salePayment.create({
      data: {
        saleId: posSale.id, method: pickRandom(['CASH', 'CREDIT_CARD', 'NEQUI']) as any,
        amount: posInv.total, reference: null,
      },
    });
    posSaleCount++;
  }

  console.log(`   ✅ ${cashRegisters.length} Cajas, ${posSessions.length} Sesiones POS, ${crMovCount} Movimientos caja, ${posSaleCount} Ventas POS`);

  // ============================================================================
  // STEP 19: Subscriptions (4 — one per tenant)
  // ============================================================================
  console.log('💳 Creando Suscripciones...');

  await prisma.subscription.create({
    data: { tenantId: tenantDemo.id, plan: 'PRO', status: 'ACTIVE', periodType: 'ANNUAL', startDate: daysAgo(180), endDate: daysFromNow(185) },
  });
  await prisma.subscription.create({
    data: { tenantId: tenantDistribuidora.id, plan: 'PLUS', status: 'ACTIVE', periodType: 'MONTHLY', startDate: daysAgo(25), endDate: daysFromNow(5) },
  });
  await prisma.subscription.create({
    data: { tenantId: tenantNuevo.id, plan: 'EMPRENDEDOR', status: 'ACTIVE', periodType: 'MONTHLY', startDate: daysAgo(25), endDate: daysFromNow(5) },
  });
  await prisma.subscription.create({
    data: { tenantId: tenantPapeleria.id, plan: 'PYME', status: 'ACTIVE', periodType: 'QUARTERLY', startDate: daysAgo(60), endDate: daysFromNow(30) },
  });

  console.log('   ✅ 4 Suscripciones creadas');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n══════════════════════════════════════════════════════');
  console.log('📊 RESUMEN SEED ULTRA-COMPLETO');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  System Admins:     3`);
  console.log(`  Tenants:           4`);
  console.log(`  Users:             21`);
  console.log(`  Categories:        32`);
  console.log(`  Products:          167 (con imágenes, barcodes, maxStock)`);
  console.log(`  Warehouses:        12`);
  console.log(`  Customers:         ${demoCustomers.length + dnCustomers.length + nnCustomers.length + pcCustomers.length}`);
  console.log(`  Invoices:          ${demoInvoices.length + dnInvoices.length + nnInvoices.length + pcInvoices.length}`);
  console.log(`  Payments:          ${paymentCount}`);
  console.log(`  Stock Movements:   ${movementCount}`);
  console.log(`  Notifications:     ${notifCount}`);
  console.log(`  Audit Logs:        ${auditCount}`);
  console.log(`  SysAdmin Logs:     ${sysAdminActions.length}`);
  console.log(`  Invitations:       ${invitationsData.length}`);
  console.log(`  DIAN Configs:      ${dianConfigs.length}`);
  console.log(`  DIAN Documents:    ${dianDocCount}`);
  console.log(`  Cash Registers:    ${cashRegisters.length}`);
  console.log(`  POS Sessions:      ${posSessions.length}`);
  console.log(`  POS Sales:         ${posSaleCount}`);
  console.log(`  Subscriptions:     4`);
  console.log('══════════════════════════════════════════════════════');
  console.log('\n🔑 CREDENCIALES DE ACCESO:');
  console.log('──────────────────────────────────────────────────────');
  console.log('  Tienda Demo (PRO):');
  console.log('    admin@tienda-demo.com / password123');
  console.log('  Distribuidora Nacional (PLUS):');
  console.log('    admin@distribuidoranacional.com / password123');
  console.log('  Nuevo Negocio (EMPRENDEDOR):');
  console.log('    admin@nuevonegocio.com / password123');
  console.log('  Papelería Central (PYME):');
  console.log('    admin@papeleriacentral.com / password123');
  console.log('──────────────────────────────────────────────────────');
  console.log('  System Admin:');
  console.log(`    ${process.env.SYSTEM_ADMIN_EMAIL || 'superadmin@stockflow.com'} / ${process.env.SYSTEM_ADMIN_PASSWORD || 'admin123!'}`);
  console.log('══════════════════════════════════════════════════════');

  console.log('\n🎉 SEED ULTRA-COMPLETO FINALIZADO');
}

main()
  .catch((e) => {
    console.error('❌ Error en seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
