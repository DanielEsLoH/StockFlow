import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse,
  Users,
  UsersRound,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ShoppingCart,
  Building,
  Building2,
  Receipt,
  ArrowUpDown,
  ArrowLeftRight,
  ClipboardList,
  BookOpen,
  BookMarked,
  CalendarDays,
  PieChart,
  Landmark,
  UserCheck,
  Calculator,
  Cog,
  Bell,
  FileCheck,
  Award,
  Target,
  ScrollText,
  FileMinus,
  FilePlus,
  ShieldCheck,
  MonitorSmartphone,
  Plug,
  History,
  Boxes,
  RefreshCw,
  Truck,
  Upload,
} from "lucide-react";
import { Permission } from "~/types/permissions";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

export interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export const dashboardItem: NavItem = {
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
  permission: Permission.DASHBOARD_VIEW,
};

export const navSections: NavSection[] = [
  {
    id: "inventory",
    label: "Inventario",
    icon: Package,
    items: [
      { name: "Productos", href: "/products", icon: Package, permission: Permission.PRODUCTS_VIEW },
      { name: "Categorias", href: "/categories", icon: FolderTree, permission: Permission.CATEGORIES_VIEW },
      { name: "Bodegas", href: "/warehouses", icon: Warehouse, permission: Permission.WAREHOUSES_VIEW },
      { name: "Movimientos", href: "/inventory/movements", icon: ArrowUpDown, permission: Permission.INVENTORY_VIEW },
      { name: "Transferencias", href: "/inventory/transfers", icon: ArrowLeftRight, permission: Permission.INVENTORY_TRANSFER },
      { name: "Kardex", href: "/inventory/kardex", icon: ScrollText, permission: Permission.INVENTORY_VIEW },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    icon: FileText,
    items: [
      { name: "Cotizaciones", href: "/quotations", icon: ClipboardList, permission: Permission.QUOTATIONS_VIEW },
      { name: "Facturas", href: "/invoices", icon: FileText, permission: Permission.INVOICES_VIEW },
      { name: "Recurrentes", href: "/invoices/recurring", icon: RefreshCw, permission: Permission.INVOICES_VIEW },
      { name: "Notas Credito", href: "/credit-notes", icon: FileMinus, permission: Permission.INVOICES_VIEW },
      { name: "Notas Debito", href: "/debit-notes", icon: FilePlus, permission: Permission.INVOICES_VIEW },
      { name: "Pagos", href: "/payments", icon: CreditCard, permission: Permission.PAYMENTS_VIEW },
      { name: "Clientes", href: "/customers", icon: Users, permission: Permission.CUSTOMERS_VIEW },
      { name: "Remisiones", href: "/remissions", icon: Truck, permission: Permission.INVOICES_VIEW },
      { name: "Cobranza", href: "/collection", icon: Bell, permission: Permission.INVOICES_VIEW },
    ],
  },
  {
    id: "purchases",
    label: "Compras",
    icon: ShoppingCart,
    items: [
      { name: "Proveedores", href: "/suppliers", icon: Building2, permission: Permission.SUPPLIERS_VIEW },
      { name: "Ordenes de Compra", href: "/purchases", icon: ShoppingCart, permission: Permission.PURCHASE_ORDERS_VIEW },
      { name: "Doc. Soporte", href: "/support-documents", icon: FileCheck, permission: Permission.PURCHASE_ORDERS_VIEW },
      { name: "Cert. Retencion", href: "/withholding-certificates", icon: Award, permission: Permission.PURCHASE_ORDERS_VIEW },
      { name: "Gastos", href: "/expenses", icon: Receipt, permission: Permission.EXPENSES_VIEW },
    ],
  },
  {
    id: "accounting",
    label: "Contabilidad",
    icon: BookOpen,
    items: [
      { name: "Plan de Cuentas", href: "/accounting/accounts", icon: BookOpen, permission: Permission.ACCOUNTING_VIEW },
      { name: "Asientos Contables", href: "/accounting/journal-entries", icon: BookMarked, permission: Permission.ACCOUNTING_VIEW },
      { name: "Periodos", href: "/accounting/periods", icon: CalendarDays, permission: Permission.ACCOUNTING_VIEW },
      { name: "Estados Financieros", href: "/accounting/reports", icon: PieChart, permission: Permission.ACCOUNTING_VIEW },
      { name: "Centro de Costos", href: "/cost-centers", icon: Target, permission: Permission.ACCOUNTING_VIEW },
      { name: "Cuentas Bancarias", href: "/bank/accounts", icon: Landmark, permission: Permission.BANK_VIEW },
    ],
  },
  {
    id: "pos",
    label: "Punto de Venta",
    icon: MonitorSmartphone,
    items: [
      { name: "Ventas POS", href: "/pos/sales", icon: MonitorSmartphone, permission: Permission.POS_VIEW_SESSIONS },
      { name: "Sesiones", href: "/pos/sessions", icon: History, permission: Permission.POS_VIEW_SESSIONS },
      { name: "Cajas", href: "/pos/cash-registers", icon: Boxes, permission: Permission.CASH_REGISTERS_VIEW },
    ],
  },
  {
    id: "payroll",
    label: "Nomina",
    icon: UserCheck,
    items: [
      { name: "Empleados", href: "/payroll/employees", icon: UserCheck, permission: Permission.PAYROLL_VIEW },
      { name: "Periodos de Pago", href: "/payroll/periods", icon: Calculator, permission: Permission.PAYROLL_VIEW },
    ],
  },
  {
    id: "admin",
    label: "Administracion",
    icon: Settings,
    items: [
      { name: "Equipo", href: "/team", icon: UsersRound, permission: Permission.USERS_VIEW },
      { name: "Reportes", href: "/reports", icon: BarChart3, permission: Permission.REPORTS_VIEW },
      { name: "DIAN", href: "/dian", icon: Building, permission: Permission.DIAN_VIEW },
      { name: "Facturacion", href: "/billing", icon: Receipt, permission: Permission.SETTINGS_MANAGE },
      { name: "Auditoria", href: "/audit-logs", icon: ShieldCheck, permission: Permission.AUDIT_VIEW },
      { name: "Importar Datos", href: "/import", icon: Upload, permission: Permission.DATA_IMPORT },
      { name: "Integraciones", href: "/integrations", icon: Plug, permission: Permission.INTEGRATIONS_VIEW },
      { name: "Monedas", href: "/settings/currencies", icon: ArrowLeftRight, permission: Permission.EXCHANGE_RATES_VIEW },
      { name: "Configuracion", href: "/settings", icon: Cog, permission: Permission.SETTINGS_VIEW },
    ],
  },
];

/**
 * Returns the section id that contains the current active route, or null
 */
export function findActiveSectionId(pathname: string): string | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return null;
  }

  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return section.id;
      }
    }
  }
  return null;
}
