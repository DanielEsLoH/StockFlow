import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from 'lucide-react';
import { useAuth } from '~/hooks/useAuth';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import type { Route } from './+types/register';

// Validation schema
const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Minimo 2 caracteres'),
    lastName: z.string().min(2, 'Minimo 2 caracteres'),
    email: z.string().email('Email invalido'),
    password: z
      .string()
      .min(8, 'Minimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener una mayuscula')
      .regex(/[0-9]/, 'Debe contener un numero'),
    confirmPassword: z.string(),
    tenantName: z.string().min(2, 'Minimo 2 caracteres'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'Debes aceptar los terminos',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const steps = [
  { id: 1, title: 'Datos personales', icon: User },
  { id: 2, title: 'Seguridad', icon: Lock },
  { id: 3, title: 'Empresa', icon: Building2 },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Crear Cuenta - StockFlow' },
    { name: 'description', content: 'Crea tu cuenta en StockFlow' },
  ];
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
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');

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
    'bg-error-500',
    'bg-error-400',
    'bg-warning-500',
    'bg-success-400',
    'bg-success-500',
  ];

  const strengthLabels = [
    'Muy debil',
    'Debil',
    'Regular',
    'Buena',
    'Excelente',
  ];

  const nextStep = async () => {
    const fieldsToValidate: (keyof RegisterForm)[][] = [
      ['firstName', 'lastName', 'email'],
      ['password', 'confirmPassword'],
      ['tenantName', 'acceptTerms'],
    ];

    const isValid = await trigger(fieldsToValidate[currentStep - 1]);
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
    const { confirmPassword: _, acceptTerms: __, ...userData } = data;
    registerUser(userData);
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
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Crear cuenta
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Paso {currentStep} de 3
            </p>
          </div>

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
                        ? 'rgb(16 185 129)'
                        : isCurrent
                          ? 'rgb(59 130 246)'
                          : 'rgb(229 231 235)',
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      isCompleted || isCurrent
                        ? 'text-white'
                        : 'text-neutral-400 dark:text-neutral-600'
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
                          ? 'bg-success-500'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
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
                        {...register('firstName')}
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
                        {...register('lastName')}
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
                        {...register('email')}
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
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
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
                                  : 'bg-neutral-200 dark:bg-neutral-700'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-neutral-500">
                          Fortaleza:{' '}
                          {strengthLabels[passwordStrength - 1] || 'Muy debil'}
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
                        {...register('confirmPassword')}
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
                        {...register('tenantName')}
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
                      {...register('acceptTerms')}
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Acepto los{' '}
                      <Link
                        to="/terms"
                        className="text-primary-600 hover:underline"
                      >
                        Terminos de servicio
                      </Link>{' '}
                      y la{' '}
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
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1"
                >
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
          Ya tienes cuenta?{' '}
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