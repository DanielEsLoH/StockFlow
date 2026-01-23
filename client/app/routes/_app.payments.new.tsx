import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Route } from './+types/_app.payments.new';
import { cn, formatCurrency } from '~/lib/utils';
import { useCreatePayment } from '~/hooks/usePayments';
import { useCustomers } from '~/hooks/useCustomers';
import { useInvoices } from '~/hooks/useInvoices';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/Card';
import { Select } from '~/components/ui/Select';
import type { PaymentMethod } from '~/types/payment';
import { PaymentMethodLabels } from '~/types/payment';
import type { InvoiceSummary } from '~/types/invoice';

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Nuevo Pago - StockFlow' },
    { name: 'description', content: 'Registrar un nuevo pago' },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// Form schema
const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Seleccione una factura'),
  customerId: z.string().min(1, 'El cliente es requerido'),
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),

  method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'], {
    message: 'Seleccione un metodo de pago',
  }),
  paymentDate: z.string().min(1, 'La fecha de pago es requerida'),
  reference: z.string().optional(),
  notes: z.string().max(500, 'Maximo 500 caracteres').optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Calculate invoice balance
function calculateInvoiceBalance(invoice: InvoiceSummary): {
  total: number;
  paid: number;
  remaining: number;
} {
  // For now, we assume the paidAmount is tracked somewhere
  // If not available, we use total as remaining for pending/overdue invoices
  const total = invoice.total;
  // If invoice is PAID, remaining is 0
  if (invoice.status === 'PAID') {
    return { total, paid: total, remaining: 0 };
  }
  // For PENDING/OVERDUE, assume nothing paid yet (this would be improved with actual paid tracking)
  return { total, paid: 0, remaining: total };
}

