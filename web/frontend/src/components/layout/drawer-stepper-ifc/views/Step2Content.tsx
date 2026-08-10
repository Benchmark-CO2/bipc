import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Step2ModulesView } from "./Step2ModulesView";
import { Translations } from "@/i18n/translations/pt-BR";
import { TIfcStepperState, TIfcStepperModuleItem } from "@/types/ifc";

export interface Step2ContentProps {
  translations: Translations;
  state: TIfcStepperState;
  applyUnitToAllModules: (unitTempId: string) => void;
  setModuleBoundUnit: (moduleTempId: string, unitTempId: string) => void;
  onEditModule: (tempId: string) => void;
  toggleModuleSelected: (tempId: string) => void;
  toggleAllModulesSelected: (checked: boolean) => void;
  moduleTypeLabels: Record<string, string>;
  step2Error: string;
  isSimulationMode: boolean;
  activeStep: number;
  selectedModulesWithBlocking: TIfcStepperModuleItem[];
  countBlockingErrors: number;
  countBlockingWarnings: number;
  countBlockingNoBinding: number;
}

export function Step2Content({
  state,
  applyUnitToAllModules,
  setModuleBoundUnit,
  onEditModule,
  toggleModuleSelected,
  toggleAllModulesSelected,
  moduleTypeLabels,
  step2Error,
  isSimulationMode,
  activeStep,
  selectedModulesWithBlocking,
  countBlockingErrors,
  countBlockingWarnings,
  countBlockingNoBinding,
}: Step2ContentProps) {
  return (
    <>
      {activeStep === (isSimulationMode ? 0 : 1) &&
      selectedModulesWithBlocking.length > 0 ? (
        <Alert
          variant="destructive"
          className="mb-2 mt-1 py-2 px-3 flex-row items-start gap-2 border-red-300 dark:border-red-700 bg-red-50/70 dark:bg-red-950/25"
        >
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-1 flex-col gap-1.5 min-w-0">
            <AlertTitle className="text-sm text-red-800 dark:text-red-200 font-semibold leading-snug">
              {selectedModulesWithBlocking.length} módulo
              {selectedModulesWithBlocking.length === 1 ? "" : "s"} selecionado
              {selectedModulesWithBlocking.length === 1 ? "" : "s"} com problema
              — concluir bloqueado
            </AlertTitle>
            <AlertDescription className="text-[11.5px] text-red-700 dark:text-red-300 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span>
                Corrija os campos obrigatórios / recomendados do módulo, vincule
                a uma unidade ou <strong>desmarque</strong> os bloqueados abaixo
                para prosseguir.
              </span>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {countBlockingErrors > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 h-5 text-[10.5px] px-1.5 py-0"
                  >
                    {countBlockingErrors} com erros
                  </Badge>
                ) : null}
                {countBlockingWarnings > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 h-5 text-[10.5px] px-1.5 py-0"
                  >
                    {countBlockingWarnings} com avisos
                  </Badge>
                ) : null}
                {countBlockingNoBinding > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 h-5 text-[10.5px] px-1.5 py-0"
                  >
                    {countBlockingNoBinding} sem unidade
                  </Badge>
                ) : null}
              </div>
            </AlertDescription>
          </div>
        </Alert>
      ) : null}
      {activeStep === (isSimulationMode ? 0 : 1) && (
        <Step2ModulesView
          state={state}
          applyUnitToAllModules={applyUnitToAllModules}
          setModuleBoundUnit={setModuleBoundUnit}
          onEditModule={onEditModule}
          toggleModuleSelected={toggleModuleSelected}
          toggleAllModulesSelected={toggleAllModulesSelected}
          moduleTypeLabels={moduleTypeLabels}
        />
      )}

      {step2Error && activeStep === (isSimulationMode ? 0 : 1) && (
        <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-700 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 dark:text-red-200">
              {step2Error}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
