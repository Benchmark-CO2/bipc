import { Unit } from '@/types/units'

export const mockUnits: Unit[] = [
  {
    id: '1',
    title: 'Unidade 1',
    modules: [
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
      }
    ]
  },
  {
    id: '2',
    title: 'Unidade 2',
    modules: [
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
      },
      {
        module_uuid: '5',
        name: 'Contrapisos',
        version: '1.0.4',
        updated_at: '2023-10-05',
        created_at: '2023-09-05',
        status: 'completed',
        consume_kg: 500,
        consume_kgco2: 250,
        consume_mj: 1000
      },
      {
        module_uuid: '6',
        name: 'Coberturas',
        version: '1.0.5',
        updated_at: '2023-10-06',
        created_at: '2023-09-06',
        status: 'not started',
        consume_kg: 600,
        consume_kgco2: 300,
        consume_mj: 1200
      }
    ]
  },
  {
    id: '3',
    title: 'Unidade 3',
    modules: [
      {
        module_uuid: '7',
        name: 'Pavimentação',
        version: '1.0.6',
        updated_at: '2023-10-07',
        created_at: '2023-09-07',
        status: 'in progress',
        consume_kg: 700,
        consume_kgco2: 350,
        consume_mj: 1400
      }
    ]
  }
]
