import {
  ModuleV2FormInput,
  ModuleV2FormSchema,
  createModuleV2FormSchema,
} from "@/validators/moduleFormByType.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { TModulesTypes } from "@/types/modules";
import { cleanZeroItemsBeforeSubmit } from "@/components/layout/drawer-form-module/aggregate-helpers";
import {
  DEFAULT_FCK_BY_POSITION,
  GROUT_POSITIONS,
  MATERIAL_POSITIONS_BY_TYPE,
  TMaterialKind,
} from "@/utils/modulePositions";
import { getDefaultValuesByType } from "@/components/layout/drawer-form-module/module-default-values";

type UseModuleV2FormArgs = {
  type: TModulesTypes;
  initialModuleData?: {
    type: TModulesTypes;
    data?: unknown;
  };
  stepperMode?: boolean;
  isOpen?: boolean;
};

const makeConcreteItem = (position: string) => ({
  fck: DEFAULT_FCK_BY_POSITION[position] ?? 25,
  volume: "0" as unknown as number,
  position,
  customFck: false,
});

const makeSteelItem = (position: string) => ({
  material: "rebar" as const,
  resistance: "CA50" as const,
  mass: "0" as unknown as number,
  position,
});

const makeFormItem = (position: string) => ({
  area: "0" as unknown as number,
  position,
});

export const useModuleV2Form = ({
  type,
  initialModuleData,
  stepperMode = false,
  isOpen = false,
}: UseModuleV2FormArgs) => {
  const schemaResolver = useMemo(
    () => zodResolver(createModuleV2FormSchema()),
    [],
  );

  const defaultValues = useMemo<ModuleV2FormInput>(() => {
    const baseDefaults = getDefaultValuesByType(
      type,
    ) as unknown as ModuleV2FormInput;
    if (
      initialModuleData &&
      typeof initialModuleData === "object" &&
      initialModuleData.type === type &&
      initialModuleData.data &&
      typeof initialModuleData.data === "object" &&
      Object.keys(initialModuleData.data).length > 0
    ) {
      return {
        type,
        data: {
          ...((baseDefaults as any)?.data ?? {}),
          ...(initialModuleData.data as any),
        },
      } as ModuleV2FormInput;
    }
    return baseDefaults;
  }, [type, initialModuleData]);

  const form = useForm<ModuleV2FormInput, unknown, ModuleV2FormSchema>({
    resolver: schemaResolver as never,
    defaultValues,
    mode: "onChange",
  });

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
    form.reset(defaultValues);
  }, [type, form, defaultValues]);

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
    const positions = getPositionsFor("concrete");
    concreteArray.append(
      makeConcreteItem(position ?? positions[0] ?? "column") as never,
    );
  };

  const removeConcreteItem = (index: number) => {
    concreteArray.remove(index as never);
  };

  const addSteelItem = (position?: string) => {
    const positions = getPositionsFor("steel");
    steelArray.append(
      makeSteelItem(position ?? positions[0] ?? "column") as never,
    );
  };

  const removeSteelItem = (index: number) => {
    steelArray.remove(index as never);
  };

  const addFormItem = (position?: string) => {
    const positions = getPositionsFor("form");
    if (positions.length === 0) return;
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
          position: groutPosition,
        },
      ],
    } as never);
  };

  const removeMasonryGrout = (index: number) => {
    masonryGroutArray.remove(index as never);
  };

  const toPayload = (): ModuleV2FormSchema => {
    const values = form.getValues();
    return cleanZeroItemsBeforeSubmit(values) as ModuleV2FormSchema;
  };

  return {
    form,
    type: reactiveType,
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
