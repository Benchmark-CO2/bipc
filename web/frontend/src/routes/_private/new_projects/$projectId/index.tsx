import { CollaboratorsView, ProjectView } from "@/components/layout";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { useSummary } from '@/context/summaryContext';
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
  const navigate = useNavigate();
  const searchParams = useSearch({
    from: "/_private/new_projects/$projectId/",
  });

  const [selectedTab, setSelectedTab] = useState("Projeto");
  const { setSummaryContext } = useSummary()
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

      {selectedTab === "Projeto" && <ProjectView projectId={projectId} />}
      {selectedTab === "Colaboradores" && (
        <CollaboratorsView projectId={projectId} />
      )}
    </div>
  );
}
