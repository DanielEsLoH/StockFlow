import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { Link } from "react-router";
import {
  User,
  Shield,
  Settings,
  Building2,
  Eye,
  EyeOff,
  Check,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Mail,
  Bell,
  Package,
  CreditCard,
  FileText,
  BarChart3,
  ChevronRight,
  Printer,
} from "lucide-react";
import type { Route } from "./+types/_app.settings";
import { cn, getInitials } from "~/lib/utils";
import { useAuth } from "~/hooks/useAuth";
import { useTheme } from "~/hooks/useTheme";
import { getSystemTheme } from "~/lib/theme";
import {
  useChangePassword,
  useUpdatePreferences,
  useUserPreferences,
  usePasswordStrength,
} from "~/hooks/useSettings";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import { Badge } from "~/components/ui/Badge";
import type {
  SettingsTab,
  PasswordStrength as PasswordStrengthType,
} from "~/types/settings";
import {
  SettingsTabLabels,
  PasswordStrengthLabels,
  PasswordStrengthColors,
  ThemeOptionLabels,
  LanguageOptionLabels,
} from "~/types/settings";

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Configuracion - StockFlow" },
    { name: "description", content: "Personaliza tu experiencia en StockFlow" },
  ];
};

// Tab content container variants - propagates to children
const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
};

// Tab configuration
const tabs: { id: SettingsTab; icon: React.ReactNode }[] = [
  { id: "profile", icon: <User className="h-4 w-4" /> },
  { id: "security", icon: <Shield className="h-4 w-4" /> },
  { id: "preferences", icon: <Settings className="h-4 w-4" /> },
  { id: "account", icon: <Building2 className="h-4 w-4" /> },
];

// Password change schema
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "La contrasena actual es requerida"),
    newPassword: z
      .string()
      .min(8, "La contrasena debe tener al menos 8 caracteres")
      .regex(/[a-z]/, "Debe contener al menos una letra minuscula")
      .regex(/[A-Z]/, "Debe contener al menos una letra mayuscula")
      .regex(/[0-9]/, "Debe contener al menos un numero")
      .regex(/[^a-zA-Z0-9]/, "Debe contener al menos un caracter especial"),
    confirmPassword: z.string().min(1, "La confirmacion es requerida"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

// Language options for select
const languageOptions = [
  { value: "es", label: LanguageOptionLabels.es },
  { value: "en", label: LanguageOptionLabels.en },
];

// Theme option component
function ThemeOption({
  value,
  label,
  icon,
  isSelected,
  onSelect,
}: {
  value: "light" | "dark";
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border transition-all duration-200",
        isSelected
          ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 ring-2 ring-primary-500/20"
          : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800",
      )}
    >
      <input
        type="radio"
        name="theme"
        value={value}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
      <div
        className={cn(
          "p-2 rounded-lg",
          isSelected
            ? "bg-primary-100 dark:bg-primary-900/40"
            : "bg-neutral-100 dark:bg-neutral-800",
        )}
      >
        {icon}
      </div>
      <span className="font-medium">{label}</span>
      {isSelected && <Check className="h-4 w-4 ml-auto text-primary-500" />}
    </label>
  );
}

// Notification checkbox component
function NotificationCheckbox({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-4 cursor-pointer p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-neutral-900 dark:text-white">
          {label}
        </div>
        {description && (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={cn(
            "w-11 h-6 rounded-full transition-colors duration-200",
            checked ? "bg-primary-500" : "bg-neutral-200 dark:bg-neutral-700",
          )}
        />
        <div
          className={cn(
            "absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </div>
    </label>
  );
}

// Password strength indicator component
function PasswordStrengthIndicator({
  password,
  strength,
}: {
  password: string;
  strength: PasswordStrengthType;
}) {
  if (!password) return null;

  const strengthLevels: PasswordStrengthType[] = [
    "weak",
    "fair",
    "good",
    "strong",
  ];
  const currentIndex = strengthLevels.indexOf(strength);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {strengthLevels.map((level, index) => (
          <div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-200",
              index <= currentIndex
                ? PasswordStrengthColors[strength]
                : "bg-neutral-200 dark:bg-neutral-700",
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-sm font-medium",
          strength === "weak" && "text-error-500",
          strength === "fair" && "text-warning-500",
          strength === "good" && "text-primary-500",
          strength === "strong" && "text-success-500",
        )}
      >
        Fortaleza: {PasswordStrengthLabels[strength]}
      </p>
    </div>
  );
}

// Password requirements component
function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: "Al menos 8 caracteres", test: password.length >= 8 },
    { label: "Una letra mayuscula", test: /[A-Z]/.test(password) },
    { label: "Una letra minuscula", test: /[a-z]/.test(password) },
    { label: "Un numero", test: /[0-9]/.test(password) },
    { label: "Un caracter especial", test: /[^a-zA-Z0-9]/.test(password) },
  ];

  return (
    <ul className="space-y-1 text-sm">
      {requirements.map((req) => (
        <li
          key={req.label}
          className={cn(
            "flex items-center gap-2",
            req.test
              ? "text-success-600 dark:text-success-400"
              : "text-neutral-500 dark:text-neutral-400",
          )}
        >
          <div
            className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center",
              req.test
                ? "bg-success-100 dark:bg-success-900/30"
                : "bg-neutral-100 dark:bg-neutral-800",
            )}
          >
            {req.test && <Check className="h-2.5 w-2.5" />}
          </div>
          {req.label}
        </li>
      ))}
    </ul>
  );
}