export default function NewPaymentPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);

  // Queries
  const { data: customersData } = useCustomers({ limit: 100 });
  const { data: invoicesData, isLoading: isLoadingInvoices } = useInvoices({
    limit: 100,
    // Only show pending and overdue invoices that can receive payments
  });
  const createPayment = useCreatePayment();

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: '',
      customerId: '',
      amount: 0,
      method: undefined,
      paymentDate: getTodayDate(),
      reference: '',
      notes: '',
    },
  });

  const watchedInvoiceId = watch('invoiceId');

  // Filter invoices to only show pending and overdue
  const payableInvoices = useMemo(() => {
    return (invoicesData?.data || []).filter(
      (invoice) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE'
    );
  }, [invoicesData]);

  // Memoized options for invoice dropdown
  const invoiceOptions = useMemo(
    () => [
      { value: '', label: 'Seleccionar factura...' },
      ...payableInvoices.map((invoice) => ({
        value: invoice.id,
        label: `${invoice.invoiceNumber} - ${invoice.customer?.name || 'Sin cliente'} - ${formatCurrency(invoice.total)}`,
      })),
    ],
    [payableInvoices]
  );

  // Memoized options for payment method dropdown
  const paymentMethodOptions = useMemo(
    () => [
      { value: '', label: 'Seleccionar metodo...' },
      ...Object.entries(PaymentMethodLabels).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    []
  );

  // Invoice lookup map
  const invoicesMap = useMemo(() => {
    const map = new Map<string, InvoiceSummary>();
    payableInvoices.forEach((invoice) => {
      map.set(invoice.id, invoice);
    });
    return map;
  }, [payableInvoices]);

  // Customer lookup map
  const customersMap = useMemo(() => {
    const map = new Map<string, string>();
    (customersData?.data || []).forEach((customer) => {
      map.set(customer.id, customer.name);
    });
    return map;
  }, [customersData]);

  // Handle invoice selection - auto-fill customer and amount
  useEffect(() => {
    if (watchedInvoiceId) {
      const invoice = invoicesMap.get(watchedInvoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
        setValue('customerId', invoice.customerId);
        const balance = calculateInvoiceBalance(invoice);
        setValue('amount', balance.remaining);
      }
    } else {
      setSelectedInvoice(null);
      setValue('customerId', '');
      setValue('amount', 0);
    }
  }, [watchedInvoiceId, invoicesMap, setValue]);

  // Submit handler
  const onSubmit = (data: PaymentFormData) => {
    createPayment.mutate({
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      amount: data.amount,
      method: data.method as PaymentMethod,
      paymentDate: data.paymentDate,
      reference: data.reference || '',
      notes: data.notes,
    });
  };

  // Calculate selected invoice balance
  const invoiceBalance = selectedInvoice ? calculateInvoiceBalance(selectedInvoice) : null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-4">
          <Link to="/payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nuevo Pago
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Registra un nuevo pago para una factura
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Selection */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Seleccionar Factura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Factura *
                    </label>
                    <Controller
                      name="invoiceId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          options={invoiceOptions}
                          value={field.value}
                          onChange={field.onChange}
                          error={!!errors.invoiceId}
                          disabled={isLoadingInvoices}
                        />
                      )}
                    />
                    {errors.invoiceId && (
                      <p className="mt-1 text-sm text-error-500">{errors.invoiceId.message}</p>
                    )}
                  </div>

                  {/* Auto-filled customer (read-only display) */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Cliente
                    </label>
                    <Input
                      value={selectedInvoice?.customer?.name || customersMap.get(watch('customerId')) || ''}
                      disabled
                      placeholder="Se llenara automaticamente al seleccionar factura"
                    />
                    <input type="hidden" {...register('customerId')} />
                    {errors.customerId && (
                      <p className="mt-1 text-sm text-error-500">{errors.customerId.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Invoice Summary (shown when invoice is selected) */}
            {selectedInvoice && invoiceBalance && (
              <motion.div variants={itemVariants}>
                <Card className="border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      Resumen de Factura
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Numero</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {selectedInvoice.invoiceNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Factura</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(invoiceBalance.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Pagado</p>
                        <p className="font-semibold text-success-600">
                          {formatCurrency(invoiceBalance.paid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Pendiente</p>
                        <p className="font-semibold text-warning-600">
                          {formatCurrency(invoiceBalance.remaining)}
                        </p>
                      </div>
                    </div>
                    {selectedInvoice.status === 'OVERDUE' && (
                      <div className="mt-4 flex items-center gap-2 text-error-600 dark:text-error-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Esta factura esta vencida</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Payment Details */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Detalles del Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Monto a Pagar *
                      </label>
                      <Input
                        {...register('amount', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        step="100"
                        placeholder="0"
                        error={!!errors.amount}
                      />
                      {errors.amount && (
                        <p className="mt-1 text-sm text-error-500">{errors.amount.message}</p>
                      )}
                      {invoiceBalance && watch('amount') > invoiceBalance.remaining && (
                        <p className="mt-1 text-sm text-warning-500">
                          El monto excede el saldo pendiente
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Metodo de Pago *
                      </label>
                      <Controller
                        name="method"
                        control={control}
                        render={({ field }) => (
                          <Select
                            options={paymentMethodOptions}
                            value={field.value || ''}
                            onChange={field.onChange}
                            error={!!errors.method}
                          />
                        )}
                      />
                      {errors.method && (
                        <p className="mt-1 text-sm text-error-500">{errors.method.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Fecha de Pago *
                      </label>
                      <Input
                        {...register('paymentDate')}
                        type="date"
                        error={!!errors.paymentDate}
                      />
                      {errors.paymentDate && (
                        <p className="mt-1 text-sm text-error-500">{errors.paymentDate.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero de Referencia
                      </label>
                      <Input
                        {...register('reference')}
                        placeholder="Ej: Numero de transaccion, cheque, etc."
                        error={!!errors.reference}
                      />
                      {errors.reference && (
                        <p className="mt-1 text-sm text-error-500">{errors.reference.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notes */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    {...register('notes')}
                    placeholder="Notas adicionales para el pago (opcional)"
                    rows={3}
                    className={cn(
                      'w-full rounded-lg border border-neutral-300 dark:border-neutral-600',
                      'bg-white dark:bg-neutral-900 px-4 py-2.5',
                      'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                      'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none',
                      'transition-colors resize-none'
                    )}
                  />
                  {errors.notes && (
                    <p className="mt-1 text-sm text-error-500">{errors.notes.message}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">Factura</span>
                    <span className="text-neutral-900 dark:text-white">
                      {selectedInvoice?.invoiceNumber || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">Cliente</span>
                    <span className="text-neutral-900 dark:text-white truncate max-w-[150px]">
                      {selectedInvoice?.customer?.name || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">Metodo</span>
                    <span className="text-neutral-900 dark:text-white">
                      {watch('method') ? PaymentMethodLabels[watch('method') as PaymentMethod] : '-'}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-between">
                      <span className="font-semibold text-neutral-900 dark:text-white">Monto</span>
                      <span className="text-xl font-bold text-neutral-900 dark:text-white">
                        {formatCurrency(watch('amount') || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting || createPayment.isPending}
                    disabled={!selectedInvoice}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                  <Link to="/payments" className="block">
                    <Button type="button" variant="ghost" className="w-full">
                      Cancelar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Help Info */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Informacion
                  </h4>
                  <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
                    <li>- Solo facturas pendientes o vencidas pueden recibir pagos</li>
                    <li>- El monto puede ser menor al saldo (pago parcial)</li>
                    <li>- La referencia es util para rastrear transferencias</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}