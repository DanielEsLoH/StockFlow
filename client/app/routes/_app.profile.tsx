import { useRef, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Camera,
  Trash2,
  Save,
  X,
  Building2,
  Calendar,
  Shield,
  Hash,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "./+types/_app.profile";
import { cn, formatDate, getInitials } from "~/lib/utils";
import { useAuthStore } from "~/stores/auth.store";
import {
  useUpdateProfile,
  useUploadAvatar,
  useDeleteAvatar,
} from "~/hooks/useSettings";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Mi Perfil - StockFlow" },
    { name: "description", content: "Gestiona tu informacion personal" },
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
const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Maximo 50 caracteres"),
  lastName: z
    .string()
    .min(1, "El apellido es requerido")
    .max(50, "Maximo 50 caracteres"),
  email: z.string().min(1, "El email es requerido").email("Email invalido"),
  phone: z
    .string()
    .max(20, "Maximo 20 caracteres")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Role labels
const RoleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
};

// Role badge variants
const RoleBadgeVariants: Record<
  string,
  "primary" | "success" | "warning" | "default"
> = {
  SUPER_ADMIN: "primary",
  ADMIN: "success",
  MANAGER: "warning",
  EMPLOYEE: "default",
};

// Status labels
const StatusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
  SUSPENDED: "Suspendido",
};

// Status badge variants
const StatusBadgeVariants: Record<string, "success" | "warning" | "error"> = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "error",
};

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 mt-4" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, tenant } = useAuthStore();

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: "",
      });
    }
  }, [user, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
    });
  };

  const handleCancel = () => {
    if (user) {
      reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: "",
      });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      uploadAvatar.mutate(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteAvatar = () => {
    deleteAvatar.mutate();
  };

  if (!user) {
    return <LoadingSkeleton />;
  }

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = getInitials(fullName);

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
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Mi Perfil
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Gestiona tu informacion personal
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Header Card */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative group">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={fullName}
                      className="h-24 w-24 rounded-full object-cover border-4 border-white dark:border-neutral-800 shadow-lg"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-4 border-white dark:border-neutral-800 shadow-lg">
                      <span className="text-2xl font-bold text-white">
                        {initials}
                      </span>
                    </div>
                  )}

                  {/* Upload overlay */}
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadAvatar.isPending}
                    className={cn(
                      "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center",
                      "opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
                      uploadAvatar.isPending && "opacity-100",
                    )}
                  >
                    {uploadAvatar.isPending ? (
                      <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Name */}
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mt-4">
                  {fullName}
                </h2>

                {/* Email */}
                <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <Badge
                    variant={RoleBadgeVariants[user.role] || "default"}
                    size="lg"
                  >
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    {RoleLabels[user.role] || user.role}
                  </Badge>
                  <Badge
                    variant={StatusBadgeVariants[user.status] || "default"}
                    size="lg"
                  >
                    {StatusLabels[user.status] || user.status}
                  </Badge>
                </div>

                {/* Avatar actions */}
                <div className="flex items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarClick}
                    disabled={uploadAvatar.isPending}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {user.avatarUrl ? "Cambiar foto" : "Subir foto"}
                  </Button>
                  {user.avatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteAvatar}
                      disabled={deleteAvatar.isPending}
                      className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                    >
                      {deleteAvatar.isPending ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Information Form Card */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                Informacion Personal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nombre *
                    </label>
                    <Input
                      {...register("firstName")}
                      placeholder="Tu nombre"
                      leftElement={
                        <User className="h-4 w-4 text-neutral-400" />
                      }
                      error={!!errors.firstName}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Apellido *
                    </label>
                    <Input
                      {...register("lastName")}
                      placeholder="Tu apellido"
                      leftElement={
                        <User className="h-4 w-4 text-neutral-400" />
                      }
                      error={!!errors.lastName}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Email *
                    </label>
                    <Input
                      {...register("email")}
                      type="email"
                      placeholder="tu@email.com"
                      leftElement={
                        <Mail className="h-4 w-4 text-neutral-400" />
                      }
                      error={!!errors.email}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Telefono
                    </label>
                    <Input
                      {...register("phone")}
                      placeholder="+57 300 123 4567"
                      leftElement={
                        <Phone className="h-4 w-4 text-neutral-400" />
                      }
                      error={!!errors.phone}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={!isDirty || updateProfile.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={updateProfile.isPending}
                    disabled={!isDirty}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Account Information Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-500" />
              Informacion de la Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Account ID */}
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Hash className="h-4 w-4" />
                  ID de Cuenta
                </p>
                <p className="mt-1 font-medium text-neutral-900 dark:text-white font-mono text-sm">
                  {user.id}
                </p>
              </div>

              {/* Tenant Name */}
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Organizacion
                </p>
                <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                  {tenant?.name || "Sin organizacion"}
                </p>
              </div>

              {/* Created Date - Mock data since User type doesn't include createdAt */}
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Cuenta Creada
                </p>
                <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                  {formatDate(new Date())}
                </p>
              </div>

              {/* Last Updated - Mock data since User type doesn't include updatedAt */}
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Ultima Actualizacion
                </p>
                <p className="mt-1 font-medium text-neutral-900 dark:text-white">
                  {formatDate(new Date())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
