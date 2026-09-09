import { getModule } from "@/actions/modules/getModule";
import { patchModule } from "@/actions/modules/patchModule";
import { postModule } from "@/actions/modules/postModule";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModuleV2Form } from "@/hooks/useModuleV2Form";
import { cn } from "@/lib/utils";
import {
  ModuleParamsProps,
  TModuleDataV2,
  TModuleSource,
  TModulesTypes,
  ModuleParamsPropsV2,
} from "@/types/modules";
import { TTowerFloorCategory } from "@/types/units";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Control } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
import { mapFloorIndexToFloorIds } from "@/utils/unitConversions";
import { MODULE_SOURCES } from "@/utils/modulePositions";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "../../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import BuildingVisualizer from "../building-visualizer";
import {
  getDefaultValuesByType,
  getEmptyValuesByType,
} from "./module-default-values";
import ModuleV2Form from "./module-v2-form";
import { prepareModuleV2PayloadForBackend } from "./aggregate-helpers";

export type ModuleFormSource = "default" | "ifc" | "tqs";

const SOURCE_MAP: Record<ModuleFormSource, TModuleSource> = {
  default: MODULE_SOURCES.API,
  ifc: MODULE_SOURCES.IFC,
  tqs: MODULE_SOURCES.TQS,
} as const;

interface DrawerFormModuleProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId?: string | null;
  optionId?: string | null;
  moduleId?: string;
  type: TModulesTypes;
  floors?: TTowerFloorCategory[];
  source?: ModuleFormSource;

  stepperMode?: boolean;
  strictValidation?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialModuleData?:
    | (Partial<TModuleDataV2> & {
        floor_ids?: string[];
        unit_id?: string;
        type?: TModulesTypes;
      })
    | {
        type: TModulesTypes;
        data?: Record<string, unknown> & {
          floor_ids?: string[];
          unit_id?: string;
        };
      };
  initialSelectedFloors?: string[];
  onSubmitSuccess?: (payload: {
    moduleId?: string;
    params: ModuleParamsProps | ModuleParamsPropsV2;
    selectedFloors: string[];
    formInput: unknown;
    flatData: TModuleDataV2 & {
      type: TModulesTypes;
      floor_ids?: string[];
      unit_id?: string;
    };
  }) => void;
}

const isWrapperFormat = (
  v: DrawerFormModuleProps["initialModuleData"],
): v is {
  type: TModulesTypes;
  data?: Record<string, unknown> & { floor_ids?: string[]; unit_id?: string };
} => {
  if (!v) return false;
  return "data" in v || typeof (v as { type?: unknown }).type === "string";
};

const FCK_OPTIONS = [20, 25, 30, 35, 40, 45, 50] as const;

const hashString = (s: string): string => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
};

const stableStringify = (value: unknown): string => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const parts = keys.map(
      (k) =>
        `${JSON.stringify(k)}:${stableStringify(
          (value as Record<string, unknown>)[k],
        )}`,
    );
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value);
};

const checksumObjectFields = (obj: unknown, fields: string[]): string => {
  if (!obj || typeof obj !== "object") return "ø";
  const rec = obj as Record<string, unknown>;
  const values = fields
    .map((f) => (f in rec ? rec[f] : undefined))
    .map((v) => stableStringify(v));
  return hashString(values.join("|"));
};

