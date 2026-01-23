import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  Users,
  Eye,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  CheckCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import type { Route } from './+types/_app.customers';
import { cn, debounce, formatCurrency } from '~/lib/utils';
import {
  useCustomers,
  useCustomerCities,
  useDeleteCustomer,
} from '~/hooks/useCustomers';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Select } from '~/components/ui/Select';
import { Pagination, PaginationInfo } from '~/components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '~/components/ui/Table';
import { Skeleton, SkeletonTableRow } from '~/components/ui/Skeleton';
import { DeleteModal } from '~/components/ui/DeleteModal';
import type { CustomerFilters, Customer, CustomerType } from '~/types/customer';
import { useUrlFilters } from '~/hooks/useUrlFilters';

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Clientes - StockFlow' },
    { name: 'description', content: 'Gestion de clientes' },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
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

// Type options
const typeOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'INDIVIDUAL', label: 'Persona Natural' },
  { value: 'BUSINESS', label: 'Empresa' },
];

// Status options
const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

// Items per page options
const pageSizeOptions = [
  { value: '10', label: '10 por pagina' },
  { value: '25', label: '25 por pagina' },
  { value: '50', label: '50 por pagina' },
];

// Parser config for customer filters
const customerFiltersParser = {
  parse: (searchParams: URLSearchParams): CustomerFilters => ({
    search: searchParams.get('search') || undefined,
    type: (searchParams.get('type') as CustomerType) || undefined,
    city: searchParams.get('city') || undefined,
    isActive: searchParams.get('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
  }),
};

export default function CustomersPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { filters, updateFilters, clearFilters } = useUrlFilters<CustomerFilters>({
    parserConfig: customerFiltersParser,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Queries
  const { data: customersData, isLoading, isError } = useCustomers(filters);
  const { data: cities = [] } = useCustomerCities();
  const deleteCustomer = useDeleteCustomer();

  // City options
  const cityOptions = useMemo(
    () => [
      { value: '', label: 'Todas las ciudades' },
      ...cities.map((city) => ({ value: city, label: city })),
    ],
    [cities]
  );

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => updateFilters({ search: value || undefined }), 300),
    [updateFilters]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle delete
  const handleDelete = async () => {
    if (deletingCustomer) {
      await deleteCustomer.mutateAsync(deletingCustomer.id);
      setDeletingCustomer(null);
    }
  };

  const customers = customersData?.data || [];
  const meta = customersData?.meta;
  const hasActiveFilters =
    filters.search || filters.type || filters.city || filters.isActive !== undefined;

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Clientes
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona tu base de clientes
          </p>
        </div>
        <Link to="/customers/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Nuevo Cliente
          </Button>
        </Link>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <Card padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar clientes por nombre, email, documento..."
                  className="pl-10"
                  defaultValue={filters.search}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Filter toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  showFilters && 'bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900/20'
                )}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="primary" className="ml-2">
                    {[filters.type, filters.city, filters.isActive !== undefined].filter(Boolean).length}
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

            {/* Filter options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={typeOptions}
                      value={filters.type || ''}
                      onChange={(value) =>
                        updateFilters({ type: (value as CustomerType) || undefined })
                      }
                      placeholder="Todos los tipos"
                    />
                    <Select
                      options={cityOptions}
                      value={filters.city || ''}
                      onChange={(value) => updateFilters({ city: value || undefined })}
                      placeholder="Todas las ciudades"
                    />
                    <Select
                      options={statusOptions}
                      value={filters.isActive !== undefined ? String(filters.isActive) : ''}
                      onChange={(value) =>
                        updateFilters({
                          isActive: value ? value === 'true' : undefined,
                        })
                      }
                      placeholder="Todos los estados"
                    />
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
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Total Compras</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
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
              <p className="text-error-500">Error al cargar los clientes</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                <Users className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                {hasActiveFilters ? 'Sin resultados' : 'No hay clientes'}
              </h3>
              <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                {hasActiveFilters
                  ? 'No se encontraron clientes con los filtros aplicados.'
                  : 'Comienza agregando tu primer cliente.'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Link to="/customers/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar cliente
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Contacto</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">Total Compras</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {customers.map((customer) => (
                      <motion.tr
                        key={customer.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                              {customer.type === 'BUSINESS' ? (
                                <Building2 className="h-5 w-5 text-primary-500" />
                              ) : (
                                <User className="h-5 w-5 text-primary-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {customer.name}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {customer.document || 'Sin documento'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Mail className="h-3.5 w-3.5 text-neutral-400" />
                              <span className="text-neutral-700 dark:text-neutral-300">
                                {customer.email}
                              </span>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-neutral-400" />
                                <span className="text-neutral-700 dark:text-neutral-300">
                                  {customer.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={customer.type === 'BUSINESS' ? 'primary' : 'secondary'}>
                            {customer.type === 'BUSINESS' ? 'Empresa' : 'Persona'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-success-500" />
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {formatCurrency(customer.totalSpent || 0)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {customer.totalPurchases || 0} compras
                          </p>
                        </TableCell>
                        <TableCell>
                          {customer.isActive ? (
                            <Badge variant="success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="error">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link to={`/customers/${customer.id}`}>
                              <Button variant="ghost" size="icon" title="Ver detalles">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/customers/${customer.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCustomer(customer)}
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

              {/* Pagination */}
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
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        itemName={deletingCustomer?.name || ''}
        itemType="cliente"
        onConfirm={handleDelete}
        isLoading={deleteCustomer.isPending}
      />
    </motion.div>
  );
}