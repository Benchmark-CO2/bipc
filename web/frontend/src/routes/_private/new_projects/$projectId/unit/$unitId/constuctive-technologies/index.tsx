import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_private/new_projects/$projectId/unit/$unitId/constuctive-technologies/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      Hello
      "/_private/new_projects/$projectId/unit/$unitId/constuctive-technologies/"!
    </div>
  )
}
