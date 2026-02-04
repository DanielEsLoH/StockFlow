import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
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
} from "lucide-react";
import type { Route } from "./+types/_app.pos.sessions";
import { cn, formatCurrency, formatDateTime } from "~/lib/utils";
import { usePOSSessions } from "~/hooks/usePOS";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Select } from "~/components/ui/Select";
import { Pagination, PaginationInfo } from "~/components/ui/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
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

export default function POSSessionsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } =
    useUrlFilters<POSSessionFilters>({
      parserConfig: sessionsFiltersParser,
    });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: sessionsData, isLoading, isError } = usePOSSessions(filters);

  const sessions = sessionsData?.data || [];
  const meta = sessionsData?.meta;
  const hasActiveFilters = filters.status || filters.fromDate || filters.toDate;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success">
            <PlayCircle className="h-3 w-3 mr-1" />
            Activa
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="secondary">
            <CheckCircle className="h-3 w-3 mr-1" />
            Cerrada
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge variant="warning">
            <PauseCircle className="h-3 w-3 mr-1" />
            Suspendida
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Sesiones de Caja
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Historial de turnos de caja
          </p>
        </div>
        <Link to="/pos/open">
          <Button>
            <PlayCircle className="h-4 w-4 mr-2" />
            Abrir Nuevo Turno
          </Button>
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  showFilters &&
                    "bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900/20",
                )}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="primary" className="ml-2">
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
                    <div className="space-y-1">
                      <label className="text-sm text-neutral-500">Desde</label>
                      <Input
                        type="date"
                        value={filters.fromDate || ""}
                        onChange={(e) =>
                          updateFilters({
                            fromDate: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-neutral-500">Hasta</label>
                      <Input
                        type="date"
                        value={filters.toDate || ""}
                        onChange={(e) =>
                          updateFilters({ toDate: e.target.value || undefined })
                        }
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caja</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Usuario
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Apertura
                  </TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-error-500">Error al cargar las sesiones</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                <Clock className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                {hasActiveFilters ? "Sin resultados" : "No hay sesiones"}
              </h3>
              <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                {hasActiveFilters
                  ? "No se encontraron sesiones con los filtros aplicados."
                  : "Aun no hay sesiones de caja registradas."}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Link to="/pos/open">
                  <Button>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Abrir Primer Turno
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caja</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Usuario
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Apertura
                    </TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {sessions.map((session) => (
                      <motion.tr
                        key={session.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                              <Clock className="h-5 w-5 text-primary-500" />
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
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-neutral-400" />
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {formatDateTime(session.openedAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-success-500" />
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {formatCurrency(session.totalSales || 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell>
                          <Link to={`/pos/sessions/${session.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700">
                  <PaginationInfo
                    currentPage={meta.page}
                    pageSize={meta.limit}
                    totalItems={meta.total}
                  />
                  <Pagination
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={(page) => updateFilters({ page })}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
