import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useExchangeRates,
  useCurrencies,
  useCreateExchangeRate,
  useDeleteExchangeRate,
} from "~/hooks/useExchangeRates";
import { CurrencySelector } from "~/components/ui/CurrencySelector";
import type { CurrencyCode, CreateExchangeRateDto } from "~/types/exchange-rate";
import { cn } from "~/lib/utils";

/**
 * Exchange rates management page.
 *
 * vercel-react-best-practices applied:
 * - rerender-functional-setstate: functional setState for form fields
 * - rerender-use-ref-transient-values: no refs needed (controlled inputs)
 * - bundle-barrel-imports: direct imports only
 */
export default function SettingsCurrencies() {
  const { data: rates, isLoading } = useExchangeRates();
  const { data: currencies } = useCurrencies();
  const createRate = useCreateExchangeRate();
  const deleteRate = useDeleteExchangeRate();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("COP");
  const [rate, setRate] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!rate || Number(rate) <= 0) return;

      const dto: CreateExchangeRateDto = {
        fromCurrency,
        toCurrency,
        rate: Number(rate),
      };

      createRate.mutate(dto, {
        onSuccess: () => {
          setShowForm(false);
          setRate("");
        },
      });
    },
    [fromCurrency, toCurrency, rate, createRate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteRate.mutate(id);
    },
    [deleteRate],
  );

  const getCurrencySymbol = useCallback(
    (code: string) => {
      return currencies?.find((c) => c.code === code)?.symbol ?? code;
    },
    [currencies],
  );

  return (
    <PageWrapper
      title="Tasas de Cambio"
      description="Gestiona las tasas de cambio para operaciones multi-moneda"
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Configuracion
          </Link>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nueva Tasa
          </button>
        </div>
      }
    >
      {/* Quick Add Form */}
      {showForm && (
        <PageSection>
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
              Agregar Tasa de Cambio
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  De
                </label>
                <CurrencySelector
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  className="w-full"
                />
              </div>

              <div className="flex items-end justify-center pb-2">
                <ArrowLeftRight className="h-5 w-5 text-neutral-400" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  A
                </label>
                <CurrencySelector
                  value={toCurrency}
                  onChange={setToCurrency}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tasa
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.00000001"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Ej: 4200.50"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createRate.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {createRate.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Guardar
              </button>
            </div>
          </motion.form>
        </PageSection>
      )}

      {/* Rates Table */}
      <PageSection>
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : !rates?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowLeftRight className="mb-3 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                Sin tasas de cambio
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Agrega tu primera tasa de cambio para habilitar operaciones
                multi-moneda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Par
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Tasa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Fuente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Fecha Efectiva
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {rates.map((exchangeRate) => (
                    <motion.tr
                      key={exchangeRate.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                            )}
                          >
                            {getCurrencySymbol(exchangeRate.fromCurrency)}{" "}
                            {exchangeRate.fromCurrency}
                          </span>
                          <ArrowLeftRight className="h-3 w-3 text-neutral-400" />
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                            )}
                          >
                            {getCurrencySymbol(exchangeRate.toCurrency)}{" "}
                            {exchangeRate.toCurrency}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-sm font-medium text-neutral-900 dark:text-white">
                        {Number(exchangeRate.rate).toLocaleString("es-CO", {
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        <span className="capitalize">{exchangeRate.source}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {new Date(exchangeRate.effectiveDate).toLocaleDateString(
                          "es-CO",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(exchangeRate.id)}
                          disabled={deleteRate.isPending}
                          className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageSection>
    </PageWrapper>
  );
}
