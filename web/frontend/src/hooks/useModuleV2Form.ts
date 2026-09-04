import {
  ModuleV2FormInput,
  ModuleV2FormSchema,
  createModuleV2FormSchema,
} from "@/validators/moduleFormByType.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { TModuleDataV2, TModuleSource, TModulesTypes } from "@/types/modules";
import { cleanZeroItemsBeforeSubmit } from "@/components/layout/drawer-form-module/aggregate-helpers";
import {
  DEFAULT_FCK_BY_POSITION,
  GROUT_POSITIONS,
  MATERIAL_POSITIONS_BY_TYPE,
  TMaterialKind,
} from "@/utils/modulePositions";
import {
  calculateModuleCompletion,
  type CompletionResult,
  type ModuleCompletionI18n,
} from "@/utils/moduleCompletion";
import {
  getDefaultValuesByType,
  getEmptyValuesByType,
} from "@/components/layout/drawer-form-module/module-default-values";
import { useTranslation } from "@/i18n";
import { Translations } from "@/i18n/translations/pt-BR";

type FieldsKeys = keyof Translations["modules"]["fields"];
type CompletionReasonsKeys = keyof Translations["modules"]["completionReasons"];

type UseModuleV2FormArgs = {
  type: TModulesTypes;
  initialModuleData?: {
    type: TModulesTypes;
    data?: unknown;
    completed?: boolean;
  };
  source?: TModuleSource;
  stepperMode?: boolean;
  isOpen?: boolean;
};

const makeConcreteItem = (position?: string) => ({
  fck: position ? (DEFAULT_FCK_BY_POSITION[position] ?? 25) : 25,
  volume: "0" as unknown as number,
  position: position ?? "unspecified",
  customFck: false,
});

const makeSteelItem = (position?: string) => ({
  material: "rebar" as const,
  resistance: "CA50" as const,
  mass: "0" as unknown as number,
  position: position ?? "unspecified",
});

const makeFormItem = (position?: string) => ({
  area: "0" as unknown as number,
  position: position ?? "unspecified",
});

