import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  DollarSign,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingCart,
  FileText,
  Download,
} from "lucide-react";
import type { Route } from "./+types/_app.pos.sessions.$id";
import { usePOSSession, useXReport, useSessionMovements } from "~/hooks/usePOS";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { formatCurrency, formatDateTime } from "~/lib/utils";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Detalle de Sesion - POS - StockFlow" },
    { name: "description", content: "Detalle de sesion de caja" },
  ];
};

const movementTypeLabels: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  OPENING: {
    label: "Apertura",
    icon: <PlayCircle className="h-4 w-4" />,
    color: "text-primary-500 bg-primary-50 dark:bg-primary-900/20",
  },
  CLOSING: {
    label: "Cierre",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-secondary-500 bg-secondary-50 dark:bg-secondary-900/20",
  },
  SALE: {
    label: "Venta",
    icon: <ShoppingCart className="h-4 w-4" />,
    color: "text-success-500 bg-success-50 dark:bg-success-900/20",
  },
  REFUND: {
    label: "Devolucion",
    icon: <ArrowDownCircle className="h-4 w-4" />,
    color: "text-warning-500 bg-warning-50 dark:bg-warning-900/20",
  },
  CASH_IN: {
    label: "Ingreso",
    icon: <ArrowUpCircle className="h-4 w-4" />,
    color: "text-success-500 bg-success-50 dark:bg-success-900/20",
  },
  CASH_OUT: {
    label: "Retiro",
    icon: <ArrowDownCircle className="h-4 w-4" />,
    color: "text-error-500 bg-error-50 dark:bg-error-900/20",
  },
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  PSE: "PSE",
};

export default function POSSessionDetailPage() {
  const { id } = useParams();
  const [isMounted, setIsMounted] = useState(false);

  const {
    data: session,
    isLoading: loadingSession,
    isError,
  } = usePOSSession(id!);
  const { data: report, isLoading: loadingReport } = useXReport(id!);
  const { data: movements, isLoading: loadingMovements } = useSessionMovements(
    id!,
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-error-500 mb-4">Error al cargar la sesion</p>
        <Link to="/pos/sessions">
          <Button variant="outline">Volver a Sesiones</Button>
        </Link>
      </div>
    );
  }

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

  const hasDifference = session.status === "CLOSED" && session.difference !== 0;

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link to="/pos/sessions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                Sesion de Caja
              </h1>
              {getStatusBadge(session.status)}
            </div>
            <p className="text-neutral-500 dark:text-neutral-400">
              {session.cashRegister?.name} - {formatDateTime(session.openedAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/pos/sales?sessionId=${session.id}`}>
            <Button variant="outline">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver Ventas
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Session Stats */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/20">
                <Banknote className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Apertura
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(session.openingAmount)}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-900/20">
                <DollarSign className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Ventas
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(report?.totalSales || 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100 dark:bg-secondary-900/20">
                <ShoppingCart className="h-5 w-5 text-secondary-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Transacciones
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {report?.totalTransactions || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-900/20">
                <Clock className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Esperado
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(report?.expectedCash || 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Difference Alert (for closed sessions) */}
      {hasDifference && (
        <motion.div variants={itemVariants}>
          <Card
            className={
              session.difference! > 0
                ? "border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20"
                : "border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-900/20"
            }
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {session.difference! > 0 ? (
                  <TrendingUp className="h-6 w-6 text-success-500" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-error-500" />
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      session.difference! > 0
                        ? "text-success-800 dark:text-success-200"
                        : "text-error-800 dark:text-error-200"
                    }`}
                  >
                    {session.difference! > 0 ? "Sobrante" : "Faltante"} en Caja
                  </p>
                  <p
                    className={`text-sm ${
                      session.difference! > 0
                        ? "text-success-600 dark:text-success-300"
                        : "text-error-600 dark:text-error-300"
                    }`}
                  >
                    Diferencia detectada al cierre
                  </p>
                </div>
              </div>
              <span
                className={`text-2xl font-bold ${
                  session.difference! > 0
                    ? "text-success-600"
                    : "text-error-600"
                }`}
              >
                {formatCurrency(Math.abs(session.difference!))}
              </span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Report Details */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Info */}
          <Card padding="md">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Informacion de Sesion
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Usuario:
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {session.user?.name ||
                    `${session.user?.firstName || ""} ${session.user?.lastName || ""}`.trim() ||
                    "Usuario"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Caja:
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {session.cashRegister?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Bodega:
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {session.cashRegister?.warehouse?.name || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Apertura:
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {formatDateTime(session.openedAt)}
                </span>
              </div>
              {session.closedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Cierre:
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatDateTime(session.closedAt)}
                  </span>
                </div>
              )}
              {session.notes && (
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Notas:
                  </p>
                  <p className="text-neutral-900 dark:text-white mt-1">
                    {session.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Sales by Payment Method */}
          <Card padding="md">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Ventas por Metodo de Pago
            </h2>
            {loadingReport ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded"
                  />
                ))}
              </div>
            ) : report?.salesByPaymentMethod &&
              Object.entries(report.salesByPaymentMethod).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(report.salesByPaymentMethod).map(
                  ([method, amount]) => (
                    <div
                      key={method}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        {method === "CASH" ? (
                          <Banknote className="h-5 w-5 text-success-500" />
                        ) : (
                          <CreditCard className="h-5 w-5 text-primary-500" />
                        )}
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {paymentMethodLabels[method] || method}
                        </span>
                      </div>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(Number(amount))}
                      </span>
                    </div>
                  ),
                )}
                <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="font-medium text-neutral-900 dark:text-white">
                    Total
                  </span>
                  <span className="text-xl font-bold text-success-600">
                    {formatCurrency(report.totalSales)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-neutral-500 dark:text-neutral-400">
                Sin ventas registradas
              </p>
            )}
          </Card>
        </div>
      </motion.div>

      {/* Movements */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Movimientos de Caja
            </h2>
          </div>
          {loadingMovements ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto" />
            </div>
          ) : movements && movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Metodo</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Referencia
                  </TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => {
                  const typeInfo = movementTypeLabels[movement.type] || {
                    label: movement.type,
                    icon: <DollarSign className="h-4 w-4" />,
                    color: "text-neutral-500 bg-neutral-50",
                  };
                  const isPositive = ["OPENING", "SALE", "CASH_IN"].includes(
                    movement.type,
                  );

                  return (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeInfo.color}`}
                          >
                            {typeInfo.icon}
                          </div>
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {typeInfo.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {movement.method
                          ? paymentMethodLabels[movement.method] ||
                            movement.method
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-neutral-500 dark:text-neutral-400">
                        {movement.reference || movement.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            isPositive ? "text-success-600" : "text-error-600"
                          }`}
                        >
                          {isPositive ? "+" : "-"}
                          {formatCurrency(movement.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-neutral-500 dark:text-neutral-400">
                        {formatDateTime(movement.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
              Sin movimientos registrados
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
