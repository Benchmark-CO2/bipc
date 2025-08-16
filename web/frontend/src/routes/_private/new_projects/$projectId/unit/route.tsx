import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/new_projects/$projectId/unit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div><Outlet /></div>
}
