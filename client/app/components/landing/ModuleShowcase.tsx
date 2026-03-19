import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  FileText,
  ShoppingCart,
  BookOpen,
  MonitorSmartphone,
  UserCheck,
  Plug,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/Badge";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const tabContentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Color system per tab
// ---------------------------------------------------------------------------

interface TabColorScheme {
  bg: string;
  bgSubtle: string;
  text: string;
  border: string;
  badgeVariant: "success" | "primary" | "warning" | "default";
  gradient: string;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  mockAccent: string;
  mockAccentSubtle: string;
}

const colorSchemes: Record<string, TabColorScheme> = {
  teal: {
    bg: "bg-success-500",
    bgSubtle: "bg-success-50 dark:bg-success-900/20",
    text: "text-success-600 dark:text-success-400",
    border: "border-success-200 dark:border-success-800",
    badgeVariant: "success",
    gradient: "from-success-500 to-success-400",
    gradientFrom: "from-success-500/20",
    gradientTo: "to-success-400/5",
    iconBg: "bg-success-100 dark:bg-success-900/30",
    mockAccent: "bg-success-400",
    mockAccentSubtle: "bg-success-200 dark:bg-success-700/40",
  },
  indigo: {
    bg: "bg-primary-500",
    bgSubtle: "bg-primary-50 dark:bg-primary-900/20",
    text: "text-primary-600 dark:text-primary-400",
    border: "border-primary-200 dark:border-primary-800",
    badgeVariant: "primary",
    gradient: "from-primary-500 to-primary-400",
    gradientFrom: "from-primary-500/20",
    gradientTo: "to-primary-400/5",
    iconBg: "bg-primary-100 dark:bg-primary-900/30",
    mockAccent: "bg-primary-400",
    mockAccentSubtle: "bg-primary-200 dark:bg-primary-700/40",
  },
  orange: {
    bg: "bg-warning-500",
    bgSubtle: "bg-warning-50 dark:bg-warning-900/20",
    text: "text-warning-600 dark:text-warning-400",
    border: "border-warning-200 dark:border-warning-800",
    badgeVariant: "warning",
    gradient: "from-warning-500 to-warning-400",
    gradientFrom: "from-warning-500/20",
    gradientTo: "to-warning-400/5",
    iconBg: "bg-warning-100 dark:bg-warning-900/30",
    mockAccent: "bg-warning-400",
    mockAccentSubtle: "bg-warning-200 dark:bg-warning-700/40",
  },
  violet: {
    bg: "bg-accent-500",
    bgSubtle: "bg-accent-50 dark:bg-accent-900/20",
    text: "text-accent-600 dark:text-accent-400",
    border: "border-accent-200 dark:border-accent-800",
    badgeVariant: "primary",
    gradient: "from-accent-500 to-accent-400",
    gradientFrom: "from-accent-500/20",
    gradientTo: "to-accent-400/5",
    iconBg: "bg-accent-100 dark:bg-accent-900/30",
    mockAccent: "bg-accent-400",
    mockAccentSubtle: "bg-accent-200 dark:bg-accent-700/40",
  },
  neutral: {
    bg: "bg-neutral-500",
    bgSubtle: "bg-neutral-50 dark:bg-neutral-800/40",
    text: "text-neutral-600 dark:text-neutral-400",
    border: "border-neutral-200 dark:border-neutral-700",
    badgeVariant: "default",
    gradient: "from-neutral-500 to-neutral-400",
    gradientFrom: "from-neutral-500/20",
    gradientTo: "to-neutral-400/5",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    mockAccent: "bg-neutral-400",
    mockAccentSubtle: "bg-neutral-200 dark:bg-neutral-700",
  },
};

// ---------------------------------------------------------------------------
// Feature data
// ---------------------------------------------------------------------------

interface Feature {
  name: string;
  description: string;
}

interface TabData {
  label: string;
  Icon: LucideIcon;
  color: string;
  headline: string;
  description: string;
  features: Feature[];
}

