/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

import { DataPoint } from "@/components/charts/mock";
import { TUnitType } from "./units";

export type TProjectPhase =
  | "preliminary_study"
  | "not_defined"
  | "basic_project"
  | "executive_project"
  | "released_for_construction";

export interface IProject {
  id: string;
  name: string;
  description: string;
  state: string;
  city: string;
  cep: string;
  neighborhood: string;
  street: string;
  number: string;
  phase: TProjectPhase;
  user_id: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  units: TProjectUnit[];
}

export type TProjectsTemp = {
  [key: string]: TProjectUnit[];
};

export type TProjectUnit = {
  name: number;
  id: number;
  type: TUnitType;
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

export type TSimulation = {
  name: "beamColumn" | "concreteWall" | "masonry";
  version: string;
  created_at: string;
  updated_at: string;
  data: {
    green: DataPoint;
    grey: DataPoint;
  };
  isValid: boolean;
  isGlobal?: boolean; // Indica se a simulação é global
};
