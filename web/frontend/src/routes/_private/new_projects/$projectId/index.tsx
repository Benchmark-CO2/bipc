import { getAllProjectsByUser } from "@/actions/projects/getProjects";
import { CollaboratorsView, ProjectView } from "@/components/layout";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { useSummary } from "@/context/summaryContext";
import { TModulesTypes } from "@/types/modules";
import { TConsumption, TConsumptionPerModule } from "@/types/projects";
import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

type ProjectSearch = {
  tab?: "projeto" | "colaboradores";
};

export const Route = createFileRoute("/_private/new_projects/$projectId/")({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params }) => {
    const { projectId } = params;

    const projects = await queryClient.ensureQueryData({
      queryKey: ["projects"],
      queryFn: getAllProjectsByUser,
    });

    const project = projects?.data?.projects.find((p) => p.id === projectId);
    const projectConsumptions: TConsumption[] = Object.keys(
      project?.consumptions || {}
    )
      .filter((key) => key !== "total")
      .map((key) => {
        const consumption =
          project?.consumptions?.[key as keyof TConsumptionPerModule];
        return {
          type: key as TModulesTypes,
          co2_max: consumption?.co2_max ?? 0,
          co2_min: consumption?.co2_min ?? 0,
          energy_max: consumption?.energy_max ?? 0,
          energy_min: consumption?.energy_min ?? 0,
        };
      });

    return { projectConsumptions };
  },
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
  const { projectConsumptions } = Route.useLoaderData({});
  const navigate = useNavigate();
  const searchParams = useSearch({
    from: "/_private/new_projects/$projectId/",
  });

  const [selectedTab, setSelectedTab] = useState("Projeto");
  const { setSummaryContext } = useSummary();
  const tabs = ["Projeto", "Colaboradores"];

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
      <TabsContainer
        tabs={tabs}
        selectedTab={selectedTab}
        handleTabClick={handleTabClick}
        fullWidth
      />

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
