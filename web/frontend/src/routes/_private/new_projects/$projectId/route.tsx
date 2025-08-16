import { getProjectByUUID } from "@/actions/projects/getProject";
// import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import { ProjectContext } from "@/context/projectContext";
import { IProject } from "@/types/projects";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

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
  const { props, type, setType } = useContext(ProjectContext)!;
  const { project } = Route.useLoaderData();

  const isEditPath = window.location.pathname.includes("edit");

  useEffect(() => {
    if (type === "units") {
      props.actions.setUnits([
        {
          id: "121212-121212-121212",
          name: "Unidade 121212-121212-121212",
          description: "Descrição da unidade 121212-121212-121212",
        },
      ]);
    }
  }, [type]);

  useEffect(() => {
    setType("units");
  }, []);

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
