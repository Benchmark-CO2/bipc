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
  getCategoryFromIndex,
  mapFloorIndexToFloorIds,
} from "@/utils/unitConversions";
import { UnitFormInput } from "@/validators/unitForm.validator";

const inferTowerFloorsFromModuleFloorIndexes = (
  modules: TIfcStepperState["modules"],
  restrictToTempId?: string | null,
): TTowerFloorCategory[] => {
  const seenIndex = new Set<number>();
  const collected: Array<{
    index: number;
  }> = [];
  for (const m of modules) {
    if (restrictToTempId && m.boundUnitTempId !== restrictToTempId) continue;
    const rawData = m.raw?.data as unknown as IRawModuleDataWithMeta | null;
    const idx = rawData?.floor_index;
    if (idx === undefined || idx === null) continue;
    const numeric = Number(idx);
    if (!Number.isFinite(numeric)) continue;
    if (seenIndex.has(numeric)) continue;
    seenIndex.add(numeric);
    collected.push({ index: numeric });
  }
  collected.sort((a, b) => a.index - b.index);
  return collected.map((item) => {
    const category = getCategoryFromIndex(item.index);
    const defaultArea = 100;
    const defaultHeight = 3;
    let floorGroup: string;
    if (category === "basement_floor") {
      floorGroup = `Subsolo ${Math.abs(item.index)}`;
    } else if (category === "ground_floor") {
      floorGroup = "Térreo";
    } else if (category === "penthouse_floor") {
      floorGroup = "Cobertura";
    } else {
      floorGroup = `Andar ${item.index}`;
    }
    return {
      id: `inferred-floor-${item.index}`,
      floor_group: floorGroup,
      group_id: floorGroup,
      group_name: floorGroup,
      area: defaultArea,
      height: defaultHeight,
      index: item.index,
      category,
    };
  });
};

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

  const editingModuleBoundUnit: TIfcStepperCreatedUnit | undefined = (() => {
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

    if (
      isSimulationMode &&
      simulationCreatedUnit &&
      tempId === simulationBoundUnitTempId
    ) {
      return simulationCreatedUnit;
    }
    return undefined;
  })();

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

        if (floors.length === 0) {
          floors = inferTowerFloorsFromModuleFloorIndexes(
            state.modules,
            tempId,
          );
        }

        map.set(tempId, floors);
      }

      if (!isSimulationMode && state.units.length > 0) {
        for (const unitState of state.units) {
          if (map.has(unitState.tempId)) continue;
          const rawFloors = unitState.formData?.data?.floors ?? [];
          if (rawFloors.length === 0) {
            const fallback = inferTowerFloorsFromModuleFloorIndexes(
              state.modules,
              unitState.tempId,
            );
            map.set(unitState.tempId, fallback);
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
      state.modules,
      isSimulationMode,
      simulationBoundUnitTempId,
      simulationUnitData,
      queryClient,
      projectId,
    ]);

  const editingUnitFloors: TTowerFloorCategory[] = (() => {
    const directTempId = editingModule?.boundUnitTempId;
    if (directTempId) {
      const direct = normalizedUnitsFloorMap.get(directTempId);
      if (direct && direct.length > 0) return direct;
    }

    if (editingModuleBoundUnit) {
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
      if (fromMap && fromMap.length > 0) return fromMap;
      const inferredBound = inferTowerFloorsFromModuleFloorIndexes(
        state.modules,
        editingModuleBoundUnit.tempId,
      );
      if (inferredBound.length > 0) return inferredBound;
    }

    if (editingModule) {
      const onlyCurrent: TIfcStepperState["modules"] = [editingModule];
      const onlyCurrentInferred =
        inferTowerFloorsFromModuleFloorIndexes(onlyCurrent);
      if (onlyCurrentInferred.length > 0) return onlyCurrentInferred;

      if (editingModule.boundUnitTempId) {
        const sameTempId = state.modules.filter(
          (m) => m.boundUnitTempId === editingModule.boundUnitTempId,
        );
        const sameTempIdInferred =
          inferTowerFloorsFromModuleFloorIndexes(sameTempId);
        if (sameTempIdInferred.length > 0) return sameTempIdInferred;
      }
    }

    return [];
  })();

  const editingModuleInitialSelectedFloors: string[] = useMemo(() => {
    if (!editingModule) return [];
    const rawDataMaybe = editingModule.raw
      ?.data as unknown as IRawModuleDataWithMeta | null;
    const candidateFloorIds = rawDataMaybe?.floor_ids;
    if (
      Array.isArray(candidateFloorIds) &&
      candidateFloorIds.length > 0 &&
      candidateFloorIds.every((s) => typeof s === "string")
    ) {
      return candidateFloorIds as string[];
    }
    const rawIndex = rawDataMaybe?.floor_index;
    return mapFloorIndexToFloorIds(rawIndex, editingUnitFloors);
  }, [editingModule, editingUnitFloors]);

  const editingModuleInitialMerged: TEditingModuleMerged = useMemo(() => {
    if (!editingModule?.raw?.data) return {} as TEditingModuleMerged;
    const base = editingModule.raw.data as unknown as IRawModuleDataWithMeta;
    return {
      ...(base as unknown as TEditingModuleMerged),
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
