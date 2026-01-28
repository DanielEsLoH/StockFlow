import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  // STEP 1.5: Create System Admin (Super Admin for platform management)
  // ============================================================================
  const systemAdminPassword = process.env.SYSTEM_ADMIN_PASSWORD || 'admin123!';
  const hashedSystemAdminPassword = await bcrypt.hash(systemAdminPassword, 12);

  const systemAdmin = await prisma.systemAdmin.create({
    data: {
      email: process.env.SYSTEM_ADMIN_EMAIL || 'superadmin@stockflow.com',
      password: hashedSystemAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ System Admin created:', systemAdmin.email);

  // ============================================================================
  // STEP 2: Create Tenant
  // ============================================================================
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Tienda Demo',
      slug: 'tienda-demo',
      email: 'demo@stockflow.co',
      phone: '+57 300 123 4567',
      status: 'ACTIVE',
      plan: 'PRO',
      maxUsers: 20,
      maxProducts: -1,
      maxInvoices: -1,
      maxWarehouses: 10,
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // ============================================================================
  // STEP 3: Create Users with hashed passwords
  // ============================================================================
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@tienda-demo.com',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+57 300 111 1111',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'empleado@tienda-demo.com',
      password: hashedPassword,
      firstName: 'María',
      lastName: 'González',
      phone: '+57 300 222 2222',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('✅ Users created:', adminUser.email, employeeUser.email);

  // ============================================================================
  // STEP 4: Create Categories
  // ============================================================================
  const categoryElectronica = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: 'Electrónica',
      description: 'Productos electrónicos',
      color: '#3b82f6',
    },
  });

  const categoryRopa = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: 'Ropa',
      description: 'Prendas de vestir',
      color: '#10b981',
    },
  });

  const categoryAlimentos = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: 'Alimentos',
      description: 'Productos alimenticios',
      color: '#f59e0b',
    },
  });

  console.log('✅ Categories created: 3');

  // ============================================================================
  // STEP 5: Create Products
  // ============================================================================
  const productLaptop = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: categoryElectronica.id,
      sku: 'PROD-001',
      name: 'Laptop Dell Inspiron 15',
      description: 'Laptop Dell Inspiron 15 pulgadas, procesador Intel Core i5',
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
      tenantId: tenant.id,
      categoryId: categoryElectronica.id,
      sku: 'PROD-002',
      name: 'Mouse Logitech M185',
      description: 'Mouse inalámbrico Logitech M185',
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
      tenantId: tenant.id,
      categoryId: categoryElectronica.id,
      sku: 'PROD-003',
      name: 'Teclado Mecánico RGB',
      description: 'Teclado mecánico con iluminación RGB',
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

  const productCamiseta = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: categoryRopa.id,
      sku: 'PROD-004',
      name: 'Camiseta Polo Azul',
      description: 'Camiseta tipo polo color azul',
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
      tenantId: tenant.id,
      categoryId: categoryRopa.id,
      sku: 'PROD-005',
      name: 'Pantalón Jean Negro',
      description: 'Pantalón jean negro clásico',
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

  const productArroz = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: categoryAlimentos.id,
      sku: 'PROD-006',
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
      tenantId: tenant.id,
      categoryId: categoryAlimentos.id,
      sku: 'PROD-007',
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
      tenantId: tenant.id,
      categoryId: categoryAlimentos.id,
      sku: 'PROD-008',
      name: 'Café Juan Valdez 500g',
      description: 'Café molido Juan Valdez 500 gramos',
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

  const allProducts = [
    productLaptop,
    productMouse,
    productTeclado,
    productCamiseta,
    productPantalon,
    productArroz,
    productAceite,
    productCafe,
  ];

  console.log('✅ Products created: 8');

  // ============================================================================
  // STEP 6: Create Warehouse
  // ============================================================================
  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: 'Almacén Principal',
      code: 'ALM-01',
      address: 'Calle 123 #45-67',
      city: 'Medellín',
      phone: '+57 4 123 4567',
      isMain: true,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Warehouse created:', warehouse.name);

  // ============================================================================
  // STEP 7: Create Warehouse Stock for all products
  // ============================================================================
  for (const product of allProducts) {
    await prisma.warehouseStock.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: product.stock,
      },
    });
  }

  console.log('✅ Warehouse stock created: 8 products');

  // ============================================================================
  // STEP 8: Create Customers
  // ============================================================================
  const customerCarlos = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
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
      tenantId: tenant.id,
      documentType: 'NIT',
      documentNumber: '900123456-7',
      name: 'Ana Martínez',
      email: 'ana@example.com',
      phone: '+57 300 444 4444',
      businessName: 'Distribuidora XYZ SAS',
      taxId: '900123456-7',
      address: 'Carrera 50 #30-40',
      city: 'Medellín',
      status: 'ACTIVE',
    },
  });

  // Customer for future use
  await prisma.customer.create({
    data: {
      tenantId: tenant.id,
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

  console.log('✅ Customers created: 3');

  // ============================================================================
  // STEP 9: Create Invoices
  // ============================================================================

  // Invoice 1 calculations:
  // Laptop Dell: 1 x 2,100,000 = 2,100,000 (subtotal) + 399,000 (tax 19%) = 2,499,000
  // Mouse Logitech: 2 x 45,000 = 90,000 (subtotal) + 17,100 (tax 19%) = 107,100
  // Total: subtotal = 2,190,000, tax = 416,100, total = 2,606,100
  const invoice1Subtotal = 2190000;
  const invoice1Tax = 416100;
  const invoice1Total = 2606100;

  const invoice1 = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: customerCarlos.id,
      userId: adminUser.id,
      invoiceNumber: 'INV-00001',
      subtotal: invoice1Subtotal,
      tax: invoice1Tax,
      discount: 0,
      total: invoice1Total,
      issueDate: new Date(),
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      notes: 'Factura de prueba 1',
    },
  });

  // Invoice 2 calculations:
  // Camiseta Polo: 5 x 65,000 = 325,000 (subtotal) + 61,750 (tax 19%) = 386,750
  // Pantalón Jean: 3 x 120,000 = 360,000 (subtotal) + 68,400 (tax 19%) = 428,400
  // Total: subtotal = 685,000, tax = 130,150, total = 815,150
  const invoice2Subtotal = 685000;
  const invoice2Tax = 130150;
  const invoice2Total = 815150;

  const invoice2 = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: customerAna.id,
      userId: employeeUser.id,
      invoiceNumber: 'INV-00002',
      subtotal: invoice2Subtotal,
      tax: invoice2Tax,
      discount: 0,
      total: invoice2Total,
      issueDate: new Date(),
      status: 'SENT',
      paymentStatus: 'PAID',
      notes: 'Factura de prueba 2',
    },
  });

  console.log(
    '✅ Invoices created:',
    invoice1.invoiceNumber,
    invoice2.invoiceNumber,
  );

  // ============================================================================
  // STEP 10: Create Invoice Items
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

  console.log('✅ Invoice items created: 4');

  // ============================================================================
  // STEP 11: Create Payment for Invoice 2
  // ============================================================================
  await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      invoiceId: invoice2.id,
      amount: invoice2Total,
      method: 'BANK_TRANSFER',
      reference: 'REF-001',
      paymentDate: new Date(),
      notes: 'Pago completo',
    },
  });

  console.log('✅ Payment created: 1');

  // ============================================================================
  // STEP 12: Create Stock Movements
  // ============================================================================
  await prisma.stockMovement.createMany({
    data: [
      {
        tenantId: tenant.id,
        productId: productLaptop.id,
        warehouseId: warehouse.id,
        userId: adminUser.id,
        type: 'PURCHASE',
        quantity: 10,
        reason: 'Compra inicial',
        notes: 'Compra de inventario inicial de laptops',
      },
      {
        tenantId: tenant.id,
        productId: productLaptop.id,
        warehouseId: warehouse.id,
        userId: adminUser.id,
        type: 'SALE',
        quantity: -1,
        reason: 'Venta factura INV-00001',
        invoiceId: invoice1.id,
      },
      {
        tenantId: tenant.id,
        productId: productMouse.id,
        warehouseId: warehouse.id,
        userId: adminUser.id,
        type: 'ADJUSTMENT',
        quantity: 5,
        reason: 'Corrección de inventario',
        notes: 'Ajuste por diferencia en conteo físico',
      },
      {
        tenantId: tenant.id,
        productId: productCamiseta.id,
        warehouseId: warehouse.id,
        userId: employeeUser.id,
        type: 'SALE',
        quantity: -5,
        reason: 'Venta factura INV-00002',
        invoiceId: invoice2.id,
      },
    ],
  });

  console.log('✅ Stock movements created: 4');

  // ============================================================================
  // DONE!
  // ============================================================================
  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('🔐 System Admin (Super Admin) credentials:');
  console.log(`   Email: ${systemAdmin.email}`);
  console.log(`   Password: ${systemAdminPassword}`);
  console.log('   Access: /system-admin/login\n');
  console.log('📧 Demo Tenant User credentials:');
  console.log('   Admin: admin@tienda-demo.com / password123');
  console.log('   Employee: empleado@tienda-demo.com / password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error in seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
