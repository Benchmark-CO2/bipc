import React from "react";
import { FloorSchema, FloorFormInput } from "@/validators/unitForm.validator";
import { TTowerFloorCategory } from "@/types/units";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UnifiedFloor,
  convertTowerFloorsToUnified,
  convertFloorSchemaToUnified,
  convertFloorFormInputToUnified,
} from "@/utils/unitConversions";

// Helper para verificar se é FloorFormInput (com strings) ou FloorSchema (com números)
const isFloorFormInput = (floor: any): floor is FloorFormInput => {
  return floor && typeof floor.area === "string";
};

interface BuildingVisualizerProps {
  floors?: FloorSchema[] | FloorFormInput[];

  towerFloors?: TTowerFloorCategory[];
  isSelectable?: boolean;
  selectedFloorIds?: string[];
  onCheckFloorId?: (selectedFloorIds: string[]) => void;
  complete?: boolean;
  isFoundation?: boolean;
}

const BuildingVisualizer: React.FC<BuildingVisualizerProps> = ({
  floors,
  towerFloors,
  isSelectable = false,
  selectedFloorIds = [],
  onCheckFloorId,
  complete = false,
  isFoundation = false,
}) => {
  const unifiedFloors: UnifiedFloor[] = towerFloors
    ? convertTowerFloorsToUnified(towerFloors)
    : floors
      ? isFloorFormInput(floors[0])
        ? convertFloorFormInputToUnified(floors as FloorFormInput[])
        : convertFloorSchemaToUnified(floors as FloorSchema[])
      : [];

  const selectedItems = isSelectable ? selectedFloorIds : [];
  const onSelectionChange = isSelectable ? onCheckFloorId : undefined;

  const roofFloors = unifiedFloors.filter(
    (floor) => floor.category === "penthouse_floor"
  );
  const typicalFloors = unifiedFloors.filter(
    (floor) => floor.category === "standard_floor"
  );
  const groundFloors = unifiedFloors.filter(
    (floor) => floor.category === "ground_floor"
  );
  const basementFloors = unifiedFloors.filter(
    (floor) => floor.category === "basement_floor"
  );

  const maxArea = Math.max(...unifiedFloors.map((floor) => floor.area), 1);

  // Ordenar por índice (do maior para o menor para visualização de cima para baixo)
  const sortedRoofFloors = roofFloors.sort((a, b) => b.index - a.index);
  const sortedTypicalFloors = typicalFloors.sort((a, b) => b.index - a.index);
  const sortedGroundFloors = groundFloors.sort((a, b) => b.index - a.index);
  const sortedBasementFloors = basementFloors.sort((a, b) => b.index - a.index);

  const biggestFloorArea = Math.max(
    ...unifiedFloors.map((floor) => floor.area),
    1
  );

  const foundationFloor: UnifiedFloor = {
    id: "foundation_floor",
    name: "Mesoestrutura e fundação",
    area: biggestFloorArea,
    height: 2,
    category: "foundation_floor" as any,
    index: -2,
  };

  const handleFloorSelection = (
    floorIdentifier: string,
    isChecked: boolean
  ) => {
    if (!onSelectionChange) return;

    let newSelectedItems: string[];

    if (isChecked) {
      newSelectedItems = selectedItems.includes(floorIdentifier)
        ? selectedItems
        : [...selectedItems, floorIdentifier];
    } else {
      newSelectedItems = selectedItems.filter(
        (item: string) => item !== floorIdentifier
      );
    }

    onSelectionChange(newSelectedItems);
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (!onSelectionChange) return;

    if (isChecked) {
      const allFloorIds = unifiedFloors.map((floor) => floor.id);
      onSelectionChange(allFloorIds);
    } else {
      onSelectionChange([]);
    }
  };

  const allFloorIds = unifiedFloors.map((floor) => floor.id);
  const areAllSelected =
    allFloorIds.length > 0 &&
    allFloorIds.every((id) => selectedItems.includes(id));

  const renderFloorBlock = (floor: UnifiedFloor, hasFoundation = false) => {
    const widthPercentage = (floor.area / maxArea) * 100;
    const floorIdentifier = isSelectable ? floor.id : floor.name;
    const isFloorSelected = selectedItems.includes(floorIdentifier);

    const categoryColors = {
      penthouse_floor: "#8B5CF6",
      standard_floor: "#3B82F6",
      ground_floor: "#10B981",
      basement_floor: "#F59E0B",
      foundation_floor: "#db7070",
    };

    const opacity = () => {
      if (!complete) return "1";

      if (hasFoundation && isFoundation) return 1;
      if (hasFoundation && !isFoundation) return 0.2;
      if (!hasFoundation && isFoundation) return 0.2;
      return 1;
    };

    return (
      <div
        key={floor.id}
        className={`mb-2 ${
          complete
            ? "grid grid-cols-[2fr_auto_minmax(0,100px)] gap-2 items-start w-full"
            : "flex items-center"
        }`}
        style={{ opacity: opacity() }}
      >
        {/* Bloco do andar */}
        <div
          className={`flex items-center text-xs font-medium text-white shadow-sm ${
            complete ? "h-4 rounded-l-lg ml-auto" : "justify-center mx-auto"
          }`}
          style={{
            backgroundColor: categoryColors[floor.category],
            height: complete ? "16px" : `${Math.max(24, floor.height * 6)}px`,
            width: `${widthPercentage}%`,
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
          }}
          title={`${floor.name} - ${floor.area}m² - ${floor.height}m`}
        ></div>

        {/* Checkbox e nome */}
        {complete && (
          <>
            <Checkbox
              checked={isFloorSelected}
              disabled={!isSelectable || hasFoundation}
              onCheckedChange={(checked) =>
                handleFloorSelection(floorIdentifier, checked === true)
              }
              className="border border-gray-300 bg-white data-[state=checked]:bg-active data-[state=checked]:border-active flex-shrink-0"
            />
            <span
              className={`text-xs text-gray-700 dark:text-gray-300 ${
                hasFoundation ? "font-bold" : "font-normal"
              }
                ${!hasFoundation ? "truncate" : ""}
              `}
              title={floor.name}
            >
              {floor.name}
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center p-4 min-h-96 w-80">
      <div className="w-full mb-4 space-y-3">
        {complete && (
          <div className="text-left">
            <span className="text-md font-normal leading-2 dark:text-gray-300">
              {isSelectable
                ? `Selecione os pavimentos em que esta tecnologia construtiva será
                aplicada`
                : `Os pavimentos abaixo são apenas para visualização e não podem ser editados ou selecionados aqui.`}
            </span>
          </div>
        )}

        {/* Selecionar todos */}
        {complete && isSelectable && unifiedFloors.length > 0 && (
          <div className="grid grid-cols-[2fr_auto_minmax(0,100px)] gap-2 items-center w-full max-w-64 ml-auto pb-2 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-end">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Selecionar todos
              </span>
            </div>
            <Checkbox
              checked={areAllSelected}
              onCheckedChange={(checked) => handleSelectAll(checked === true)}
              className="border border-gray-300 bg-white data-[state=checked]:bg-active data-[state=checked]:border-active flex-shrink-0"
            />
            <div className="flex items-center">
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {selectedItems.length} de {allFloorIds.length}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center w-full max-w-72">
        <div className="flex flex-col w-full">
          {/* Cobertura (topo) */}
          <div
            className={`w-full max-w-64 ${complete ? "ml-auto" : "mx-auto"} `}
          >
            {sortedRoofFloors.map((floor) => renderFloorBlock(floor))}
          </div>

          {/* Tipo */}
          <div
            className={`w-full max-w-64 ${complete ? "ml-auto" : "mx-auto"}`}
          >
            {sortedTypicalFloors.map((floor) => renderFloorBlock(floor))}
          </div>

          {/* Térreo */}
          <div
            className={`w-full max-w-64 ${complete ? "ml-auto" : "mx-auto"}`}
          >
            {sortedGroundFloors.map((floor) => renderFloorBlock(floor))}
          </div>
        </div>

        {/* Linha do solo - só aparece se houver andares acima e/ou subsolo */}
        {(roofFloors.length > 0 ||
          typicalFloors.length > 0 ||
          groundFloors.length > 0 ||
          basementFloors.length > 0) && (
          <div className="w-full h-0.1 bg-black mt-1 mb-3 relative">
            <div className="absolute -bottom-1 left-0 w-full h-1 bg-gray-400"></div>
          </div>
        )}

        {/* Subsolo (abaixo da linha do solo) */}
        <div className="flex flex-col w-full">
          <div
            className={`w-full max-w-64 ${complete ? "ml-auto" : "mx-auto"}`}
          >
            {sortedBasementFloors.map((floor) => renderFloorBlock(floor))}
          </div>
        </div>

        {complete && (
          <div className="flex flex-col w-full">
            <div
              className={`w-full max-w-64 ${complete ? "ml-auto" : "mx-auto"}`}
            >
              {renderFloorBlock(foundationFloor, true)}
            </div>
          </div>
        )}

        {unifiedFloors.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-xs text-center">
            Adicione pavimentos
            <br />
            para visualizar a torre
          </div>
        )}
      </div>

      {unifiedFloors.length > 0 && (
        <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-md w-full text-center">
          <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">{unifiedFloors.length}</span>{" "}
              andares
            </div>
            <div>
              <span className="font-medium">
                {unifiedFloors
                  .reduce((sum, floor) => sum + floor.area, 0)
                  .toFixed(0)}
              </span>
              m² total
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingVisualizer;
