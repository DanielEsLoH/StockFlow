import * as React from "react";
import { Package, FileText, Search, AlertCircle, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "./Button";

type EmptyStateType = "products" | "search" | "error" | "default";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

const defaultConfigs: Record<
  EmptyStateType,
  { icon: React.ReactNode; title: string; description: string }
> = {
  products: {
    icon: <Package className="h-16 w-16" />,
    title: "No hay productos",
    description: "Comienza agregando tu primer producto al inventario.",
  },
  search: {
    icon: <Search className="h-16 w-16" />,
    title: "Sin resultados",
    description:
      "No encontramos productos que coincidan con tu busqueda. Intenta con otros terminos.",
  },
  error: {
    icon: <AlertCircle className="h-16 w-16" />,
    title: "Error al cargar",
    description:
      "Hubo un problema al cargar los datos. Por favor, intenta de nuevo.",
  },
  default: {
    icon: <FileText className="h-16 w-16" />,
    title: "Sin datos",
    description: "No hay informacion disponible en este momento.",
  },
};

export function EmptyState({
  type = "default",
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const config = defaultConfigs[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div className="mb-6 text-neutral-300 dark:text-neutral-600">
        {icon || config.icon}
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
        {title || config.title}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">
        {description || config.description}
      </p>

      {/* Action button */}
      {action && (
        <Button
          onClick={action.onClick}
          leftIcon={action.icon || <Plus className="h-4 w-4" />}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Inline empty state for tables and lists
interface InlineEmptyStateProps {
  message?: string;
  className?: string;
}

export function InlineEmptyState({
  message = "No hay datos disponibles",
  className,
}: InlineEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-8 text-sm text-neutral-500 dark:text-neutral-400",
        className,
      )}
    >
      {message}
    </div>
  );
}
