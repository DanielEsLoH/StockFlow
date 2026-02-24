import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  UserCheck,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  Shield,
  Building,
} from "lucide-react";
import type { Route } from "./+types/_app.payroll.employees.$id";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatDate, formatCurrency } from "~/lib/utils";
import { useEmployee, useChangeEmployeeStatus } from "~/hooks/usePayroll";
import {
  EmployeeStatusLabels,
  EmployeeStatusVariants,
  ContractTypeLabels,
  SalaryTypeLabels,
  ARLRiskLevelLabels,
  DocumentTypeLabels,
} from "~/types/payroll";
import type { EmployeeStatus } from "~/types/payroll";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Skeleton } from "~/components/ui/Skeleton";
import { usePermissions } from "~/hooks/usePermissions";
import { Permission } from "~/types/permissions";

export const meta: Route.MetaFunction = () => [
  { title: "Empleado - StockFlow" },
  { name: "description", content: "Detalles del empleado" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();
  const { data: employee, isLoading, isError } = useEmployee(id!);
  const changeStatus = useChangeEmployeeStatus();

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <UserCheck className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Empleado no encontrado
        </h2>
        <Link to="/payroll/employees">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a empleados
          </Button>
        </Link>
      </div>
    );
  }

  const handleStatusChange = (status: EmployeeStatus) => {
    changeStatus.mutate({ id: employee.id, status });
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/payroll/employees">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <UserCheck className="h-7 w-7 text-primary-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <Badge variant={EmployeeStatusVariants[employee.status]} dot>
                    {EmployeeStatusLabels[employee.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <span>{DocumentTypeLabels[employee.documentType as keyof typeof DocumentTypeLabels] || employee.documentType} {employee.documentNumber}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-14 sm:ml-0">
            {hasPermission(Permission.PAYROLL_EDIT) && (
              <Link to={`/payroll/employees/${id}/edit`}>
                <Button variant="outline">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
            )}
            {hasPermission(Permission.PAYROLL_EDIT) && employee.status === "ACTIVE" && (
              <Button
                variant="danger"
                onClick={() => handleStatusChange("TERMINATED")}
                isLoading={changeStatus.isPending}
              >
                Retirar
              </Button>
            )}
            {hasPermission(Permission.PAYROLL_EDIT) && employee.status === "TERMINATED" && (
              <Button
                variant="soft-primary"
                onClick={() => handleStatusChange("ACTIVE")}
                isLoading={changeStatus.isPending}
              >
                Reactivar
              </Button>
            )}
          </div>
        </div>
      </PageSection>

      {/* Stats */}
      <PageSection>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="soft-primary" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20">
                <DollarSign className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(employee.baseSalary)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Salario Base</p>
              </div>
            </div>
          </Card>
          <Card variant="soft-success" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/20">
                <Briefcase className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {ContractTypeLabels[employee.contractType]}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Contrato</p>
              </div>
            </div>
          </Card>
          <Card variant="soft-warning" padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/20">
                <Shield className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {ARLRiskLevelLabels[employee.arlRiskLevel]}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">ARL</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-500/20">
                <Calendar className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {formatDate(employee.startDate)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Fecha Ingreso</p>
              </div>
            </div>
          </Card>
        </div>
      </PageSection>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Informacion de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow icon={Mail} label="Email" value={employee.email} />
              <DetailRow icon={Phone} label="Telefono" value={employee.phone} />
              <DetailRow icon={MapPin} label="Direccion" value={employee.address} />
              <DetailRow icon={MapPin} label="Ciudad" value={employee.city} />
              <DetailRow icon={MapPin} label="Departamento" value={employee.department} />
            </CardContent>
          </Card>
        </PageSection>

        {/* Social Security */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Seguridad Social</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="Tipo de Salario" value={SalaryTypeLabels[employee.salaryType]} />
              <InfoRow label="EPS" value={employee.epsName} />
              <InfoRow label="AFP (Pension)" value={employee.afpName} />
              <InfoRow label="Caja de Compensacion" value={employee.cajaName} />
              <InfoRow label="Auxilio de Transporte" value={employee.auxilioTransporte ? "Si" : "No"} />
            </CardContent>
          </Card>
        </PageSection>

        {/* Bank Info */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Informacion Bancaria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="Banco" value={employee.bankName} />
              <InfoRow label="Tipo de Cuenta" value={employee.bankAccountType} />
              <InfoRow label="Numero de Cuenta" value={employee.bankAccountNumber} />
            </CardContent>
          </Card>
        </PageSection>

        {/* Dates */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="Fecha de Ingreso" value={formatDate(employee.startDate)} />
              <InfoRow label="Fecha de Retiro" value={employee.endDate ? formatDate(employee.endDate) : null} />
              <InfoRow label="Fecha de Registro" value={formatDate(employee.createdAt)} />
              <InfoRow label="Ultima Actualizacion" value={formatDate(employee.updatedAt)} />
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </PageWrapper>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Icon className="h-5 w-5 text-neutral-500" />
      </div>
      <div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-neutral-900 dark:text-white">{value || "-"}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="font-medium text-neutral-900 dark:text-white">{value || "-"}</span>
    </div>
  );
}
