import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import type { Route } from "./+types/_app.bank.accounts.new";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { useCreateBankAccount } from "~/hooks/useBank";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Select } from "~/components/ui/Select";
import type { CreateBankAccountData } from "~/types/bank";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nueva Cuenta Bancaria - StockFlow" },
    { name: "description", content: "Crear una nueva cuenta bancaria" },
  ];
};

const accountTypeOptions = [
  { value: "CHECKING", label: "Corriente" },
  { value: "SAVINGS", label: "Ahorros" },
];

export default function NewBankAccountPage() {
  const createBankAccount = useCreateBankAccount();

  const [form, setForm] = useState<CreateBankAccountData>({
    name: "",
    bankName: "",
    accountNumber: "",
    accountType: "CHECKING",
    currency: "COP",
    initialBalance: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "El nombre es requerido";
    if (!form.bankName.trim()) newErrors.bankName = "El nombre del banco es requerido";
    if (!form.accountNumber.trim()) newErrors.accountNumber = "El numero de cuenta es requerido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createBankAccount.mutate(form);
  };

  const updateField = <K extends keyof CreateBankAccountData>(
    field: K,
    value: CreateBankAccountData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex items-center gap-4">
          <Link to="/bank/accounts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
              Nueva Cuenta Bancaria
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Agrega una nueva cuenta bancaria a tu empresa
            </p>
          </div>
        </div>
      </PageSection>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PageSection>
              <Card>
                <CardHeader>
                  <CardTitle>Informacion de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nombre *
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Ej: Cuenta Principal Bancolombia"
                      error={!!errors.name}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-error-500">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Nombre del Banco *
                      </label>
                      <Input
                        value={form.bankName}
                        onChange={(e) => updateField("bankName", e.target.value)}
                        placeholder="Ej: Bancolombia"
                        error={!!errors.bankName}
                      />
                      {errors.bankName && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.bankName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Numero de Cuenta *
                      </label>
                      <Input
                        value={form.accountNumber}
                        onChange={(e) =>
                          updateField("accountNumber", e.target.value)
                        }
                        placeholder="Ej: 123-456789-00"
                        error={!!errors.accountNumber}
                      />
                      {errors.accountNumber && (
                        <p className="mt-1 text-sm text-error-500">
                          {errors.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Tipo de Cuenta *
                      </label>
                      <Select
                        options={accountTypeOptions}
                        value={form.accountType}
                        onChange={(value) =>
                          updateField(
                            "accountType",
                            value as "CHECKING" | "SAVINGS",
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Moneda
                      </label>
                      <Input
                        value={form.currency}
                        onChange={(e) => updateField("currency", e.target.value)}
                        placeholder="COP"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Saldo Inicial
                    </label>
                    <Input
                      type="number"
                      value={form.initialBalance}
                      onChange={(e) =>
                        updateField("initialBalance", Number(e.target.value))
                      }
                      placeholder="0"
                    />
                    <p className="text-sm text-neutral-500 mt-1">
                      El saldo con el que inicia la cuenta en el sistema
                    </p>
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PageSection>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={createBankAccount.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Crear Cuenta
                  </Button>
                  <Link to="/bank/accounts" className="block">
                    <Button type="button" variant="outline" className="w-full">
                      Cancelar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </PageSection>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
