import { api } from "~/lib/api";
import type {
  ImportModule,
  ImportValidationResult,
  ImportResult,
  DuplicateStrategy,
} from "~/types/import";

const BASE_URL = "/imports";

export async function downloadTemplate(module: ImportModule): Promise<void> {
  const response = await api.get(`${BASE_URL}/templates/${module}`, {
    responseType: "blob",
  });

  const blob = response.data as Blob;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `plantilla-${module}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function validateImport(
  file: File,
  module: ImportModule,
): Promise<ImportValidationResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("module", module);

  const response = await api.post<ImportValidationResult>(
    `${BASE_URL}/validate`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

export async function executeImport(
  file: File,
  module: ImportModule,
  duplicateStrategy: DuplicateStrategy,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("module", module);
  formData.append("duplicateStrategy", duplicateStrategy);

  const response = await api.post<ImportResult>(
    `${BASE_URL}/execute`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}
