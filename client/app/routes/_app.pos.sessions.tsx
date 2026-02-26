import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Filter,
  Clock,
  Eye,
  X,
  Calendar,
  DollarSign,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  User,
  History,
  ShoppingCart,
} from "lucide-react";
import type { Route } from "./+types/_app.pos.sessions";
import { cn, formatCurrency, formatDateTime } from "~/lib/utils";
import { usePOSSessions } from "~/hooks/usePOS";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { StatCard } from "~/components/ui/StatCard";
import { Select } from "~/components/ui/Select";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  AnimatedTableRow,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import type { POSSessionFilters } from "~/types/pos";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Sesiones POS - StockFlow" },
    { name: "description", content: "Historial de sesiones de caja" },
  ];
};

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activas" },
  { value: "CLOSED", label: "Cerradas" },
  { value: "SUSPENDED", label: "Suspendidas" },
];

const pageSizeOptions = [
  { value: "10", label: "10 por pagina" },
  { value: "25", label: "25 por pagina" },
  { value: "50", label: "50 por pagina" },
];

const sessionsFiltersParser = {
  parse: (searchParams: URLSearchParams): POSSessionFilters => ({
    status:
      (searchParams.get("status") as "ACTIVE" | "CLOSED" | "SUSPENDED") ||
      undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

// Table header component
function SessionTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Caja</TableHead>
        <TableHead className="hidden md:table-cell">Usuario</TableHead>
        <TableHead className="hidden sm:table-cell">Apertura</TableHead>
        <TableHead className="text-right">Ventas</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-24">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export default function POSSessionsPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<POSSessionFilters>({
      parserConfig: sessionsFiltersParser,
    });

  const { data: sessionsData, isLoading, isError } = usePOSSessions(filters);

  const sessions = sessionsData?.data || [];
  const paginationMeta = sessionsData?.meta;
  const hasActiveFilters = filters.status || filters.fromDate || filters.toDate;

  // Derive stats from sessions data
  const activeSessions = sessions.filter((s) => s.status === "ACTIVE").length;
  const closedSessions = sessions.filter((s) => s.status === "CLOSED").length;
  const totalSales = sessions.reduce((sum, s) => sum + (s.totalSales || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success" size="sm">
            <PlayCircle className="h-3 w-3 mr-1" />
            Activa
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="secondary" size="sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Cerrada
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge variant="warning" size="sm">
            <PauseCircle className="h-3 w-3 mr-1" />
            Suspendida
          </Badge>
        );
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <History className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Sesiones de Caja
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {paginationMeta?.total || 0} sesiones en total
            </p>
          </div>
        </div>
        <Link to="/pos/open">
          <Button variant="gradient" leftIcon={<PlayCircle className="h-4 w-4" />}>
            Abrir Nuevo Turno
          </Button>
        </Link>
      </PageSection>

      {/* Stats Cards */}
      <PageSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={History}
            label="Total Sesiones"
            value={paginationMeta?.total || 0}
            color="primary"
            variant="gradient"
            animate
            animationDelay={0}
          />
          <StatCard
            icon={PlayCircle}
            label="Activas"
            value={activeSessions}
            color="success"
            variant="gradient"
            animate
            animationDelay={0.1}
          />
          <StatCard
            icon={CheckCircle}
            label="Cerradas"
            value={closedSessions}
            color="neutral"
            variant="gradient"
            animate
            animationDelay={0.2}
          />
          <StatCard
            icon={DollarSign}
            label="Ventas Totales"
            value={formatCurrency(totalSales)}
            color="accent"
            variant="gradient"
            animate
            animationDelay={0.3}
          />
        </div>
      </PageSection>

      {/* Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    {
                      [filters.status, filters.fromDate, filters.toDate].filter(
                        Boolean,
                      ).length
                    }
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({
                          status:
                            (value as "ACTIVE" | "CLOSED" | "SUSPENDED") ||
                            undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        type="date"
                        placeholder="Desde"
                        value={filters.fromDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            fromDate: e.target.value || undefined,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        type="date"
                        placeholder="Hasta"
                        value={filters.toDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            toDate: e.target.value || undefined,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <SessionTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar sesiones"
              description="Hubo un problema al cargar las sesiones. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={<History className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay sesiones"}
              description={
                hasActiveFilters
                  ? "No se encontraron sesiones con los filtros aplicados."
                  : "Aun no hay sesiones de caja registradas."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : {
                      label: "Abrir primer turno",
                      onClick: () => navigate("/pos/open"),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <SessionTableHeader />
                <TableBody>
                  {sessions.map((session, i) => (
                    <AnimatedTableRow
                      key={session.id}
                      index={i}
                      className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 dark:from-primary-500/20 dark:to-primary-900/30">
                            <ShoppingCart className="h-5 w-5 text-primary-500" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {session.cashRegister?.name || "Caja"}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {session.cashRegister?.warehouse?.name || ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-neutral-400" />
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {session.user?.name ||
                              `${session.user?.firstName || ""} ${session.user?.lastName || ""}`.trim() ||
                              "Usuario"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                          {formatDateTime(session.openedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-bold text-lg bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                          {formatCurrency(session.totalSales || 0)}
                        </p>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <Link to={`/pos/sessions/${session.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {paginationMeta && paginationMeta.totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-4">
                    <PaginationInfo
                      currentPage={paginationMeta.page}
                      pageSize={paginationMeta.limit}
                      totalItems={paginationMeta.total}
                    />
                    <Select
                      options={pageSizeOptions}
                      value={String(filters.limit || 10)}
                      onChange={(value) =>
                        updateFilters({ limit: Number(value), page: 1 })
                      }
                      className="w-36"
                    />
                  </div>
                  <Pagination
                    currentPage={paginationMeta.page}
                    totalPages={paginationMeta.totalPages}
                    onPageChange={(page) => updateFilters({ page })}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
