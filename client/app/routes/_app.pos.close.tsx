import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  LogOut,
  DollarSign,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { Route } from "./+types/_app.pos.close";
import { useCurrentSession, useCloseSession, useXReport } from "~/hooks/usePOS";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { formatCurrency, formatDateTime } from "~/lib/utils";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cerrar Turno - POS - StockFlow" },
    { name: "description", content: "Cerrar turno de caja" },
  ];
};

export default function POSClosePage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: session, isLoading: loadingSession } = useCurrentSession();
  const { data: xReport, isLoading: loadingReport } = useXReport(
    session?.id || "",
  );
  const closeSession = useCloseSession();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loadingSession && !session) {
      navigate("/pos/open");
    }
  }, [session, loadingSession, navigate]);

  if (loadingSession || !session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const expectedCash = xReport?.expectedCash || session.openingAmount || 0;
  const closingAmountNum = parseFloat(closingAmount) || 0;
  const difference = closingAmountNum - expectedCash;
  const hasDifference = closingAmount && Math.abs(difference) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingAmount) return;

    await closeSession.mutateAsync({
      sessionId: session.id,
      data: {
        closingAmount: closingAmountNum,
        notes: notes || undefined,
      },
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/pos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Cerrar Turno de Caja
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Arqueo y cierre de {session.cashRegister?.name}
          </p>
        </div>
      </motion.div>

      {/* Session Summary */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Resumen del Turno
            </h2>

            {loadingReport ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Session Info */}
                <div className="space-y-4">
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
                      Apertura:
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {formatDateTime(session.openedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Monto Inicial:
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(session.openingAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Total Ventas:
                    </span>
                    <span className="font-medium text-success-600">
                      {formatCurrency(xReport?.totalSales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Transacciones:
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {xReport?.totalTransactions || 0}
                    </span>
                  </div>
                </div>

                {/* Right Column - Cash Breakdown */}
                <div className="space-y-4">
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Desglose por Metodo
                  </h3>
                  {xReport?.salesByPaymentMethod &&
                  Object.entries(xReport.salesByPaymentMethod).length > 0 ? (
                    Object.entries(xReport.salesByPaymentMethod).map(
                      ([method, amount]) => (
                        <div
                          key={method}
                          className="flex justify-between items-center"
                        >
                          <div className="flex items-center gap-2">
                            {method === "CASH" ? (
                              <Banknote className="h-4 w-4 text-success-500" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-primary-500" />
                            )}
                            <span className="text-neutral-500 dark:text-neutral-400 capitalize">
                              {method === "CASH"
                                ? "Efectivo"
                                : method === "CARD"
                                  ? "Tarjeta"
                                  : method === "TRANSFER"
                                    ? "Transferencia"
                                    : method}
                            </span>
                          </div>
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {formatCurrency(Number(amount))}
                          </span>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                      Sin ventas registradas
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Expected Cash */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary-200 dark:border-primary-800">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/20">
                  <Banknote className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Efectivo Esperado en Caja
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(expectedCash)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Calculado</Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
              = Apertura + Ventas Efectivo + Ingresos - Retiros
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Close Form */}
      <motion.div variants={itemVariants}>
        <Card>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Arqueo de Caja
            </h2>

            {/* Closing Amount */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Efectivo Contado en Caja *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 text-lg"
                  required
                />
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Cuenta el efectivo fisico en la caja
              </p>
            </div>

            {/* Difference Alert */}
            {hasDifference && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  difference > 0
                    ? "bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800"
                    : "bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800"
                }`}
              >
                {difference > 0 ? (
                  <TrendingUp className="h-5 w-5 text-success-500 mt-0.5" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-error-500 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      difference > 0
                        ? "text-success-800 dark:text-success-200"
                        : "text-error-800 dark:text-error-200"
                    }`}
                  >
                    {difference > 0 ? "Sobrante" : "Faltante"}:{" "}
                    {formatCurrency(Math.abs(difference))}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      difference > 0
                        ? "text-success-600 dark:text-success-300"
                        : "text-error-600 dark:text-error-300"
                    }`}
                  >
                    {difference > 0
                      ? "Hay mas efectivo del esperado en la caja."
                      : "Hay menos efectivo del esperado en la caja."}
                  </p>
                </div>
              </div>
            )}

            {/* No Difference - Success */}
            {closingAmount && !hasDifference && (
              <div className="p-4 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success-500" />
                <p className="text-success-800 dark:text-success-200 font-medium">
                  El arqueo coincide con lo esperado
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Notas de Cierre (opcional)
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Diferencia por error en vuelto, turno normal..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Link to="/pos">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                variant={hasDifference && difference < 0 ? "danger" : "primary"}
                disabled={!closingAmount || closeSession.isPending}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                {closeSession.isPending ? "Cerrando..." : "Cerrar Turno"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
