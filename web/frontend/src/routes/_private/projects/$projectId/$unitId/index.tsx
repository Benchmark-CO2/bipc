import { getProjectByUUID } from "@/actions/projects/getProject";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { ModuleTable, ModuleTotalsSummary } from "@/components/layout";
import { TModuleData } from "@/types/projects";
import { IModuleItem } from "@/types/modules";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_private/projects/$projectId/$unitId/")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const { projectId, unitId } = params;
    if (!projectId || !unitId) {
      throw new Error("Project ID and Unit ID are required");
    }

    await context.queryClient.ensureQueryData({
      queryKey: ["project", projectId],
      queryFn: () => getProjectByUUID(projectId),
    });

    await context.queryClient.ensureQueryData({
      queryKey: ["unit", projectId, unitId],
      queryFn: () => getUnitByUUID(projectId, unitId),
    });

    return null;
  },
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const { projectId, unitId } = useParams({
    from: "/_private/projects/$projectId/$unitId/",
  });

  // Use React Query to keep data fresh, but use loader data as fallback
  const { data: unitData } = useQuery({
    queryKey: ["unit", projectId, unitId],
    queryFn: () => getUnitByUUID(projectId, unitId),
    enabled: !!projectId && !!unitId,
  });
  const unit = unitData?.data?.unit;

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

  // Reset selected modules when unitId changes
  useEffect(() => {
    setSelectedModules({
      concrete_wall: [],
      beam_column: [],
      structural_masonry: [],
    });
  }, [unitId]);

  const handleSelectionChange = useCallback(
    (tableId: "concrete_wall" | "beam_column" | "structural_masonry") => {
      return (modules: IModuleItem[]) => {
        setSelectedModules((prev) => ({
          ...prev,
          [tableId]: modules,
        }));
      };
    },
    []
  );

  const allSelectedModules = useMemo(
    () => [
      ...selectedModules.concrete_wall,
      ...selectedModules.beam_column,
      ...selectedModules.structural_masonry,
    ],
    [selectedModules]
  );

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

  const handleUpdateModule = useCallback(
    (module: TModuleData) => {
      console.log("Updating module:", module);
      // Add your update logic here
      // After successful update, invalidate the query to refetch data
      queryClient.invalidateQueries({
        queryKey: ["unit", projectId, unitId],
      });
    },
    [queryClient, projectId, unitId]
  );

  const handleDeleteModule = useCallback(
    (moduleId: string) => {
      console.log("Deleting module with ID:", moduleId);
      // Add your delete logic here
      // After successful deletion, invalidate the query to refetch data
      queryClient.invalidateQueries({
        queryKey: ["unit", projectId, unitId],
      });
    },
    [queryClient, projectId, unitId]
  );

  // Memoize selection handlers to prevent unnecessary re-renders
  const concreteWallSelectionHandler = useMemo(
    () => handleSelectionChange("concrete_wall"),
    [handleSelectionChange]
  );

  const beamColumnSelectionHandler = useMemo(
    () => handleSelectionChange("beam_column"),
    [handleSelectionChange]
  );

  const structuralMasonrySelectionHandler = useMemo(
    () => handleSelectionChange("structural_masonry"),
    [handleSelectionChange]
  );

  return (
    <div className="flex flex-col gap-4">
      <ModuleTotalsSummary selectedModules={allSelectedModules} />
      <ModuleTable
        key={`concrete_wall-${unitId}`}
        tableId="concrete_wall"
        modules={modules.concreteWall}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
        handleDeleteModule={handleDeleteModule}
        onSelectionChange={concreteWallSelectionHandler}
      />
      <ModuleTable
        key={`beam_column-${unitId}`}
        tableId="beam_column"
        modules={modules.beamColumn}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
        handleDeleteModule={handleDeleteModule}
        onSelectionChange={beamColumnSelectionHandler}
      />
      <ModuleTable
        key={`structural_masonry-${unitId}`}
        tableId="structural_masonry"
        modules={modules.structuralMasonry}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
        handleDeleteModule={handleDeleteModule}
        onSelectionChange={structuralMasonrySelectionHandler}
      />
    </div>
  );
}
