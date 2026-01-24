import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Shield,
} from "lucide-react";
import { useSystemAdminAuth } from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import {
  requireSystemAdminGuest,
  getSystemAdminRedirectTo,
} from "~/lib/system-admin-auth.server";
import type { Route } from "./+types/system-admin.login";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "Minimo 8 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function meta() {
  return [
    { title: "Administracion del Sistema - StockFlow" },
    {
      name: "description",
      content: "Panel de administracion del sistema StockFlow",
    },
  ];
}

// Redirect authenticated system admins to dashboard
export function loader({ request }: Route.LoaderArgs) {
  const redirectTo = getSystemAdminRedirectTo(request);
  requireSystemAdminGuest(request, redirectTo);
  return null;
}

export default function SystemAdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { login, isLoggingIn } = useSystemAdminAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    login(data);
  };

  return (
    <div className="flex min-h-screen">
      {/* Skip to content link for accessibility */}
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al formulario
      </a>

      {/* Left Panel - Branding */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        {/* Background gradient - Dark theme for admin */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950" />

        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo */}
          <motion.div
            initial={isMounted ? { opacity: 0, x: -20 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <Shield className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <span className="font-display text-2xl font-bold">
                  StockFlow
                </span>
                <p className="text-sm text-neutral-400">System Admin</p>
              </div>
            </Link>
          </motion.div>

          {/* Main content */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <h1 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
              Panel de
              <br />
              <span className="text-amber-400">Administracion</span>
            </h1>
            <p className="max-w-md text-lg text-neutral-300">
              Acceso exclusivo para administradores del sistema. Gestiona
              usuarios, tenants y configuraciones globales.
            </p>
          </motion.div>

          {/* Security notice */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-4 rounded-xl border border-neutral-700 bg-neutral-800/50 p-4"
          >
            <Shield className="h-8 w-8 text-amber-400" />
            <div>
              <p className="font-medium text-white">Acceso Restringido</p>
              <p className="text-sm text-neutral-400">
                Este panel esta protegido y monitoreado
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-1 items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
        <motion.div
          variants={containerVariants}
          initial={isMounted ? "hidden" : false}
          animate="visible"
          className="w-full max-w-md space-y-8"
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <div>
              <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white">
                Iniciar sesion
              </h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Ingresa tus credenciales de administrador
              </p>
            </div>
            <ThemeToggle />
          </motion.div>

          {/* Form with loading overlay */}
          <div className="relative">
            {isLoggingIn && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-white/50 backdrop-blur-[2px] dark:bg-neutral-950/50" />
            )}
            <motion.form
              variants={itemVariants}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
              aria-label="Formulario de inicio de sesion"
              id="login-form"
            >
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Correo electronico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="admin@stockflow.com"
                    className="pl-10 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    error={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-error-500" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Contrasena
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                  <Input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className="pl-10 pr-10 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    error={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    aria-label={
                      showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-error-500" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
              >
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 shadow-amber-500/25 hover:shadow-amber-500/40"
                  size="lg"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Iniciando sesion...
                    </>
                  ) : (
                    <>
                      Iniciar sesion
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </div>

          {/* Back to main app */}
          <motion.div variants={itemVariants} className="text-center">
            <Link
              to="/"
              className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Volver a StockFlow
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
