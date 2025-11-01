/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

import { TModulesTypes } from "./modules";
import { TUnitType } from "./units";

export type TProjectPhase =
  | "preliminary_study"
  | "not_defined"
  | "basic_project"
  | "executive_project"
  | "released_for_construction";

export type TConsumption = {
  type?: TModulesTypes;
  co2_max: number;
  co2_min: number;
  energy_max: number;
  energy_min: number;
};

export type TConsumptionPerModule = {
  [key in TModulesTypes | "total"]: TConsumption;
};

export type TProjectUnit = {
  name: string;
  id: string;
  type: TUnitType;
  consumptions?: TConsumptionPerModule;
  area: number;
};

export interface IProject {
  [x: string]:
    | string
    | TProjectUnit[]
    | TProjectPhase
    | number
    | TConsumptionPerModule
    | undefined;
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  phase: TProjectPhase;
  description: string;
  units: TProjectUnit[];
  consumption?: TConsumptionPerModule;
  area: number;
  user_id: number;
}

export type TProjectsTemp = {
  [key: string]: TProjectUnit[];
};

export type TProjectUnitModule = {
  [key: string]: TModuleData[];
};

export type TModuleData = {
  nome: string;
  tipoDeEstrutura: "beamColumn" | "concreteWall" | "masonry";
  data: string;
  numeroDeTorres: number;
  pavimentosSemFundacao: number;
  pavimentosTotalDaTorre: number;
  pavimentosDoEmbasamento: number;
  numeroDeSubsolos: number;
  pavimentosTipo: number;
  areaConstruidaTotal: number;
  alturaPisoAPisoTipo: number;
  maiorPisoAPisoExistente: number;
  espessuraDeParedes: number;
  espessuraDeLajes: number;
  volumeDeConcretoFck20: number;
  volumeDeConcretoFck25: number;
  volumeDeConcretoFck30: number;
  volumeDeConcretoFck35: number;
  volumeDeConcretoFck40: number;
  volumeDeConcretoFck45: number;
  consumoDeAco: number;
  consumoDeConcreto: number;
  emissaoDeCo2: number;
  energia: number;
  version: string;
  module_uuid: string;
  created_at: string;
};

export type TModuleSimulations = {
  [key: string]: TSimulation[];
};

// export type TSimulation = {
//   name: "beamColumn" | "concreteWall" | "masonry";
//   version: string;
//   created_at: string;
//   updated_at: string;
//   data: {
//     green: DataPoint;
//     grey: DataPoint;
//   };
//   isValid: boolean;
//   isGlobal?: boolean; // Indica se a simulação é global
// };

type ConcreteSlab = {
  // Defina as propriedades reais de cada slab aqui
  // Exemplo:
  id: number;
  thickness: number;
  area: number;
};

type ConcreteWall = {
  // Defina as propriedades reais de cada wall aqui
  // Exemplo:
  id: number;
  length: number;
  height: number;
};

export type TSimulation = {
  co2_max: number;
  co2_min: number;
  concrete_slabs: ConcreteSlab[];
  concrete_walls: ConcreteWall[];
  energy_max: number;
  energy_min: number;
  floor_area: number;
  floor_height: number;
  floor_repetition: number;
  form_area: number;
  in_use: boolean;
  name: string;
  slab_thickness: number;
  steel_ca50: number;
  steel_ca60: number;
  type: TModulesTypes;
  version: number;
  wall_area: number;
  wall_thickness: number;
};