export const useModuleV2Form = ({
  type,
  initialModuleData,
  source,
  stepperMode = false,
  isOpen = false,
}: UseModuleV2FormArgs) => {
  const { t } = useTranslation();
  const schemaResolver = useMemo(
    () => zodResolver(createModuleV2FormSchema()),
    [],
  );

  const defaultValues: ModuleV2FormInput = (() => {
    const unwrapped = (() => {
      if (
        initialModuleData &&
        typeof initialModuleData === "object" &&
        (initialModuleData as any).module &&
        typeof (initialModuleData as any).module === "object" &&
        ((initialModuleData as any).module.data ||
          typeof (initialModuleData as any).module.type === "string")
      ) {
        return (initialModuleData as any).module as TModuleDataV2;
      }
      return initialModuleData;
    })();

    const isRecord = (v: unknown): v is Record<string, unknown> =>
      !!v && typeof v === "object";
    const hasAnyArray = (rec: Record<string, unknown>): boolean =>
      (Array.isArray(rec.concrete) && rec.concrete.length > 0) ||
      (Array.isArray(rec.steel) && rec.steel.length > 0) ||
      (Array.isArray(rec.form) && rec.form.length > 0) ||
      (Array.isArray((rec.masonry as any)?.blocks) &&
        (rec.masonry as any).blocks.length > 0) ||
      (Array.isArray((rec.masonry as any)?.mortar) &&
        (rec.masonry as any).mortar.length > 0) ||
      (Array.isArray((rec.masonry as any)?.grout) &&
        (rec.masonry as any).grout.length > 0);

    if (unwrapped && isRecord(unwrapped)) {
      const uw = unwrapped as Record<string, unknown>;
      const unwrappedType = (uw.type as TModulesTypes) ?? type;
      const baseDefaults = getDefaultValuesByType(
        unwrappedType,
      ) as unknown as ModuleV2FormInput;
      const baseEmpty = getEmptyValuesByType(
        unwrappedType,
      ) as unknown as ModuleV2FormInput;

      let dataFromServer: Record<string, unknown> | null = null;
      if (
        isRecord(uw.data) &&
        (Object.keys(uw.data).length > 0 || hasAnyArray(uw.data))
      ) {
        const dataCopy = { ...(uw.data as Record<string, unknown>) };
        if (dataCopy.floor_ids === undefined && Array.isArray(uw.floor_ids)) {
          dataCopy.floor_ids = uw.floor_ids;
        }
        if (
          dataCopy.unit_id === undefined &&
          typeof uw.unit_id === "string" &&
          uw.unit_id.trim() !== ""
        ) {
          dataCopy.unit_id = uw.unit_id;
        }
        if (
          dataCopy.floor_indexes === undefined &&
          Array.isArray(uw.floor_indexes)
        ) {
          dataCopy.floor_indexes = uw.floor_indexes;
        }
        if (
          dataCopy.floor_index === undefined &&
          (typeof uw.floor_index === "number" || Array.isArray(uw.floor_index))
        ) {
          dataCopy.floor_index = uw.floor_index;
        }
        dataFromServer = dataCopy;
      } else if (
        typeof unwrappedType === "string" &&
        (hasAnyArray(uw) ||
          Object.keys(uw).filter(
            (k) => !["type", "id", "consumption", "outdated"].includes(k),
          ).length > 0)
      ) {
        const { type: _t, id: _i, consumption: _c, outdated: _o, ...rest } = uw;
        dataFromServer = { ...(rest as Record<string, unknown>) };
      }

      if (dataFromServer !== null) {
        const serverRec = dataFromServer;
        const baseRec =
          (baseEmpty as { data?: Record<string, unknown> })?.data ?? {};
        const defaultFullRec =
          (baseDefaults as { data?: Record<string, unknown> })?.data ?? {};
        const mergedData: Record<string, unknown> = { ...baseRec };
        const isMasonryShape = (
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
        const hasMeaningfulMasonry = (v: Record<string, unknown>): boolean => {
          const chk = (val: unknown): boolean =>
            Array.isArray(val) && val.length > 0;
          return (
            chk((v as { blocks?: unknown }).blocks) ||
            chk((v as { mortar?: unknown }).mortar) ||
            chk((v as { grout?: unknown }).grout)
          );
        };
        for (const k of Object.keys(serverRec)) {
          const v = serverRec[k];
          if (Array.isArray(v)) {
            mergedData[k] = v;
          } else if (isMasonryShape(v)) {
            if (hasMeaningfulMasonry(v)) {
              mergedData[k] = v;
            } else {
              // blocks/mortar/grout todos null/empty → não injetar container no merged
              // deixa defaultEmpty/preencher depois só se o usuário clicar em "+"
            }
          } else if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v === "") ||
            (typeof v === "number" && !Number.isFinite(v))
          ) {
            if (k in defaultFullRec) {
              mergedData[k] = (defaultFullRec as Record<string, unknown>)[k];
            }
          } else {
            mergedData[k] = v;
          }
        }
        for (const k of Object.keys(defaultFullRec)) {
          if (!(k in mergedData)) {
            mergedData[k] = (defaultFullRec as Record<string, unknown>)[k];
          }
        }
        return {
          type: unwrappedType,
          data: mergedData,
        } as ModuleV2FormInput;
      }
      return baseDefaults;
    }

    return getDefaultValuesByType(type) as unknown as ModuleV2FormInput;
  })();

  const form = useForm<ModuleV2FormInput, unknown, ModuleV2FormSchema>({
    resolver: schemaResolver as never,
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const identityRef = useRef<string | null>(null);

  const reactiveType = useWatch({
    control: form.control,
    name: "type",
    defaultValue: defaultValues.type,
  }) as TModulesTypes;

  useEffect(() => {
    if (stepperMode && isOpen) {
      void form.trigger();
    }
  }, [stepperMode, isOpen, form]);

  useEffect(() => {
    const initIdentity = initialModuleData
      ? JSON.stringify({ t: type, d: initialModuleData })
      : `empty|${type}`;
    const identityChanged = identityRef.current !== initIdentity;
    identityRef.current = initIdentity;
    if (!identityChanged) return;

    const isInitialEmpty = !initialModuleData;
    if (isInitialEmpty) {
      const currValues = form.getValues();
      const currData =
        (currValues as { data?: Record<string, unknown> })?.data ?? {};
      const defaultData =
        (defaultValues as { data?: Record<string, unknown> })?.data ?? {};
      const currArraysEmpty =
        (Array.isArray(currData.concrete) ? currData.concrete.length : 0) <=
          1 &&
        (Array.isArray(currData.steel) ? currData.steel.length : 0) <= 1 &&
        (Array.isArray(currData.form) ? currData.form.length : 0) <= 1;
      const defaultArraysEmpty =
        (Array.isArray(defaultData.concrete)
          ? defaultData.concrete.length
          : 0) <= 1 &&
        (Array.isArray(defaultData.steel) ? defaultData.steel.length : 0) <=
          1 &&
        (Array.isArray(defaultData.form) ? defaultData.form.length : 0) <= 1;
      if (!(currArraysEmpty && defaultArraysEmpty)) {
        return;
      }
    }

    form.reset(defaultValues);
    form.clearErrors();
  }, [type, form, defaultValues, initialModuleData]);

  const concreteArray = useFieldArray({
    control: form.control,
    name: "data.concrete" as never,
  });

  const steelArray = useFieldArray({
    control: form.control,
    name: "data.steel" as never,
  });

  const formArray = useFieldArray({
    control: form.control,
    name: "data.form" as never,
  });

  const masonryBlocksArray = useFieldArray({
    control: form.control,
    name: "data.masonry.blocks" as never,
  });

  const masonryMortarArray = useFieldArray({
    control: form.control,
    name: "data.masonry.mortar" as never,
  });

  const masonryGroutArray = useFieldArray({
    control: form.control,
    name: "data.masonry.grout" as never,
  });

  const getPositionsFor = (kind: TMaterialKind): readonly string[] => {
    return MATERIAL_POSITIONS_BY_TYPE[reactiveType]?.[kind] ?? [];
  };

  const addConcreteItem = (position?: string) => {
    concreteArray.append(makeConcreteItem(position) as never);
  };

  const removeConcreteItem = (index: number) => {
    concreteArray.remove(index as never);
  };

  const addSteelItem = (position?: string) => {
    steelArray.append(makeSteelItem(position) as never);
  };

  const removeSteelItem = (index: number) => {
    steelArray.remove(index as never);
  };

  const addFormItem = (position?: string) => {
    const positions = getPositionsFor("form");
    if (positions.length === 0) {
      formArray.append(makeFormItem(position) as never);
      return;
    }
    formArray.append(makeFormItem(position ?? positions[0]) as never);
  };

  const removeFormItem = (index: number) => {
    formArray.remove(index as never);
  };

  const addMasonryBlock = () => {
    masonryBlocksArray.append({
      type: "inteiro (14x19x29)" as const,
      fbk: 6,
      quantity: "0" as unknown as number,
      customFbk: false,
    } as never);
  };

  const removeMasonryBlock = (index: number) => {
    masonryBlocksArray.remove(index as never);
  };

  const addMasonryMortar = () => {
    masonryMortarArray.append({
      fak: 4.5,
      volume: "0" as unknown as number,
      customFak: false,
    } as never);
  };

  const removeMasonryMortar = (index: number) => {
    masonryMortarArray.remove(index as never);
  };

  const addMasonryGrout = (position?: (typeof GROUT_POSITIONS)[number]) => {
    const groutPosition =
      position ??
      (masonryGroutArray.fields.some(
        (f) => (f as { position?: string }).position === "vertical",
      )
        ? "horizontal"
        : "vertical");
    masonryGroutArray.append({
      position: groutPosition,
      volumes: [
        { fgk: 20, volume: "0" as unknown as number, customFgk: false },
      ],
      steel: [
        {
          material: "rebar" as const,
          resistance: "CA50" as const,
          mass: "0" as unknown as number,
          position: "unspecified",
        },
      ],
    } as never);
  };

  const removeMasonryGrout = (index: number) => {
    masonryGroutArray.remove(index as never);
  };

  const toPayload = (): ModuleV2FormSchema & { source?: TModuleSource } => {
    const values = form.getValues();
    const cleaned = cleanZeroItemsBeforeSubmit(values) as ModuleV2FormSchema & {
      source?: TModuleSource;
    };
    if (source !== undefined && source !== "") {
      cleaned.source = source;
    }
    return cleaned;
  };

  const completion = useMemo<CompletionResult>(() => {
    const rawData = form.getValues().data as unknown as TModuleDataV2;
    const fields = t.modules.fields;
    const reasons = t.modules.completionReasons;
    const i18nForCompletion: ModuleCompletionI18n = {
      getFieldLabel: (key: string) => {
        if (key in fields) {
          const val = (fields as unknown as Record<string, unknown>)[key];
          if (typeof val === "string" && val.length > 0) return val;
        }
        const parts = key.split(".");
        const rootKey = parts[0] as FieldsKeys;
        if (parts.length === 2 && rootKey in fields) {
          const rootVal = (fields as unknown as Record<string, unknown>)[
            rootKey
          ];
          const subKey = parts[1] as FieldsKeys;
          const subVal = (fields as unknown as Record<string, unknown>)[
            `${rootKey}.${subKey}` as FieldsKeys
          ];
          if (
            typeof rootVal === "string" &&
            typeof subVal === "string" &&
            subVal.length > 0
          ) {
            return `${rootVal} > ${subVal}`;
          }
        }
        return key;
      },
      getReason: (key: string) => {
        if (key in reasons) {
          const val = (reasons as unknown as Record<string, unknown>)[key];
          if (typeof val === "string" && val.length > 0) return val;
        }
        return key;
      },
    };
    return calculateModuleCompletion(reactiveType, rawData, i18nForCompletion);
  }, [reactiveType, form.watch(), t]);

  return {
    form,
    type: reactiveType,
    source,
    completion,
    concreteArray,
    steelArray,
    formArray,
    masonryBlocksArray,
    masonryMortarArray,
    masonryGroutArray,
    getPositionsFor,
    addConcreteItem,
    removeConcreteItem,
    addSteelItem,
    removeSteelItem,
    addFormItem,
    removeFormItem,
    addMasonryBlock,
    removeMasonryBlock,
    addMasonryMortar,
    removeMasonryMortar,
    addMasonryGrout,
    removeMasonryGrout,
    toPayload,
  };
};

export type UseModuleV2FormReturn = ReturnType<typeof useModuleV2Form>;
