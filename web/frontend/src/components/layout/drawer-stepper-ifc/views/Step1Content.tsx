import React from "react";
import { AlertTriangle } from "lucide-react";
import { Translations } from "@/i18n/translations/pt-BR";
import { TIfcStepperState } from "@/types/ifc";
import { Step1UnitsView } from "./Step1UnitsView";

export interface Step1ContentProps {
  translations: Translations;
  state: TIfcStepperState;
  toggleUnitSelected: (tempId: string) => void;
  setUnitNameInline: (tempId: string, name: string) => void;
  onEditUnit: (tempId: string) => void;
  step1Error: string;
  isSimulationMode: boolean;
  activeStep: number;
}

export function Step1Content({
  translations,
  state,
  toggleUnitSelected,
  setUnitNameInline,
  onEditUnit,
  step1Error,
  isSimulationMode,
  activeStep,
}: Step1ContentProps) {
  return (
    <>
      {!isSimulationMode && activeStep === 0 && (
        <Step1UnitsView
          state={state}
          toggleUnitSelected={toggleUnitSelected}
          setUnitNameInline={setUnitNameInline}
          onEditUnit={onEditUnit}
        />
      )}

      {step1Error && !isSimulationMode && activeStep === 0 && (
        <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-700 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 dark:text-red-200">
              {step1Error}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default Step1Content;
