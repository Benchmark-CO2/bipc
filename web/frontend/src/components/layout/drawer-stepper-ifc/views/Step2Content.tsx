import { AlertTriangle } from "lucide-react";
import { Step2ModulesView } from "./Step2ModulesView";
import { Step2ContentProps } from "@/types/ifc";

export function Step2Content({
  translations: _translations,
  state,
  setModuleBoundUnit,
  onEditModule,
  toggleModuleSelected,
  toggleAllModulesSelected,
  moduleTypeLabels,
  step2Error,
  isSimulationMode,
  activeStep,
}: Step2ContentProps) {
  return (
    <>
      {activeStep === (isSimulationMode ? 0 : 1) && (
        <Step2ModulesView
          state={state}
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
