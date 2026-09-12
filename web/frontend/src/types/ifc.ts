import type { TModulesTypes } from "@/types/modules";
import type { Translations } from "@/i18n/translations/pt-BR";
import type { QueryClient } from "@tanstack/react-query";
import type { TOption } from "@/types/options";
import type { IUnit, TTowerFloorCategory } from "@/types/units";
import type { TModuleGroupedForm } from "@/components/layout/drawer-form-module/aggregate-helpers";
import type { IFCAccessMode } from "@/components/layout/drawer-ifc-import";
import type { CompletionPositionWarning } from "@/utils/moduleCompletion";

export type TIfcProcessorImportStatus =
  | "waiting_for_files"
  | "processing"
  | "failed"
  | "completed";

export type TIfcFloorCategory = NonNullable<TTowerFloorCategory["category"]>;

export interface TIfcProcessorFallbackVersion {
  manufacturer: string;
  version: string;
}

export interface TIfcProcessorFallbacksResponse {
  version_list: TIfcProcessorFallbackVersion[];
}

export interface TIfcProcessorCreateFallbackResponse {
  fallback_url: string;
}

export interface TIfcProcessorCreateRequestResponse {
  request_id: string;
  ifc_url: string;
}

export interface TIfcProcessorRequestListItem {
  request_id: string;
  file_name: string;
  file_hash: string;
  status: TIfcProcessorImportStatus;
  ts_created: number;
  ts_process_begin: string | null;
  ts_process_end: string | null;
  ts_finished: string | null;
  error_message: string | null;
  error_type: string | null;
  fallback_id: string | null;
  calculate_geometries: boolean;
  client_id: string;
  is_visible: boolean;
}

export interface TIfcProcessorRequestsResponse {
  items: TIfcProcessorRequestListItem[];
}

export interface TIfcProcessorResultUnitFloor {
  category?: TIfcFloorCategory;
  floor_group?: string;
  index?: number | string;
  [key: string]: unknown;
}

