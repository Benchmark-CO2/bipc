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

const predefinedColors = [
  "#FF6B6B",
  "#45B7D1",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
];

const UnitFormTower: React.FC<UnitFormTowerProps> = ({ form }) => {
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "floors",
  });

  // Usar useWatch para reagir a mudanças em tempo real
  const watchedFloors = useWatch({
    control: form.control,
    name: "floors",
    defaultValue: [],
  });

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<
    "roof" | "typical" | "ground" | "basement"
  >("typical");

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

        // Atualiza apenas as posições sem forçar validação
        setTimeout(() => {
          const floors = form.getValues("floors");
          floors.forEach((_, index) => {
            form.setValue(`floors.${index}.position`, index, {
              shouldValidate: false,
            });
          });
        }, 0);
      }
    }
    setDraggedIndex(null);
  };

  const addFloor = (
    category: "roof" | "typical" | "ground" | "basement" = "typical"
  ) => {
    const newColor = predefinedColors[fields.length % predefinedColors.length];

    // Encontrar a posição correta para inserir no topo da categoria
    const floors = form.getValues("floors");
    const categoryOrder = {
      roof: 0,
      typical: 1,
      ground: 2,
      basement: 3,
    };

    // Encontrar floors da mesma categoria
    const sameCategoryFloors = floors.filter(
      (floor) => floor.category === category
    );
    let newPosition = floors.length; // posição padrão no final

    if (sameCategoryFloors.length > 0) {
      // Se existem floors da mesma categoria, inserir no topo dessa categoria
      const positions = sameCategoryFloors.map((floor) => floor.position);
      newPosition = Math.min(...positions);
    } else {
      // Se não existe nenhum floor dessa categoria, encontrar posição baseada na hierarquia
      for (const [cat, order] of Object.entries(categoryOrder)) {
        if (categoryOrder[category] <= order) {
          const categoryFloors = floors.filter(
            (floor) => floor.category === cat
          );
          if (categoryFloors.length > 0) {
            const positions = categoryFloors.map((floor) => floor.position);
            newPosition = Math.min(...positions);
            break;
          }
        }
      }
    }

    // Ajustar posições dos floors existentes
    floors.forEach((floor, index) => {
      if (floor.position >= newPosition) {
        form.setValue(`floors.${index}.position`, floor.position + 1, {
          shouldValidate: false,
        });
      }
    });

    append({
      tower_name: "",
      area: 100,
      height: 0,
      repetition_number: 1,
      category: category,
      color: newColor,
      position: newPosition,
    });

    // Reorganizar após adicionar
    setTimeout(reorganizeByCategory, 0);
  };

  const removeFloor = (index: number) => {
    remove(index);
  };

  const reorganizeByCategory = () => {
    const floors = form.getValues("floors");

    // Agrupar por categoria e manter ordem interna
    const floorsByCategory = {
      roof: floors
        .filter((f) => f.category === "roof")
        .sort((a, b) => a.position - b.position),
      typical: floors
        .filter((f) => f.category === "typical")
        .sort((a, b) => a.position - b.position),
      ground: floors
        .filter((f) => f.category === "ground")
        .sort((a, b) => a.position - b.position),
      basement: floors
        .filter((f) => f.category === "basement")
        .sort((a, b) => a.position - b.position),
    };

    // Reorganizar em ordem: roof -> typical -> ground -> basement
    const sortedFloors = [
      ...floorsByCategory.roof,
      ...floorsByCategory.typical,
      ...floorsByCategory.ground,
      ...floorsByCategory.basement,
    ];

    // Atualizar posições
    sortedFloors.forEach((floor, index) => {
      floor.position = index;
    });

    // Definir novos valores no formulário
    form.setValue("floors", sortedFloors, { shouldValidate: false });
  };

  return (
    <div className="flex gap-6">
      {/* Visualizador da torre */}
      <div className="flex-shrink-0">
        <BuildingVisualizer
          key={`building-${watchedFloors?.length || 0}-${JSON.stringify(watchedFloors?.map((f) => ({ color: f.color, repetition: f.repetition_number, category: f.category })))}`}
          floors={watchedFloors || []}
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
                  value as "roof" | "typical" | "ground" | "basement"
                )
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roof">Cobertura</SelectItem>
                <SelectItem value="typical">Tipo</SelectItem>
                <SelectItem value="ground">Térreo</SelectItem>
                <SelectItem value="basement">Subsolo</SelectItem>
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
                      <FormField
                        control={form.control}
                        name={`floors.${index}.color`}
                        render={({ field }) => (
                          <FormItem className="flex-shrink-0 absolute left-4 rounded-md">
                            <FormControl>
                              <Input
                                type="color"
                                className="w-4 h-20 p-0 cursor-pointer shadow-none border-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex-1 grid grid-cols-5 gap-3 items-end pl-8">
                        {/* Campo oculto para position */}
                        <FormField
                          control={form.control}
                          name={`floors.${index}.position`}
                          render={({ field }) => (
                            <FormItem className="hidden">
                              <FormControl>
                                <Input type="hidden" {...field} value={index} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`floors.${index}.tower_name`}
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
                          name={`floors.${index}.area`}
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
                          name={`floors.${index}.height`}
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
                          name={`floors.${index}.repetition_number`}
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
                          name={`floors.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria *</FormLabel>
                              <FormControl className="w-full">
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    // Reorganizar após mudança de categoria
                                    setTimeout(reorganizeByCategory, 0);
                                  }}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue
                                      placeholder="Selecione a categoria"
                                      {...field}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="roof">
                                      Cobertura
                                    </SelectItem>
                                    <SelectItem value="typical">
                                      Tipo
                                    </SelectItem>
                                    <SelectItem value="ground">
                                      Térreo
                                    </SelectItem>
                                    <SelectItem value="basement">
                                      Subsolo
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
