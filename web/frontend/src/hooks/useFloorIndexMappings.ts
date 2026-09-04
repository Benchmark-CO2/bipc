import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
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
  FloorFallbackLabels,
  makeFloorFallbackLabels,
} from "@/utils/unitConversions";
import { UnitFormInput } from "@/validators/unitForm.validator";

const inferTowerFloorsFromModuleFloorIndexes = (
  modules: TIfcStepperState["modules"],
  restrictToTempId?: string | null,
  labels?: FloorFallbackLabels,
): TTowerFloorCategory[] => {
  const defaultLabels: FloorFallbackLabels = labels ?? {
    ground: "Ground",
    penthouse: "Penthouse",
    basementOnly: "Basement",
    basementNumbered: (n) => `Basement ${n}`,
    standardOrdinalPositive: (n) => `${n}º Floor`,
    standardNumbered: (n) => `Floor ${n}`,
  };
  const seenIndex = new Set<number>();
  const collected: Array<{
    index: number;
  }> = [];
  for (const m of modules) {
    if (restrictToTempId && m.boundUnitTempId !== restrictToTempId) continue;
    const rawData = m.raw?.data as unknown as IRawModuleDataWithMeta | null;
    const idx = rawData?.floor_index;
    if (idx === undefined || idx === null) continue;
    const indexes: number[] = Array.isArray(idx) ? idx : [idx];
    for (const single of indexes) {
      const numeric = Number(single);
      if (!Number.isFinite(numeric)) continue;
      if (seenIndex.has(numeric)) continue;
      seenIndex.add(numeric);
      collected.push({ index: numeric });
    }
  }
  if (collected.length === 0) return [];
  collected.sort((a, b) => a.index - b.index);
  const indices = collected.map((c) => c.index);
  const minIdx = Math.min(...indices);
  const maxIdx = Math.max(...indices);

  return collected.map((item) => {
    let category: TTowerFloorCategory["category"];
    if (item.index < 0) {
      category = "basement_floor";
    } else if (item.index === minIdx && minIdx === maxIdx) {
      category = "standard_floor";
    } else if (item.index === minIdx) {
      category = "ground_floor";
    } else if (item.index === maxIdx) {
      category = "penthouse_floor";
    } else {
      category = "standard_floor";
    }
    const defaultArea = 100;
    const defaultHeight = 3;
    let floorGroup: string;
    if (category === "basement_floor") {
      const n = Math.abs(item.index);
      floorGroup =
        n > 0 ? defaultLabels.basementNumbered(n) : defaultLabels.basementOnly;
    } else if (category === "ground_floor") {
      floorGroup = defaultLabels.ground;
    } else if (category === "penthouse_floor") {
      floorGroup = defaultLabels.penthouse;
    } else if (item.index >= 0) {
      floorGroup = defaultLabels.standardOrdinalPositive(item.index);
    } else {
      floorGroup = defaultLabels.standardNumbered(item.index);
    }
    return {
      id: `inferred-floor-${item.index}`,
      floor_group: floorGroup,
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
  const { t } = useTranslation();

  const inferLabels: FloorFallbackLabels = makeFloorFallbackLabels({
    ground: t.buildingVisualizer.fallbackNames.ground,
    penthouse: t.buildingVisualizer.fallbackNames.penthouse,
    basementOnly: t.buildingVisualizer.fallbackNames.basementOnly,
    basementNumberedTemplate:
      t.buildingVisualizer.fallbackNames.basementNumbered,
    standardOrdinalPositiveTemplate:
      t.buildingVisualizer.fallbackNames.standardOrdinalPositive,
    standardNumberedTemplate:
      t.buildingVisualizer.fallbackNames.standardNumbered,
  });

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

        if (floors.length === 0 && unitCreated.unitId && !isSimulationMode) {
          try {
            const cached = queryClient.getQueryData([
              "unit",
              projectId,
              unitCreated.unitId,
            ]) as IGetUnitByUUIDCachedResponse | undefined;
            const cachedFloors = cached?.data?.unit?.floors;
            if (
              cachedFloors &&
              Array.isArray(cachedFloors) &&
              cachedFloors.length > 0
            ) {
              floors = cachedFloors as TTowerFloorCategory[];
            }
          } catch (_e) {
            /* ignore */
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

        if (floors.length === 0) {
          floors = inferTowerFloorsFromModuleFloorIndexes(
            state.modules,
            tempId,
            inferLabels,
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
              inferLabels,
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

      if (isSimulationMode && simulationBoundUnitTempId) {
        if (!map.has(simulationBoundUnitTempId)) {
          let simFloors: TTowerFloorCategory[] = [];
          const f = simulationUnitData?.data?.unit?.floors;
          if (f && f.length > 0) {
            simFloors = f as TTowerFloorCategory[];
          }
          if (simFloors.length === 0) {
            simFloors = inferTowerFloorsFromModuleFloorIndexes(
              state.modules,
              simulationBoundUnitTempId,
              inferLabels,
            );
          }
          map.set(simulationBoundUnitTempId, simFloors);
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
      inferLabels,
    ]);

  const editingUnitFloors: TTowerFloorCategory[] = (() => {
    const directTempId = editingModule?.boundUnitTempId;
    if (directTempId) {
      const direct = normalizedUnitsFloorMap.get(directTempId);
      if (direct && direct.length > 0) return direct;
    }

    if (editingModuleBoundUnit) {
      const tempId = editingModuleBoundUnit.tempId;

      if (editingModuleBoundUnit.unitId) {
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

      const fromMap = normalizedUnitsFloorMap.get(tempId);
      if (fromMap && fromMap.length > 0) return fromMap;

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

      if (fromMap && fromMap.length > 0) return fromMap;
      const inferredBound = inferTowerFloorsFromModuleFloorIndexes(
        state.modules,
        editingModuleBoundUnit.tempId,
        inferLabels,
      );
      if (inferredBound.length > 0) return inferredBound;
    }

    if (editingModule) {
      if (editingModule.boundUnitTempId) {
        const sameTempId = state.modules.filter(
          (m) => m.boundUnitTempId === editingModule.boundUnitTempId,
        );
        const sameTempIdInferred = inferTowerFloorsFromModuleFloorIndexes(
          sameTempId,
          null,
          inferLabels,
        );
        if (sameTempIdInferred.length > 0) return sameTempIdInferred;
      }

      const onlyCurrent: TIfcStepperState["modules"] = [editingModule];
      const onlyCurrentInferred = inferTowerFloorsFromModuleFloorIndexes(
        onlyCurrent,
        null,
        inferLabels,
      );
      if (onlyCurrentInferred.length > 0) return onlyCurrentInferred;
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
