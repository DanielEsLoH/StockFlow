// Load environment variables before anything else
import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
  Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule, PrismaService } from '../src/prisma';
import { AuthModule } from '../src/auth/auth.module';
import { CommonModule } from '../src/common';
import { ArcjetModule, ArcjetService } from '../src/arcjet';
import { configuration, validateEnv } from '../src/config';
import { TenantMiddleware } from '../src/common/middleware';
import { InvoicesModule } from '../src/invoices/invoices.module';
import { PaymentsModule } from '../src/payments/payments.module';
import { ProductsModule } from '../src/products/products.module';
import { CustomersModule } from '../src/customers/customers.module';
import {
  UserRole,
  ProductStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  DocumentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Unique identifier to avoid test data collision
const testIdentifier = `invoices-e2e-${Date.now()}`;

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface InvoiceItemResponse {
  id: string;
  invoiceId: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

interface InvoiceResponse {
  id: string;
  tenantId: string;
  customerId: string | null;
  userId: string | null;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  items?: InvoiceItemResponse[];
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PaginatedInvoicesResponse {
  data: InvoiceResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PaymentResponse {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paymentDate: string;
}

// ============================================================================
// TEST MODULE
// ============================================================================

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    CommonModule,
    ArcjetModule,
    AuthModule,
    ProductsModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
  ],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

// ============================================================================
// E2E TESTS
// ============================================================================

describe('Invoices E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let tenant: { id: string; name: string; slug: string };

  // Test users
  let adminUser: { id: string; email: string; accessToken: string };
  let managerUser: { id: string; email: string; accessToken: string };
  let staffUser: { id: string; email: string; accessToken: string };

  // Test customer
  let customer: { id: string; name: string };

  // Test products
  let product1: { id: string; name: string; sku: string; stock: number };
  let product2: { id: string; name: string; sku: string; stock: number };

  // Test invoices (created during tests)
  let draftInvoice: { id: string; invoiceNumber: string };
  let sentInvoice: { id: string; invoiceNumber: string };

  const hashedPassword = bcrypt.hashSync('TestPassword123!', 10);

  // Mock ArcjetService to disable rate limiting and bot protection in tests
  const mockArcjetService = {
    isProtectionEnabled: jest.fn().mockReturnValue(false),
    getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
    checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    checkBot: jest.fn().mockResolvedValue({ allowed: true }),
    onModuleInit: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideProvider(ArcjetService)
      .useValue(mockArcjetService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes (matching main.ts configuration)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create Test Tenant with high invoice limit
    tenant = await prisma.tenant.create({
      data: {
        name: `Invoice Test Tenant ${testIdentifier}`,
        slug: `invoice-test-tenant-${testIdentifier}`,
        email: `invoice-test-${testIdentifier}@test.com`,
        status: 'ACTIVE',
        plan: 'PRO',
        maxInvoices: 1000,
      },
    });

    // Create Admin User
    const adminRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin-${testIdentifier}@invoice-test.com`,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Create Manager User
    const managerRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `manager-${testIdentifier}@invoice-test.com`,
        password: hashedPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: UserRole.MANAGER,
        status: 'ACTIVE',
      },
    });

    // Create Staff User (limited permissions)
    const staffRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `staff-${testIdentifier}@invoice-test.com`,
        password: hashedPassword,
        firstName: 'Staff',
        lastName: 'User',
        role: UserRole.EMPLOYEE,
        status: 'ACTIVE',
      },
    });

    // Create Test Customer 1
    const createdCustomer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: `Test Customer One ${testIdentifier}`,
        email: `customer1-${testIdentifier}@test.com`,
        phone: '+1234567890',
        documentType: DocumentType.CC,
        documentNumber: `123456789-${testIdentifier}`,
      },
    });
    customer = { id: createdCustomer.id, name: createdCustomer.name };

    // Create Test Customer 2 (kept for data completeness)
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: `Test Customer Two ${testIdentifier}`,
        email: `customer2-${testIdentifier}@test.com`,
        phone: '+0987654321',
        documentType: DocumentType.NIT,
        documentNumber: `987654321-${testIdentifier}`,
      },
    });

    // Create Test Product 1
    const createdProduct1 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `Test Product One ${testIdentifier}`,
        sku: `TEST-PROD-001-${testIdentifier}`,
        description: 'First test product',
        salePrice: 100,
        costPrice: 50,
        stock: 100,
        status: ProductStatus.ACTIVE,
      },
    });
    product1 = {
      id: createdProduct1.id,
      name: createdProduct1.name,
      sku: createdProduct1.sku,
      stock: createdProduct1.stock,
    };

    // Create Test Product 2
    const createdProduct2 = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: `Test Product Two ${testIdentifier}`,
        sku: `TEST-PROD-002-${testIdentifier}`,
        description: 'Second test product',
        salePrice: 200,
        costPrice: 100,
        stock: 50,
        status: ProductStatus.ACTIVE,
      },
    });
    product2 = {
      id: createdProduct2.id,
      name: createdProduct2.name,
      sku: createdProduct2.sku,
      stock: createdProduct2.stock,
    };

    // Login users to get access tokens
    const loginResponseAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `admin-${testIdentifier}@invoice-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyAdmin = loginResponseAdmin.body as LoginResponse;
    adminUser = {
      id: adminRecord.id,
      email: adminRecord.email,
      accessToken: loginBodyAdmin.accessToken,
    };

    const loginResponseManager = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `manager-${testIdentifier}@invoice-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyManager = loginResponseManager.body as LoginResponse;
    managerUser = {
      id: managerRecord.id,
      email: managerRecord.email,
      accessToken: loginBodyManager.accessToken,
    };

    const loginResponseStaff = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `staff-${testIdentifier}@invoice-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBodyStaff = loginResponseStaff.body as LoginResponse;
    staffUser = {
      id: staffRecord.id,
      email: staffRecord.email,
      accessToken: loginBodyStaff.accessToken,
    };
  }

  async function cleanupTestData() {
    if (!tenant?.id) return;

    // Delete payments
    await prisma.payment.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete stock movements
    await prisma.stockMovement.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete invoice items
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { tenantId: tenant.id } },
    });

    // Delete invoices
    await prisma.invoice.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete products
    await prisma.product.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete customers
    await prisma.customer.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete users
    await prisma.user.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Delete tenant
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });
  }

  // ==========================================================================
  // TEST: POST /invoices - Create Invoice Successfully
  // ==========================================================================

  describe('POST /invoices - Create Invoice', () => {
    it('should create an invoice successfully with items', async () => {
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 2,
            unitPrice: 100,
            taxRate: 19,
            discount: 0,
          },
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test invoice notes',
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const invoice = response.body as InvoiceResponse;

      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{5}$/);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
      expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(invoice.customerId).toBe(customer.id);
      expect(invoice.notes).toBe('Test invoice notes');

      // Verify totals calculated correctly
      // subtotal = 2 * 100 = 200
      // tax = 200 * 0.19 = 38
      // total = 200 + 38 = 238
      expect(invoice.subtotal).toBe(200);
      expect(invoice.tax).toBe(38);
      expect(invoice.total).toBe(238);

      // Verify items are included
      expect(invoice.items).toBeDefined();
      expect(invoice.items).toHaveLength(1);
      expect(invoice.items![0].quantity).toBe(2);
      expect(invoice.items![0].unitPrice).toBe(100);

      // Store for later tests
      draftInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      };
    });

    it('should create an invoice with multiple items and calculate totals correctly', async () => {
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 3,
            unitPrice: 100,
            taxRate: 19,
            discount: 10,
          },
          {
            productId: product2.id,
            quantity: 2,
            unitPrice: 200,
            taxRate: 19,
            discount: 20,
          },
        ],
        notes: 'Multi-item invoice',
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const invoice = response.body as InvoiceResponse;

      // Item 1: subtotal = 3 * 100 = 300, tax = 300 * 0.19 = 57, total = 300 + 57 - 10 = 347
      // Item 2: subtotal = 2 * 200 = 400, tax = 400 * 0.19 = 76, total = 400 + 76 - 20 = 456
      // Invoice: subtotal = 700, tax = 133, discount = 30, total = 803
      expect(invoice.subtotal).toBe(700);
      expect(invoice.tax).toBe(133);
      expect(invoice.discount).toBe(30);
      expect(invoice.total).toBe(803);
      expect(invoice.items).toHaveLength(2);
    });

    it('should allow MANAGER to create invoice', async () => {
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const invoice = response.body as InvoiceResponse;
      expect(invoice.id).toBeDefined();
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
    });

    it('should NOT allow STAFF to create invoice (403 Forbidden)', async () => {
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send(createDto)
        .expect(403);
    });

    it('should generate sequential invoice numbers', async () => {
      // Create two invoices and verify sequential numbers
      const createDto1 = {
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 50,
            taxRate: 19,
          },
        ],
      };

      const response1 = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto1)
        .expect(201);

      const invoice1 = response1.body as InvoiceResponse;
      const num1 = parseInt(invoice1.invoiceNumber.replace('INV-', ''), 10);

      const response2 = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto1)
        .expect(201);

      const invoice2 = response2.body as InvoiceResponse;
      const num2 = parseInt(invoice2.invoiceNumber.replace('INV-', ''), 10);

      expect(num2).toBe(num1 + 1);
    });
  });

  // ==========================================================================
  // TEST: POST /invoices - Validation Errors
  // ==========================================================================

  describe('POST /invoices - Validation Errors', () => {
    it('should return validation error for missing items', async () => {
      const createDto = {
        customerId: customer.id,
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toContain(
        'La factura debe tener al menos un item',
      );
    });

    it('should return validation error for invalid product ID', async () => {
      const createDto = {
        items: [
          {
            productId: 'not-a-uuid',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return validation error for quantity less than 1', async () => {
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 0,
            unitPrice: 100,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 404 for non-existent product', async () => {
      // Use a valid CUID format that doesn't exist in the database
      const nonExistentProductId = 'cnonexistent00000product00';
      const createDto = {
        items: [
          {
            productId: nonExistentProductId,
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(404);
    });

    it('should return 404 for non-existent customer', async () => {
      // Use a valid CUID format that doesn't exist in the database
      const nonExistentCustomerId = 'cnonexistent000customer000';
      const createDto = {
        customerId: nonExistentCustomerId,
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: GET /invoices - List Invoices with Pagination
  // ==========================================================================

  describe('GET /invoices - List Invoices', () => {
    it('should list invoices with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedInvoicesResponse;

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBeGreaterThan(0);
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices?page=1&limit=2')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedInvoicesResponse;

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it('should allow STAFF to list invoices (read access)', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedInvoicesResponse;
      expect(result.data).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: GET /invoices - Filter by Status, PaymentStatus, CustomerId
  // ==========================================================================

  describe('GET /invoices - Filtering', () => {
    it('should filter invoices by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices?status=DRAFT')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedInvoicesResponse;

      result.data.forEach((invoice) => {
        expect(invoice.status).toBe(InvoiceStatus.DRAFT);
      });
    });

    it('should filter invoices by paymentStatus', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices?paymentStatus=UNPAID')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedInvoicesResponse;

      result.data.forEach((invoice) => {
        expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
      });
    });

    it('should filter invoices by customerId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices?customerId=${customer.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedInvoicesResponse;

      result.data.forEach((invoice) => {
        expect(invoice.customerId).toBe(customer.id);
      });
    });

    it('should combine multiple filters', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/invoices?status=DRAFT&paymentStatus=UNPAID&customerId=${customer.id}`,
        )
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const result = response.body as PaginatedInvoicesResponse;

      result.data.forEach((invoice) => {
        expect(invoice.status).toBe(InvoiceStatus.DRAFT);
        expect(invoice.paymentStatus).toBe(PaymentStatus.UNPAID);
        expect(invoice.customerId).toBe(customer.id);
      });
    });
  });

  // ==========================================================================
  // TEST: GET /invoices/:id - Get Single Invoice with Items
  // ==========================================================================

  describe('GET /invoices/:id - Get Single Invoice', () => {
    it('should get a single invoice with all items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices/${draftInvoice.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const invoice = response.body as InvoiceResponse;

      expect(invoice.id).toBe(draftInvoice.id);
      expect(invoice.invoiceNumber).toBe(draftInvoice.invoiceNumber);
      expect(invoice.items).toBeDefined();
      expect(invoice.items!.length).toBeGreaterThan(0);
      expect(invoice.customer).toBeDefined();
      expect(invoice.customer!.id).toBe(customer.id);
    });

    it('should return 404 for non-existent invoice', async () => {
      await request(app.getHttpServer())
        .get('/invoices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });

    it('should allow STAFF to view invoice details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices/${draftInvoice.id}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .expect(200);

      const invoice = response.body as InvoiceResponse;
      expect(invoice.id).toBe(draftInvoice.id);
    });
  });

  // ==========================================================================
  // TEST: PATCH /invoices/:id - Update DRAFT Invoice
  // ==========================================================================

  describe('PATCH /invoices/:id - Update Invoice', () => {
    it('should update DRAFT invoice notes and dueDate', async () => {
      const updateDto = {
        notes: 'Updated invoice notes',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${draftInvoice.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(updateDto)
        .expect(200);

      const invoice = response.body as InvoiceResponse;

      expect(invoice.notes).toBe('Updated invoice notes');
      expect(invoice.dueDate).toBeDefined();
    });

    it('should allow MANAGER to update DRAFT invoice', async () => {
      const updateDto = {
        notes: 'Manager updated notes',
      };

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${draftInvoice.id}`)
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(updateDto)
        .expect(200);

      const invoice = response.body as InvoiceResponse;
      expect(invoice.notes).toBe('Manager updated notes');
    });

    it('should NOT allow STAFF to update invoice', async () => {
      const updateDto = {
        notes: 'Staff trying to update',
      };

      await request(app.getHttpServer())
        .patch(`/invoices/${draftInvoice.id}`)
        .set('Authorization', `Bearer ${staffUser.accessToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: PATCH /invoices/:id/send - Send Invoice
  // ==========================================================================

  describe('PATCH /invoices/:id/send - Send Invoice', () => {
    let invoiceToSend: { id: string; invoiceNumber: string };

    beforeAll(async () => {
      // Create a fresh invoice to send
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const invoice = response.body as InvoiceResponse;
      invoiceToSend = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      };
    });

    it('should send a DRAFT invoice (status changes to SENT)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/invoices/${invoiceToSend.id}/send`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const invoice = response.body as InvoiceResponse;

      expect(invoice.status).toBe(InvoiceStatus.SENT);

      // Store for later tests
      sentInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      };
    });

    it('should NOT allow sending already SENT invoice', async () => {
      await request(app.getHttpServer())
        .patch(`/invoices/${sentInvoice.id}/send`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });

    it('should allow MANAGER to send invoice', async () => {
      // Create another invoice for manager to send
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 50,
            taxRate: 19,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const createdInvoice = createResponse.body as InvoiceResponse;

      const sendResponse = await request(app.getHttpServer())
        .patch(`/invoices/${createdInvoice.id}/send`)
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(200);

      const sentInv = sendResponse.body as InvoiceResponse;
      expect(sentInv.status).toBe(InvoiceStatus.SENT);
    });
  });

  // ==========================================================================
  // TEST: PATCH /invoices/:id - Cannot Update Non-DRAFT Invoice
  // ==========================================================================

  describe('PATCH /invoices/:id - Cannot Update Non-DRAFT Invoice', () => {
    it('should NOT allow updating a SENT invoice', async () => {
      const updateDto = {
        notes: 'Trying to update sent invoice',
      };

      const response = await request(app.getHttpServer())
        .patch(`/invoices/${sentInvoice.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(updateDto)
        .expect(400);

      expect(response.body.message).toContain('borrador');
    });
  });

  // ==========================================================================
  // TEST: POST /invoices/:id/items - Add Item to DRAFT Invoice
  // ==========================================================================

  describe('POST /invoices/:id/items - Add Item to Invoice', () => {
    let invoiceForItems: { id: string };

    beforeAll(async () => {
      // Create a fresh invoice for item tests
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const invoice = response.body as InvoiceResponse;
      invoiceForItems = { id: invoice.id };
    });

    it('should add item to DRAFT invoice', async () => {
      const addItemDto = {
        productId: product2.id,
        quantity: 2,
        unitPrice: 200,
        taxRate: 19,
        discount: 10,
      };

      const response = await request(app.getHttpServer())
        .post(`/invoices/${invoiceForItems.id}/items`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(addItemDto)
        .expect(201);

      const invoice = response.body as InvoiceResponse;

      expect(invoice.items).toHaveLength(2);

      // Verify totals were recalculated
      // Original item: subtotal=100, tax=19, total=119
      // New item: subtotal=400, tax=76, total=466 (with discount 10)
      // Combined: subtotal=500, tax=95, discount=10, total=585
      expect(invoice.subtotal).toBe(500);
      expect(invoice.tax).toBe(95);
      expect(invoice.discount).toBe(10);
      expect(invoice.total).toBe(585);
    });

    it('should NOT allow adding item to non-DRAFT invoice', async () => {
      const addItemDto = {
        productId: product1.id,
        quantity: 1,
        unitPrice: 100,
        taxRate: 19,
      };

      await request(app.getHttpServer())
        .post(`/invoices/${sentInvoice.id}/items`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(addItemDto)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: DELETE /invoices/:id - Delete DRAFT Invoice
  // ==========================================================================

  describe('DELETE /invoices/:id - Delete Invoice', () => {
    let invoiceToDelete: { id: string };

    beforeEach(async () => {
      // Create a fresh invoice to delete
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 50,
            taxRate: 19,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const invoice = response.body as InvoiceResponse;
      invoiceToDelete = { id: invoice.id };
    });

    it('should delete DRAFT invoice', async () => {
      await request(app.getHttpServer())
        .delete(`/invoices/${invoiceToDelete.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(204);

      // Verify invoice no longer exists
      await request(app.getHttpServer())
        .get(`/invoices/${invoiceToDelete.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });

    it('should NOT allow MANAGER to delete invoice (ADMIN only)', async () => {
      await request(app.getHttpServer())
        .delete(`/invoices/${invoiceToDelete.id}`)
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(403);
    });

    it('should NOT allow deleting SENT invoice', async () => {
      await request(app.getHttpServer())
        .delete(`/invoices/${sentInvoice.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: PATCH /invoices/:id/cancel - Cancel Invoice
  // ==========================================================================

  describe('PATCH /invoices/:id/cancel - Cancel Invoice', () => {
    let invoiceToCancel: { id: string };

    beforeAll(async () => {
      // Create and send an invoice to cancel
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const createdInvoice = createResponse.body as InvoiceResponse;

      // Send the invoice first
      await request(app.getHttpServer())
        .patch(`/invoices/${createdInvoice.id}/send`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      invoiceToCancel = { id: createdInvoice.id };
    });

    it('should cancel a SENT invoice', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/invoices/${invoiceToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const invoice = response.body as InvoiceResponse;
      expect(invoice.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should NOT allow cancelling already CANCELLED invoice', async () => {
      await request(app.getHttpServer())
        .patch(`/invoices/${invoiceToCancel.id}/cancel`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });

    it('should NOT allow MANAGER to cancel invoice (ADMIN only)', async () => {
      // Create another invoice to test manager permissions
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 50,
            taxRate: 19,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const createdInvoice = createResponse.body as InvoiceResponse;

      await request(app.getHttpServer())
        .patch(`/invoices/${createdInvoice.id}/cancel`)
        .set('Authorization', `Bearer ${managerUser.accessToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // TEST: Payment Recording Integration
  // ==========================================================================

  describe('Payment Recording Integration', () => {
    let invoiceForPayment: { id: string; total: number };

    beforeAll(async () => {
      // Create and send an invoice for payment tests
      const createDto = {
        customerId: customer.id,
        items: [
          {
            productId: product1.id,
            quantity: 2,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const createdInvoice = createResponse.body as InvoiceResponse;

      // Send the invoice
      const sendResponse = await request(app.getHttpServer())
        .patch(`/invoices/${createdInvoice.id}/send`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const sentInv = sendResponse.body as InvoiceResponse;
      invoiceForPayment = {
        id: sentInv.id,
        total: sentInv.total,
      };
    });

    it('should record a partial payment', async () => {
      const paymentDto = {
        invoiceId: invoiceForPayment.id,
        amount: 100,
        method: PaymentMethod.CASH,
        reference: 'PAY-001',
        notes: 'Partial payment',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      const payment = response.body as PaymentResponse;

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(100);
      expect(payment.method).toBe(PaymentMethod.CASH);
      expect(payment.invoiceId).toBe(invoiceForPayment.id);

      // Verify invoice payment status updated to PARTIALLY_PAID
      const invoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForPayment.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const updatedInvoice = invoiceResponse.body as InvoiceResponse;
      expect(updatedInvoice.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);
    });

    it('should get payments for an invoice', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForPayment.id}/payments`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const payments = response.body as PaymentResponse[];

      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0].invoiceId).toBe(invoiceForPayment.id);
    });

    it('should record full payment and update status to PAID', async () => {
      // Get the invoice to calculate remaining balance
      const invoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForPayment.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const invoice = invoiceResponse.body as InvoiceResponse;

      // Pay the remaining balance (total - 100 already paid)
      const remainingBalance = invoice.total - 100;

      const paymentDto = {
        invoiceId: invoiceForPayment.id,
        amount: remainingBalance,
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'PAY-002',
        notes: 'Final payment',
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(paymentDto)
        .expect(201);

      // Verify invoice payment status updated to PAID
      const updatedInvoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceForPayment.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const updatedInvoice = updatedInvoiceResponse.body as InvoiceResponse;
      expect(updatedInvoice.paymentStatus).toBe(PaymentStatus.PAID);
    });
  });

  // ==========================================================================
  // TEST: Authentication Required
  // ==========================================================================

  describe('Authentication Required', () => {
    it('should reject GET /invoices without authentication', async () => {
      await request(app.getHttpServer()).get('/invoices').expect(401);
    });

    it('should reject POST /invoices without authentication', async () => {
      await request(app.getHttpServer())
        .post('/invoices')
        .send({
          items: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: 100,
            },
          ],
        })
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // ==========================================================================
  // TEST: Stock Management Verification
  // ==========================================================================

  describe('Stock Management', () => {
    it('should reduce product stock when creating invoice', async () => {
      // Get initial stock
      const initialProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      const initialStock = initialProduct!.stock;

      // Create invoice with 5 units
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 5,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      // Verify stock was reduced
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });

      expect(updatedProduct!.stock).toBe(initialStock - 5);
    });

    it('should return error for insufficient stock', async () => {
      // Create a product with limited stock
      const limitedProduct = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          name: 'Limited Stock Product',
          sku: 'LIMITED-001',
          salePrice: 50,
          costPrice: 25,
          stock: 2,
          status: ProductStatus.ACTIVE,
        },
      });

      // Try to create invoice with more units than available
      const createDto = {
        items: [
          {
            productId: limitedProduct.id,
            quantity: 10,
            unitPrice: 50,
            taxRate: 19,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);

      // Clean up
      await prisma.product.delete({ where: { id: limitedProduct.id } });
    });

    it('should restore stock when cancelling invoice', async () => {
      // Get initial stock
      const initialProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      const initialStock = initialProduct!.stock;

      // Create and send invoice with 3 units
      const createDto = {
        items: [
          {
            productId: product1.id,
            quantity: 3,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const invoice = createResponse.body as InvoiceResponse;

      // Verify stock was reduced
      const afterCreateProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      expect(afterCreateProduct!.stock).toBe(initialStock - 3);

      // Cancel the invoice
      await request(app.getHttpServer())
        .patch(`/invoices/${invoice.id}/cancel`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      // Verify stock was restored
      const afterCancelProduct = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      expect(afterCancelProduct!.stock).toBe(initialStock);
    });
  });
});
