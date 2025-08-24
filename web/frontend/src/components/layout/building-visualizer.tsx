import React from "react";
import { FloorSchema } from "@/validators/unitForm.validator";
import { Checkbox } from "@/components/ui/checkbox";

interface BuildingVisualizerProps {
  floors: FloorSchema[];
  isSelectable?: boolean;
  selectedFloors?: string[];
  onCheckFloor?: (selectedFloors: string[]) => void;
}

const BuildingVisualizer: React.FC<BuildingVisualizerProps> = ({
  floors,
  isSelectable = false,
  selectedFloors = [],
  onCheckFloor,
}) => {
  const undergroundFloors = floors.filter((floor) => floor.underground);
  const aboveGroundFloors = floors.filter((floor) => !floor.underground);

  const maxArea = Math.max(...floors.map((floor) => floor.area), 1);

  const sortedUndergroundFloors = undergroundFloors.sort(
    (a, b) => a.position - b.position
  );
  const sortedAboveGroundFloors = aboveGroundFloors.sort(
    (a, b) => b.position - a.position
  );

  const handleFloorSelection = (towerName: string, isChecked: boolean) => {
    if (!onCheckFloor) return;

    let newSelectedFloors: string[];

    if (isChecked) {
      // Adiciona o tower_name se não estiver na lista
      newSelectedFloors = selectedFloors.includes(towerName)
        ? selectedFloors
        : [...selectedFloors, towerName];
    } else {
      // Remove o tower_name da lista
      newSelectedFloors = selectedFloors.filter((name) => name !== towerName);
    }

    onCheckFloor(newSelectedFloors);
  };

  const renderFloorBlocks = (floor: FloorSchema) => {
    const blocks = [];
    const widthPercentage = (floor.area / maxArea) * 100;
    const isFloorSelected = selectedFloors.includes(floor.tower_name);

    for (let i = 0; i < floor.repetition_number; i++) {
      blocks.push(
        <div
          key={`${floor.tower_name}-${i}`}
          className={`h-6 mb-1 flex items-center text-xs font-medium text-white shadow-sm mx-auto ${
            isSelectable ? "justify-end pr-2" : "justify-center"
          }`}
          style={{
            backgroundColor: floor.color,
            height: `${Math.max(24, floor.height * 6)}px`,
            width: `${widthPercentage}%`,
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
          }}
          title={`${floor.tower_name} - ${floor.area}m² - ${floor.height}m`}
        >
          <span className={isSelectable ? "mr-2" : ""}>{floor.tower_name}</span>
          {isSelectable && (
            <Checkbox
              checked={isFloorSelected}
              onCheckedChange={(checked) =>
                handleFloorSelection(floor.tower_name, checked === true)
              }
              className=" border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
            />
          )}
        </div>
      );
    }
    return blocks;
  };

  return (
    <div className="flex flex-col items-center px-4 min-h-96 w-48">
      <h4 className="text-sm font-semibold mb-6 text-gray-700 dark:text-gray-300 h-[32px] content-center">
        Visualização da Torre
      </h4>

      <div className="flex flex-col items-center w-full max-w-40">
        <div className="flex flex-col-reverse w-full">
          {sortedAboveGroundFloors.map((floor, index) => (
            <div key={`above-${index}`} className="w-full max-w-35 mx-auto">
              {renderFloorBlocks(floor)}
            </div>
          ))}
        </div>

        {(aboveGroundFloors.length > 0 || undergroundFloors.length > 0) && (
          <div className="w-full h-0.5 bg-black my-3 relative">
            <div className="absolute -bottom-1 left-0 w-full h-2 bg-gray-400"></div>
          </div>
        )}

        <div className="flex flex-col w-full">
          {sortedUndergroundFloors.map((floor, index) => (
            <div
              key={`underground-${index}`}
              className="w-full max-w-35 mx-auto"
            >
              {renderFloorBlocks(floor)}
            </div>
          ))}
        </div>

        {floors.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-xs text-center">
            Adicione pavimentos
            <br />
            para visualizar a torre
          </div>
        )}
      </div>

      {floors.length > 0 && (
        <div className="mt-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-md w-full text-center">
          <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">
                {floors.reduce(
                  (sum, floor) => sum + floor.repetition_number,
                  0
                )}
              </span>{" "}
              andares
            </div>
            <div>
              <span className="font-medium">
                {floors
                  .reduce(
                    (sum, floor) => sum + floor.area * floor.repetition_number,
                    0
                  )
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
