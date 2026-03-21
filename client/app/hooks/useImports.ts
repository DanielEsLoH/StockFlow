import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as importsService from "~/services/imports.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import type {
  ImportModule,
  ImportValidationResult,
  ImportResult,
  DuplicateStrategy,
} from "~/types/import";

const MODULE_QUERY_KEYS: Record<ImportModule, readonly string[]> = {
  products: queryKeys.products.all,
  customers: queryKeys.customers.all,
  suppliers: queryKeys.suppliers.all,
};

export function useValidateImport() {
  return useMutation<
    ImportValidationResult,
    Error,
    { file: File; module: ImportModule }
  >({
    mutationFn: ({ file, module }) =>
      importsService.validateImport(file, module),
    onError: (error) => {
      toast.error(error.message || "Error al validar el archivo");
    },
  });
}

export function useExecuteImport() {
  const queryClient = useQueryClient();

  return useMutation<
    ImportResult,
    Error,
    { file: File; module: ImportModule; duplicateStrategy: DuplicateStrategy }
  >({
    mutationFn: ({ file, module, duplicateStrategy }) =>
      importsService.executeImport(file, module, duplicateStrategy),
    onSuccess: (result, { module }) => {
      void queryClient.invalidateQueries({
        queryKey: MODULE_QUERY_KEYS[module],
      });

      const parts: string[] = [];
      if (result.created > 0) parts.push(`${result.created} creados`);
      if (result.updated > 0) parts.push(`${result.updated} actualizados`);
      if (result.skipped > 0) parts.push(`${result.skipped} omitidos`);

      toast.success(
        `Importación completada: ${parts.join(", ") || "sin cambios"}`,
      );
    },
    onError: (error) => {
      toast.error(error.message || "Error al ejecutar la importación");
    },
  });
}

export function useDownloadTemplate() {
  return useMutation<void, Error, ImportModule>({
    mutationFn: (module) => importsService.downloadTemplate(module),
    onError: (error) => {
      toast.error(error.message || "Error al descargar la plantilla");
    },
  });
}
