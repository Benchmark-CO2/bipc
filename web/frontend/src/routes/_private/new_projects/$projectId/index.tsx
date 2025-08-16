import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/new_projects/$projectId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_private/new_projects/$projectId/"!</div>
}