const tabs: TabData[] = [
  {
    label: "Inventario",
    Icon: Package,
    color: "teal",
    headline: "Control total de tu inventario",
    description:
      "Gestiona productos, bodegas y movimientos de stock con trazabilidad completa. Conoce en tiempo real el estado de tu inventario en todas tus ubicaciones.",
    features: [
      {
        name: "Productos y Categorias",
        description: "Catalogo completo con SKU, precios y variantes",
      },
      {
        name: "Multi-Bodega",
        description: "Gestion de stock en multiples ubicaciones",
      },
      {
        name: "Movimientos y Transferencias",
        description:
          "Trazabilidad completa de entradas, salidas y traslados",
      },
      {
        name: "Kardex",
        description: "Historial detallado de movimientos por producto",
      },
    ],
  },
  {
    label: "Ventas",
    Icon: FileText,
    color: "indigo",
    headline: "Facturacion electronica y ventas",
    description:
      "Genera facturas electronicas validas ante la DIAN, gestiona cotizaciones, pagos y la cartera de tus clientes desde un solo lugar.",
    features: [
      {
        name: "Facturas Electronicas DIAN",
        description: "Generacion y validacion automatica",
      },
      {
        name: "Cotizaciones",
        description: "Propuestas profesionales convertibles a factura",
      },
      {
        name: "Recurrentes",
        description: "Facturacion automatica periodica",
      },
      {
        name: "Notas Credito/Debito",
        description: "Ajustes y correcciones documentadas",
      },
      {
        name: "Pagos y Cobranza",
        description: "Seguimiento de cobros y recordatorios automaticos",
      },
      {
        name: "Clientes y Remisiones",
        description: "Gestion de cartera y despachos",
      },
    ],
  },
  {
    label: "Compras",
    Icon: ShoppingCart,
    color: "orange",
    headline: "Gestion integral de compras",
    description:
      "Administra proveedores, ordenes de compra y documentos soporte con flujos de aprobacion integrados y generacion automatica para la DIAN.",
    features: [
      {
        name: "Proveedores",
        description: "Directorio completo con historial",
      },
      {
        name: "Ordenes de Compra",
        description: "Flujo de aprobacion y seguimiento",
      },
      {
        name: "Documentos Soporte",
        description: "Generacion para la DIAN",
      },
      {
        name: "Certificados de Retencion",
        description: "Generacion automatica anual",
      },
      {
        name: "Gastos",
        description: "Registro y categorizacion de egresos",
      },
    ],
  },
  {
    label: "Contabilidad",
    Icon: BookOpen,
    color: "violet",
    headline: "Contabilidad clara y precisa",
    description:
      "Estructura contable personalizable con estados financieros, centros de costo y conciliacion bancaria. Todo lo que necesitas para mantener tus finanzas en orden.",
    features: [
      {
        name: "Plan de Cuentas",
        description: "Estructura contable personalizable",
      },
      {
        name: "Asientos Contables",
        description: "Registro de movimientos financieros",
      },
      {
        name: "Periodos Contables",
        description: "Control de cierres mensuales y anuales",
      },
      {
        name: "Estados Financieros",
        description: "Balance, P&G, flujo de caja",
      },
      {
        name: "Centros de Costo",
        description: "Analisis por departamento o proyecto",
      },
      {
        name: "Bancos",
        description: "Gestion de cuentas y conciliacion bancaria",
      },
    ],
  },
  {
    label: "POS",
    Icon: MonitorSmartphone,
    color: "teal",
    headline: "Punto de venta agil y moderno",
    description:
      "Interfaz optimizada para ventas presenciales con control de turnos, sesiones y multiples cajas registradoras. Rapido, confiable y facil de usar.",
    features: [
      {
        name: "Terminal de Venta",
        description: "Interfaz rapida para ventas presenciales",
      },
      {
        name: "Sesiones y Turnos",
        description: "Control de operarios y cierres de caja",
      },
      {
        name: "Cajas Registradoras",
        description: "Gestion de multiples puntos de cobro",
      },
    ],
  },
  {
    label: "Nomina",
    Icon: UserCheck,
    color: "orange",
    headline: "Nomina electronica sin complicaciones",
    description:
      "Gestiona empleados, liquida nomina y transmite documentos electronicos a la DIAN de forma automatica. Todo el ciclo de nomina en un solo lugar.",
    features: [
      {
        name: "Empleados",
        description: "Directorio con informacion laboral completa",
      },
      {
        name: "Periodos de Pago",
        description: "Liquidacion de nomina quincenal/mensual",
      },
      {
        name: "Nomina Electronica DIAN",
        description: "Generacion y transmision electronica",
      },
    ],
  },
  {
    label: "Mas",
    Icon: Plug,
    color: "neutral",
    headline: "Integraciones y herramientas avanzadas",
    description:
      "Conecta tu tienda online, trabaja con multiples monedas, genera reportes avanzados y mantiene un registro de auditoria completo de todas las acciones.",
    features: [
      {
        name: "Integraciones E-commerce",
        description: "Shopify, WooCommerce, MercadoLibre",
      },
      {
        name: "Multi-Moneda",
        description: "Soporte USD, EUR, MXN con tasas automaticas",
      },
      {
        name: "Reportes Avanzados",
        description: "Dashboards personalizables con exportacion",
      },
      {
        name: "Auditoria",
        description: "Registro completo de todas las acciones del sistema",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mock UI visuals per tab
// ---------------------------------------------------------------------------

function MockInventoryUI({ scheme }: { scheme: TabColorScheme }) {
  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-white/60 dark:bg-white/20" />
        <div className={cn("h-6 w-16 rounded-md", scheme.mockAccent, "opacity-80")} />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[72, 48, 91].map((val, i) => (
          <div
            key={i}
            className="rounded-lg bg-white/40 dark:bg-white/10 p-2 text-center"
          >
            <div className="text-lg font-bold text-white/90">{val}</div>
            <div className="h-1.5 w-10 mx-auto mt-1 rounded bg-white/30" />
          </div>
        ))}
      </div>
      {/* Table rows */}
      <div className="space-y-1.5">
        {[85, 60, 40, 70].map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md bg-white/20 dark:bg-white/5 px-2 py-1.5"
          >
            <div className="h-3 w-3 rounded bg-white/40" />
            <div
              className="h-2 rounded bg-white/40"
              style={{ width: `${w}%` }}
            />
            <div className="ml-auto h-2 w-8 rounded bg-white/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MockSalesUI({ scheme }: { scheme: TabColorScheme }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-white/60 dark:bg-white/20" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-md bg-white/30 dark:bg-white/10" />
          <div className={cn("h-5 w-14 rounded-md", scheme.mockAccent, "opacity-80")} />
        </div>
      </div>
      {/* Invoice cards */}
      {["FE-001247", "FE-001246", "FE-001245"].map((inv, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg bg-white/25 dark:bg-white/8 px-3 py-2"
        >
          <div className="space-y-1">
            <div className="text-xs font-medium text-white/80">{inv}</div>
            <div className="h-1.5 w-20 rounded bg-white/25" />
          </div>
          <div className="text-right space-y-1">
            <div className="text-sm font-bold text-white/90">
              ${(Math.random() * 5000 + 500).toFixed(0)}
            </div>
            <div
              className={cn(
                "h-4 w-12 rounded-full text-[8px] flex items-center justify-center font-medium",
                i === 0
                  ? "bg-green-400/30 text-green-100"
                  : i === 1
                    ? "bg-yellow-400/30 text-yellow-100"
                    : "bg-white/20 text-white/70",
              )}
            >
              {i === 0 ? "Pagada" : i === 1 ? "Pendiente" : "Borrador"}
            </div>
          </div>
        </div>
      ))}
      {/* Total bar */}
      <div className="flex items-center justify-between rounded-md bg-white/15 dark:bg-white/5 px-3 py-2">
        <div className="h-2 w-12 rounded bg-white/30" />
        <div className="text-sm font-bold text-white/90">$12,450,000</div>
      </div>
    </div>
  );
}

function MockPurchasesUI({ scheme }: { scheme: TabColorScheme }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-white/60 dark:bg-white/20" />
        <div className={cn("h-6 w-20 rounded-md", scheme.mockAccent, "opacity-70")} />
      </div>
      {/* Pipeline steps */}
      <div className="flex gap-1">
        {["Solicitud", "Aprobada", "Recibida"].map((step, i) => (
          <div
            key={step}
            className={cn(
              "flex-1 rounded-md py-1.5 text-center text-[9px] font-medium",
              i === 0
                ? "bg-white/40 text-white/90"
                : i === 1
                  ? "bg-white/25 text-white/70"
                  : "bg-white/15 text-white/50",
            )}
          >
            {step}
          </div>
        ))}
      </div>
      {/* Order rows */}
      {[
        { id: "OC-0034", supplier: "Proveedor A", pct: 100 },
        { id: "OC-0033", supplier: "Proveedor B", pct: 65 },
        { id: "OC-0032", supplier: "Proveedor C", pct: 30 },
      ].map((row) => (
        <div
          key={row.id}
          className="rounded-lg bg-white/20 dark:bg-white/8 px-3 py-2 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80">{row.id}</span>
            <span className="text-[10px] text-white/50">{row.supplier}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/15">
            <div
              className={cn("h-1.5 rounded-full", scheme.mockAccent, "opacity-70")}
              style={{ width: `${row.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MockAccountingUI({ scheme }: { scheme: TabColorScheme }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-32 rounded bg-white/60 dark:bg-white/20" />
        <div className="h-5 w-20 rounded bg-white/20" />
      </div>
      {/* Chart mock */}
      <div className="flex items-end gap-1.5 h-20 px-1">
        {[40, 65, 50, 80, 55, 70, 90, 60, 75, 45, 85, 68].map((h, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t",
              i % 3 === 0
                ? scheme.mockAccent
                : "bg-white/25 dark:bg-white/10",
              "opacity-70",
            )}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      {/* Account rows */}
      <div className="space-y-1">
        {[
          { code: "1105", name: "Bancos", val: "$24.5M" },
          { code: "4135", name: "Ingresos", val: "$18.2M" },
          { code: "5105", name: "Gastos", val: "$12.1M" },
        ].map((acc) => (
          <div
            key={acc.code}
            className="flex items-center justify-between rounded-md bg-white/15 dark:bg-white/5 px-2 py-1.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/50">
                {acc.code}
              </span>
              <span className="text-xs text-white/70">{acc.name}</span>
            </div>
            <span className="text-xs font-semibold text-white/90">
              {acc.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockPOSUI({ scheme }: { scheme: TabColorScheme }) {
  return (
    <div className="space-y-3">
      {/* POS header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-white/30 flex items-center justify-center">
            <MonitorSmartphone className="h-3.5 w-3.5 text-white/80" />
          </div>
          <div className="h-3 w-16 rounded bg-white/50" />
        </div>
        <div className="h-5 w-5 rounded-full bg-green-400/60" />
      </div>
      {/* Product grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-white/20 dark:bg-white/8 flex flex-col items-center justify-center gap-1 p-1"
          >
            <div className="h-4 w-4 rounded bg-white/30" />
            <div className="h-1 w-8 rounded bg-white/25" />
          </div>
        ))}
      </div>
      {/* Total */}
      <div className="rounded-lg bg-white/30 dark:bg-white/10 p-2 text-center">
        <div className="text-[10px] text-white/50">Total</div>
        <div className="text-xl font-bold text-white/90">$185,000</div>
      </div>
      <div className={cn("h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white", scheme.mockAccent, "opacity-90")}>
        Cobrar
      </div>
    </div>
  );
}

function MockPayrollUI({ scheme }: { scheme: TabColorScheme }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-white/60 dark:bg-white/20" />
        <div className="text-xs font-medium text-white/60">Mar 2026</div>
      </div>
      {/* Employee rows */}
      {[
        { name: "Maria Garcia", role: "Gerente", amount: "$4,200,000" },
        { name: "Carlos Lopez", role: "Vendedor", amount: "$2,800,000" },
        { name: "Ana Ruiz", role: "Contador", amount: "$3,500,000" },
      ].map((emp) => (
        <div
          key={emp.name}
          className="flex items-center gap-2 rounded-lg bg-white/20 dark:bg-white/8 px-3 py-2"
        >
          <div className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold text-white/80">
            {emp.name
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="text-xs font-medium text-white/80">{emp.name}</div>
            <div className="text-[10px] text-white/50">{emp.role}</div>
          </div>
          <div className="text-xs font-semibold text-white/90">
            {emp.amount}
          </div>
        </div>
      ))}
      {/* Summary */}
      <div className="flex items-center justify-between rounded-md bg-white/15 dark:bg-white/5 px-3 py-2">
        <span className="text-[10px] text-white/50">Total Nomina</span>
        <span className="text-sm font-bold text-white/90">$10,500,000</span>
      </div>
    </div>
  );
}

function MockExtrasUI({ scheme }: { scheme: TabColorScheme }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-white/60 dark:bg-white/20" />
        <div className="flex gap-1">
          {["USD", "EUR", "COP"].map((c) => (
            <div
              key={c}
              className="h-5 px-1.5 rounded text-[9px] font-medium bg-white/20 text-white/70 flex items-center"
            >
              {c}
            </div>
          ))}
        </div>
      </div>
      {/* Integration logos */}
      <div className="grid grid-cols-3 gap-2">
        {["Shopify", "WooCom", "MeLi"].map((name) => (
          <div
            key={name}
            className="rounded-lg bg-white/20 dark:bg-white/8 py-3 text-center"
          >
            <div className="h-5 w-5 rounded mx-auto bg-white/30 mb-1" />
            <div className="text-[9px] text-white/60">{name}</div>
          </div>
        ))}
      </div>
      {/* Dashboard chart bars */}
      <div className="rounded-lg bg-white/15 dark:bg-white/5 p-2 space-y-2">
        <div className="h-2 w-16 rounded bg-white/30" />
        <div className="flex items-end gap-1 h-12">
          {[35, 55, 45, 70, 60, 80, 50].map((h, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t",
                i === 5 ? scheme.mockAccent : "bg-white/20",
                "opacity-70",
              )}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      {/* Audit log */}
      <div className="space-y-1">
        {["Factura creada", "Stock actualizado", "Usuario login"].map((log) => (
          <div
            key={log}
            className="flex items-center gap-1.5 text-[10px] text-white/50"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

const mockUIs: Record<number, React.FC<{ scheme: TabColorScheme }>> = {
  0: MockInventoryUI,
  1: MockSalesUI,
  2: MockPurchasesUI,
  3: MockAccountingUI,
  4: MockPOSUI,
  5: MockPayrollUI,
  6: MockExtrasUI,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModuleShowcase({ isMounted }: { isMounted: boolean }) {
  const [activeTab, setActiveTab] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const paginate = (newIndex: number) => {
    setPage([newIndex, newIndex > activeTab ? 1 : -1]);
    setActiveTab(newIndex);
  };

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeButton = tabBarRef.current.children[activeTab] as HTMLElement;
    if (activeButton && typeof activeButton.scrollIntoView === "function") {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  const currentTab = tabs[activeTab];
  const scheme = colorSchemes[currentTab.color];
  const MockUI = mockUIs[activeTab];

  return (
    <section
      id="features"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary-500/5 dark:bg-primary-500/3 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
            Todo lo que necesitas para{" "}
            <span className="text-gradient">gestionar tu negocio</span>
          </h2>
          <p className="text-lg text-neutral-500 dark:text-neutral-400">
            Más de 30 módulos integrados para cada área de tu empresa
          </p>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          variants={fadeInUp}
          className="mb-12"
        >
          <div
            ref={tabBarRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center sm:flex-wrap"
          >
            {tabs.map((tab, index) => {
              const isActive = index === activeTab;
              const tabScheme = colorSchemes[tab.color];
              return (
                <button
                  key={tab.label}
                  onClick={() => paginate(index)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                    isActive
                      ? cn(tabScheme.bgSubtle, tabScheme.text, tabScheme.border, "border shadow-sm")
                      : "border border-neutral-200/60 dark:border-neutral-700/60 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300",
                  )}
                >
                  <tab.Icon className="h-4 w-4" />
                  {tab.label}
                  <Badge
                    variant={isActive ? tabScheme.badgeVariant : "secondary"}
                    size="xs"
                  >
                    {tab.features.length}
                  </Badge>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start"
          >
            {/* Left column - Features */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3">
                  {currentTab.headline}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {currentTab.description}
                </p>
              </div>

              <div className="space-y-3">
                {currentTab.features.map((feature, i) => (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                      "bg-white dark:bg-neutral-900/50",
                      "border-neutral-100 dark:border-neutral-800",
                      "hover:border-neutral-200 dark:hover:border-neutral-700",
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center",
                        scheme.iconBg,
                      )}
                    >
                      <ChevronRight
                        className={cn("h-4 w-4", scheme.text)}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {feature.name}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {feature.description}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right column - Mock UI visual */}
            <div className="relative">
              <div
                className={cn(
                  "rounded-2xl p-5 sm:p-6 shadow-xl overflow-hidden",
                  "bg-gradient-to-br",
                  scheme.gradient,
                )}
              >
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/2 blur-2xl" />

                {/* Window chrome */}
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="ml-3 h-4 flex-1 rounded bg-white/10" />
                </div>

                {/* Mock UI content */}
                <div className="relative">
                  {MockUI && <MockUI scheme={scheme} />}
                </div>
              </div>

              {/* Floating accent element */}
              <div
                className={cn(
                  "absolute -bottom-3 -right-3 h-20 w-20 rounded-2xl rotate-12 opacity-20 blur-xl",
                  scheme.bg,
                )}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
