import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import { deleteProject } from "@/actions/projects/deleteProjects";
import { getAllProjectsByUser } from "@/actions/projects/getProjects";
import { DrawerFormProject, ProjectTable } from "@/components/layout";
import ProjectsSummary from "@/components/summaryVariants/projects";
import { Button } from "@/components/ui/button";
import CustomCard from "@/components/ui/customCard";
import NotFoundList from "@/components/ui/not-found-list";
import { useSummary } from "@/context/summaryContext";
import { useProjects } from "@/hooks/useProjects";
import { queryClient } from "@/utils/queryClient";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/_private/new_projects/")({
  component: RouteComponent,
  staleTime: 1000 * 60 * 5,
  preloadStaleTime: 1000 * 60 * 5,

  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: ["projects"],
      queryFn: getAllProjectsByUser,
    });

    return null;
  },
});

function RouteComponent() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const { t } = useTranslation();
  const { projects, selectedProjects, setSelectedProjects } = useProjects();
  const navigate = useNavigate({ from: "/projects" });
  const { setSummaryContext } = useSummary();
  const { data } = useQuery({
    queryKey: ["projects"],
    queryFn: getAllProjectsByUser,
  });

  const { data: benchmarkData } = useQuery({
    queryKey: ["projects-benchmarks"],
    queryFn: getProjectsBenchmark,
  });

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "table" ? "grid" : "table"));
  };

  useEffect(() => {
    document.title = "BIPC / Projetos";
  }, []);

  const onClickProject = (projectUid: string) => {
    navigate({
      to: `/new_projects/${projectUid}`,
      from: "/new_projects",
    })
      .then(() => null)
      .catch((err: unknown) => err);
  };

  const onDeleteProject = (projectUid: string) => {
    void deleteProject(projectUid)
      .then(async () => {
        toast.success(t("success.projectDeleted"));
        await queryClient.invalidateQueries({
          queryKey: ["projects"],
          refetchType: "all",
        });
      })
      .catch((error) => {
        toast.error(t("error.errorDeleteProject"), {
          description:
            error instanceof Error ? error.message : t("error.errorUnknown"),
          duration: 5000,
        });
      });
  };

  const componentTrigger =
    viewMode === "table" ? (
      <Button variant="outline">
        <Plus className="h-4 w-4" />
        {t("projects.addProject")}
      </Button>
    ) : (
      <div className="flex h-[100px] w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-primary text-white p-4 shadow-md shadow-zinc-600 transition-all duration-500 hover:cursor-pointer hover:shadow-lg md:w-1/3 lg:w-1/4 xl:max-w-100 dark:shadow-zinc-900">
        <Plus className="size-8" />
        <span className="text-lg font-medium">{t("projects.addProject")}</span>
      </div>
    );

  const handleSelectProject = (projectUid: string, isSelected: boolean) => {
    setSelectedProjects((prev) => new Map(prev).set(projectUid, isSelected));
  };

  useEffect(() => {
    if (!benchmarkData?.data) return;
    setSummaryContext({
      title: "Projects Comparison",
      component: (
        <ProjectsSummary
          projects={[...(projects ?? [])].filter((project) =>
            selectedProjects.get(project.id)
          )}
          data={benchmarkData.data}
        />
      ),
    });
  }, [selectedProjects, benchmarkData]);

  return (
    <div>
      <div className="mb-6 mt-2 flex justify-between gap-1">
        <h1 className='text-4xl font-bold font-["helvetica"] text-primary '>
          Projetos
        </h1>
        <div className="flex justify-end gap-1">
          <DrawerFormProject
            componentTrigger={
              <Button variant={"bipc"}>{t("projects.addProject")}</Button>
            }
          />
        </div>
      </div>
      {viewMode === "table" ? (
        <ProjectTable
          projects={[...(data?.data.projects ?? [])]}
          onClickProject={onClickProject}
          onDeleteProject={onDeleteProject}
        />
      ) : (
        <div className="grid grid-cols-3 w-full flex-wrap items-center gap-6 max-md:grid-cols-2 max-sm:grid-cols-1">
          {[...(projects ?? [])].length ? (
            [...(projects ?? [])].map((project, ix) => {
              const { co, mj, density, ...projectData } = project;
              return (
                <CustomCard
                  key={project.id + ix}
                  project={projectData}
                  onClick={() => {
                    onClickProject(project.id);
                  }}
                  onDeleteProject={onDeleteProject}
                  selectedProjects={selectedProjects}
                  handleSelectProject={handleSelectProject}
                />
              );
            })
          ) : (
            <div className="flex h-full w-full flex-col gap-4">
              <NotFoundList
                message="Nenhum projeto encontrado"
                description="Crie seu primeiro projeto clicando no botão acima"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
