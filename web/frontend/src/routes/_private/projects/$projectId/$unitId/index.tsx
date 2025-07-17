import { getProjectByUUID } from "@/actions/projects/getProject";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { ModuleTable, ModuleTotalsSummary } from "@/components/layout";
import { IModuleItem } from "@/types/modules";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

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
  const [selectedModules, setSelectedModules] = useState<{
    concrete_wall: IModuleItem[];
    beam_column: IModuleItem[];
    structural_masonry: IModuleItem[];
  }>({
    concrete_wall: [],
    beam_column: [],
    structural_masonry: [],
  });

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
        onSelectionChange={concreteWallSelectionHandler}
      />
      <ModuleTable
        key={`beam_column-${unitId}`}
        tableId="beam_column"
        modules={modules.beamColumn}
        projectId={projectId}
        unitId={unitId}
        onSelectionChange={beamColumnSelectionHandler}
      />
      <ModuleTable
        key={`structural_masonry-${unitId}`}
        tableId="structural_masonry"
        modules={modules.structuralMasonry}
        projectId={projectId}
        unitId={unitId}
        onSelectionChange={structuralMasonrySelectionHandler}
      />
    </div>
  );
}
