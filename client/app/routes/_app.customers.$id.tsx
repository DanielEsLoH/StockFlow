import { useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import type { Route } from "./+types/_app.customers.$id";
import { formatDate, formatCurrency } from "~/lib/utils";
import {
  useCustomer,
  useCustomerStats,
  useDeleteCustomer,
} from "~/hooks/useCustomers";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { StatCard } from "~/components/ui/StatCard";
import { Skeleton } from "~/components/ui/Skeleton";
import { DeleteModal } from "~/components/ui/DeleteModal";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Cliente - StockFlow" },
    { name: "description", content: "Detalles del cliente" },
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

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: customer, isLoading, isError } = useCustomer(id!);
  const { data: stats } = useCustomerStats(id!);
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = async () => {
    await deleteCustomer.mutateAsync(id!);
    setShowDeleteModal(false);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Cliente no encontrado
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          El cliente que buscas no existe o fue eliminado.
        </p>
        <Link to="/customers">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a clientes
          </Button>
        </Link>
      </div>
    );
  }

  const documentTypeLabels = {
    CC: "Cedula de Ciudadania",
    NIT: "NIT",
    CE: "Cedula de Extranjeria",
    PASSPORT: "Pasaporte",
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/customers">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                {customer.type === "BUSINESS" ? (
                  <Building2 className="h-7 w-7 text-primary-500" />
                ) : (
                  <User className="h-7 w-7 text-primary-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                    {customer.name}
                  </h1>
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
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      customer.type === "BUSINESS" ? "primary" : "secondary"
                    }
                  >
                    {customer.type === "BUSINESS"
                      ? "Empresa"
                      : "Persona Natural"}
                  </Badge>
                  {customer.city && (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {customer.city}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-14 sm:ml-0">
            <Link to={`/customers/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ShoppingCart}
            label="Total Compras"
            value={stats?.totalInvoices || 0}
            subtitle="facturas"
            color="primary"
          />
          <StatCard
            icon={DollarSign}
            label="Total Gastado"
            value={formatCurrency(stats?.totalSpent || 0)}
            color="success"
          />
          <StatCard
            icon={TrendingUp}
            label="Promedio por Compra"
            value={formatCurrency(stats?.averageOrderValue || 0)}
            color="warning"
          />
          <StatCard
            icon={Calendar}
            label="Ultima Compra"
            value={
              stats?.lastPurchaseDate
                ? formatDate(stats.lastPurchaseDate)
                : "Sin compras"
            }
            color="primary"
          />
        </div>
      </motion.div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Informacion de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Mail className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Email
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {customer.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Phone className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Telefono
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {customer.phone || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <MapPin className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Direccion
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {customer.address || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <MapPin className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Ciudad
                  </p>
                  <p className="text-neutral-900 dark:text-white">
                    {customer.city || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Info */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Informacion Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Tipo de Documento
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {customer.documentType
                    ? documentTypeLabels[customer.documentType]
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Numero de Documento
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {customer.document || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Tipo de Cliente
                </span>
                <Badge
                  variant={
                    customer.type === "BUSINESS" ? "primary" : "secondary"
                  }
                >
                  {customer.type === "BUSINESS" ? "Empresa" : "Persona Natural"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Fecha de Registro
                </span>
                <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  {formatDate(customer.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Ultima Actualizacion
                </span>
                <span className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  {formatDate(customer.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {customer.notes}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        itemName={customer.name}
        itemType="cliente"
        onConfirm={handleDelete}
        isLoading={deleteCustomer.isPending}
      />
    </motion.div>
  );
}
