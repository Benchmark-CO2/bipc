import { getUnitByUUID } from "@/actions/units/getUnit";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/constructive-technologies"
)({
  component: RouteComponent,
  loader: async ({ params, location, context }) => {
    const locationSearch = location.search as { dcp?: string };
    const { projectId, unitId } = params as {
      unitId: string;
      projectId: string;
    };

    const unitResponse = await context.queryClient.fetchQuery({
      queryKey: ["unit", projectId, unitId],
      queryFn: async () => {
        const response = await getUnitByUUID(projectId, unitId);
        return response.data;
      },
      staleTime: 60000, // Cache por 1 minuto
    });

    const roles = unitResponse?.roles;
    let crumbName = "Tecnologias Construtivas";

    if (locationSearch?.dcp && roles) {
      const foundRole = roles.find(
        (role: any) => role.id === locationSearch.dcp
      );
      crumbName = foundRole?.name || crumbName;
    }
    return {
      crumb: crumbName,
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
