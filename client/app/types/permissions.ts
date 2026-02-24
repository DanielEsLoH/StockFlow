/**
 * Granular permissions for StockFlow
 * This mirrors the backend Permission enum
 *
 * Format: module:action
 * - module: The feature area (pos, inventory, invoices, etc.)
 * - action: The specific operation (view, create, edit, delete, etc.)
 */
export enum Permission {
  // === POS Module ===
  POS_SELL = 'pos:sell',
  POS_REFUND = 'pos:refund',
  POS_DISCOUNT = 'pos:discount',
  POS_OPEN_DRAWER = 'pos:open_drawer',
  POS_VIEW_SESSIONS = 'pos:view_sessions',
  POS_CLOSE_SESSION = 'pos:close_session',
  POS_CASH_MOVEMENT = 'pos:cash_movement',

  // === Inventory Module ===
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_ADJUST = 'inventory:adjust',
  INVENTORY_TRANSFER = 'inventory:transfer',

  // === Products Module ===
  PRODUCTS_VIEW = 'products:view',
  PRODUCTS_CREATE = 'products:create',
  PRODUCTS_EDIT = 'products:edit',
  PRODUCTS_DELETE = 'products:delete',

  // === Categories Module ===
  CATEGORIES_VIEW = 'categories:view',
  CATEGORIES_MANAGE = 'categories:manage',

  // === Warehouses Module ===
  WAREHOUSES_VIEW = 'warehouses:view',
  WAREHOUSES_MANAGE = 'warehouses:manage',

  // === Invoices Module ===
  INVOICES_VIEW = 'invoices:view',
  INVOICES_CREATE = 'invoices:create',
  INVOICES_EDIT = 'invoices:edit',
  INVOICES_SEND = 'invoices:send',
  INVOICES_CANCEL = 'invoices:cancel',

  // === Payments Module ===
  PAYMENTS_VIEW = 'payments:view',
  PAYMENTS_CREATE = 'payments:create',
  PAYMENTS_DELETE = 'payments:delete',

  // === Customers Module ===
  CUSTOMERS_VIEW = 'customers:view',
  CUSTOMERS_CREATE = 'customers:create',
  CUSTOMERS_EDIT = 'customers:edit',
  CUSTOMERS_DELETE = 'customers:delete',

  // === Reports Module ===
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',

  // === DIAN Module ===
  DIAN_VIEW = 'dian:view',
  DIAN_CONFIG = 'dian:config',
  DIAN_SEND = 'dian:send',

  // === Users/Team Module ===
  USERS_VIEW = 'users:view',
  USERS_MANAGE = 'users:manage',
  USERS_INVITE = 'users:invite',

  // === Settings Module ===
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_MANAGE = 'settings:manage',

  // === Audit Logs Module ===
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',

  // === Cash Registers Module ===
  CASH_REGISTERS_VIEW = 'cash_registers:view',
  CASH_REGISTERS_MANAGE = 'cash_registers:manage',

  // === Quotations Module ===
  QUOTATIONS_VIEW = 'quotations:view',
  QUOTATIONS_CREATE = 'quotations:create',
  QUOTATIONS_EDIT = 'quotations:edit',
  QUOTATIONS_DELETE = 'quotations:delete',
  QUOTATIONS_CONVERT = 'quotations:convert',

  // === Suppliers Module ===
  SUPPLIERS_VIEW = 'suppliers:view',
  SUPPLIERS_CREATE = 'suppliers:create',
  SUPPLIERS_EDIT = 'suppliers:edit',
  SUPPLIERS_DELETE = 'suppliers:delete',

  // === Purchase Orders Module ===
  PURCHASE_ORDERS_VIEW = 'purchase_orders:view',
  PURCHASE_ORDERS_CREATE = 'purchase_orders:create',
  PURCHASE_ORDERS_EDIT = 'purchase_orders:edit',
  PURCHASE_ORDERS_DELETE = 'purchase_orders:delete',
  PURCHASE_ORDERS_SEND = 'purchase_orders:send',
  PURCHASE_ORDERS_CONFIRM = 'purchase_orders:confirm',
  PURCHASE_ORDERS_RECEIVE = 'purchase_orders:receive',
  PURCHASE_ORDERS_CANCEL = 'purchase_orders:cancel',

