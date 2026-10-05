import { getUserUnknownModules } from "@/actions/unknownModules/getUserUnknownModules";
import { postUnknownModule } from "@/actions/unknownModules/postUnknownModule";
import type {
  ApplyUnknownModulePayload,
  CreateUnknownModulePayload,
  TUnknownModule,
} from "@/types/unknownModules";
import BuildingVisualizer from "@/components/layout/building-visualizer";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { TTowerFloorCategory } from "@/types/units";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Loader2, Trash2, X } from "lucide-react";
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const NEW_TECHNOLOGY_VALUE = "unknown_module";

const CATEGORIES = ["fundação", "estrutura", "vedações"] as const;

const UNITS: readonly { value: string; label: string }[] = [
  { value: "kg", label: "kg" },
  { value: "m2", label: "m²" },
  { value: "m3", label: "m³" },
  { value: "m", label: "m" },
  { value: "other", label: "Outro" },
];

interface ReferenceItem {
  id: string;
  url: string;
}

interface MaterialItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface UnknownModuleFormState {
  disabled: boolean;
  isPending: boolean;
}

export interface UnknownModuleFormHandle {
  submit: () => void;
}

export interface UnknownModuleFormProps {
  projectId: string;
  unitId?: string;
  optionId?: string;
  floors?: TTowerFloorCategory[];
  technologyId?: string;
  onTechnologyIdChange?: (value: string) => void;
  footerState?: (state: UnknownModuleFormState) => void;
  onSuccess?: () => void;
  projectTypes?: readonly { value: string; label: string }[];
  ref?: React.Ref<UnknownModuleFormHandle>;
}

interface DrawerFormUnknownModuleProps extends UnknownModuleFormProps {
  triggerComponent?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface TechnologyFieldsProps extends UnknownModuleFormProps {
  isNewTechnology: boolean;
  selectedType: TUnknownModule | null;
  hasReferenceSection: boolean;
}

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const getSubmitError = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { error?: unknown } } })
    ?.response?.data?.error;
  if (typeof data === "string" && data.length > 0) return data;
  if (typeof data === "object" && data !== null) {
    const parts = Object.values(data as Record<string, unknown>).filter(
      (v) => typeof v === "string" && v.length > 0,
    );
    if (parts.length > 0) return parts.join("; ");
  }
  return fallback;
};

