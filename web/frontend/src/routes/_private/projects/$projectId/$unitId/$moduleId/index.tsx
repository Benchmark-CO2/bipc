import { deleteModule } from "@/actions/modules/deleteModule";
import { getModule } from "@/actions/modules/getModule";
import { patchModuleName } from "@/actions/modules/pathModuleName";
import { postSetModuleInUse } from "@/actions/modules/postSetModuleInUse";
import Chart from "@/components/charts";
import { DataPoint } from "@/components/charts/mock";
import { DrawerFormModule } from "@/components/layout";
import ModalConfirmDelete from "@/components/layout/modal-confirm-delete";
import ModalSimple from "@/components/layout/modal-simple";
import VersionsTable from "@/components/layout/versions-table";
import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import { Input } from "@/components/ui/input";
import { TModuleStructure, TModulesTypes } from "@/types/modules";
import { structureTypes } from "@/utils/structureTypes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFileRoute,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { Edit, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_private/projects/$projectId/$unitId/$moduleId/"
)({
  component: RouteComponent,
  staleTime: 1000 * 60 * 5,
  preloadStaleTime: 1000 * 60 * 5,

  loader: async ({
    params,
  }: {
    params: {
      projectId: string;
      moduleId: string;
      unitId: string;
    };
    context: any;
  }) => {
    const { moduleId } = params;
    if (!moduleId) {
      throw new Error("Module ID is required");
    }

    return {};
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { projectId, unitId, moduleId } = useParams({
    from: "/_private/projects/$projectId/$unitId/$moduleId/",
  });
  const { search } = useLocation();
  const { type } = search as {
    type?: TModulesTypes;
    versionId?: string;
  };

  const [selectedVersions, setSelectedVersions] = useState<
    TModuleStructure["version"][]
  >([]);
  const [moduleNameError, setModuleNameError] = useState("");

  const navigate = Route.useNavigate();

  const { data: moduleVersions } = useQuery({
    queryKey: ["module", projectId, unitId, moduleId],
    queryFn: () => getModule(projectId, unitId, moduleId, type!),
    enabled: !!projectId && !!unitId && !!moduleId && !!type,
  });

  const { isPending: isDeleteModulePending, mutate: mutateDeleteModule } =
    useMutation({
      mutationFn: () => deleteModule(projectId, unitId!, moduleId!, type!),
      onError: (error) => {
        toast.error(t("error.errorDeleteModule"), {
          description: error.message || t("error.errorUnknown"),
          duration: 5000,
        });
      },
      onSuccess: () => {
        toast.success(t("success.moduleDeleted"), {
          duration: 5000,
        });

        navigate({
          to: `/projects/${projectId}/${unitId}`,
        });
      },
    });

  const { mutate: mutateSetModuleVersion } = useMutation({
    mutationFn: (newVersion: { version: number; type: TModulesTypes }) =>
      postSetModuleInUse(newVersion, projectId, unitId!, moduleId!),
    onError: (error) => {
      toast.error(t("error.errorUpdateModule"), {
        description: error.message || t("error.errorUnknown"),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t("success.versionUpdated"), {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["module", projectId, unitId, moduleId!],
      });
      queryClient.invalidateQueries({
        queryKey: ["modules", projectId, unitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
    },
  });

  const { mutate: mutateUpdateName } = useMutation({
    mutationFn: (newName: string) =>
      patchModuleName(
        { name: newName, type: type! },
        projectId,
        unitId!,
        moduleId!
      ),
    onError: (error) => {
      toast.error(t("error.errorUpdateModule"), {
        description: error.message || t("error.errorUnknown"),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t("success.moduleUpdated"), {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["module", projectId, unitId, moduleId!],
      });
    },
  });

  const handleSetValidVersion = (versionId: number) => {
    const newVersion = {
      version: versionId,
      type: type as TModulesTypes,
    };
    mutateSetModuleVersion(newVersion);
  };

  const handleSelectRow = (version: number | undefined) => {
    if (version === undefined) return;

    if (new Set(selectedVersions).has(version)) {
      setSelectedVersions((prev) => prev.filter((id) => id !== version));
      return;
    }
    setSelectedVersions([...selectedVersions, version]);
  };

  const versions = moduleVersions?.data?.versions || [];

  const versionInUse = useMemo(() => {
    if (!versions.length) return null;

    const lastVersion = versions.find((version) => version.in_use);
    return lastVersion || null;
  }, [versions]);

  const totalCO2Max = versions.reduce(
    (sum, sim) => sum + (sim.co2_max || 0),
    0
  );
  const totalCO2Min = versions.reduce(
    (sum, sim) => sum + (sim.co2_min || 0),
    0
  );

  const maxCo2DataPoints = versions.map((ver: TModuleStructure) => {
    return {
      x: ver.co2_max || 0,
      y: (ver.co2_max || 0) / totalCO2Max,
      fill: selectedVersions.includes(ver.version),
      label: ver.version ? `n${ver.version}` : undefined,
      isGlobal: false,
    };
  });
  const minCo2DataPoints = versions.map((ver: TModuleStructure) => {
    return {
      x: ver.co2_min || 0,
      y: (ver.co2_min || 0) / totalCO2Min,
      fill: selectedVersions.includes(ver.version),
      label: ver.version ? `v${ver.version}` : undefined,
      isGlobal: false,
    };
  });

  const dataPoints: Record<"green" | "grey", DataPoint[]> = {
    green: minCo2DataPoints,
    grey: maxCo2DataPoints,
  };

  useEffect(() => {
    document.title = `BIPC / ${t("versions.title")}`;
  }, [t]);

  return (
    <div className="flex flex-col gap-4">
      <CustomBanner
        description={t("versions.description")}
        image=""
        title={`${structureTypes[versions[0]?.type] || "Unknown"} - ${versionInUse?.name || ""} `}
      />
      <div className="border-b" />
      <div className="flex justify-end gap-2">
        <ModalConfirmDelete
          componentTrigger={
            <Button variant="destructive" className="flex items-center gap-2">
              {isDeleteModulePending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                t("common.delete")
              )}
            </Button>
          }
          title={"Delete Module"}
          onConfirm={async () => {
            if (!moduleId || !type) return;
            await mutateDeleteModule();
          }}
        />
        <DrawerFormModule
          projectId={projectId}
          unitId={unitId}
          moduleId={moduleId}
          triggerComponent={
            <Button variant="default" className="flex items-center gap-2">
              {t("versions.addVersion")}
            </Button>
          }
          type={versions[0]?.type}
          moduleData={versionInUse}
        />
        <ModalSimple
          componentTrigger={
            <Button variant="default" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
            </Button>
          }
          content={
            <>
              <Input defaultValue={versionInUse?.name} ref={inputRef} />
              {moduleNameError && (
                <p className="text-red-500 mt-2 text-sm">{moduleNameError}</p>
              )}
            </>
          }
          title={t("versions.editVersionName")}
          confirmTitle={t("common.save")}
          onConfirm={() => {
            if (
              inputRef.current &&
              inputRef.current.value !== "" &&
              inputRef.current.value !== versionInUse?.name
            ) {
              mutateUpdateName(inputRef.current.value);
            } else {
              setModuleNameError(t("error.errorEditModuleName"));
              setInterval(() => {
                setModuleNameError("");
              }, 3000);
            }
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 min-xl:grid-cols-2">
        <VersionsTable
          versions={versions}
          onClickSetValidVersion={handleSetValidVersion}
          selectedVersions={selectedVersions}
          setSelectedVersions={setSelectedVersions}
          onCheckVersion={handleSelectRow}
        />
        {
          <Chart
            filledPoints={+moduleId || 0}
            key={moduleId}
            datachart={dataPoints}
            globalData={{
              green: [],
              grey: [],
            }}
          />
        }
      </div>
    </div>
  );
}