  // === Accounting Module ===
  ACCOUNTING_VIEW = 'accounting:view',
  ACCOUNTING_CREATE = 'accounting:create',
  ACCOUNTING_EDIT = 'accounting:edit',
  ACCOUNTING_CLOSE_PERIOD = 'accounting:close_period',
  ACCOUNTING_CONFIG = 'accounting:config',

  // === Bank Module ===
  BANK_VIEW = 'bank:view',
  BANK_CREATE = 'bank:create',
  BANK_IMPORT = 'bank:import',
  BANK_RECONCILE = 'bank:reconcile',

  // === Payroll Module ===
  PAYROLL_VIEW = 'payroll:view',
  PAYROLL_CREATE = 'payroll:create',
  PAYROLL_EDIT = 'payroll:edit',
  PAYROLL_APPROVE = 'payroll:approve',
  PAYROLL_CONFIG = 'payroll:config',
  PAYROLL_SEND = 'payroll:send',

  // === Dashboard Module ===
  DASHBOARD_VIEW = 'dashboard:view',
}

/**
 * User role type
 */
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CONTADOR';

/**
 * Default permissions for each role.
 * Used as fallback when permissions haven't been loaded from server.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),

  ADMIN: [
    // Dashboard
    Permission.DASHBOARD_VIEW,
    // POS - Full access
    Permission.POS_SELL,
    Permission.POS_REFUND,
    Permission.POS_DISCOUNT,
    Permission.POS_OPEN_DRAWER,
    Permission.POS_VIEW_SESSIONS,
    Permission.POS_CLOSE_SESSION,
    Permission.POS_CASH_MOVEMENT,
    // Inventory - Full access
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_ADJUST,
    Permission.INVENTORY_TRANSFER,
    // Products - Full access
    Permission.PRODUCTS_VIEW,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_EDIT,
    Permission.PRODUCTS_DELETE,
    // Categories - Full access
    Permission.CATEGORIES_VIEW,
    Permission.CATEGORIES_MANAGE,
    // Warehouses - Full access
    Permission.WAREHOUSES_VIEW,
    Permission.WAREHOUSES_MANAGE,
    // Invoices - Full access
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_SEND,
    Permission.INVOICES_CANCEL,
    // Payments - Full access
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    Permission.PAYMENTS_DELETE,
    // Customers - Full access
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    Permission.CUSTOMERS_DELETE,
    // Reports - Full access
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    // DIAN - Full access
    Permission.DIAN_VIEW,
    Permission.DIAN_CONFIG,
    Permission.DIAN_SEND,
    // Users - Full access
    Permission.USERS_VIEW,
    Permission.USERS_MANAGE,
    Permission.USERS_INVITE,
    // Settings - Full access
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_MANAGE,
    // Audit - Full access
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    // Cash Registers - Full access
    Permission.CASH_REGISTERS_VIEW,
    Permission.CASH_REGISTERS_MANAGE,
    // Quotations - Full access
    Permission.QUOTATIONS_VIEW,
    Permission.QUOTATIONS_CREATE,
    Permission.QUOTATIONS_EDIT,
    Permission.QUOTATIONS_DELETE,
    Permission.QUOTATIONS_CONVERT,
    // Suppliers - Full access
    Permission.SUPPLIERS_VIEW,
    Permission.SUPPLIERS_CREATE,
    Permission.SUPPLIERS_EDIT,
    Permission.SUPPLIERS_DELETE,
    // Purchase Orders - Full access
    Permission.PURCHASE_ORDERS_VIEW,
    Permission.PURCHASE_ORDERS_CREATE,
    Permission.PURCHASE_ORDERS_EDIT,
    Permission.PURCHASE_ORDERS_DELETE,
    Permission.PURCHASE_ORDERS_SEND,
    Permission.PURCHASE_ORDERS_CONFIRM,
    Permission.PURCHASE_ORDERS_RECEIVE,
    Permission.PURCHASE_ORDERS_CANCEL,
    // Accounting - Full access
    Permission.ACCOUNTING_VIEW,
    Permission.ACCOUNTING_CREATE,
    Permission.ACCOUNTING_EDIT,
    Permission.ACCOUNTING_CLOSE_PERIOD,
    Permission.ACCOUNTING_CONFIG,
    // Bank - Full access
    Permission.BANK_VIEW,
    Permission.BANK_CREATE,
    Permission.BANK_IMPORT,
    Permission.BANK_RECONCILE,
    // Payroll - Full access
    Permission.PAYROLL_VIEW,
    Permission.PAYROLL_CREATE,
    Permission.PAYROLL_EDIT,
    Permission.PAYROLL_APPROVE,
    Permission.PAYROLL_CONFIG,
    Permission.PAYROLL_SEND,
  ],

  MANAGER: [
    // Dashboard
    Permission.DASHBOARD_VIEW,
    // POS - Operational access
    Permission.POS_SELL,
    Permission.POS_REFUND,
    Permission.POS_DISCOUNT,
    Permission.POS_VIEW_SESSIONS,
    Permission.POS_CLOSE_SESSION,
    Permission.POS_CASH_MOVEMENT,
    // Inventory - Operational access
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_ADJUST,
    Permission.INVENTORY_TRANSFER,
    // Products - Create/Edit but not delete
    Permission.PRODUCTS_VIEW,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_EDIT,
    // Categories - Full access
    Permission.CATEGORIES_VIEW,
    Permission.CATEGORIES_MANAGE,
    // Warehouses - View only
    Permission.WAREHOUSES_VIEW,
    // Invoices - Operational access (no cancel)
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_SEND,
    // Payments - Create but not delete
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    // Customers - Full except delete
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    // Reports - View only
    Permission.REPORTS_VIEW,
    // DIAN - View and send
    Permission.DIAN_VIEW,
    Permission.DIAN_SEND,
    // Users - View only
    Permission.USERS_VIEW,
    // Settings - View only
    Permission.SETTINGS_VIEW,
    // Audit - View only
    Permission.AUDIT_VIEW,
    // Cash Registers - View only
    Permission.CASH_REGISTERS_VIEW,
    // Quotations - Full access
    Permission.QUOTATIONS_VIEW,
    Permission.QUOTATIONS_CREATE,
    Permission.QUOTATIONS_EDIT,
    Permission.QUOTATIONS_DELETE,
    Permission.QUOTATIONS_CONVERT,
    // Suppliers - View, create, edit (no delete)
    Permission.SUPPLIERS_VIEW,
    Permission.SUPPLIERS_CREATE,
    Permission.SUPPLIERS_EDIT,
    // Purchase Orders - Operational access (no delete, no cancel)
    Permission.PURCHASE_ORDERS_VIEW,
    Permission.PURCHASE_ORDERS_CREATE,
    Permission.PURCHASE_ORDERS_EDIT,
    Permission.PURCHASE_ORDERS_SEND,
    Permission.PURCHASE_ORDERS_CONFIRM,
    Permission.PURCHASE_ORDERS_RECEIVE,
    // Accounting - View only
    Permission.ACCOUNTING_VIEW,
    // Bank - View only
    Permission.BANK_VIEW,
    // Payroll - Operational
    Permission.PAYROLL_VIEW,
    Permission.PAYROLL_CREATE,
    Permission.PAYROLL_EDIT,
  ],

  EMPLOYEE: [
    // Dashboard - basic overview
    Permission.DASHBOARD_VIEW,
    // POS - primary function for sales staff
    Permission.POS_SELL,
    // Products - view only (to check prices when selling)
    Permission.PRODUCTS_VIEW,
    // Invoices - view and create (for processing sales)
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    // Customers - view and create (to register new customers during sales)
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    // Quotations - View and create
    Permission.QUOTATIONS_VIEW,
    Permission.QUOTATIONS_CREATE,
    // Suppliers - View only
    Permission.SUPPLIERS_VIEW,
    // Purchase Orders - View only
    Permission.PURCHASE_ORDERS_VIEW,
    // --- RESTRICTED: No access to inventory, categories, warehouses, payments, DIAN, settings, cash registers ---
  ],

  CONTADOR: [
    // Dashboard - financial overview
    Permission.DASHBOARD_VIEW,
    // Products - view only (prices, costs, stock levels)
    Permission.PRODUCTS_VIEW,
    // Categories - view only
    Permission.CATEGORIES_VIEW,
    // Warehouses - view only
    Permission.WAREHOUSES_VIEW,
    // Inventory - view only
    Permission.INVENTORY_VIEW,
    // Invoices - view only (financial records)
    Permission.INVOICES_VIEW,
    // Payments - view only
    Permission.PAYMENTS_VIEW,
    // Customers - view only
    Permission.CUSTOMERS_VIEW,
    // Reports - view and export (core function for accountants)
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    // DIAN - view only (tax compliance review)
    Permission.DIAN_VIEW,
    // Audit - view and export (accountability)
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    // Quotations - View only
    Permission.QUOTATIONS_VIEW,
    // Suppliers - View only
    Permission.SUPPLIERS_VIEW,
    // Purchase Orders - View only
    Permission.PURCHASE_ORDERS_VIEW,
    // Accounting - View, create, edit (core function)
    Permission.ACCOUNTING_VIEW,
    Permission.ACCOUNTING_CREATE,
    Permission.ACCOUNTING_EDIT,
    // Bank - View, import, reconcile (core function)
    Permission.BANK_VIEW,
    Permission.BANK_IMPORT,
    Permission.BANK_RECONCILE,
    // Payroll - View only
    Permission.PAYROLL_VIEW,
    // --- RESTRICTED: No POS, no create/edit/delete, no users, no settings, no cash registers ---
  ],
};

/**
 * Permission categories for grouping in UI
 */