function TechnologyFields({
  projectId,
  unitId,
  optionId,
  isNewTechnology,
  selectedType,
  hasReferenceSection,
  footerState,
  onSuccess,
  ref,
}: TechnologyFieldsProps) {
  const queryClient = useQueryClient();

  const [techName, setTechName] = useState("");
  const [techCategory, setTechCategory] = useState<string>("estrutura");
  const [techDescription, setTechDescription] = useState("");
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>(() => [
    { id: newId(), name: "", quantity: "", unit: "" },
  ]);
  const [showErrors, setShowErrors] = useState(false);

  const addReference = () =>
    setReferences((prev) => [...prev, { id: newId(), url: "" }]);

  const updateReference = (id: string, url: string) =>
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, url } : r)));

  const removeReference = (id: string) =>
    setReferences((prev) => prev.filter((r) => r.id !== id));

  const addMaterial = () =>
    setMaterials((prev) => [
      ...prev,
      { id: newId(), name: "", quantity: "", unit: "" },
    ]);

  const updateMaterial = (
    id: string,
    patch: Partial<Omit<MaterialItem, "id">>,
  ) =>
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );

  const removeMaterial = (id: string) =>
    setMaterials((prev) => prev.filter((m) => m.id !== id));

  const cleanMaterials = (): ApplyUnknownModulePayload["materials"] =>
    materials
      .filter((m) => m.name.trim().length > 0 && m.unit.length > 0)
      .map((m) => ({
        name: m.name.trim(),
        quantity: Number(m.quantity) || 0,
        unit: m.unit,
      }));

  const isSubmitDisabled =
    (isNewTechnology && techName.trim().length === 0) || !unitId || !optionId;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!unitId || !optionId) {
        throw new Error(
          "Selecione a simulação (option) para adicionar a tecnologia.",
        );
      }
      if (isNewTechnology) {
        const payload: CreateUnknownModulePayload = {
          category: techCategory as CreateUnknownModulePayload["category"],
          name: techName.trim(),
          description: techDescription.trim() || undefined,
          references: references
            .map((r) => r.url.trim())
            .filter((url) => url.length > 0),
          materials: cleanMaterials(),
        };
        return postUnknownModule(projectId, unitId, optionId, payload);
      }
      if (!selectedType) {
        throw new Error("Tecnologia construtiva não encontrada.");
      }
      const payload: ApplyUnknownModulePayload = {
        unknown_module_id: selectedType.id,
        materials: cleanMaterials(),
      };
      return postUnknownModule(projectId, unitId, optionId, payload);
    },
    onSuccess: () => {
      toast.success(
        isNewTechnology
          ? "Módulo de tecnologia construtiva criado com sucesso"
          : "Tecnologia construtiva aplicada à simulação com sucesso",
        { duration: 5000 },
      );
      void queryClient.invalidateQueries({
        queryKey: ["unknown-modules", "user"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        isNewTechnology
          ? "Erro ao criar o módulo de tecnologia construtiva"
          : "Erro ao aplicar a tecnologia construtiva",
        {
          description: getSubmitError(error, "Tente novamente mais tarde."),
          duration: 5000,
        },
      );
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        if (!unitId || !optionId) {
          toast.error(
            "Selecione a simulação (option) para adicionar a tecnologia.",
          );
          return;
        }
        if (isNewTechnology && techName.trim().length === 0) {
          setShowErrors(true);
          toast.error("Informe o nome da tecnologia.");
          return;
        }
        mutate();
      },
    }),
    [unitId, optionId, isNewTechnology, techName, mutate],
  );

  useEffect(() => {
    footerState?.({ disabled: isSubmitDisabled, isPending });
  }, [footerState, isSubmitDisabled, isPending]);

  return (
    <>
      {!isNewTechnology && selectedType && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          Tecnologia existente. O nome, a categoria e a descrição são definidos
          no cadastro original. Informe aqui apenas os materiais e quantidades
          desta aplicação.
        </p>
      )}

      {/* Nome da tecnologia */}
      {isNewTechnology && (
        <div className="space-y-1.5">
          <label className="text-sm text-gray-500">Nome da tecnologia</label>
          <Input
            value={techName}
            onChange={(e) => {
              setTechName(e.target.value);
              if (showErrors) setShowErrors(false);
            }}
            disabled={!isNewTechnology}
            className={cn(
              "h-11",
              showErrors && techName.trim().length === 0
                ? "border-red-500"
                : "",
            )}
          />
          {showErrors && techName.trim().length === 0 && (
            <p className="text-xs font-medium text-red-600">
              Informe o nome da tecnologia
            </p>
          )}
        </div>
      )}

      {/* Categoria */}
      <div className="space-y-1.5">
        <label className="text-sm text-gray-500">Categoria</label>
        <Select
          value={
            isNewTechnology
              ? techCategory
              : (selectedType?.category ?? techCategory)
          }
          onValueChange={(value) => {
            if (isNewTechnology) setTechCategory(value);
          }}
          disabled={!isNewTechnology}
        >
          <SelectTrigger className="w-full" style={{ height: 44 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <label className="text-sm text-gray-500">Descrição</label>
        <Textarea
          value={
            isNewTechnology
              ? techDescription
              : (selectedType?.description ?? "")
          }
          onChange={(e) => {
            if (isNewTechnology) setTechDescription(e.target.value);
          }}
          disabled={!isNewTechnology}
          rows={4}
          className="resize-none w-full min-h-[110px]"
        />
      </div>

      {/* Link de referência */}
      {hasReferenceSection && (
        <div className="space-y-2">
          <label className="text-sm text-gray-500">Link de referência</label>
          {isNewTechnology ? (
            references.map((ref) => (
              <div key={ref.id} className="flex items-center gap-2">
                <Input
                  value={ref.url}
                  onChange={(e) => updateReference(ref.id, e.target.value)}
                  placeholder="https://..."
                  className="h-11 flex-1 min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeReference(ref.id)}
                  style={{ width: 44, height: 44, padding: 0 }}
                  className="shrink-0 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-600 rounded-md"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                </Button>
              </div>
            ))
          ) : (
            (selectedType?.references ?? []).map((url) => (
              <div key={url} className="flex items-center gap-2">
                <Input
                  value={url}
                  disabled
                  placeholder="https://..."
                  className="h-11 flex-1 min-w-0"
                />
              </div>
            ))
          )}
          {isNewTechnology && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline-bipc"
                onClick={addReference}
                className="h-[27px] text-sm"
              >
                Adicionar
              </Button>
            </div>
          )}
        </div>
      )}

      {hasReferenceSection && (
        <div className="border-t border-gray-200 my-2" />
      )}

      {/* Materiais (opcional e informativo) */}
      <div>
        <h3 className="text-[23px] font-semibold text-primary mb-3">
          Materiais
        </h3>
        <div className="border border-primary rounded-lg p-3 bg-white space-y-3">
          <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Os materiais são opcionais e apenas informativos. Não será calculado
            consumo para esta tecnologia.
          </p>
          {materials.map((material) => (
            <div
              key={material.id}
              className="border border-gray-200 rounded-lg p-3 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5 space-y-1.5">
                  <label className="text-[13px] text-gray-500">Nome</label>
                  <Input
                    value={material.name}
                    onChange={(e) =>
                      updateMaterial(material.id, {
                        name: e.target.value,
                      })
                    }
                    placeholder="Ex.: Gesso"
                    className="h-[43px] w-full"
                  />
                </div>
                <div className="col-span-12 sm:col-span-3 space-y-1.5">
                  <label className="text-[13px] text-gray-500">
                    Quantidade
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={material.quantity}
                    onChange={(e) =>
                      updateMaterial(material.id, {
                        quantity: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-[43px] w-full"
                  />
                </div>
                <div className="col-span-12 sm:col-span-2 space-y-1.5">
                  <label className="text-[13px] text-gray-500">Unidade</label>
                  <Select
                    value={material.unit}
                    onValueChange={(value) =>
                      updateMaterial(material.id, { unit: value })
                    }
                  >
                    <SelectTrigger className="w-full" style={{ height: 43 }}>
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-2 flex sm:items-end sm:justify-end sm:pb-[2px]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMaterial(material.id)}
                    style={{ width: 44, height: 43, padding: 0 }}
                    className="shrink-0 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-500 rounded-md"
                  >
                    <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline-bipc"
              onClick={addMaterial}
              className="h-[27px] text-sm"
            >
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function UnknownModuleForm({
  projectId,
  unitId,
  optionId,
  floors = [],
  technologyId,
  onTechnologyIdChange,
  footerState,
  onSuccess,
  projectTypes = [],
  ref,
}: UnknownModuleFormProps) {
  const isMobile = useIsMobile();

  const [internalTechnologyId, setInternalTechnologyId] =
    useState<string>(NEW_TECHNOLOGY_VALUE);

  const selectedTechnologyId = technologyId ?? internalTechnologyId;

  const { data: typesData } = useQuery({
    queryKey: ["unknown-modules", "user"],
    queryFn: async () => {
      const res = await getUserUnknownModules();
      return res.data.unknown_modules ?? [];
    },
  });

  const userTypes: TUnknownModule[] = useMemo(
    () => typesData ?? [],
    [typesData],
  );

  const isNewTechnology = selectedTechnologyId === NEW_TECHNOLOGY_VALUE;
  const selectedType = isNewTechnology
    ? null
    : (userTypes.find((t) => t.id === selectedTechnologyId) ?? null);

  const hasReferenceSection =
    isNewTechnology || (selectedType?.references?.length ?? 0) > 0;

  return (
    <div className="flex gap-6 w-full h-full max-sm:flex-col max-sm:min-h-0">
      {/* Painel esquerdo — Pavimentos (mesmo visual do módulo, seleção desativada) */}
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
            towerFloors={floors || []}
            isSelectable={false}
            selectedFloorIds={[]}
            complete={true}
          />
        </div>
      </div>

      {/* Painel direito — Dados da tecnologia */}
      <div className="flex-1 min-w-0">
        <div className="p-4 border rounded-lg border-gray-shade-200 space-y-4 bg-card">
          <h2 className="text-2xl font-semibold text-primary mb-2">
            Dados da tecnologia
          </h2>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-500">
              Tecnologia construtiva
            </label>
            <Select
              value={selectedTechnologyId}
              onValueChange={(value) => {
                setInternalTechnologyId(value);
                onTechnologyIdChange?.(value);
              }}
            >
              <SelectTrigger className="w-full" style={{ height: 44 }}>
                <SelectValue placeholder="Selecione a tecnologia" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
                {(projectTypes.length > 0 || userTypes.length > 0) && (
                  <SelectSeparator />
                )}
                {userTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} (Criado pelo usuário)
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value={NEW_TECHNOLOGY_VALUE}>
                  Nova tecnologia
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-gray-200 my-2" />

          <TechnologyFields
            key={selectedTechnologyId}
            ref={ref}
            projectId={projectId}
            unitId={unitId}
            optionId={optionId}
            isNewTechnology={isNewTechnology}
            selectedType={selectedType}
            hasReferenceSection={hasReferenceSection}
            footerState={footerState}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  );
}

export default function DrawerFormUnknownModule({
  triggerComponent,
  projectId,
  unitId,
  optionId,
  floors = [],
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: DrawerFormUnknownModuleProps) {
  const isMobile = useIsMobile();
  const formRef = useRef<UnknownModuleFormHandle>(null);
  const [footer, setFooter] = useState<UnknownModuleFormState>({
    disabled: true,
    isPending: false,
  });

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (isControlled) setControlledOpen?.(next);
    else setInternalOpen(next);
  };

  const [openCount, setOpenCount] = useState(0);
  const openDrawer = (next: boolean) => {
    if (next) setOpenCount((c) => c + 1);
    setIsOpen(next);
  };

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      dismissible={false}
      onOpenChange={openDrawer}
    >
      {triggerComponent && (
        <DrawerTrigger asChild>{triggerComponent}</DrawerTrigger>
      )}
      <DrawerContent
        className={cn("w-full max-w-[1039px]", {
          "w-full h-[92vh]": isMobile,
        })}
      >
        <DrawerHeader className="px-8">
          <DrawerTitle className="text-h1 text-primary">
            Nova tecnologia
          </DrawerTitle>
          <Button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="mx-auto w-full p-6 pt-0 flex overflow-auto max-sm:min-h-0">
          <UnknownModuleForm
            key={openCount}
            ref={formRef}
            projectId={projectId}
            unitId={unitId}
            optionId={optionId}
            floors={floors}
            onSuccess={() => setIsOpen(false)}
            footerState={setFooter}
          />
        </div>

        <DrawerFooter className="px-8">
          <Button
            variant="bipc"
            className="w-full h-[42px] text-sm"
            onClick={() => formRef.current?.submit()}
            disabled={footer.disabled || footer.isPending}
          >
            {footer.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Adicionar tecnologia
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white text-active">
                  <Layers className="h-3.5 w-3.5" />
                </span>
              </>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}