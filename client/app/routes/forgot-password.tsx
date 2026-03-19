import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { requireGuest } from "~/lib/auth.server";
import type { Route } from "./+types/forgot-password";

const forgotPasswordSchema = z.object({
  email: z.email({ message: "Email invalido" }),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

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
    { title: "Recuperar Contrasena - StockFlow" },
    {
      name: "description",
      content: "Recupera tu contrasena de StockFlow",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  requireGuest(request);
  return null;
}

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { forgotPassword, isSendingReset } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    forgotPassword(data.email, {
      onSuccess: () => setEmailSent(true),
    });
  };

  return (
    <div className="flex min-h-screen">
      <a
        href="#forgot-password-form"
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
              <StockFlowLogo size="lg" showText variant="white" />
            </Link>
          </motion.div>

          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <h1 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
              Recupera el acceso
              <br />
              <span className="text-primary-200">a tu cuenta</span>
            </h1>
            <p className="max-w-md text-lg text-primary-100">
              Te enviaremos un enlace para restablecer tu contrasena de forma
              segura.
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
                {emailSent ? "Revisa tu correo" : "Recuperar contrasena"}
              </h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                {emailSent
                  ? "Te hemos enviado instrucciones para restablecer tu contrasena"
                  : "Ingresa tu correo y te enviaremos un enlace de recuperacion"}
              </p>
            </div>
            <ThemeToggle />
          </motion.div>

          {emailSent ? (
            /* Success state */
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="flex flex-col items-center gap-4 rounded-xl border border-success-200 bg-success-50 p-8 dark:border-success-800 dark:bg-success-950/30">
                <CheckCircle className="h-16 w-16 text-success-500" />
                <p className="text-center text-neutral-700 dark:text-neutral-300">
                  Si existe una cuenta con{" "}
                  <span className="font-semibold">{getValues("email")}</span>,
                  recibiras un correo con instrucciones para restablecer tu
                  contrasena.
                </p>
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                  El enlace expira en 1 hora. Revisa tu carpeta de spam si no
                  lo encuentras.
                </p>
              </div>

              <Link to="/login">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Volver a iniciar sesion
                </Button>
              </Link>
            </motion.div>
          ) : (
            /* Form */
            <div className="relative">
              {isSendingReset && (
                <div className="absolute inset-0 z-10 rounded-2xl bg-white/50 backdrop-blur-[2px] dark:bg-neutral-950/50" />
              )}
              <motion.form
                variants={itemVariants}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                aria-label="Formulario de recuperacion de contrasena"
                id="forgot-password-form"
              >
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

                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }}>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Enviar enlace de recuperacion
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </div>
          )}

          {/* Back to login */}
          {!emailSent && (
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
