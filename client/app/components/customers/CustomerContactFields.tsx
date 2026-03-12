import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { PageSection } from "~/components/layout/PageWrapper";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { cn } from "~/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CustomerContactFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors;
}

export function CustomerContactFields({
  register,
  errors,
}: CustomerContactFieldsProps) {
  return (
    <>
      {/* Contact Info */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Informacion de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Email *
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="cliente@email.com"
                  error={!!errors.email}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.email.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Telefono
                </label>
                <Input
                  {...register("phone")}
                  placeholder="+57 300 123 4567"
                  error={!!errors.phone}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.phone.message as string}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Direccion
                </label>
                <Input
                  {...register("address")}
                  placeholder="Calle 123 #45-67"
                  error={!!errors.address}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.address.message as string}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Ciudad
                </label>
                <Input
                  {...register("city")}
                  placeholder="Bogota"
                  error={!!errors.city}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.city.message as string}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Notes */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Notas Adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              {...register("notes")}
              placeholder="Notas sobre el cliente (opcional)"
              rows={4}
              className={cn(
                "w-full rounded-lg border border-neutral-300 dark:border-neutral-600",
                "bg-white dark:bg-neutral-900 px-4 py-2.5",
                "text-neutral-900 dark:text-white placeholder:text-neutral-400",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none",
                "transition-colors resize-none",
              )}
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-error-500">
                {errors.notes.message as string}
              </p>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </>
  );
}
