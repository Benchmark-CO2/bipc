import { getModule } from "@/actions/modules/getModule";
// import { DataPoint } from "@/components/charts/mock";
import { DrawerFormModule } from "@/components/layout";
import VersionsTable from "@/components/layout/versions-table";
import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import { getFromStorage } from "@/lib/storage";
import { TModuleStructure } from "@/types/modules";
import { TSimulation } from "@/types/projects";
// import { genRowData } from "@/utils/genData";
import { structureTypes } from "@/utils/structureTypes";
import { useQuery } from "@tanstack/react-query";
// import { mockSimulation } from '@/utils/mockSimulation'
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

// const MODULE_SIMULATIONS = "@module/simulations";
// const UNIT_MODULES = "@unit/modules";

export const Route = createFileRoute(
  "/_private/projects/$projectId/$unitId/$moduleId/"
)({
  component: RouteComponent,
  staleTime: 1000 * 60 * 5,
  preloadStaleTime: 1000 * 60 * 5,

  loader: async ({
    params,
  }: {
    params: { projectId: string; moduleId: string; unitId: string };
    context: any;
  }) => {
    const {
      moduleId,
      // unitId,
      // projectId
    } = params;
    if (!moduleId) {
      throw new Error("Module ID is required");
    }

    // const unitModulesFromStorage = getFromStorage(
    //   `${UNIT_MODULES}/${params.projectId}`,
    //   {} as TProjectUnitModule
    // );

    // const module: TModuleData = unitModulesFromStorage[params.unitId].find(
    //   (el) => el.module_uuid === moduleId
    // )!;

    // const simulationsFromStorage = getFromStorage(
    //   `${MODULE_SIMULATIONS}/${params.projectId}/${params.unitId}/${moduleId}`,
    //   [] as TSimulation[]
    // );

    let fakeGlobalSims = getFromStorage("fakeGlobalSims", [] as TSimulation[]);
    // if (simulationsFromStorage.length) {
    //   const yesterday = new Date();
    //   yesterday.setDate(yesterday.getDate() - 1);

    //   const oldVersion = simulationsFromStorage.some(
    //     (sim) => new Date(sim.created_at).getTime() < yesterday.getTime()
    //   );
    //   if (oldVersion) {
    //     setToStorage(
    //       `${MODULE_SIMULATIONS}/${params.projectId}/${params.unitId}/${params.moduleId}`,
    //       []
    //     );
    //     window.location.reload();
    //   }
    // }

    // const simulations: TSimulation[] = [];

    // if (!fakeGlobalSims.length) {
    //   let lastDataPoint = {} as DataPoint | undefined;
    //   const fakeGlobalData = Array.from({ length: 20 }, (_) => {
    //     const rowData = genRowData(lastDataPoint);
    //     lastDataPoint = rowData.green;
    //     return { ...rowData };
    //   });

    //   const _fakeGlobalSims: TSimulation[] = fakeGlobalData.map((data) => ({
    //     version: "0",
    //     created_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString(),
    //     data,
    //     isValid: false,
    //     name: "concreteWall",
    //     isGlobal: true,
    //   }));

    //   fakeGlobalSims = _fakeGlobalSims;
    //   setToStorage("fakeGlobalSims", _fakeGlobalSims);
    // }
    // if (!simulationsFromStorage.length) {
    //   const rowData = genRowData(fakeGlobalSims[4].data.green || null);
    //   simulations.push({
    //     name: module.tipoDeEstrutura,
    //     version: module.version || "1",
    //     created_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString(),
    //     data: rowData,
    //     isValid: true,
    //   });
    //   setToStorage(
    //     `${MODULE_SIMULATIONS}/${params.projectId}/${params.unitId}/${moduleId}`,
    //     simulations
    //   );
    // } else {
    //   simulations.push(...simulationsFromStorage);
    // }

    return {
      // crumb: t("common.crumbs.simulations"),
      // versions: data.versions,
      // module,
      globalSims: fakeGlobalSims,
    };
  },
});

