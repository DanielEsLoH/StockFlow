import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ThemeToggle } from "~/components/ui/ThemeToggle";

// Validation schema for resend form
const resendSchema = z.object({
  email: z.email({ message: "Email invalido" }),
});

type ResendForm = z.infer<typeof resendSchema>;

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
    { title: "Verificar Email - StockFlow" },
    {
      name: "description",
      content: "Verifica tu correo electronico de StockFlow",
    },
  ];
}

type VerificationStatus = "loading" | "success" | "error" | "no-token";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showResendForm, setShowResendForm] = useState(false);
  const verificationAttempted = useRef(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    verifyEmail,
    isVerifyingEmail,
    resendVerification,
    isResendingVerification,
  } = useAuth();

  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendForm>({
    resolver: zodResolver(resendSchema),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Verify email on mount
  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    // Prevent double verification in React strict mode
    if (verificationAttempted.current || isVerifying) {
      return;
    }
    verificationAttempted.current = true;
    setIsVerifying(true);

    verifyEmail(token, {
      onSuccess: () => {
        setStatus("success");
        setIsVerifying(false);
      },
      onError: (error: Error) => {
        setIsVerifying(false);
        // If the error is about invalid token, it might have been verified already
        // Check if the message indicates it was already verified
        const errorMsg = error.message || "Error al verificar el email";
        if (
          errorMsg.toLowerCase().includes("already been verified") ||
          errorMsg.toLowerCase().includes("ya ha sido verificado")
        ) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(errorMsg);
        }
      },
    });
  }, [token, verifyEmail, isVerifying]);

  // Countdown and redirect on success
  useEffect(() => {
    if (status !== "success") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  const onResend = (data: ResendForm) => {
    resendVerification(data.email, {
      onSuccess: () => {
        setShowResendForm(false);
      },
    });
  };

  const renderContent = () => {
    if (status === "loading" || isVerifyingEmail) {
      return (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center space-y-4"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Verificando tu email
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Por favor espera mientras verificamos tu correo electronico...
          </p>
        </motion.div>
      );
    }

    if (status === "success") {
      return (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30"
          >
            <CheckCircle2 className="h-10 w-10 text-success-600 dark:text-success-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Email verificado
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Tu correo electronico ha sido verificado correctamente.
          </p>
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
            <p className="text-center text-sm text-primary-700 dark:text-primary-300">
              <strong>Tu cuenta esta pendiente de aprobacion</strong> por un
              administrador. Te notificaremos por correo cuando sea aprobada.
            </p>
          </div>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Seras redirigido al inicio de sesion en{" "}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {countdown}
            </span>{" "}
            segundos.
          </p>
          <Link to="/login">
            <Button className="mt-4">
              Ir al inicio de sesion
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      );
    }

    if (status === "error") {
      return (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/30"
          >
            <XCircle className="h-10 w-10 text-error-600 dark:text-error-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Error de verificacion
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            {errorMessage || "No pudimos verificar tu correo electronico."}
          </p>

          {!showResendForm ? (
            <div className="flex flex-col items-center space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowResendForm(true)}
                className="mt-4"
              >
                <Mail className="mr-2 h-4 w-4" />
                Reenviar correo de verificacion
              </Button>
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                Volver al inicio de sesion
              </Link>
            </div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit(onResend)}
              className="mt-4 w-full space-y-4"
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
                    className="pl-10"
                    error={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-error-500">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResendForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isResendingVerification}
                  className="flex-1"
                >
                  {isResendingVerification ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Reenviar"
                  )}
                </Button>
              </div>
            </motion.form>
          )}
        </motion.div>
      );
    }

    // no-token state
    return (
      <motion.div
        variants={itemVariants}
        className="flex flex-col items-center space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30"
        >
          <Mail className="h-10 w-10 text-warning-600 dark:text-warning-400" />
        </motion.div>
        <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Token no encontrado
        </h2>
        <p className="text-center text-neutral-600 dark:text-neutral-400">
          No se encontro un token de verificacion en la URL.
          <br />
          Si necesitas verificar tu email, solicita un nuevo correo de
          verificacion.
        </p>

        {!showResendForm ? (
          <div className="flex flex-col items-center space-y-3">
            <Button
              variant="outline"
              onClick={() => setShowResendForm(true)}
              className="mt-4"
            >
              <Mail className="mr-2 h-4 w-4" />
              Solicitar correo de verificacion
            </Button>
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:underline dark:text-primary-400"
            >
              Volver al inicio de sesion
            </Link>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit(onResend)}
            className="mt-4 w-full space-y-4"
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
                  className="pl-10"
                  error={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-error-500">{errors.email.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResendForm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isResendingVerification}
                className="flex-1"
              >
                {isResendingVerification ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar"
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </motion.div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
      <motion.div
        variants={containerVariants}
        initial={isMounted ? "hidden" : false}
        animate="visible"
        className="w-full max-w-md"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="mb-8 flex items-center justify-between"
        >
          <Link
            to="/"
            className="flex items-center gap-3 text-neutral-900 dark:text-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z" />
                <path d="M13 12h-2v3H8v2h3v3h2v-3h3v-2h-3z" />
              </svg>
            </div>
            <span className="font-display text-xl font-bold">StockFlow</span>
          </Link>
          <ThemeToggle />
        </motion.div>

        {/* Card */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          {renderContent()}
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400"
        >
          Necesitas ayuda?{" "}
          <Link
            to="/contact"
            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Contactanos
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
