import type { TModulesTypes } from "@/types/modules";
import type { TTowerFloorCategory } from "@/types/units";

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
  isValid: boolean;
};

export type TIfcStepperStepId = "units" | "modules";

export type TIfcStepperState = {
  currentStep: TIfcStepperStepId;
  units: TIfcStepperUnitItem[];
  unitsCreated: TIfcStepperCreatedUnit[];
  modules: TIfcStepperModuleItem[];
};
