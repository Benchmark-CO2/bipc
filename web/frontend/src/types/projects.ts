/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

import { DataPoint } from '@/components/charts/mock';

export type TProjectPhase = 'preliminaryStudy' | 'draft' | 'basicProject' | 'executiveProject' | 'releasedForConstruction';

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export interface IProject {
  uuid: string
  name: string
  description: string
  state: string
  city: string
  cep: string
  neighborhood: string
  street: string
  number: string
  users_len?: number
  project_phase: TProjectPhase
  users: number
  created_at: string
  updated_at: string
  owner_uuid: string
  background_image: string
}

export type TProjectsTemp = {
  [key: string]: TProjectUnit[]
}

export type TProjectUnit = {
  name: string
  id: string
}

export type TProjectUnitModule = {
  [key: string]: TModuleData[]
}

export type TModuleData = {
  tipoDeEstrutura: 'beamColumn' | 'concreteWall' | 'masonry'
  tipoDeEdificacao: 'residential' | 'mixed' | 'corporate'
  data: string
  numeroDeTorres: number
  pavimentosSemFundacao: number
  pavimentosTotalDaTorre: number
  pavimentosDoEmbasamento: number
  numeroDeSubsolos: number
  pavimentosTipo: number
  areaConstruidaTotal: number
  alturaPisoAPisoTipo: number
  maiorPisoAPisoExistente: number
  espessuraDeParedes: number
  espessuraDeLajes: number
  volumeDeConcretoFck20: number
  volumeDeConcretoFck25: number
  volumeDeConcretoFck30: number
  volumeDeConcretoFck35: number
  volumeDeConcretoFck40: number
  volumeDeConcretoFck45: number
  consumoDeAco: number
  version: string
  module_uuid: string
  created_at: string
}

export type TModuleSimulations = {
  [key: string]: TSimulation[]
}

export type TSimulation = {
  name: 'beamColumn' | 'concreteWall' | 'masonry'
  version: string
  created_at: string
  updated_at: string
  data: {
    green: DataPoint,
    grey: DataPoint,
  }
  isValid: boolean
}
