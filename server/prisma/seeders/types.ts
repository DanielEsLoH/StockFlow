import type { PrismaClient } from '@prisma/client';

// ============================================================================
// SEED CONTEXT — Typed container for all cross-seeder references
// ============================================================================

export interface TenantRef {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface UserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface WarehouseRef {
  id: string;
  name: string;
  code: string;
}

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  salePrice: number;
  costPrice: number;
  taxRate: number;
  categoryId: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string | null;
  status: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  paymentStatus: string;
  total: number;
  customerId: string;
  items: { productId: string; quantity: number; unitPrice: number; taxRate: number }[];
}

export interface SupplierRecord {
  id: string;
  name: string;
  documentNumber: string;
  paymentTerms: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
}

export interface SeedContext {
  // Tenants
  tenants: {
    demo: TenantRef;
    distribuidora: TenantRef;
    nuevo: TenantRef;
    papeleria: TenantRef;
  };

  // Users grouped by tenant
  users: {
    demo: {
      admin: UserRef;
      managers: UserRef[];
      employees: UserRef[];
      contador: UserRef;
      allActive: UserRef[];
    };
    distribuidora: {
      admin: UserRef;
      manager: UserRef;
      employees: UserRef[];
      contador: UserRef;
    };
    nuevo: {
      admin: UserRef;
    };
    papeleria: {
      admin: UserRef;
      manager: UserRef;
      employees: UserRef[];
      contador: UserRef;
    };
  };

  // Warehouses grouped by tenant
  warehouses: {
    demo: { main: WarehouseRef; active: WarehouseRef[]; store: WarehouseRef };
    distribuidora: { main: WarehouseRef; active: WarehouseRef[] };
    nuevo: { main: WarehouseRef };
    papeleria: { main: WarehouseRef; active: WarehouseRef[] };
  };

  // Products grouped by tenant
  products: {
    demo: ProductRecord[];
    distribuidora: ProductRecord[];
    nuevo: ProductRecord[];
    papeleria: ProductRecord[];
  };

  // Categories grouped by tenant
  categories: {
    demo: Record<string, CategoryRecord>;
    distribuidora: Record<string, CategoryRecord>;
    nuevo: Record<string, CategoryRecord>;
    papeleria: Record<string, CategoryRecord>;
  };

  // Customers grouped by tenant
  customers: {
    demo: CustomerRecord[];
    distribuidora: CustomerRecord[];
    nuevo: CustomerRecord[];
    papeleria: CustomerRecord[];
  };

  // Invoices grouped by tenant
  invoices: {
    demo: InvoiceRecord[];
    distribuidora: InvoiceRecord[];
    nuevo: InvoiceRecord[];
    papeleria: InvoiceRecord[];
  };

  // Suppliers grouped by tenant
  suppliers: {
    demo: SupplierRecord[];
    distribuidora: SupplierRecord[];
    nuevo: SupplierRecord[];
    papeleria: SupplierRecord[];
  };

  // Subscriptions by tenant
  subscriptions: {
    demo: SubscriptionRecord;
    distribuidora: SubscriptionRecord;
    nuevo: SubscriptionRecord;
    papeleria: SubscriptionRecord;
  };

  // Accounting — "tenantId:code" → accountId
  accounts: Map<string, string>;

  // Cost Centers — "tenantId:code" → costCenterId
  costCenters: Map<string, string>;

  // Bank Accounts — "tenantId:bankName" → bankAccountId
  bankAccounts: Map<string, string>;

  // Invoice counter refs for deterministic numbering
  counters: {
    demo: { invoice: number; quotation: number; purchase: number; expense: number; remission: number; supportDoc: number; journalEntry: number; certificate: number };
    distribuidora: { invoice: number; quotation: number; purchase: number; expense: number; remission: number; supportDoc: number; journalEntry: number; certificate: number };
    nuevo: { invoice: number; quotation: number; purchase: number; expense: number; remission: number; supportDoc: number; journalEntry: number; certificate: number };
    papeleria: { invoice: number; quotation: number; purchase: number; expense: number; remission: number; supportDoc: number; journalEntry: number; certificate: number };
  };
}

export type SeederFn = (prisma: PrismaClient, ctx: SeedContext) => Promise<void>;

export function createEmptyContext(): SeedContext {
  const emptyCounters = () => ({ invoice: 0, quotation: 0, purchase: 0, expense: 0, remission: 0, supportDoc: 0, journalEntry: 0, certificate: 0 });
  return {
    tenants: {} as any,
    users: {} as any,
    warehouses: {} as any,
    products: { demo: [], distribuidora: [], nuevo: [], papeleria: [] },
    categories: { demo: {}, distribuidora: {}, nuevo: {}, papeleria: {} },
    customers: { demo: [], distribuidora: [], nuevo: [], papeleria: [] },
    invoices: { demo: [], distribuidora: [], nuevo: [], papeleria: [] },
    suppliers: { demo: [], distribuidora: [], nuevo: [], papeleria: [] },
    subscriptions: {} as any,
    accounts: new Map(),
    costCenters: new Map(),
    bankAccounts: new Map(),
    counters: {
      demo: emptyCounters(),
      distribuidora: emptyCounters(),
      nuevo: emptyCounters(),
      papeleria: emptyCounters(),
    },
  };
}
