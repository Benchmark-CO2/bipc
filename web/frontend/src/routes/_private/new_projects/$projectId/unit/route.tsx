import { getProjectByUUID } from "@/actions/projects/getProject";
import { DrawerFormUnit } from "@/components/layout";
import { Button } from "@/components/ui/button";
import NotFoundList from "@/components/ui/not-found-list";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { mockProject } from "@/utils/mockProject";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_private/new_projects/$projectId/unit")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const { projectId } = params;
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // await context.queryClient.ensureQueryData({
    //   queryKey: ["project", projectId],
    //   queryFn: () => getProjectByUUID(projectId),
    // });

    return {
      projectId,
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  const { projectId } = Route.useLoaderData();
  const params: { projectId: string; unitId: string; moduleId: string } =
    Route.useParams();

  const {
    data: projectData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    // queryFn: () => getProjectByUUID(projectId),
    queryFn: () => {
      return {
        data: { project: mockProject },
      };
    },
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
    console.log(tabs);
    if (tabs.length > 0 && !params.unitId) {
      history.pushState(
        {},
        "",
        `/new_projects/${projectId}/unit/${tabs[0].id}`
      );
      setSelectedTab(tabs[0].id);
    } else if (params.unitId) {
      const paramUnit = Number(params.unitId);
      const unit = tabs.find((unit: any) => unit.id === paramUnit);
      if (unit) {
        setSelectedTab(unit.id);
      } else {
        history.pushState({}, "", `/new_projects/${projectId}`);
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

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
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
                    <Plus />
                    {t("units.addUnit")}
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
    <div className="flex flex-col gap-4">
      {tabs.length > 0 && (
        <TabsContainer
          projectId={projectId}
          units={tabs}
          selectedTab={selectedTab}
          hasAddButton={
            !window.location.pathname.includes("constuctive-technologies")
          }
        />
      )}
      <Outlet />
    </div>
  );
}
