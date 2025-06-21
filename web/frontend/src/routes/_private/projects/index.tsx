import { getAllProjectsByUser } from "@/actions/projects/getProjects";
import { DrawerAddProject, ProjectTable } from "@/components/layout";
import { Button } from "@/components/ui/button";
import CustomCard from "@/components/ui/customCard";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, List, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_private/projects/")({
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

  const navigate = useNavigate({ from: "/projects" });

  const { data } = useQuery({
    queryKey: ["projects"],
    queryFn: getAllProjectsByUser,
  });

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "table" ? "grid" : "table"));
  };

  useEffect(() => {
    document.title = "BIPC / Projetos";
  }, []);

  const onClickProject = (projectUid: string) => {
    navigate({
      to: `/projects/${projectUid}`,
      from: "/projects",
    })
      .then(() => null)
      .catch((err: unknown) => err);
  };

  const componentTrigger =
    viewMode === "table" ? (
      <Button variant="outline">
        <Plus className="h-4 w-4" />
        {t("projectsPage.addProject")}
      </Button>
    ) : (
      <div className="flex h-60 w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-white p-4 shadow-md shadow-zinc-600 transition-all duration-500 hover:cursor-pointer hover:shadow-xl md:w-1/3 lg:w-1/4 xl:max-w-100 dark:bg-zinc-800 dark:shadow-zinc-900">
        <Plus className="size-8" />
        <span className="text-lg font-medium">
          {t("projectsPage.addProject")}
        </span>
      </div>
    );

  return (
    <div>
      <div className="mb-2 flex justify-end gap-1">
        {viewMode === "table" && (
          <DrawerAddProject componentTrigger={componentTrigger} />
        )}
        <Button
          variant={viewMode !== "table" ? "default" : "outline"}
          onClick={toggleViewMode}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode !== "grid" ? "default" : "outline"}
          onClick={toggleViewMode}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      {viewMode === "table" ? (
        <ProjectTable
          projects={data?.data.projects ?? []}
          onClickProject={onClickProject}
        />
      ) : (
        <div className="flex w-full flex-wrap items-center gap-4">
          <DrawerAddProject componentTrigger={componentTrigger} />
          {data?.data.projects.length ? (
            data?.data.projects.map((project) => (
              <>
                <CustomCard
                  key={project.uuid}
                  project={project}
                  onClick={() => {
                    onClickProject(project.uuid);
                  }}
                />
              </>
            ))
          ) : (
            <div className="flex h-full w-full flex-col gap-4">
              <p>{t("projectsPage.noProjects")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
