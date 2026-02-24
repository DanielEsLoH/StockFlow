import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import {
  useDianConfig,
  useCreateDianConfig,
  useUpdateDianConfig,
  useSetSoftwareCredentials,
  useSetResolution,
  useUploadCertificate,
  useSetNoteConfig,
} from "~/hooks/useDian";
import type {
  CreateDianConfigDto,
  SetDianSoftwareDto,
  SetDianResolutionDto,
  SetNoteConfigDto,
  TaxResponsibility,
} from "~/types/dian";
import { taxResponsibilityLabels } from "~/types/dian";
import {
  ArrowLeft,
  Building2,
  Key,
  FileText,
  Shield,
  CheckCircle,
  Loader2,
  Hash,
} from "lucide-react";

type ActiveTab = "company" | "software" | "resolution" | "certificate" | "notes";

export default function DianConfigPage() {
  const { data: config, isLoading } = useDianConfig();
  const createConfig = useCreateDianConfig();
  const updateConfig = useUpdateDianConfig();
  const setSoftwareCredentials = useSetSoftwareCredentials();
  const setResolution = useSetResolution();
  const uploadCertificate = useUploadCertificate();
  const setNoteConfigMutation = useSetNoteConfig();

  const [activeTab, setActiveTab] = useState<ActiveTab>("company");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: "company" as const,
      label: "Datos Empresa",
      icon: Building2,
      complete: !!config,
    },
    {
      id: "software" as const,
      label: "Credenciales Software",
      icon: Key,
      complete: config?.hasSoftwareConfig,
    },
    {
      id: "resolution" as const,
      label: "Resolucion",
      icon: FileText,
      complete: config?.hasResolution,
    },
    {
      id: "certificate" as const,
      label: "Certificado",
      icon: Shield,
      complete: config?.hasCertificate,
    },
    {
      id: "notes" as const,
      label: "Notas",
      icon: Hash,
      complete: false,
    },
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <Link
          to="/dian"
          className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a DIAN
        </Link>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Configuracion DIAN
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-2">
          Configura los datos necesarios para la facturacion electronica
        </p>
      </PageSection>

      {/* Environment Badge */}
      {config && (
        <PageSection>
          <Badge
            variant={config.testMode ? "warning" : "success"}
            className="text-sm"
          >
            {config.testMode
              ? "Ambiente de Pruebas/Habilitacion"
              : "Ambiente de Produccion"}
          </Badge>
        </PageSection>
      )}

      {/* Tabs */}
      <PageSection>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.complete && <CheckCircle className="h-4 w-4 text-success-400" />}
          </button>
        ))}
      </div>
      </PageSection>

      {/* Tab Content */}
      {activeTab === "company" && (
        <CompanyDataForm
          config={config}
          onSubmit={async (data) => {
            if (config) {
              await updateConfig.mutateAsync(data);
            } else {
              await createConfig.mutateAsync(data);
            }
          }}
          isLoading={createConfig.isPending || updateConfig.isPending}
        />
      )}

      {activeTab === "software" && (
        <SoftwareCredentialsForm
          hasConfig={!!config}
          onSubmit={async (data) => {
            await setSoftwareCredentials.mutateAsync(data);
          }}
          isLoading={setSoftwareCredentials.isPending}
        />
      )}

      {activeTab === "resolution" && (
        <ResolutionForm
          config={config}
          hasConfig={!!config}
          onSubmit={async (data) => {
            await setResolution.mutateAsync(data);
          }}
          isLoading={setResolution.isPending}
        />
      )}

      {activeTab === "certificate" && (
        <CertificateUploadForm
          hasCertificate={config?.hasCertificate || false}
          hasConfig={!!config}
          onSubmit={async (file, password) => {
            await uploadCertificate.mutateAsync({ file, password });
          }}
          isLoading={uploadCertificate.isPending}
        />
      )}

      {activeTab === "notes" && (
        <NoteConfigForm
          hasConfig={!!config}
          onSubmit={async (data) => {
            await setNoteConfigMutation.mutateAsync(data);
          }}
          isLoading={setNoteConfigMutation.isPending}
        />
      )}
    </PageWrapper>
  );
}

