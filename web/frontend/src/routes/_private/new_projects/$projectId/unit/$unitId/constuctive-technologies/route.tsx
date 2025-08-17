import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/constuctive-technologies"
)({
  component: RouteComponent,
  loader: async () => {
    return {
      crumb: `Tecnologias Construtivas`,
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
