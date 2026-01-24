import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { requireGuest } from "~/lib/auth.server";
import type { Route } from "./+types/register";

// Validation schema
const registerSchema = z
  .object({
    firstName: z.string().min(2, "Minimo 2 caracteres"),
    lastName: z.string().min(2, "Minimo 2 caracteres"),
    email: z.string().email("Email invalido"),
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
  { id: 1, title: "Datos personales", icon: User },
  { id: 2, title: "Seguridad", icon: Lock },
  { id: 3, title: "Empresa", icon: Building2 },
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

  // Password strength calculation
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

    // Validate current step fields
    const isValid = await trigger(fieldsToValidate[currentStep - 1]);

    // For step 2, also validate password matching (cross-field validation)
    if (currentStep === 2 && isValid) {
      const passwordValue = watch("password");
      const confirmValue = watch("confirmPassword");
      if (passwordValue !== confirmValue) {
        setError("confirmPassword", {
          type: "manual",
          message: "Las contrasenas no coinciden",
        });
        return; // Don't proceed
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

  // Handle validation errors - navigate to the step with errors
  const onError = (errors: Record<string, unknown>) => {
    const step1Fields = ["firstName", "lastName", "email"];
    const step2Fields = ["password", "confirmPassword"];

    // Check which step has errors
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
    // Step 3 errors will be shown on current page
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
      <motion.div
        initial={isMounted ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
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
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
          {/* Title */}
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Crear cuenta
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Registrate para comenzar a usar StockFlow
            </p>
          </div>

          {/* OAuth Social Login Buttons */}
          <div className="space-y-3 mb-6">
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
          </div>

          {/* OAuth note */}
          <p className="text-xs text-neutral-500 text-center mb-6">
            Al registrarte con Google o GitHub, se creara una nueva empresa.
          </p>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-neutral-900 text-neutral-500">
                o registrate con email
              </span>
            </div>
          </div>

          {/* Step indicator */}
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Paso {currentStep} de 3
          </p>

          {/* Progress Steps */}
          <div className="mb-8 flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted
                        ? "rgb(16 185 129)"
                        : isCurrent
                          ? "rgb(59 130 246)"
                          : "rgb(229 231 235)",
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      isCompleted || isCurrent
                        ? "text-white"
                        : "text-neutral-400 dark:text-neutral-600"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </motion.div>

                  {index < steps.length - 1 && (
                    <div
                      className={`mx-2 h-1 w-16 rounded-full transition-colors ${
                        isCompleted
                          ? "bg-success-500"
                          : "bg-neutral-200 dark:bg-neutral-700"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit, onError)}>
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={isMounted ? { opacity: 0, x: 20 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Nombre
                      </label>
                      <Input
                        {...register("firstName")}
                        placeholder="Juan"
                        error={!!errors.firstName}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-error-500">
                          {errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Apellido
                      </label>
                      <Input
                        {...register("lastName")}
                        placeholder="Perez"
                        error={!!errors.lastName}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-error-500">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

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
                </motion.div>
              )}

              {/* Step 2: Security */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={isMounted ? { opacity: 0, x: 20 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
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
                        className="pl-10 pr-10"
                        error={!!errors.password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {password && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                i < passwordStrength
                                  ? strengthColors[passwordStrength - 1]
                                  : "bg-neutral-200 dark:bg-neutral-700"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-neutral-500">
                          Fortaleza:{" "}
                          {strengthLabels[passwordStrength - 1] || "Muy debil"}
                        </p>
                      </div>
                    )}

                    {errors.password && (
                      <p className="text-sm text-error-500">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Confirmar contrasena
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                      <Input
                        {...register("confirmPassword")}
                        type="password"
                        placeholder="********"
                        className="pl-10"
                        error={!!errors.confirmPassword}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-error-500">
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
                  initial={isMounted ? { opacity: 0, x: 20 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Nombre de tu empresa
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                      <Input
                        {...register("tenantName")}
                        placeholder="Mi Empresa S.A.S"
                        className="pl-10"
                        error={!!errors.tenantName}
                      />
                    </div>
                    {errors.tenantName && (
                      <p className="text-sm text-error-500">
                        {errors.tenantName.message}
                      </p>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      {...register("acceptTerms")}
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Acepto los{" "}
                      <Link
                        to="/terms"
                        className="text-primary-600 hover:underline"
                      >
                        Terminos de servicio
                      </Link>{" "}
                      y la{" "}
                      <Link
                        to="/privacy"
                        className="text-primary-600 hover:underline"
                      >
                        Politica de privacidad
                      </Link>
                    </span>
                  </label>
                  {errors.acceptTerms && (
                    <p className="text-sm text-error-500">
                      {errors.acceptTerms.message}
                    </p>
                  )}

                  {/* Info box */}
                  <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
                    <p className="text-sm text-warning-700 dark:text-warning-300">
                      <strong>Nota:</strong> Al registrarte, tu cuenta quedara
                      pendiente de aprobacion por un administrador. Te
                      notificaremos cuando tu cuenta sea activada.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-8 flex gap-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
              )}

              {currentStep < 3 ? (
                <Button type="button" onClick={nextStep} className="flex-1">
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isRegistering}
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
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:underline"
          >
            Inicia sesion
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
