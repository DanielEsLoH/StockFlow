import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Pencil,
  X,
  UserCheck,
  Users,
} from "lucide-react";
import type { Route } from "./+types/_app.payroll.employees";
import { debounce } from "~/lib/utils";
import { useEmployees } from "~/hooks/usePayroll";
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
  AnimatedTableRow,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import {
  EmployeeStatusLabels,
  EmployeeStatusVariants,
  ContractTypeLabels,
} from "~/types/payroll";
import type { EmployeeFilters, EmployeeStatus, ContractType } from "~/types/payroll";
import { useUrlFilters } from "~/hooks/useUrlFilters";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";
import { formatCurrency } from "~/lib/utils";

export const meta: Route.MetaFunction = () => [
  { title: "Empleados - StockFlow" },
  { name: "description", content: "Gestion de empleados para nomina" },
];

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
  { value: "ON_LEAVE", label: "En licencia" },
  { value: "TERMINATED", label: "Retirados" },
];

const contractOptions = [
  { value: "", label: "Todos los contratos" },
  { value: "TERMINO_FIJO", label: "Termino Fijo" },
  { value: "TERMINO_INDEFINIDO", label: "Termino Indefinido" },
  { value: "OBRA_O_LABOR", label: "Obra o Labor" },
  { value: "PRESTACION_SERVICIOS", label: "Prestacion de Servicios" },
];

const employeeFiltersParser = {
  parse: (searchParams: URLSearchParams): EmployeeFilters => ({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as EmployeeStatus) || undefined,
    contractType: (searchParams.get("contractType") as ContractType) || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
  }),
};

export default function EmployeesPage() {
  const { hasPermission } = usePermissions();
  const [showFilters, setShowFilters] = useState(false);
  const { filters, updateFilters, clearFilters } =
    useUrlFilters<EmployeeFilters>({
      parserConfig: employeeFiltersParser,
    });

  const { data: employeesData, isLoading, isError } = useEmployees(filters);

  const debouncedSearch = useMemo(
    () =>
      debounce(
        (value: string) => updateFilters({ search: value || undefined }),
        300,
      ),
    [updateFilters],
  );

  const employees = employeesData?.data || [];
  const meta = employeesData?.meta;
  const hasActiveFilters = filters.search || filters.status || filters.contractType;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10">
            <UserCheck className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Empleados
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {meta?.total || 0} empleados registrados
            </p>
          </div>
        </div>
        {hasPermission(Permission.PAYROLL_CREATE) && (
          <Link to="/payroll/employees/new">
            <Button variant="gradient" leftIcon={<Plus className="h-4 w-4" />}>
              Nuevo Empleado
            </Button>
          </Link>
        )}
      </PageSection>

      {/* Search and Filters */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar empleados por nombre, documento..."
                  className="pl-10"
                  defaultValue={filters.search}
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>
              <Button
                variant={showFilters ? "soft-primary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="gradient" size="xs" className="ml-2">
                    {[filters.status, filters.contractType].filter(Boolean).length}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Select
                      options={statusOptions}
                      value={filters.status || ""}
                      onChange={(value) =>
                        updateFilters({ status: (value as EmployeeStatus) || undefined })
                      }
                      placeholder="Todos los estados"
                    />
                    <Select
                      options={contractOptions}
                      value={filters.contractType || ""}
                      onChange={(value) =>
                        updateFilters({ contractType: (value as ContractType) || undefined })
                      }
                      placeholder="Todos los contratos"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden md:table-cell">Documento</TableHead>
                  <TableHead className="hidden sm:table-cell">Contrato</TableHead>
                  <TableHead className="hidden lg:table-cell">Salario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar los empleados"
              description="Hubo un problema al cargar los empleados. Por favor, intenta de nuevo."
              action={{ label: "Reintentar", onClick: () => window.location.reload() }}
            />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-16 w-16" />}
              title={hasActiveFilters ? "Sin resultados" : "No hay empleados"}
              description={
                hasActiveFilters
                  ? "No se encontraron empleados con los filtros aplicados."
                  : "Comienza agregando tu primer empleado."
              }
              action={
                hasActiveFilters
                  ? { label: "Limpiar filtros", onClick: clearFilters }
                  : { label: "Agregar empleado", onClick: () => (window.location.href = "/payroll/employees/new") }
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="hidden md:table-cell">Documento</TableHead>
                    <TableHead className="hidden sm:table-cell">Contrato</TableHead>
                    <TableHead className="hidden lg:table-cell">Salario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee, i) => (
                    <AnimatedTableRow key={employee.id} index={i} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/10">
                            <UserCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <Link
                              to={`/payroll/employees/${employee.id}`}
                              className="font-semibold text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                              {employee.firstName} {employee.lastName}
                            </Link>
                            {employee.email && (
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {employee.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {employee.documentNumber}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {employee.documentType}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">
                          {ContractTypeLabels[employee.contractType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                          {formatCurrency(employee.baseSalary)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={EmployeeStatusVariants[employee.status]}
                          dot
                        >
                          {EmployeeStatusLabels[employee.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/payroll/employees/${employee.id}`}>
                            <Button variant="ghost" size="icon" title="Ver detalles">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {hasPermission(Permission.PAYROLL_EDIT) && (
                            <Link to={`/payroll/employees/${employee.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
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
      </PageSection>
    </PageWrapper>
  );
}
