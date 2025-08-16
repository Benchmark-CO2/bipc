import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_private/(parallel-pages)/unit/edit',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Aqui tela de editar unidade</div>
}
