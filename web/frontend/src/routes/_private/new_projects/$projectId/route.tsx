// import { getProjectByUUID } from "@/actions/projects/getProject";
// import { Button } from "@/components/ui/button";
import { getProjectByUUID } from "@/actions/projects/getProject";
import CustomBanner from "@/components/ui/customBanner";
import { IProject } from "@/types/projects";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { useState } from "react";

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
  const { projectId } = useParams({
    from: "/_private/new_projects/$projectId",
  });
  const [bannerCollapsed] = useState(
    () => localStorage.getItem("@banner/collapsed") === "true",
  );

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByUUID(projectId),
  });

  const project = projectData?.data?.project as IProject;

  const isEditPath = window.location.pathname.includes("edit");

  const summedAreaOfUnits = project?.units?.reduce(
    (sum, unit) => sum + (unit.area || 0),
    0,
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        {!isEditPath && project && (
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
            cep={project?.cep}
            id={projectId}
            unitsCount={project?.units?.length}
            totalArea={summedAreaOfUnits}
            collapsed={bannerCollapsed}
          />
        )}
        <Outlet />
      </div>
    </>
  );
}
