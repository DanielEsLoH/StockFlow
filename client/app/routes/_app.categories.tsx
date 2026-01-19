import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Tags,
  Pencil,
  Trash2,
  X,
  Package,
  Calendar,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Route } from './+types/_app.categories';
import { cn, debounce, formatDate } from '~/lib/utils';
import {
  useCategoriesWithFilters,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '~/hooks/useCategories';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
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
import type { CategoryFilters, Category } from '~/types/category';

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Categorias - StockFlow' },
    { name: 'description', content: 'Gestion de categorias de productos' },
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

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Form schema
const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'Maximo 100 caracteres'),
  description: z.string().max(500, 'Maximo 500 caracteres').optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// Items per page options
const pageSizeOptions = [
  { value: '10', label: '10 por pagina' },
  { value: '25', label: '25 por pagina' },
  { value: '50', label: '50 por pagina' },
];

export default function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get current filters from URL
  const filters: CategoryFilters = useMemo(
    () => ({
      search: searchParams.get('search') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 10,
    }),
    [searchParams]
  );

  // Queries
  const { data: categoriesData, isLoading, isError } = useCategoriesWithFilters(filters);

  // Mutations
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when modal closes or editing changes
  useEffect(() => {
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        description: editingCategory.description || '',
      });
    } else {
      reset({ name: '', description: '' });
    }
  }, [editingCategory, reset]);

  // Update URL params
  const updateFilters = useCallback(
    (newFilters: Partial<CategoryFilters>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      if (!('page' in newFilters)) {
        params.set('page', '1');
      }

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => updateFilters({ search: value || undefined }), 300),
    [updateFilters]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Open modal for create
  const handleCreate = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  // Open modal for edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    reset({ name: '', description: '' });
  };

  // Submit form
  const onSubmit = async (data: CategoryFormData) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, data });
    } else {
      await createCategory.mutateAsync(data);
    }
    handleCloseModal();
  };

  // Handle delete
  const handleDelete = async () => {
    if (deletingCategory) {
      await deleteCategory.mutateAsync(deletingCategory.id);
      setDeletingCategory(null);
    }
  };

  const categories = categoriesData?.data || [];
  const meta = categoriesData?.meta;
  const hasActiveFilters = !!filters.search;

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
            Categorias
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Organiza tus productos en categorias
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Nueva Categoria
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <Card padding="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar categorias..."
                className="pl-10"
                defaultValue={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            )}
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
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripcion</TableHead>
                  <TableHead className="hidden sm:table-cell">Productos</TableHead>
                  <TableHead className="hidden lg:table-cell">Actualizado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={5} />
                ))}
              </TableBody>
            </Table>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-error-500">Error al cargar las categorias</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                <Tags className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                {hasActiveFilters ? 'Sin resultados' : 'No hay categorias'}
              </h3>
              <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                {hasActiveFilters
                  ? 'No se encontraron categorias con los filtros aplicados.'
                  : 'Comienza creando tu primera categoria.'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear categoria
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">Descripcion</TableHead>
                    <TableHead className="hidden sm:table-cell">Productos</TableHead>
                    <TableHead className="hidden lg:table-cell">Actualizado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {categories.map((category) => (
                      <motion.tr
                        key={category.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                              <Tags className="h-5 w-5 text-primary-500" />
                            </div>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {category.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-neutral-500 dark:text-neutral-400 line-clamp-1">
                            {category.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary">
                            <Package className="h-3 w-3 mr-1" />
                            {category.productCount || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-neutral-500 dark:text-neutral-400">
                            {formatDate(category.updatedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(category)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCategory(category)}
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

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={handleCloseModal}
            />

            {/* Modal */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md mx-4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
                </h2>
                <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Nombre *
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="Nombre de la categoria"
                    error={!!errors.name}
                  />
                  {errors.name?.message && (
                    <p className="mt-1 text-sm text-error-500">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Descripcion
                  </label>
                  <textarea
                    {...register('description')}
                    placeholder="Descripcion de la categoria (opcional)"
                    rows={3}
                    className={cn(
                      'w-full rounded-lg border border-neutral-300 dark:border-neutral-600',
                      'bg-white dark:bg-neutral-900 px-4 py-2.5',
                      'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                      'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none',
                      'transition-colors resize-none'
                    )}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-error-500">{errors.description.message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSubmitting || createCategory.isPending || updateCategory.isPending}
                  >
                    {editingCategory ? 'Guardar cambios' : 'Crear categoria'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <DeleteModal
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        itemName={deletingCategory?.name || ''}
        itemType="categoria"
        onConfirm={handleDelete}
        isLoading={deleteCategory.isPending}
      />
    </motion.div>
  );
}