import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from './Button';

// Base Dialog components
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideDescription?: boolean;
  }
>(({ className, children, hideDescription, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={hideDescription ? undefined : props['aria-describedby']}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
        'rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out',
        className
      )}
      {...props}
    >
      {hideDescription && (
        <DialogPrimitive.Description className="sr-only">
          Contenido del dialogo
        </DialogPrimitive.Description>
      )}
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1 opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:ring-offset-neutral-900">
        <X className="h-5 w-5 text-neutral-500" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-neutral-900 dark:text-white',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// Confirmation Modal component
interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'default',
}: ConfirmModalProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const iconColors = {
    danger: 'text-error-500 bg-error-100 dark:bg-error-900/30',
    warning: 'text-warning-500 bg-warning-100 dark:bg-warning-900/30',
    default: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30',
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    default: 'primary' as const,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          {/* Icon */}
          <div
            className={cn(
              'mb-4 flex h-12 w-12 items-center justify-center rounded-full sm:mb-0 sm:mr-4',
              iconColors[variant]
            )}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <DialogTitle className="mb-2">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete confirmation modal
interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteModal({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isLoading = false,
}: DeleteModalProps) {
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Eliminar elemento"
      description={`Estas seguro de que deseas eliminar "${itemName}"? Esta accion no se puede deshacer.`}
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      onConfirm={onConfirm}
      isLoading={isLoading}
      variant="danger"
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};