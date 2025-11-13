import { getProjectByUUID } from "@/actions/projects/getProject";
import { getAllProjectsByUser } from "@/actions/projects/getProjects";
import {
  CollaboratorsView,
  DrawerFormUnit,
  ProjectView,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useSummary } from "@/context/summaryContext";
import { TModulesTypes } from "@/types/modules";
import { TConsumption, TConsumptionPerModule } from "@/types/projects";
import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

type ProjectSearch = {
  tab?: "projeto" | "colaboradores";
};

export const Route = createFileRoute("/_private/new_projects/$projectId/")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ProjectSearch => {
    return {
      tab: search.tab as "projeto" | "colaboradores",
    };
  },
});

function RouteComponent() {
  const { projectId } = useParams({
    from: "/_private/new_projects/$projectId",
  });
  const { hasPermission } = useProjectPermissions(projectId);
  // const { projectConsumptions } = Route.useLoaderData({});
  const navigate = useNavigate();
  const searchParams = useSearch({
    from: "/_private/new_projects/$projectId/",
  });

  const [selectedTab, setSelectedTab] = useState("Projeto");
  const { setSummaryContext } = useSummary();
  const tabs = ["Projeto", "Colaboradores"];

  const { data: projectData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const projectResponse = await getAllProjectsByUser();
      const projects = await projectResponse.data.projects;
      const project = projects.find((p) => p.id === projectId);
      return project;
    },
    enabled: !!projectId,
  });

  const projectConsumptions: TConsumption[] = Object.keys(
    projectData?.consumption || {}
  )
    .filter((key) => key !== "total")
    .map((key) => {
      const consumption =
        projectData?.consumption?.[key as keyof TConsumptionPerModule];
      return {
        type: key as TModulesTypes,
        co2_max: consumption?.co2_max?.toInternational() ?? 0,
        co2_min: consumption?.co2_min?.toInternational() ?? 0,
        energy_max: consumption?.energy_max?.toInternational() ?? 0,
        energy_min: consumption?.energy_min?.toInternational() ?? 0,
      };
    });

  useEffect(() => {
    if (searchParams.tab === "colaboradores") {
      setSelectedTab("Colaboradores");
    } else {
      setSelectedTab("Projeto");
    }
  }, [searchParams.tab]);

  const handleTabClick = (tab: string) => {
    const tabParam = tab === "Colaboradores" ? "colaboradores" : "projeto";

    navigate({
      to: ".",
      search: { tab: tabParam },
      replace: true,
    });

    setSelectedTab(tab);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Tabs
          tabs={tabs}
          selectedTab={selectedTab}
          handleTabClick={handleTabClick}
          fullWidth
        />
        {selectedTab === "Projeto" && (
          <>
            <Button variant="outline-bipc" size="icon-lg" disabled>
              <Upload />
            </Button>
            {hasPermission("create:unit") && (
              <DrawerFormUnit
                triggerComponent={
                  <Button variant="bipc" size="icon-lg">
                    <Plus />
                  </Button>
                }
                projectId={projectId}
              />
            )}
          </>
        )}
      </div>

      {selectedTab === "Projeto" && (
        <ProjectView
          projectId={projectId}
          projectConsumptions={projectConsumptions}
        />
      )}
      {selectedTab === "Colaboradores" && (
        <CollaboratorsView projectId={projectId} />
      )}
    </div>
  );
}
