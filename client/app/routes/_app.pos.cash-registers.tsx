import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  Plus,
  Warehouse,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  PauseCircle,
  Banknote,
} from "lucide-react";
import type { Route } from "./+types/_app.pos.cash-registers";
import { cn, formatDateTime } from "~/lib/utils";
import { useCashRegisters, useDeleteCashRegister } from "~/hooks/usePOS";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import type { CashRegisterFilters, CashRegister } from "~/types/pos";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cajas Registradoras - POS - StockFlow" },
    { name: "description", content: "Gestion de cajas registradoras" },
  ];
};

const registersFiltersParser = {
  parse: (searchParams: URLSearchParams): CashRegisterFilters => ({
    status:
      (searchParams.get("status") as "OPEN" | "CLOSED" | "SUSPENDED") ||
      undefined,
    warehouseId: searchParams.get("warehouseId") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function CashRegistersPage() {
  const [deletingRegister, setDeletingRegister] = useState<CashRegister | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters } = useUrlFilters<CashRegisterFilters>({
    parserConfig: registersFiltersParser,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: registersData, isLoading, isError } = useCashRegisters(filters);
  const deleteRegister = useDeleteCashRegister();

  const handleDelete = async () => {
    if (deletingRegister) {
      await deleteRegister.mutateAsync(deletingRegister.id);
      setDeletingRegister(null);
    }
  };

  const registers = registersData?.data || [];
  const meta = registersData?.meta;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge variant="success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Abierta
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
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
            Cajas Registradoras
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Configura las cajas para el punto de venta
          </p>
        </div>
        <Link to="/pos/cash-registers/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Nueva Caja</Button>
        </Link>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caja</TableHead>
                  <TableHead className="hidden md:table-cell">Bodega</TableHead>
                  <TableHead className="hidden sm:table-cell">Codigo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={5} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-error-500">Error al cargar las cajas</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
            </div>
          ) : registers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                <Banknote className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                No hay cajas registradoras
              </h3>
              <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                Crea tu primera caja registradora para comenzar a usar el punto
                de venta.
              </p>
              <Link to="/pos/cash-registers/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Caja
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caja</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Bodega
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Codigo
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {registers.map((register) => (
                      <motion.tr
                        key={register.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                              <Banknote className="h-5 w-5 text-primary-500" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {register.name}
                              </p>
                              {register.description && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                                  {register.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="h-4 w-4 text-neutral-400" />
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {(register as any).warehouse?.name || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary">{register.code}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(register.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/pos/cash-registers/${register.id}/edit`}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRegister(register)}
                              title="Eliminar"
                              className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingRegister}
        onOpenChange={(open) => !open && setDeletingRegister(null)}
        itemName={deletingRegister?.name || ""}
        itemType="caja registradora"
        onConfirm={handleDelete}
        isLoading={deleteRegister.isPending}
      />
    </motion.div>
  );
}