// Company Data Form
function CompanyDataForm({
  config,
  onSubmit,
  isLoading,
}: {
  config: any;
  onSubmit: (data: CreateDianConfigDto) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDianConfigDto>({
    defaultValues: {
      nit: config?.nit || "",
      dv: config?.dv || "",
      businessName: config?.businessName || "",
      tradeName: config?.tradeName || "",
      taxResponsibilities: config?.taxResponsibilities || [],
      economicActivity: config?.economicActivity || "",
      address: config?.address || "",
      city: config?.city || "",
      cityCode: config?.cityCode || "",
      department: config?.department || "",
      departmentCode: config?.departmentCode || "",
      postalCode: config?.postalCode || "",
      phone: config?.phone || "",
      email: config?.email || "",
      testMode: config?.testMode ?? true,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la Empresa</CardTitle>
        <CardDescription>
          Informacion fiscal y de contacto para la facturacion electronica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* NIT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="nit"
              >
                NIT
              </label>
              <Input
                id="nit"
                {...register("nit", { required: "NIT es requerido" })}
                placeholder="900123456"
              />
              {errors.nit && (
                <p className="text-sm text-error-500 mt-1">
                  {errors.nit.message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="dv"
              >
                DV
              </label>
              <Input
                id="dv"
                {...register("dv", { required: "DV es requerido" })}
                placeholder="1"
                maxLength={1}
              />
            </div>
          </div>

          {/* Business Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="businessName"
              >
                Razon Social
              </label>
              <Input
                id="businessName"
                {...register("businessName", {
                  required: "Razon social es requerida",
                })}
                placeholder="Mi Empresa S.A.S."
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="tradeName"
              >
                Nombre Comercial (Opcional)
              </label>
              <Input
                id="tradeName"
                {...register("tradeName")}
                placeholder="Mi Marca"
              />
            </div>
          </div>

          {/* Economic Activity */}
          <div>
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="economicActivity"
            >
              Actividad Economica (Codigo CIIU)
            </label>
            <Input
              id="economicActivity"
              {...register("economicActivity", {
                required: "Actividad economica es requerida",
              })}
              placeholder="4711"
            />
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="address"
              >
                Direccion
              </label>
              <Input
                id="address"
                {...register("address", { required: "Direccion es requerida" })}
                placeholder="Calle 100 # 50-25"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="city"
              >
                Ciudad
              </label>
              <Input
                id="city"
                {...register("city", { required: "Ciudad es requerida" })}
                placeholder="Bogota D.C."
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="cityCode"
              >
                Codigo Ciudad
              </label>
              <Input
                id="cityCode"
                {...register("cityCode", {
                  required: "Codigo ciudad es requerido",
                })}
                placeholder="11001"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="department"
              >
                Departamento
              </label>
              <Input
                id="department"
                {...register("department", {
                  required: "Departamento es requerido",
                })}
                placeholder="Bogota D.C."
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="departmentCode"
              >
                Codigo Departamento
              </label>
              <Input
                id="departmentCode"
                {...register("departmentCode", {
                  required: "Codigo departamento es requerido",
                })}
                placeholder="11"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="postalCode"
              >
                Codigo Postal
              </label>
              <Input
                id="postalCode"
                {...register("postalCode")}
                placeholder="110111"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="phone"
              >
                Telefono
              </label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+57 1 1234567"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="email"
              >
                Correo Electronico
              </label>
              <Input
                id="email"
                type="email"
                {...register("email", { required: "Email es requerido" })}
                placeholder="facturacion@empresa.com"
              />
            </div>
          </div>

          {/* Test Mode */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="testMode"
              {...register("testMode")}
              className="h-4 w-4"
            />
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="testMode"
            >
              Modo de Pruebas/Habilitacion (desmarcar para produccion)
            </label>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {config ? "Actualizar Configuracion" : "Guardar Configuracion"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Software Credentials Form
function SoftwareCredentialsForm({
  hasConfig,
  onSubmit,
  isLoading,
}: {
  hasConfig: boolean;
  onSubmit: (data: SetDianSoftwareDto) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetDianSoftwareDto>();

  if (!hasConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-neutral-500">
            Primero debes configurar los datos de la empresa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credenciales de Software DIAN</CardTitle>
        <CardDescription>
          Ingresa los datos proporcionados por la DIAN al registrar tu software
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="softwareId"
            >
              ID del Software
            </label>
            <Input
              id="softwareId"
              {...register("softwareId", {
                required: "ID del software es requerido",
              })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            {errors.softwareId && (
              <p className="text-sm text-error-500 mt-1">
                {errors.softwareId.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="softwarePin"
            >
              PIN del Software
            </label>
            <Input
              id="softwarePin"
              type="password"
              {...register("softwarePin", { required: "PIN es requerido" })}
              placeholder="PIN de 5 digitos"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="technicalKey"
            >
              Clave Tecnica
            </label>
            <Input
              id="technicalKey"
              type="password"
              {...register("technicalKey", {
                required: "Clave tecnica es requerida",
              })}
              placeholder="Clave tecnica proporcionada por DIAN"
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Credenciales
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Resolution Form
function ResolutionForm({
  config,
  hasConfig,
  onSubmit,
  isLoading,
}: {
  config: any;
  hasConfig: boolean;
  onSubmit: (data: SetDianResolutionDto) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetDianResolutionDto>({
    defaultValues: {
      resolutionNumber: config?.resolutionNumber || "",
      resolutionDate: config?.resolutionDate?.split("T")[0] || "",
      resolutionPrefix: config?.resolutionPrefix || "",
      resolutionRangeFrom: config?.resolutionRangeFrom || 1,
      resolutionRangeTo: config?.resolutionRangeTo || 1000,
    },
  });

  if (!hasConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-neutral-500">
            Primero debes configurar los datos de la empresa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolucion de Facturacion</CardTitle>
        <CardDescription>
          Datos de la autorizacion de numeracion de la DIAN
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="resolutionNumber"
              >
                Numero de Resolucion
              </label>
              <Input
                id="resolutionNumber"
                {...register("resolutionNumber", {
                  required: "Numero de resolucion es requerido",
                })}
                placeholder="18760000001"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="resolutionDate"
              >
                Fecha de Resolucion
              </label>
              <Input
                id="resolutionDate"
                type="date"
                {...register("resolutionDate", {
                  required: "Fecha es requerida",
                })}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="resolutionPrefix"
            >
              Prefijo
            </label>
            <Input
              id="resolutionPrefix"
              {...register("resolutionPrefix", {
                required: "Prefijo es requerido",
              })}
              placeholder="SEFT"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="resolutionRangeFrom"
              >
                Rango Desde
              </label>
              <Input
                id="resolutionRangeFrom"
                type="number"
                {...register("resolutionRangeFrom", {
                  required: "Rango inicial es requerido",
                  valueAsNumber: true,
                })}
                placeholder="1"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="resolutionRangeTo"
              >
                Rango Hasta
              </label>
              <Input
                id="resolutionRangeTo"
                type="number"
                {...register("resolutionRangeTo", {
                  required: "Rango final es requerido",
                  valueAsNumber: true,
                })}
                placeholder="5000"
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Resolucion
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Certificate Upload Form
function CertificateUploadForm({
  hasCertificate,
  hasConfig,
  onSubmit,
  isLoading,
}: {
  hasCertificate: boolean;
  hasConfig: boolean;
  onSubmit: (file: File, password: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");

  if (!hasConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-neutral-500">
            Primero debes configurar los datos de la empresa
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file && password) {
      await onSubmit(file, password);
      setFile(null);
      setPassword("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificado Digital</CardTitle>
        <CardDescription>
          Carga tu certificado digital .p12 o .pfx para firmar los documentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasCertificate && (
          <div className="mb-6 p-4 bg-success-50 dark:bg-success-900/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success-500" />
            <span className="text-success-700 dark:text-success-400">
              Certificado cargado correctamente
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="certificate"
            >
              Archivo del Certificado (.p12 o .pfx)
            </label>
            <Input
              id="certificate"
              type="file"
              accept=".p12,.pfx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            <p className="text-sm text-neutral-500 mt-1">
              Formatos aceptados: .p12, .pfx
            </p>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="certificatePassword"
            >
              Contrasena del Certificado
            </label>
            <Input
              id="certificatePassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contrasena"
            />
          </div>

          <Button type="submit" disabled={isLoading || !file || !password}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {hasCertificate ? "Reemplazar Certificado" : "Cargar Certificado"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Note Configuration Form
function NoteConfigForm({
  hasConfig,
  onSubmit,
  isLoading,
}: {
  hasConfig: boolean;
  onSubmit: (data: SetNoteConfigDto) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
  } = useForm<SetNoteConfigDto>({
    defaultValues: {
      creditNotePrefix: "NC",
      creditNoteStartNumber: 1,
      debitNotePrefix: "ND",
      debitNoteStartNumber: 1,
    },
  });

  if (!hasConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-neutral-500">
            Primero debes configurar los datos de la empresa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Numeracion de Notas</CardTitle>
        <CardDescription>
          Configura los prefijos y numeracion inicial para notas credito y debito
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Credit Note */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
              Notas Credito
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="creditNotePrefix"
                >
                  Prefijo
                </label>
                <Input
                  id="creditNotePrefix"
                  {...register("creditNotePrefix")}
                  placeholder="NC"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="creditNoteStartNumber"
                >
                  Numero Inicial
                </label>
                <Input
                  id="creditNoteStartNumber"
                  type="number"
                  min={1}
                  {...register("creditNoteStartNumber", { valueAsNumber: true })}
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          {/* Debit Note */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
              Notas Debito
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="debitNotePrefix"
                >
                  Prefijo
                </label>
                <Input
                  id="debitNotePrefix"
                  {...register("debitNotePrefix")}
                  placeholder="ND"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  htmlFor="debitNoteStartNumber"
                >
                  Numero Inicial
                </label>
                <Input
                  id="debitNoteStartNumber"
                  type="number"
                  min={1}
                  {...register("debitNoteStartNumber", { valueAsNumber: true })}
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Configuracion de Notas
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
