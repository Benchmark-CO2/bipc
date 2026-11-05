export type TUnknownModuleCategory = "fundação" | "estrutura" | "vedações";

export interface TUnknownModuleMaterial {
  name: string;
  unit: string;
  quantity: number;
}

export interface TUnknownModule {
  id: string;
  user_id: string;
  category: TUnknownModuleCategory;
  name: string;
  description?: string;
  references?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface TUnknownModuleOccurrence {
  id: string;
  option_id: string;
  unknown_module_id: string;
  user_id: string;
  materials: TUnknownModuleMaterial[];
  created_at?: string;
  updated_at?: string;
  unknown_module?: TUnknownModule;
}

export interface CreateUnknownModulePayload {
  category: TUnknownModuleCategory;
  name: string;
  description?: string;
  references?: string[];
  materials: TUnknownModuleMaterial[];
}

export interface ApplyUnknownModulePayload {
  unknown_module_id: string;
  materials: TUnknownModuleMaterial[];
}

export type UnknownModuleSubmitPayload =
  | CreateUnknownModulePayload
  | ApplyUnknownModulePayload;

export interface CreateUnknownModuleResponse {
  unknown_module: TUnknownModule;
  occurrence: TUnknownModuleOccurrence;
}