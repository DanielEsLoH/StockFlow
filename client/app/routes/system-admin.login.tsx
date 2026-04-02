import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Shield,
  Fingerprint,
} from "lucide-react";
import { useSystemAdminAuth } from "~/hooks/useSystemAdmin";
import { Button } from "~/components/ui/Button";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";
import {
  requireSystemAdminGuest,
  getSystemAdminRedirectTo,
} from "~/lib/system-admin-auth.server";
import type { Route } from "./+types/system-admin.login";

const loginSchema = z.object({
  email: z.email({ message: "Email invalido" }),
  password: z.string().min(8, "Minimo 8 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
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

export function loader({ request }: Route.LoaderArgs) {
  const redirectTo = getSystemAdminRedirectTo(request);
  requireSystemAdminGuest(request, redirectTo);
  return null;
}

export default function SystemAdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
    // Light: slate-100 (cool undertone signals precision, not warm consumer-app neutral)
    // Dark: neutral-950 (original deep dark)
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 dark:bg-neutral-950">
      {/* Skip to content */}
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al formulario
      </a>

      {/* === Animated background mesh — dark mode only ===
          On a light background, colored blobs are decorative noise without meaning. */}
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div
          className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary-600/15 blur-[120px] animate-gradient-mesh-1"
        />
        <div
          className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent-600/10 blur-[150px] animate-gradient-mesh-2"
        />
        <div
          className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/5 blur-[100px] animate-gradient-mesh-3"
        />
      </div>

      {/* === Grid pattern overlay ===
          Light: dark dots — structure on a light field
          Dark: white dots — texture on a dark void */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:hidden"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(15,23,42,0.5) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] hidden dark:block"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* === Login card === */}
      <motion.div
        variants={containerVariants}
        initial={isMounted ? "hidden" : false}
        animate="visible"
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        {/* Card surface
            Light: white on slate-100 — single depth strategy (subtle shadow + precise border)
            Dark: translucent dark surface with glow backdrop */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] p-8 shadow-sm dark:shadow-2xl dark:shadow-black/20 backdrop-blur-xl sm:p-10">

          {/* Logo + heading */}
          <motion.div variants={itemVariants} className="mb-8 text-center">
            <div className="mb-5 flex justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <StockFlowLogo size="lg" showText />
              </motion.div>
            </div>
            <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
              Panel de Administracion
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-neutral-400">
              Acceso exclusivo para administradores del sistema
            </p>
          </motion.div>

          {/* Security badge
              Light: monochromatic — the content communicates restriction, color would be noise
              Dark: subtle primary tint maintains the "secure zone" atmosphere */}
          <motion.div
            variants={itemVariants}
            className="mb-7 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-primary-500/10 bg-slate-50 dark:bg-primary-500/[0.06] px-4 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-primary-500/15">
              <Shield className="h-4 w-4 text-slate-500 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-primary-300">
                Acceso Restringido
              </p>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                Conexion cifrada y monitoreada
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <div className="relative">
            {/* Loading overlay */}
            <AnimatePresence>
              {isLoggingIn && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 dark:bg-neutral-950/60 backdrop-blur-[2px]"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Fingerprint className="h-8 w-8 text-primary-500 dark:text-primary-400" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form
              variants={itemVariants}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              aria-label="Formulario de inicio de sesion"
              id="login-form"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                  Correo electronico
                </label>
                <div className="relative">
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="admin@stockflow.com"
                    autoComplete="email"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className={`
                      flex h-11 w-full rounded-xl border px-4 text-sm
                      bg-slate-50 dark:bg-white/[0.04]
                      text-slate-900 dark:text-white
                      placeholder:text-slate-400 dark:placeholder:text-neutral-600
                      transition-all duration-200 focus:outline-none
                      ${
                        errors.email
                          ? "border-error-400 dark:border-error-500/50 focus:border-error-500 focus:ring-2 focus:ring-error-500/20"
                          : "border-slate-200 dark:border-white/[0.08] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20"
                      }
                    `}
                  />
                  {/* Focus glow line */}
                  <motion.div
                    className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{
                      opacity: focusedField === "email" ? 1 : 0,
                      scaleX: focusedField === "email" ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-error-500 dark:text-error-400" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                  Contrasena
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className={`
                      flex h-11 w-full rounded-xl border px-4 pr-11 text-sm
                      bg-slate-50 dark:bg-white/[0.04]
                      text-slate-900 dark:text-white
                      placeholder:text-slate-400 dark:placeholder:text-neutral-600
                      transition-all duration-200 focus:outline-none
                      ${
                        errors.password
                          ? "border-error-400 dark:border-error-500/50 focus:border-error-500 focus:ring-2 focus:ring-error-500/20"
                          : "border-slate-200 dark:border-white/[0.08] focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20"
                      }
                    `}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 transition-colors hover:text-slate-600 dark:hover:text-neutral-300"
                    aria-label={
                      showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                    }
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={showPassword ? "off" : "on"}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                  {/* Focus glow line */}
                  <motion.div
                    className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{
                      opacity: focusedField === "password" ? 1 : 0,
                      scaleX: focusedField === "password" ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-error-500 dark:text-error-400" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <motion.div whileTap={{ scale: 0.98 }} className="pt-1">
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  fullWidth
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Iniciar sesion
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </div>
        </div>

        {/* Back link — outside the card */}
        <motion.div
          variants={itemVariants}
          className="mt-6 text-center"
        >
          <Link
            to="/"
            className="text-xs text-slate-400 dark:text-neutral-500 transition-colors hover:text-slate-700 dark:hover:text-neutral-300"
          >
            Volver a StockFlow
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
