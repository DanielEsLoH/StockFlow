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

function randomDate(daysBack: number): Date {
  const days = Math.floor(Math.random() * daysBack);
  return daysAgo(days);
}

async function main() {
  console.log('🌱 Checking database...\n');

  // ============================================================================
  // CHECK: Skip seeding if database already has data
  // ============================================================================
  const existingAdmin = await prisma.systemAdmin.count();
  if (existingAdmin > 0) {
    console.log('✅ Database already has data, skipping seed.\n');
    return;
  }

  console.log('📭 Database is empty, starting seed...\n');

  // ============================================================================
  // STEP 1: Clean existing data (reverse order of foreign keys)
  // ============================================================================
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

  console.log('🗑️  Cleaned existing data\n');

  // ============================================================================
  // STEP 2: Create System Admins
  // ============================================================================
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

  const supportAdmin = await prisma.systemAdmin.create({
    data: {
      email: 'soporte@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Carlos',
      lastName: 'Soporte',
      role: 'SUPPORT',
      status: 'ACTIVE',
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
    },
  });

  console.log('✅ System Admins created: 3');

  // ============================================================================
  // STEP 3: Create Tenants
  // ============================================================================

  // Tenant 1: PRO Plan (Main demo tenant)
  const tenantDemo = await prisma.tenant.create({
    data: {
      name: 'Tienda Demo',
      slug: 'tienda-demo',
      email: 'admin@tienda-demo.com',
      phone: '+57 300 123 4567',
      status: 'ACTIVE',
      plan: 'PRO',
      maxUsers: 3,
      maxProducts: 2000,
      maxInvoices: -1,
      maxWarehouses: 10,
    },
  });

  // Tenant 2: ENTERPRISE Plan
  const tenantEnterprise = await prisma.tenant.create({
    data: {
      name: 'Distribuidora Nacional',
      slug: 'distribuidora-nacional',
      email: 'admin@distribuidoranacional.com',
      phone: '+57 1 234 5678',
      status: 'ACTIVE',
      plan: 'PLUS',
      maxUsers: 8,
      maxProducts: -1,
      maxInvoices: -1,
      maxWarehouses: 100,
    },
  });

  // Tenant 3: TRIAL Plan (with EMPRENDEDOR as base)
  const tenantTrial = await prisma.tenant.create({
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

  // Tenant 4: PYME Plan
  const tenantBasic = await prisma.tenant.create({
    data: {
      name: 'Papelería Central',
      slug: 'papeleria-central',
      email: 'admin@papeleriacentral.com',
      phone: '+57 4 987 6543',
      status: 'ACTIVE',
      plan: 'PYME',
      maxUsers: 2,
      maxProducts: 500,
      maxInvoices: -1,
      maxWarehouses: 2,
    },
  });

  console.log('✅ Tenants created: 4');

  // ============================================================================
  // STEP 4: Create Users with hashed passwords
  // ============================================================================
  const hashedPassword = await bcrypt.hash('password123', 10);

  // --- Tenant Demo Users ---
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
      lastLoginAt: daysAgo(1),
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
      lastLoginAt: daysAgo(2),
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
    },
  });

  const pendingUserDemo = await prisma.user.create({
    data: {
      tenantId: tenantDemo.id,
      email: 'nuevo@tienda-demo.com',
      password: hashedPassword,
      firstName: 'Nuevo',
      lastName: 'Usuario',
      role: 'EMPLOYEE',
      status: 'PENDING',
      emailVerified: false,
    },
  });

  // --- Tenant Enterprise Users ---
  const adminEnterprise = await prisma.user.create({
    data: {
      tenantId: tenantEnterprise.id,
      email: 'admin@distribuidoranacional.com',
      password: hashedPassword,
      firstName: 'Roberto',
      lastName: 'Silva',
      phone: '+57 1 111 2222',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  // --- Tenant Trial Users ---
  const adminTrial = await prisma.user.create({
    data: {
      tenantId: tenantTrial.id,
      email: 'admin@nuevonegocio.com',
      password: hashedPassword,
      firstName: 'Patricia',
      lastName: 'Mendoza',
      phone: '+57 311 555 4444',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  // --- Tenant Basic Users ---
  const adminBasic = await prisma.user.create({
    data: {
      tenantId: tenantBasic.id,
      email: 'admin@papeleriacentral.com',
      password: hashedPassword,
      firstName: 'Fernando',
      lastName: 'Torres',
      phone: '+57 4 987 6543',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('✅ Users created: 8');

  // ============================================================================
  // STEP 5: Create Categories for Tenant Demo
  // ============================================================================
  const categoryElectronica = await prisma.category.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Electrónica',
      description: 'Productos electrónicos y tecnología',
      color: '#3b82f6',
    },
  });

  const categoryRopa = await prisma.category.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Ropa',
      description: 'Prendas de vestir y accesorios',
      color: '#10b981',
    },
  });

  const categoryAlimentos = await prisma.category.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Alimentos',
      description: 'Productos alimenticios',
      color: '#f59e0b',
    },
  });

  const categoryHogar = await prisma.category.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Hogar',
      description: 'Artículos para el hogar',
      color: '#8b5cf6',
    },
  });

  const categoryDeportes = await prisma.category.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Deportes',
      description: 'Equipamiento deportivo',
      color: '#ef4444',
    },
  });

  console.log('✅ Categories created: 5');

  // ============================================================================
  // STEP 6: Create Products for Tenant Demo
  // ============================================================================

  // Electronics - Normal stock
  const productLaptop = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryElectronica.id,
      sku: 'ELEC-001',
      name: 'Laptop Dell Inspiron 15',
      description: 'Laptop Dell Inspiron 15 pulgadas, procesador Intel Core i5, 8GB RAM, 256GB SSD',
      costPrice: 1500000,
      salePrice: 2100000,
      taxRate: 19,
      stock: 15,
      minStock: 5,
      maxStock: 50,
      barcode: '7501234567890',
      brand: 'Dell',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productMouse = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryElectronica.id,
      sku: 'ELEC-002',
      name: 'Mouse Logitech M185',
      description: 'Mouse inalámbrico Logitech M185 con receptor USB',
      costPrice: 25000,
      salePrice: 45000,
      taxRate: 19,
      stock: 50,
      minStock: 10,
      brand: 'Logitech',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productTeclado = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryElectronica.id,
      sku: 'ELEC-003',
      name: 'Teclado Mecánico RGB',
      description: 'Teclado mecánico con iluminación RGB y switches azules',
      costPrice: 120000,
      salePrice: 180000,
      taxRate: 19,
      stock: 30,
      minStock: 5,
      brand: 'Redragon',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  // Electronics - LOW STOCK (for notifications)
  const productAudifonos = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryElectronica.id,
      sku: 'ELEC-004',
      name: 'Audífonos Sony WH-1000XM4',
      description: 'Audífonos inalámbricos con cancelación de ruido',
      costPrice: 800000,
      salePrice: 1200000,
      taxRate: 19,
      stock: 3, // LOW STOCK - below minStock
      minStock: 5,
      brand: 'Sony',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productMonitor = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryElectronica.id,
      sku: 'ELEC-005',
      name: 'Monitor Samsung 27"',
      description: 'Monitor LED 27 pulgadas Full HD',
      costPrice: 450000,
      salePrice: 650000,
      taxRate: 19,
      stock: 2, // LOW STOCK - below minStock
      minStock: 5,
      brand: 'Samsung',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  // Electronics - OUT OF STOCK
  const productTablet = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryElectronica.id,
      sku: 'ELEC-006',
      name: 'Tablet iPad Air',
      description: 'iPad Air 10.9" 64GB WiFi',
      costPrice: 1800000,
      salePrice: 2500000,
      taxRate: 19,
      stock: 0, // OUT OF STOCK
      minStock: 3,
      brand: 'Apple',
      unit: 'UND',
      status: 'OUT_OF_STOCK',
    },
  });

  // Clothing
  const productCamiseta = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryRopa.id,
      sku: 'ROPA-001',
      name: 'Camiseta Polo Azul',
      description: 'Camiseta tipo polo color azul marino, algodón 100%',
      costPrice: 30000,
      salePrice: 65000,
      taxRate: 19,
      stock: 25,
      minStock: 10,
      brand: 'Lacoste',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productPantalon = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryRopa.id,
      sku: 'ROPA-002',
      name: 'Pantalón Jean Negro',
      description: 'Pantalón jean negro clásico, corte recto',
      costPrice: 80000,
      salePrice: 120000,
      taxRate: 19,
      stock: 40,
      minStock: 15,
      brand: "Levi's",
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productChaqueta = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryRopa.id,
      sku: 'ROPA-003',
      name: 'Chaqueta de Cuero',
      description: 'Chaqueta de cuero sintético negra',
      costPrice: 150000,
      salePrice: 280000,
      taxRate: 19,
      stock: 8, // LOW STOCK
      minStock: 10,
      brand: 'Zara',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  // Food products
  const productArroz = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryAlimentos.id,
      sku: 'ALIM-001',
      name: 'Arroz Diana 500g',
      description: 'Arroz blanco Diana 500 gramos',
      costPrice: 2000,
      salePrice: 3500,
      taxRate: 0,
      stock: 100,
      minStock: 20,
      brand: 'Diana',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productAceite = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryAlimentos.id,
      sku: 'ALIM-002',
      name: 'Aceite Girasol 1L',
      description: 'Aceite de girasol 1 litro',
      costPrice: 5000,
      salePrice: 8500,
      taxRate: 0,
      stock: 80,
      minStock: 20,
      brand: 'Chef',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productCafe = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryAlimentos.id,
      sku: 'ALIM-003',
      name: 'Café Juan Valdez 500g',
      description: 'Café molido Juan Valdez 500 gramos, origen Huila',
      costPrice: 10000,
      salePrice: 15000,
      taxRate: 5,
      stock: 60,
      minStock: 15,
      brand: 'Juan Valdez',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productChocolate = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryAlimentos.id,
      sku: 'ALIM-004',
      name: 'Chocolate Jet',
      description: 'Barra de chocolate con leche',
      costPrice: 1500,
      salePrice: 2500,
      taxRate: 0,
      stock: 5, // LOW STOCK
      minStock: 50,
      brand: 'Jet',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  // Home products
  const productSilla = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryHogar.id,
      sku: 'HOG-001',
      name: 'Silla Oficina Ergonómica',
      description: 'Silla de oficina ergonómica con soporte lumbar',
      costPrice: 350000,
      salePrice: 520000,
      taxRate: 19,
      stock: 12,
      minStock: 5,
      brand: 'Herman Miller',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productLampara = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryHogar.id,
      sku: 'HOG-002',
      name: 'Lámpara LED Escritorio',
      description: 'Lámpara LED de escritorio con dimmer',
      costPrice: 45000,
      salePrice: 75000,
      taxRate: 19,
      stock: 1, // CRITICAL LOW STOCK
      minStock: 10,
      brand: 'Philips',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  // Sports products
  const productBalon = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryDeportes.id,
      sku: 'DEP-001',
      name: 'Balón de Fútbol Pro',
      description: 'Balón de fútbol profesional tamaño 5',
      costPrice: 60000,
      salePrice: 95000,
      taxRate: 19,
      stock: 20,
      minStock: 10,
      brand: 'Adidas',
      unit: 'UND',
      status: 'ACTIVE',
    },
  });

  const productYogaMat = await prisma.product.create({
    data: {
      tenantId: tenantDemo.id,
      categoryId: categoryDeportes.id,
      sku: 'DEP-002',
      name: 'Colchoneta Yoga Premium',
      description: 'Colchoneta de yoga antideslizante 6mm',
      costPrice: 40000,
      salePrice: 75000,
      taxRate: 19,
      stock: 0, // OUT OF STOCK
      minStock: 8,
      brand: 'Manduka',
      unit: 'UND',
      status: 'OUT_OF_STOCK',
    },
  });

  const allProducts = [
    productLaptop,
    productMouse,
    productTeclado,
    productAudifonos,
    productMonitor,
    productTablet,
    productCamiseta,
    productPantalon,
    productChaqueta,
    productArroz,
    productAceite,
    productCafe,
    productChocolate,
    productSilla,
    productLampara,
    productBalon,
    productYogaMat,
  ];

  console.log('✅ Products created: 17');

  // ============================================================================
  // STEP 7: Create Warehouses
  // ============================================================================
  const warehouseMain = await prisma.warehouse.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Almacén Principal',
      code: 'ALM-01',
      address: 'Calle 123 #45-67',
      city: 'Medellín',
      phone: '+57 4 123 4567',
      isMain: true,
      status: 'ACTIVE',
    },
  });

  const warehouseSecondary = await prisma.warehouse.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Bodega Norte',
      code: 'ALM-02',
      address: 'Carrera 80 #10-20',
      city: 'Medellín',
      phone: '+57 4 234 5678',
      isMain: false,
      status: 'ACTIVE',
    },
  });

  const warehouseInactive = await prisma.warehouse.create({
    data: {
      tenantId: tenantDemo.id,
      name: 'Bodega Sur (Cerrada)',
      code: 'ALM-03',
      address: 'Avenida Las Vegas #99-10',
      city: 'Envigado',
      phone: '+57 4 345 6789',
      isMain: false,
      status: 'INACTIVE',
    },
  });

  console.log('✅ Warehouses created: 3');

  // ============================================================================
  // STEP 8: Create Warehouse Stock for all products
  // ============================================================================
  for (const product of allProducts) {
    // Main warehouse has 70% of stock
    const mainQty = Math.floor(product.stock * 0.7);
    const secondaryQty = product.stock - mainQty;

    await prisma.warehouseStock.create({
      data: {
        tenantId: tenantDemo.id,
        warehouseId: warehouseMain.id,
        productId: product.id,
        quantity: mainQty,
      },
    });

    if (secondaryQty > 0) {
      await prisma.warehouseStock.create({
        data: {
          tenantId: tenantDemo.id,
          warehouseId: warehouseSecondary.id,
          productId: product.id,
          quantity: secondaryQty,
        },
      });
    }
  }

  console.log('✅ Warehouse stock distributed across warehouses');

  // ============================================================================
  // STEP 9: Create Customers
  // ============================================================================
  const customerCarlos = await prisma.customer.create({
    data: {
      tenantId: tenantDemo.id,
      documentType: 'CC',
      documentNumber: '1234567890',
      name: 'Carlos Rodríguez',
      email: 'carlos@example.com',
      phone: '+57 300 333 3333',
      address: 'Calle 10 #20-30',
      city: 'Medellín',
      state: 'Antioquia',
      status: 'ACTIVE',
    },
  });

  const customerAna = await prisma.customer.create({
    data: {
      tenantId: tenantDemo.id,
      documentType: 'NIT',
      documentNumber: '900123456-7',
      name: 'Ana Martínez',
      email: 'ana@distribuidoraxyz.com',
      phone: '+57 300 444 4444',
      businessName: 'Distribuidora XYZ SAS',
      taxId: '900123456-7',
      address: 'Carrera 50 #30-40',
      city: 'Medellín',
      state: 'Antioquia',
      status: 'ACTIVE',
    },
  });

  const customerPedro = await prisma.customer.create({
    data: {
      tenantId: tenantDemo.id,
      documentType: 'CC',
      documentNumber: '9876543210',
      name: 'Pedro Gómez',
      email: 'pedro@example.com',
      phone: '+57 300 555 5555',
      address: 'Avenida 80 #50-60',
      city: 'Bogotá',
      state: 'Cundinamarca',
      status: 'ACTIVE',
    },
  });

  const customerTechStore = await prisma.customer.create({
    data: {
      tenantId: tenantDemo.id,
      documentType: 'NIT',
      documentNumber: '800999888-1',
      name: 'Tech Store Colombia',
      email: 'compras@techstore.co',
      phone: '+57 1 234 5678',
      businessName: 'Tech Store Colombia SAS',
      taxId: '800999888-1',
      address: 'Calle 72 #10-34, Piso 5',
      city: 'Bogotá',
      state: 'Cundinamarca',
      status: 'ACTIVE',
    },
  });

  const customerMaria = await prisma.customer.create({
    data: {
      tenantId: tenantDemo.id,
      documentType: 'CC',
      documentNumber: '5555666677',
      name: 'María Fernanda Díaz',
      email: 'mariaf@gmail.com',
      phone: '+57 315 789 0123',
      address: 'Carrera 43A #1Sur-70',
      city: 'Medellín',
      state: 'Antioquia',
      status: 'ACTIVE',
    },
  });

  const customerInactive = await prisma.customer.create({
    data: {
      tenantId: tenantDemo.id,
      documentType: 'CC',
      documentNumber: '1111222233',
      name: 'Cliente Antiguo',
      email: 'antiguo@example.com',
      phone: '+57 300 111 0000',
      address: 'Dirección anterior',
      city: 'Cali',
      state: 'Valle del Cauca',
      status: 'INACTIVE',
      notes: 'Cliente inactivo desde hace 1 año',
    },
  });

  console.log('✅ Customers created: 6');

  // ============================================================================
  // STEP 10: Create Invoices with various states
  // ============================================================================

  // Invoice 1: PAID (old)
  const invoice1 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerCarlos.id,
      userId: adminDemo.id,
      invoiceNumber: 'INV-00001',
      subtotal: 2190000,
      tax: 416100,
      discount: 0,
      total: 2606100,
      issueDate: daysAgo(30),
      dueDate: daysAgo(15),
      status: 'SENT',
      paymentStatus: 'PAID',
      notes: 'Venta de equipos electrónicos',
    },
  });

  // Invoice 2: PAID
  const invoice2 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerAna.id,
      userId: employeeDemo.id,
      invoiceNumber: 'INV-00002',
      subtotal: 685000,
      tax: 130150,
      discount: 0,
      total: 815150,
      issueDate: daysAgo(20),
      dueDate: daysAgo(5),
      status: 'SENT',
      paymentStatus: 'PAID',
      notes: 'Venta de ropa',
    },
  });

  // Invoice 3: OVERDUE (unpaid)
  const invoice3 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerPedro.id,
      userId: managerDemo.id,
      invoiceNumber: 'INV-00003',
      subtotal: 520000,
      tax: 98800,
      discount: 0,
      total: 618800,
      issueDate: daysAgo(45),
      dueDate: daysAgo(15), // 15 days overdue
      status: 'OVERDUE',
      paymentStatus: 'UNPAID',
      notes: 'Pendiente de pago - VENCIDA',
    },
  });

  // Invoice 4: PARTIALLY_PAID
  const invoice4 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerTechStore.id,
      userId: adminDemo.id,
      invoiceNumber: 'INV-00004',
      subtotal: 4200000,
      tax: 798000,
      discount: 100000,
      total: 4898000,
      issueDate: daysAgo(10),
      dueDate: daysFromNow(5),
      status: 'SENT',
      paymentStatus: 'PARTIALLY_PAID',
      notes: 'Venta mayorista - abono realizado',
    },
  });

  // Invoice 5: PENDING (recent)
  const invoice5 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerMaria.id,
      userId: employee2Demo.id,
      invoiceNumber: 'INV-00005',
      subtotal: 95000,
      tax: 18050,
      discount: 0,
      total: 113050,
      issueDate: daysAgo(2),
      dueDate: daysFromNow(28),
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      notes: 'Nueva venta',
    },
  });

  // Invoice 6: DRAFT
  const invoice6 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerCarlos.id,
      userId: managerDemo.id,
      invoiceNumber: 'INV-00006',
      subtotal: 180000,
      tax: 34200,
      discount: 0,
      total: 214200,
      issueDate: new Date(),
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      notes: 'Borrador - pendiente de revisión',
    },
  });

  // Invoice 7: SENT (recent, not overdue)
  const invoice7 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerAna.id,
      userId: adminDemo.id,
      invoiceNumber: 'INV-00007',
      subtotal: 1500000,
      tax: 285000,
      discount: 50000,
      total: 1735000,
      issueDate: daysAgo(5),
      dueDate: daysFromNow(25),
      status: 'SENT',
      paymentStatus: 'UNPAID',
      notes: 'Venta corporativa',
    },
  });

  // Invoice 8: CANCELLED
  const invoice8 = await prisma.invoice.create({
    data: {
      tenantId: tenantDemo.id,
      customerId: customerInactive.id,
      userId: adminDemo.id,
      invoiceNumber: 'INV-00008',
      subtotal: 350000,
      tax: 66500,
      discount: 0,
      total: 416500,
      issueDate: daysAgo(60),
      status: 'CANCELLED',
      paymentStatus: 'UNPAID',
      notes: 'Cancelada por solicitud del cliente',
    },
  });

  console.log('✅ Invoices created: 8');

  // ============================================================================
  // STEP 11: Create Invoice Items
  // ============================================================================

  // Invoice 1 items
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice1.id,
        productId: productLaptop.id,
        quantity: 1,
        unitPrice: 2100000,
        taxRate: 19,
        discount: 0,
        subtotal: 2100000,
        tax: 399000,
        total: 2499000,
      },
      {
        invoiceId: invoice1.id,
        productId: productMouse.id,
        quantity: 2,
        unitPrice: 45000,
        taxRate: 19,
        discount: 0,
        subtotal: 90000,
        tax: 17100,
        total: 107100,
      },
    ],
  });

  // Invoice 2 items
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice2.id,
        productId: productCamiseta.id,
        quantity: 5,
        unitPrice: 65000,
        taxRate: 19,
        discount: 0,
        subtotal: 325000,
        tax: 61750,
        total: 386750,
      },
      {
        invoiceId: invoice2.id,
        productId: productPantalon.id,
        quantity: 3,
        unitPrice: 120000,
        taxRate: 19,
        discount: 0,
        subtotal: 360000,
        tax: 68400,
        total: 428400,
      },
    ],
  });

  // Invoice 3 items
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice3.id,
        productId: productSilla.id,
        quantity: 1,
        unitPrice: 520000,
        taxRate: 19,
        discount: 0,
        subtotal: 520000,
        tax: 98800,
        total: 618800,
      },
    ],
  });

  // Invoice 4 items (large order)
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice4.id,
        productId: productLaptop.id,
        quantity: 2,
        unitPrice: 2100000,
        taxRate: 19,
        discount: 100000,
        subtotal: 4200000,
        tax: 798000,
        total: 4898000,
      },
    ],
  });

  // Invoice 5 items
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice5.id,
        productId: productBalon.id,
        quantity: 1,
        unitPrice: 95000,
        taxRate: 19,
        discount: 0,
        subtotal: 95000,
        tax: 18050,
        total: 113050,
      },
    ],
  });

  // Invoice 6 items (draft)
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice6.id,
        productId: productTeclado.id,
        quantity: 1,
        unitPrice: 180000,
        taxRate: 19,
        discount: 0,
        subtotal: 180000,
        tax: 34200,
        total: 214200,
      },
    ],
  });

  // Invoice 7 items
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice7.id,
        productId: productAudifonos.id,
        quantity: 1,
        unitPrice: 1200000,
        taxRate: 19,
        discount: 50000,
        subtotal: 1200000,
        tax: 228000,
        total: 1378000,
      },
      {
        invoiceId: invoice7.id,
        productId: productMouse.id,
        quantity: 4,
        unitPrice: 45000,
        taxRate: 19,
        discount: 0,
        subtotal: 180000,
        tax: 34200,
        total: 214200,
      },
      {
        invoiceId: invoice7.id,
        productId: productTeclado.id,
        quantity: 2,
        unitPrice: 180000,
        taxRate: 19,
        discount: 0,
        subtotal: 360000,
        tax: 68400,
        total: 428400,
      },
    ],
  });

  // Invoice 8 items (cancelled)
  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice8.id,
        productId: productChaqueta.id,
        quantity: 1,
        unitPrice: 280000,
        taxRate: 19,
        discount: 0,
        subtotal: 280000,
        tax: 53200,
        total: 333200,
      },
    ],
  });

  console.log('✅ Invoice items created: 13');

  // ============================================================================
  // STEP 12: Create Payments
  // ============================================================================

  // Payment for Invoice 1 (full)
  await prisma.payment.create({
    data: {
      tenantId: tenantDemo.id,
      invoiceId: invoice1.id,
      amount: 2606100,
      method: 'BANK_TRANSFER',
      reference: 'TRF-001-2024',
      paymentDate: daysAgo(25),
      notes: 'Pago completo por transferencia',
    },
  });

  // Payment for Invoice 2 (full via Nequi)
  await prisma.payment.create({
    data: {
      tenantId: tenantDemo.id,
      invoiceId: invoice2.id,
      amount: 815150,
      method: 'NEQUI',
      reference: 'NEQ-12345678',
      paymentDate: daysAgo(18),
      notes: 'Pago por Nequi',
    },
  });

  // Partial payment for Invoice 4
  await prisma.payment.create({
    data: {
      tenantId: tenantDemo.id,
      invoiceId: invoice4.id,
      amount: 2000000,
      method: 'BANK_TRANSFER',
      reference: 'TRF-004-2024',
      paymentDate: daysAgo(8),
      notes: 'Abono inicial 40%',
    },
  });

  await prisma.payment.create({
    data: {
      tenantId: tenantDemo.id,
      invoiceId: invoice4.id,
      amount: 1000000,
      method: 'CREDIT_CARD',
      reference: 'CC-VISA-9999',
      paymentDate: daysAgo(3),
      notes: 'Segundo abono',
    },
  });

  console.log('✅ Payments created: 4');

  // ============================================================================
  // STEP 13: Create Stock Movements
  // ============================================================================
  await prisma.stockMovement.createMany({
    data: [
      // Initial purchases
      {
        tenantId: tenantDemo.id,
        productId: productLaptop.id,
        warehouseId: warehouseMain.id,
        userId: adminDemo.id,
        type: 'PURCHASE',
        quantity: 20,
        reason: 'Compra inicial de inventario',
        notes: 'Orden de compra #PO-001',
        createdAt: daysAgo(60),
      },
      {
        tenantId: tenantDemo.id,
        productId: productMouse.id,
        warehouseId: warehouseMain.id,
        userId: adminDemo.id,
        type: 'PURCHASE',
        quantity: 100,
        reason: 'Compra inicial de inventario',
        createdAt: daysAgo(60),
      },
      {
        tenantId: tenantDemo.id,
        productId: productAudifonos.id,
        warehouseId: warehouseMain.id,
        userId: adminDemo.id,
        type: 'PURCHASE',
        quantity: 15,
        reason: 'Reposición de stock',
        createdAt: daysAgo(30),
      },
      // Sales
      {
        tenantId: tenantDemo.id,
        productId: productLaptop.id,
        warehouseId: warehouseMain.id,
        userId: adminDemo.id,
        type: 'SALE',
        quantity: -1,
        reason: 'Venta factura INV-00001',
        invoiceId: invoice1.id,
        createdAt: daysAgo(30),
      },
      {
        tenantId: tenantDemo.id,
        productId: productMouse.id,
        warehouseId: warehouseMain.id,
        userId: adminDemo.id,
        type: 'SALE',
        quantity: -2,
        reason: 'Venta factura INV-00001',
        invoiceId: invoice1.id,
        createdAt: daysAgo(30),
      },
      {
        tenantId: tenantDemo.id,
        productId: productCamiseta.id,
        warehouseId: warehouseMain.id,
        userId: employeeDemo.id,
        type: 'SALE',
        quantity: -5,
        reason: 'Venta factura INV-00002',
        invoiceId: invoice2.id,
        createdAt: daysAgo(20),
      },
      {
        tenantId: tenantDemo.id,
        productId: productAudifonos.id,
        warehouseId: warehouseMain.id,
        userId: adminDemo.id,
        type: 'SALE',
        quantity: -12,
        reason: 'Ventas varias',
        createdAt: daysAgo(15),
      },
      // Transfers between warehouses
      {
        tenantId: tenantDemo.id,
        productId: productPantalon.id,
        warehouseId: warehouseMain.id,
        userId: managerDemo.id,
        type: 'TRANSFER',
        quantity: -10,
        reason: 'Transferencia a Bodega Norte',
        createdAt: daysAgo(10),
      },
      {
        tenantId: tenantDemo.id,
        productId: productPantalon.id,
        warehouseId: warehouseSecondary.id,
        userId: managerDemo.id,
        type: 'TRANSFER',
        quantity: 10,
        reason: 'Recepción de Almacén Principal',
        createdAt: daysAgo(10),
      },
      // Adjustments
      {
        tenantId: tenantDemo.id,
        productId: productMouse.id,
        warehouseId: warehouseMain.id,
        userId: managerDemo.id,
        type: 'ADJUSTMENT',
        quantity: 5,
        reason: 'Corrección de inventario',
        notes: 'Diferencia en conteo físico',
        createdAt: daysAgo(5),
      },
      // Damaged
      {
        tenantId: tenantDemo.id,
        productId: productChocolate.id,
        warehouseId: warehouseMain.id,
        userId: employeeDemo.id,
        type: 'DAMAGED',
        quantity: -20,
        reason: 'Producto vencido',
        notes: 'Lote vencido - dar de baja',
        createdAt: daysAgo(3),
      },
      // Returns
      {
        tenantId: tenantDemo.id,
        productId: productTeclado.id,
        warehouseId: warehouseMain.id,
        userId: employee2Demo.id,
        type: 'RETURN',
        quantity: 2,
        reason: 'Devolución de cliente',
        notes: 'Cliente cambió de opinión',
        createdAt: daysAgo(2),
      },
    ],
  });

  console.log('✅ Stock movements created: 12');

  // ============================================================================
  // STEP 14: Create Audit Logs
  // ============================================================================
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: adminDemo.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: daysAgo(1),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: invoice1.id,
        newValues: { invoiceNumber: 'INV-00001', total: 2606100 },
        createdAt: daysAgo(30),
      },
      {
        tenantId: tenantDemo.id,
        userId: managerDemo.id,
        action: 'UPDATE',
        entityType: 'Product',
        entityId: productLaptop.id,
        oldValues: { salePrice: 2000000 },
        newValues: { salePrice: 2100000 },
        createdAt: daysAgo(25),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        action: 'EXPORT',
        entityType: 'Report',
        entityId: 'inventory-report',
        metadata: { format: 'PDF', records: 17 },
        createdAt: daysAgo(7),
      },
      {
        tenantId: tenantDemo.id,
        userId: employeeDemo.id,
        action: 'CREATE',
        entityType: 'Customer',
        entityId: customerMaria.id,
        newValues: { name: 'María Fernanda Díaz' },
        createdAt: daysAgo(5),
      },
    ],
  });

  console.log('✅ Audit logs created: 5');

  // ============================================================================
  // STEP 15: Create Invitations
  // ============================================================================
  await prisma.invitation.createMany({
    data: [
      {
        email: 'nuevoempleado@gmail.com',
        tenantId: tenantDemo.id,
        role: 'EMPLOYEE',
        token: 'inv-token-001-pending',
        expiresAt: daysFromNow(7),
        invitedById: adminDemo.id,
        status: 'PENDING',
      },
      {
        email: 'nuevogerente@empresa.com',
        tenantId: tenantDemo.id,
        role: 'MANAGER',
        token: 'inv-token-002-pending',
        expiresAt: daysFromNow(5),
        invitedById: adminDemo.id,
        status: 'PENDING',
      },
      {
        email: 'invitacion.expirada@test.com',
        tenantId: tenantDemo.id,
        role: 'EMPLOYEE',
        token: 'inv-token-003-expired',
        expiresAt: daysAgo(2),
        invitedById: adminDemo.id,
        status: 'EXPIRED',
      },
      {
        email: 'usuario.aceptado@email.com',
        tenantId: tenantDemo.id,
        role: 'EMPLOYEE',
        token: 'inv-token-004-accepted',
        expiresAt: daysAgo(20),
        invitedById: managerDemo.id,
        status: 'ACCEPTED',
        acceptedAt: daysAgo(25),
      },
    ],
  });

  console.log('✅ Invitations created: 4');

  // ============================================================================
  // STEP 16: Create Notifications
  // ============================================================================
  await prisma.notification.createMany({
    data: [
      // LOW STOCK alerts (HIGH priority)
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'LOW_STOCK',
        title: 'Stock bajo: Audífonos Sony WH-1000XM4',
        message: 'El producto "Audífonos Sony WH-1000XM4" tiene solo 3 unidades. El mínimo es 5.',
        priority: 'HIGH',
        read: false,
        link: `/products/${productAudifonos.id}`,
        metadata: { productId: productAudifonos.id, currentStock: 3, minStock: 5 },
        createdAt: daysAgo(1),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'LOW_STOCK',
        title: 'Stock bajo: Monitor Samsung 27"',
        message: 'El producto "Monitor Samsung 27"" tiene solo 2 unidades. El mínimo es 5.',
        priority: 'HIGH',
        read: false,
        link: `/products/${productMonitor.id}`,
        metadata: { productId: productMonitor.id, currentStock: 2, minStock: 5 },
        createdAt: daysAgo(1),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'LOW_STOCK',
        title: 'Stock crítico: Lámpara LED Escritorio',
        message: 'El producto "Lámpara LED Escritorio" tiene solo 1 unidad. ¡Reposición urgente!',
        priority: 'URGENT',
        read: false,
        link: `/products/${productLampara.id}`,
        metadata: { productId: productLampara.id, currentStock: 1, minStock: 10 },
        createdAt: new Date(),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'LOW_STOCK',
        title: 'Stock bajo: Chocolate Jet',
        message: 'El producto "Chocolate Jet" tiene solo 5 unidades. El mínimo es 50.',
        priority: 'MEDIUM',
        read: true,
        readAt: daysAgo(0),
        link: `/products/${productChocolate.id}`,
        metadata: { productId: productChocolate.id, currentStock: 5, minStock: 50 },
        createdAt: daysAgo(2),
      },

      // OUT OF STOCK alerts (URGENT priority)
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'OUT_OF_STOCK',
        title: 'Sin stock: Tablet iPad Air',
        message: 'El producto "Tablet iPad Air" está agotado. No hay unidades disponibles.',
        priority: 'URGENT',
        read: false,
        link: `/products/${productTablet.id}`,
        metadata: { productId: productTablet.id },
        createdAt: daysAgo(3),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'OUT_OF_STOCK',
        title: 'Sin stock: Colchoneta Yoga Premium',
        message: 'El producto "Colchoneta Yoga Premium" está agotado.',
        priority: 'URGENT',
        read: true,
        readAt: daysAgo(1),
        link: `/products/${productYogaMat.id}`,
        metadata: { productId: productYogaMat.id },
        createdAt: daysAgo(5),
      },

      // INVOICE notifications
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'NEW_INVOICE',
        title: 'Nueva factura creada',
        message: 'Se ha creado la factura INV-00007 por $1,735,000 para Distribuidora XYZ SAS.',
        priority: 'MEDIUM',
        read: true,
        readAt: daysAgo(4),
        link: `/invoices/${invoice7.id}`,
        metadata: { invoiceId: invoice7.id, invoiceNumber: 'INV-00007', total: 1735000 },
        createdAt: daysAgo(5),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'INVOICE_PAID',
        title: 'Factura pagada',
        message: 'La factura INV-00001 ha sido pagada completamente.',
        priority: 'LOW',
        read: true,
        readAt: daysAgo(24),
        link: `/invoices/${invoice1.id}`,
        metadata: { invoiceId: invoice1.id, invoiceNumber: 'INV-00001' },
        createdAt: daysAgo(25),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'INVOICE_OVERDUE',
        title: 'Factura vencida: INV-00003',
        message: 'La factura INV-00003 por $618,800 está vencida hace 15 días.',
        priority: 'HIGH',
        read: false,
        link: `/invoices/${invoice3.id}`,
        metadata: { invoiceId: invoice3.id, invoiceNumber: 'INV-00003', daysOverdue: 15 },
        createdAt: daysAgo(1),
      },

      // PAYMENT notifications
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Pago recibido',
        message: 'Se recibió un pago de $1,000,000 para la factura INV-00004.',
        priority: 'MEDIUM',
        read: false,
        link: `/invoices/${invoice4.id}`,
        metadata: { invoiceId: invoice4.id, amount: 1000000 },
        createdAt: daysAgo(3),
      },

      // NEW_CUSTOMER notification
      {
        tenantId: tenantDemo.id,
        userId: employeeDemo.id,
        type: 'NEW_CUSTOMER',
        title: 'Nuevo cliente registrado',
        message: 'Se ha registrado el cliente "María Fernanda Díaz".',
        priority: 'LOW',
        read: true,
        readAt: daysAgo(4),
        link: `/customers/${customerMaria.id}`,
        metadata: { customerId: customerMaria.id, customerName: 'María Fernanda Díaz' },
        createdAt: daysAgo(5),
      },

      // REPORT_READY notification
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'REPORT_READY',
        title: 'Reporte de inventario listo',
        message: 'El reporte de inventario mensual está listo para descargar.',
        priority: 'LOW',
        read: false,
        link: '/reports/inventory',
        metadata: { reportType: 'inventory', period: 'monthly' },
        createdAt: daysAgo(7),
      },

      // SYSTEM notifications
      {
        tenantId: tenantDemo.id,
        userId: null, // System-wide notification
        type: 'SYSTEM',
        title: 'Mantenimiento programado',
        message: 'El sistema estará en mantenimiento el próximo domingo de 2:00 AM a 4:00 AM.',
        priority: 'MEDIUM',
        read: false,
        createdAt: daysAgo(2),
      },
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'SYSTEM',
        title: 'Actualización de seguridad aplicada',
        message: 'Se ha aplicado una actualización de seguridad importante al sistema.',
        priority: 'HIGH',
        read: true,
        readAt: daysAgo(6),
        createdAt: daysAgo(7),
      },

      // INFO notifications
      {
        tenantId: tenantDemo.id,
        userId: adminDemo.id,
        type: 'INFO',
        title: 'Bienvenido a StockFlow',
        message: 'Gracias por usar StockFlow. Explora las nuevas funciones en la sección de ayuda.',
        priority: 'LOW',
        read: true,
        readAt: daysAgo(30),
        createdAt: daysAgo(60),
      },
      {
        tenantId: tenantDemo.id,
        userId: managerDemo.id,
        type: 'INFO',
        title: 'Nuevas funciones disponibles',
        message: 'Se han agregado nuevas funciones de reportes. ¡Explóralas!',
        priority: 'LOW',
        read: false,
        link: '/reports',
        createdAt: daysAgo(10),
      },

      // Notifications for other users
      {
        tenantId: tenantDemo.id,
        userId: managerDemo.id,
        type: 'INVOICE_OVERDUE',
        title: 'Factura vencida: INV-00003',
        message: 'La factura INV-00003 requiere seguimiento urgente.',
        priority: 'HIGH',
        read: false,
        link: `/invoices/${invoice3.id}`,
        createdAt: daysAgo(1),
      },
      {
        tenantId: tenantDemo.id,
        userId: employeeDemo.id,
        type: 'INFO',
        title: 'Recordatorio de cierre de caja',
        message: 'Recuerda realizar el cierre de caja al final del día.',
        priority: 'MEDIUM',
        read: false,
        createdAt: new Date(),
      },
    ],
  });

  console.log('✅ Notifications created: 18');

  // ============================================================================
  // STEP 17: Create System Admin Audit Logs
  // ============================================================================
  await prisma.systemAdminAuditLog.createMany({
    data: [
      {
        adminId: superAdmin.id,
        action: 'CREATE_TENANT',
        entityType: 'Tenant',
        entityId: tenantDemo.id,
        details: { tenantName: 'Tienda Demo', plan: 'PRO' },
        createdAt: daysAgo(60),
      },
      {
        adminId: superAdmin.id,
        action: 'CREATE_TENANT',
        entityType: 'Tenant',
        entityId: tenantEnterprise.id,
        details: { tenantName: 'Distribuidora Nacional', plan: 'PLUS' },
        createdAt: daysAgo(45),
      },
      {
        adminId: supportAdmin.id,
        action: 'VIEW_TENANT',
        entityType: 'Tenant',
        entityId: tenantDemo.id,
        details: { reason: 'Soporte técnico solicitado' },
        createdAt: daysAgo(10),
      },
      {
        adminId: billingAdmin.id,
        action: 'UPDATE_PLAN',
        entityType: 'Tenant',
        entityId: tenantBasic.id,
        details: { oldPlan: 'EMPRENDEDOR', newPlan: 'PYME' },
        createdAt: daysAgo(20),
      },
    ],
  });

  console.log('✅ System Admin audit logs created: 4');

  // ============================================================================
  // DONE!
  // ============================================================================
  console.log('\n🎉 Seeding completed successfully!\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 SYSTEM ADMIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Super Admin: ${superAdmin.email}`);
  console.log(`   Support:     ${supportAdmin.email}`);
  console.log(`   Billing:     ${billingAdmin.email}`);
  console.log(`   Password:    ${systemAdminPassword}`);
  console.log('   Access:      /system-admin/login\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 TENANT USER CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Tienda Demo (PRO):');
  console.log('     Admin:    admin@tienda-demo.com / password123');
  console.log('     Manager:  gerente@tienda-demo.com / password123');
  console.log('     Employee: empleado@tienda-demo.com / password123');
  console.log('');
  console.log('   Distribuidora Nacional (ENTERPRISE):');
  console.log('     Admin:    admin@distribuidoranacional.com / password123');
  console.log('');
  console.log('   Nuevo Negocio (TRIAL):');
  console.log('     Admin:    admin@nuevonegocio.com / password123');
  console.log('');
  console.log('   Papelería Central (BASIC):');
  console.log('     Admin:    admin@papeleriacentral.com / password123\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SEED DATA SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   System Admins:    3');
  console.log('   Tenants:          4 (PRO, ENTERPRISE, TRIAL, BASIC)');
  console.log('   Users:            8');
  console.log('   Categories:       5');
  console.log('   Products:         17 (incl. 5 low stock, 2 out of stock)');
  console.log('   Warehouses:       3');
  console.log('   Customers:        6');
  console.log('   Invoices:         8 (various statuses)');
  console.log('   Payments:         4');
  console.log('   Stock Movements:  12');
  console.log('   Audit Logs:       5');
  console.log('   Invitations:      4');
  console.log('   Notifications:    18\n');
}

main()
  .catch((e) => {
    console.error('❌ Error in seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
