import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '~/lib/animations';
import {
  Play,
  DollarSign,
  Warehouse,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import type { Route } from './+types/_app.pos.open';
import { useCashRegisters, useOpenSession, useCurrentSession } from '~/hooks/usePOS';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';
import { Select } from '~/components/ui/Select';
import { formatCurrency } from '~/lib/utils';

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Abrir Turno - POS - StockFlow' },
    { name: 'description', content: 'Abrir turno de caja' },
  ];
};

export default function POSOpenPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: registersData, isLoading: loadingRegisters } = useCashRegisters({
    status: 'OPEN',
  });
  const { data: currentSession, isLoading: loadingSession } = useCurrentSession();
  const openSession = useOpenSession();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const availableRegisters = registersData?.data.filter(
    (r) => r.status === 'OPEN'
  ) || [];

  const registerOptions = [
    { value: '', label: 'Seleccionar caja...' },
    ...availableRegisters.map((r) => ({
      value: r.id,
      label: `${r.name} - ${r.warehouse?.name || 'Sin bodega'}`,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegister) return;

    await openSession.mutateAsync({
      cashRegisterId: selectedRegister,
      openingAmount: parseFloat(openingAmount) || 0,
      notes: notes || undefined,
    });
  };

  const isLoading = loadingRegisters || loadingSession;
  const hasActiveSession = !!currentSession;

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? 'hidden' : false}
      animate="visible"
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Abrir Turno de Caja
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Inicia tu sesion de trabajo
          </p>
        </div>
      </motion.div>

      {/* Active Session Warning */}
      {hasActiveSession && (
        <motion.div variants={itemVariants}>
          <Card className="border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/20">
            <div className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning-500 mt-0.5" />
              <div>
                <p className="font-medium text-warning-800 dark:text-warning-200">
                  Ya tienes una sesion activa
                </p>
                <p className="text-sm text-warning-600 dark:text-warning-300 mt-1">
                  Debes cerrar tu sesion actual antes de abrir una nueva.
                </p>
                <Link to="/pos">
                  <Button variant="outline" size="sm" className="mt-3">
                    Ir al POS
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Open Session Form */}
      {!hasActiveSession && (
        <motion.div variants={itemVariants}>
          <Card>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Cash Register Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Caja Registradora *
                </label>
                <Select
                  options={registerOptions}
                  value={selectedRegister}
                  onChange={setSelectedRegister}
                  disabled={loadingRegisters}
                />
                {availableRegisters.length === 0 && !loadingRegisters && (
                  <p className="text-sm text-error-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-4 w-4" />
                    No hay cajas disponibles. Contacta al administrador.
                  </p>
                )}
              </div>

              {/* Opening Amount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Monto Inicial en Caja *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Ingresa el efectivo con el que inicias el turno
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Notas (opcional)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Turno matutino, conteo verificado..."
                />
              </div>

              {/* Summary */}
              {selectedRegister && openingAmount && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Resumen de Apertura
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Caja:
                    </span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {registerOptions.find((r) => r.value === selectedRegister)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Monto Inicial:
                    </span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {formatCurrency(parseFloat(openingAmount) || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Link to="/dashboard">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={!selectedRegister || !openingAmount || openSession.isPending}
                  leftIcon={<Play className="h-4 w-4" />}
                >
                  {openSession.isPending ? 'Abriendo...' : 'Abrir Turno'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* No Registers Available */}
      {!isLoading && availableRegisters.length === 0 && !hasActiveSession && (
        <motion.div variants={itemVariants}>
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                <Warehouse className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                No hay cajas disponibles
              </h3>
              <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                Todas las cajas estan ocupadas o cerradas. Contacta al administrador
                para habilitar una caja.
              </p>
              <Link to="/pos/cash-registers">
                <Button variant="outline">Ver Cajas Registradoras</Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
