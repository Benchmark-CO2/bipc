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
import { Plus, GripVertical } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import BuildingVisualizer from "../building-visualizer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

        {fields.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <p>Nenhum pavimento adicionado ainda.</p>
            <p className="text-sm mt-1">
              Selecione uma categoria e clique em "Adicionar" para começar.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const canDropHere =
              draggedIndex !== null &&
              watchedFloors[draggedIndex]?.category ===
                watchedFloors[index]?.category;

            return (
              <div
                key={field.id}
                className={`flex gap-2 items-center transition-opacity ${
                  draggedIndex === index ? "opacity-50" : ""
                } ${draggedIndex !== null && !canDropHere ? "opacity-30" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <Card className="relative w-full">
                  <CardContent className="px-4">
                    <div className="flex items-center gap-4">
                      {/* Indicador de cor da categoria */}
                      <div
                        className="w-4 h-16 rounded-md flex-shrink-0"
                        style={{
                          backgroundColor:
                            categoryColors[
                              watchedFloors[index]?.category || "standard_floor"
                            ],
                        }}
                      />

                      <div className="flex-1 grid grid-cols-4 gap-3 items-end">
                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Nome *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: Cobertura"
                                  className="h-10"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.area`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                Área (m²) *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="100"
                                  className="h-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : 0
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.height`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                Altura (m) *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="3"
                                  className="h-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : 0
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.repetition`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                Quantidade *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  className="h-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : 1
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`data.floor_groups.${index}.category`}
                          render={({ field }) => (
                            <FormItem className="col-span-4 mt-2">
                              <FormLabel>Categoria *</FormLabel>
                              <FormControl className="w-full">
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione a categoria" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="penthouse_floor">
                                      🏢 Cobertura
                                    </SelectItem>
                                    <SelectItem value="standard_floor">
                                      🏗️ Tipo
                                    </SelectItem>
                                    <SelectItem value="ground_floor">
                                      🌍 Térreo
                                    </SelectItem>
                                    <SelectItem value="basement_floor">
                                      🔸 Subsolo
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* <FormField
                        control={form.control}
                        name={`floors.${index}.underground`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-y-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mb-0"
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-center">
                              Subsolo
                            </FormLabel>
                          </FormItem>
                        )}
                      /> */}
                      </div>

                      <Button
                        type="button"
                        onClick={() => removeFloor(index)}
                        variant="destructive"
                        size="sm"
                        className="flex-shrink-0 h-10"
                      >
                        Remover
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UnitFormTower;
