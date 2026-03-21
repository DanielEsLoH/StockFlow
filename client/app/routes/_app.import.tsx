import { PageWrapper } from "~/components/layout/PageWrapper";
import { ImportWizard } from "~/components/import/ImportWizard";

export default function ImportPage() {
  return (
    <PageWrapper
      title="Importar Datos"
      description="Importa productos, clientes y proveedores desde archivos CSV o Excel"
    >
      <ImportWizard />
    </PageWrapper>
  );
}
