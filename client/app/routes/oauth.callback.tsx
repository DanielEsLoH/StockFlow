import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { setAccessToken, setRefreshToken, api } from "~/lib/api";
import { useAuthStore } from "~/stores/auth.store";
import { queryKeys } from "~/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/Button";
import { ThemeToggle } from "~/components/ui/ThemeToggle";

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
    { title: "OAuth - StockFlow" },
    { name: "description", content: "Procesando autenticacion OAuth" },
  ];
}

type CallbackStatus = "loading" | "success" | "pending" | "error";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, setTenant } = useAuthStore();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const processedRef = useRef(false);

  const token = searchParams.get("token");
  const refresh = searchParams.get("refresh");
  const pending = searchParams.get("pending");
  const error = searchParams.get("error");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Process OAuth callback
  useEffect(() => {
    // Prevent double processing in React strict mode
    if (processedRef.current) {
      return;
    }
    processedRef.current = true;

    const processCallback = async () => {
      // Check for error first
      if (error) {
        setStatus("error");
        setErrorMessage(decodeURIComponent(error));
        toast.error(decodeURIComponent(error));
        return;
      }

      // Check for pending approval
      if (pending === "true") {
        setStatus("pending");
        return;
      }

      // Check for tokens
      if (token && refresh) {
        try {
          // Store tokens
          setAccessToken(token);
          setRefreshToken(refresh);

          // Fetch user info
          const { data } = await api.get("/auth/me");

          // Update auth store
          setUser(data.user);
          setTenant(data.tenant);

          // Update query cache
          queryClient.setQueryData(queryKeys.auth.me(), data);

          setStatus("success");
          toast.success(`Bienvenido, ${data.user.firstName}!`);
        } catch (err) {
          setStatus("error");
          const message =
            err instanceof Error ? err.message : "Error al autenticar";
          setErrorMessage(message);
          toast.error(message);
          // Clear tokens on error
          setAccessToken(null);
          setRefreshToken(null);
        }
      } else {
        setStatus("error");
        setErrorMessage("No se recibieron los tokens de autenticacion");
        toast.error("Error en la autenticacion OAuth");
      }
    };

    processCallback();
  }, [token, refresh, pending, error, setUser, setTenant, queryClient]);

  // Countdown and redirect
  useEffect(() => {
    if (status !== "success" && status !== "pending") return;

    const targetPath = status === "success" ? "/dashboard" : "/login";

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(targetPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  const renderContent = () => {
    if (status === "loading") {
      return (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center space-y-4"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Procesando autenticacion
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Por favor espera mientras procesamos tu inicio de sesion...
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
            Autenticacion exitosa
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Has iniciado sesion correctamente.
            <br />
            Seras redirigido al dashboard en{" "}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {countdown}
            </span>{" "}
            segundos.
          </p>
          <Link to="/dashboard">
            <Button className="mt-4">Ir al dashboard</Button>
          </Link>
        </motion.div>
      );
    }

    if (status === "pending") {
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
            <Clock className="h-10 w-10 text-warning-600 dark:text-warning-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Cuenta pendiente de aprobacion
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Tu cuenta esta pendiente de aprobacion por un administrador.
            <br />
            Te notificaremos cuando tu cuenta sea activada.
          </p>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Seras redirigido al inicio de sesion en{" "}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {countdown}
            </span>{" "}
            segundos.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">
              Volver al inicio de sesion
            </Button>
          </Link>
        </motion.div>
      );
    }

    // Error state
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
          Error de autenticacion
        </h2>
        <p className="text-center text-neutral-600 dark:text-neutral-400">
          {errorMessage || "Ocurrio un error durante la autenticacion OAuth."}
        </p>
        <Link to="/login">
          <Button variant="outline" className="mt-4">
            Volver al inicio de sesion
          </Button>
        </Link>
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
