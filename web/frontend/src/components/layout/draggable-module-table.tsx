import { useState } from "react";
import { ModuleTable } from "@/components/layout";
import { IModuleItem, TModulesTypes } from "@/types/modules";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface DraggableModuleTableProps {
  tableId: TModulesTypes;
  modules: IModuleItem[];
  projectId: string;
  unitId: string;
  onSelectionChange?: (selectedModules: IModuleItem[]) => void;
  onDragStart: (moduleType: TModulesTypes) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, moduleType: TModulesTypes) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export default function DraggableModuleTable({
  tableId,
  modules,
  projectId,
  unitId,
  onSelectionChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}: DraggableModuleTableProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart(tableId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, tableId);
  };

  const handleDragEnd = () => {
    setIsDragOver(false);
    onDragEnd();
  };

  // Botão de arrastar para usar como dragHandle
  const dragHandleButton = (
    <Button
      variant="outline"
      size="sm"
      className="cursor-move opacity-70 hover:opacity-100 transition-opacity"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={t("modulesTable.dragToReorder")}
    >
      <GripVertical className="h-4 w-4" />
    </Button>
  );

  return (
    <div
      className={`relative transition-all duration-200 ${
        isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"
      } ${isDragOver ? "ring-2 ring-primary ring-offset-2 bg-primary/5" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Indicador visual quando está sendo arrastado sobre */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 pointer-events-none border-2 border-dashed border-primary bg-primary/10 rounded-lg flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg border border-primary/20 backdrop-blur-sm">
            <span className="text-sm font-medium text-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              {t("modulesTable.dropToReorder")}
            </span>
          </div>
        </div>
      )}

      <ModuleTable
        tableId={tableId}
        modules={modules}
        projectId={projectId}
        unitId={unitId}
        onSelectionChange={onSelectionChange}
        dragHandle={dragHandleButton}
      />
    </div>
  );
}
