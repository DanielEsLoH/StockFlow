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

async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // Check if already seeded
  const existingAdmin = await prisma.systemAdmin.count();
  if (existingAdmin > 0) {
    console.log('✅ La base de datos ya tiene datos, omitiendo seed.\n');
    return;
  }

  // ============================================================================
  // STEP 1: Clean existing data
  // ============================================================================
  console.log('🗑️  Limpiando datos existentes...');
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

  // ============================================================================
  // STEP 2: System Admins
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
    },
  });

  await prisma.systemAdmin.create({
    data: {
      email: 'soporte@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Carlos',
      lastName: 'Soporte',
      role: 'SUPPORT',
      status: 'ACTIVE',
    },
  });

  await prisma.systemAdmin.create({
    data: {
      email: 'facturacion@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Laura',
      lastName: 'Facturación',
      role: 'BILLING',
      status: 'ACTIVE',
    },
  });

  console.log('   ✅ 3 System Admins creados');

  // ============================================================================
  // STEP 3: Tenants
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

  await prisma.tenant.create({
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

  await prisma.tenant.create({
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

  await prisma.tenant.create({
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
  // STEP 4: Users
  // ============================================================================
  console.log('👥 Creando Usuarios...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id,
      email: 'admin@tienda-demo.com',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+57 300 111 1111',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: daysAgo(0),
    },
  });

  const managerDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id,
      email: 'gerente@tienda-demo.com',
      password: hashedPassword,
      firstName: 'Andrea',
      lastName: 'López',
      phone: '+57 300 999 8888',
      role: 'MANAGER',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: daysAgo(1),
    },
  });

  const employeeDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id,
      email: 'empleado@tienda-demo.com',
      password: hashedPassword,
      firstName: 'María',
      lastName: 'González',
      phone: '+57 300 222 2222',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: daysAgo(0),
    },
  });

  const employee2Demo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id,
      email: 'vendedor@tienda-demo.com',
      password: hashedPassword,
      firstName: 'Luis',
      lastName: 'Ramírez',
      phone: '+57 300 333 3333',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: daysAgo(2),
    },
  });

  const users = [adminDemo, managerDemo, employeeDemo, employee2Demo];
  console.log('   ✅ 4 Usuarios creados');

  // ============================================================================
  // STEP 5: Categories (15 categorías)
  // ============================================================================
  console.log('📁 Creando Categorías...');

  const categoriesData = [
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

  const categories: Record<string, { id: string; name: string }> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: { tenantId: tenantDemo.id, ...cat },
    });
    categories[cat.name] = created;
  }
  console.log(`   ✅ ${categoriesData.length} Categorías creadas`);

  // ============================================================================
  // STEP 6: Products (85 productos)
  // ============================================================================
  console.log('📦 Creando Productos...');

  interface ProductInput {
    sku: string;
    name: string;
    description: string;
    costPrice: number;
    salePrice: number;
    taxRate: number;
    stock: number;
    minStock: number;
    brand: string;
    categoryName: string;
  }

  const productsData: ProductInput[] = [
    // Electrónica (6)
    { sku: 'ELEC-001', name: 'Televisor Samsung 55" 4K UHD', description: 'Smart TV Samsung 55 pulgadas 4K UHD con HDR', costPrice: 1800000, salePrice: 2500000, taxRate: 19, stock: 12, minStock: 5, brand: 'Samsung', categoryName: 'Electrónica' },
    { sku: 'ELEC-002', name: 'Consola PlayStation 5', description: 'Consola PS5 edición estándar con disco', costPrice: 2200000, salePrice: 2800000, taxRate: 19, stock: 8, minStock: 3, brand: 'Sony', categoryName: 'Electrónica' },
    { sku: 'ELEC-003', name: 'Consola Nintendo Switch OLED', description: 'Nintendo Switch modelo OLED pantalla 7"', costPrice: 1200000, salePrice: 1500000, taxRate: 19, stock: 15, minStock: 5, brand: 'Nintendo', categoryName: 'Electrónica' },
    { sku: 'ELEC-004', name: 'Cámara Canon EOS Rebel T7', description: 'Cámara DSLR Canon con lente 18-55mm', costPrice: 2400000, salePrice: 3200000, taxRate: 19, stock: 4, minStock: 2, brand: 'Canon', categoryName: 'Electrónica' },
    { sku: 'ELEC-005', name: 'Drone DJI Mini 3 Pro', description: 'Drone compacto con cámara 4K y gimbal', costPrice: 1600000, salePrice: 2100000, taxRate: 19, stock: 3, minStock: 2, brand: 'DJI', categoryName: 'Electrónica' },
    { sku: 'ELEC-006', name: 'Apple Watch Series 9', description: 'Smartwatch Apple 45mm GPS + Cellular', costPrice: 1400000, salePrice: 1800000, taxRate: 19, stock: 0, minStock: 5, brand: 'Apple', categoryName: 'Electrónica' },

    // Computadores y Laptops (6)
    { sku: 'COMP-001', name: 'Laptop Dell Inspiron 15', description: 'Intel Core i5, 8GB RAM, 512GB SSD', costPrice: 1600000, salePrice: 2100000, taxRate: 19, stock: 18, minStock: 5, brand: 'Dell', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-002', name: 'Laptop HP Pavilion 15', description: 'AMD Ryzen 5, 16GB RAM, 512GB SSD', costPrice: 1500000, salePrice: 1900000, taxRate: 19, stock: 14, minStock: 5, brand: 'HP', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-003', name: 'MacBook Air M2', description: 'Apple M2, 8GB RAM, 256GB SSD, 13.6"', costPrice: 4200000, salePrice: 5500000, taxRate: 19, stock: 6, minStock: 3, brand: 'Apple', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-004', name: 'PC Gamer RTX 4070', description: 'Intel i7, RTX 4070, 32GB RAM, 1TB NVMe', costPrice: 3200000, salePrice: 4200000, taxRate: 19, stock: 5, minStock: 2, brand: 'Custom', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-005', name: 'Monitor Samsung 27" Curvo', description: 'Monitor LED 27" Full HD 75Hz', costPrice: 480000, salePrice: 650000, taxRate: 19, stock: 22, minStock: 8, brand: 'Samsung', categoryName: 'Computadores y Laptops' },
    { sku: 'COMP-006', name: 'Monitor LG UltraWide 34"', description: 'Monitor IPS 34" WQHD 21:9', costPrice: 1100000, salePrice: 1400000, taxRate: 19, stock: 2, minStock: 3, brand: 'LG', categoryName: 'Computadores y Laptops' },

    // Celulares y Tablets (6)
    { sku: 'CEL-001', name: 'iPhone 15 Pro 256GB', description: 'Apple iPhone 15 Pro Titanio Natural', costPrice: 3800000, salePrice: 4500000, taxRate: 19, stock: 10, minStock: 5, brand: 'Apple', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-002', name: 'Samsung Galaxy S24 Ultra', description: 'Samsung S24 Ultra 256GB 5G', costPrice: 3200000, salePrice: 3800000, taxRate: 19, stock: 8, minStock: 4, brand: 'Samsung', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-003', name: 'Xiaomi Redmi Note 13 Pro', description: 'Redmi Note 13 Pro 256GB 5G', costPrice: 700000, salePrice: 900000, taxRate: 19, stock: 25, minStock: 10, brand: 'Xiaomi', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-004', name: 'iPad Air 5ta Gen', description: 'iPad Air 10.9" 64GB WiFi', costPrice: 2000000, salePrice: 2500000, taxRate: 19, stock: 0, minStock: 4, brand: 'Apple', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-005', name: 'Samsung Galaxy Tab S9', description: 'Galaxy Tab S9 11" 128GB WiFi', costPrice: 1800000, salePrice: 2200000, taxRate: 19, stock: 7, minStock: 3, brand: 'Samsung', categoryName: 'Celulares y Tablets' },
    { sku: 'CEL-006', name: 'Tablet Lenovo Tab M10 Plus', description: 'Tab M10 Plus 10.6" 64GB', costPrice: 350000, salePrice: 450000, taxRate: 19, stock: 30, minStock: 10, brand: 'Lenovo', categoryName: 'Celulares y Tablets' },

    // Audio y Video (5)
    { sku: 'AUD-001', name: 'Audífonos Sony WH-1000XM5', description: 'Audífonos inalámbricos con ANC', costPrice: 1200000, salePrice: 1500000, taxRate: 19, stock: 12, minStock: 5, brand: 'Sony', categoryName: 'Audio y Video' },
    { sku: 'AUD-002', name: 'AirPods Pro 2da Gen', description: 'Apple AirPods Pro con estuche MagSafe', costPrice: 850000, salePrice: 1100000, taxRate: 19, stock: 15, minStock: 8, brand: 'Apple', categoryName: 'Audio y Video' },
    { sku: 'AUD-003', name: 'Parlante JBL Flip 6', description: 'Parlante Bluetooth portátil resistente al agua', costPrice: 350000, salePrice: 450000, taxRate: 19, stock: 20, minStock: 10, brand: 'JBL', categoryName: 'Audio y Video' },
    { sku: 'AUD-004', name: 'Barra de Sonido Samsung HW-B550', description: 'Soundbar 2.1 con subwoofer inalámbrico', costPrice: 600000, salePrice: 800000, taxRate: 19, stock: 8, minStock: 4, brand: 'Samsung', categoryName: 'Audio y Video' },
    { sku: 'AUD-005', name: 'Micrófono Blue Yeti USB', description: 'Micrófono condensador USB para streaming', costPrice: 420000, salePrice: 550000, taxRate: 19, stock: 6, minStock: 3, brand: 'Blue', categoryName: 'Audio y Video' },

    // Ropa Hombre (6)
    { sku: 'RH-001', name: 'Camiseta Polo Lacoste', description: 'Polo clásico algodón piqué', costPrice: 120000, salePrice: 180000, taxRate: 19, stock: 40, minStock: 15, brand: 'Lacoste', categoryName: 'Ropa Hombre' },
    { sku: 'RH-002', name: 'Camisa Formal Arturo Calle', description: 'Camisa manga larga algodón', costPrice: 95000, salePrice: 150000, taxRate: 19, stock: 35, minStock: 12, brand: 'Arturo Calle', categoryName: 'Ropa Hombre' },
    { sku: 'RH-003', name: 'Jean Levi\'s 501 Original', description: 'Jean clásico corte recto', costPrice: 180000, salePrice: 280000, taxRate: 19, stock: 28, minStock: 10, brand: 'Levi\'s', categoryName: 'Ropa Hombre' },
    { sku: 'RH-004', name: 'Chaqueta The North Face', description: 'Chaqueta impermeable ThermoBall', costPrice: 320000, salePrice: 450000, taxRate: 19, stock: 12, minStock: 5, brand: 'The North Face', categoryName: 'Ropa Hombre' },
    { sku: 'RH-005', name: 'Bermuda Tommy Hilfiger', description: 'Bermuda chino algodón', costPrice: 150000, salePrice: 220000, taxRate: 19, stock: 22, minStock: 8, brand: 'Tommy Hilfiger', categoryName: 'Ropa Hombre' },
    { sku: 'RH-006', name: 'Sudadera Adidas Originals', description: 'Sudadera con capucha algodón', costPrice: 120000, salePrice: 180000, taxRate: 19, stock: 25, minStock: 10, brand: 'Adidas', categoryName: 'Ropa Hombre' },

    // Ropa Mujer (6)
    { sku: 'RM-001', name: 'Vestido Zara Casual', description: 'Vestido midi estampado floral', costPrice: 160000, salePrice: 250000, taxRate: 19, stock: 18, minStock: 8, brand: 'Zara', categoryName: 'Ropa Mujer' },
    { sku: 'RM-002', name: 'Blusa Studio F Elegante', description: 'Blusa manga larga satinada', costPrice: 75000, salePrice: 120000, taxRate: 19, stock: 30, minStock: 12, brand: 'Studio F', categoryName: 'Ropa Mujer' },
    { sku: 'RM-003', name: 'Jean Mom Fit', description: 'Jean tiro alto corte mom', costPrice: 110000, salePrice: 180000, taxRate: 19, stock: 24, minStock: 10, brand: 'Pull&Bear', categoryName: 'Ropa Mujer' },
    { sku: 'RM-004', name: 'Chaqueta de Cuero Sintético', description: 'Chaqueta biker cuero sintético', costPrice: 250000, salePrice: 380000, taxRate: 19, stock: 10, minStock: 5, brand: 'Bershka', categoryName: 'Ropa Mujer' },
    { sku: 'RM-005', name: 'Falda Midi Plisada', description: 'Falda midi plisada elegante', costPrice: 90000, salePrice: 150000, taxRate: 19, stock: 15, minStock: 6, brand: 'Mango', categoryName: 'Ropa Mujer' },
    { sku: 'RM-006', name: 'Conjunto Deportivo Nike', description: 'Conjunto leggings + top deportivo', costPrice: 220000, salePrice: 320000, taxRate: 19, stock: 20, minStock: 8, brand: 'Nike', categoryName: 'Ropa Mujer' },

    // Calzado (5)
    { sku: 'CAL-001', name: 'Tenis Nike Air Max 90', description: 'Tenis clásicos Air Max 90', costPrice: 320000, salePrice: 450000, taxRate: 19, stock: 16, minStock: 8, brand: 'Nike', categoryName: 'Calzado' },
    { sku: 'CAL-002', name: 'Zapatos Formales Bosi', description: 'Zapatos Oxford cuero genuino', costPrice: 180000, salePrice: 280000, taxRate: 19, stock: 12, minStock: 5, brand: 'Bosi', categoryName: 'Calzado' },
    { sku: 'CAL-003', name: 'Botas Timberland Premium', description: 'Botas 6-inch premium waterproof', costPrice: 380000, salePrice: 520000, taxRate: 19, stock: 8, minStock: 4, brand: 'Timberland', categoryName: 'Calzado' },
    { sku: 'CAL-004', name: 'Sandalias Crocs Classic', description: 'Crocs Classic Clog unisex', costPrice: 100000, salePrice: 150000, taxRate: 19, stock: 35, minStock: 15, brand: 'Crocs', categoryName: 'Calzado' },
    { sku: 'CAL-005', name: 'Tenis Adidas Ultraboost', description: 'Tenis running Ultraboost 23', costPrice: 280000, salePrice: 380000, taxRate: 19, stock: 14, minStock: 6, brand: 'Adidas', categoryName: 'Calzado' },

    // Accesorios de Moda (5)
    { sku: 'ACC-001', name: 'Reloj Casio G-Shock', description: 'Reloj digital resistente golpes y agua', costPrice: 250000, salePrice: 350000, taxRate: 19, stock: 18, minStock: 8, brand: 'Casio', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-002', name: 'Gafas Ray-Ban Aviator', description: 'Gafas de sol Aviator Classic', costPrice: 350000, salePrice: 480000, taxRate: 19, stock: 10, minStock: 5, brand: 'Ray-Ban', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-003', name: 'Bolso Coach Crossbody', description: 'Bolso bandolera cuero genuino', costPrice: 480000, salePrice: 650000, taxRate: 19, stock: 6, minStock: 3, brand: 'Coach', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-004', name: 'Cinturón Cuero Italiano', description: 'Cinturón cuero italiano hebilla clásica', costPrice: 55000, salePrice: 85000, taxRate: 19, stock: 40, minStock: 15, brand: 'Vélez', categoryName: 'Accesorios de Moda' },
    { sku: 'ACC-005', name: 'Billetera Tommy Hilfiger', description: 'Billetera cuero con portamonedas', costPrice: 80000, salePrice: 120000, taxRate: 19, stock: 25, minStock: 10, brand: 'Tommy Hilfiger', categoryName: 'Accesorios de Moda' },

    // Alimentos y Bebidas (8)
    { sku: 'ALI-001', name: 'Café Juan Valdez 500g', description: 'Café molido premium origen Huila', costPrice: 25000, salePrice: 35000, taxRate: 5, stock: 80, minStock: 30, brand: 'Juan Valdez', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-002', name: 'Chocolate Corona 500g', description: 'Chocolate tradicional en pastillas', costPrice: 5500, salePrice: 8500, taxRate: 0, stock: 120, minStock: 50, brand: 'Corona', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-003', name: 'Aceite Girasol Premier 3L', description: 'Aceite de girasol premium', costPrice: 22000, salePrice: 28000, taxRate: 0, stock: 60, minStock: 25, brand: 'Premier', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-004', name: 'Arroz Diana 5kg', description: 'Arroz blanco premium', costPrice: 18000, salePrice: 22000, taxRate: 0, stock: 100, minStock: 40, brand: 'Diana', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-005', name: 'Leche Alpina Entera 6-pack', description: 'Leche entera UHT 1L x 6', costPrice: 14000, salePrice: 18500, taxRate: 0, stock: 45, minStock: 20, brand: 'Alpina', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-006', name: 'Galletas Oreo Pack Familiar', description: 'Galletas Oreo 6 paquetes', costPrice: 8500, salePrice: 12000, taxRate: 0, stock: 70, minStock: 30, brand: 'Oreo', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-007', name: 'Gaseosa Coca-Cola 2.5L', description: 'Coca-Cola Original 2.5 litros', costPrice: 5500, salePrice: 7500, taxRate: 0, stock: 90, minStock: 40, brand: 'Coca-Cola', categoryName: 'Alimentos y Bebidas' },
    { sku: 'ALI-008', name: 'Agua Cristal 6-pack', description: 'Agua Cristal 600ml x 6', costPrice: 6500, salePrice: 9000, taxRate: 0, stock: 85, minStock: 35, brand: 'Cristal', categoryName: 'Alimentos y Bebidas' },

    // Hogar y Decoración (6)
    { sku: 'HOG-001', name: 'Lámpara LED Escritorio Philips', description: 'Lámpara LED regulable con USB', costPrice: 55000, salePrice: 75000, taxRate: 19, stock: 25, minStock: 10, brand: 'Philips', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-002', name: 'Set Sábanas 300 Hilos Queen', description: 'Juego sábanas algodón egipcio', costPrice: 130000, salePrice: 180000, taxRate: 19, stock: 18, minStock: 8, brand: 'Cannon', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-003', name: 'Cortinas Blackout 2 Paneles', description: 'Cortinas blackout térmicas', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 22, minStock: 10, brand: 'Home Collection', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-004', name: 'Alfombra Decorativa 160x230', description: 'Alfombra moderna pelo corto', costPrice: 180000, salePrice: 250000, taxRate: 19, stock: 8, minStock: 4, brand: 'Kalpana', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-005', name: 'Set Toallas 6 Piezas', description: 'Toallas algodón 600gsm', costPrice: 65000, salePrice: 95000, taxRate: 19, stock: 30, minStock: 12, brand: 'Cannon', categoryName: 'Hogar y Decoración' },
    { sku: 'HOG-006', name: 'Espejo Decorativo Redondo', description: 'Espejo pared marco dorado 60cm', costPrice: 95000, salePrice: 145000, taxRate: 19, stock: 12, minStock: 5, brand: 'Home Collection', categoryName: 'Hogar y Decoración' },

    // Muebles (5)
    { sku: 'MUE-001', name: 'Silla Oficina Ergonómica', description: 'Silla ergonómica malla con lumbar', costPrice: 380000, salePrice: 520000, taxRate: 19, stock: 10, minStock: 5, brand: 'Rimax', categoryName: 'Muebles' },
    { sku: 'MUE-002', name: 'Escritorio en L Gaming', description: 'Escritorio esquinero con porta PC', costPrice: 500000, salePrice: 680000, taxRate: 19, stock: 6, minStock: 3, brand: 'Maderkit', categoryName: 'Muebles' },
    { sku: 'MUE-003', name: 'Sofá 3 Puestos Moderno', description: 'Sofá tela gris estructura madera', costPrice: 1400000, salePrice: 1800000, taxRate: 19, stock: 4, minStock: 2, brand: 'Jamar', categoryName: 'Muebles' },
    { sku: 'MUE-004', name: 'Mesa de Centro Moderna', description: 'Mesa centro vidrio templado', costPrice: 250000, salePrice: 350000, taxRate: 19, stock: 8, minStock: 4, brand: 'Tugó', categoryName: 'Muebles' },
    { sku: 'MUE-005', name: 'Cama Queen con Base', description: 'Base cama queen + cabecero tapizado', costPrice: 900000, salePrice: 1200000, taxRate: 19, stock: 3, minStock: 2, brand: 'Spring', categoryName: 'Muebles' },

    // Deportes y Fitness (6)
    { sku: 'DEP-001', name: 'Balón Fútbol Adidas Pro', description: 'Balón oficial FIFA Quality Pro', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 25, minStock: 10, brand: 'Adidas', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-002', name: 'Raqueta Tenis Wilson Pro', description: 'Raqueta profesional grafito', costPrice: 200000, salePrice: 280000, taxRate: 19, stock: 8, minStock: 4, brand: 'Wilson', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-003', name: 'Set Mancuernas 20kg', description: 'Par mancuernas ajustables 1-10kg', costPrice: 130000, salePrice: 180000, taxRate: 19, stock: 15, minStock: 6, brand: 'Everlast', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-004', name: 'Colchoneta Yoga TPE', description: 'Mat yoga antideslizante 6mm', costPrice: 32000, salePrice: 45000, taxRate: 19, stock: 35, minStock: 15, brand: 'Manduka', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-005', name: 'Bicicleta Spinning Pro', description: 'Bicicleta estática spinning', costPrice: 650000, salePrice: 850000, taxRate: 19, stock: 4, minStock: 2, brand: 'Athletic', categoryName: 'Deportes y Fitness' },
    { sku: 'DEP-006', name: 'Set Bandas Elásticas 5pz', description: 'Kit bandas resistencia niveles', costPrice: 25000, salePrice: 35000, taxRate: 19, stock: 40, minStock: 15, brand: 'Theraband', categoryName: 'Deportes y Fitness' },

    // Juguetes (5)
    { sku: 'JUG-001', name: 'LEGO Star Wars Millennium', description: 'Set LEGO 1353 piezas Halcón Milenario', costPrice: 280000, salePrice: 350000, taxRate: 19, stock: 6, minStock: 3, brand: 'LEGO', categoryName: 'Juguetes' },
    { sku: 'JUG-002', name: 'Barbie Dreamhouse', description: 'Casa de muñecas Barbie 3 pisos', costPrice: 140000, salePrice: 180000, taxRate: 19, stock: 8, minStock: 4, brand: 'Mattel', categoryName: 'Juguetes' },
    { sku: 'JUG-003', name: 'Hot Wheels Pista Épica', description: 'Pista Hot Wheels con looping', costPrice: 90000, salePrice: 120000, taxRate: 19, stock: 12, minStock: 5, brand: 'Hot Wheels', categoryName: 'Juguetes' },
    { sku: 'JUG-004', name: 'Rompecabezas 1000 Piezas', description: 'Puzzle paisaje 1000 piezas', costPrice: 32000, salePrice: 45000, taxRate: 19, stock: 20, minStock: 8, brand: 'Ravensburger', categoryName: 'Juguetes' },
    { sku: 'JUG-005', name: 'Monopoly Edición Colombia', description: 'Juego de mesa Monopoly Colombia', costPrice: 65000, salePrice: 85000, taxRate: 19, stock: 15, minStock: 6, brand: 'Hasbro', categoryName: 'Juguetes' },

    // Papelería y Oficina (5)
    { sku: 'PAP-001', name: 'Resma Papel Carta 500h', description: 'Papel bond 75g carta 500 hojas', costPrice: 14000, salePrice: 18000, taxRate: 19, stock: 80, minStock: 30, brand: 'Reprograf', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-002', name: 'Cuaderno Argollado 100h', description: 'Cuaderno profesional argollado', costPrice: 6000, salePrice: 8500, taxRate: 19, stock: 100, minStock: 40, brand: 'Norma', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-003', name: 'Set Marcadores 12 Colores', description: 'Marcadores permanentes Sharpie', costPrice: 18000, salePrice: 25000, taxRate: 19, stock: 45, minStock: 20, brand: 'Sharpie', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-004', name: 'Grapadora Industrial', description: 'Grapadora capacidad 100 hojas', costPrice: 25000, salePrice: 35000, taxRate: 19, stock: 20, minStock: 8, brand: 'Bostitch', categoryName: 'Papelería y Oficina' },
    { sku: 'PAP-005', name: 'Organizador Escritorio 5pz', description: 'Set organizador acrílico oficina', costPrice: 30000, salePrice: 42000, taxRate: 19, stock: 25, minStock: 10, brand: 'Artesco', categoryName: 'Papelería y Oficina' },

    // Ferretería y Herramientas (5)
    { sku: 'FER-001', name: 'Taladro Percutor Bosch 700W', description: 'Taladro percutor reversible', costPrice: 240000, salePrice: 320000, taxRate: 19, stock: 10, minStock: 5, brand: 'Bosch', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-002', name: 'Set Destornilladores 20pz', description: 'Juego destornilladores precisión', costPrice: 65000, salePrice: 85000, taxRate: 19, stock: 18, minStock: 8, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-003', name: 'Cinta Métrica 8m Stanley', description: 'Flexómetro profesional 8 metros', costPrice: 12000, salePrice: 18000, taxRate: 19, stock: 40, minStock: 15, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-004', name: 'Martillo Carpintero Stanley', description: 'Martillo uña fibra vidrio 16oz', costPrice: 35000, salePrice: 45000, taxRate: 19, stock: 22, minStock: 10, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
    { sku: 'FER-005', name: 'Caja Herramientas 100pz', description: 'Maletín herramientas completo', costPrice: 200000, salePrice: 280000, taxRate: 19, stock: 7, minStock: 3, brand: 'Black+Decker', categoryName: 'Ferretería y Herramientas' },
  ];

  const products: { id: string; sku: string; name: string; stock: number; minStock: number; salePrice: number; taxRate: number; categoryId: string }[] = [];

  for (const p of productsData) {
    const category = categories[p.categoryName];
    const status = p.stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
    const created = await prisma.product.create({
      data: {
        tenantId: tenantDemo.id,
        categoryId: category.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        taxRate: p.taxRate,
        stock: p.stock,
        minStock: p.minStock,
        brand: p.brand,
        unit: 'UND',
        status,
      },
    });
    products.push({ ...created, salePrice: p.salePrice, taxRate: p.taxRate, categoryId: category.id });
  }
  console.log(`   ✅ ${products.length} Productos creados`);

  // ============================================================================
  // STEP 7: Warehouses (6 bodegas)
  // ============================================================================
  console.log('🏭 Creando Bodegas...');

  const warehouseMain = await prisma.warehouse.create({
    data: {
      tenantId: tenantDemo.id,
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
      tenantId: tenantDemo.id,
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
      tenantId: tenantDemo.id,
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
      tenantId: tenantDemo.id,
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
      tenantId: tenantDemo.id,
      name: 'Punto de Venta Centro',
      code: 'BOD-005',
      address: 'Centro Comercial Santafé Local 234',
      city: 'Medellín',
      phone: '+57 4 488 9999',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  await prisma.warehouse.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Bodega Reserva',
      code: 'BOD-006',
      address: 'Zona Industrial Km 5',
      city: 'Itagüí',
      phone: '+57 4 499 0000',
      isMain: false,
      status: 'INACTIVE',
    },
  });

  const activeWarehouses = [warehouseMain, warehouseNorth, warehouseSouth, warehouseBogota, warehouseStore];
  console.log('   ✅ 6 Bodegas creadas');

  // ============================================================================
  // STEP 8: Warehouse Stock Distribution
  // ============================================================================
  console.log('📊 Distribuyendo stock en bodegas...');

  for (const product of products) {
    if (product.stock === 0) continue;

    // Distribución: 50% principal, 20% norte, 15% sur, 10% bogotá, 5% tienda
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
        await prisma.warehouseStock.create({
          data: {
            tenantId: tenantDemo.id,
            warehouseId: distributions[i].warehouse.id,
            productId: product.id,
            quantity: qty,
          },
        });
        remaining -= qty;
      }
    }
  }
  console.log('   ✅ Stock distribuido en bodegas');

  // ============================================================================
  // STEP 9: Customers (25 clientes)
  // ============================================================================
  console.log('👤 Creando Clientes...');

  const customersData = [
    // Personas naturales (15)
    { documentType: 'CC', documentNumber: '1234567890', name: 'Carlos Alberto Rodríguez', email: 'carlos.rodriguez@gmail.com', phone: '+57 300 111 2222', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '9876543210', name: 'Ana María García López', email: 'ana.garcia@hotmail.com', phone: '+57 310 222 3333', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '5555666677', name: 'Pedro José Gómez', email: 'pedro.gomez@outlook.com', phone: '+57 315 333 4444', city: 'Cali', state: 'Valle del Cauca', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '1111222233', name: 'María Fernanda Díaz', email: 'maria.diaz@gmail.com', phone: '+57 320 444 5555', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '4444555566', name: 'Juan Pablo Martínez', email: 'juan.martinez@yahoo.com', phone: '+57 301 555 6666', city: 'Barranquilla', state: 'Atlántico', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '7777888899', name: 'Laura Sofía Sánchez', email: 'laura.sanchez@gmail.com', phone: '+57 318 666 7777', city: 'Cartagena', state: 'Bolívar', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '3333444455', name: 'Andrés Felipe Torres', email: 'andres.torres@outlook.com', phone: '+57 312 777 8888', city: 'Bucaramanga', state: 'Santander', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '6666777788', name: 'Valentina López Ruiz', email: 'valentina.lopez@gmail.com', phone: '+57 305 888 9999', city: 'Pereira', state: 'Risaralda', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '2222333344', name: 'Santiago Hernández', email: 'santiago.hernandez@hotmail.com', phone: '+57 317 999 0000', city: 'Manizales', state: 'Caldas', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '8888999900', name: 'Camila Ramírez Vargas', email: 'camila.ramirez@gmail.com', phone: '+57 321 000 1111', city: 'Cúcuta', state: 'Norte de Santander', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '1010101010', name: 'Diego Alejandro Ruiz', email: 'diego.ruiz@yahoo.com', phone: '+57 304 111 2222', city: 'Armenia', state: 'Quindío', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '2020202020', name: 'Daniela Moreno Castro', email: 'daniela.moreno@gmail.com', phone: '+57 311 222 3333', city: 'Ibagué', state: 'Tolima', status: 'ACTIVE' },
    { documentType: 'CC', documentNumber: '3030303030', name: 'Sebastián Castro Jiménez', email: 'sebastian.castro@outlook.com', phone: '+57 316 333 4444', city: 'Neiva', state: 'Huila', status: 'INACTIVE' },
    { documentType: 'CC', documentNumber: '4040404040', name: 'Isabella Vargas Mendoza', email: 'isabella.vargas@gmail.com', phone: '+57 319 444 5555', city: 'Pasto', state: 'Nariño', status: 'INACTIVE' },
    { documentType: 'CC', documentNumber: '5050505050', name: 'Mateo Jiménez Rojas', email: 'mateo.jimenez@hotmail.com', phone: '+57 302 555 6666', city: 'Villavicencio', state: 'Meta', status: 'ACTIVE' },

    // Empresas (10)
    { documentType: 'NIT', documentNumber: '900123456-7', name: 'Tech Store Colombia SAS', businessName: 'Tech Store Colombia SAS', taxId: '900123456-7', email: 'compras@techstore.co', phone: '+57 1 555 1234', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '800999888-1', name: 'Distribuidora Nacional LTDA', businessName: 'Distribuidora Nacional LTDA', taxId: '800999888-1', email: 'ventas@disnacional.com', phone: '+57 4 444 5678', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '901234567-8', name: 'Comercializadora Andina SAS', businessName: 'Comercializadora Andina SAS', taxId: '901234567-8', email: 'info@andina.com.co', phone: '+57 2 333 4567', city: 'Cali', state: 'Valle del Cauca', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '800111222-3', name: 'Inversiones del Caribe SA', businessName: 'Inversiones del Caribe SA', taxId: '800111222-3', email: 'contacto@invcaribe.com', phone: '+57 5 666 7890', city: 'Barranquilla', state: 'Atlántico', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '890300000-4', name: 'Almacenes La 14 SA', businessName: 'Almacenes La 14 SA', taxId: '890300000-4', email: 'proveedores@la14.com', phone: '+57 2 777 8901', city: 'Cali', state: 'Valle del Cauca', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '900555666-7', name: 'Éxito Industria SAS', businessName: 'Éxito Industria de Colombia SAS', taxId: '900555666-7', email: 'compras@exitoindustria.co', phone: '+57 1 888 9012', city: 'Bogotá', state: 'Cundinamarca', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '811222333-4', name: 'Ferretería El Constructor', businessName: 'Ferretería El Constructor LTDA', taxId: '811222333-4', email: 'ventas@elconstructor.com', phone: '+57 4 999 0123', city: 'Medellín', state: 'Antioquia', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '800333444-5', name: 'Papelería Moderna LTDA', businessName: 'Papelería Moderna LTDA', taxId: '800333444-5', email: 'pedidos@papeleriamoderna.co', phone: '+57 6 111 2345', city: 'Pereira', state: 'Risaralda', status: 'ACTIVE' },
    { documentType: 'NIT', documentNumber: '901666777-8', name: 'Deportes y Más SAS', businessName: 'Deportes y Más SAS', taxId: '901666777-8', email: 'info@deportesymas.co', phone: '+57 4 222 3456', city: 'Medellín', state: 'Antioquia', status: 'INACTIVE' },
    { documentType: 'NIT', documentNumber: '800444555-6', name: 'Textiles del Pacífico', businessName: 'Textiles del Pacífico SA', taxId: '800444555-6', email: 'compras@textilespacifico.com', phone: '+57 2 333 4567', city: 'Buenaventura', state: 'Valle del Cauca', status: 'ACTIVE' },
  ];

  const customers: { id: string; name: string; status: string }[] = [];
  for (const c of customersData) {
    const created = await prisma.customer.create({
      data: {
        tenantId: tenantDemo.id,
        documentType: c.documentType as 'CC' | 'NIT',
        documentNumber: c.documentNumber,
        name: c.name,
        businessName: (c as { businessName?: string }).businessName,
        taxId: (c as { taxId?: string }).taxId,
        email: c.email,
        phone: c.phone,
        city: c.city,
        state: c.state,
        address: `Dirección en ${c.city}`,
        status: c.status as 'ACTIVE' | 'INACTIVE',
      },
    });
    customers.push(created);
  }
  const activeCustomers = customers.filter(c => c.status === 'ACTIVE');
  console.log(`   ✅ ${customers.length} Clientes creados`);

  // ============================================================================
  // STEP 10: Invoices (50 facturas)
  // ============================================================================
  console.log('📄 Creando Facturas...');

  interface InvoiceWithItems {
    id: string;
    invoiceNumber: string;
    paymentStatus: string;
    total: number;
    items: { productId: string; quantity: number; unitPrice: number; taxRate: number }[];
  }

  const invoices: InvoiceWithItems[] = [];
  let invoiceCounter = 1;

  // Función auxiliar para crear factura
  async function createInvoice(config: {
    status: 'DRAFT' | 'PENDING' | 'SENT' | 'OVERDUE' | 'CANCELLED';
    paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    daysAgoIssued: number;
    daysUntilDue?: number;
  }) {
    const customer = pickRandom(activeCustomers);
    const user = pickRandom(users);
    const numItems = randomInt(1, 4);
    const selectedProducts: { product: typeof products[0]; quantity: number }[] = [];

    for (let i = 0; i < numItems; i++) {
      const product = pickRandom(products.filter(p => p.stock > 0));
      if (product && !selectedProducts.find(sp => sp.product.id === product.id)) {
        selectedProducts.push({
          product,
          quantity: randomInt(1, 5),
        });
      }
    }

    if (selectedProducts.length === 0) return null;

    let subtotal = 0;
    let tax = 0;
    const items: { productId: string; quantity: number; unitPrice: number; taxRate: number; subtotal: number; tax: number; total: number }[] = [];

    for (const sp of selectedProducts) {
      const itemSubtotal = sp.product.salePrice * sp.quantity;
      const itemTax = itemSubtotal * (sp.product.taxRate / 100);
      subtotal += itemSubtotal;
      tax += itemTax;
      items.push({
        productId: sp.product.id,
        quantity: sp.quantity,
        unitPrice: sp.product.salePrice,
        taxRate: sp.product.taxRate,
        subtotal: itemSubtotal,
        tax: itemTax,
        total: itemSubtotal + itemTax,
      });
    }

    const total = subtotal + tax;
    const invoiceNumber = `INV-${String(invoiceCounter++).padStart(5, '0')}`;

    const issueDate = daysAgo(config.daysAgoIssued);
    const dueDate = config.daysUntilDue !== undefined
      ? new Date(issueDate.getTime() + config.daysUntilDue * 24 * 60 * 60 * 1000)
      : null;

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenantDemo.id,
        customerId: customer.id,
        userId: user.id,
        invoiceNumber,
        subtotal,
        tax,
        discount: 0,
        total,
        issueDate,
        dueDate,
        status: config.status,
        paymentStatus: config.paymentStatus,
        notes: `Factura generada automáticamente - ${config.status}`,
      },
    });

    // Create invoice items
    for (const item of items) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: 0,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        },
      });
    }

    invoices.push({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentStatus: invoice.paymentStatus,
      total,
      items,
    });

    return invoice;
  }

  // 20 PAID invoices (60-90 days ago)
  for (let i = 0; i < 20; i++) {
    await createInvoice({ status: 'SENT', paymentStatus: 'PAID', daysAgoIssued: randomInt(30, 90), daysUntilDue: 30 });
  }

  // 8 PARTIALLY_PAID invoices (15-45 days ago)
  for (let i = 0; i < 8; i++) {
    await createInvoice({ status: 'SENT', paymentStatus: 'PARTIALLY_PAID', daysAgoIssued: randomInt(15, 45), daysUntilDue: 30 });
  }

  // 10 PENDING/SENT invoices (1-14 days ago)
  for (let i = 0; i < 10; i++) {
    await createInvoice({ status: 'SENT', paymentStatus: 'UNPAID', daysAgoIssued: randomInt(1, 14), daysUntilDue: 30 });
  }

  // 7 OVERDUE invoices (45-75 days ago, due date passed)
  for (let i = 0; i < 7; i++) {
    await createInvoice({ status: 'OVERDUE', paymentStatus: 'UNPAID', daysAgoIssued: randomInt(45, 75), daysUntilDue: 15 });
  }

  // 3 DRAFT invoices (recent)
  for (let i = 0; i < 3; i++) {
    await createInvoice({ status: 'DRAFT', paymentStatus: 'UNPAID', daysAgoIssued: randomInt(0, 3) });
  }

  // 2 CANCELLED invoices
  for (let i = 0; i < 2; i++) {
    await createInvoice({ status: 'CANCELLED', paymentStatus: 'UNPAID', daysAgoIssued: randomInt(30, 60), daysUntilDue: 30 });
  }

  console.log(`   ✅ ${invoices.length} Facturas creadas`);

  // ============================================================================
  // STEP 11: Payments (60+ pagos)
  // ============================================================================
  console.log('💰 Creando Pagos...');

  const paymentMethods: ('CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'PSE' | 'NEQUI' | 'DAVIPLATA')[] = [
    'CASH', 'CASH', 'CASH', // 30%
    'BANK_TRANSFER', 'BANK_TRANSFER', // 20%
    'CREDIT_CARD', 'CREDIT_CARD', // 17%
    'NEQUI', // 13%
    'PSE', // 10%
    'DEBIT_CARD', // 7%
    'DAVIPLATA', // 3%
  ];

  let paymentCount = 0;

  for (const invoice of invoices) {
    if (invoice.paymentStatus === 'PAID') {
      // Full payment
      await prisma.payment.create({
        data: {
          tenantId: tenantDemo.id,
          invoiceId: invoice.id,
          amount: invoice.total,
          method: pickRandom(paymentMethods),
          reference: `PAY-${invoice.invoiceNumber}`,
          paymentDate: daysAgo(randomInt(1, 30)),
          notes: 'Pago completo',
        },
      });
      paymentCount++;
    } else if (invoice.paymentStatus === 'PARTIALLY_PAID') {
      // Partial payment (40-70% of total)
      const paidAmount = Math.floor(invoice.total * (randomInt(40, 70) / 100));
      await prisma.payment.create({
        data: {
          tenantId: tenantDemo.id,
          invoiceId: invoice.id,
          amount: paidAmount,
          method: pickRandom(paymentMethods),
          reference: `PAY-${invoice.invoiceNumber}-1`,
          paymentDate: daysAgo(randomInt(5, 20)),
          notes: 'Abono parcial',
        },
      });
      paymentCount++;

      // Some have second partial payment
      if (Math.random() > 0.5) {
        const secondPayment = Math.floor((invoice.total - paidAmount) * 0.5);
        await prisma.payment.create({
          data: {
            tenantId: tenantDemo.id,
            invoiceId: invoice.id,
            amount: secondPayment,
            method: pickRandom(paymentMethods),
            reference: `PAY-${invoice.invoiceNumber}-2`,
            paymentDate: daysAgo(randomInt(1, 5)),
            notes: 'Segundo abono',
          },
        });
        paymentCount++;
      }
    }
  }

  console.log(`   ✅ ${paymentCount} Pagos creados`);

  // ============================================================================
  // STEP 12: Stock Movements (120+ movimientos)
  // ============================================================================
  console.log('📦 Creando Movimientos de Stock...');

  const movementTypes: ('PURCHASE' | 'SALE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED')[] = [];
  let movementCount = 0;

  // PURCHASE movements (40)
  for (let i = 0; i < 40; i++) {
    const product = pickRandom(products);
    const warehouse = pickRandom(activeWarehouses);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenantDemo.id,
        productId: product.id,
        warehouseId: warehouse.id,
        userId: adminDemo.id,
        type: 'PURCHASE',
        quantity: randomInt(10, 50),
        reason: 'Compra de inventario',
        notes: `Orden de compra #PO-${randomInt(1000, 9999)}`,
        createdAt: daysAgo(randomInt(30, 90)),
      },
    });
    movementCount++;
  }

  // SALE movements (45) - linked to invoices
  for (const invoice of invoices.slice(0, 45)) {
    for (const item of invoice.items) {
      await prisma.stockMovement.create({
        data: {
          tenantId: tenantDemo.id,
          productId: item.productId,
          warehouseId: warehouseMain.id,
          userId: pickRandom(users).id,
          type: 'SALE',
          quantity: -item.quantity,
          reason: `Venta ${invoice.invoiceNumber}`,
          invoiceId: invoice.id,
          createdAt: daysAgo(randomInt(1, 60)),
        },
      });
      movementCount++;
    }
  }

  // TRANSFER movements (15)
  for (let i = 0; i < 15; i++) {
    const product = pickRandom(products.filter(p => p.stock > 5));
    const fromWarehouse = pickRandom(activeWarehouses);
    const toWarehouse = pickRandom(activeWarehouses.filter(w => w.id !== fromWarehouse.id));
    const qty = randomInt(5, 15);

    // Out from source
    await prisma.stockMovement.create({
      data: {
        tenantId: tenantDemo.id,
        productId: product.id,
        warehouseId: fromWarehouse.id,
        userId: managerDemo.id,
        type: 'TRANSFER',
        quantity: -qty,
        reason: `Transferencia a ${toWarehouse.name}`,
        createdAt: daysAgo(randomInt(5, 30)),
      },
    });

    // In to destination
    await prisma.stockMovement.create({
      data: {
        tenantId: tenantDemo.id,
        productId: product.id,
        warehouseId: toWarehouse.id,
        userId: managerDemo.id,
        type: 'TRANSFER',
        quantity: qty,
        reason: `Recepción de ${fromWarehouse.name}`,
        createdAt: daysAgo(randomInt(5, 30)),
      },
    });
    movementCount += 2;
  }

  // ADJUSTMENT movements (10)
  for (let i = 0; i < 10; i++) {
    const product = pickRandom(products);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenantDemo.id,
        productId: product.id,
        warehouseId: warehouseMain.id,
        userId: managerDemo.id,
        type: 'ADJUSTMENT',
        quantity: randomInt(-5, 10),
        reason: 'Ajuste de inventario por conteo físico',
        notes: 'Diferencia encontrada en auditoría',
        createdAt: daysAgo(randomInt(1, 20)),
      },
    });
    movementCount++;
  }

  // RETURN movements (6)
  for (let i = 0; i < 6; i++) {
    const product = pickRandom(products);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenantDemo.id,
        productId: product.id,
        warehouseId: warehouseMain.id,
        userId: employeeDemo.id,
        type: 'RETURN',
        quantity: randomInt(1, 3),
        reason: 'Devolución de cliente',
        notes: 'Producto en buen estado',
        createdAt: daysAgo(randomInt(1, 15)),
      },
    });
    movementCount++;
  }

  // DAMAGED movements (4)
  for (let i = 0; i < 4; i++) {
    const product = pickRandom(products);
    await prisma.stockMovement.create({
      data: {
        tenantId: tenantDemo.id,
        productId: product.id,
        warehouseId: pickRandom(activeWarehouses).id,
        userId: employee2Demo.id,
        type: 'DAMAGED',
        quantity: -randomInt(1, 3),
        reason: 'Producto dañado',
        notes: 'Daño en transporte / almacenamiento',
        createdAt: daysAgo(randomInt(1, 30)),
      },
    });
    movementCount++;
  }

  console.log(`   ✅ ${movementCount} Movimientos de stock creados`);

  // ============================================================================
  // STEP 13: Notifications (40+ notificaciones)
  // ============================================================================
  console.log('🔔 Creando Notificaciones...');

  const notifications: { type: string; title: string; message: string; priority: string; userId?: string; read: boolean }[] = [];

  // LOW_STOCK notifications (12)
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < p.minStock);
  for (const product of lowStockProducts.slice(0, 12)) {
    await prisma.notification.create({
      data: {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'LOW_STOCK',
        title: `Stock bajo: ${product.name}`,
        message: `El producto "${product.name}" tiene ${product.stock} unidades. El mínimo es ${product.minStock}.`,
        priority: product.stock <= 2 ? 'URGENT' : 'HIGH',
        read: Math.random() > 0.7,
        link: `/products/${product.id}`,
        metadata: { productId: product.id, currentStock: product.stock, minStock: product.minStock },
        createdAt: daysAgo(randomInt(0, 5)),
      },
    });
  }

  // OUT_OF_STOCK notifications (6)
  const outOfStockProducts = products.filter(p => p.stock === 0);
  for (const product of outOfStockProducts.slice(0, 6)) {
    await prisma.notification.create({
      data: {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'OUT_OF_STOCK',
        title: `Sin stock: ${product.name}`,
        message: `El producto "${product.name}" está agotado. No hay unidades disponibles.`,
        priority: 'URGENT',
        read: Math.random() > 0.5,
        link: `/products/${product.id}`,
        metadata: { productId: product.id },
        createdAt: daysAgo(randomInt(0, 7)),
      },
    });
  }

  // INVOICE_OVERDUE notifications (7)
  const overdueInvoices = invoices.filter(i => i.paymentStatus === 'UNPAID');
  for (const invoice of overdueInvoices.slice(0, 7)) {
    await prisma.notification.create({
      data: {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'INVOICE_OVERDUE',
        title: `Factura vencida: ${invoice.invoiceNumber}`,
        message: `La factura ${invoice.invoiceNumber} por $${invoice.total.toLocaleString()} está vencida.`,
        priority: 'HIGH',
        read: false,
        link: `/invoices/${invoice.id}`,
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        createdAt: daysAgo(randomInt(0, 3)),
      },
    });
  }

  // PAYMENT_RECEIVED notifications (8)
  const paidInvoices = invoices.filter(i => i.paymentStatus === 'PAID');
  for (const invoice of paidInvoices.slice(0, 8)) {
    await prisma.notification.create({
      data: {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Pago recibido',
        message: `Se recibió un pago de $${invoice.total.toLocaleString()} para la factura ${invoice.invoiceNumber}.`,
        priority: 'MEDIUM',
        read: true,
        link: `/invoices/${invoice.id}`,
        metadata: { invoiceId: invoice.id, amount: invoice.total },
        createdAt: daysAgo(randomInt(5, 30)),
      },
    });
  }

  // NEW_CUSTOMER notifications (4)
  for (const customer of activeCustomers.slice(0, 4)) {
    await prisma.notification.create({
      data: {
        tenantId: tenantDemo.id,
        userId: employeeDemo.id,
        type: 'NEW_CUSTOMER',
        title: 'Nuevo cliente registrado',
        message: `Se ha registrado el cliente "${customer.name}".`,
        priority: 'LOW',
        read: true,
        link: `/customers/${customer.id}`,
        metadata: { customerId: customer.id, customerName: customer.name },
        createdAt: daysAgo(randomInt(10, 60)),
      },
    });
  }

  // SYSTEM notifications (3)
  await prisma.notification.create({
    data: {
      tenantId: tenantDemo.id,
      userId: null,
      type: 'SYSTEM',
      title: 'Mantenimiento programado',
      message: 'El sistema estará en mantenimiento el próximo domingo de 2:00 AM a 4:00 AM.',
      priority: 'MEDIUM',
      read: false,
      createdAt: daysAgo(2),
    },
  });

  await prisma.notification.create({
    data: {
      tenantId: tenantDemo.id,
      userId: adminDemo.id,
      type: 'SYSTEM',
      title: 'Actualización de seguridad',
      message: 'Se ha aplicado una actualización de seguridad importante al sistema.',
      priority: 'HIGH',
      read: true,
      createdAt: daysAgo(7),
    },
  });

  await prisma.notification.create({
    data: {
      tenantId: tenantDemo.id,
      userId: adminDemo.id,
      type: 'INFO',
      title: 'Bienvenido a StockFlow',
      message: 'Gracias por usar StockFlow. Explora las nuevas funciones disponibles.',
      priority: 'LOW',
      read: true,
      createdAt: daysAgo(30),
    },
  });

  const notificationCount = await prisma.notification.count({ where: { tenantId: tenantDemo.id } });
  console.log(`   ✅ ${notificationCount} Notificaciones creadas`);

  // ============================================================================
  // STEP 14: Audit Logs
  // ============================================================================
  console.log('📝 Creando Audit Logs...');

  await prisma.auditLog.createMany({
    data: [
      { tenantId: tenantDemo.id, userId: adminDemo.id, action: 'LOGIN', entityType: 'User', entityId: adminDemo.id, ipAddress: '192.168.1.100', createdAt: daysAgo(0) },
      { tenantId: tenantDemo.id, userId: managerDemo.id, action: 'LOGIN', entityType: 'User', entityId: managerDemo.id, ipAddress: '192.168.1.101', createdAt: daysAgo(1) },
      { tenantId: tenantDemo.id, userId: employeeDemo.id, action: 'LOGIN', entityType: 'User', entityId: employeeDemo.id, ipAddress: '192.168.1.102', createdAt: daysAgo(0) },
      { tenantId: tenantDemo.id, userId: adminDemo.id, action: 'CREATE', entityType: 'Product', entityId: products[0].id, newValues: { name: products[0].name }, createdAt: daysAgo(30) },
      { tenantId: tenantDemo.id, userId: adminDemo.id, action: 'EXPORT', entityType: 'Report', entityId: 'inventory-report', metadata: { format: 'PDF', records: products.length }, createdAt: daysAgo(7) },
    ],
  });

  console.log('   ✅ 5 Audit logs creados');

  // ============================================================================
  // STEP 15: System Admin Audit Logs
  // ============================================================================
  console.log('📝 Creando System Admin Audit Logs...');

  await prisma.systemAdminAuditLog.createMany({
    data: [
      { adminId: superAdmin.id, action: 'CREATE_TENANT', entityType: 'Tenant', entityId: tenantDemo.id, details: { tenantName: 'Tienda Demo', plan: 'PRO' }, createdAt: daysAgo(90) },
      { adminId: superAdmin.id, action: 'VIEW_TENANT', entityType: 'Tenant', entityId: tenantDemo.id, details: { reason: 'Revisión de cuenta' }, createdAt: daysAgo(30) },
      { adminId: superAdmin.id, action: 'UPDATE_PLAN', entityType: 'Tenant', entityId: tenantDemo.id, details: { oldPlan: 'PYME', newPlan: 'PRO' }, createdAt: daysAgo(60) },
    ],
  });

  console.log('   ✅ 3 System Admin audit logs creados');

  // ============================================================================
  // STEP 16: Invitations
  // ============================================================================
  console.log('📧 Creando Invitaciones...');

  await prisma.invitation.createMany({
    data: [
      { email: 'nuevoempleado@gmail.com', tenantId: tenantDemo.id, role: 'EMPLOYEE', token: 'inv-token-001', expiresAt: daysFromNow(7), invitedById: adminDemo.id, status: 'PENDING' },
      { email: 'nuevogerente@empresa.com', tenantId: tenantDemo.id, role: 'MANAGER', token: 'inv-token-002', expiresAt: daysFromNow(5), invitedById: adminDemo.id, status: 'PENDING' },
      { email: 'invitacion.expirada@test.com', tenantId: tenantDemo.id, role: 'EMPLOYEE', token: 'inv-token-003', expiresAt: daysAgo(2), invitedById: adminDemo.id, status: 'EXPIRED' },
    ],
  });

  console.log('   ✅ 3 Invitaciones creadas');

  // ============================================================================
  // DONE - Summary
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
  console.log('='.repeat(60));

  console.log('\n📊 RESUMEN DE DATOS CREADOS:');
  console.log('─'.repeat(40));
  console.log(`   System Admins:      3`);
  console.log(`   Tenants:            4`);
  console.log(`   Usuarios:           4`);
  console.log(`   Categorías:         ${Object.keys(categories).length}`);
  console.log(`   Productos:          ${products.length}`);
  console.log(`   Bodegas:            6`);
  console.log(`   Clientes:           ${customers.length}`);
  console.log(`   Facturas:           ${invoices.length}`);
  console.log(`   Pagos:              ${paymentCount}`);
  console.log(`   Mov. de Stock:      ${movementCount}`);
  console.log(`   Notificaciones:     ${notificationCount}`);

  console.log('\n🔐 CREDENCIALES DE ACCESO:');
  console.log('─'.repeat(40));
  console.log('   TENANT ADMIN:');
  console.log('   Email:    admin@tienda-demo.com');
  console.log('   Password: password123');
  console.log('');
  console.log('   SYSTEM ADMIN:');
  console.log('   Email:    superadmin@stockflow.com');
  console.log('   Password: admin123!');
  console.log('   URL:      /system-admin/login');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
