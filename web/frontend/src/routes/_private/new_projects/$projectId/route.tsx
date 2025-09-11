// import { getProjectByUUID } from "@/actions/projects/getProject";
// import { Button } from "@/components/ui/button";
import { getProjectByUUID } from "@/actions/projects/getProject";
import CustomBanner from "@/components/ui/customBanner";
import { IProject } from "@/types/projects";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/new_projects/$projectId")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { projectId } = params;
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

    const project: IProject = projectData?.data?.project;

    return {
      project,
      crumb: project?.name || "Projeto",
    };
  },
});

function RouteComponent() {
  const { project } = Route.useLoaderData();

  const isEditPath = window.location.pathname.includes("edit");

  return (
    <>
      <div className="flex flex-col gap-4">
        {!isEditPath && (
          <CustomBanner
            description={project?.description || ""}
            title={project?.name || ""}
            image={""}
          />
        )}
        <Outlet />
      </div>
    </>
  );
}
