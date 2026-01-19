import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '~/hooks/useAuth';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import type { Route } from './+types/login';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

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

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Iniciar Sesion - StockFlow' },
    { name: 'description', content: 'Inicia sesion en tu cuenta de StockFlow' },
  ];
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
  });

  const onSubmit = (data: LoginForm) => {
    login(data);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />

        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo */}
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
                >
                  <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z" />
                  <path d="M13 12h-2v3H8v2h3v3h2v-3h3v-2h-3z" />
                </svg>
              </div>
              <span className="font-display text-2xl font-bold">StockFlow</span>
            </Link>
          </motion.div>

          {/* Main content */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <h1 className="font-display text-4xl font-bold leading-tight xl:text-5xl">
              Gestiona tu inventario
              <br />
              <span className="text-primary-200">de forma inteligente</span>
            </h1>
            <p className="max-w-md text-lg text-primary-100">
              Controla productos, facturacion y reportes en una sola plataforma
              disenada para PyMEs colombianas.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-3 gap-8"
          >
            {[
              { value: '500+', label: 'Empresas activas' },
              { value: '50K+', label: 'Facturas creadas' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-primary-200">{stat.label}</div>
              </div>
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
                Iniciar sesion
              </h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Ingresa tus credenciales para continuar
              </p>
            </div>
            <ThemeToggle />
          </motion.div>

          {/* Form */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Email */}
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
                <p className="text-sm text-error-500">{errors.email.message}</p>
              )}
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
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-error-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800"
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Recordarme
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Olvidaste tu contrasena?
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Iniciando sesion...
                </>
              ) : (
                <>
                  Iniciar sesion
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.form>

          {/* Divider */}
          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-neutral-50 px-4 text-neutral-500 dark:bg-neutral-950">
                Nuevo en StockFlow?
              </span>
            </div>
          </motion.div>

          {/* Register link */}
          <motion.div variants={itemVariants}>
            <Link to="/register">
              <Button variant="outline" className="w-full" size="lg">
                Crear una cuenta
              </Button>
            </Link>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-neutral-500 dark:text-neutral-400"
          >
            Al continuar, aceptas nuestros{' '}
            <Link to="/terms" className="text-primary-600 hover:underline">
              Terminos de servicio
            </Link>{' '}
            y{' '}
            <Link to="/privacy" className="text-primary-600 hover:underline">
              Politica de privacidad
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}