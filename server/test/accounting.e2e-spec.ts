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
import { AuthModule } from '../src/auth';
import { CommonModule } from '../src/common';
import { PermissionsModule } from '../src/common/permissions';
import { ArcjetModule, ArcjetService } from '../src/arcjet';
import { CacheModule } from '../src/cache';
import { configuration, validateEnv } from '../src/config';
import { TenantMiddleware } from '../src/common';
import { AccountingModule } from '../src/accounting';
import {
  UserRole,
  AccountType,
  AccountNature,
  JournalEntryStatus,
  AccountingPeriodStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Unique identifier to avoid test data collision
const testIdentifier = `accounting-e2e-${Date.now()}`;

// ============================================================================
// RESPONSE TYPE INTERFACES
// ============================================================================

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface AccountResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: AccountType;
  nature: AccountNature;
  parentId: string | null;
  level: number;
  isActive: boolean;
  isSystemAccount: boolean;
  isBankAccount: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface JournalEntryLineResponse {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  costCenterId: string | null;
  costCenterCode: string | null;
  costCenterName: string | null;
  description: string | null;
  debit: number;
  credit: number;
}

interface JournalEntryResponse {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  source: string;
  status: JournalEntryStatus;
  periodId: string | null;
  totalDebit: number;
  totalCredit: number;
  createdById: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  lines: JournalEntryLineResponse[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedJournalEntriesResponse {
  data: JournalEntryResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AccountingPeriodResponse {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AccountingPeriodStatus;
  closedAt: string | null;
  closedById: string | null;
  notes: string | null;
  entryCount: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  level: number;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface TrialBalanceReport {
  asOfDate: string;
  accounts: AccountBalance[];
  totalDebit: number;
  totalCredit: number;
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
    CacheModule,
    PermissionsModule,
    ArcjetModule,
    AuthModule,
    AccountingModule,
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

describe('Accounting E2E Tests', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tenant
  let tenant: { id: string; name: string; slug: string };

  // Test users
  let adminUser: { id: string; email: string; accessToken: string };

  // Created during tests
  let cajaAccountId: string;
  let bancosAccountId: string;
  let ingresosAccountId: string;
  let gastosAccountId: string;

  let draftEntryId: string;
  let postedEntryId: string;
  let periodId: string;

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
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create Test Tenant
    tenant = await prisma.tenant.create({
      data: {
        name: `Accounting Test Tenant ${testIdentifier}`,
        slug: `acct-test-tenant-${testIdentifier}`,
        email: `acct-test-${testIdentifier}@test.com`,
        status: 'ACTIVE',
        plan: 'PRO',
      },
    });

    // Create Admin User (ADMIN has all accounting permissions by default)
    const adminRecord = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `admin-${testIdentifier}@acct-test.com`,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Accounting',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // Login to get access token
    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `admin-${testIdentifier}@acct-test.com`,
        password: 'TestPassword123!',
      })
      .expect(200);

    const loginBody = loginAdmin.body as LoginResponse;
    adminUser = {
      id: adminRecord.id,
      email: adminRecord.email,
      accessToken: loginBody.accessToken,
    };
  }

  async function cleanupTestData() {
    if (!tenant?.id) return;

    // Delete in order of dependencies
    await prisma.journalEntryLine.deleteMany({
      where: { journalEntry: { tenantId: tenant.id } },
    });
    await prisma.journalEntry.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.accountingPeriod.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.account.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.user.deleteMany({
      where: { tenantId: tenant.id },
    });
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });
  }

  // ==========================================================================
  // TEST: POST /accounts - Create Accounts (Chart of Accounts / PUC)
  // ==========================================================================

  describe('POST /accounts - Create Accounts', () => {
    it('should create a Caja account (1105)', async () => {
      const createDto = {
        code: '1105',
        name: `Caja ${testIdentifier}`,
        description: 'Caja General',
        type: AccountType.ASSET,
        nature: AccountNature.DEBIT,
      };

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as AccountResponse;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.code).toBe('1105');
      expect(body.name).toBe(createDto.name);
      expect(body.type).toBe(AccountType.ASSET);
      expect(body.nature).toBe(AccountNature.DEBIT);
      expect(body.level).toBe(3); // 4 digits = level 3
      expect(body.isSystemAccount).toBe(false);

      cajaAccountId = body.id;
    });

    it('should create a Bancos account (1110)', async () => {
      const createDto = {
        code: '1110',
        name: `Bancos ${testIdentifier}`,
        description: 'Bancos Nacionales',
        type: AccountType.ASSET,
        nature: AccountNature.DEBIT,
        isBankAccount: true,
      };

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as AccountResponse;
      expect(body.code).toBe('1110');
      expect(body.isBankAccount).toBe(true);

      bancosAccountId = body.id;
    });

    it('should create an Ingresos account (4135)', async () => {
      const createDto = {
        code: '4135',
        name: `Ingresos Operacionales ${testIdentifier}`,
        type: AccountType.REVENUE,
        nature: AccountNature.CREDIT,
      };

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as AccountResponse;
      expect(body.code).toBe('4135');
      expect(body.type).toBe(AccountType.REVENUE);
      expect(body.nature).toBe(AccountNature.CREDIT);

      ingresosAccountId = body.id;
    });

    it('should create a Gastos account (5105)', async () => {
      const createDto = {
        code: '5105',
        name: `Gastos de Personal ${testIdentifier}`,
        type: AccountType.EXPENSE,
        nature: AccountNature.DEBIT,
      };

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as AccountResponse;
      expect(body.code).toBe('5105');
      expect(body.type).toBe(AccountType.EXPENSE);

      gastosAccountId = body.id;
    });

    it('should reject duplicate account code', async () => {
      const createDto = {
        code: '1105',
        name: 'Duplicate Caja',
        type: AccountType.ASSET,
        nature: AccountNature.DEBIT,
      };

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(409);
    });
  });

  // ==========================================================================
  // TEST: GET /accounts - List Chart of Accounts
  // ==========================================================================

  describe('GET /accounts - List Accounts', () => {
    it('should list all accounts ordered by code', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as AccountResponse[];
      expect(body).toBeDefined();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(4);

      // Verify ordering by code
      for (let i = 1; i < body.length; i++) {
        expect(body[i].code >= body[i - 1].code).toBe(true);
      }
    });

    it('should filter accounts by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ type: AccountType.ASSET })
        .expect(200);

      const body = response.body as AccountResponse[];
      body.forEach((account) => {
        expect(account.type).toBe(AccountType.ASSET);
      });
    });

    it('should search accounts by code or name', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ search: '1105' })
        .expect(200);

      const body = response.body as AccountResponse[];
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body.some((a) => a.code === '1105')).toBe(true);
    });
  });

  // ==========================================================================
  // TEST: POST /journal-entries - Create Journal Entry
  // ==========================================================================

  describe('POST /journal-entries - Create Journal Entry', () => {
    it('should create a balanced journal entry (debit=credit)', async () => {
      const createDto = {
        date: '2026-01-15',
        description: `E2E Test Entry - Sale ${testIdentifier}`,
        lines: [
          {
            accountId: cajaAccountId,
            description: 'Cash received',
            debit: 100000,
            credit: 0,
          },
          {
            accountId: ingresosAccountId,
            description: 'Revenue recognized',
            debit: 0,
            credit: 100000,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as JournalEntryResponse;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.entryNumber).toBeDefined();
      expect(body.status).toBe(JournalEntryStatus.DRAFT);
      expect(body.totalDebit).toBe(100000);
      expect(body.totalCredit).toBe(100000);
      expect(body.lines).toHaveLength(2);
      expect(body.source).toBe('MANUAL');

      // Verify line details
      const debitLine = body.lines.find((l) => l.debit > 0);
      const creditLine = body.lines.find((l) => l.credit > 0);
      expect(debitLine!.accountId).toBe(cajaAccountId);
      expect(creditLine!.accountId).toBe(ingresosAccountId);

      draftEntryId = body.id;
    });

    it('should create another journal entry for posting tests', async () => {
      const createDto = {
        date: '2026-01-16',
        description: `E2E Test Entry - Expense ${testIdentifier}`,
        lines: [
          {
            accountId: gastosAccountId,
            description: 'Salary expense',
            debit: 50000,
            credit: 0,
          },
          {
            accountId: bancosAccountId,
            description: 'Bank payment',
            debit: 0,
            credit: 50000,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as JournalEntryResponse;
      expect(body.status).toBe(JournalEntryStatus.DRAFT);
      expect(body.totalDebit).toBe(50000);
      expect(body.totalCredit).toBe(50000);

      postedEntryId = body.id;
    });

    it('should reject unbalanced journal entry', async () => {
      const createDto = {
        date: '2026-01-15',
        description: 'Unbalanced entry',
        lines: [
          {
            accountId: cajaAccountId,
            description: 'More debit',
            debit: 100000,
            credit: 0,
          },
          {
            accountId: ingresosAccountId,
            description: 'Less credit',
            debit: 0,
            credit: 50000,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should reject entry with line having both debit and credit', async () => {
      const createDto = {
        date: '2026-01-15',
        description: 'Both debit and credit on one line',
        lines: [
          {
            accountId: cajaAccountId,
            debit: 100,
            credit: 100, // Invalid: both > 0
          },
          {
            accountId: ingresosAccountId,
            debit: 0,
            credit: 0, // Invalid: both are 0
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should reject entry with non-existent account', async () => {
      const createDto = {
        date: '2026-01-15',
        description: 'Entry with fake account',
        lines: [
          {
            accountId: 'non-existent-account-id',
            debit: 1000,
            credit: 0,
          },
          {
            accountId: cajaAccountId,
            debit: 0,
            credit: 1000,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /journal-entries - List Journal Entries
  // ==========================================================================

  describe('GET /journal-entries - List Entries', () => {
    it('should list journal entries with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = response.body as PaginatedJournalEntriesResponse;
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.meta).toBeDefined();
      expect(body.meta.total).toBeGreaterThanOrEqual(2);
      expect(body.meta.page).toBe(1);
    });

    it('should filter entries by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ status: JournalEntryStatus.DRAFT })
        .expect(200);

      const body = response.body as PaginatedJournalEntriesResponse;
      body.data.forEach((entry) => {
        expect(entry.status).toBe(JournalEntryStatus.DRAFT);
      });
    });
  });

  // ==========================================================================
  // TEST: GET /journal-entries/:id - Get Entry with Lines
  // ==========================================================================

  describe('GET /journal-entries/:id - Get Entry Details', () => {
    it('should return entry with full line details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/journal-entries/${draftEntryId}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as JournalEntryResponse;
      expect(body.id).toBe(draftEntryId);
      expect(body.lines).toHaveLength(2);
      expect(body.lines[0].accountCode).toBeDefined();
      expect(body.lines[0].accountName).toBeDefined();
      expect(body.totalDebit).toBe(body.totalCredit);
    });

    it('should return 404 for non-existent entry', async () => {
      await request(app.getHttpServer())
        .get('/journal-entries/non-existent-id')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // TEST: PATCH /journal-entries/:id/post - Post Entry
  // ==========================================================================

  describe('PATCH /journal-entries/:id/post - Post Entry', () => {
    it('should post a draft entry successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/journal-entries/${draftEntryId}/post`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      const body = response.body as JournalEntryResponse;
      expect(body.status).toBe(JournalEntryStatus.POSTED);
      expect(body.postedAt).toBeDefined();
    });

    it('should post the second entry for trial balance tests', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/journal-entries/${postedEntryId}/post`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe(JournalEntryStatus.POSTED);
    });

    it('should reject posting an already posted entry', async () => {
      await request(app.getHttpServer())
        .patch(`/journal-entries/${draftEntryId}/post`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: Posted entries cannot be edited (void instead)
  // ==========================================================================

  describe('Posted entries validation', () => {
    it('should allow voiding a posted entry', async () => {
      // Create a new entry, post it, then void it
      const createRes = await request(app.getHttpServer())
        .post('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          date: '2026-01-20',
          description: `Void test entry ${testIdentifier}`,
          lines: [
            { accountId: cajaAccountId, debit: 5000, credit: 0 },
            { accountId: ingresosAccountId, debit: 0, credit: 5000 },
          ],
        })
        .expect(201);

      const entryId = (createRes.body as JournalEntryResponse).id;

      // Post it
      await request(app.getHttpServer())
        .patch(`/journal-entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      // Void it
      const voidRes = await request(app.getHttpServer())
        .patch(`/journal-entries/${entryId}/void`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ reason: 'E2E test void' })
        .expect(200);

      const body = voidRes.body as JournalEntryResponse;
      expect(body.status).toBe(JournalEntryStatus.VOIDED);
      expect(body.voidedAt).toBeDefined();
      expect(body.voidReason).toBe('E2E test void');
    });

    it('should reject voiding an already voided entry', async () => {
      // Create, post, void, then try to void again
      const createRes = await request(app.getHttpServer())
        .post('/journal-entries')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({
          date: '2026-01-21',
          description: `Double void test ${testIdentifier}`,
          lines: [
            { accountId: cajaAccountId, debit: 2000, credit: 0 },
            { accountId: ingresosAccountId, debit: 0, credit: 2000 },
          ],
        })
        .expect(201);

      const entryId = (createRes.body as JournalEntryResponse).id;

      await request(app.getHttpServer())
        .patch(`/journal-entries/${entryId}/post`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/journal-entries/${entryId}/void`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ reason: 'First void' })
        .expect(200);

      // Second void should fail
      await request(app.getHttpServer())
        .patch(`/journal-entries/${entryId}/void`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send({ reason: 'Second void attempt' })
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: POST /accounting-periods - Create Accounting Period
  // ==========================================================================

  describe('POST /accounting-periods - Create Period', () => {
    it('should create an accounting period', async () => {
      const createDto = {
        name: `Enero 2026 ${testIdentifier}`,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        notes: 'E2E test accounting period',
      };

      const response = await request(app.getHttpServer())
        .post('/accounting-periods')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(201);

      const body = response.body as AccountingPeriodResponse;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(createDto.name);
      expect(body.status).toBe(AccountingPeriodStatus.OPEN);
      expect(body.closedAt).toBeNull();

      periodId = body.id;
    });

    it('should reject overlapping accounting periods', async () => {
      const createDto = {
        name: `Overlapping Period ${testIdentifier}`,
        startDate: '2026-01-15', // Overlaps with the January period
        endDate: '2026-02-15',
      };

      await request(app.getHttpServer())
        .post('/accounting-periods')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(409);
    });

    it('should reject period where end date is before start date', async () => {
      const createDto = {
        name: 'Invalid Period',
        startDate: '2026-06-30',
        endDate: '2026-06-01', // End before start
      };

      await request(app.getHttpServer())
        .post('/accounting-periods')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  // ==========================================================================
  // TEST: GET /accounting/reports/trial-balance - Trial Balance
  // ==========================================================================

  describe('GET /accounting/reports/trial-balance - Trial Balance', () => {
    it('should return trial balance with correct totals', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounting/reports/trial-balance')
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .query({ asOfDate: '2026-12-31' })
        .expect(200);

      const body = response.body as TrialBalanceReport;
      expect(body).toBeDefined();
      expect(body.asOfDate).toBe('2026-12-31');
      expect(body.accounts).toBeDefined();
      expect(Array.isArray(body.accounts)).toBe(true);

      // Total debits must equal total credits
      expect(body.totalDebit).toBeCloseTo(body.totalCredit, 1);

      // Verify our test accounts appear in the trial balance
      // Entry 1: Caja debit 100000, Ingresos credit 100000
      // Entry 2: Gastos debit 50000, Bancos credit 50000
      // Voided entry should not affect balances (it was voided)
      const cajaBalance = body.accounts.find((a) => a.accountId === cajaAccountId);
      const ingresosBalance = body.accounts.find(
        (a) => a.accountId === ingresosAccountId,
      );
      const gastosBalance = body.accounts.find(
        (a) => a.accountId === gastosAccountId,
      );
      const bancosBalance = body.accounts.find(
        (a) => a.accountId === bancosAccountId,
      );

      // Caja: debit 100000 from entry 1
      expect(cajaBalance).toBeDefined();
      expect(cajaBalance!.totalDebit).toBe(100000);

      // Ingresos: credit 100000 from entry 1
      expect(ingresosBalance).toBeDefined();
      expect(ingresosBalance!.totalCredit).toBe(100000);

      // Gastos: debit 50000 from entry 2
      expect(gastosBalance).toBeDefined();
      expect(gastosBalance!.totalDebit).toBe(50000);

      // Bancos: credit 50000 from entry 2
      expect(bancosBalance).toBeDefined();
      expect(bancosBalance!.totalCredit).toBe(50000);
    });
  });

  // ==========================================================================
  // TEST: Unauthenticated access
  // ==========================================================================

  describe('Unauthenticated access', () => {
    it('should reject requests without auth token', async () => {
      await request(app.getHttpServer()).get('/accounts').expect(401);
    });

    it('should reject journal entry creation without auth', async () => {
      await request(app.getHttpServer())
        .post('/journal-entries')
        .send({
          date: '2026-01-15',
          description: 'Unauthorized entry',
          lines: [
            { accountId: cajaAccountId, debit: 1000, credit: 0 },
            { accountId: ingresosAccountId, debit: 0, credit: 1000 },
          ],
        })
        .expect(401);
    });
  });
});
