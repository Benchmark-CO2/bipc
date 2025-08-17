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
import { Switch } from "@/components/ui/switch";
import BuildingVisualizer from "./building-visualizer";

interface UnitFormTowerProps {
  form: UseFormReturn<UnitFormSchema>;
}

const predefinedColors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#FFB347",
  "#87CEEB",
  "#F0E68C",
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      move(draggedIndex, dropIndex);

      // Força uma atualização imediata das posições
      setTimeout(() => {
        const floors = form.getValues("floors");
        floors.forEach((_, index) => {
          form.setValue(`floors.${index}.position`, index, {
            shouldValidate: true,
          });
        });
        form.trigger("floors"); // Força revalidação e re-render
      }, 0);
    }
    setDraggedIndex(null);
  };

  const addFloor = () => {
    const newColor = predefinedColors[fields.length % predefinedColors.length];
    append({
      tower_name: "",
      area: 100,
      height: 0,
      repetition_number: 1,
      underground: false,
      color: newColor,
      position: fields.length, // Auto incrementar posição
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
          key={`building-${watchedFloors?.length || 0}-${JSON.stringify(watchedFloors?.map((f) => ({ color: f.color, repetition: f.repetition_number, underground: f.underground })))}`}
          floors={watchedFloors || []}
        />
      </div>
      {/* Formulário de pavimentos */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Pavimentos
          </h4>
          <Button
            type="button"
            onClick={addFloor}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar pavimento
          </Button>
        </div>

        {fields.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <p>Nenhum pavimento adicionado ainda.</p>
            <p className="text-sm mt-1">
              Clique em "Adicionar pavimento" para começar.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={`flex gap-2 items-center transition-opacity ${
                draggedIndex === index ? "opacity-50" : ""
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
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
                                    e.target.value ? Number(e.target.value) : 0
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
                                    e.target.value ? Number(e.target.value) : 0
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
                                    e.target.value ? Number(e.target.value) : 1
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
                      />
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnitFormTower;
