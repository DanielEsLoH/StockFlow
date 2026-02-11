import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  Send,
  X,
  RefreshCw,
  ShieldAlert,
  Warehouse,
} from "lucide-react";
import type { Route } from "./+types/_app.team";
import { cn } from "~/lib/utils";
import { useAuthStore } from "~/stores/auth.store";
import { useTeamMembers } from "~/hooks/useTeamMembers";
import { useWarehouses } from "~/hooks/useWarehouses";
import {
  useInvitations,
  useCreateInvitation,
  useCancelInvitation,
  useResendInvitation,
} from "~/hooks/useInvitations";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Select } from "~/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";
import { SkeletonTableRow } from "~/components/ui/Skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/Modal";
import { ConfirmModal } from "~/components/ui/Modal";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Equipo - StockFlow" },
    {
      name: "description",
      content: "Gestion de usuarios e invitaciones del equipo",
    },
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

// Invitation form schema
const invitationSchema = z
  .object({
    email: z.email({ message: "Ingresa un email valido" }),
    role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
    warehouseId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.role === "EMPLOYEE" || data.role === "MANAGER") {
        return !!data.warehouseId;
      }
      return true;
    },
    {
      message: "Debes seleccionar una bodega para este rol",
      path: ["warehouseId"],
    },
  );

type InvitationFormData = z.infer<typeof invitationSchema>;

// Role options for select
const roleOptions = [
  { value: "EMPLOYEE", label: "Empleado" },
  { value: "MANAGER", label: "Gerente" },
  { value: "ADMIN", label: "Administrador" },
];

// Role badge colors
const roleBadgeVariants: Record<
  string,
  "primary" | "secondary" | "warning" | "success"
> = {
  SUPER_ADMIN: "warning",
  ADMIN: "primary",
  MANAGER: "secondary",
  EMPLOYEE: "secondary",
};

// Status badge configurations
const userStatusConfig: Record<
  string,
  { variant: "success" | "warning" | "error"; label: string }
> = {
  ACTIVE: { variant: "success", label: "Activo" },
  INACTIVE: { variant: "error", label: "Inactivo" },
  PENDING: { variant: "warning", label: "Pendiente" },
  SUSPENDED: { variant: "error", label: "Suspendido" },
};

const invitationStatusConfig: Record<
  string,
  { variant: "success" | "warning" | "error" | "secondary"; label: string }
> = {
  PENDING: { variant: "warning", label: "Pendiente" },
  ACCEPTED: { variant: "success", label: "Aceptada" },
  EXPIRED: { variant: "secondary", label: "Expirada" },
  CANCELLED: { variant: "error", label: "Cancelada" },
};

// Role display names
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
};

// Format date helper
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Tab type
type TabType = "members" | "invitations";

