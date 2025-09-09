import React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { UnitFormSchema } from "@/validators/unitForm.validator";
import { Button } from "../../ui/button";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import BuildingVisualizer from "../building-visualizer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
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

interface UnitFormTowerProps {
  form: UseFormReturn<UnitFormSchema>;
}

// Cores pré-definidas para cada categoria
const categoryColors = {
  penthouse_floor: "#8B5CF6", // Roxo
  standard_floor: "#3B82F6", // Azul
  ground_floor: "#10B981", // Verde
  basement_floor: "#F59E0B", // Laranja
};

const UnitFormTower: React.FC<UnitFormTowerProps> = ({ form }) => {
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

  console.log(watchedFloors);

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<
    "penthouse_floor" | "standard_floor" | "ground_floor" | "basement_floor"
  >("standard_floor");

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
    };

    // Inserir na posição correta
    const updatedFloors = [...floor_groups];
    updatedFloors.splice(insertIndex, 0, newFloor);

    form.setValue("data.floor_groups", updatedFloors, {
      shouldValidate: false,
    });
  };

  const removeFloor = (index: number) => {
    remove(index);
  };

  return (
    <div className="flex gap-6">
      {/* Visualizador da torre */}
      <div className="flex-shrink-0">
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
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Pavimentos
          </h4>
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
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        {fields.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>Nenhum pavimento adicionado ainda.</p>
            <p className="text-sm mt-1">
              Selecione uma categoria e clique em "Adicionar" para começar.
            </p>
          </Card>
        ) : (
          <div className="border rounded-md">
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
                      className={`transition-opacity ${
                        draggedIndex === index ? "opacity-50" : ""
                      } ${draggedIndex !== null && !canDropHere ? "opacity-30" : ""}`}
                      draggable
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
                                      className={`h-8 bg-transparent px-2 py-1 focus-visible:ring-0 w-full ${
                                        fieldState.error
                                          ? "border border-red-500"
                                          : "border-0"
                                      }`}
                                      {...field}
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
                                      type="number"
                                      step="0.01"
                                      placeholder="100"
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
                                            : 0
                                        )
                                      }
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
                                      type="number"
                                      step="0.01"
                                      placeholder="3"
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
                                            : 0
                                        )
                                      }
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
                                      placeholder="1"
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
                                    >
                                      <SelectTrigger
                                        className={`h-8 bg-transparent px-2 py-1 focus-visible:ring-0 w-full ${
                                          fieldState.error
                                            ? "border border-red-500"
                                            : "border-0"
                                        }`}
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
