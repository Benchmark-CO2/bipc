import { getProjectByUUID } from "@/actions/projects/getProject";
import { getUnitByUUID } from "@/actions/units/getUnit";
import {
  DrawerFormModule,
  ModuleTotalsSummary,
  ModuleFilter,
  DraggableModuleTable,
} from "@/components/layout";
import { IModuleItem, TModulesTypes } from "@/types/modules";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import NotFoundList from "@/components/ui/not-found-list";
import { Button } from "@/components/ui/button";
import type { ModuleFilterState } from "@/components/layout/module-filter";

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

  // Estado para controlar a filtragem e ordenação dos módulos
  const [moduleFilterState, setModuleFilterState] = useState<ModuleFilterState>(
    {
      visibleModules: new Set<TModulesTypes>([
        "concrete_wall",
        "beam_column",
        "structural_masonry",
      ]),
      moduleOrder: ["concrete_wall", "beam_column", "structural_masonry"],
    }
  );

  // Estado para drag and drop
  const [draggedModule, setDraggedModule] = useState<TModulesTypes | null>(
    null
  );

  const { t } = useTranslation();
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

  const handleSelectionChange = useCallback((tableId: TModulesTypes) => {
    return (modules: IModuleItem[]) => {
      setSelectedModules((prev) => ({
        ...prev,
        [tableId]: modules,
      }));
    };
  }, []);

  const allSelectedModules = useMemo(
    () => [
      ...selectedModules.concrete_wall,
      ...selectedModules.beam_column,
      ...selectedModules.structural_masonry,
    ],
    [selectedModules]
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

  // Reset selected modules when unitId changes
  useEffect(() => {
    setSelectedModules({
      concrete_wall: [],
      beam_column: [],
      structural_masonry: [],
    });
  }, [unitId]);

  // Preparar dados dos módulos disponíveis para o filtro
  const availableModules = useMemo(() => {
    return [
      {
        type: "concrete_wall" as TModulesTypes,
        count: modules.concreteWall.length,
        disabled: modules.concreteWall.length === 0,
      },
      {
        type: "beam_column" as TModulesTypes,
        count: modules.beamColumn.length,
        disabled: modules.beamColumn.length === 0,
      },
      {
        type: "structural_masonry" as TModulesTypes,
        count: modules.structuralMasonry.length,
        disabled: modules.structuralMasonry.length === 0,
      },
    ];
  }, [
    modules.concreteWall.length,
    modules.beamColumn.length,
    modules.structuralMasonry.length,
  ]);

  // Função para obter os dados do módulo baseado no tipo
  const getModuleData = useCallback(
    (moduleType: TModulesTypes) => {
      switch (moduleType) {
        case "concrete_wall":
          return modules.concreteWall;
        case "beam_column":
          return modules.beamColumn;
        case "structural_masonry":
          return modules.structuralMasonry;
        default:
          return [];
      }
    },
    [modules]
  );

  // Função para obter o handler de seleção baseado no tipo
  const getSelectionHandler = useCallback(
    (moduleType: TModulesTypes) => {
      switch (moduleType) {
        case "concrete_wall":
          return concreteWallSelectionHandler;
        case "beam_column":
          return beamColumnSelectionHandler;
        case "structural_masonry":
          return structuralMasonrySelectionHandler;
        default:
          return () => {};
      }
    },
    [
      concreteWallSelectionHandler,
      beamColumnSelectionHandler,
      structuralMasonrySelectionHandler,
    ]
  );

  // Funções de drag and drop
  const handleDragStart = useCallback((moduleType: TModulesTypes) => {
    setDraggedModule(moduleType);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetModuleType: TModulesTypes) => {
      e.preventDefault();

      if (!draggedModule || draggedModule === targetModuleType) {
        setDraggedModule(null);
        return;
      }

      const newOrder = [...moduleFilterState.moduleOrder];
      const draggedIndex = newOrder.indexOf(draggedModule);
      const targetIndex = newOrder.indexOf(targetModuleType);

      // Remove o item da posição original
      newOrder.splice(draggedIndex, 1);
      // Insere na nova posição
      newOrder.splice(targetIndex, 0, draggedModule);

      setModuleFilterState((prev) => ({
        ...prev,
        moduleOrder: newOrder,
      }));

      setDraggedModule(null);
    },
    [draggedModule, moduleFilterState.moduleOrder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedModule(null);
  }, []);

  useEffect(() => {
    document.title = `BIPC / ${t("units.title")}`;
  }, [t]);

  if (
    modules.concreteWall.length === 0 &&
    modules.beamColumn.length === 0 &&
    modules.structuralMasonry.length === 0
  ) {
    return (
      <div className="flex flex-col gap-4">
        <NotFoundList
          message={t("modulesTable.noItemsFound")}
          description={
            <>
              {t("modulesTable.addNewTechnology")}
              <br />
              <DrawerFormModule
                triggerComponent={
                  <Button
                    size="sm"
                    variant="bipc"
                    className="flex items-center gap-2 mx-auto mt-2"
                  >
                    {t("drawerFormModule.createButtonTrigger")}
                  </Button>
                }
                projectId={projectId}
                unitId={unitId}
                type={"concrete_wall"}
              />
            </>
          }
          icon="file"
          showIcon={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ModuleTotalsSummary selectedModules={allSelectedModules} />

      <ModuleFilter
        availableModules={availableModules}
        filterState={moduleFilterState}
        onFilterChange={setModuleFilterState}
      />

      <div className="space-y-4">
        {moduleFilterState.moduleOrder
          .filter(
            (moduleType) =>
              moduleFilterState.visibleModules.has(moduleType) &&
              getModuleData(moduleType).length > 0
          )
          .map((moduleType) => (
            <DraggableModuleTable
              key={`${moduleType}-${unitId}`}
              tableId={moduleType}
              modules={getModuleData(moduleType)}
              projectId={projectId}
              unitId={unitId}
              onSelectionChange={getSelectionHandler(moduleType)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragging={draggedModule === moduleType}
            />
          ))}
      </div>
    </div>
  );
}
