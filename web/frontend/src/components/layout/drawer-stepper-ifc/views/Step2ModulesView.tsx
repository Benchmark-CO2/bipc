import React from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit2, Info } from "lucide-react";
import { Step2ModulesViewProps } from "@/types/ifc";
import { useTranslation } from "@/i18n";

export function Step2ModulesView({
  state,
  applyUnitToAllModules,
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
      {/* LINHA 1: Unidades criadas + "Aplicar a todos" (linha única, counts removidos daqui) */}
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
          {t.stepper.modules.createdUnitsTitle}
        </h3>
        {state.unitsCreated.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {t.stepper.modules.noUnitsCreated}
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {state.unitsCreated.map((u) => (
              <div key={u.tempId} className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs px-2 py-0.5 h-6">
                  {u.displayName}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => applyUnitToAllModules(u.tempId)}
                  title={t.stepper.modules.applyToAll}
                >
                  {t.stepper.modules.applyToAll}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LINHA 2: Alert informativo (módulos não obrigatórios) — compacto inline */}
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

      {/* LINHA 3: Título "Módulos encontrados" + BADGES COUNTS (Sel/Desm/Total) AQUI (unificado) */}
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
              className="h-6 text-[11px] px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
            >
              {t.stepper.selected} <strong>{selectedCount}</strong>
            </Badge>
            {unselectedCount > 0 && (
              <Badge
                variant="secondary"
                className="h-6 text-[11px] px-2 py-0 bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/60 dark:text-gray-300 dark:border-gray-700"
              >
                {t.stepper.unselected} <strong>{unselectedCount}</strong>
              </Badge>
            )}
            <Badge variant="outline" className="h-6 text-[11px] px-2 py-0">
              {t.stepper.total} <strong>{totalCount}</strong>
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
          <TooltipProvider delayDuration={150}>
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
                  <TableHead>{t.stepper.modules.columnSummary}</TableHead>
                  <TableHead>{t.stepper.modules.columnUnit}</TableHead>
                  <TableHead>{t.stepper.modules.columnStatus}</TableHead>
                  <TableHead className="w-[120px] text-right">
                    {t.stepper.modules.columnAction}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.modules.map((m) => {
                  const hasErrors = !m.isValid && m.validationErrors.length > 0;
                  const hasWarnings =
                    m.isValid && m.completenessWarnings?.hasWarnings;
                  const warningCount =
                    m.completenessWarnings?.messages?.length ?? 0;
                  const errorCount = m.validationErrors.length;

                  let statusBadge: React.ReactNode;
                  if (hasErrors) {
                    statusBadge = (
                      <Badge variant="destructive">
                        {errorCount}{" "}
                        {errorCount === 1
                          ? t.stepper.units.errors
                          : t.stepper.units.errorsPlural}
                      </Badge>
                    );
                  } else if (hasWarnings) {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-700"
                      >
                        {warningCount}{" "}
                        {warningCount === 1
                          ? t.stepper.statusWarnings
                          : `${t.stepper.statusWarnings}`}
                      </Badge>
                    );
                  } else {
                    statusBadge = (
                      <Badge variant="success">{t.stepper.statusValid}</Badge>
                    );
                  }

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
                        <span className="font-medium">
                          {moduleTypeLabels[m.type] ?? String(m.type)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {m.summary}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        {state.unitsCreated.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {t.stepper.modules.noUnitsCreated}
                          </span>
                        ) : (
                          <Select
                            value={m.boundUnitTempId ?? "__none__"}
                            onValueChange={(val: string) =>
                              setModuleBoundUnit(m.tempId, val)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  t.stepper.modules.unitSelectPlaceholder
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-muted-foreground">
                                  {t.stepper.modules.noneBound}
                                </span>
                              </SelectItem>
                              {state.unitsCreated.map((u) => (
                                <SelectItem key={u.tempId} value={u.tempId}>
                                  {u.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {!hasErrors && !hasWarnings ? (
                          statusBadge
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>{statusBadge}</span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              align="start"
                              className="max-w-sm text-xs space-y-3 p-3"
                            >
                              {hasErrors && (
                                <div className="space-y-1">
                                  <p className="font-semibold text-red-600 dark:text-red-300">
                                    {t.stepper.validationErrors}:
                                  </p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {m.validationErrors
                                      .slice(0, 10)
                                      .map((e, idx) => (
                                        <li key={idx}>{e}</li>
                                      ))}
                                    {m.validationErrors.length > 10 && (
                                      <li className="text-muted-foreground">
                                        +{m.validationErrors.length - 10}{" "}
                                        {t.stepper.others}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              {hasWarnings && (
                                <div className="space-y-1">
                                  <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                                    {t.stepper.semanticWarnings}:
                                  </p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {(m.completenessWarnings.messages ?? [])
                                      .slice(0, 10)
                                      .map((msg, idx) => (
                                        <li key={idx}>{msg}</li>
                                      ))}
                                    {(m.completenessWarnings.messages ?? [])
                                      .length > 10 && (
                                      <li className="text-muted-foreground">
                                        +
                                        {(m.completenessWarnings.messages ?? [])
                                          .length - 10}{" "}
                                        {t.stepper.others}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
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
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
