import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  BarChart3,
  FileText,
  Package,
  Shield,
} from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { requireGuest, getRedirectTo } from "~/lib/auth.server";
import type { Route } from "./+types/login";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Validation schema
const loginSchema = z.object({
  email: z.email({ message: "Email invalido" }),
  password: z.string().min(8, "Minimo 8 caracteres"),
  rememberMe: z.boolean(),
});

type LoginForm = z.infer<typeof loginSchema>;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const features = [
  {
    icon: Package,
    title: "Inventario multi-bodega",
    desc: "Control en tiempo real de stock en todas tus ubicaciones",
  },
  {
    icon: FileText,
    title: "Facturacion electronica",
    desc: "Emite facturas validas ante la DIAN automaticamente",
  },
  {
    icon: BarChart3,
    title: "Reportes y analytics",
    desc: "Toma decisiones con datos claros de tu negocio",
  },
  {
    icon: Shield,
    title: "Seguro y confiable",
    desc: "Tu informacion protegida con encriptacion de nivel empresarial",
  },
];

export function meta() {
  return [
    { title: "Iniciar Sesion - StockFlow" },
    {
      name: "description",
      content: "Inicia sesion en tu cuenta de StockFlow",
    },
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
    defaultValues: {
      rememberMe: true,
    },
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

      {/* Left Panel — Branding & Social Proof */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] xl:w-[56%]">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />

        {/* Isometric cube pattern — echoes the logo motif */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 10 L90 27 L90 57 L60 74 L30 57 L30 27 Z' fill='none' stroke='white' stroke-width='1'/%3E%3Cpath d='M60 40 L90 27' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M60 40 L30 27' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M60 40 L60 74' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Radial glow for depth */}
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-accent-500/20 blur-[120px]" />
        <div className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-primary-400/15 blur-[150px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 text-white">
          {/* Logo */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: -10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="inline-flex items-center gap-3">
              <StockFlowLogo size="lg" showText variant="white" />
            </Link>
          </motion.div>

          {/* Main value proposition */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-bold leading-tight xl:text-4xl 2xl:text-[2.75rem] 2xl:leading-tight">
                La plataforma que
                <br />
                <span className="text-primary-200">
                  impulsa tu negocio
                </span>
              </h1>
              <p className="max-w-sm text-base text-primary-100/80 leading-relaxed xl:text-lg xl:max-w-md">
                Inventario, facturacion electronica y contabilidad en un solo
                lugar. Disenado para PyMEs colombianas.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid gap-4 max-w-md">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={isMounted ? { opacity: 0, x: -12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                  className="flex items-start gap-3.5 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm transition-colors group-hover:bg-white/15">
                    <feature.icon className="h-[18px] w-[18px] text-primary-200" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-white/95">
                      {feature.title}
                    </p>
                    <p className="text-xs text-primary-200/70 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Testimonial */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
          >
            <p className="text-sm leading-relaxed text-primary-50/90 italic">
              "StockFlow nos permitio pasar de llevar todo en Excel a tener
              control real de nuestro inventario y facturacion. El soporte es
              excelente."
            </p>
            <div className="mt-3.5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500/30 text-sm font-bold text-white">
                CM
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  Carlos Martinez
                </p>
                <p className="text-xs text-primary-200/60">
                  Gerente, Distribuciones del Valle S.A.S
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="relative flex flex-1 items-center justify-center bg-white p-6 sm:p-8 dark:bg-neutral-950">
        {/* Theme toggle — top right */}
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="absolute left-6 top-6 lg:hidden">
          <Link to="/">
            <StockFlowLogo size="md" showText />
          </Link>
        </div>

        <motion.div
          variants={containerVariants}
          initial={isMounted ? "hidden" : false}
          animate="visible"
          className="w-full max-w-[400px] space-y-7"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Bienvenido de nuevo
            </h2>
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              Ingresa tus credenciales para acceder a tu cuenta
            </p>
          </motion.div>

          {/* OAuth Buttons */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
            {/* Google */}
            <a
              href={`${API_URL}/auth/google`}
              className="group flex items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
            >
              <svg
                className="h-4.5 w-4.5 shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
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
              <span>Google</span>
            </a>

            {/* GitHub */}
            <a
              href={`${API_URL}/auth/github`}
              className="group flex items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
            >
              <svg
                className="h-4.5 w-4.5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
          </motion.div>

          {/* Divider */}
          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:bg-neutral-950 dark:text-neutral-500">
                o con email
              </span>
            </div>
          </motion.div>

          {/* Form */}
          <div className="relative">
            {isLoggingIn && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-white/60 backdrop-blur-[2px] dark:bg-neutral-950/60" />
            )}
            <motion.form
              variants={itemVariants}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              aria-label="Formulario de inicio de sesion"
              id="login-form"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Correo electronico
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="tu@email.com"
                  error={!!errors.email}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-error-500" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Contrasena
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                  >
                    Olvidaste tu contrasena?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contrasena"
                    className="pr-10"
                    error={!!errors.password}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    aria-label={
                      showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-error-500" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  defaultChecked
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Mantener sesion abierta
                </span>
              </label>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesion...
                  </>
                ) : (
                  <>
                    Iniciar sesion
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.form>
          </div>

          {/* Register link */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-neutral-500 dark:text-neutral-400"
          >
            No tienes cuenta?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              Crea una gratis
            </Link>
          </motion.p>

          {/* Legal */}
          <motion.p
            variants={itemVariants}
            className="text-center text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500"
          >
            Al continuar, aceptas nuestros{" "}
            <Link
              to="/terms"
              className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Terminos
            </Link>{" "}
            y{" "}
            <Link
              to="/privacy"
              className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Privacidad
            </Link>
          </motion.p>
        </motion.div>
      </div>

      {/* Sonner Toaster */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