// Profile Tab Content
function ProfileTabContent() {
  const { user } = useAuth();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Perfil</CardTitle>
          <CardDescription>Informacion basica de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-neutral-800 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-neutral-800 shadow-lg">
                  {getInitials(fullName)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {fullName}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                {user?.email}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <Badge variant="primary">{user?.role}</Badge>
                <Badge
                  variant={user?.status === "ACTIVE" ? "success" : "warning"}
                >
                  {user?.status === "ACTIVE" ? "Activo" : user?.status}
                </Badge>
              </div>
            </div>

            {/* Edit Button */}
            <Link to="/profile">
              <Button
                variant="outline"
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Editar Perfil
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Security Tab Content
function SecurityTabContent() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");
  const passwordStrength = usePasswordStrength(newPassword || "");

  const onSubmit = (data: PasswordChangeFormData) => {
    changePassword.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      },
      {
        onSuccess: () => {
          reset();
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary-50 text-primary-500 dark:bg-primary-900/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Cambiar Contrasena</CardTitle>
              <CardDescription>
                Actualiza tu contrasena para mantener tu cuenta segura
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Contrasena Actual
              </label>
              <Input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Ingresa tu contrasena actual"
                error={!!errors.currentPassword}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-sm text-error-500">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Nueva Contrasena
              </label>
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Ingresa tu nueva contrasena"
                error={!!errors.newPassword}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-sm text-error-500">
                  {errors.newPassword.message}
                </p>
              )}

              {/* Password Strength Indicator */}
              <PasswordStrengthIndicator
                password={newPassword || ""}
                strength={passwordStrength}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Confirmar Contrasena
              </label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirma tu nueva contrasena"
                error={!!errors.confirmPassword}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-error-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                Requisitos de contrasena
              </h4>
              <PasswordRequirements password={newPassword || ""} />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={changePassword.isPending}
              className="w-full sm:w-auto"
            >
              Cambiar Contrasena
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Preferences Tab Content
function PreferencesTabContent() {
  const { theme, setTheme } = useTheme();
  const { data: preferences, isLoading: isLoadingPreferences } =
    useUserPreferences();
  const updatePreferences = useUpdatePreferences();

  const [localPreferences, setLocalPreferences] = useState(preferences);

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleNotificationChange = (
    key: "email" | "push" | "lowStock" | "invoices" | "reports",
    value: boolean,
  ) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      notifications: {
        ...localPreferences.notifications,
        [key]: value,
      },
    });
  };

  const handleLanguageChange = (language: string) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      language: language as "es" | "en",
    });
  };

  const handleSavePreferences = () => {
    if (!localPreferences) return;

    updatePreferences.mutate({
      ...localPreferences,
      theme,
    });
  };

  if (isLoadingPreferences || !localPreferences) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-40" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary-50 text-primary-500 dark:bg-primary-900/20">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Tema de la Aplicacion</CardTitle>
              <CardDescription>
                Selecciona como quieres que se vea StockFlow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ThemeOption
              value="light"
              label={ThemeOptionLabels.light}
              icon={<Sun className="h-5 w-5" />}
              isSelected={theme === "light"}
              onSelect={() => setTheme("light")}
            />
            <ThemeOption
              value="dark"
              label={ThemeOptionLabels.dark}
              icon={<Moon className="h-5 w-5" />}
              isSelected={theme === "dark"}
              onSelect={() => setTheme("dark")}
            />
          </div>
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5" />
            Tu sistema esta configurado en modo{" "}
            {getSystemTheme() === "dark" ? "oscuro" : "claro"}
          </p>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Idioma</CardTitle>
          <CardDescription>
            Selecciona el idioma de la aplicacion (proximamente)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="max-w-xs">
            <Select
              options={languageOptions}
              value={localPreferences.language}
              onChange={handleLanguageChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* POS Print Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-success-50 text-success-500 dark:bg-success-900/20">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Impresion POS</CardTitle>
              <CardDescription>
                Selecciona el ancho de papel de tu impresora termica
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="max-w-xs">
            <Select
              options={[
                { value: "80", label: "80mm (Recomendado)" },
                { value: "58", label: "58mm" },
              ]}
              value={String(localPreferences.posPaperWidth ?? 80)}
              onChange={(val) =>
                setLocalPreferences({
                  ...localPreferences,
                  posPaperWidth: Number(val) as 58 | 80,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-warning-50 text-warning-500 dark:bg-warning-900/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>
                Configura que notificaciones deseas recibir
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <NotificationCheckbox
              label="Notificaciones por email"
              description="Recibe actualizaciones importantes en tu correo"
              icon={<Mail className="h-4 w-4" />}
              checked={localPreferences.notifications.email}
              onChange={(checked) => handleNotificationChange("email", checked)}
            />
            <NotificationCheckbox
              label="Notificaciones push"
              description="Recibe notificaciones en tu navegador"
              icon={<Bell className="h-4 w-4" />}
              checked={localPreferences.notifications.push}
              onChange={(checked) => handleNotificationChange("push", checked)}
            />
            <NotificationCheckbox
              label="Alertas de stock bajo"
              description="Te avisamos cuando el inventario esta bajo"
              icon={<Package className="h-4 w-4" />}
              checked={localPreferences.notifications.lowStock}
              onChange={(checked) =>
                handleNotificationChange("lowStock", checked)
              }
            />
            <NotificationCheckbox
              label="Alertas de pagos"
              description="Notificaciones sobre pagos pendientes y recibidos"
              icon={<CreditCard className="h-4 w-4" />}
              checked={localPreferences.notifications.invoices}
              onChange={(checked) =>
                handleNotificationChange("invoices", checked)
              }
            />
            <NotificationCheckbox
              label="Actualizaciones de facturas"
              description="Cambios en el estado de tus facturas"
              icon={<FileText className="h-4 w-4" />}
              checked={localPreferences.notifications.invoices}
              onChange={(checked) =>
                handleNotificationChange("invoices", checked)
              }
            />
            <NotificationCheckbox
              label="Reportes semanales"
              description="Resumen semanal de tu negocio"
              icon={<BarChart3 className="h-4 w-4" />}
              checked={localPreferences.notifications.reports}
              onChange={(checked) =>
                handleNotificationChange("reports", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSavePreferences}
          isLoading={updatePreferences.isPending}
        >
          Guardar Preferencias
        </Button>
      </div>
    </motion.div>
  );
}

// Account Tab Content
function AccountTabContent() {
  const { user, tenant, logout, isLoggingOut } = useAuth();

  const planColors: Record<string, string> = {
    EMPRENDEDOR:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    PYME: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
    PRO: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300",
    PLUS: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Account Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary-50 text-primary-500 dark:bg-primary-900/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Informacion de la Cuenta</CardTitle>
              <CardDescription>
                Detalles de tu cuenta y organizacion
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                ID de Usuario
              </p>
              <p className="font-mono text-sm text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg">
                {user?.id || "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                ID de Cuenta
              </p>
              <p className="font-mono text-sm text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg">
                {tenant?.id || "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Nombre de Organizacion
              </p>
              <p className="font-medium text-neutral-900 dark:text-white">
                {tenant?.name || "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Plan
              </p>
              <span
                className={cn(
                  "inline-flex px-3 py-1 rounded-full text-sm font-medium",
                  planColors[tenant?.plan || "EMPRENDEDOR"],
                )}
              >
                {tenant?.plan || "Sin plan"}
              </span>
              <Link to="/billing">
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="ml-3"
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  Gestionar Suscripcion
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Estado de la Cuenta
              </p>
              <Badge
                variant={tenant?.status === "ACTIVE" ? "success" : "warning"}
              >
                {tenant?.status === "ACTIVE" ? "Activa" : tenant?.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion de Sesion</CardTitle>
          <CardDescription>Gestiona tu sesion actual</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-success-100 dark:bg-success-900/30">
                <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Sesion Activa
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              onClick={() => logout()}
              isLoading={isLoggingOut}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Cerrar Sesion
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Settings Page
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTabContent />;
      case "security":
        return <SecurityTabContent />;
      case "preferences":
        return <PreferencesTabContent />;
      case "account":
        return <AccountTabContent />;
      default:
        return null;
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
            Configuracion
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Personaliza tu experiencia
          </p>
        </div>
      </PageSection>

      {/* Tab Navigation */}
      <PageSection>
        <div className="flex flex-wrap gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === tab.id
                  ? "bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">
                {SettingsTabLabels[tab.id]}
              </span>
            </button>
          ))}
        </div>
      </PageSection>

      {/* Tab Content */}
      <div key={activeTab}>{renderTabContent()}</div>
    </PageWrapper>
  );
}
