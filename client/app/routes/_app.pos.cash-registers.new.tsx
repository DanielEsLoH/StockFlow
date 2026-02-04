import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '~/lib/animations';
import { ArrowLeft, Banknote, Warehouse } from 'lucide-react';
import type { Route } from './+types/_app.pos.cash-registers.new';
import { useCreateCashRegister } from '~/hooks/usePOS';
import { useWarehouses } from '~/hooks/useWarehouses';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';
import { Select } from '~/components/ui/Select';
import { Textarea } from '~/components/ui/Textarea';

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Nueva Caja Registradora - POS - StockFlow' },
    { name: 'description', content: 'Crear nueva caja registradora' },
  ];
};

const statusOptions = [
  { value: 'OPEN', label: 'Abierta - Disponible para usar' },
  { value: 'CLOSED', label: 'Cerrada - No disponible' },
  { value: 'SUSPENDED', label: 'Suspendida - Temporalmente fuera de servicio' },
];

export default function NewCashRegisterPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [description, setDescription] = useState('');

  const createRegister = useCreateCashRegister();
  const { data: warehouses = [], isLoading: loadingWarehouses } = useWarehouses();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const warehouseOptions = [
    { value: '', label: 'Seleccionar bodega...' },
    ...warehouses.map((w) => ({
      value: w.id,
      label: w.name,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !warehouseId) return;

    await createRegister.mutateAsync({
      name,
      code,
      warehouseId,
      status: status as 'OPEN' | 'CLOSED' | 'SUSPENDED',
      description: description || undefined,
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? 'hidden' : false}
      animate="visible"
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/pos/cash-registers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Nueva Caja Registradora
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Configura una nueva caja para el punto de venta
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div variants={itemVariants}>
        <Card>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/20">
                <Banknote className="h-8 w-8 text-primary-600" />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Nombre de la Caja *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Caja Principal, Caja 1..."
                required
              />
            </div>

            {/* Code */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Codigo *
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: CAJA-001"
                required
              />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Codigo unico para identificar la caja
              </p>
            </div>

            {/* Warehouse */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Bodega *
              </label>
              <Select
                options={warehouseOptions}
                value={warehouseId}
                onChange={setWarehouseId}
                disabled={loadingWarehouses}
              />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                La bodega de donde se descontara el inventario
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Estado Inicial
              </label>
              <Select
                options={statusOptions}
                value={status}
                onChange={setStatus}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Descripcion (opcional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion o notas sobre esta caja..."
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Link to="/pos/cash-registers">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!name || !code || !warehouseId || createRegister.isPending}
              >
                {createRegister.isPending ? 'Creando...' : 'Crear Caja'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
