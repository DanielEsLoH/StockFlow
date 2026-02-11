import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "~/lib/utils";
import { PageSection } from "./PageWrapper";

const iconColorMap: Record<string, string> = {
  primary:
    "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25",
  accent:
    "bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25",
  success:
    "bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/25",
  warning:
    "bg-gradient-to-br from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-500/25",
  error:
    "bg-gradient-to-br from-error-500 to-error-600 text-white shadow-lg shadow-error-500/25",
  neutral:
    "bg-gradient-to-br from-neutral-500 to-neutral-600 text-white shadow-lg shadow-neutral-500/25",
};

interface PageHeaderProps {
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  title: string;
  description?: string;
  backTo?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  iconColor = "primary",
  title,
  description,
  backTo,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <PageSection>
      {backTo && (
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl",
                iconColorMap[iconColor] || iconColorMap.primary,
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">{actions}</div>
        )}
      </div>
    </PageSection>
  );
}
