import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Users,
  Truck,
  Download,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Card, CardContent } from "~/components/ui/Card";
import { FileDropZone } from "./FileDropZone";
import { ImportPreviewTable } from "./ImportPreviewTable";
import {
  useValidateImport,
  useExecuteImport,
  useDownloadTemplate,
} from "~/hooks/useImports";
import {
  ImportModule,
  DuplicateStrategy,
} from "~/types/import";
import type {
  ImportValidationResult,
  ImportResult,
} from "~/types/import";

// Step definitions
const steps = [
  { id: 1, title: "Modulo" },
  { id: 2, title: "Archivo" },
  { id: 3, title: "Vista previa" },
  { id: 4, title: "Resultado" },
];

// Module cards configuration
const moduleCards = [
  {
    id: ImportModule.PRODUCTS,
    title: "Productos",
    description: "Importa tu catalogo de productos con precios, SKU y stock",
    icon: Package,
    listRoute: "/products",
  },
  {
    id: ImportModule.CUSTOMERS,
    title: "Clientes",
    description: "Importa tu base de clientes con datos de contacto y facturacion",
    icon: Users,
    listRoute: "/customers",
  },
  {
    id: ImportModule.SUPPLIERS,
    title: "Proveedores",
    description: "Importa tus proveedores con informacion comercial",
    icon: Truck,
    listRoute: "/suppliers",
  },
];

