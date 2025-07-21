import { getModule } from "@/actions/modules/getModule";
import Chart from "@/components/charts";
import { DataPoint } from "@/components/charts/mock";
import { DrawerFormModule } from "@/components/layout";
import SimulationTable from "@/components/layout/simulation-table";
import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import { TModuleStructure } from "@/types/modules";
import { TSimulation } from "@/types/projects";
import { AddModuleFormSchema } from "@/validators/addModule.validator";
import { useQuery } from "@tanstack/react-query";
// import { mockSimulation } from '@/utils/mockSimulation'
import { createFileRoute } from "@tanstack/react-router";
import { t } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const MODULE_SIMULATIONS = "@module/simulations";
const UNIT_MODULES = "@unit/modules";

export const Route = createFileRoute(
  "/_private/projects/$projectId/$unitId/$moduleId/"
)({
  component: RouteComponent,
  staleTime: 1000 * 60 * 5,
  preloadStaleTime: 1000 * 60 * 5,

  loader: async ({ params, context: { queryClient } }) => {
    const { moduleId } = params;
    if (!moduleId) {
      throw new Error("Module ID is required");
    }

    await queryClient.ensureQueryData({
      queryKey: ["modules", params.projectId, params.unitId],
      queryFn: () => getModule(params.projectId, params.unitId, moduleId),
    });

    return {
      crumb: t("common.crumbs.simulations"),
      simulations: [],
      globalSims: [],
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();

  const { projectId, unitId, moduleId } = Route.useParams();

  const navigate = Route.useNavigate();

  const search = Route.useSearch();
  const { simulationId } = search as { simulationId: string };

  const { data } = useQuery({
    queryKey: ["modules", projectId, unitId],
    queryFn: () => getModule(projectId, unitId, moduleId),
  });

  const modules = data?.data.versions || [];

  const handleClickSimulation = (simulationId: string) => {
    void navigate({
      to: "/projects/$projectId/$unitId/$moduleId",
      search: {
        simulationId,
      },
    });
  };

  const handleSetValidVersion = (simulationId: string) => {
    // setSims((prev) => {
    //   const newSims = prev.map((sim) => {
    //     if (sim.version === +simulationId) {
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

  const [selectedSimulations, setSelectedSimulations] = useState<
    TSimulation["version"][]
  >([]);

  const handleSelectRow = (simulationId: number) => {
    if (new Set(selectedSimulations).has(simulationId)) {
      setSelectedSimulations((prev) =>
        prev.filter((id) => id !== simulationId)
      );
      return;
    }
    setSelectedSimulations([...selectedSimulations, +simulationId]);
  };

  const handleAddNewSimulation = (data: AddModuleFormSchema) => {
    // const lastSimulation = sims[sims.length - 1] || globalSims[12].data;
    // const newSimulation = {
    //   name: data.tipoDeEstrutura,
    //   version: String(sims.length + 1),
    //   created_at: new Date().toISOString(),
    //   updated_at: new Date().toISOString(),
    //   data: genRowData2(lastSimulation?.data.green || null),
    //   isValid: false,
    // } as TSimulation;
    // setSims((prev) => {
    //   const newSims = [...prev, newSimulation];
    //   setToStorage(
    //     `${MODULE_SIMULATIONS}/${params.projectId}/${params.unitId}/${params.moduleId}`,
    //     newSims
    //   );
    //   return [...prev, newSimulation];
    // });
  };

  const totalCO2Max = modules.reduce((sum, sim) => sum + sim.co2_max, 0);
  const totalCO2Min = modules.reduce((sum, sim) => sum + sim.co2_min, 0);

  let co2Accum = 0;

  const maxCo2DataPoints = modules.map((sim: TSimulation) => {
    return {
      x: sim.co2_max,
      y: sim.co2_max / totalCO2Max,
      fill: selectedSimulations.includes(sim.version),
      label: sim.version ? `n${sim.version}` : undefined,
      isGlobal: false,
    };
  });
  const minCo2DataPoints = modules.map((sim: TSimulation) => {
    return {
      x: sim.co2_min,
      y: sim.co2_min / totalCO2Min,
      fill: selectedSimulations.includes(sim.version),
      label: sim.version ? `v${sim.version}` : undefined,
      isGlobal: false,
    };
  });
  const dataPoints: Record<"green" | "grey", DataPoint[]> = {
    green: minCo2DataPoints,
    grey: maxCo2DataPoints,
  };

  console.log("dataPoints", dataPoints);

  return (
    <div className="flex flex-col gap-4">
      <CustomBanner
        description={t("simulations.description")}
        image=""
        title={t("simulations.title")}
      />
      <div className="border-b" />
      <div className="flex justify-end gap-4">
        {/* <Button variant='outline' onClick={() => console.log('add simulation')}>
          Atribuir Acesso
        </Button>
        <Button variant='noStyles' onClick={() => console.log('add report')}>
          Adicionar Relatório
        </Button> */}
        <DrawerFormModule
          triggerComponent={
            <Button
              size="sm"
              variant="noStyles"
              className="flex items-center gap-2"
            >
              {t("drawerFormModule.createButtonTrigger")}
            </Button>
          }
          projectId={projectId}
          unitId={unitId}
          moduleId={moduleId}
          structureType={modules[0].structure_type}
          formData={modules[modules.length - 1] as unknown as TModuleStructure}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 min-xl:grid-cols-2">
        <SimulationTable
          key={modules.length + 1}
          simulations={modules}
          onClickSimulation={handleClickSimulation}
          onClickSetValidVersion={handleSetValidVersion}
          selectedSimulations={selectedSimulations}
          setSelectedSimulations={setSelectedSimulations}
          onCheckSimulation={handleSelectRow}
        />
        {
          <Chart
            filledPoints={+simulationId || 0}
            key={simulationId}
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
