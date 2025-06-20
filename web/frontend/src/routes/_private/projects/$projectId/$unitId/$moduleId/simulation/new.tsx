import Chart from '@/components/charts'
import { Button } from '@/components/ui/button'
import CustomBanner from '@/components/ui/customBanner'
import Divider from '@/components/ui/divider'
import { mockSimulation } from '@/utils/mockSimulation'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_private/projects/$projectId/$unitId/$moduleId/simulation/new',
)({
  component: RouteComponent,
  loader: () => {
    return {
      crumb: 'Criar Simulação',
    }
  }
})

function RouteComponent() {
  const { projectId, unitId, moduleId } = Route.useParams()
  const navigate = Route.useNavigate()
  const handleCreateSimulation = () => {
    if (!projectId || !unitId || !moduleId) {
      return
    }
    mockSimulation.push(
      {
        simulation_id:( mockSimulation.length + 1).toString(),
        name: 'Simulação ' + (mockSimulation.length + 1),
        version: (mockSimulation.length + 1) + '.0',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        project_id: projectId as string,
        unit_id: unitId as string,
        module_id: moduleId as string
      }
    )
    void navigate({
      to: `/projects/${projectId}/${unitId}/${moduleId}/`,
    })
  }
  return (
    <div>
    <CustomBanner
      title="Criar Simulação"
      description={`Criação de uma nova simulação`}
      image=""
    />
    <div className="w-full flex gap-4 h-full py-6">
      <div>
        <Chart maxHeight={500} maxWidth={800} filledPoints={mockSimulation.length + 1} />
      </div>
      <div className="flex flex-col gap-4 w-full">
        <div className="h-1/2 w-full flex flex-col">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <div className="pl-2 w-full">
            <p>Intervalo:</p>
          </div>
          <Button className="mt-auto ml-auto" variant={'noStyles'}>
            Aplicar Filtros
          </Button>
        </div>
        <Divider />
        <div className="h-1/2">
          <h2 className="text-lg font-semibold">Detalhes</h2>
          <div className="pl-2">
            <p>Outras informações relevantes podem ser adicionadas aqui.</p>
          </div>
        </div>
      </div>
    </div>
    <div className='w-full flex justify-end items-center'>
      <Button className="mt-4 ml-auto" variant={'noStyles'} onClick={handleCreateSimulation}>
        Criar Simulação
      </Button>
    </div>
  </div>
  )
}

