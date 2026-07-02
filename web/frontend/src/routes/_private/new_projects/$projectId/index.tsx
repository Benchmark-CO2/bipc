import { getProjectByUUID } from "@/actions/projects/getProject";
import { getAllProjectsByUser } from "@/actions/projects/getProjects";
import {
  CollaboratorsView,
  DisciplinesView,
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
import { useTranslation } from "@/i18n";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";

type ProjectSearch = {
  tab?: "projeto" | "colaboradores" | "disciplinas";
};

export const Route = createFileRoute("/_private/new_projects/$projectId/")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ProjectSearch => {
    return {
      tab: search.tab as "projeto" | "colaboradores" | "disciplinas",
    };
  },
});

function RouteComponent() {
  const { projectId } = useParams({
    from: "/_private/new_projects/$projectId",
  });
  const { hasPermission } = useProjectPermissions(projectId);
  const { t } = useTranslation();
  // const { projectConsumptions } = Route.useLoaderData({});
  const navigate = useNavigate();
  const searchParams = useSearch({
    from: "/_private/new_projects/$projectId/",
  });

  const [selectedTab, setSelectedTab] = useState(t.projectView.tabProject);
  const { setSummaryContext } = useSummary();
  const tabs = [
    t.projectView.tabProject,
    t.projectView.tabCollaborators,
    t.projectView.tabDisciplines,
  ];

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
    projectData?.consumption || {},
  )
    .filter((key) => key !== "total")
    .map((key) => {
      const consumption =
        projectData?.consumption?.[key as keyof TConsumptionPerModule];
      return {
        type: key as TModulesTypes,
        co2_max: consumption?.co2_max ?? 0,
        co2_min: consumption?.co2_min ?? 0,
        energy_max: consumption?.energy_max ?? 0,
        energy_min: consumption?.energy_min ?? 0,
        material: consumption?.material ?? 0,
      };
    });

  useEffect(() => {
    if (searchParams.tab === "colaboradores") {
      setSelectedTab(t.projectView.tabCollaborators);
    } else if (searchParams.tab === "disciplinas") {
      setSelectedTab(t.projectView.tabDisciplines);
    } else {
      setSelectedTab(t.projectView.tabProject);
    }
  }, [searchParams.tab, t]);

  const handleTabClick = (tab: string) => {
    let tabParam: "projeto" | "colaboradores" | "disciplinas";
    if (tab === t.projectView.tabCollaborators) {
      tabParam = "colaboradores";
    } else if (tab === t.projectView.tabDisciplines) {
      tabParam = "disciplinas";
    } else {
      tabParam = "projeto";
    }

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
        {selectedTab === t.projectView.tabProject && (
          <>
            <Button variant="outline-bipc" size="icon-lg" disabled>
              <Upload />
            </Button>
            {hasPermission("create:unit") && (
              <DrawerFormUnit
                triggerComponent={
                  <SimpleTooltip content={t.units.form.addTitle} side="bottom">
                    <Button variant="bipc" size="icon-lg">
                      <Plus />
                    </Button>
                  </SimpleTooltip>
                }
                projectId={projectId}
              />
            )}
          </>
        )}
      </div>

      {selectedTab === t.projectView.tabProject && (
        <ProjectView
          projectId={projectId}
          projectConsumptions={projectConsumptions}
        />
      )}
      {selectedTab === t.projectView.tabCollaborators && (
        <CollaboratorsView
          projectId={projectId}
          projectName={projectData?.name}
        />
      )}
      {selectedTab === t.projectView.tabDisciplines && (
        <DisciplinesView projectId={projectId} />
      )}
    </div>
  );
}
