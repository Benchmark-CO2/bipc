import { createFileRoute, Outlet } from '@tanstack/react-router';
import { t } from 'i18next';

export const Route = createFileRoute('/_private/projects')({
  component: RouteComponent,
  loader: () => ({
    crumb: t('common.crumbs.projects'),
  })
})

function RouteComponent() {
  return <Outlet />
}
