import { useState, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Package,
  Warehouse,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
} from "lucide-react";
import type { Route } from "./+types/_app.inventory.kardex";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { cn, formatCurrency, formatDate } from "~/lib/utils";
import { useKardex } from "~/hooks/useKardex";
import { useProducts } from "~/hooks/useProducts";
import { useWarehouses } from "~/hooks/useWarehouses";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Select } from "~/components/ui/Select";
import { Skeleton } from "~/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import type { KardexReport, KardexMovement } from "~/types/kardex";

// ============================================================================
// META
// ============================================================================

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Kardex - StockFlow" },
    { name: "description", content: "Reporte Kardex de movimientos de inventario" },
  ];
};

// ============================================================================
// HELPERS
// ============================================================================

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  TRANSFER_IN: "Transferencia (entrada)",
  TRANSFER_OUT: "Transferencia (salida)",
  ADJUSTMENT_IN: "Ajuste (entrada)",
  ADJUSTMENT_OUT: "Ajuste (salida)",
  RETURN_IN: "Devolucion (entrada)",
  RETURN_OUT: "Devolucion (salida)",
  INITIAL: "Inventario Inicial",
};

function getMovementLabel(type: string) {
  return MOVEMENT_TYPE_LABELS[type] || type;
}

function getMovementColor(type: string): string {
  if (
    type.includes("PURCHASE") ||
    type.includes("IN") ||
    type === "INITIAL" ||
    type.includes("RETURN_IN")
  ) {
    return "text-success-600 dark:text-success-400";
  }
  if (type.includes("SALE") || type.includes("OUT")) {
    return "text-error-600 dark:text-error-400";
  }
  return "text-neutral-600 dark:text-neutral-400";
}

function getMovementBadgeVariant(
  type: string,
): "success" | "error" | "secondary" | "warning" | "primary" {
  if (
    type.includes("PURCHASE") ||
    type.includes("IN") ||
    type === "INITIAL"
  ) {
    return "success";
  }
  if (type.includes("SALE") || type.includes("OUT")) {
    return "error";
  }
  if (type.includes("ADJUSTMENT")) {
    return "warning";
  }
  return "secondary";
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function KardexPage() {
  // Filters
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Submitted filters (only query when user clicks Consultar)
  const [queryProductId, setQueryProductId] = useState("");
  const [queryWarehouseId, setQueryWarehouseId] = useState("");
  const [queryFromDate, setQueryFromDate] = useState("");
  const [queryToDate, setQueryToDate] = useState("");

  // Data hooks
  const { data: productsData } = useProducts({ limit: 200 });
  const { data: warehousesData } = useWarehouses();

  const {
    data: kardexData,
    isLoading,
    isFetching,
  } = useKardex(
    queryProductId,
    queryWarehouseId || undefined,
    queryFromDate || undefined,
    queryToDate || undefined,
  );

  const productOptions = useMemo(() => {
    const products = productsData?.data ?? [];
    return products.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.sku})`,
    }));
  }, [productsData]);

  const warehouseOptions = useMemo(() => {
    const warehouses = warehousesData ?? [];
    return [
      { value: "", label: "Todas las bodegas" },
      ...warehouses.map((w) => ({
        value: w.id,
        label: w.name,
      })),
    ];
  }, [warehousesData]);

  const handleConsultar = () => {
    if (!selectedProductId) return;
    setQueryProductId(selectedProductId);
    setQueryWarehouseId(selectedWarehouseId);
    setQueryFromDate(fromDate);
    setQueryToDate(toDate);
  };

  const report = kardexData as KardexReport | undefined;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Kardex de Inventario
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Consulta el movimiento detallado de tus productos
          </p>
        </div>
      </PageSection>

      {/* Filters */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary-500" />
              Filtros de Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Product selector (required) */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Producto *
                </label>
                <Select
                  options={productOptions}
                  value={selectedProductId}
                  onChange={(val) => setSelectedProductId(val)}
                  placeholder="Seleccionar producto..."
                />
              </div>

              {/* Warehouse selector (optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Bodega
                </label>
                <Select
                  options={warehouseOptions}
                  value={selectedWarehouseId}
                  onChange={(val) => setSelectedWarehouseId(val)}
                  placeholder="Todas"
                />
              </div>

              {/* Date range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Desde
                </label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Hasta
                </label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleConsultar}
                disabled={!selectedProductId}
                leftIcon={<Search className="h-4 w-4" />}
              >
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* No product selected state */}
      {!queryProductId && (
        <PageSection>
          <div className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Selecciona un producto
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
              Selecciona un producto y haz clic en "Consultar" para ver el
              reporte Kardex con todos los movimientos de inventario.
            </p>
          </div>
        </PageSection>
      )}

      {/* Loading state */}
      {queryProductId && isLoading && (
        <PageSection>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageSection>
      )}

      {/* Product Info Card + Results */}
      {queryProductId && report && !isLoading && (
        <>
          {/* Product Info */}
          <PageSection>
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                      <Package className="h-6 w-6 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {report.product.name}
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        SKU: {report.product.sku}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Stock Actual
                      </p>
                      <p className="text-xl font-bold text-neutral-900 dark:text-white">
                        {report.product.currentStock}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Costo Unitario
                      </p>
                      <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(report.product.costPrice)}
                      </p>
                    </div>
                    {report.warehouse && (
                      <div className="text-center">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Bodega
                        </p>
                        <Badge variant="outline" size="lg">
                          <Warehouse className="h-3 w-3 mr-1" />
                          {report.warehouse.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </PageSection>

          {/* Opening / Closing Balances */}
          <PageSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Saldo Inicial
                    </p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                      {report.openingBalance} uds
                    </p>
                    {report.fromDate && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Al {formatDate(report.fromDate)}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <TrendingUp className="h-5 w-5 text-neutral-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Saldo Final
                    </p>
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                      {report.closingBalance} uds
                    </p>
                    {report.toDate && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Al {formatDate(report.toDate)}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                    <TrendingUp className="h-5 w-5 text-primary-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </PageSection>

          {/* Movements Table */}
          <PageSection>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary-500" />
                  Movimientos
                  {report.movements.length > 0 && (
                    <Badge variant="secondary" size="sm">
                      {report.movements.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {report.movements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <ClipboardList className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No hay movimientos en el rango seleccionado
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descripcion</TableHead>
                          <TableHead className="text-right">Entradas</TableHead>
                          <TableHead className="text-right">Salidas</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.movements.map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell className="whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
                              {formatDate(mov.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getMovementBadgeVariant(mov.type)}
                                size="sm"
                              >
                                {getMovementLabel(mov.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-neutral-900 dark:text-white">
                                {mov.description}
                              </p>
                              {mov.reference && (
                                <p className="text-xs text-neutral-400 mt-0.5">
                                  Ref: {mov.reference}
                                </p>
                              )}
                              {mov.warehouseName && (
                                <p className="text-xs text-neutral-400 mt-0.5">
                                  Bodega: {mov.warehouseName}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {mov.entries > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-success-600 dark:text-success-400 font-medium">
                                  <ArrowUpRight className="h-3 w-3" />
                                  +{mov.entries}
                                </span>
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-600">
                                  <Minus className="h-3 w-3 inline" />
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {mov.exits > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-error-600 dark:text-error-400 font-medium">
                                  <ArrowDownRight className="h-3 w-3" />
                                  -{mov.exits}
                                </span>
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-600">
                                  <Minus className="h-3 w-3 inline" />
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-neutral-900 dark:text-white">
                              {mov.balance}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </PageSection>
        </>
      )}
    </PageWrapper>
  );
}
