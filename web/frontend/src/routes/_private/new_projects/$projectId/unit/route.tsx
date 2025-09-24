// import { getProjectByUUID } from "@/actions/projects/getProject";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { DrawerFormUnit } from "@/components/layout";
import { Button } from "@/components/ui/button";
import NotFoundList from "@/components/ui/not-found-list";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { TProjectUnit } from "@/types/projects";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useRouter,
  useLocation,
} from "@tanstack/react-router";
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

    return {
      projectId,
    };
  },
});

function RouteComponent() {
  const router = useRouter();
  const location = useLocation();
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
    queryFn: () => getProjectByUUID(projectId),
    staleTime: 1000 * 60 * 5,
  });

  const project = projectData?.data?.project;
  const units = project?.units || [];

  const [tabs, setTabs] = useState(units);
  const [selectedTab, setSelectedTab] = useState("");

  const handleTabClick = (unitId: string) => {
    const unit = tabs.find((unit: TProjectUnit) => unit.name === unitId);
    if (unit) {
      void router.navigate({
        to: `/new_projects/${projectId}/unit/${unit?.id}`,
      });
    }
  };

  useEffect(() => {
    setTabs(units);
  }, [units]);

  useEffect(() => {
    if (tabs.length > 0 && !params.unitId) {
      history.pushState(
        {},
        "",
        `/new_projects/${projectId}/unit/${tabs[0].id}`
      );
      setSelectedTab(tabs[0].name);
    } else if (params.unitId) {
      const paramUnit = params.unitId;
      const unit = tabs.find((unit: any) => unit.id === paramUnit);
      if (unit) {
        setSelectedTab(unit.name);
      } else {
        history.pushState({}, "", `/new_projects/${projectId}`);
        setSelectedTab("");
      }
    } else {
      setSelectedTab("");
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
        <div className="flex items-center gap-2">
          <TabsContainer
            tabs={tabs.map((unit) => unit?.name || "Desconhecido")}
            selectedTab={selectedTab}
            handleTabClick={handleTabClick}
            fullWidth={location.pathname.includes("constructive-technologies")}
          />
          {!location.pathname.includes("constructive-technologies") && (
            <DrawerFormUnit
              projectId={projectId}
              triggerComponent={
                <Button variant="bipc" size="sm">
                  <Plus className="w-16 h-16" />
                </Button>
              }
            />
          )}
        </div>
      )}
      <Outlet />
    </div>
  );
}
