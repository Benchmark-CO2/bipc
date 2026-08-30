import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Edit2, Info } from "lucide-react";
import { Step2ModulesViewProps } from "@/types/ifc";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

export function Step2ModulesView({
  state,
  setModuleBoundUnit,
  onEditModule,
  toggleModuleSelected,
  toggleAllModulesSelected,
  moduleTypeLabels,
}: Step2ModulesViewProps) {
  const { t } = useTranslation();
  const allChecked =
    state.modules.length > 0 && state.modules.every((m) => m.selected);
  const someChecked = state.modules.some((m) => m.selected) && !allChecked;
  const selectedCount = state.modules.filter((m) => m.selected).length;
  const unselectedCount = state.modules.length - selectedCount;
  const totalCount = state.modules.length;

  return (
    <div className="space-y-2">
      {/* LINHA 1: Alert informativo (módulos não obrigatórios) — compacto inline */}
      <Alert
        variant="default"
        className="py-1.5 px-2.5 flex-row items-center gap-2 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
      >
        <Info className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300 shrink-0 -mt-0.5" />
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[11.5px] leading-snug text-blue-800 dark:text-blue-200">
            {t.stepper.modules.hint}
          </p>
        </div>
      </Alert>

      {/* LINHA 2: Título "Módulos encontrados" + BADGES COUNTS (Sel/Desm/Total) AQUI (unificado) */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-sm font-semibold text-foreground">
          {t.stepper.modules.title}
          <span className="text-muted-foreground font-normal ml-1.5">
            ({state.modules.length})
          </span>
        </h3>
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="secondary"
              className="h-6 text-[12px] px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
            >
              {t.stepper.selected}{" "}
              <strong className="ml-1">{selectedCount}</strong>
            </Badge>
            {unselectedCount > 0 && (
              <Badge
                variant="secondary"
                className="h-6 text-[12px] px-2 py-0 bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/60 dark:text-gray-300 dark:border-gray-700"
              >
                {t.stepper.unselected}{" "}
                <strong className="ml-1">{unselectedCount}</strong>
              </Badge>
            )}
            <Badge variant="outline" className="h-6 text-[12px] px-2 py-0">
              {t.stepper.total} <strong className="ml-1">{totalCount}</strong>
            </Badge>
          </div>
        )}
      </div>

      {/* Tabela de módulos (contém o checkbox de "selecionar todos" no header da tabela) */}
      <div>
        {state.modules.length === 0 ? (
          <div className="text-sm text-muted-foreground p-6 border rounded-lg text-center">
            {t.stepper.modules.noneFound}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[52px]">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v: boolean | "indeterminate") =>
                      toggleAllModulesSelected(Boolean(v))
                    }
                    aria-label="Selecionar todos os módulos"
                    className={
                      someChecked ? "data-[state=checked]:bg-white" : ""
                    }
                    {...(someChecked
                      ? ({ "data-state": "indeterminate" } as Record<
                          string,
                          string
                        >)
                      : {})}
                  />
                </TableHead>
                <TableHead>{t.stepper.modules.columnType}</TableHead>
                <TableHead className="w-[160px]">
                  {t.stepper.modules.columnStatus}
                </TableHead>
                <TableHead>{t.stepper.modules.columnSummary}</TableHead>
                <TableHead className="w-[120px] text-right">
                  {t.stepper.modules.columnAction}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.modules.map((m) => {
                return (
                  <TableRow key={m.tempId}>
                    <TableCell>
                      <Checkbox
                        checked={m.selected}
                        onCheckedChange={() => toggleModuleSelected(m.tempId)}
                        aria-label={`Selecionar módulo ${m.tempId}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center w-full gap-2">
                        <span className="font-medium">
                          {moduleTypeLabels[m.type] ?? String(m.type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1 inline-flex",
                          m.completed
                            ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                            : "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300",
                        )}
                      >
                        {m.completed ? (
                          <>
                            <CheckCircle2 size={12} />
                            {t.modules.badges.completed}
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} />
                            {t.modules.badges.incomplete}
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {m.summary}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditModule(m.tempId)}
                        className="gap-1"
                        title={
                          !m.boundUnitTempId
                            ? t.stepper.modules.editBtnDisabled
                            : undefined
                        }
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        {t.stepper.btnEdit}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