export const PERMISSION_CATEGORIES = {
  pos: {
    label: 'Punto de Venta',
    permissions: [
      Permission.POS_SELL,
      Permission.POS_REFUND,
      Permission.POS_DISCOUNT,
      Permission.POS_OPEN_DRAWER,
      Permission.POS_VIEW_SESSIONS,
      Permission.POS_CLOSE_SESSION,
      Permission.POS_CASH_MOVEMENT,
    ],
  },
  inventory: {
    label: 'Inventario',
    permissions: [
      Permission.INVENTORY_VIEW,
      Permission.INVENTORY_ADJUST,
      Permission.INVENTORY_TRANSFER,
    ],
  },
  products: {
    label: 'Productos',
    permissions: [
      Permission.PRODUCTS_VIEW,
      Permission.PRODUCTS_CREATE,
      Permission.PRODUCTS_EDIT,
      Permission.PRODUCTS_DELETE,
    ],
  },
  categories: {
    label: 'Categorias',
    permissions: [Permission.CATEGORIES_VIEW, Permission.CATEGORIES_MANAGE],
  },
  warehouses: {
    label: 'Bodegas',
    permissions: [Permission.WAREHOUSES_VIEW, Permission.WAREHOUSES_MANAGE],
  },
  invoices: {
    label: 'Facturas',
    permissions: [
      Permission.INVOICES_VIEW,
      Permission.INVOICES_CREATE,
      Permission.INVOICES_EDIT,
      Permission.INVOICES_SEND,
      Permission.INVOICES_CANCEL,
    ],
  },
  payments: {
    label: 'Pagos',
    permissions: [
      Permission.PAYMENTS_VIEW,
      Permission.PAYMENTS_CREATE,
      Permission.PAYMENTS_DELETE,
    ],
  },
  customers: {
    label: 'Clientes',
    permissions: [
      Permission.CUSTOMERS_VIEW,
      Permission.CUSTOMERS_CREATE,
      Permission.CUSTOMERS_EDIT,
      Permission.CUSTOMERS_DELETE,
    ],
  },
  reports: {
    label: 'Reportes',
    permissions: [Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT],
  },
  dian: {
    label: 'DIAN',
    permissions: [Permission.DIAN_VIEW, Permission.DIAN_CONFIG, Permission.DIAN_SEND],
  },
  users: {
    label: 'Usuarios',
    permissions: [Permission.USERS_VIEW, Permission.USERS_MANAGE, Permission.USERS_INVITE],
  },
  settings: {
    label: 'Configuracion',
    permissions: [Permission.SETTINGS_VIEW, Permission.SETTINGS_MANAGE],
  },
  audit: {
    label: 'Auditoria',
    permissions: [Permission.AUDIT_VIEW, Permission.AUDIT_EXPORT],
  },
  cashRegisters: {
    label: 'Cajas Registradoras',
    permissions: [Permission.CASH_REGISTERS_VIEW, Permission.CASH_REGISTERS_MANAGE],
  },
  quotations: {
    label: 'Cotizaciones',
    permissions: [
      Permission.QUOTATIONS_VIEW,
      Permission.QUOTATIONS_CREATE,
      Permission.QUOTATIONS_EDIT,
      Permission.QUOTATIONS_DELETE,
      Permission.QUOTATIONS_CONVERT,
    ],
  },
  suppliers: {
    label: 'Proveedores',
    permissions: [
      Permission.SUPPLIERS_VIEW,
      Permission.SUPPLIERS_CREATE,
      Permission.SUPPLIERS_EDIT,
      Permission.SUPPLIERS_DELETE,
    ],
  },
  purchaseOrders: {
    label: 'Órdenes de Compra',
    permissions: [
      Permission.PURCHASE_ORDERS_VIEW,
      Permission.PURCHASE_ORDERS_CREATE,
      Permission.PURCHASE_ORDERS_EDIT,
      Permission.PURCHASE_ORDERS_DELETE,
      Permission.PURCHASE_ORDERS_SEND,
      Permission.PURCHASE_ORDERS_CONFIRM,
      Permission.PURCHASE_ORDERS_RECEIVE,
      Permission.PURCHASE_ORDERS_CANCEL,
    ],
  },
  accounting: {
    label: 'Contabilidad',
    permissions: [
      Permission.ACCOUNTING_VIEW,
      Permission.ACCOUNTING_CREATE,
      Permission.ACCOUNTING_EDIT,
      Permission.ACCOUNTING_CLOSE_PERIOD,
      Permission.ACCOUNTING_CONFIG,
    ],
  },
  bank: {
    label: 'Bancos',
    permissions: [
      Permission.BANK_VIEW,
      Permission.BANK_CREATE,
      Permission.BANK_IMPORT,
      Permission.BANK_RECONCILE,
    ],
  },
  payroll: {
    label: 'Nómina',
    permissions: [
      Permission.PAYROLL_VIEW,
      Permission.PAYROLL_CREATE,
      Permission.PAYROLL_EDIT,
      Permission.PAYROLL_APPROVE,
      Permission.PAYROLL_CONFIG,
      Permission.PAYROLL_SEND,
    ],
  },
  dashboard: {
    label: 'Dashboard',
    permissions: [Permission.DASHBOARD_VIEW],
  },
} as const;

