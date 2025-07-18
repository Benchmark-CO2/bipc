import { getProjectByUUID } from "@/actions/projects/getProject";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { ModuleTable, ModuleTotalsSummary } from "@/components/layout";
import { TModuleData } from "@/types/projects";
import { IModuleItem } from "@/types/modules";
import {
  createFileRoute,
  useLoaderData,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_private/projects/$projectId/$unitId/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const { unitId, projectId } = params as {
      unitId: string;
      projectId: string;
    };

    if (!projectId) {
      throw new Error("Project ID is required");
    }
    const { data } = await getProjectByUUID(projectId);
    const project = data.project;

    const { data: unitData } = await getUnitByUUID(projectId, unitId);
    console.log(unitData);

    // const units = getFromStorage(
    //   `${UNIT_MODULES}/${projectId}`,
    //   {} as TProjectUnitModule
    // );

    return {
      unit: unitData.unit,
      project,
    };
  },
});

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/projects/$projectId/$unitId/",
  });

  const { unit } = useLoaderData({
    from: "/_private/projects/$projectId/$unitId/",
  });

  const modules = {
    beamColumn: unit?.beam_column_modules || [],
    concreteWall: unit?.concrete_wall_modules || [],
    structuralMasonry: unit?.structural_masonry_modules || [],
  };

  const [selectedModules, setSelectedModules] = useState<{
    concrete_wall: IModuleItem[];
    beam_column: IModuleItem[];
    structural_masonry: IModuleItem[];
  }>({
    concrete_wall: [],
    beam_column: [],
    structural_masonry: [],
  });

  const handleSelectionChange =
    (tableId: "concrete_wall" | "beam_column" | "structural_masonry") =>
    (modules: IModuleItem[]) => {
      setSelectedModules((prev) => ({
        ...prev,
        [tableId]: modules,
      }));
    };

  const allSelectedModules = [
    ...selectedModules.concrete_wall,
    ...selectedModules.beam_column,
    ...selectedModules.structural_masonry,
  ];

  useEffect(() => {
    document.title = "BIPC / Tecnologia Construtiva";
  }, []);

  // const handleAddNewModule = (data: AddModuleFormSchema) => {
  //   if (
  //     mods.find(
  //       (el) =>
  //         el.nome === data.nome && el.tipoDeEstrutura === data.tipoDeEstrutura
  //     )
  //   ) {
  //     toast.error("Esse elemento ja existe na unidade");
  //     return;
  //   }
  //   const formatData = {
  //     ...data,
  //     // data: typeof data.data === 'string' ? data.data : data.data instanceof Date ? data.data.toISOString() : '',
  //     module_uuid: String(mods.length + 1),
  //     version: "1",
  //     consumoDeAco: (() => {
  //       switch (data.tipoDeEstrutura) {
  //         case "concreteWall":
  //           return (
  //             Math.round((Math.random() * (6.33 - 0.79) + 0.79) * 100) / 100
  //           );
  //         case "masonry":
  //           return Math.round((Math.random() * (80 - 15) + 15) * 100) / 100; // 15-80kg
  //         case "beamColumn":
  //           return (
  //             Math.round((Math.random() * (127.78 - 26.54) + 26.54) * 100) / 100
  //           );
  //         default:
  //           return Math.round((Math.random() * 50 + 10) * 100) / 100;
  //       }
  //     })(),
  //     consumoDeConcreto: (() => {
  //       switch (data.tipoDeEstrutura) {
  //         case "concreteWall":
  //           return (
  //             Math.round((Math.random() * (1.73 - 0.16) + 0.16) * 100) / 100
  //           );
  //         case "masonry":
  //           return Math.round((Math.random() * (2.5 - 0.8) + 0.8) * 100) / 100; // 0.8-2.5m³
  //         case "beamColumn":
  //           return (
  //             Math.round((Math.random() * (1.29 - 0.27) + 0.27) * 100) / 100
  //           );
  //         default:
  //           return Math.round((Math.random() * 2 + 0.5) * 100) / 100;
  //       }
  //     })(),
  //     emissaoDeCo2: Math.round((Math.random() * (190 - 80) + 80) * 100) / 100,
  //     energia: Math.round((Math.random() * (1200 - 400) + 400) * 100) / 100,
  //   } as TModuleData;

  //   const units = getFromStorage(
  //     `${UNIT_MODULES}/${projectId}`,
  //     {} as TProjectUnitModule
  //   );
  //   setMods((prev) => {
  //     const newMods = [...prev, formatData];
  //     setToStorage(`${UNIT_MODULES}/${projectId}`, {
  //       ...units,
  //       [unitId]: newMods,
  //     });
  //     return newMods;
  //   });
  // };

  const handleUpdateModule = (module: TModuleData) => {
    console.log("Updating module:", module);
    // const units = getFromStorage(
    //   `${UNIT_MODULES}/${projectId}`,
    //   {} as TProjectUnitModule
    // );
    // setMods((prev) => {
    //   const newMods = prev.map((mod) =>
    //     mod.module_uuid === module.module_uuid ? module : mod
    //   );
    //   setToStorage(`${UNIT_MODULES}/${projectId}`, {
    //     ...units,
    //     [unitId]: newMods,
    //   });
    //   return newMods;
    // });
  };

  const handleDeleteModule = (moduleId: string) => {
    console.log("Deleting module with ID:", moduleId);
    // const units = getFromStorage(
    //   `${UNIT_MODULES}/${projectId}`,
    //   {} as TProjectUnitModule
    // );
    // setMods((prev) => {
    //   const newMods = prev.filter((mod) => mod.module_uuid !== moduleId);
    //   setToStorage(`${UNIT_MODULES}/${projectId}`, {
    //     ...units,
    //     [unitId]: newMods,
    //   });
    //   return newMods;
    // });
  };

  return (
    <div className="flex flex-col gap-4">
      <ModuleTotalsSummary selectedModules={allSelectedModules} />
      <ModuleTable
        key={`${JSON.stringify(modules.concreteWall)}`}
        tableId="concrete_wall"
        modules={modules.concreteWall}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
        handleDeleteModule={handleDeleteModule}
        onSelectionChange={handleSelectionChange("concrete_wall")}
      />
      <ModuleTable
        key={`${JSON.stringify(modules.beamColumn)}`}
        tableId="beam_column"
        modules={modules.beamColumn}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
        handleDeleteModule={handleDeleteModule}
        onSelectionChange={handleSelectionChange("beam_column")}
      />
      <ModuleTable
        key={`${JSON.stringify(modules.structuralMasonry)}`}
        tableId="structural_masonry"
        modules={modules.structuralMasonry}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
        handleDeleteModule={handleDeleteModule}
        onSelectionChange={handleSelectionChange("structural_masonry")}
      />
    </div>
  );
}
