import { getProjectByUUID } from '@/actions/projects/getProject';
import { DrawerAddModule, ModuleTable } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { getFromStorage, setToStorage } from '@/lib/storage';
import { TModuleData, TProjectUnitModule } from '@/types/projects';
import { AddModuleFormSchema } from '@/validators/addModule.validator';
// import { Unit } from '@/types/units'
// import { mockUnits } from '@/utils/mockUnits'
import { createFileRoute, useLoaderData, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const UNIT_MODULES = '@unit/modules'

export const Route = createFileRoute('/_private/projects/$projectId/$unitId/')({
  component: RouteComponent,
  loader: async ({ params }) => {
    const { unitId, projectId } = params as { unitId: string; projectId: string }

    if (!projectId) {
      throw new Error('Project ID is required')
    }
    const { data } = await getProjectByUUID(projectId)
    const project = data.projects

    const units = getFromStorage(`${UNIT_MODULES}/${projectId}`, {} as TProjectUnitModule)
    return {
      modules: units[unitId] ? units[unitId] : [],
      project
    }
  }
})

function RouteComponent() {
  const { t } = useTranslation()
  const { projectId, unitId } = useParams({
    from: '/_private/projects/$projectId/$unitId/'
  })

  const { modules } = useLoaderData({
    from: '/_private/projects/$projectId/$unitId/'
  })

  const [mods, setMods] = useState(modules)

  useEffect(() => {
    document.title = 'BIP / Tecnologia Construtiva'
  }, [])

  useEffect(() => {
    setMods(modules)
  }, [modules])

  const handleAddNewModule = (data: AddModuleFormSchema) => {
    if (mods.find((el) => el.tipoDeEstrutura === data.tipoDeEstrutura)) {
      toast.error('Esse tipo de estrutura ja existe na unidade')
      return
    }
    const formatData = {
      ...data,
      // data: typeof data.data === 'string' ? data.data : data.data instanceof Date ? data.data.toISOString() : '',
      module_uuid: String(mods.length + 1),
      version: '1'
    } as TModuleData

    const units = getFromStorage(`${UNIT_MODULES}/${projectId}`, {} as TProjectUnitModule)
    setMods((prev) => {
      const newMods = [...prev, formatData]
      setToStorage(`${UNIT_MODULES}/${projectId}`, {
        ...units,
        [unitId]: newMods
      })
      return newMods
    })
  }

  const handleUpdateModule = (module: TModuleData) => {
    const units = getFromStorage(`${UNIT_MODULES}/${projectId}`, {} as TProjectUnitModule)
    setMods((prev) => {
      const newMods = prev.map((mod) => (mod.module_uuid === module.module_uuid ? module : mod))
      setToStorage(`${UNIT_MODULES}/${projectId}`, {
        ...units,
        [unitId]: newMods
      })
      return newMods
    })
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-end gap-4'>
        <DrawerAddModule
          callback={handleAddNewModule}
          componentTrigger={
            <Button variant='noStyles' className='flex items-center gap-2'>
              {t('drawerAddModule.addConstructiveTechnology')}
            </Button>
          }
        />
      </div>
      <ModuleTable
        key={`${JSON.stringify(mods)}`}
        modules={mods}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
      />
    </div>
  )
}
