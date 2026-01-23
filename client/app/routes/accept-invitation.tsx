import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Users,
  Loader2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth, useInvitation } from '~/hooks/useAuth';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import { requireGuest } from '~/lib/auth.server';
import type { Route } from './+types/accept-invitation';

// Validation schema
const acceptInvitationSchema = z
  .object({
    firstName: z.string().min(2, 'Minimo 2 caracteres'),
    lastName: z.string().min(2, 'Minimo 2 caracteres'),
    password: z
      .string()
      .min(8, 'Minimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener una mayuscula')
      .regex(/[0-9]/, 'Debe contener un numero'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });

type AcceptInvitationForm = z.infer<typeof acceptInvitationSchema>;

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
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Aceptar Invitacion - StockFlow' },
    { name: 'description', content: 'Acepta tu invitacion para unirte a StockFlow' },
  ];
}

// Redirect authenticated users to dashboard
export function loader({ request }: Route.LoaderArgs) {
  requireGuest(request);
  return null;
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const token = searchParams.get('token');
  const { acceptInvitation, isAcceptingInvitation } = useAuth();
  const { data: invitation, isLoading: isLoadingInvitation, error: invitationError } = useInvitation(token);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcceptInvitationForm>({
    resolver: zodResolver(acceptInvitationSchema),
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

  const onSubmit = (data: AcceptInvitationForm) => {
    if (!token) return;

    acceptInvitation({
      token,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
    });
  };

  // Format role name for display
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      OWNER: 'Propietario',
      ADMIN: 'Administrador',
      MANAGER: 'Gerente',
      EMPLOYEE: 'Empleado',
      VIEWER: 'Visualizador',
    };
    return roleMap[role] || role;
  };

  // No token provided
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
        <motion.div
          variants={containerVariants}
          initial={isMounted ? 'hidden' : false}
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
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30"
              >
                <AlertTriangle className="h-10 w-10 text-warning-600 dark:text-warning-400" />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
                Token no encontrado
              </h2>
              <p className="text-center text-neutral-600 dark:text-neutral-400">
                No se proporciono un token de invitacion.
                <br />
                Verifica el enlace de invitacion que recibiste por correo.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-4">
                  Ir al inicio de sesion
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Loading invitation details
  if (isLoadingInvitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
        <motion.div
          variants={containerVariants}
          initial={isMounted ? 'hidden' : false}
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
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
                Cargando invitacion
              </h2>
              <p className="text-center text-neutral-600 dark:text-neutral-400">
                Por favor espera mientras verificamos tu invitacion...
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Error loading invitation (invalid/expired)
  if (invitationError || !invitation) {
    const errorMessage = invitationError instanceof Error
      ? invitationError.message
      : 'La invitacion no es valida o ha expirado.';

    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
        <motion.div
          variants={containerVariants}
          initial={isMounted ? 'hidden' : false}
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
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/30"
              >
                <XCircle className="h-10 w-10 text-error-600 dark:text-error-400" />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
                Invitacion invalida
              </h2>
              <p className="text-center text-neutral-600 dark:text-neutral-400">
                {errorMessage}
              </p>
              <div className="flex flex-col items-center space-y-3 pt-4">
                <Link to="/login">
                  <Button>Ir al inicio de sesion</Button>
                </Link>
                <Link
                  to="/register"
                  className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                >
                  O crea una cuenta nueva
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Valid invitation - show form
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
      <motion.div
        variants={containerVariants}
        initial={isMounted ? 'hidden' : false}
        animate="visible"
        className="w-full max-w-lg"
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
          {/* Title */}
          <div className="mb-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30"
            >
              <Users className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Unete a {invitation.tenantName}
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              <span className="font-medium">{invitation.invitedByName}</span> te ha invitado a unirse como{' '}
              <span className="font-medium text-primary-600 dark:text-primary-400">
                {formatRole(invitation.role)}
              </span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Correo electronico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                <Input
                  type="email"
                  value={invitation.email}
                  disabled
                  className="pl-10 bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Este es el correo al que se envio la invitacion
              </p>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Nombre
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                  <Input
                    {...register('firstName')}
                    placeholder="Juan"
                    className="pl-10"
                    error={!!errors.firstName}
                  />
                </div>
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

            {/* Password */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
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

            {/* Confirm Password */}
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

            {/* Submit button */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="pt-2"
            >
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isAcceptingInvitation}
              >
                {isAcceptingInvitation ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta y unirme'
                )}
              </Button>
            </motion.div>
          </form>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Al crear tu cuenta, aceptas nuestros{' '}
            <Link to="/terms" className="text-primary-600 hover:underline">
              Terminos de servicio
            </Link>{' '}
            y{' '}
            <Link to="/privacy" className="text-primary-600 hover:underline">
              Politica de privacidad
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400"
        >
          Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:underline"
          >
            Inicia sesion
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
