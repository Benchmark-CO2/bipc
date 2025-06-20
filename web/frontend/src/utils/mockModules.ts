import { IModule } from '../types/modules'

export const mockModules: IModule[] = [
  {
    module_uuid: '1',
    name: 'Estruturas',
    version: '1.0.0',
    updated_at: '2023-10-01',
    created_at: '2023-09-01',
    status: 'in progress',
    consume_kg: 100,
    consume_kgco2: 50,
    consume_mj: 200
  },
  {
    module_uuid: '2',
    name: 'Fundações',
    version: '1.0.1',
    updated_at: '2023-10-02',
    created_at: '2023-09-02',
    status: 'completed',
    consume_kg: 200,
    consume_kgco2: 100,
    consume_mj: 400
  },
  {
    module_uuid: '3',
    name: 'Vedações',
    version: '1.0.2',
    updated_at: '2023-10-03',
    created_at: '2023-09-03',
    status: 'not started',
    consume_kg: 300,
    consume_kgco2: 150,
    consume_mj: 600
  },
  {
    module_uuid: '4',
    name: 'Revestimentos',
    version: '1.0.3',
    updated_at: '2023-10-04',
    created_at: '2023-09-04',
    status: 'in progress',
    consume_kg: 400,
    consume_kgco2: 200,
    consume_mj: 800
  }
]
