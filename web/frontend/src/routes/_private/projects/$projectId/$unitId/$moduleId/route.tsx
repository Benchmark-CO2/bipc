import { getFromStorage } from '@/lib/storage';
import { TProjectUnitModule } from '@/types/projects';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { t } from 'i18next';

const UNIT_MODULES = '@unit/modules';
export const Route = createFileRoute(
  '/_private/projects/$projectId/$unitId/$moduleId',
)({
  component: RouteComponent,
  loader: ({ params }) => {
    const { moduleId, unitId } = params
    if (!moduleId) {
      throw new Error('Module ID is required')
    }

    const unitModulesFromStorage = getFromStorage(
      `${UNIT_MODULES}/${params.projectId}`,
      {} as TProjectUnitModule,
    )
    const unit = unitModulesFromStorage[unitId]

    const module = unit?.find((module) => module.module_uuid === moduleId)
    return {
      crumb: module?.tipoDeEstrutura ? t(`common.structureType.${module?.tipoDeEstrutura}`) : module?.tipoDeEstrutura,
      module,
    }
  },
})

function RouteComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}
