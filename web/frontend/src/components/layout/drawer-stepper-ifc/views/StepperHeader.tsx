import React from "react";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui/stepper";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogCreateSimulation } from "@/components/layout";
import { StepperHeaderProps } from "@/types/ifc";

export const StepperHeader: React.FC<StepperHeaderProps> = ({
  isSimulationMode,
  fileName,
  translations,
  activeStep,
  steps,
  selectedSimulationOptionId,
  availableOptions,
  setSelectedSimulationOptionId,
  preselectedUnitId,
  initialRoleId,
  projectId,
  refetchOptions,
  queryClient,
  state,
  applyUnitToAllModules: _applyUnitToAllModules,
}) => {
  const t = translations;
  return (
    <>
      <DialogHeader className="px-3 pt-1 pb-2 border-b gap-1.5">
        {/* ROW 1: Título à esquerda / Badge arquivo à direita */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <DialogTitle className="text-lg font-bold text-primary leading-tight">
              {isSimulationMode
                ? translations.stepper.simulation.title
                : translations.stepper.title}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {isSimulationMode
                ? translations.stepper.simulation.description
                : translations.stepper.subtitle}
            </p>
          </div>
          {fileName ? (
            <Badge
              variant="secondary"
              className="text-xs px-2.5 py-1 gap-1.5 max-w-[55%] overflow-hidden text-ellipsis whitespace-nowrap shrink-0 shadow-sm border border-gray-200/70 dark:border-gray-700/70"
              title={fileName}
            >
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {fileName}
              </span>
            </Badge>
          ) : null}
        </div>

        {/* ROW 2: Stepper (sem pt-4 exagerado) */}
        <div className="pt-1.5">
          <Stepper activeStep={activeStep} steps={steps} />
        </div>
      </DialogHeader>

      {/* ROW 3: Sempre exibida (simulação alvo + apply-to-all das unidades criadas) */}
      <div className="px-3 py-2 bg-gray-50/40 dark:bg-gray-900/40 flex flex-col gap-2">
        {/* Bloco superior: Simulação alvo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="text-xs font-semibold text-foreground whitespace-nowrap shrink-0">
            {isSimulationMode
              ? translations.stepper.simulation.selectLabel
              : "Simulação"}
          </label>

          {selectedSimulationOptionId ? (
            <div className="flex flex-1 flex-wrap sm:justify-end items-center gap-2 min-w-0">
              {state.unitsCreated.length > 0 && (
                <>
                  <span className="text-[11px] text-muted-foreground shrink-0 pl-1">
                    {t.stepper.modules.createdUnitsTitle}:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {state.unitsCreated.map((u) => (
                      <div key={u.tempId} className="flex items-center gap-1.5">
                        <Badge
                          variant="success"
                          className="h-7 text-[12px] px-2.5 py-0 gap-1.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                        >
                          {u.displayName}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {isSimulationMode && (
                <>
                  <Select
                    value={selectedSimulationOptionId}
                    onValueChange={(v) => setSelectedSimulationOptionId(v)}
                  >
                    <SelectTrigger
                      className="h-7 min-w-[100px] w-auto text-[11px] px-2.5 py-0"
                      aria-label={
                        translations.stepper.simulation.changeAriaLabel
                      }
                    >
                      <span className="flex items-center justify-between w-full">
                        <span>
                          {translations.stepper.simulation.changeLabel}
                        </span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          <span className="text-sm">{o.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {preselectedUnitId && initialRoleId ? (
                    <DialogCreateSimulation
                      projectId={projectId}
                      unitId={preselectedUnitId}
                      roleId={initialRoleId}
                      triggerComponent={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2 py-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>
                            {translations.stepper.simulation.createNew}
                          </span>
                        </Button>
                      }
                      onCreated={() => {
                        void refetchOptions();
                        void queryClient.invalidateQueries({
                          queryKey: ["options", projectId, preselectedUnitId],
                        });
                      }}
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-wrap sm:justify-end items-center gap-2 min-w-0">
              <Select
                value=""
                disabled={!isSimulationMode}
                onValueChange={(v) => setSelectedSimulationOptionId(v)}
              >
                <SelectTrigger className="min-w-[240px] h-9">
                  <SelectValue
                    placeholder={
                      !isSimulationMode
                        ? "-"
                        : availableOptions.length === 0
                          ? translations.stepper.simulation.noOptions
                          : translations.stepper.simulation.selectPlaceholder
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableOptions.length === 0 && isSimulationMode && (
                    <div className="text-xs px-2 py-3 text-muted-foreground">
                      {translations.stepper.simulation.noOptionsHint}
                    </div>
                  )}
                  {availableOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="text-sm">{o.name}</span>
                      {o.active ? (
                        <span className="ml-2 text-[11px] text-primary font-medium">
                          (ativa)
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSimulationMode && preselectedUnitId && initialRoleId ? (
                <DialogCreateSimulation
                  projectId={projectId}
                  unitId={preselectedUnitId}
                  roleId={initialRoleId}
                  triggerComponent={
                    <Button variant="outline" size="sm" className="h-9">
                      <Plus className="h-3.5 w-3.5" />{" "}
                      <span className="text-xs">
                        {translations.stepper.simulation.createNew}
                      </span>
                    </Button>
                  }
                  onCreated={() => {
                    void refetchOptions();
                    void queryClient.invalidateQueries({
                      queryKey: ["options", projectId, preselectedUnitId],
                    });
                  }}
                />
              ) : null}
              {isSimulationMode && (
                <div className="flex items-start gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug text-yellow-800 dark:text-yellow-200 whitespace-nowrap">
                    {translations.stepper.simulation.requiredHint}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