const DrawerFormModule = ({
  triggerComponent,
  projectId,
  unitId: unitIdProp,
  optionId: optionIdProp,
  moduleId,
  type,
  floors = [],
  source: _source = "default",
  stepperMode = false,
  strictValidation: strictValidationProp,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  initialModuleData,
  initialSelectedFloors,
  onSubmitSuccess,
}: DrawerFormModuleProps) => {
  const unitId = unitIdProp ?? "";
  const optionId = optionIdProp ?? "";
  const strictValidation_ = strictValidationProp ?? !stepperMode;
  void strictValidation_;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const val = typeof next === "function" ? next(isOpen) : next;
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [serverCompleted, setServerCompleted] = useState<boolean | null>(null);
  const lastAppliedServerCompletedRef = useRef<string>("__none__");

  const effectiveSource: TModuleSource =
    SOURCE_MAP[_source] ?? MODULE_SOURCES.API;

  useEffect(() => {
    if (!initialModuleData) return;
    if (!isWrapperFormat(initialModuleData)) return;
    const w = initialModuleData as {
      type: TModulesTypes;
      data?: unknown;
      completed?: boolean;
      id?: string;
    };
    const ident = `${w.id ?? "__no_id__"}|${typeof w.completed}`;
    if (lastAppliedServerCompletedRef.current === ident) return;
    lastAppliedServerCompletedRef.current = ident;
    if (typeof w.completed === "boolean") {
      setServerCompleted(w.completed);
    }
  }, [initialModuleData]);

  const initialDataForHook = (() => {
    if (!initialModuleData) return undefined;
    if (isWrapperFormat(initialModuleData)) {
      const w = initialModuleData as {
        type: TModulesTypes;
        data?: unknown;
        completed?: boolean;
      };
      return w as {
        type: TModulesTypes;
        data?: unknown;
        completed?: boolean;
      };
    }
    const {
      type: tFromFlat,
      floor_ids,
      unit_id,
      ...restFlat
    } = initialModuleData;
    return {
      type: (tFromFlat as TModulesTypes) ?? type,
      data: {
        ...restFlat,
        ...(floor_ids ? { floor_ids } : {}),
        ...(unit_id ? { unit_id } : {}),
      },
    } as { type: TModulesTypes; data?: unknown };
  })();

  const v2Hook = useModuleV2Form({
    type,
    initialModuleData: initialDataForHook,
    source: effectiveSource,
    stepperMode,
    isOpen: isOpen,
  });

  const { form } = v2Hook;

  const structureTypeWatch = form.watch("type") as TModulesTypes;

  const { t } = useTranslation();

  const queryClient = useQueryClient();

  const isUsingPaviments =
    structureTypeWatch === "beam_column" ||
    structureTypeWatch === "concrete_wall" ||
    structureTypeWatch === "structural_masonry";

  const { mutate: mutateModule, isPending: isUpdatePending } = useMutation({
    mutationFn: (data: ModuleParamsPropsV2) =>
      patchModule(data, projectId, unitId, optionId, moduleId!),
    onError: (error) => {
      console.error(
        "[DrawerFormModule] ❌ mutateModule (patch) onError:",
        error,
      );
      if (!stepperMode) {
        toast.error(t.modules.form.updateError, {
          description: parseApiError(error, t),
          duration: 5000,
        });
      }
    },
    onSuccess: (_data) => {
      console.log(
        "[DrawerFormModule] ✅ mutateModule (patch) onSuccess:",
        _data,
      );
      const returnedCompleted = (_data as any)?.data?.module?.completed;
      if (typeof returnedCompleted === "boolean") {
        setServerCompleted(returnedCompleted);
      }
      if (!stepperMode) {
        toast.success(t.modules.form.updateSuccess, {
          duration: 5000,
        });
        queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["unit", projectId, unitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["module", projectId, unitId, moduleId!],
        });
        queryClient.invalidateQueries({
          queryKey: ["module", projectId, unitId, optionId, moduleId!],
        });
        form.reset(getDefaultValuesByType(type) as never);
        setSelectedFloors([]);
        setServerCompleted(null);
        setIsOpen(false);
      }
    },
  });

  const { isPending: isCreationPending, mutate: mutateCreation } = useMutation({
    mutationFn: (data: ModuleParamsPropsV2) =>
      postModule(data, projectId, unitId, optionId),
    onError: (error) => {
      console.error(
        "[DrawerFormModule] ❌ mutateCreation (post) onError:",
        error,
      );
      if (!stepperMode) {
        toast.error(t.modules.form.createError, {
          description: parseApiError(error, t),
          duration: 5000,
        });
      }
    },
    onSuccess: (data, variables) => {
      console.log("[DrawerFormModule] ✅ mutateCreation (post) onSuccess:", {
        data,
        variables,
      });
      const returnedCompleted = (data as any)?.data?.module?.completed;
      if (typeof returnedCompleted === "boolean") {
        setServerCompleted(returnedCompleted);
      }
      if (!stepperMode) {
        toast.success(t.modules.form.createSuccess, {
          duration: 5000,
        });
        queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["unit", projectId, unitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
        form.reset(getDefaultValuesByType(type) as never);
        setSelectedFloors([]);
        setServerCompleted(null);
        setIsOpen(false);
      } else {
        const createdId = (data as any)?.data?.module?.id;
        if (onSubmitSuccess) {
          const payloadWrapper = v2Hook.toPayload() as unknown as {
            type: TModulesTypes;
            data: Record<string, unknown>;
          };
          const flat = {
            ...(payloadWrapper.data ?? {}),
            type: payloadWrapper.type ?? type,
          } as unknown as TModuleDataV2 & {
            type: TModulesTypes;
            floor_ids?: string[];
            unit_id?: string;
          };
          flat.floor_ids = selectedFloors;
          if (unitId) flat.unit_id = unitId;
          onSubmitSuccess({
            moduleId: createdId,
            params: variables,
            selectedFloors,
            formInput: form.getValues(),
            flatData: flat,
          });
        }
      }
    },
  });

  const { data: moduleData, isLoading: isLoadingModule } = useQuery({
    queryKey: ["module", projectId, unitId, optionId, moduleId],
    queryFn: async () => {
      if (moduleId) {
        const res = await getModule(projectId, unitId, optionId, moduleId);
        return res.data.module;
      }
      return null;
    },
    enabled: !!moduleId && isOpen && !stepperMode,
  });

  const stepperEditingTargetKey = (() => {
    const d = initialModuleData as any;
    const initialFloorIdx = d?.floor_index ?? d?.data?.floor_index;
    const initialFloorIds = d?.floor_ids ?? d?.data?.floor_ids;
    const initialSelected = initialSelectedFloors;
    const floorsIdsKey = Array.isArray(initialFloorIds)
      ? initialFloorIds.join(",")
      : "";
    const selectedKey = Array.isArray(initialSelected)
      ? initialSelected.join(",")
      : "";
    let floorIndexKey = "null";
    if (initialFloorIdx !== null && initialFloorIdx !== undefined) {
      if (Array.isArray(initialFloorIdx)) {
        floorIndexKey = JSON.stringify(
          [...initialFloorIdx].sort((a, b) => (a as number) - (b as number)),
        );
      } else {
        floorIndexKey = String(initialFloorIdx);
      }
    }
    return `${floorIndexKey}|${floorsIdsKey}|${selectedKey}|${
      d?.id ?? ""
    }|${d?.tempId ?? ""}`;
  })();

  const [userTouchedSelectedFloors, setUserTouchedSelectedFloors] =
    useState(false);

  const prevIsOpenRef = useRef(false);
  const openInitialSelectedFloorsRef = useRef<string[] | null>(null);
  const openInitialModuleDataRef = useRef<unknown>(null);
  const openFloorsRef = useRef<TTowerFloorCategory[] | null>(null);

  const prevSelectedFloorsRef = useRef<string[]>([]);
  useEffect(() => {
    const prev = prevSelectedFloorsRef.current;
    const curr = selectedFloors;
    if (prev.length === 0 && curr.length === 0) return;
    const same =
      prev.length === curr.length &&
      prev.every((v) => curr.includes(v)) &&
      curr.every((v) => prev.includes(v));
    if (!same) {
      setUserTouchedSelectedFloors(true);
    }
    prevSelectedFloorsRef.current = curr;
  }, [selectedFloors]);

  useEffect(() => {
    const currentFormFloorIds = (form.getValues() as any)?.data?.floor_ids as
      | string[]
      | undefined;
    const currLen = selectedFloors.length;
    const formLen = Array.isArray(currentFormFloorIds)
      ? currentFormFloorIds.length
      : 0;
    if (currLen === 0 && formLen === 0) return;
    const same =
      Array.isArray(currentFormFloorIds) &&
      currLen === formLen &&
      selectedFloors.every((v) => currentFormFloorIds.includes(v)) &&
      currentFormFloorIds.every((v: string) => selectedFloors.includes(v));
    if (!same) {
      form.setValue("data.floor_ids" as never, selectedFloors as never, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [selectedFloors, form]);

  useEffect(() => {
    if (!unitId) return;
    const currFormUnitId = (form.getValues() as any)?.data?.unit_id as
      | string
      | undefined;
    if (currFormUnitId !== unitId) {
      form.setValue("data.unit_id" as never, unitId as never, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [unitId, form]);

  const lastStepperTargetKeyRef = useRef<string | null>(null);
  const lastModuleIdRef = useRef<string | undefined | null>(undefined);
  const floorsBootstrappedSentinelRef = useRef<number | null>(null);

  const resolveSelectedFloorsFromContext = (
    opts: {
      explicitSelected?: string[] | null | undefined;
      explicitData?: unknown;
      serverModuleData?: unknown;
      floorsArg?: TTowerFloorCategory[] | null | undefined;
    } = {},
  ): { selected: string[]; source: string } => {
    const flr = (opts.floorsArg ?? floors ?? []) as TTowerFloorCategory[];
    const explicitSel = opts.explicitSelected ?? initialSelectedFloors;
    if (
      Array.isArray(explicitSel) &&
      explicitSel.length > 0 &&
      explicitSel.every((v) => typeof v === "string")
    ) {
      return { selected: explicitSel, source: "initialSelectedFloors" };
    }

    const dataCandidates: unknown[] = [];
    if (opts.serverModuleData !== undefined) {
      dataCandidates.push(opts.serverModuleData);
    }
    if (opts.explicitData !== undefined) {
      dataCandidates.push(opts.explicitData);
    }
    dataCandidates.push(initialModuleData);

    for (const c of dataCandidates) {
      if (!c || typeof c !== "object") continue;
      const rec = c as Record<string, unknown>;
      let inner: Record<string, unknown> | null = null;
      if (
        rec["module"] &&
        typeof rec["module"] === "object" &&
        rec["module"] !== null
      ) {
        inner = rec["module"] as Record<string, unknown>;
      } else {
        inner = rec;
      }
      const floorIdsAny =
        inner["floor_ids"] ?? (inner["data"] as any)?.floor_ids;
      if (Array.isArray(floorIdsAny) && floorIdsAny.length > 0) {
        const arr = floorIdsAny.filter((v) => typeof v === "string");
        if (arr.length > 0)
          return { selected: arr as string[], source: "floor_ids" };
      }
      const floorIdxAny =
        inner["floor_index"] ?? (inner["data"] as any)?.floor_index;
      if (floorIdxAny !== null && floorIdxAny !== undefined && flr.length > 0) {
        const mapped = mapFloorIndexToFloorIds(
          floorIdxAny as number | number[],
          flr,
        );
        if (mapped.length > 0)
          return { selected: mapped, source: "floor_index mapped" };
      }
    }
    return { selected: [], source: "empty" };
  };

  const isSameFloorSelection = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    return b.every((v) => setA.has(v));
  };

  useEffect(() => {
    const targetChanged =
      lastStepperTargetKeyRef.current !== stepperEditingTargetKey;
    const moduleIdChanged = lastModuleIdRef.current !== moduleId;
    const openRisingEdge = isOpen && !prevIsOpenRef.current;

    if (openRisingEdge || targetChanged || (moduleIdChanged && isOpen)) {
      const sentinel = Date.now() + Math.random();
      floorsBootstrappedSentinelRef.current = sentinel;

      openInitialSelectedFloorsRef.current = initialSelectedFloors ?? null;
      openInitialModuleDataRef.current = initialModuleData ?? null;
      openFloorsRef.current = floors ?? null;

      setUserTouchedSelectedFloors(false);
      prevSelectedFloorsRef.current = [];

      setFormMountKey((k) => k + 1);

      const { selected: nextSelected } = resolveSelectedFloorsFromContext({
        explicitSelected: openInitialSelectedFloorsRef.current,
        explicitData: openInitialModuleDataRef.current,
        floorsArg: openFloorsRef.current,
      });
      if (!isSameFloorSelection(selectedFloors, nextSelected)) {
        setSelectedFloors(nextSelected);
        prevSelectedFloorsRef.current = nextSelected;
      }

      queueMicrotask(() => {
        if (floorsBootstrappedSentinelRef.current !== sentinel) return;
        form.clearErrors();
      });
    }

    prevIsOpenRef.current = isOpen;
    lastStepperTargetKeyRef.current = stepperEditingTargetKey;
    lastModuleIdRef.current = moduleId;
  }, [
    isOpen,
    moduleId,
    stepperMode,
    stepperEditingTargetKey,
    form,
    initialSelectedFloors,
    initialModuleData,
    floors,
    selectedFloors,
  ]);

  useEffect(() => {
    if (!floorsBootstrappedSentinelRef.current) return;
    if (!isOpen || moduleData || !stepperMode) return;
    if (!floors || floors.length === 0) return;
    if (userTouchedSelectedFloors) return;
    if (selectedFloors.length > 0) return;

    const sentinel = floorsBootstrappedSentinelRef.current;

    const { selected: newSelected } = resolveSelectedFloorsFromContext({
      floorsArg: floors,
    });
    if (newSelected.length === 0) return;
    if (isSameFloorSelection(selectedFloors, newSelected)) return;

    queueMicrotask(() => {
      if (floorsBootstrappedSentinelRef.current !== sentinel) return;
      if (userTouchedSelectedFloors) return;
      setSelectedFloors((prev) =>
        isSameFloorSelection(prev, newSelected) ? prev : newSelected,
      );
      prevSelectedFloorsRef.current = newSelected;
      form.clearErrors();
    });
  }, [
    isOpen,
    moduleId,
    stepperMode,
    floors,
    initialSelectedFloors,
    initialModuleData,
    userTouchedSelectedFloors,
    selectedFloors,
    form,
  ]);

  const prevResetRunKey = useRef<string | null>(null);
  const lastClosedSentinelRef = useRef<number>(0);
  const openCountRef = useRef<number>(0);
  const [formMountKey, setFormMountKey] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      lastClosedSentinelRef.current = Date.now() + Math.random();
      floorsBootstrappedSentinelRef.current = null;
      return;
    }
    openCountRef.current += 1;
  }, [isOpen]);

  const lastAppliedModuleIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!moduleData) return;
    const rawMd = moduleData as any;
    let mdAny: any;
    if (
      rawMd &&
      typeof rawMd === "object" &&
      rawMd.module &&
      typeof rawMd.module === "object" &&
      ((typeof rawMd.module.type === "string" && rawMd.module.type) ||
        ("data" in rawMd.module && rawMd.module.data))
    ) {
      mdAny = rawMd.module;
    } else {
      mdAny = rawMd;
    }
    const detectedType: TModulesTypes = (mdAny?.type as TModulesTypes) ?? type;

    const currentModuleId = moduleId ?? "__no_module__";
    if (userTouchedSelectedFloors) {
      void detectedType;
    }

    if (!userTouchedSelectedFloors) {
      const { selected: nextSelected } = resolveSelectedFloorsFromContext({
        serverModuleData: moduleData,
        floorsArg: floors,
      });

      if (nextSelected.length > 0) {
        if (!isSameFloorSelection(selectedFloors, nextSelected)) {
          setSelectedFloors(nextSelected);
          prevSelectedFloorsRef.current = nextSelected;
        }
        lastAppliedModuleIdRef.current = currentModuleId;
      } else if (lastAppliedModuleIdRef.current !== currentModuleId) {
        lastAppliedModuleIdRef.current = currentModuleId;
      }
    }

    const isRecord = (v: unknown): v is Record<string, unknown> =>
      !!v && typeof v === "object";

    let resetValues: { type: TModulesTypes; data: Record<string, unknown> };
    const hasDataShape =
      isRecord(mdAny) &&
      "data" in mdAny &&
      isRecord(mdAny.data) &&
      (Object.keys(mdAny.data).length > 0 ||
        Array.isArray((mdAny.data as any).concrete) ||
        Array.isArray((mdAny.data as any).steel) ||
        Array.isArray((mdAny.data as any).form));
    const hasFlatShape =
      isRecord(mdAny) &&
      (Array.isArray((mdAny as any).concrete) ||
        Array.isArray((mdAny as any).steel) ||
        Array.isArray((mdAny as any).form) ||
        typeof (mdAny as any).type === "string") &&
      !hasDataShape;
    if (hasDataShape) {
      const wrappedData = { ...(mdAny.data as Record<string, unknown>) };
      if (
        wrappedData.floor_ids === undefined &&
        Array.isArray(mdAny.floor_ids)
      ) {
        wrappedData.floor_ids = mdAny.floor_ids;
      }
      if (
        wrappedData.unit_id === undefined &&
        typeof mdAny.unit_id === "string" &&
        mdAny.unit_id.trim() !== ""
      ) {
        wrappedData.unit_id = mdAny.unit_id;
      }
      if (
        wrappedData.floor_indexes === undefined &&
        Array.isArray(mdAny.floor_indexes)
      ) {
        wrappedData.floor_indexes = mdAny.floor_indexes;
      }
      if (
        wrappedData.floor_index === undefined &&
        (typeof mdAny.floor_index === "number" ||
          Array.isArray(mdAny.floor_index))
      ) {
        wrappedData.floor_index = mdAny.floor_index;
      }
      resetValues = {
        type: detectedType,
        data: wrappedData,
      };
    } else if (hasFlatShape) {
      const ignoreKeys = new Set(["type", "id", "consumption", "outdated"]);
      const data: Record<string, unknown> = {};
      const rec = mdAny as Record<string, unknown>;
      for (const key of Object.keys(rec)) {
        if (ignoreKeys.has(key)) continue;
        data[key] = rec[key];
      }
      resetValues = {
        type: detectedType,
        data,
      };
    } else {
      resetValues = {
        type: detectedType,
        data: (getDefaultValuesByType(detectedType) as any)?.data ?? {},
      };
    }

    if (hasDataShape || hasFlatShape) {
      const baseEmpty =
        (
          getEmptyValuesByType(detectedType) as {
            data?: Record<string, unknown>;
          }
        )?.data ?? {};
      const baseFullDefaults =
        (
          getDefaultValuesByType(detectedType) as {
            data?: Record<string, unknown>;
          }
        )?.data ?? {};
      const serverData = resetValues.data ?? {};
      const merged: Record<string, unknown> = { ...baseEmpty };
      const isMasonryObj = (
        v: unknown,
      ): v is Record<string, unknown> & {
        blocks?: unknown;
        mortar?: unknown;
        grout?: unknown;
      } =>
        !!v &&
        typeof v === "object" &&
        ("blocks" in (v as Record<string, unknown>) ||
          "mortar" in (v as Record<string, unknown>) ||
          "grout" in (v as Record<string, unknown>));
      const hasMeaningfulContent = (v: unknown): boolean => {
        if (!v || typeof v !== "object") return false;
        const rec = v as Record<string, unknown>;
        const checkArr = (val: unknown): boolean =>
          Array.isArray(val) && val.length > 0;
        if (isMasonryObj(rec)) {
          return (
            checkArr(rec.blocks) || checkArr(rec.mortar) || checkArr(rec.grout)
          );
        }
        return true;
      };
      for (const k of Object.keys(serverData)) {
        const v = (serverData as Record<string, unknown>)[k];
        if (Array.isArray(v) || (isMasonryObj(v) && hasMeaningfulContent(v))) {
          merged[k] = v;
        } else if (
          v === undefined ||
          v === null ||
          (typeof v === "string" && v === "") ||
          (typeof v === "number" && !Number.isFinite(v))
        ) {
          if (k in baseFullDefaults) {
            merged[k] = (baseFullDefaults as Record<string, unknown>)[k];
          }
        } else if (isMasonryObj(v)) {
          // masonry com blocks/mortar/grout todos null/vazios → não injetar no merged
          // (deixa que o default Empty determine o valor; por padrão undefined,
          //  então o container não aparece até usuário clicar em "+")
        } else {
          merged[k] = v;
        }
      }
      for (const k of Object.keys(baseFullDefaults)) {
        if (!(k in merged)) {
          merged[k] = (baseFullDefaults as Record<string, unknown>)[k];
        }
      }
      resetValues = {
        type: resetValues.type ?? detectedType,
        data: merged,
      };
    }
    const rawData = resetValues.data as Record<string, unknown>;
    if (Array.isArray(rawData.concrete)) {
      rawData.concrete = rawData.concrete.map((c: unknown) => {
        if (!c || typeof c !== "object") return c;
        const rec = c as Record<string, unknown>;
        const v = rec.fck;
        let n: number | null = null;
        if (typeof v === "number" && isFinite(v)) n = v;
        else if (
          typeof v === "string" &&
          v !== "" &&
          !isNaN(Number(v)) &&
          isFinite(Number(v))
        ) {
          n = Number(v);
        }
        if (n === null) return c;
        const isCustom =
          !(FCK_OPTIONS as readonly number[]).includes(n) ||
          rec.customFck === true ||
          rec.customFck === "true";
        return { ...rec, customFck: isCustom } as unknown;
      });
    }
    const checksumSource = hasDataShape
      ? ({ _shape: "data", ...rawData } as Record<string, unknown>)
      : ({
          _shape: "flat",
          _flat: hasFlatShape,
          _data: hasDataShape,
          ...mdAny,
        } as Record<string, unknown>);
    const checksum = checksumObjectFields(checksumSource, [
      "concrete",
      "steel",
      "form",
      "slab_type",
      "column_number",
      "avg_beam_span",
      "avg_slab_span",
      "floor_ids",
      "wall_thickness",
      "slab_thickness",
      "wall_area",
      "slab_area",
      "beam_number",
      "slab_number",
      "raft_area",
      "raft_thickness",
      "masonry",
    ]);
    const masonryRec = (rawData.masonry ?? {}) as Record<string, unknown>;
    const runKey = JSON.stringify({
      id: (mdAny as { id?: unknown })?.id ?? moduleId ?? null,
      type: detectedType,
      openN: openCountRef.current,
      closedS: lastClosedSentinelRef.current,
      hasMd: !!moduleData,
      checksum,
      len_concrete: Array.isArray(rawData.concrete)
        ? rawData.concrete.length
        : -1,
      len_steel: Array.isArray(rawData.steel) ? rawData.steel.length : -1,
      len_form: Array.isArray(rawData.form) ? rawData.form.length : -1,
      len_mb: Array.isArray(masonryRec.blocks)
        ? (masonryRec.blocks as unknown[]).length
        : -1,
      len_mm: Array.isArray(masonryRec.mortar)
        ? (masonryRec.mortar as unknown[]).length
        : -1,
      len_mg: Array.isArray(masonryRec.grout)
        ? (masonryRec.grout as unknown[]).length
        : -1,
    });
    if (prevResetRunKey.current === runKey) {
      return;
    }
    prevResetRunKey.current = runKey;
    setFormMountKey((k) => k + 1);
    if (typeof resetValues.type === "string" && resetValues.type) {
      form.reset({
        type: resetValues.type,
        data: resetValues.data,
      } as never);
    } else {
      form.reset(getDefaultValuesByType(detectedType) as never);
    }
    queueMicrotask(() => {
      form.clearErrors();
    });
  }, [
    moduleData,
    moduleId,
    type,
    form,
    isOpen,
    selectedFloors,
    userTouchedSelectedFloors,
    floors,
  ]);

  const handleSubmit = () => {
    console.log("[DrawerFormModule] ⚙️ handleSubmit interno foi chamado!");
    const moduleType = (form.getValues("type") as TModulesTypes) || type;
    console.log(
      "[DrawerFormModule]   moduleType:",
      moduleType,
      "moduleId:",
      moduleId,
      "unitId:",
      unitId,
      "optionId:",
      optionId,
      "selectedFloors:",
      selectedFloors,
    );

    const payloadWrapper = v2Hook.toPayload() as unknown as {
      type: TModulesTypes;
      data: Record<string, unknown>;
    };

    const isStructure =
      moduleType === "beam_column" ||
      moduleType === "concrete_wall" ||
      moduleType === "structural_masonry";
    const isFoundation =
      moduleType === "raft_foundation" ||
      moduleType === "piles_foundation" ||
      moduleType === "raft_piles_foundation";

    const finalPayload: ModuleParamsPropsV2 = {
      type: moduleType,
      data: {
        ...(payloadWrapper.data ?? {}),
        ...(isStructure ? { floor_ids: selectedFloors } : {}),
        ...(isFoundation && unitId ? { unit_id: unitId } : {}),
      },
    };
    if (effectiveSource !== undefined && effectiveSource !== "") {
      finalPayload.source = effectiveSource;
    }

    console.log(
      "[DrawerFormModule] 📦 finalPayload (antes prepareModuleV2PayloadForBackend):",
      finalPayload,
    );

    const prepared = prepareModuleV2PayloadForBackend({
      type: moduleType,
      data: finalPayload.data ?? {},
    });
    const cleanedWrapper: ModuleParamsPropsV2 = {
      type: prepared.type,
      data: prepared.data as never,
    };
    if (effectiveSource !== undefined && effectiveSource !== "") {
      cleanedWrapper.source = effectiveSource;
    }

    console.log(
      "[DrawerFormModule] 🧹 cleanedWrapper (após prepareModuleV2PayloadForBackend):",
      cleanedWrapper,
    );
    console.log(
      "[DrawerFormModule] 🎯 vai executar:",
      moduleId && moduleData ? "mutateModule (PATCH)" : "mutateCreation (POST)",
    );

    if (stepperMode) {
      const flatCompat = {
        ...(cleanedWrapper.data ?? {}),
        type: cleanedWrapper.type ?? moduleType,
        floor_ids: selectedFloors,
        unit_id: unitId || undefined,
      } as unknown as TModuleDataV2 & {
        type: TModulesTypes;
        floor_ids?: string[];
        unit_id?: string;
      };
      onSubmitSuccess?.({
        moduleId,
        params: cleanedWrapper,
        selectedFloors,
        formInput: form.getValues(),
        flatData: flatCompat,
      });
      return;
    }

    if (moduleId && moduleData) {
      mutateModule(cleanedWrapper);
    } else {
      mutateCreation(cleanedWrapper);
    }
  };

  const getFormErrorMessages = (errors: Record<string, unknown>): string[] => {
    const messages = new Set<string>();
    const traverse = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;
      const rec = obj as Record<string, unknown>;
      if (typeof rec.message === "string" && rec.message.length > 0) {
        messages.add(rec.message);
        return;
      }
      for (const key of Object.keys(rec)) {
        if (key !== "message" && key !== "type" && key !== "ref") {
          traverse(rec[key]);
        }
      }
    };
    traverse(errors);
    return Array.from(messages);
  };

  const handleClose = () => {
    if (stepperMode) {
      form.reset(getDefaultValuesByType(type) as never);
      setSelectedFloors(initialSelectedFloors ?? []);
    } else {
      form.reset(getDefaultValuesByType(type) as never);
      setSelectedFloors([]);
    }
    setIsOpen(false);
  };

  const shouldRenderTrigger = !stepperMode || Boolean(triggerComponent);

  const structureTypes = [
    { value: "beam_column", label: t.modules.structureTypes.beamColumn },
    { value: "concrete_wall", label: t.modules.structureTypes.concreteWall },
    { value: "structural_masonry", label: t.modules.structureTypes.masonry },
    {
      value: "raft_foundation",
      label: t.modules.structureTypes.raftFoundation,
    },
    {
      value: "piles_foundation",
      label: t.modules.structureTypes.pilesFoundation,
    },
    {
      value: "raft_piles_foundation",
      label: t.modules.structureTypes.raftPilesFoundation,
    },
  ];

  const isMobile = useIsMobile();

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      dismissible={false}
      onOpenChange={(open) => {
        if (open) {
          setIsOpen(true);
          if (
            type &&
            (type === "beam_column" ||
              type === "concrete_wall" ||
              type === "structural_masonry" ||
              type === "raft_foundation" ||
              type === "piles_foundation" ||
              type === "raft_piles_foundation")
          ) {
            form.setValue("type", type);
          }
        }
      }}
      onClose={handleClose}
    >
      {shouldRenderTrigger && (
        <DrawerTrigger asChild>
          {triggerComponent ?? (
            <button className="cursor-pointer rounded-t-lg bg-muted px-4 py-2 hover:bg-accent">
              <Plus />
            </button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent
        className={cn("min-w-4/6", {
          "w-full h-[80vh]": isMobile,
        })}
      >
        <DrawerHeader className="px-8">
          <div className="flex items-center gap-3 w-full pr-10">
            <DrawerTitle className="text-h1 text-primary shrink-0">
              {moduleId
                ? t.modules.form.editTitle
                : t.modules.table.createButton}
            </DrawerTitle>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 shrink-0 ml-auto",
                (serverCompleted ?? v2Hook.completion.completed)
                  ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                  : "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300",
              )}
            >
              {(serverCompleted ?? v2Hook.completion.completed) ? (
                <>
                  <CheckCircle2 size={12} />
                  {t.modules.badges.completed}
                </>
              ) : (
                <>
                  <AlertCircle size={12} />
                  {t.modules.badges.incomplete}
                </>
              )}
            </Badge>
          </div>
          <Button
            onClick={handleClose}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <div className="mx-auto w-full p-6 pr-0 pt-0 flex overflow-auto max-sm:flex-col max-sm:flex-1 max-sm:min-h-0">
          {isLoadingModule ? (
            <div className="grid w-full grid-cols-3 gap-4">
              <div className="flex flex-col w-full h-auto space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex flex-col col-span-2 w-full h-auto space-y-2 p-4 border rounded-lg border-muted ">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(
                  (validData) => {
                    console.log(
                      "[DrawerFormModule] ✅ form.handleSubmit onValid:",
                      { validData },
                    );
                    handleSubmit();
                  },
                  (errors) => {
                    console.error(
                      "[DrawerFormModule] ❌ form.handleSubmit onInvalid (validação falhou). Erros:",
                      errors,
                    );
                    console.error(
                      "[DrawerFormModule]   form.getValues() atual:",
                      form.getValues(),
                    );
                    const msgs = getFormErrorMessages(
                      errors as Record<string, unknown>,
                    );
                    if (msgs.length > 0) {
                      console.error(
                        "[DrawerFormModule]   mensagens de erro extraídas:",
                        msgs,
                      );
                    }
                    const ms = getFormErrorMessages(
                      form.formState.errors as Record<string, unknown>,
                    );
                    console.error(
                      "[DrawerFormModule]   form.formState.errors:",
                      form.formState.errors,
                      "mensagens legíveis:",
                      ms,
                    );
                  },
                )}
                id="module-form"
                className="w-full flex gap-6 h-full max-sm:flex-col"
              >
                <div
                  className={cn("h-full overflow-y-auto", {
                    "shrink-0": !isMobile,
                    "h-auto flex-1 mx-auto": isMobile,
                  })}
                >
                  <div
                    className={cn("top-0", {
                      sticky: !isMobile,
                      "w-full": isMobile,
                    })}
                  >
                    <BuildingVisualizer
                      key={`building-${floors?.length || 0}-${JSON.stringify(floors?.map((f) => ({ index: f.index, id: f.id })))}-${JSON.stringify(selectedFloors)}`}
                      towerFloors={floors || []}
                      isSelectable={isUsingPaviments}
                      selectedFloorIds={selectedFloors}
                      onCheckFloorId={setSelectedFloors}
                      complete={true}
                      isFoundation={!isUsingPaviments}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="p-4 border rounded-lg border-gray-shade-200 space-y-4 bg-card">
                    <div>
                      <span className="text-h3 text-primary dark:text-gray-300">
                        {t.modules.form.technologyData}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={
                          form.control as unknown as Control<{
                            type: TModulesTypes;
                          }>
                        }
                        name="type"
                        disabled={Boolean(moduleId)}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t.modules.form.structureTypeLabel}
                            </FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const tVal = value as
                                    | "beam_column"
                                    | "concrete_wall"
                                    | "structural_masonry"
                                    | "raft_foundation"
                                    | "piles_foundation"
                                    | "raft_piles_foundation";
                                  if (
                                    tVal === "beam_column" ||
                                    tVal === "concrete_wall" ||
                                    tVal === "structural_masonry" ||
                                    tVal === "raft_foundation" ||
                                    tVal === "piles_foundation" ||
                                    tVal === "raft_piles_foundation"
                                  ) {
                                    form.reset(
                                      getDefaultValuesByType(tVal) as never,
                                    );
                                    form.clearErrors();
                                  }
                                }}
                                value={field.value}
                                disabled={Boolean(moduleId)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={
                                      t.modules.form.structureTypeLabel
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {structureTypes.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <ModuleV2Form
                      key={`mod-form-${moduleId ?? type}-${formMountKey}`}
                      hook={v2Hook}
                      stepperMode={stepperMode}
                      isSubmitted={false}
                      unitId={unitId}
                      floors={floors}
                      isEdit={!!moduleId}
                    />
                  </div>
                </div>
              </form>
            </Form>
          )}
        </div>
        <DrawerFooter className="px-8">
          {(() => {
            const missingArr = Array.isArray(v2Hook.completion.missing)
              ? v2Hook.completion.missing
              : [];
            const warnArr = Array.isArray(v2Hook.completion.warnings)
              ? v2Hook.completion.warnings
              : [];
            const fieldLabelMap: Record<string, string> = {
              concrete:
                t.modules.fields?.concrete ?? "Concreto (volume por FCK)",
              steel: t.modules.fields?.steel ?? "Aço (massa por tipo)",
              form: t.modules.fields?.form ?? "Fôrma (área por posição)",
            };
            const merged: { key: string; label: string; reason: string }[] = [
              ...warnArr.map((w, i) => {
                const fieldLabel = fieldLabelMap[w.field] ?? String(w.field);
                const reason = t.modules.warnings.invalidPosition
                  .replace("{{position}}", String(w.invalidPosition ?? ""))
                  .replace(
                    "{{accepted}}",
                    Array.isArray(w.acceptedPositions)
                      ? w.acceptedPositions.join(", ")
                      : "",
                  );
                return {
                  key: `position-warn-${i}`,
                  label: `${fieldLabel} #${w.index + 1}`,
                  reason,
                };
              }),
              ...missingArr.map((m) => ({
                key: `missing-${m.key}`,
                label: m.label,
                reason: m.reason,
              })),
            ];
            if (merged.length === 0) return null;
            return (
              <Alert
                variant="default"
                className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800"
              >
                <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">
                  {t.modules.alerts.missingFieldsTitle}
                </AlertTitle>
                <AlertDescription>
                  <ul className="ml-4 list-disc space-y-1 mt-2 text-amber-700 dark:text-amber-300">
                    {merged.map((m) => (
                      <li key={m.key}>
                        <strong>{m.label}</strong>: {m.reason}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            );
          })()}
          <Button
            type="submit"
            variant="bipc"
            className="w-full"
            form="module-form"
            disabled={
              isCreationPending ||
              isUpdatePending ||
              (selectedFloors.length === 0 && isUsingPaviments)
            }
          >
            {isCreationPending || isUpdatePending ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : moduleId ? (
              t.common.update
            ) : (
              t.common.add
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormModule;
