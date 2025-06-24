import { getProjectByUUID } from "@/actions/projects/getProject";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/projects/$projectId/$unitId")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { unitId, projectId } = params as {
      unitId: string;
      projectId: string;
    };

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    await context.queryClient.ensureQueryData({
      queryKey: ["project", projectId],
      queryFn: () => getProjectByUUID(projectId),
    });

    const projectData = context.queryClient.getQueryData<any>([
      "project",
      projectId,
    ]);
    const project = projectData?.data?.project;

    if (!project) {
      throw new Error("Project not found");
    }

    const projectUnits = project.units || [];
    const unitParam = Number(params.unitId);
    const unitCrumb = projectUnits.find(
      (unit: any) => unit.id === unitParam
    )?.name;

    return {
      crumb: unitCrumb || unitId,
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
