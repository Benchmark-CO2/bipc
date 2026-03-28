// import { getProjectByUUID } from "@/actions/projects/getProject";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { postDuplicateUnit } from "@/actions/units/postDuplicateUnit";
import { DrawerFormUnit } from "@/components/layout";
import ModalSimple from "@/components/layout/modal-simple";
import { Button } from "@/components/ui/button";
import NotFoundList from "@/components/ui/not-found-list";
import { Tabs } from "@/components/ui/tabs";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { TProjectUnit } from "@/types/projects";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useRouter,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { Copy, Edit, Loader2, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { projectId } = Route.useLoaderData();
  const params: { projectId: string; unitId: string; moduleId: string } =
    Route.useParams();

  const { hasPermission } = useProjectPermissions(projectId);

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

  const { mutate: mutateDuplicateUnit, isPending: isDuplicating } = useMutation(
    {
      mutationFn: (props: { projectId: string; unitId: string }) => {
        return postDuplicateUnit(props.projectId, props.unitId);
      },
      onSuccess: async (data) => {
        const unitData = await data?.data?.unit;

        toast.success("Edificação duplicada com sucesso");
        queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["projects"],
        });
        await navigate({
          to: `/new_projects/${projectId}/unit/${unitData.id}`,
        });
      },
      onError: (error) => {
        toast.error("Erro ao duplicar edificação", {
          description: error.message,
        });
      },
    },
  );

  useEffect(() => {
    setTabs(units);
  }, [units]);

  useEffect(() => {
    if (tabs.length > 0 && !params.unitId) {
      history.pushState(
        {},
        "",
        `/new_projects/${projectId}/unit/${tabs[0].id}`,
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
          <Tabs
            tabs={tabs.map((unit) => unit?.name || "Desconhecido")}
            selectedTab={selectedTab}
            handleTabClick={handleTabClick}
            fullWidth
          />
          {!location.pathname.includes("constructive-technologies") && (
            <>
              <Button variant="outline-bipc" size="icon-lg" disabled>
                <Upload />
              </Button>
              {params.unitId && hasPermission("create:unit") && (
                <ModalSimple
                  title="Duplicar Edificação"
                  content="Tem certeza que deseja duplicar esta edificação? Esta ação criará uma cópia idêntica da edificação, incluindo todas as suas informações e configurações. Você poderá editar os detalhes da nova edificação após a duplicação."
                  confirmTitle="Duplicar"
                  onConfirm={() =>
                    mutateDuplicateUnit({ projectId, unitId: params.unitId })
                  }
                  componentTrigger={
                    <Button variant="outline-bipc" size="icon-lg">
                      {isDuplicating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                  }
                />
              )}
              {params.unitId && hasPermission("update:unit") && (
                <DrawerFormUnit
                  projectId={projectId}
                  unitId={params.unitId}
                  triggerComponent={
                    <Button variant="outline-bipc" size="icon-lg">
                      <Edit />
                    </Button>
                  }
                />
              )}
              {hasPermission("create:unit") && (
                <DrawerFormUnit
                  projectId={projectId}
                  triggerComponent={
                    <Button variant="bipc" size="icon-lg">
                      <Plus className="w-16 h-16" />
                    </Button>
                  }
                />
              )}
            </>
          )}
        </div>
      )}
      <Outlet />
    </div>
  );
}