function RouteComponent() {
  // const { globalSims } = useLoaderData({
  //   from: "/_private/projects/$projectId/$unitId/$moduleId/",
  // });

  const { t } = useTranslation();

  // const params = Route.useParams();
  const { projectId, unitId, moduleId } = useParams({
    from: "/_private/projects/$projectId/$unitId/$moduleId/",
  });

  // const [sims, setSims] = useState<TSimulation[]>(simulations);
  const [selectedVersions, setSelectedVersions] = useState<
    TModuleStructure["version"][]
  >([]);

  // const navigate = Route.useNavigate();

  // const search = Route.useSearch();

  const { data: moduleVersions } = useQuery({
    queryKey: ["module", projectId, unitId, moduleId],
    queryFn: () => getModule(projectId, unitId, moduleId),
    enabled: !!projectId && !!unitId && !!moduleId,
  });

  // const { simulationId } = search as { simulationId: string };

  // const { data } = useQuery({
  //   queryKey: ["modules", projectId, unitId],
  //   queryFn: () => getModule(projectId, unitId, moduleId),
  // });

  // const modules = data?.data.versions || [];

  // const handleClickSimulation = (simulationId: string) => {
  //   void navigate({
  //     to: "/projects/$projectId/$unitId/$moduleId",
  //     search: {
  //       simulationId,
  //     },
  //   });
  // };

  const handleSetValidVersion = (versionId: string) => {
    console.log(versionId);
    // setSims((prev) => {
    //   const newSims = prev.map((sim) => {
    //     if (sim.version === simulationId) {
    //       return { ...sim, isValid: true };
    //     }
    //     return { ...sim, isValid: false };
    //   });
    //   setToStorage(
    //     `${MODULE_SIMULATIONS}/${params.projectId}/${params.unitId}/${params.moduleId}`,
    //     newSims
    //   );
    //   return newSims;
    // });
  };

  useEffect(() => {
    document.title = "BIPC / Simulações";
  }, []);

  const handleSelectRow = (version: number | undefined) => {
    if (version === undefined) return;

    if (new Set(selectedVersions).has(version)) {
      setSelectedVersions((prev) => prev.filter((id) => id !== version));
      return;
    }
    setSelectedVersions([...selectedVersions, version]);
  };

  // const handleAddNewSimulation = (data: AddModuleFormSchema) => {
  //   const lastSimulation = sims[sims.length - 1] || globalSims[12].data;
  //   const newSimulation = {
  //     name: data.tipoDeEstrutura,
  //     version: String(sims.length + 1),
  //     created_at: new Date().toISOString(),
  //     updated_at: new Date().toISOString(),
  //     data: genRowData2(lastSimulation?.data.green || null),
  //     isValid: false,
  //   } as TSimulation;

  //   setSims((prev) => {
  //     const newSims = [...prev, newSimulation];
  //     setToStorage(
  //       `${MODULE_SIMULATIONS}/${params.projectId}/${params.unitId}/${params.moduleId}`,
  //       newSims
  //     );
  //     return [...prev, newSimulation];
  //   });
  // };
  // const dataPoints: Record<"green" | "grey", DataPoint[]> = {
  //   green: [...sims]
  //     .sort((a, b) => a.data.green.x + b.data.green.x)
  //     .map((sim) => ({
  //       x: sim.data.green.x,
  //       y: sim.data.green.y,
  //       fill: +sim.version
  //         ? new Set(selectedSimulations).has(sim.version)
  //         : false,
  //       label:
  //         new Set(selectedSimulations).has(sim.version) && "n" + sim.version,
  //       isGlobal: sim.isGlobal,
  //     }))
  //     .reverse() as DataPoint[],
  //   grey: [...sims]
  //     .sort((a, b) => a.data.grey.x + b.data.grey.x)
  //     .map((sim) => ({
  //       x: sim.data.grey.x,
  //       y: sim.data.grey.y,
  //       fill: +sim.version
  //         ? new Set(selectedSimulations).has(sim.version)
  //         : false,
  //       label:
  //         new Set(selectedSimulations).has(sim.version) && "v" + sim.version,
  //       isGlobal: sim.isGlobal,
  //     }))
  //     .reverse() as DataPoint[],
  // };
  // const globalData: Record<"green" | "grey", DataPoint[]> = {
  //   green: [...globalSims]
  //     .sort((a, b) => a.data.green.x + b.data.green.x)
  //     .map((sim) => ({
  //       x: sim.data.green.x,
  //       y: sim.data.green.y,
  //       fill: +sim.version
  //         ? new Set(selectedSimulations).has(sim.version)
  //         : false,
  //       label:
  //         new Set(selectedSimulations).has(sim.version) && "n" + sim.version,
  //       isGlobal: sim.isGlobal,
  //     }))
  //     .reverse() as DataPoint[],
  //   grey: [...globalSims]
  //     .sort((a, b) => a.data.grey.x + b.data.grey.x)
  //     .map((sim) => ({
  //       x: sim.data.grey.x,
  //       y: sim.data.grey.y,
  //       fill: +sim.version
  //         ? new Set(selectedSimulations).has(sim.version)
  //         : false,
  //       label:
  //         new Set(selectedSimulations).has(sim.version) && "v" + sim.version,
  //       isGlobal: sim.isGlobal,
  //     }))
  //     .reverse() as DataPoint[],
  // }

  const versions = moduleVersions?.data?.versions || [];

  const versionInUse = useMemo(() => {
    if (!versions.length) return null;

    const lastVersion = versions.find((version) => version.in_use);
    return lastVersion || null;
  }, [versions]);

  // console.log("dataPoints", dataPoints);

  return (
    <div className="flex flex-col gap-4">
      <CustomBanner
        description={t("simulations.description")}
        image=""
        title={structureTypes[versions[0]?.structure_type] || "Unknown"}
      />
      <div className="border-b" />
      <div className="flex justify-end gap-4">
        {/* <Button variant='outline' onClick={() => console.log('add simulation')}>
          Atribuir Acesso
        </Button>
        <Button variant='noStyles' onClick={() => console.log('add report')}>
          Adicionar Relatório
        </Button> */}
        {/* <DrawerAddModule
          curModule={module}
          callback={handleAddNewSimulation}
          componentTrigger={
            <Button variant="default" className="flex items-center gap-2">
              {t("simulations.addSimulation")}
            </Button>
          }
          context="simulation"
        /> */}
        <DrawerFormModule
          projectId={projectId}
          unitId={unitId}
          moduleId={moduleId}
          triggerComponent={
            <Button variant="default" className="flex items-center gap-2">
              {t("simulations.addSimulation")}
            </Button>
          }
          structureType={versions[0]?.structure_type}
          moduleData={versionInUse}
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
        {/* <SimulationTable
          key={moduleVersions.length + 1}
          simulations={sims}
          onClickSimulation={handleClickSimulation}
          onClickSetValidVersion={handleSetValidVersion}
          selectedSimulations={selectedSimulations}
          setSelectedSimulations={setSelectedSimulations}
          onCheckSimulation={handleSelectRow}
        /> */}
        {/* {
          <Chart
            filledPoints={+simulationId || 0}
            key={simulationId}
            datachart={dataPoints}
            globalData={{
              green: [],
              grey: [],
            }}
          />
        } */}
      </div>
    </div>
  );
}
