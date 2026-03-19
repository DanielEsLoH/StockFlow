import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Package,
  ShoppingCart,
  Users,
  BookOpen,
  Settings,
  FileText,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { OnboardingStatus } from "~/services/dashboard.service";

const stepIcons: Record<string, typeof Package> = {
  warehouse: Package,
  products: ShoppingCart,
  customers: Users,
  accounting: BookOpen,
  accountingConfig: Settings,
  dian: FileText,
};

const stepLinks: Record<string, string> = {
  warehouse: "/warehouses/new",
  products: "/products/new",
  customers: "/customers/new",
  accounting: "/accounting/accounts",
  accountingConfig: "/settings",
  dian: "/dian/config",
};

interface OnboardingBannerProps {
  data: OnboardingStatus;
  onDismiss?: () => void;
}

export function OnboardingBanner({ data, onDismiss }: OnboardingBannerProps) {
  if (data.completed) return null;

  const doneCount = data.steps.filter((s) => s.done).length;
  const totalSteps = data.steps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6",
        "border-primary-200/60 bg-gradient-to-br from-primary-50 via-white to-accent-50/30",
        "dark:border-primary-800/40 dark:from-primary-950/30 dark:via-neutral-900 dark:to-accent-950/20",
      )}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40">
          <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Configura tu empresa ({doneCount}/{totalSteps})
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Completa estos pasos para aprovechar StockFlow al máximo
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
            />
          </div>

          {/* Steps */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.steps.map((step) => {
              const Icon = stepIcons[step.key] || Circle;
              const link = stepLinks[step.key] || "/settings";

              return step.done ? (
                <div
                  key={step.key}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-neutral-400 line-through dark:text-neutral-500"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  <span className="truncate">{step.label}</span>
                </div>
              ) : (
                <Link
                  key={step.key}
                  to={link}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium",
                    "text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-700",
                    "dark:text-neutral-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-400",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary-500 dark:text-primary-400" />
                  <span className="truncate">{step.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
