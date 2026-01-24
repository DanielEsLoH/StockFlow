import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { requireGuest, getRedirectTo } from "~/lib/auth.server";
import type { Route } from "./+types/login";

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

const statHoverTransition = {
  type: "spring" as const,
  stiffness: 300,
};

export function meta() {
  return [
    { title: "Iniciar Sesion - StockFlow" },
    { name: "description", content: "Inicia sesion en tu cuenta de StockFlow" },
  ];
}

// Redirect authenticated users to dashboard (or redirectTo param)
export function loader({ request }: Route.LoaderArgs) {
  const redirectTo = getRedirectTo(request);
  requireGuest(request, redirectTo);
  return null;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { login, isLoggingIn } = useAuth();

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

  const onSubmit = async (data: LoginForm) => {
    try {
      login(data);
      toast.success("Iniciando sesion...");
    } catch {
      toast.error("Error al iniciar sesion. Intenta de nuevo.");
    }
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
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />

        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="StockFlow logo"
                  role="img"
                >
                  <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z" />
                  <path d="M13 12h-2v3H8v2h3v3h2v-3h3v-2h-3z" />
                </svg>
              </div>
              <span className="font-display text-2xl font-bold">StockFlow</span>
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
              Gestiona tu inventario
              <br />
              <span className="text-primary-200">de forma inteligente</span>
            </h1>
            <p className="max-w-md text-lg text-primary-100">
              Controla productos, facturacion y reportes en una sola plataforma
              disenada para PyMEs colombianas.
            </p>
          </motion.div>

          {/* Stats with premium microinteractions */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-3 gap-8"
          >
            {[
              { value: "500+", label: "Empresas activas" },
              { value: "50K+", label: "Facturas creadas" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.05, y: -5 }}
                transition={statHoverTransition}
                className="cursor-default"
              >
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-primary-200">{stat.label}</div>
              </motion.div>
            ))}
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
                Ingresa tus credenciales para continuar
              </p>
            </div>
            <ThemeToggle />
          </motion.div>

          {/* OAuth Social Login Buttons */}
          <motion.div variants={itemVariants} className="space-y-3">
            {/* Google OAuth */}
            <a
              href="/api/auth/google"
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continuar con Google</span>
            </a>

            {/* GitHub OAuth */}
            <a
              href="/api/auth/github"
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-200"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Continuar con GitHub</span>
            </a>
          </motion.div>

          {/* Divider */}
          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-neutral-50 dark:bg-neutral-950 text-neutral-500">
                o continua con email
              </span>
            </div>
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
                    placeholder="tu@email.com"
                    className="pl-10 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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
                    className="pl-10 pr-10 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Recordarme
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Olvidaste tu contrasena?
                </Link>
              </div>

              {/* Submit with microinteraction */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
              >
                <Button
                  type="submit"
                  className="w-full"
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

          {/* Register Divider */}
          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-neutral-50 px-4 text-neutral-500 dark:bg-neutral-950">
                Nuevo en StockFlow?
              </span>
            </div>
          </motion.div>

          {/* Register link */}
          <motion.div variants={itemVariants}>
            <Link to="/register">
              <Button variant="outline" className="w-full" size="lg">
                Crear una cuenta
              </Button>
            </Link>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-neutral-500 dark:text-neutral-400"
          >
            Al continuar, aceptas nuestros{" "}
            <Link to="/terms" className="text-primary-600 hover:underline">
              Terminos de servicio
            </Link>{" "}
            y{" "}
            <Link to="/privacy" className="text-primary-600 hover:underline">
              Politica de privacidad
            </Link>
          </motion.p>
        </motion.div>
      </div>

      {/* Sonner Toaster */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
