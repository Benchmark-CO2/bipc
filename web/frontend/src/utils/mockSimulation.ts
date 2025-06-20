import { ISimulation } from '@/types/simulations'

export const mockSimulation: ISimulation[] = [
  {
    simulation_id: '1',
    name: 'Simulação 1',
    version: '2.0',
    updated_at: '2023-10-01T12:00:00Z',
    created_at: '2023-09-01T12:00:00Z',
    project_id: '1',
    unit_id: '1',
    module_id: '1'
  },
  {
    simulation_id: '2',
    name: 'Simulação 2',
    version: '1.0',
    updated_at: '2023-10-02T12:00:00Z',
    created_at: '2023-09-02T12:00:00Z',
    project_id: '2',
    unit_id: '2',
    module_id: '2'
  }
]
