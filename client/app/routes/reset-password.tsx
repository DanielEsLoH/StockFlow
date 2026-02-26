import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { requireGuest } from "~/lib/auth.server";
import type { Route } from "./+types/reset-password";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Minimo 8 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

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
    { title: "Restablecer Contrasena - StockFlow" },
    {
      name: "description",
      content: "Restablece tu contrasena de StockFlow",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  requireGuest(request);
  return null;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { resetPassword, isResettingPassword } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = (data: ResetPasswordForm) => {
    if (!token) return;
    resetPassword(
      { token, password: data.password },
      {
        onSuccess: () => setResetSuccess(true),
      },
    );
  };

  // No token in URL
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-error-200 bg-error-50 p-8 dark:border-error-800 dark:bg-error-950/30">
            <AlertTriangle className="h-16 w-16 text-error-500" />
            <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Enlace invalido
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              El enlace de restablecimiento no es valido o ha expirado. Por
              favor solicita uno nuevo.
            </p>
          </div>
          <Link to="/forgot-password">
            <Button className="w-full" size="lg">
              Solicitar nuevo enlace
            </Button>
          </Link>
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesion
          </Link>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <a
        href="#reset-password-form"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al formulario
      </a>

      {/* Left Panel - Branding */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
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

          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <h1 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
              Crea una nueva
              <br />
              <span className="text-primary-200">contrasena segura</span>
            </h1>
            <p className="max-w-md text-lg text-primary-100">
              Elige una contrasena fuerte de al menos 8 caracteres para
              proteger tu cuenta.
            </p>
          </motion.div>

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
                {resetSuccess
                  ? "Contrasena actualizada"
                  : "Nueva contrasena"}
              </h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                {resetSuccess
                  ? "Tu contrasena ha sido restablecida exitosamente"
                  : "Ingresa tu nueva contrasena"}
              </p>
            </div>
            <ThemeToggle />
          </motion.div>

          {resetSuccess ? (
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="flex flex-col items-center gap-4 rounded-xl border border-success-200 bg-success-50 p-8 dark:border-success-800 dark:bg-success-950/30">
                <CheckCircle className="h-16 w-16 text-success-500" />
                <p className="text-center text-neutral-700 dark:text-neutral-300">
                  Tu contrasena ha sido actualizada correctamente. Ya puedes
                  iniciar sesion con tu nueva contrasena.
                </p>
              </div>

              <Link to="/login">
                <Button className="w-full" size="lg">
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Ir a iniciar sesion
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="relative">
              {isResettingPassword && (
                <div className="absolute inset-0 z-10 rounded-2xl bg-white/50 backdrop-blur-[2px] dark:bg-neutral-950/50" />
              )}
              <motion.form
                variants={itemVariants}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                aria-label="Formulario de restablecimiento de contrasena"
                id="reset-password-form"
              >
                {/* New password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Nueva contrasena
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
                        showPassword
                          ? "Ocultar contrasena"
                          : "Mostrar contrasena"
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

                {/* Confirm password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Confirmar contrasena
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                    <Input
                      {...register("confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="********"
                      className="pl-10 pr-10 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      error={!!errors.confirmPassword}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label={
                        showConfirmPassword
                          ? "Ocultar contrasena"
                          : "Mostrar contrasena"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-error-500" role="alert">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <motion.div
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Restableciendo...
                      </>
                    ) : (
                      <>
                        Restablecer contrasena
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </div>
          )}

          {/* Back to login */}
          {!resetSuccess && (
            <motion.div variants={itemVariants}>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a iniciar sesion
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
