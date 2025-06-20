
export interface IModule {
  module_uuid: string
  name: string
  version: string
  updated_at: string
  created_at: string
  status: 'in progress' | 'completed' | 'not started'
  consume_kg: number
  consume_kgco2: number
  consume_mj: number
}

