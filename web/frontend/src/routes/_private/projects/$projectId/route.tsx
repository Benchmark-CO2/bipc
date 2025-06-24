import { getProjectByUUID } from "@/actions/projects/getProject";
import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import NotFoundList from "@/components/ui/not-found-list";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DrawerFormUnit } from "@/components/layout";
import { t } from "i18next";

export const Route = createFileRoute("/_private/projects/$projectId")({
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
    const project = projectData?.data?.project;

    return {
      projectId,
      crumb: project?.name || "Projeto",
    };
  },
});

function RouteComponent() {
  const { projectId } = Route.useLoaderData();
  const params: { projectId: string; unitId: string; moduleId: string } =
    Route.useParams();

  const {
    data: projectData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByUUID(projectId),
    staleTime: 1000 * 60 * 5,
  });

  const project = projectData?.data?.project;
  const units = project?.units || [];

  const [tabs, setTabs] = useState(units);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    setTabs(units);
  }, [units]);

  useEffect(() => {
    if (tabs.length > 0 && !params.unitId) {
      history.pushState({}, "", `/projects/${projectId}/${tabs[0].id}`);
      setSelectedTab(tabs[0].id);
    } else if (params.unitId) {
      const paramUnit = Number(params.unitId);
      const unit = tabs.find((unit: any) => unit.id === paramUnit);
      if (unit) {
        setSelectedTab(unit.id);
      } else {
        history.pushState({}, "", `/projects/${projectId}`);
        setSelectedTab(0);
      }
    } else {
      setSelectedTab(0);
    }
  }, [tabs, params, projectId]);

  if (isLoading) {
    return <div>Carregando projeto...</div>;
  }

  if (error || !project) {
    return <div>Erro ao carregar projeto</div>;
  }

  if (params.moduleId) {
    return <Outlet />;
  }

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <CustomBanner
          description={project.description || ""}
          title={project.name || ""}
          image={project.image_url || ""}
        />
        <div className="flex h-full w-full flex-col items-center justify-center">
          <NotFoundList
            icon={"package"}
            message={t("units.noUnits")}
            description={t("units.description")}
            showIcon
            button={
              <DrawerFormUnit
                projectId={projectId}
                triggerComponent={
                  <Button variant="outline" className="mt-4">
                    t("units.addUnit")
                  </Button>
                }
              />
            }
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <CustomBanner
          description={project.description || ""}
          title={project.name || ""}
          image={project.image_url || ""}
        />

        {tabs.length > 0 && (
          <TabsContainer
            projectId={projectId}
            units={tabs}
            selectedTab={selectedTab}
          />
        )}

        <Outlet />
      </div>
    </>
  );
}
