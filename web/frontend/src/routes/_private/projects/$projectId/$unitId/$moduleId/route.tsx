import { getModule } from "@/actions/modules/getModule";
import { structureTypes } from "@/utils/structureTypes";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_private/projects/$projectId/$unitId/$moduleId"
)({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { moduleId, unitId } = params;
    if (!moduleId) {
      throw new Error("Module ID is required");
    }

    const { data } = await context.queryClient.ensureQueryData({
      queryKey: ["module", params.projectId, unitId, moduleId],
      queryFn: () => getModule(params.projectId, unitId, moduleId),
    });

    if (!data || !data.versions) {
      throw new Error("Module data not found");
    }

    const moduleType = data.versions[0]?.structure_type;

    return {
      crumb: structureTypes[moduleType] || "Unknown",
    };
  },
});

function RouteComponent() {
  return (
    <>
      <Outlet />
    </>
  );
}