// Framer Motion variants
const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function ImportWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleParam = searchParams.get("module") as ImportModule | null;
  const validModule = moduleParam && Object.values(ImportModule).includes(moduleParam) ? moduleParam : null;

  const [currentStep, setCurrentStep] = useState(validModule ? 2 : 1);
  const [selectedModule, setSelectedModule] = useState<ImportModule | null>(validModule);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState(DuplicateStrategy.SKIP);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const validateMutation = useValidateImport();
  const executeMutation = useExecuteImport();
  const templateMutation = useDownloadTemplate();

  // Step navigation
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  // Module selection
  const handleModuleSelect = useCallback(
    (moduleId: ImportModule) => {
      setSelectedModule(moduleId);
      goToStep(2);
    },
    [goToStep],
  );

  // File selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  // Validate file
  const handleValidate = useCallback(() => {
    if (!selectedFile || !selectedModule) return;

    validateMutation.mutate(
      { module: selectedModule, file: selectedFile },
      {
        onSuccess: (result) => {
          setValidationResult(result);
          goToStep(3);
        },
      },
    );
  }, [selectedFile, selectedModule, validateMutation, goToStep]);

  // Execute import
  const handleImport = useCallback(() => {
    if (!selectedFile || !selectedModule) return;

    executeMutation.mutate(
      {
        module: selectedModule,
        file: selectedFile,
        duplicateStrategy,
      },
      {
        onSuccess: (result) => {
          setImportResult(result);
          goToStep(4);
        },
      },
    );
  }, [selectedFile, selectedModule, duplicateStrategy, executeMutation, goToStep]);

  // Restart wizard
  const handleRestart = useCallback(() => {
    setCurrentStep(1);
    setSelectedModule(null);
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setDuplicateStrategy(DuplicateStrategy.SKIP);
    setShowErrorDetails(false);
  }, []);

  // Find module config
  const selectedModuleConfig = moduleCards.find((m) => m.id === selectedModule);

  // Progress percentage
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="space-y-6">
      {/* Step Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium transition-colors",
                  isCompleted
                    ? "text-success-600 dark:text-success-400"
                    : isCurrent
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-neutral-400 dark:text-neutral-500",
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isCurrent
                        ? "bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400"
                        : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500",
                    )}
                  >
                    {step.id}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            );
          })}
        </div>

        <div className="h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Select Module */}
        {currentStep === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Selecciona el modulo
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Elige el tipo de datos que deseas importar
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {moduleCards.map((mod) => (
                <Card
                  key={mod.id}
                  variant="default"
                  hover="lift"
                  padding="none"
                  className={cn(
                    "group overflow-hidden transition-all cursor-pointer",
                    selectedModule === mod.id &&
                      "ring-2 ring-primary-500 border-primary-300 dark:border-primary-700",
                  )}
                  onClick={() => handleModuleSelect(mod.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                          "bg-primary-50 text-primary-500 group-hover:bg-primary-100",
                          "dark:bg-primary-900/20 dark:text-primary-400 dark:group-hover:bg-primary-900/40",
                        )}
                      >
                        <mod.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                          {mod.title}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          templateMutation.mutate(mod.id);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                          "text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300",
                        )}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar plantilla
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Upload File */}
        {currentStep === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Subir archivo
              </h2>
              {selectedModuleConfig && (
                <Badge variant="primary" size="sm">
                  {selectedModuleConfig.title}
                </Badge>
              )}
            </div>

            <FileDropZone
              onFileSelect={handleFileSelect}
              disabled={validateMutation.isPending}
            />

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Volver
              </Button>
              <Button
                type="button"
                onClick={handleValidate}
                disabled={!selectedFile}
                isLoading={validateMutation.isPending}
                rightIcon={
                  !validateMutation.isPending ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : undefined
                }
              >
                {validateMutation.isPending ? "Validando..." : "Validar"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Preview */}
        {currentStep === 3 && validationResult && (
          <motion.div
            key="step-3"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Vista previa de importacion
            </h2>

            {/* Warning banner for errors */}
            {validationResult.errorRows > 0 && (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4",
                  "dark:border-warning-800 dark:bg-warning-900/20",
                )}
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-500" />
                <div>
                  <p className="text-sm font-medium text-warning-800 dark:text-warning-300">
                    {validationResult.errorRows} filas tienen errores y seran omitidas
                  </p>
                  <p className="mt-0.5 text-xs text-warning-600 dark:text-warning-400">
                    Haz clic en una fila con error para ver el detalle
                  </p>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <ImportPreviewTable validationResult={validationResult} />

            {/* Duplicate Strategy */}
            {validationResult.duplicateRows > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Estrategia para duplicados
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                      duplicateStrategy === DuplicateStrategy.SKIP
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/20"
                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    )}
                  >
                    <input
                      type="radio"
                      name="duplicateStrategy"
                      value={DuplicateStrategy.SKIP}
                      checked={duplicateStrategy === DuplicateStrategy.SKIP}
                      onChange={() => setDuplicateStrategy(DuplicateStrategy.SKIP)}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        Omitir duplicados
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Los registros duplicados no se importaran
                      </p>
                    </div>
                  </label>

                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                      duplicateStrategy === DuplicateStrategy.UPDATE
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/20"
                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    )}
                  >
                    <input
                      type="radio"
                      name="duplicateStrategy"
                      value={DuplicateStrategy.UPDATE}
                      checked={duplicateStrategy === DuplicateStrategy.UPDATE}
                      onChange={() => setDuplicateStrategy(DuplicateStrategy.UPDATE)}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        Actualizar existentes
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Se actualizaran los registros ya existentes
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Import summary */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                Se importaran{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {validationResult.validRows +
                    (duplicateStrategy === DuplicateStrategy.UPDATE
                      ? validationResult.duplicateRows
                      : 0)}
                </span>{" "}
                registros
                {duplicateStrategy === DuplicateStrategy.UPDATE &&
                  validationResult.duplicateRows > 0 && (
                    <>
                      {" "}
                      ({validationResult.validRows} nuevos,{" "}
                      {validationResult.duplicateRows} actualizaciones)
                    </>
                  )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Volver
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={
                  validationResult.errorRows === validationResult.totalRows
                }
                isLoading={executeMutation.isPending}
              >
                {executeMutation.isPending ? (
                  "Importando..."
                ) : (
                  <>
                    Importar
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {currentStep === 4 && importResult && (
          <motion.div
            key="step-4"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Success Card */}
            <div className="flex flex-col items-center text-center gap-4 rounded-xl border border-success-200 bg-success-50/50 py-8 dark:border-success-800 dark:bg-success-900/10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30">
                <CheckCircle2 className="h-8 w-8 text-success-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Importacion completada
                </h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Los datos han sido procesados exitosamente
                </p>
              </div>
            </div>

            {/* Result Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {importResult.created}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Creados
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {importResult.updated}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Actualizados
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                  {importResult.skipped}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Omitidos
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-2xl font-bold text-error-600 dark:text-error-400">
                  {importResult.errors}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Errores
                </p>
              </div>
            </div>

            {/* Error Details (expandable) */}
            {importResult.errors > 0 && importResult.errorDetails.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    "text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300",
                  )}
                >
                  <XCircle className="h-4 w-4" />
                  {showErrorDetails
                    ? "Ocultar detalle de errores"
                    : "Ver detalle de errores"}
                </button>

                <AnimatePresence>
                  {showErrorDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-60 overflow-y-auto rounded-xl border border-error-200 bg-error-50/50 p-4 dark:border-error-800 dark:bg-error-900/10">
                        <ul className="space-y-1.5">
                          {importResult.errorDetails.map((detail, i) => (
                            <li
                              key={i}
                              className="text-xs text-error-700 dark:text-error-300"
                            >
                              <span className="font-medium">
                                Fila {detail.row}:
                              </span>{" "}
                              {detail.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleRestart}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Importar mas
              </Button>
              {selectedModuleConfig && (
                <Button
                  type="button"
                  onClick={() => navigate(selectedModuleConfig.listRoute)}
                  rightIcon={<ExternalLink className="h-4 w-4" />}
                >
                  Ver {selectedModuleConfig.title.toLowerCase()}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
