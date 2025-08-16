import { createFileRoute, useRouterState, useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/(parallel-pages)/unit/new')({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useSearch() as {
    projectId: string;
  }
  
  return <div>Hello "/_private/new_projects/{projectId}/new"!</div>
}
