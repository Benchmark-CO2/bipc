import Summary from '@/components/ui/summary';
import { ProjectContext } from '@/context/projectContext';

import { createFileRoute, Outlet } from '@tanstack/react-router';
import { t } from 'i18next';
import { useContext, useEffect } from 'react';

export const Route = createFileRoute('/_private/new_projects')({
  component: RouteComponent,
  loader: ({ context }) => {
    return {
      crumb: t('common.crumbs.projects'),
    }
  }
})

function RouteComponent() {
  const { setType } = useContext(ProjectContext)!;
  useEffect(() => {
    setType('projects');
  }, [])
  return (
    <>
      <Outlet />
      <Summary />
    </>
  )
}
