import { Link } from "react-router";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Scale,
  BookOpen,
  BookMarked,
  PieChart,
  TrendingUp,
  Wallet,
  ArrowRight,
  BarChart3,
  Target,
  Clock,
  Hourglass,
  Receipt,
  FileText,
  Calculator,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.reports";
import { Card } from "~/components/ui/Card";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Estados Financieros - StockFlow" },
    { name: "description", content: "Reportes contables y estados financieros" },
  ];
};

const reports = [
  {
    title: "Balance de Prueba",
    description: "Saldos de todas las cuentas",
    href: "/accounting/reports/trial-balance",
    icon: Scale,
    gradient: "from-primary-500/20 to-primary-500/5",
    iconColor: "text-primary-600 dark:text-primary-400",
  },
  {
    title: "Libro Diario",
    description: "Registro cronologico de asientos",
    href: "/accounting/reports/general-journal",
    icon: BookOpen,
    gradient: "from-accent-500/20 to-accent-500/5",
    iconColor: "text-accent-600 dark:text-accent-400",
  },
  {
    title: "Libro Mayor",
    description: "Movimientos por cuenta",
    href: "/accounting/reports/general-ledger",
    icon: BookMarked,
    gradient: "from-success-500/20 to-success-500/5",
    iconColor: "text-success-600 dark:text-success-400",
  },
  {
    title: "Balance General",
    description: "Activos, pasivos y patrimonio",
    href: "/accounting/reports/balance-sheet",
    icon: BarChart3,
    gradient: "from-warning-500/20 to-warning-500/5",
    iconColor: "text-warning-600 dark:text-warning-400",
  },
  {
    title: "Estado de Resultados",
    description: "Ingresos, costos y gastos",
    href: "/accounting/reports/income-statement",
    icon: TrendingUp,
    gradient: "from-error-500/20 to-error-500/5",
    iconColor: "text-error-600 dark:text-error-400",
  },
  {
    title: "Flujo de Efectivo",
    description: "Movimientos de caja y bancos",
    href: "/accounting/reports/cash-flow",
    icon: Wallet,
    gradient: "from-primary-500/20 to-accent-500/5",
    iconColor: "text-primary-600 dark:text-primary-400",
  },
  {
    title: "Balance por Centro de Costo",
    description: "Saldos agrupados por centro de costo",
    href: "/accounting/reports/cost-center-balance",
    icon: Target,
    gradient: "from-accent-500/20 to-success-500/5",
    iconColor: "text-accent-600 dark:text-accent-400",
  },
  {
    title: "Cartera CxC",
    description: "Antiguedad cuentas por cobrar",
    href: "/accounting/reports/ar-aging",
    icon: Clock,
    gradient: "from-warning-500/20 to-error-500/5",
    iconColor: "text-warning-600 dark:text-warning-400",
  },
  {
    title: "Cartera CxP",
    description: "Antiguedad cuentas por pagar",
    href: "/accounting/reports/ap-aging",
    icon: Hourglass,
    gradient: "from-error-500/20 to-warning-500/5",
    iconColor: "text-error-600 dark:text-error-400",
  },
];

const taxReports = [
  {
    title: "Declaracion de IVA",
    description: "IVA generado vs descontable bimestral",
    href: "/accounting/reports/iva-declaration",
    icon: Receipt,
    gradient: "from-primary-500/20 to-accent-500/5",
    iconColor: "text-primary-600 dark:text-primary-400",
  },
  {
    title: "Resumen ReteFuente",
    description: "Retenciones mensuales por proveedor",
    href: "/accounting/reports/retefuente-summary",
    icon: FileText,
    gradient: "from-accent-500/20 to-primary-500/5",
    iconColor: "text-accent-600 dark:text-accent-400",
  },
  {
    title: "Resumen Tributario",
    description: "Posicion fiscal y acumulados del año",
    href: "/accounting/reports/tax-summary",
    icon: Calculator,
    gradient: "from-success-500/20 to-accent-500/5",
    iconColor: "text-success-600 dark:text-success-400",
  },
];

function ReportCardGrid({ items }: { items: typeof reports }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((report) => {
        const Icon = report.icon;
        return (
          <Link key={report.href} to={report.href} className="group">
            <Card
              variant="elevated"
              padding="lg"
              className="h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-0.5 group-hover:border-primary-200 dark:group-hover:border-primary-800"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${report.gradient}`}
                >
                  <Icon className={`h-6 w-6 ${report.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {report.title}
                    </h3>
                    <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {report.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function AccountingReportsPage() {
  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-primary-500/10 dark:from-accent-500/20 dark:to-primary-900/30">
            <PieChart className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Estados Financieros
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              Reportes contables y estados financieros
            </p>
          </div>
        </div>
      </PageSection>

      {/* Report Cards Grid */}
      <PageSection>
        <ReportCardGrid items={reports} />
      </PageSection>

      {/* Tax Reports */}
      <PageSection>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Informes Tributarios
        </h2>
        <ReportCardGrid items={taxReports} />
      </PageSection>
    </PageWrapper>
  );
}
