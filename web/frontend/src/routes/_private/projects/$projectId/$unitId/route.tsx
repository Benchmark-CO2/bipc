import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/projects/$projectId/$unitId")({
  component: RouteComponent,
  loader: ({ params }) => {
    const { unitId, projectId } = params as {
      unitId: string;
      projectId: string;
    };

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // const projects = getFromStorage(`@projects/units/${projectId}`, {} as TProjectsTemp)
    // const projectUnits = projects[projectId] || []
    // const unitCrumb = projectUnits.find((unit) => unit.id === unitId)?.name

    return {
      crumb: unitId,
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
