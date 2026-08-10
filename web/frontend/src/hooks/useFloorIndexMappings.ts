import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TTowerFloorCategory } from "@/types/units";
import {
  IGetUnitByUUIDCachedResponse,
  IRawModuleDataWithMeta,
  TEditingModuleMerged,
  TIfcStepperCreatedUnit,
  TIfcStepperState,
} from "@/types/ifc";
import {
  convertFloorFormInputToTowerFloors,
  mapFloorIndexToFloorIds,
} from "@/utils/unitConversions";
import { UnitFormInput } from "@/validators/unitForm.validator";

interface UseFloorIndexMappingsArgs {
  state: TIfcStepperState;
  isSimulationMode: boolean;
  simulationBoundUnitTempId: string;
  simulationUnitData: IGetUnitByUUIDCachedResponse | undefined;
  projectId: string;
  simulationCreatedUnit: TIfcStepperCreatedUnit | null;
  editingUnitTempId: string | null;
  editingModuleTempId: string | null;
}

export function useFloorIndexMappings({
  state,
  isSimulationMode,
  simulationBoundUnitTempId,
  simulationUnitData,
  projectId,
  simulationCreatedUnit,
  editingUnitTempId,
  editingModuleTempId,
}: UseFloorIndexMappingsArgs) {
  const queryClient = useQueryClient();

  const editingUnit = state.units.find((u) => u.tempId === editingUnitTempId);
  const editingModule = state.modules.find(
    (m) => m.tempId === editingModuleTempId,
  );

  const editingModuleBoundUnit = useMemo<
    TIfcStepperCreatedUnit | undefined
  >(() => {
    if (!editingModule?.boundUnitTempId) return undefined;
    const tempId = editingModule.boundUnitTempId;
    const inCreated = state.unitsCreated.find((u) => u.tempId === tempId);
    if (inCreated) return inCreated;

    const inStateUnits = state.units.find((u) => u.tempId === tempId);
    if (inStateUnits) {
      return {
        tempId: inStateUnits.tempId,
        unitName: inStateUnits.name ?? "",
        optionId: null,
        unitId: null,
        reusedExisting: false,
      } as unknown as TIfcStepperCreatedUnit;
    }

    if (isSimulationMode && simulationCreatedUnit) {
      return simulationCreatedUnit;
    }
    return undefined;
  }, [
    editingModule?.boundUnitTempId,
    state.unitsCreated,
    state.units,
    isSimulationMode,
    simulationCreatedUnit,
  ]);

  const normalizedUnitsFloorMap: Map<string, TTowerFloorCategory[]> =
    useMemo(() => {
      const map = new Map<string, TTowerFloorCategory[]>();
      for (const unitCreated of state.unitsCreated) {
        let floors: TTowerFloorCategory[] = [];
        const tempId = unitCreated.tempId;

        if (isSimulationMode && tempId === simulationBoundUnitTempId) {
          const f = simulationUnitData?.data?.unit?.floors;
          if (f && f.length > 0) {
            floors = f as TTowerFloorCategory[];
          }
        }

        if (floors.length === 0) {
          const unitState = state.units.find((u) => u.tempId === tempId);
          const rawFloors = unitState?.formData?.data?.floors ?? [];
          if (rawFloors.length > 0) {
            floors = convertFloorFormInputToTowerFloors(
              rawFloors as unknown as UnitFormInput["data"]["floors"],
            );
          }
        }

        if (floors.length === 0 && unitCreated.unitName) {
          const unitState = state.units.find(
            (u) => u.name && u.name === unitCreated.unitName,
          );
          const rawFloors = unitState?.formData?.data?.floors ?? [];
          if (rawFloors.length > 0) {
            floors = convertFloorFormInputToTowerFloors(
              rawFloors as unknown as UnitFormInput["data"]["floors"],
            );
          }
        }

        if (floors.length === 0 && unitCreated.unitId && !isSimulationMode) {
          try {
            const cached = queryClient.getQueryData([
              "unit",
              projectId,
              unitCreated.unitId,
            ]) as IGetUnitByUUIDCachedResponse | undefined;
            const cachedFloors = cached?.data?.unit?.floors;
            if (cachedFloors && Array.isArray(cachedFloors)) {
              floors = cachedFloors as TTowerFloorCategory[];
            }
          } catch (_e) {
            /* ignore */
          }
        }

        map.set(tempId, floors);
      }

      if (!isSimulationMode && state.units.length > 0) {
        for (const unitState of state.units) {
          if (map.has(unitState.tempId)) continue;
          const rawFloors = unitState.formData?.data?.floors ?? [];
          if (rawFloors.length === 0) {
            map.set(unitState.tempId, []);
            continue;
          }
          const tower = convertFloorFormInputToTowerFloors(
            rawFloors as unknown as UnitFormInput["data"]["floors"],
          );
          map.set(unitState.tempId, tower);
        }
      }

      return map;
    }, [
      state.unitsCreated,
      state.units,
      isSimulationMode,
      simulationBoundUnitTempId,
      simulationUnitData,
      queryClient,
      projectId,
    ]);

  const editingUnitFloors: TTowerFloorCategory[] = useMemo(() => {
    if (!editingModuleBoundUnit) {
      const firstWithFloors = Array.from(normalizedUnitsFloorMap.values()).find(
        (arr) => arr.length > 0,
      );
      return firstWithFloors ?? [];
    }
    const tempId = editingModuleBoundUnit.tempId;
    const fromMap = normalizedUnitsFloorMap.get(tempId);
    if (fromMap && fromMap.length > 0) return fromMap;

    if (editingModuleBoundUnit.unitId) {
      if (editingModuleBoundUnit.unitName) {
        const unitState = state.units.find(
          (u) => u.name === editingModuleBoundUnit!.unitName,
        );
        const raw = unitState?.formData?.data?.floors ?? [];
        if (raw.length > 0) {
          return convertFloorFormInputToTowerFloors(
            raw as unknown as UnitFormInput["data"]["floors"],
          );
        }
      }
      try {
        const cached = queryClient.getQueryData([
          "unit",
          projectId,
          editingModuleBoundUnit.unitId,
        ]) as IGetUnitByUUIDCachedResponse | undefined;
        const cachedFloors = cached?.data?.unit?.floors;
        if (
          cachedFloors &&
          Array.isArray(cachedFloors) &&
          cachedFloors.length > 0
        ) {
          return cachedFloors as TTowerFloorCategory[];
        }
      } catch (_e) {
        /* ignore */
      }
    }
    return fromMap ?? [];
  }, [
    editingModuleBoundUnit,
    normalizedUnitsFloorMap,
    state.units,
    queryClient,
    projectId,
  ]);

  const editingModuleInitialSelectedFloors: string[] = useMemo(() => {
    if (!editingModule) return [];
    const rawIndex = (
      editingModule.raw?.data as unknown as IRawModuleDataWithMeta
    )?.floor_index;
    return mapFloorIndexToFloorIds(rawIndex, editingUnitFloors);
  }, [editingModule, editingUnitFloors]);

  const editingModuleInitialMerged: TEditingModuleMerged = useMemo(() => {
    if (!editingModule?.raw?.data) return {} as TEditingModuleMerged;
    return {
      ...(editingModule.raw.data as unknown as IRawModuleDataWithMeta),
      floor_ids: editingModuleInitialSelectedFloors,
    } as TEditingModuleMerged;
  }, [editingModule, editingModuleInitialSelectedFloors]);

  return {
    editingUnit,
    editingModule,
    editingModuleBoundUnit,
    normalizedUnitsFloorMap,
    editingUnitFloors,
    editingModuleInitialSelectedFloors,
    editingModuleInitialMerged,
  };
}
