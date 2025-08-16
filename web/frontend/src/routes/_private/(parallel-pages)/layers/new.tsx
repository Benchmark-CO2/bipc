import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/(parallel-pages)/layers/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_private/(parallel-pages)/layers/new"!</div>
}
