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
  ArrowLeft,
  Check,
  Loader2,
  User,
  Lock,
  Building2,
  Zap,
  BarChart3,
  Receipt,
  Boxes,
} from "lucide-react";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { requireGuest } from "~/lib/auth.server";
import type { Route } from "./+types/register";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Validation schema
const registerSchema = z
  .object({
    firstName: z.string().min(2, "Minimo 2 caracteres"),
    lastName: z.string().min(2, "Minimo 2 caracteres"),
    email: z.email({ message: "Email invalido" }),
    password: z
      .string()
      .min(8, "Minimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener una mayuscula")
      .regex(/[0-9]/, "Debe contener un numero"),
    confirmPassword: z.string(),
    tenantName: z.string().min(2, "Minimo 2 caracteres"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Debes aceptar los terminos",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const steps = [
  { id: 1, title: "Tus datos", icon: User },
  { id: 2, title: "Seguridad", icon: Lock },
  { id: 3, title: "Tu empresa", icon: Building2 },
];

const benefits = [
  {
    icon: Boxes,
    title: "Inventario inteligente",
    desc: "Multi-bodega, alertas de stock bajo y trazabilidad completa",
  },
  {
    icon: Receipt,
    title: "Facturacion DIAN",
    desc: "Emite facturas electronicas validas en segundos",
  },
  {
    icon: BarChart3,
    title: "Reportes en tiempo real",
    desc: "Dashboard con metricas clave de tu negocio",
  },
  {
    icon: Zap,
    title: "Listo en minutos",
    desc: "Configura tu empresa y empieza a facturar hoy",
  },
];

export function meta() {
  return [
    { title: "Crear Cuenta - StockFlow" },
    { name: "description", content: "Crea tu cuenta en StockFlow" },
  ];
}

// Redirect authenticated users to dashboard
export function loader({ request }: Route.LoaderArgs) {
  requireGuest(request);
  return null;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { register: registerUser, isRegistering } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const password = watch("password", "");

  // Password strength
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const strengthColors = [
    "bg-error-500",
    "bg-error-400",
    "bg-warning-500",
    "bg-success-400",
    "bg-success-500",
  ];

  const strengthLabels = [
    "Muy debil",
    "Debil",
    "Regular",
    "Buena",
    "Excelente",
  ];

  const nextStep = async () => {
    const fieldsToValidate: (keyof RegisterForm)[][] = [
      ["firstName", "lastName", "email"],
      ["password", "confirmPassword"],
      ["tenantName", "acceptTerms"],
    ];

    const isValid = await trigger(fieldsToValidate[currentStep - 1]);

    if (currentStep === 2 && isValid) {
      const passwordValue = watch("password");
      const confirmValue = watch("confirmPassword");
      if (passwordValue !== confirmValue) {
        setError("confirmPassword", {
          type: "manual",
          message: "Las contrasenas no coinciden",
        });
        return;
      }
    }

    if (isValid && currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = (data: RegisterForm) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, acceptTerms, ...userData } = data;
    registerUser(userData);
  };

  const onError = (errors: Record<string, unknown>) => {
    const step1Fields = ["firstName", "lastName", "email"];
    const step2Fields = ["password", "confirmPassword"];

    for (const field of step1Fields) {
      if (field in errors) {
        setCurrentStep(1);
        return;
      }
    }
    for (const field of step2Fields) {
      if (field in errors) {
        setCurrentStep(2);
        return;
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding & Benefits */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] xl:w-[56%]">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />

        {/* Isometric cube pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 10 L90 27 L90 57 L60 74 L30 57 L30 27 Z' fill='none' stroke='white' stroke-width='1'/%3E%3Cpath d='M60 40 L90 27' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M60 40 L30 27' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cpath d='M60 40 L60 74' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Radial glow */}
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

          {/* Main content */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-bold leading-tight xl:text-4xl 2xl:text-[2.75rem] 2xl:leading-tight">
                Empieza gratis,
                <br />
                <span className="text-primary-200">crece sin limites</span>
              </h1>
              <p className="max-w-sm text-base text-primary-100/80 leading-relaxed xl:text-lg xl:max-w-md">
                Crea tu cuenta en menos de 2 minutos y descubre por que cientos
                de empresas confian en StockFlow.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid gap-4 max-w-md">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={isMounted ? { opacity: 0, x: -12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                  className="flex items-start gap-3.5 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm transition-colors group-hover:bg-white/15">
                    <benefit.icon className="h-[18px] w-[18px] text-primary-200" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-white/95">
                      {benefit.title}
                    </p>
                    <p className="text-xs text-primary-200/70 leading-relaxed">
                      {benefit.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex items-center gap-4"
          >
            {/* Avatars stack */}
            <div className="flex -space-x-2.5">
              {["AM", "LR", "JP", "SC"].map((initials, i) => (
                <div
                  key={initials}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary-700 text-[10px] font-bold text-white"
                  style={{
                    backgroundColor: [
                      "rgba(168,85,247,0.5)",
                      "rgba(20,184,166,0.5)",
                      "rgba(249,115,22,0.5)",
                      "rgba(99,102,241,0.5)",
                    ][i],
                    zIndex: 4 - i,
                  }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">
                Unete a cientos de empresas
              </p>
              <p className="text-xs text-primary-200/60">
                que ya gestionan su negocio con StockFlow
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Register Form */}
      <div className="relative flex flex-1 items-center justify-center bg-white p-6 sm:p-8 dark:bg-neutral-950">
        {/* Theme toggle */}
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
          initial={isMounted ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px] space-y-6"
        >
          {/* Header */}
          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Crear cuenta
            </h2>
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              Registrate para comenzar a usar StockFlow
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`${API_URL}/auth/google`}
                className="group flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
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

              <a
                href={`${API_URL}/auth/github`}
                className="group flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
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
            </div>

            <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500">
              Con OAuth se crea tu cuenta y empresa automaticamente
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:bg-neutral-950 dark:text-neutral-500">
                o con email
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-3">
            {/* Step labels */}
            <div className="flex items-center justify-between px-1">
              {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      isCompleted
                        ? "text-success-600 dark:text-success-400"
                        : isCurrent
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <step.icon className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{step.title}</span>
                    <span className="sm:hidden">{step.id}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress track */}
            <div className="h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                initial={false}
                animate={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit, onError)}>
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={isMounted ? { opacity: 0, x: 16 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Nombre
                      </label>
                      <Input
                        {...register("firstName")}
                        placeholder="Juan"
                        error={!!errors.firstName}
                        autoComplete="given-name"
                      />
                      {errors.firstName && (
                        <p className="text-xs text-error-500">
                          {errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Apellido
                      </label>
                      <Input
                        {...register("lastName")}
                        placeholder="Perez"
                        error={!!errors.lastName}
                        autoComplete="family-name"
                      />
                      {errors.lastName && (
                        <p className="text-xs text-error-500">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

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
                      <p className="text-xs text-error-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Security */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={isMounted ? { opacity: 0, x: 16 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Contrasena
                    </label>
                    <div className="relative">
                      <Input
                        {...register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimo 8 caracteres"
                        className="pr-10"
                        error={!!errors.password}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        aria-label={
                          showPassword
                            ? "Ocultar contrasena"
                            : "Mostrar contrasena"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password strength */}
                    {password && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i < passwordStrength
                                  ? strengthColors[passwordStrength - 1]
                                  : "bg-neutral-200 dark:bg-neutral-700"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          {strengthLabels[passwordStrength - 1] || "Muy debil"}
                        </p>
                      </div>
                    )}

                    {errors.password && (
                      <p className="text-xs text-error-500">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Confirmar contrasena
                    </label>
                    <Input
                      {...register("confirmPassword")}
                      type="password"
                      placeholder="Repite tu contrasena"
                      error={!!errors.confirmPassword}
                      autoComplete="new-password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-error-500">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Company */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={isMounted ? { opacity: 0, x: 16 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Nombre de tu empresa
                    </label>
                    <Input
                      {...register("tenantName")}
                      placeholder="Mi Empresa S.A.S"
                      error={!!errors.tenantName}
                    />
                    {errors.tenantName && (
                      <p className="text-xs text-error-500">
                        {errors.tenantName.message}
                      </p>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <input
                      type="checkbox"
                      {...register("acceptTerms")}
                      className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
                    />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Acepto los{" "}
                      <Link
                        to="/terms"
                        className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Terminos de servicio
                      </Link>{" "}
                      y la{" "}
                      <Link
                        to="/privacy"
                        className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Politica de privacidad
                      </Link>
                    </span>
                  </label>
                  {errors.acceptTerms && (
                    <p className="text-xs text-error-500">
                      {errors.acceptTerms.message}
                    </p>
                  )}

                  {/* Info box */}
                  <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-3.5 dark:border-primary-900/30 dark:bg-primary-950/20">
                    <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed">
                      Tu cuenta quedara pendiente de aprobacion. Te
                      notificaremos por email cuando sea activada.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-6 flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  size="lg"
                  className="px-5"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Atras
                </Button>
              )}

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  size="lg"
                  className="flex-1"
                >
                  Siguiente
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isRegistering}
                  size="lg"
                  className="flex-1"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Ya tienes cuenta?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              Inicia sesion
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