/**
 * Human-readable labels for permissions (Spanish)
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  // POS
  [Permission.POS_SELL]: 'Realizar ventas',
  [Permission.POS_REFUND]: 'Procesar devoluciones',
  [Permission.POS_DISCOUNT]: 'Aplicar descuentos',
  [Permission.POS_OPEN_DRAWER]: 'Abrir caja sin venta',
  [Permission.POS_VIEW_SESSIONS]: 'Ver sesiones de caja',
  [Permission.POS_CLOSE_SESSION]: 'Cerrar sesion de caja',
  [Permission.POS_CASH_MOVEMENT]: 'Movimientos de caja',

  // Inventory
  [Permission.INVENTORY_VIEW]: 'Ver inventario',
  [Permission.INVENTORY_ADJUST]: 'Ajustes de stock',
  [Permission.INVENTORY_TRANSFER]: 'Transferencias entre bodegas',

  // Products
  [Permission.PRODUCTS_VIEW]: 'Ver productos',
  [Permission.PRODUCTS_CREATE]: 'Crear productos',
  [Permission.PRODUCTS_EDIT]: 'Editar productos',
  [Permission.PRODUCTS_DELETE]: 'Eliminar productos',

  // Categories
  [Permission.CATEGORIES_VIEW]: 'Ver categorias',
  [Permission.CATEGORIES_MANAGE]: 'Gestionar categorias',

  // Warehouses
  [Permission.WAREHOUSES_VIEW]: 'Ver bodegas',
  [Permission.WAREHOUSES_MANAGE]: 'Gestionar bodegas',

  // Invoices
  [Permission.INVOICES_VIEW]: 'Ver facturas',
  [Permission.INVOICES_CREATE]: 'Crear facturas',
  [Permission.INVOICES_EDIT]: 'Editar facturas',
  [Permission.INVOICES_SEND]: 'Enviar facturas',
  [Permission.INVOICES_CANCEL]: 'Anular facturas',

  // Payments
  [Permission.PAYMENTS_VIEW]: 'Ver pagos',
  [Permission.PAYMENTS_CREATE]: 'Registrar pagos',
  [Permission.PAYMENTS_DELETE]: 'Eliminar pagos',

  // Customers
  [Permission.CUSTOMERS_VIEW]: 'Ver clientes',
  [Permission.CUSTOMERS_CREATE]: 'Crear clientes',
  [Permission.CUSTOMERS_EDIT]: 'Editar clientes',
  [Permission.CUSTOMERS_DELETE]: 'Eliminar clientes',

  // Reports
  [Permission.REPORTS_VIEW]: 'Ver reportes',
  [Permission.REPORTS_EXPORT]: 'Exportar reportes',

  // DIAN
  [Permission.DIAN_VIEW]: 'Ver configuracion DIAN',
  [Permission.DIAN_CONFIG]: 'Configurar DIAN',
  [Permission.DIAN_SEND]: 'Enviar a DIAN',

  // Users
  [Permission.USERS_VIEW]: 'Ver usuarios',
  [Permission.USERS_MANAGE]: 'Gestionar usuarios',
  [Permission.USERS_INVITE]: 'Invitar usuarios',

  // Settings
  [Permission.SETTINGS_VIEW]: 'Ver configuracion',
  [Permission.SETTINGS_MANAGE]: 'Gestionar configuracion',

  // Audit
  [Permission.AUDIT_VIEW]: 'Ver logs de auditoria',
  [Permission.AUDIT_EXPORT]: 'Exportar auditoria',

  // Cash Registers
  [Permission.CASH_REGISTERS_VIEW]: 'Ver cajas registradoras',
  [Permission.CASH_REGISTERS_MANAGE]: 'Gestionar cajas registradoras',

  // Quotations
  [Permission.QUOTATIONS_VIEW]: 'Ver cotizaciones',
  [Permission.QUOTATIONS_CREATE]: 'Crear cotizaciones',
  [Permission.QUOTATIONS_EDIT]: 'Editar cotizaciones',
  [Permission.QUOTATIONS_DELETE]: 'Eliminar cotizaciones',
  [Permission.QUOTATIONS_CONVERT]: 'Convertir cotizaciones a facturas',

  // Suppliers
  [Permission.SUPPLIERS_VIEW]: 'Ver proveedores',
  [Permission.SUPPLIERS_CREATE]: 'Crear proveedores',
  [Permission.SUPPLIERS_EDIT]: 'Editar proveedores',
  [Permission.SUPPLIERS_DELETE]: 'Eliminar proveedores',

  // Purchase Orders
  [Permission.PURCHASE_ORDERS_VIEW]: 'Ver órdenes de compra',
  [Permission.PURCHASE_ORDERS_CREATE]: 'Crear órdenes de compra',
  [Permission.PURCHASE_ORDERS_EDIT]: 'Editar órdenes de compra',
  [Permission.PURCHASE_ORDERS_DELETE]: 'Eliminar órdenes de compra',
  [Permission.PURCHASE_ORDERS_SEND]: 'Enviar órdenes de compra',
  [Permission.PURCHASE_ORDERS_CONFIRM]: 'Confirmar órdenes de compra',
  [Permission.PURCHASE_ORDERS_RECEIVE]: 'Recibir mercancía',
  [Permission.PURCHASE_ORDERS_CANCEL]: 'Cancelar órdenes de compra',

  // Accounting
  [Permission.ACCOUNTING_VIEW]: 'Ver contabilidad',
  [Permission.ACCOUNTING_CREATE]: 'Crear asientos contables',
  [Permission.ACCOUNTING_EDIT]: 'Editar asientos contables',
  [Permission.ACCOUNTING_CLOSE_PERIOD]: 'Cerrar periodos contables',
  [Permission.ACCOUNTING_CONFIG]: 'Configurar contabilidad',

  // Bank
  [Permission.BANK_VIEW]: 'Ver cuentas bancarias',
  [Permission.BANK_CREATE]: 'Crear cuentas bancarias',
  [Permission.BANK_IMPORT]: 'Importar extractos bancarios',
  [Permission.BANK_RECONCILE]: 'Conciliar extractos',

  // Payroll
  [Permission.PAYROLL_VIEW]: 'Ver nómina',
  [Permission.PAYROLL_CREATE]: 'Crear empleados y periodos',
  [Permission.PAYROLL_EDIT]: 'Editar nómina',
  [Permission.PAYROLL_APPROVE]: 'Aprobar nómina',
  [Permission.PAYROLL_CONFIG]: 'Configurar nómina',
  [Permission.PAYROLL_SEND]: 'Enviar nómina a DIAN',

  // Dashboard
  [Permission.DASHBOARD_VIEW]: 'Ver dashboard',
};
