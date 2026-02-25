import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Trash2,
  Building2,
  ToggleLeft,
  ToggleRight,
  Hash,
  Loader2,
} from "lucide-react";
import type { Route } from "./+types/_app.cost-centers";
import { cn, debounce } from "~/lib/utils";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  useCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
} from "~/hooks/useCostCenters";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
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
import { DeleteModal } from "~/components/ui/DeleteModal";
import type { CostCenter, CreateCostCenterData } from "~/types/cost-center";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Centros de Costo - StockFlow" },
    { name: "description", content: "Gestion de centros de costo" },
  ];
};

// Inline create form component
function CreateCostCenterForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: CreateCostCenterData) => void;
  isPending: boolean;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    onSubmit({
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setCode("");
    setName("");
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-shrink-0 w-full sm:w-32">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
          Codigo
        </label>
        <Input
          placeholder="CC-001"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </div>
      <div className="flex-1">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
          Nombre
        </label>
        <Input
          placeholder="Nombre del centro de costo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex-1">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
          Descripcion
        </label>
        <Input
          placeholder="Descripcion (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        variant="gradient"
        disabled={isPending || !code.trim() || !name.trim()}
        leftIcon={
          isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )
        }
      >
        Crear
      </Button>
    </form>
  );
}

// Table header component
function CostCenterTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Codigo</TableHead>
        <TableHead>Nombre</TableHead>
        <TableHead className="hidden md:table-cell">Descripcion</TableHead>
        <TableHead className="hidden sm:table-cell">Mov. Contables</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="w-30">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Default export used by React Router
export default function CostCentersPage() {
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingCostCenter, setDeletingCostCenter] = useState<CostCenter | null>(null);

  // Queries
  const { data: costCenters, isLoading, isError } = useCostCenters(search || undefined);
  const createCostCenter = useCreateCostCenter();
  const updateCostCenter = useUpdateCostCenter();
  const deleteCostCenter = useDeleteCostCenter();

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => setSearch(value), 300),
    [],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle create
  const handleCreate = (data: CreateCostCenterData) => {
    createCostCenter.mutate(data, {
      onSuccess: () => setShowCreateForm(false),
    });
  };

  // Handle toggle active
  const handleToggleActive = (costCenter: CostCenter) => {
    updateCostCenter.mutate({
      id: costCenter.id,
      data: { isActive: !costCenter.isActive },
    });
  };

  // Handle delete
  const handleDelete = async () => {
    if (deletingCostCenter) {
      await deleteCostCenter.mutateAsync(deletingCostCenter.id);
      setDeletingCostCenter(null);
    }
  };

  const items = costCenters || [];
  const activeCount = items.filter((cc) => cc.isActive).length;

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-900/30">
            <Building2 className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
              Centros de Costo
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              {items.length} centros de costo ({activeCount} activos)
            </p>
          </div>
        </div>
        <Button
          variant="gradient"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? "Cancelar" : "Nuevo Centro de Costo"}
        </Button>
      </PageSection>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <PageSection>
              <Card variant="soft-primary" padding="md">
                <CreateCostCenterForm
                  onSubmit={handleCreate}
                  isPending={createCostCenter.isPending}
                />
              </Card>
            </PageSection>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <PageSection>
        <Card variant="elevated" padding="md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Buscar por codigo o nombre..."
              className="pl-10"
              onChange={handleSearchChange}
            />
          </div>
        </Card>
      </PageSection>

      {/* Table */}
      <PageSection>
        <Card variant="elevated">
          {isLoading ? (
            <Table>
              <CostCenterTableHeader />
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <EmptyState
              type="error"
              title="Error al cargar centros de costo"
              description="Hubo un problema al cargar los centros de costo. Por favor, intenta de nuevo."
              action={{
                label: "Reintentar",
                onClick: () => window.location.reload(),
              }}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-16 w-16" />}
              title={search ? "Sin resultados" : "No hay centros de costo"}
              description={
                search
                  ? "No se encontraron centros de costo con esa busqueda."
                  : "Comienza creando tu primer centro de costo."
              }
              action={
                search
                  ? { label: "Limpiar busqueda", onClick: () => setSearch("") }
                  : { label: "Crear centro de costo", onClick: () => setShowCreateForm(true) }
              }
            />
          ) : (
            <Table>
              <CostCenterTableHeader />
              <TableBody>
                {items.map((costCenter, i) => (
                  <AnimatedTableRow
                    key={costCenter.id}
                    index={i}
                    className="group border-b border-neutral-200 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {costCenter.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {costCenter.name}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                        {costCenter.description || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {costCenter._count?.journalEntryLines ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={costCenter.isActive ? "success" : "secondary"}
                        size="sm"
                      >
                        {costCenter.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(costCenter)}
                          title={costCenter.isActive ? "Desactivar" : "Activar"}
                          disabled={updateCostCenter.isPending}
                        >
                          {costCenter.isActive ? (
                            <ToggleRight className="h-4 w-4 text-success-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-neutral-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCostCenter(costCenter)}
                          title="Eliminar"
                          className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </AnimatedTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingCostCenter}
        onOpenChange={(open) => !open && setDeletingCostCenter(null)}
        itemName={deletingCostCenter?.name || ""}
        itemType="centro de costo"
        onConfirm={handleDelete}
        isLoading={deleteCostCenter.isPending}
      />
    </PageWrapper>
  );
}