export default function TeamPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>("members");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<
    string | null
  >(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user has permission to access this page
  const hasPermission = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Queries
  const {
    data: members = [],
    isLoading: isLoadingMembers,
    isError: isErrorMembers,
  } = useTeamMembers();
  const {
    data: invitations = [],
    isLoading: isLoadingInvitations,
    isError: isErrorInvitations,
  } = useInvitations();
  const { data: warehouses = [] } = useWarehouses();

  // Mutations
  const createInvitation = useCreateInvitation();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "EMPLOYEE",
      warehouseId: "",
    },
  });

  const selectedRole = watch("role");

  // Clear warehouseId when role changes to ADMIN
  useEffect(() => {
    if (selectedRole === "ADMIN") {
      setValue("warehouseId", "");
    }
  }, [selectedRole, setValue]);

  // Whether current role requires warehouse selection
  const requiresWarehouse =
    selectedRole === "EMPLOYEE" || selectedRole === "MANAGER";

  // Warehouse options for the select
  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: `${w.name} (${w.code})`,
  }));

  // Handle invitation submit
  const onSubmitInvitation = (data: InvitationFormData) => {
    createInvitation.mutate(
      {
        email: data.email,
        role: data.role,
        ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
      },
      {
        onSuccess: () => {
          setIsInviteModalOpen(false);
          reset();
        },
      },
    );
  };

  // Handle cancel invitation
  const handleCancelInvitation = () => {
    if (cancellingInvitationId) {
      cancelInvitation.mutate(cancellingInvitationId, {
        onSuccess: () => setCancellingInvitationId(null),
      });
    }
  };

  // Handle resend invitation
  const handleResendInvitation = (id: string) => {
    resendInvitation.mutate(id);
  };

  // If user doesn't have permission, show access denied
  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-6 p-4 rounded-full bg-error-100 dark:bg-error-900/30">
          <ShieldAlert className="h-12 w-12 text-error-500" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          Acceso Denegado
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
          No tienes permisos para acceder a esta pagina. Solo los
          administradores pueden gestionar el equipo.
        </p>
      </div>
    );
  }

  // Filter pending invitations for display
  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "PENDING",
  );

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Equipo
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona los usuarios e invitaciones de tu organizacion
          </p>
        </div>
        <Button
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invitar Usuario
        </Button>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("members")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
              activeTab === "members"
                ? "bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
            )}
          >
            <Users className="h-4 w-4" />
            <span>Miembros del equipo</span>
            <Badge variant="secondary" className="ml-1">
              {members.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
              activeTab === "invitations"
                ? "bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
            )}
          >
            <Mail className="h-4 w-4" />
            <span>Invitaciones</span>
            {pendingInvitations.length > 0 && (
              <Badge variant="warning" className="ml-1">
                {pendingInvitations.length}
              </Badge>
            )}
          </button>
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={isMounted ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "members" ? (
          <Card>
            {isLoadingMembers ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Fecha de ingreso
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={6} />
                  ))}
                </TableBody>
              </Table>
            ) : isErrorMembers ? (
              <div className="p-8 text-center">
                <p className="text-error-500">
                  Error al cargar los miembros del equipo
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                  <Users className="h-16 w-16" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                  No hay miembros
                </h3>
                <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                  Comienza invitando usuarios a tu equipo.
                </p>
                <Button onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invitar usuario
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Email
                    </TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Bodega
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Fecha de ingreso
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const statusInfo =
                      userStatusConfig[member.status] ||
                      userStatusConfig.ACTIVE;
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-medium text-sm">
                              {member.firstName[0]}
                              {member.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 md:hidden">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {member.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              roleBadgeVariants[member.role] || "secondary"
                            }
                          >
                            {roleLabels[member.role] || member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {member.warehouse ? (
                            <div className="flex items-center gap-1.5">
                              <Warehouse className="h-3.5 w-3.5 text-neutral-400" />
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                {member.warehouse.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400 dark:text-neutral-500">
                              {member.role === "ADMIN" ||
                              member.role === "SUPER_ADMIN"
                                ? "Todas"
                                : "Sin asignar"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {member.createdAt
                              ? formatDate(member.createdAt)
                              : "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning-500" />
                    <CardTitle>Invitaciones Pendientes</CardTitle>
                  </div>
                  <CardDescription>
                    Estas invitaciones estan esperando ser aceptadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Rol
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Invitado por
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Expira
                        </TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-neutral-400" />
                              <span className="font-medium text-neutral-900 dark:text-white">
                                {invitation.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={
                                roleBadgeVariants[invitation.role] ||
                                "secondary"
                              }
                            >
                              {roleLabels[invitation.role] || invitation.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {invitation.invitedBy.firstName}{" "}
                              {invitation.invitedBy.lastName}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                              {formatDate(invitation.expiresAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleResendInvitation(invitation.id)
                                }
                                disabled={resendInvitation.isPending}
                                title="Reenviar invitacion"
                              >
                                <RefreshCw
                                  className={cn(
                                    "h-4 w-4",
                                    resendInvitation.isPending &&
                                      "animate-spin",
                                  )}
                                />
                                <span className="hidden sm:inline ml-1">
                                  Reenviar
                                </span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setCancellingInvitationId(invitation.id)
                                }
                                className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                                title="Cancelar invitacion"
                              >
                                <X className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">
                                  Cancelar
                                </span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* All Invitations History */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Invitaciones</CardTitle>
                <CardDescription>
                  Todas las invitaciones enviadas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingInvitations ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Invitado por
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Fecha
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonTableRow key={i} columns={5} />
                      ))}
                    </TableBody>
                  </Table>
                ) : isErrorInvitations ? (
                  <div className="p-8 text-center">
                    <p className="text-error-500">
                      Error al cargar las invitaciones
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => window.location.reload()}
                    >
                      Reintentar
                    </Button>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-6 text-neutral-300 dark:text-neutral-600">
                      <Mail className="h-16 w-16" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                      No hay invitaciones
                    </h3>
                    <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
                      Aun no has enviado ninguna invitacion.
                    </p>
                    <Button onClick={() => setIsInviteModalOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invitar usuario
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Rol
                        </TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Invitado por
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Fecha
                        </TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => {
                        const statusInfo =
                          invitationStatusConfig[invitation.status] ||
                          invitationStatusConfig.PENDING;
                        const isPending = invitation.status === "PENDING";
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-neutral-400" />
                                <span className="font-medium text-neutral-900 dark:text-white">
                                  {invitation.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge
                                variant={
                                  roleBadgeVariants[invitation.role] ||
                                  "secondary"
                                }
                              >
                                {roleLabels[invitation.role] || invitation.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-neutral-700 dark:text-neutral-300">
                                {invitation.invitedBy.firstName}{" "}
                                {invitation.invitedBy.lastName}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                {formatDate(invitation.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isPending && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      handleResendInvitation(invitation.id)
                                    }
                                    disabled={resendInvitation.isPending}
                                    title="Reenviar"
                                  >
                                    <RefreshCw
                                      className={cn(
                                        "h-4 w-4",
                                        resendInvitation.isPending &&
                                          "animate-spin",
                                      )}
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      setCancellingInvitationId(invitation.id)
                                    }
                                    className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                                    title="Cancelar"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* Invite User Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
            <DialogDescription>
              Envia una invitacion por correo electronico para que un nuevo
              usuario se una a tu equipo.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmitInvitation)}
            className="space-y-4"
          >
            {/* Email field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Correo electronico <span className="text-error-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="usuario@ejemplo.com"
                error={!!errors.email}
                leftElement={<Mail className="h-4 w-4 text-neutral-400" />}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-error-500">{errors.email.message}</p>
              )}
            </div>

            {/* Role field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Rol
              </label>
              <Select
                options={roleOptions}
                value={selectedRole}
                onChange={(value) =>
                  setValue("role", value as "EMPLOYEE" | "MANAGER" | "ADMIN", {
                    shouldValidate: true,
                  })
                }
                placeholder="Selecciona un rol"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {selectedRole === "ADMIN" &&
                  "Acceso total a todas las bodegas y configuracion del sistema."}
                {selectedRole === "MANAGER" &&
                  "Gestiona inventario y reportes de su bodega asignada."}
                {selectedRole === "EMPLOYEE" &&
                  "Acceso basico para vender y facturar en su bodega asignada."}
              </p>
            </div>

            {/* Warehouse field - only for MANAGER and EMPLOYEE */}
            {requiresWarehouse && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Bodega asignada <span className="text-error-500">*</span>
                </label>
                <Select
                  options={warehouseOptions}
                  value={watch("warehouseId") || ""}
                  onChange={(value) =>
                    setValue("warehouseId", value, { shouldValidate: true })
                  }
                  placeholder="Selecciona una bodega"
                  error={!!errors.warehouseId}
                />
                {errors.warehouseId && (
                  <p className="text-sm text-error-500">
                    {errors.warehouseId.message}
                  </p>
                )}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  El usuario solo podra operar en esta bodega.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  reset();
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={createInvitation.isPending}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Enviar Invitacion
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Invitation Confirmation Modal */}
      <ConfirmModal
        open={!!cancellingInvitationId}
        onOpenChange={(open) => !open && setCancellingInvitationId(null)}
        title="Cancelar Invitacion"
        description="Estas seguro de que deseas cancelar esta invitacion? El usuario no podra unirse al equipo con este enlace."
        confirmLabel="Cancelar Invitacion"
        cancelLabel="Volver"
        onConfirm={handleCancelInvitation}
        isLoading={cancelInvitation.isPending}
        variant="warning"
      />
    </motion.div>
  );
}
