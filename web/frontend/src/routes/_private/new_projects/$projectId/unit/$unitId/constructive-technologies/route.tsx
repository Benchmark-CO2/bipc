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

    await context.queryClient.ensureQueryData({
      queryKey: ["unit", projectId, unitId],
      queryFn: () => getUnitByUUID(projectId, unitId),
    });

    const unit = context.queryClient.getQueryData<any>([
      "unit",
      projectId,
      unitId,
    ]);

    const roles = unit?.data?.roles;
    let crumbName = "Tecnologias Construtivas";

    if (locationSearch?.dcp && roles) {
      crumbName = roles.find(
        (role: any) => role.id === locationSearch.dcp
      )?.name;
    }
    return {
      crumb: crumbName,
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