export interface TIfcProcessorResultUnits {
  name: string;
  type: string;
  data: {
    floors?: TIfcProcessorResultUnitFloor[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TIfcProcessorResultModuleItem {
  type: TModulesTypes | string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TIfcProcessorResultModules {
  modules: TIfcProcessorResultModuleItem[];
  [key: string]: unknown;
}

export interface TIfcProcessorAggregatedResult {
  units: TIfcProcessorResultUnits;
  modules: TIfcProcessorResultModuleItem[];
}

// ---------------------------------------------------------------------------
// Tipos internos do Stepper (UI + Estado local)
// ---------------------------------------------------------------------------

export type TIfcStepperUnitItem = {
  tempId: string;
  selected: boolean;
  raw: TIfcProcessorResultUnits;
  name: string;
  simulationName: string;
  formData: {
    name: string;
    type: "tower";
    repetition_count?: number;
    housing_units_count?: number;
    data: {
      floors: Array<{
        id?: string;
        floor_group: string;
        area: string;
        height: string;
        category: TIfcFloorCategory;
        index: number;
        repetition?: number;
      }>;
    };
  };
  validationErrors: string[];
  isValid: boolean;
};

export type TIfcStepperCreatedUnit = {
  tempId: string;
  unitId: string;
  optionId: string;
  roleId: string;
  name: string;
  unitName: string;
  displayName: string;
  needsUpdate?: boolean;
};

export type TIfcStepperModuleItem = {
  tempId: string;
  raw: TIfcProcessorResultModuleItem;
  type: TModulesTypes | string;
  summary: string;
  selected: boolean;
  boundUnitTempId: string | null;
  boundUnitId: string | null;
  boundOptionId: string | null;
  validationErrors: string[];
  completenessWarnings: {
    hasWarnings: boolean;
    messages: string[];
  };
  positionWarnings: CompletionPositionWarning[];
  isValid: boolean;
  completed?: boolean;
};

export type TIfcStepperStepId = "units" | "modules";

export type TIfcStepperState = {
  currentStep: TIfcStepperStepId;
  units: TIfcStepperUnitItem[];
  unitsCreated: TIfcStepperCreatedUnit[];
  modules: TIfcStepperModuleItem[];
};

// ---------------------------------------------------------------------------
// Tipos adicionais usados em DrawerStepperIFC (requests, views, props)
// ---------------------------------------------------------------------------

export type TIfcProcessorStateUnit = IUnit;

export interface IRawModuleDataWithMeta {
  floor_index?: number | number[];
  floor_ids?: string[];
  unit_id?: string;
  [k: string]: unknown;
}

export interface IOptionsResponse {
  options: TOption[];
}

export interface IPatchUnitResponse {
  unit?: TIfcProcessorStateUnit;
  data?: { unit?: TIfcProcessorStateUnit };
}

export interface IPostUnitResponse {
  unit?: TIfcProcessorStateUnit;
  data?: { unit?: TIfcProcessorStateUnit };
}

export interface IPostOptionResponse {
  option?: TOption;
  tower_option?: TOption;
  data?: {
    option?: TOption;
    tower_option?: TOption;
  };
}

export interface IGetUnitByUUIDCachedResponse {
  data?: { unit?: { floors?: TTowerFloorCategory[] } };
}

export interface TFloorMismatchError {
  importedUnitName: string;
  importedFloorsCount: number;
  contextUnitName: string | null;
  contextFloorsCount: number | null;
}

export type TEditingModuleMerged = TModuleGroupedForm & IRawModuleDataWithMeta;

export interface IModuleBatchBinding {
  unit_id?: string;
  floor_ids?: string[];
}

export interface Step1UnitsViewProps {
  state: TIfcStepperState;
  setUnitNameInline: (tempId: string, name: string) => void;
  setUnitSimulationNameInline: (tempId: string, simulationName: string) => void;
  onEditUnit: (tempId: string) => void;
}

export interface Step1ContentProps {
  translations: Translations;
  state: TIfcStepperState;
  setUnitNameInline: (tempId: string, name: string) => void;
  setUnitSimulationNameInline: (tempId: string, simulationName: string) => void;
  onEditUnit: (tempId: string) => void;
  step1Error: string;
  isSimulationMode: boolean;
  activeStep: number;
}

export interface Step2ModulesViewProps {
  state: TIfcStepperState;
  setModuleBoundUnit: (moduleTempId: string, unitTempId: string) => void;
  onEditModule: (tempId: string) => void;
  toggleModuleSelected: (tempId: string) => void;
  toggleAllModulesSelected: (checked: boolean) => void;
  moduleTypeLabels: Record<string, string>;
}

export interface Step2ContentProps {
  translations: Translations;
  state: TIfcStepperState;
  setModuleBoundUnit: (moduleTempId: string, unitTempId: string) => void;
  onEditModule: (tempId: string) => void;
  toggleModuleSelected: (tempId: string) => void;
  toggleAllModulesSelected: (checked: boolean) => void;
  moduleTypeLabels: Record<string, string>;
  step2Error: string;
  isSimulationMode: boolean;
  activeStep: number;
}

export interface StepperHeaderProps {
  isSimulationMode: boolean;
  fileName?: string | null;
  translations: Translations;
  activeStep: number;
  steps: Array<{ id: string; label: string; description: string }>;
  selectedSimulationOptionId: string | null;
  availableOptions: TOption[];
  setSelectedSimulationOptionId: (id: string | null) => void;
  preselectedUnitId?: string;
  initialRoleId?: string;
  projectId: string;
  refetchOptions: () => Promise<unknown>;
  queryClient: QueryClient;
  state: TIfcStepperState;
  applyUnitToAllModules: (unitTempId: string) => void;
}

export interface DrawerStepperIFCProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initialResult: TIfcProcessorAggregatedResult;
  initialRoleId: string;
  mode: IFCAccessMode;
  preselectedUnitId?: string;
  preselectedOptionId?: string;
  fileName?: string | null;
  onComplete?: () => void;
}
