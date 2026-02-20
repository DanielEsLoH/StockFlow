import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  BookMarked,
  Plus,
  X,
} from "lucide-react";
import type { Route } from "./+types/_app.accounting.journal-entries.new";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import { formatCurrency } from "~/lib/utils";
import {
  useAccounts,
  useAccountingPeriods,
  useCreateJournalEntry,
} from "~/hooks/useAccounting";
import { Button } from "~/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Input } from "~/components/ui/Input";
import { Textarea } from "~/components/ui/Textarea";
import { Select } from "~/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "~/components/ui/Table";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Nuevo Asiento - StockFlow" },
    { name: "description", content: "Crear nuevo asiento contable" },
  ];
};

interface EntryLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

export default function NewJournalEntryPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [periodId, setPeriodId] = useState<string>("");
  const [lines, setLines] = useState<EntryLine[]>([
    { accountId: "", description: "", debit: 0, credit: 0 },
    { accountId: "", description: "", debit: 0, credit: 0 },
  ]);

  const { data: accounts } = useAccounts();
  const { data: periods } = useAccountingPeriods();
  const createJournalEntry = useCreateJournalEntry();

  const openPeriods = (periods ?? []).filter((p) => p.status === "OPEN");

  const accountOptions = (accounts ?? [])
    .filter((a) => a.isActive)
    .map((a) => ({
      value: a.id,
      label: `${a.code} - ${a.name}`,
    }));

  const periodOptions = openPeriods.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const difference = Math.abs(totalDebit - totalCredit);

  const validLines = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
  const canSubmit =
    date.trim() !== "" &&
    description.trim() !== "" &&
    validLines.length >= 2 &&
    isBalanced;

  const updateLine = (index: number, field: keyof EntryLine, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "debit" && (value as number) > 0) {
        updated[index].credit = 0;
      } else if (field === "credit" && (value as number) > 0) {
        updated[index].debit = 0;
      }

      return updated;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, { accountId: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    createJournalEntry.mutate({
      date,
      description,
      periodId: periodId || undefined,
      lines: validLines,
    });
  };

  return (
    <PageWrapper>
      {/* Header */}
      <PageSection>
        <div className="flex items-start gap-4">
          <Link to="/accounting/journal-entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <BookMarked className="h-7 w-7 text-primary-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-neutral-900 dark:text-white">
                Nuevo Asiento Contable
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Crear un asiento manual en el libro diario
              </p>
            </div>
          </div>
        </div>
      </PageSection>

      {/* Form */}
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>Datos del Asiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Fecha *
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Periodo
                </label>
                <Select
                  options={periodOptions}
                  value={periodId}
                  onChange={(val) => setPeriodId(val)}
                  placeholder="Seleccionar periodo (opcional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Descripcion *
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion del asiento contable..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Lines */}
      <PageSection>
        <Card padding="none">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Lineas del Asiento</CardTitle>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Linea
              </Button>
            </div>
          </div>
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Cuenta</TableHead>
                  <TableHead className="min-w-[180px]">Descripcion</TableHead>
                  <TableHead className="text-right min-w-[140px]">Debito</TableHead>
                  <TableHead className="text-right min-w-[140px]">Credito</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        options={accountOptions}
                        value={line.accountId}
                        onChange={(val) => updateLine(index, "accountId", val)}
                        placeholder="Seleccionar cuenta..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Descripcion (opcional)"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={line.debit || ""}
                        onChange={(e) =>
                          updateLine(index, "debit", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={line.credit || ""}
                        onChange={(e) =>
                          updateLine(index, "credit", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 2}
                      >
                        <X className="h-4 w-4 text-neutral-400 hover:text-error-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </PageSection>

      {/* Balance + Submit */}
      <PageSection>
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Debitos
                  </span>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(totalDebit)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Creditos
                  </span>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(totalCredit)}
                  </p>
                </div>
                <div>
                  {isBalanced ? (
                    <Badge variant="success" size="lg">Balanceado</Badge>
                  ) : (
                    <Badge variant="error" size="lg">
                      Desbalanceado - Diferencia: {formatCurrency(difference)}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
                isLoading={createJournalEntry.isPending}
              >
                Crear Asiento
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageSection>
    </PageWrapper>
  );
}
