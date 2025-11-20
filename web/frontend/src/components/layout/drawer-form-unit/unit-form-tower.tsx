import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { masks } from '@/utils/masks';
import { UnitFormSchema } from "@/validators/unitForm.validator";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import React from "react";
import { UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import BuildingVisualizer from "../building-visualizer";

interface UnitFormTowerProps {
  form: UseFormReturn<UnitFormSchema>;
  isEditMode?: boolean;
}

// Cores pré-definidas para cada categoria
const categoryColors = {
  penthouse_floor: "#8B5CF6", // Roxo
  standard_floor: "#3B82F6", // Azul
  ground_floor: "#10B981", // Verde
  basement_floor: "#F59E0B", // Laranja
};

const UnitFormTower: React.FC<UnitFormTowerProps> = ({ form, isEditMode }) => {
  const { t } = useTranslation();
  const { fields, remove, move } = useFieldArray({
    control: form.control,
    name: "data.floor_groups",
  });

  // Usar useWatch para reagir a mudanças em tempo real
  const watchedFloors = useWatch({
    control: form.control,
    name: "data.floor_groups",
    defaultValue: [],
  });

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<
    "penthouse_floor" | "standard_floor" | "ground_floor" | "basement_floor"
  >("standard_floor");
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number | null>(
    null
  );

  // Função para recalcular índices automaticamente
  const recalculateIndices = React.useCallback(() => {
    const floorGroups = form.getValues("data.floor_groups");

    const validFloorGroups = floorGroups.filter(
      (f) =>
        f &&
        f.category &&
        [
          "penthouse_floor",
          "standard_floor",
          "ground_floor",
          "basement_floor",
        ].includes(f.category)
    );

    // Separar por categoria
    const categories = {
      penthouse_floor: validFloorGroups.filter(
        (f) => f.category === "penthouse_floor"
      ),
      standard_floor: validFloorGroups.filter(
        (f) => f.category === "standard_floor"
      ),
      ground_floor: validFloorGroups.filter(
        (f) => f.category === "ground_floor"
      ),
      basement_floor: validFloorGroups.filter(
        (f) => f.category === "basement_floor"
      ),
    };

    // Calcular índices para cada categoria
    const updatedFloors = validFloorGroups.map((floor) => {
      const floorsInCategory = categories[floor.category] || [];
      const indexInCategory = floorsInCategory.indexOf(floor);

      let newIndex: number;

      switch (floor.category) {
        case "basement_floor":
          // Subsolo: índices negativos (-1, -2, -3...)
          newIndex = -(indexInCategory + 1);
          break;
        case "ground_floor":
          // Térreo: índices a partir de 0 (0, 1, 2...)
          newIndex = indexInCategory;
          break;
        case "standard_floor":
          // Tipo: índices acima do térreo
          const maxGroundIndex =
            categories.ground_floor.length > 0
              ? categories.ground_floor.length - 1
              : -1;
          newIndex = maxGroundIndex + 1 + indexInCategory;
          break;
        case "penthouse_floor":
          // Cobertura: índices acima de todos
          const maxStandardIndex =
            categories.standard_floor.length > 0
              ? (categories.ground_floor.length > 0
                  ? categories.ground_floor.length - 1
                  : -1) + categories.standard_floor.length
              : categories.ground_floor.length > 0
                ? categories.ground_floor.length - 1
                : -1;
          newIndex = Math.max(maxStandardIndex + 1, 1) + indexInCategory;
          break;
        default:
          newIndex = 0;
      }

      return { ...floor, index: newIndex };
    });

    form.setValue("data.floor_groups", updatedFloors, {
      shouldValidate: false,
    });
  }, [form]);

  // Recalcular índices sempre que os floors mudarem
  React.useEffect(() => {
    recalculateIndices();
  }, [watchedFloors.length, recalculateIndices]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex !== null) {
      const draggedFloor = watchedFloors[draggedIndex];
      const dropFloor = watchedFloors[dropIndex];

      // Só permite drop se for da mesma categoria
      if (draggedFloor.category === dropFloor.category) {
        e.dataTransfer.dropEffect = "move";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const draggedFloor = watchedFloors[draggedIndex];
      const dropFloor = watchedFloors[dropIndex];

      // Só permite mover se for da mesma categoria
      if (draggedFloor.category === dropFloor.category) {
        move(draggedIndex, dropIndex);
        // Recalcular índices após o movimento
        setTimeout(() => recalculateIndices(), 0);
      }
    }
    setDraggedIndex(null);
  };

  const addFloor = (
    category:
      | "penthouse_floor"
      | "standard_floor"
      | "ground_floor"
      | "basement_floor" = "standard_floor"
  ) => {
    // Encontrar a posição correta para inserir baseada na categoria
    const floor_groups = form.getValues("data.floor_groups");
    const categoryOrder = {
      penthouse_floor: 0,
      standard_floor: 1,
      ground_floor: 2,
      basement_floor: 3,
    };

    // Calcular índice apropriado baseado na categoria e floors existentes
    // (será recalculado automaticamente pela função recalculateIndices)
    const newIndex = 0; // Temporário

    // Encontrar onde inserir baseado na hierarquia das categorias
    let insertIndex = floor_groups.length;

    for (let i = 0; i < floor_groups.length; i++) {
      const floorCategoryOrder = categoryOrder[floor_groups[i].category];
      const newCategoryOrder = categoryOrder[category];

      if (newCategoryOrder < floorCategoryOrder) {
        insertIndex = i;
        break;
      }
    }

    // Criar novo pavimento
    const newFloor = {
      name: "",
      area: 100,
      height: 3.0,
      repetition: 1,
      category: category,
      index: newIndex,
    };

    // Inserir na posição correta
    const updatedFloors = [...floor_groups];
    updatedFloors.splice(insertIndex, 0, newFloor);

    form.setValue("data.floor_groups", updatedFloors, {
      shouldValidate: false,
    });

    // Recalcular índices após adicionar
    setTimeout(() => recalculateIndices(), 0);
  };

  const removeFloor = (index: number) => {
    remove(index);
    // Recalcular índices após remover
    setTimeout(() => recalculateIndices(), 0);
  };

  const unitTypes = [
    { value: "tower", label: t("drawerFormUnit.unitTypeOptions.tower") },
  ];

  return (
    <div className={"flex gap-6 max-sm:flex-col"}>
      {/* Visualizador da torre */}
      <div className="flex-shrink-0 max-sm:mx-auto">
        <BuildingVisualizer
          key={`building-${watchedFloors?.length || 0}-${JSON.stringify(watchedFloors?.map((f) => ({ color: categoryColors[f.category], repetition: f.repetition, category: f.category })))}`}
          floors={
            watchedFloors?.map((floor) => ({
              ...floor,
              color: categoryColors[floor.category],
            })) || []
          }
        />
      </div>
      {/* Formulário de pavimentos */}
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-4 items-baseline max-sm:grid-cols-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("drawerFormUnit.unitNameLabel")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("drawerFormUnit.unitNamePlaceholder")}
                    disabled={isEditMode}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("drawerFormUnit.unitTypeLabel")}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={unitTypes.length <= 1}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("drawerFormUnit.unitTypePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Pavimentos
          </h4>
          {!isEditMode && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(
                    value as
                      | "penthouse_floor"
                      | "standard_floor"
                      | "ground_floor"
                      | "basement_floor"
                  )
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="penthouse_floor">Cobertura</SelectItem>
                  <SelectItem value="standard_floor">Tipo</SelectItem>
                  <SelectItem value="ground_floor">Térreo</SelectItem>
                  <SelectItem value="basement_floor">Subsolo</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => addFloor(selectedCategory)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-green-600 border-green-600 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          )}
        </div>

        {fields.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>Nenhum pavimento adicionado ainda.</p>
            <p className="text-sm mt-1">
              Selecione uma categoria e clique em "Adicionar" para começar.
            </p>
          </Card>
        ) : (
          <div className="border rounded-md border-gray-shade-200 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-4"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-24">Área (m²)</TableHead>
                  <TableHead className="w-24">Altura (m)</TableHead>
                  <TableHead className="w-20">Qtd.</TableHead>
                  <TableHead className="w-32">Categoria</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const canDropHere =
                    draggedIndex !== null &&
                    watchedFloors[draggedIndex]?.category ===
                      watchedFloors[index]?.category;

                  return (
                    <TableRow
                      key={field.id}
                      className={`transition-all duration-200 ${
                        draggedIndex === index ? "opacity-50" : ""
                      } ${draggedIndex !== null && !canDropHere ? "opacity-30" : ""}
                      ${focusedRowIndex === index ? "shadow-sm shadow-blue-200 dark:shadow-blue-900 bg-blue-50 dark:bg-blue-950/20" : ""}
                      `}
                      draggable={!isEditMode}
                      style={{
                        cursor: !isEditMode ? "grab" : "default",
                        backgroundColor: canDropHere
                          ? "rgba(147, 197, 253, 0.2)" // Azul claro quando pode dar drop
                          : focusedRowIndex === index
                            ? undefined // Deixa o CSS className cuidar da cor de foco
                            : "transparent",
                      }}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      </TableCell>
                      <TableCell>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              categoryColors[
                                watchedFloors[index]?.category ||
                                  "standard_floor"
                              ],
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.name`}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormControl>
                                <Tooltip open={!!fieldState.error}>
                                  <TooltipTrigger asChild>
                                    <Input
                                      placeholder="Ex: Cobertura"
                                      disabled={isEditMode}
                                      className={`h-8 bg-transparent px-2 py-1 focus-visible:ring-0 w-full max-sm:min-w-[100px] ${
                                        fieldState.error
                                          ? "border border-red-500"
                                          : "border-0"
                                      }`}
                                      {...field}
                                      onFocus={() => setFocusedRowIndex(index)}
                                      onBlur={() => setFocusedRowIndex(null)}
                                    />
                                  </TooltipTrigger>
                                  {fieldState.error && (
                                    <TooltipContent
                                      className="bg-red-600 border-red-700 text-white"
                                      arrowClassName="bg-red-600 fill-red-600"
                                    >
                                      <p className="text-sm">
                                        {fieldState.error.message}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.area`}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormControl>
                                <Tooltip open={!!fieldState.error}>
                                  <TooltipTrigger asChild>
                                    <Input
                                      type="text"
                                      placeholder="100"
                                      disabled={isEditMode}
                                      className={`h-8 bg-transparent px-2 py-1 focus-visible:ring-0 w-full ${
                                        fieldState.error
                                          ? "border border-red-500"
                                          : "border-0"
                                      }`}
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          masks.numeric(e.target.value
                                            ? e.target.value
                                            : '0')
                                        )
                                      }
                                      onFocus={() => setFocusedRowIndex(index)}
                                      onBlur={() => setFocusedRowIndex(null)}
                                    />
                                  </TooltipTrigger>
                                  {fieldState.error && (
                                    <TooltipContent
                                      className="bg-red-600 border-red-700 text-white"
                                      arrowClassName="bg-red-600 fill-red-600"
                                    >
                                      <p className="text-sm">
                                        {fieldState.error.message}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.height`}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormControl>
                                <Tooltip open={!!fieldState.error}>
                                  <TooltipTrigger asChild>
                                    <Input
                                      type="text"
                                      placeholder="3"
                                      disabled={isEditMode}
                                      className={`h-8 bg-transparent px-2 py-1 focus-visible:ring-0 w-full ${
                                        fieldState.error
                                          ? "border border-red-500"
                                          : "border-0"
                                      }`}
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value
                                            ? masks.numeric(e.target.value)
                                            : '0'
                                        )
                                      }
                                      onFocus={() => setFocusedRowIndex(index)}
                                      onBlur={() => setFocusedRowIndex(null)}
                                    />
                                  </TooltipTrigger>
                                  {fieldState.error && (
                                    <TooltipContent
                                      className="bg-red-600 border-red-700 text-white"
                                      arrowClassName="bg-red-600 fill-red-600"
                                    >
                                      <p className="text-sm">
                                        {fieldState.error.message}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.repetition`}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormControl>
                                <Tooltip open={!!fieldState.error}>
                                  <TooltipTrigger asChild>
                                    <Input
                                      type="number"
                                      min="1"
                                      step="1"
                                      placeholder="1"
                                      disabled={isEditMode}
                                      className={`h-8 bg-transparent px-2 py-1 focus-visible:ring-0 w-full ${
                                        fieldState.error
                                          ? "border border-red-500"
                                          : "border-0"
                                      }`}
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value
                                            ? Number(e.target.value)
                                            : 1
                                        )
                                      }
                                      onFocus={() => setFocusedRowIndex(index)}
                                      onBlur={() => setFocusedRowIndex(null)}
                                    />
                                  </TooltipTrigger>
                                  {fieldState.error && (
                                    <TooltipContent
                                      className="bg-red-600 border-red-700 text-white"
                                      arrowClassName="bg-red-600 fill-red-600"
                                    >
                                      <p className="text-sm">
                                        {fieldState.error.message}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.category`}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormControl>
                                <Tooltip open={!!fieldState.error}>
                                  <TooltipTrigger asChild>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      disabled={isEditMode}
                                    >
                                      <SelectTrigger
                                        className={`h-8 bg-transparent px-2 py-1 focus-visible:ring-0 w-full ${
                                          fieldState.error
                                            ? "border border-red-500"
                                            : "border-0"
                                        }`}
                                        onFocus={() =>
                                          setFocusedRowIndex(index)
                                        }
                                        onBlur={() => setFocusedRowIndex(null)}
                                      >
                                        <SelectValue placeholder="Categoria" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="penthouse_floor">
                                          Cobertura
                                        </SelectItem>
                                        <SelectItem value="standard_floor">
                                          Tipo
                                        </SelectItem>
                                        <SelectItem value="ground_floor">
                                          Térreo
                                        </SelectItem>
                                        <SelectItem value="basement_floor">
                                          Subsolo
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TooltipTrigger>
                                  {fieldState.error && (
                                    <TooltipContent
                                      className="bg-red-600 border-red-700 text-white"
                                      arrowClassName="bg-red-600 fill-red-600"
                                    >
                                      <p className="text-sm">
                                        {fieldState.error.message}
                                      </p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          onClick={() => removeFloor(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isEditMode}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitFormTower;
