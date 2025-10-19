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

    const bannerCollapsed =
      typeof window !== "undefined"
        ? localStorage.getItem("@banner/collapsed") === "true"
        : false;

    return {
      project,
      crumb: project?.name || "Projeto",
      bannerCollapsed,
    };
  },
});

function RouteComponent() {
  const { project, bannerCollapsed } = Route.useLoaderData();

  const isEditPath = window.location.pathname.includes("edit");

  return (
    <>
      <div className="flex flex-col gap-4">
        {!isEditPath && (
          <CustomBanner
            name={project?.name || ""}
            description={project?.description || ""}
            city={project?.city || ""}
            state={project?.state || ""}
            phase={project?.phase || "not_defined"}
            image={""}
            neighborhood={project?.neighborhood}
            street={project?.street}
            number={project?.number}
            unitsCount={project?.units?.length}
            collapsed={bannerCollapsed}
          />
        )}
        <Outlet />
      </div>
    </>
  );
}
